#!/usr/bin/env node

/**
 * Keep-Alive Monitor for Render.com
 * 
 * This script pings the datasell.store server every 5 minutes
 * to prevent Render's free tier from spinning down the application
 * due to inactivity.
 * 
 * Run with: node keep-alive-monitor.js
 * Or add to Procfile: release: node keep-alive-monitor.js &
 */

const https = require('https');
const http = require('http');

const TARGET_URL = process.env.BASE_URL || 'https://datasell.store';
const PING_INTERVAL = process.env.PING_INTERVAL || 300000; // 5 minutes in milliseconds
const HEALTH_ENDPOINT = '/api/health';

console.log(`
╔════════════════════════════════════════════════════════╗
║         DATASELL KEEP-ALIVE MONITOR                    ║
╚════════════════════════════════════════════════════════╝

🎯 Target URL: ${TARGET_URL}
⏰ Ping Interval: ${PING_INTERVAL / 1000} seconds
📍 Health Endpoint: ${HEALTH_ENDPOINT}
⏱️ Started: ${new Date().toISOString()}

This monitor will keep your Render deployment alive by
pinging the server every few minutes. This prevents the
app from spinning down due to inactivity.

`);

/**
 * Ping the server to keep it alive
 */
async function pingServer() {
  const url = `${TARGET_URL}${HEALTH_ENDPOINT}`;
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const timestamp = new Date().toISOString();
        const statusCode = res.statusCode;
        
        if (statusCode === 200) {
          console.log(`✅ [${timestamp}] Server is alive (HTTP ${statusCode})`);
        } else {
          console.warn(`⚠️ [${timestamp}] Server responded with HTTP ${statusCode}`);
        }
        
        resolve({ success: statusCode === 200, statusCode });
      });
    });
    
    request.on('error', (error) => {
      const timestamp = new Date().toISOString();
      console.error(`❌ [${timestamp}] Ping failed:`, error.message);
      resolve({ success: false, error: error.message });
    });
    
    request.on('timeout', () => {
      const timestamp = new Date().toISOString();
      console.error(`⏱️ [${timestamp}] Ping timeout`);
      request.destroy();
      resolve({ success: false, error: 'timeout' });
    });
  });
}

/**
 * Start the monitoring loop
 */
async function startMonitor() {
  // Initial ping
  console.log(`\n🔔 Initial ping at ${new Date().toISOString()}`);
  await pingServer();
  
  // Set up recurring pings
  setInterval(async () => {
    try {
      console.log(`\n🔔 Scheduled ping at ${new Date().toISOString()}`);
      await pingServer();
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }, PING_INTERVAL);
  
  console.log(`\n✅ Monitor is running. Pinging every ${PING_INTERVAL / 1000} seconds.\n`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitor shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Monitor shutting down (SIGTERM)...');
  process.exit(0);
});

// Start monitoring
startMonitor().catch((error) => {
  console.error('Failed to start monitor:', error);
  process.exit(1);
});
