# SecureChat - End-to-End Encrypted Messaging

A secure, real-time messaging application with end-to-end encryption, file sharing, and message delivery status.

## Features

- 🔒 End-to-end encryption using libsodium
- 📤 File sharing with type validation and size limits
- ✅ Message delivery status (sent, delivered, read)
- 👥 Contact management
- 🔐 Security features:
  - XSS protection
  - File upload security
  - Input validation
  - Secure headers
  - Message expiration
  - Rate limiting

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/secure-chat.git
cd secure-chat
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node relay.js
```

4. Open `http://localhost:3000` in your browser

## Security Features

- **End-to-End Encryption**: All messages are encrypted using libsodium's crypto_box_easy
- **File Security**:
  - File type validation
  - Size limits (5MB)
  - Secure filename generation
  - Content-Type validation
- **Message Security**:
  - 24-hour message expiration
  - Message status tracking
  - Input sanitization
- **Server Security**:
  - CORS configuration
  - Security headers
  - Rate limiting
  - Error handling

## Usage

1. Open the application in your browser
2. Copy your public key
3. Share your public key with contacts
4. Add contacts using their public keys
5. Start sending encrypted messages and files

## Development

The application consists of:
- `relay.js`: Server-side code handling message relay and file uploads
- `index.html`: Client-side code with encryption and UI

## Security Considerations

- Keep your private keys secure
- Verify contact public keys before adding them
- Regularly update dependencies
- Use HTTPS in production
- Monitor server logs for suspicious activity

## License

MIT License - see LICENSE file for details