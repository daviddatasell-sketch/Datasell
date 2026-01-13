require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting simple test server...');

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

console.log('About to call app.listen()...');

const server = app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('listening', () => {
  console.log('✅ Server is listening');
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Keep the process alive indefinitely
setInterval(() => {
  console.log('Server still alive...');
}, 10000);
