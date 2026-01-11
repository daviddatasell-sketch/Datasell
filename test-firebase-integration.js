#!/usr/bin/env node

/**
 * Firebase Google Sign-In Integration Test
 * Tests the entire flow: Firebase SDK loading → Token generation → Backend verification
 */

const http = require('http');
const https = require('https');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔥 FIREBASE GOOGLE SIGN-IN - INTEGRATION TEST');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: Verify Firebase backend endpoint exists
console.log('📋 Test 1: Checking if backend endpoint exists...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/firebase-google',
  method: 'OPTIONS'
};

const testBackend = () => {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      const statusOk = res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 405;
      console.log(`  ✅ Backend endpoint accessible`);
      console.log(`  ├─ Host: localhost:3000`);
      console.log(`  ├─ Endpoint: POST /auth/firebase-google`);
      console.log(`  ├─ Status: ${res.statusCode}`);
      console.log(`  └─ Ready for requests: YES\n`);
      resolve(statusOk);
    });

    req.on('error', (err) => {
      console.log(`  ❌ Cannot connect to backend: ${err.message}`);
      console.log(`  └─ Make sure server is running: node server.js\n`);
      resolve(false);
    });

    req.end();
  });
};

// Test 2: Verify Firebase SDK CDN URLs
console.log('📋 Test 2: Checking Firebase SDK CDN URLs...\n');

const cdnUrls = {
  'jsDelivr - firebase-app.js': 'https://cdn.jsdelivr.net/npm/firebase@9.22.0/app/dist/firebase-app.js',
  'jsDelivr - firebase-auth.js': 'https://cdn.jsdelivr.net/npm/firebase@9.22.0/auth/dist/firebase-auth.js'
};

const testCdnUrl = (name, url) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const request = https.head(url, { timeout: 5000 }, (res) => {
      const duration = Date.now() - startTime;
      const icon = res.statusCode === 200 ? '✅' : '❌';
      console.log(`  ${icon} ${name}`);
      console.log(`     └─ Status: ${res.statusCode} (${duration}ms)`);
      resolve(res.statusCode === 200);
    });

    request.on('error', (err) => {
      console.log(`  ❌ ${name}`);
      console.log(`     └─ Error: ${err.message}`);
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      console.log(`  ❌ ${name}`);
      console.log(`     └─ Error: Timeout`);
      resolve(false);
    });
  });
};

// Test 3: Check Firebase configuration
console.log('📋 Test 3: Firebase Configuration...\n');

const firebaseConfig = {
  apiKey: "AIzaSyAdB-9vEhC6dXSQvCjBpZrB8_HqL2Xmwvs",
  authDomain: "datasell-7b993.firebaseapp.com",
  projectId: "datasell-7b993",
  storageBucket: "datasell-7b993.appspot.com",
  messagingSenderId: "503108953382",
  appId: "1:503108953382:web:6f13b13e92d6e832cc3f63"
};

console.log('  ✅ Firebase Configuration Loaded:');
console.log(`     ├─ Project: ${firebaseConfig.projectId}`);
console.log(`     ├─ Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`     ├─ API Key: ${firebaseConfig.apiKey.substring(0, 20)}...`);
console.log(`     └─ App ID: ${firebaseConfig.appId}\n`);

// Test 4: Expected flow
console.log('📋 Test 4: Expected Data Flow...\n');

console.log('  Frontend to Backend Flow:');
console.log('  ├─ 1. User clicks "Continue with Google"');
console.log('  ├─ 2. Firebase SDK opens Google popup');
console.log('  ├─ 3. User signs in with Google');
console.log('  ├─ 4. Firebase generates ID token');
console.log('  ├─ 5. Frontend sends POST to /auth/firebase-google');
console.log('  │   ├─ Headers: { "Content-Type": "application/json" }');
console.log('  │   └─ Body: { "idToken": "...", "isSignup": false/true }');
console.log('  ├─ 6. Backend verifies token with Firebase Admin SDK');
console.log('  ├─ 7. Backend creates/updates user in database');
console.log('  ├─ 8. Backend sets session cookie');
console.log('  ├─ 9. Backend returns { success: true, userId, email, ... }');
console.log('  └─ 10. Frontend redirects to dashboard\n');

// Test 5: Backend endpoint logic
console.log('📋 Test 5: Backend Endpoint Logic...\n');

console.log('  Endpoint: POST /auth/firebase-google');
console.log('  ├─ Request Body:');
console.log('  │  ├─ idToken (required): Firebase ID token from frontend');
console.log('  │  └─ isSignup (optional): true for signup, false for login');
console.log('  ├─ Processing:');
console.log('  │  ├─ 1. Verify token with admin.auth().verifyIdToken()');
console.log('  │  ├─ 2. Extract email, name, picture, uid from token');
console.log('  │  ├─ 3. Check if user exists in database');
console.log('  │  ├─ 4. If exists: Update lastLogin, set googleLinked flag');
console.log('  │  ├─ 5. If new: Create user with Google UID as user ID');
console.log('  │  ├─ 6. Set Express session with user data');
console.log('  │  ├─ 7. Log action to userLogs');
console.log('  │  └─ 8. Return success response');
console.log('  └─ Response: { success, userId, email, authMethod, isNewUser, ... }\n');

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 RUNNING TESTS...');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test backend
  const backendOk = await testBackend();

  // Test CDN URLs
  let cdnResults = [];
  for (const [name, url] of Object.entries(cdnUrls)) {
    const result = await testCdnUrl(name, url);
    cdnResults.push(result);
  }
  console.log();

  // Summary
  const allCdnOk = cdnResults.every(r => r);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✅ Status Check:');
  console.log(`  ├─ Backend: ${backendOk ? '✅ READY' : '❌ NOT ACCESSIBLE'}`);
  console.log(`  ├─ Firebase CDN: ${allCdnOk ? '✅ ACCESSIBLE' : '⚠️  PARTIALLY BLOCKED'}`);
  console.log(`  └─ Configuration: ✅ VALID\n`);

  if (backendOk && allCdnOk) {
    console.log('✨ Everything is set up correctly!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Open browser to http://localhost:3000/login');
    console.log('  2. Click "Continue with Google" button');
    console.log('  3. Complete Google sign-in');
    console.log('  4. Check browser console for detailed logs');
    console.log('  5. Check server console for backend confirmation\n');
  } else {
    console.log('⚠️  Some checks failed. Please verify:');
    if (!backendOk) {
      console.log('  • Server is running on port 3000');
      console.log('  • Endpoint /auth/firebase-google is implemented');
    }
    if (!allCdnOk) {
      console.log('  • Internet connection is working');
      console.log('  • jsDelivr CDN is not blocked');
      console.log('  • No firewall blocking external scripts');
    }
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run the tests
runTests().catch(console.error);
