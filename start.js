#!/usr/bin/env node

console.log('🚀 DataSell startup wrapper started at', new Date().toISOString());

// Start the server
require('./server.js');

// Keep the process alive
setInterval(() => {
  console.log('❤️  Server heartbeat at', new Date().toISOString());
}, 30000);
