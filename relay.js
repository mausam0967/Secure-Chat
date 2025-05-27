const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS for local development
app.use(cors());
app.use(bodyParser.json());

// Serve static files (your HTML)
app.use(express.static('.'));

/**
 * In-memory encrypted message storage.
 */
const messageStore = {};

// Store encrypted message
app.post('/send', (req, res) => {
  console.log('Received message to store');
  const { to, from, ciphertext, nonce } = req.body;

  if (!messageStore[to]) {
    messageStore[to] = [];
  }

  messageStore[to].push({
    ciphertext,
    nonce,
    senderPublicKey: from,
    timestamp: new Date()
  });

  console.log(`Stored message for ${to.substring(0, 8)}...`);
  return res.json({ status: 'stored' });
});

// Fetch and delete messages for a recipient
app.post('/fetch', (req, res) => {
  const { recipient } = req.body;
  const messages = messageStore[recipient] || [];
  
  if (messages.length > 0) {
    console.log(`Delivering ${messages.length} messages to ${recipient.substring(0, 8)}...`);
    delete messageStore[recipient]; // Clear after fetching
  }

  return res.json({ messages });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Relay server running at http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
