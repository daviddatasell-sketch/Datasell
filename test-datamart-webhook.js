#!/usr/bin/env node

/**
 * 🔍 Datamart Webhook Test & Diagnostic Tool
 * 
 * Usage:
 *   node test-datamart-webhook.js
 * 
 * This tool:
 * 1. Tests webhook endpoint connectivity
 * 2. Sends test webhooks
 * 3. Verifies signature validation
 * 4. Checks transaction lookup
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'https://datasell.store';
const WEBHOOK_SECRET = process.env.DATAMART_WEBHOOK_SECRET || '7cfa4d9ea9e1c493774f448f6cd5cb2fbb14019f36ec335baaf6a366c3f9b4c5';

console.log('\n' + '='.repeat(60));
console.log('🔍 DATAMART WEBHOOK TEST & DIAGNOSTIC TOOL');
console.log('='.repeat(60) + '\n');

console.log('📋 Configuration:');
console.log(`   Base URL: ${BASE_URL}`);
console.log(`   Webhook URL: ${BASE_URL}/api/datamart-webhook`);
console.log(`   Secret (first 10 chars): ${WEBHOOK_SECRET.substring(0, 10)}...`);
console.log();

// Test 1: Check endpoint accessibility
async function testEndpointAccessibility() {
  console.log('📡 Test 1: Checking endpoint accessibility...\n');
  
  return new Promise((resolve) => {
    const url = new URL('/api/datamart-webhook', BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('   ✅ Endpoint is accessible!');
          console.log(`   📊 Response: ${JSON.stringify(json, null, 2)}`);
          console.log();
          resolve(true);
        } catch (e) {
          console.log('   ❌ Got response but not JSON');
          console.log(`   Response: ${data}`);
          console.log();
          resolve(false);
        }
      });
    }).on('error', (e) => {
      console.log(`   ❌ Cannot reach endpoint: ${e.message}`);
      console.log(`   Make sure server is running at: ${BASE_URL}`);
      console.log();
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('   ❌ Request timeout (5s)');
      console.log();
      resolve(false);
    });
  });
}

// Test 2: Send test webhook without signature (NEW PAYLOAD FORMAT)
async function testWebhookWithoutSignature() {
  console.log('📡 Test 2: Sending test webhook (no signature - NEW FORMAT)...\n');
  
  const payload = {
    event: 'order.completed',
    timestamp: new Date().toISOString(),
    data: {
      orderId: '60f1e5b3e6b39812345678',
      orderReference: 'GN-TEST-001',
      transactionId: `TRX-TEST-${Date.now()}`,
      phone: '0241234567',
      network: 'MTN',
      capacity: 1,
      price: 4.80,
      status: 'completed',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  console.log(`   📦 Payload: ${JSON.stringify(payload, null, 2)}`);
  console.log();
  
  return sendWebhook(payload, null);
}

// Test 3: Send test webhook with correct signature (NEW FORMAT)
async function testWebhookWithSignature() {
  console.log('📡 Test 3: Sending test webhook (with HMAC-SHA256 signature - NEW FORMAT)...\n');
  
  const payload = {
    event: 'order.completed',
    timestamp: new Date().toISOString(),
    data: {
      orderId: '60f1e5b3e6b39812345678',
      orderReference: 'GN-VALID-001',
      transactionId: `TRX-VALID-${Date.now()}`,
      phone: '0241234567',
      network: 'YELLO',
      capacity: 5,
      price: 20.50,
      status: 'completed',
      createdAt: new Date(Date.now() - 120000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');
  
  console.log(`   📦 Payload: ${payloadStr}`);
  console.log(`   🔐 Signature: ${signature}`);
  console.log();
  
  return sendWebhook(payload, signature);
}

// Test 4: Send test webhook with invalid signature (NEW FORMAT)
async function testWebhookWithInvalidSignature() {
  console.log('📡 Test 4: Sending test webhook (with INVALID signature - NEW FORMAT)...\n');
  
  const payload = {
    event: 'order.completed',
    timestamp: new Date().toISOString(),
    data: {
      orderId: '60f1e5b3e6b39812345678',
      orderReference: 'GN-INVALID-001',
      transactionId: `TRX-INVALID-${Date.now()}`,
      phone: '0241234567',
      network: 'MTN',
      capacity: 1,
      price: 4.80,
      status: 'completed',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  const invalidSignature = 'invalid-signature-' + Date.now();
  
  console.log(`   📦 Payload: ${JSON.stringify(payload, null, 2)}`);
  console.log(`   ❌ Invalid Signature: ${invalidSignature}`);
  console.log();
  
  return sendWebhook(payload, invalidSignature);

// Helper: Send webhook request
function sendWebhook(payload, signature) {
  return new Promise((resolve) => {
    const url = new URL('/api/datamart-webhook', BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    const payloadStr = JSON.stringify(payload);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr),
        'x-datamart-event': payload.event || 'test'
      }
    };
    
    if (signature) {
      options.headers['x-datamart-signature'] = signature;
    }
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const status = res.statusCode;
          
          if (status === 200 || status === 201) {
            console.log(`   ✅ Success (HTTP ${status})`);
          } else if (status === 401) {
            console.log(`   ⚠️  Rejected (HTTP ${status})`);
          } else {
            console.log(`   ⚠️  Response (HTTP ${status})`);
          }
          
          console.log(`   📊 Response: ${JSON.stringify(json, null, 2)}`);
          console.log();
          resolve(status === 200 || status === 201);
        } catch (e) {
          console.log(`   ❌ Invalid response: ${data}`);
          console.log();
          resolve(false);
        }
      });
    }).on('error', (e) => {
      console.log(`   ❌ Request failed: ${e.message}`);
      console.log();
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('   ❌ Request timeout (5s)');
      console.log();
      resolve(false);
    });
    
    req.write(payloadStr);
    req.end();
  });
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await testEndpointAccessibility());
  results.push(await testWebhookWithoutSignature());
  results.push(await testWebhookWithSignature());
  results.push(await testWebhookWithInvalidSignature());
  results.push(await testOrderFailedEvent());
  results.push(await testOrderProcessingEvent());
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  console.log('Test Results:');
  console.log(`  1. Endpoint Accessibility:     ${results[0] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  2. Webhook (No Signature):     ${results[1] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  3. Webhook (Valid Signature):  ${results[2] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  4. Webhook (Invalid Sig):      ${!results[3] ? '✅ PASS (Rejected)' : '❌ FAIL (Accepted)'}`);
  console.log(`  5. Order Failed Event:         ${results[4] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  6. Order Processing Event:     ${results[5] ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = results.filter(r => r).length - 1; // Exclude invalid sig test
  console.log(`\n📈 Critical Tests: ${passed}/5 tests passed\n`);
  
  if (results[0] && results[2]) {
    console.log('✅ WEBHOOK SYSTEM IS OPERATIONAL!');
    console.log('\n✨ Your Datamart webhooks should be working.');
    console.log('   When Datamart sends notifications, orders will update automatically.');
    console.log('   Real-time status updates are now active (no 7-hour timer)!\n');
  } else {
    console.log('❌ WEBHOOK SYSTEM HAS ISSUES');
    console.log('\n⚠️  Please check:');
    if (!results[0]) console.log('   - Server is running and accessible');
    if (!results[2]) console.log('   - Webhook endpoint is configured correctly');
    if (!results[2]) console.log('   - Webhook secret in .env is correct');
    console.log();
  }
  
  console.log('='.repeat(60) + '\n');
}

// Test 5: Test order.failed event
async function testOrderFailedEvent() {
  console.log('📡 Test 5: Testing order.failed event (NEW FORMAT)...\n');
  
  const payload = {
    event: 'order.failed',
    timestamp: new Date().toISOString(),
    data: {
      orderId: '60f1e5b3e6b39812345999',
      orderReference: 'GN-FAIL-001',
      transactionId: `TRX-FAIL-${Date.now()}`,
      phone: '0241234567',
      network: 'MTN',
      capacity: 1,
      price: 4.80,
      status: 'failed',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');
  
  console.log(`   📦 Event: order.failed`);
  console.log(`   🔐 Signature: ${signature.substring(0, 20)}...`);
  console.log();
  
  return sendWebhook(payload, signature);
}

// Test 6: Test order.processing event
async function testOrderProcessingEvent() {
  console.log('📡 Test 6: Testing order.processing event (NEW FORMAT)...\n');
  
  const payload = {
    event: 'order.processing',
    timestamp: new Date().toISOString(),
    data: {
      orderId: '60f1e5b3e6b39812345777',
      orderReference: 'GN-PROC-001',
      transactionId: `TRX-PROC-${Date.now()}`,
      phone: '0241234567',
      network: 'YELLO',
      capacity: 5,
      price: 20.50,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');
  
  console.log(`   📦 Event: order.processing`);
  console.log(`   🔐 Signature: ${signature.substring(0, 20)}...`);
  console.log();
  
  return sendWebhook(payload, signature);
}

// Run tests
runAllTests().catch(console.error);
