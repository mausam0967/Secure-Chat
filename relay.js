const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const sodium = require('libsodium-wrappers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Configure multer for file uploads with security measures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    // Add timestamp and random string to prevent filename collisions
    const uniqueFilename = `${Date.now()}-${sodium.to_hex(sodium.randombytes_buf(8))}-${sanitizedFilename}`;
    cb(null, uniqueFilename);
  }
});

// File type validation
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file per request
  }
});

// Enable CORS for local development with security headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
}));

app.use(bodyParser.json({ limit: '1mb' })); // Limit JSON payload size

// Serve static files with security headers
app.use(express.static('.', {
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
  }
}));

// Serve uploads directory with additional security
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', 'attachment');
    res.set('Cache-Control', 'no-store');
  }
}));

// Add security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'"]
    }
  }
}));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

/**
 * In-memory encrypted message storage.
 */
const messageStore = new Map();
const MESSAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Add message cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, messages] of messageStore.entries()) {
    messageStore.set(key, messages.filter(msg => 
      now - msg.timestamp < MESSAGE_EXPIRY
    ));
  }
}, 60 * 60 * 1000); // Cleanup every hour

// Store encrypted message
app.post('/send', (req, res) => {
  console.log('Received message to store');
  const { to, from, ciphertext, nonce, messageId, type = 'text' } = req.body;

  // Validate required fields
  if (!to || !from || !ciphertext || !nonce || !messageId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate message type
  if (!['text', 'file'].includes(type)) {
    return res.status(400).json({ error: 'Invalid message type' });
  }

  if (!messageStore.has(to)) {
    messageStore.set(to, []);
  }

  const message = {
    messageId,
    ciphertext,
    nonce,
    senderPublicKey: from,
    timestamp: new Date(),
    status: 'sent',
    type
  };

  messageStore.get(to).push(message);
  console.log(`Stored message for ${to.substring(0, 8)}...`);
  return res.json({ status: 'stored', messageId });
});

// Upload file with error handling
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };

    console.log('File uploaded:', fileInfo);
    res.json(fileInfo);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Fetch messages for a recipient
app.post('/fetch', (req, res) => {
  const { recipient } = req.body;
  
  if (!recipient) {
    return res.status(400).json({ error: 'Recipient is required' });
  }

  const messages = messageStore.get(recipient) || [];
  
  if (messages.length > 0) {
    console.log(`Delivering ${messages.length} messages to ${recipient.substring(0, 8)}...`);
    
    // Create a copy of messages to return with updated status
    const messagesToReturn = messages.map(msg => ({
      ...msg,
      status: msg.status === 'sent' ? 'delivered' : msg.status
    }));

    // Update status in the store
    messages.forEach(msg => {
      if (msg.status === 'sent') {
        msg.status = 'delivered';
      }
    });

    // Clear messages after fetching
    messageStore.set(recipient, []);

    return res.json({ messages: messagesToReturn });
  }

  return res.json({ messages: [] });
});

// Update message status
app.post('/status', (req, res) => {
  const { messageId, recipient, status } = req.body;
  
  if (!messageId || !recipient || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['sent', 'delivered', 'read'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  if (messageStore.has(recipient)) {
    const messages = messageStore.get(recipient);
    const message = messages.find(msg => msg.messageId === messageId);
    if (message) {
      message.status = status;
      console.log(`Updated message ${messageId} status to ${status}`);
      return res.json({ status: 'updated', messageStatus: status });
    }
  }
  
  return res.json({ status: 'not_found' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Relay server running at http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
