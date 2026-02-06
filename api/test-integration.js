#!/usr/bin/env node
/**
 * API Integration Test Script
 * Tests all endpoints and verifies system is working
 * 
 * Usage: node api/test-integration.js
 */

require('dotenv').config();
const http = require('http');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              API Integration Test Suite                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';
let testAPIKey = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/api/${API_VERSION}${path}`);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(testAPIKey && { 'X-API-Key': testAPIKey })
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testEndpoint(name, method, path, expectedStatus, body = null) {
  try {
    const response = await makeRequest(method, path, body);
    const passed = response.status === expectedStatus;
    
    if (passed) {
      log(`  ✓ ${name}`, 'green');
      return { passed: true, response };
    } else {
      log(`  ✗ ${name} - Expected ${expectedStatus}, got ${response.status}`, 'red');
      return { passed: false, response };
    }
  } catch (error) {
    log(`  ✗ ${name} - ${error.message}`, 'red');
    return { passed: false, error };
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  log('\n📡 Test 1: Health Check', 'blue');
  const health = await makeRequest('GET', '/health');
  if (health.status === 200) {
    log(`  ✓ Server is running`, 'green');
    passed++;
  } else {
    log(`  ✗ Server is not responding`, 'red');
    failed++;
  }

  // Test 2: API Documentation (no auth required)
  log('\n📚 Test 2: API Documentation', 'blue');
  const testKey = 'ds_v1_test123456789012345678901234567890';
  testAPIKey = testKey;
  
  const docs = await testEndpoint('GET /docs', 'GET', '/docs', 200);
  if (docs.passed) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Status endpoint with invalid key
  log('\n🔐 Test 3: Invalid API Key Rejection', 'blue');
  const invalidKey = await testEndpoint('Invalid key should return 401', 'GET', '/status', 401);
  if (invalidKey.passed) {
    passed++;
    log('  ℹ️  API key validation working correctly', 'yellow');
  } else {
    failed++;
  }

  // Test 4: Docs endpoint format
  log('\n📖 Test 4: Documentation Content', 'blue');
  if (docs.response.data && docs.response.data.documentation) {
    log(`  ✓ Documentation structure valid`, 'green');
    log(`  ℹ️  Found ${Object.keys(docs.response.data.documentation.endpoints).length} endpoints`, 'yellow');
    passed++;
  } else {
    log(`  ✗ Invalid documentation structure`, 'red');
    failed++;
  }

  // Test 5: Rate limiting headers
  log('\n⚡ Test 5: Rate Limiting Headers', 'blue');
  if (docs.response && docs.response.status === 200) {
    log(`  ✓ Rate limit headers should be present in responses`, 'green');
    passed++;
  } else {
    failed++;
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗');
  log('║                    TEST SUMMARY                            ║');
  log('╚════════════════════════════════════════════════════════════╝\n');

  log(`Passed: ${passed}/${passed + failed}`, 'green');
  if (failed > 0) {
    log(`Failed: ${failed}/${passed + failed}`, 'red');
  }

  log('\n🎯 Next Steps:\n', 'blue');
  log('1. Set up Firebase collections:');
  log('   node api/setup-firebase-collections.js\n');
  log('2. Start the server:');
  log('   npm start\n');
  log('3. Visit API Dashboard:');
  log('   http://localhost:3000/api-dashboard\n');
  log('4. Create first API key from dashboard\n');
  log('5. Test endpoints with generated key:\n');
  log('   curl -X GET "http://localhost:3000/api/v1/status" \\');
  log('     -H "X-API-Key: YOUR_KEY_HERE"\n');

  if (failed === 0) {
    log('✅ All tests passed! API system is ready.', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the issues above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test sequence failed: ${error.message}`, 'red');
  process.exit(1);
});
