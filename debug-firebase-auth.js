#!/usr/bin/env node

/**
 * Debug Firebase Auth Configuration
 * Diagnoses why admin auth operations are failing
 */

require('dotenv').config();
const admin = require('firebase-admin');

async function debugFirebaseAuth() {
  console.log('🔍 Firebase Authentication Debug Tool\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || '❌ MISSING'}`);
  console.log(`   FIREBASE_DATABASE_URL: ${process.env.FIREBASE_DATABASE_URL ? '✅ Set' : '❌ MISSING'}`);
  console.log(`   FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? '✅ Set (' + process.env.FIREBASE_PRIVATE_KEY.substring(0, 20) + '...)' : '❌ MISSING'}`);
  console.log(`   FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL || '❌ MISSING'}`);
  console.log(`   ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '❌ MISSING'}`);
  console.log(`   ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '✅ Set' : '❌ MISSING'}\n`);

  // Initialize Firebase
  try {
    console.log('🔐 Initializing Firebase Admin SDK...');
    
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log('   ✅ Firebase Admin SDK initialized\n');
  } catch (initError) {
    console.error('   ❌ Failed to initialize Firebase:', initError.message);
    console.error('   Error Code:', initError.code);
    process.exit(1);
  }

  // Test 1: Check auth service
  console.log('🧪 Test 1: Checking Auth Service...');
  try {
    const authService = admin.auth();
    console.log(`   ✅ Auth service available\n`);
  } catch (err) {
    console.error(`   ❌ Auth service error: ${err.message}\n`);
  }

  // Test 2: Try to get an existing user
  console.log('🧪 Test 2: Checking Existing Admin Account...');
  try {
    const adminUser = await admin.auth().getUserByEmail('fotsiemmanuel397@gmail.com');
    console.log(`   ✅ Found existing admin: ${adminUser.uid}`);
    console.log(`      Email: ${adminUser.email}`);
    console.log(`      Email Verified: ${adminUser.emailVerified}\n`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`   ℹ️  No existing admin account found\n`);
    } else {
      console.error(`   ❌ Error checking admin: ${err.code} - ${err.message}\n`);
    }
  }

  // Test 3: Try to list users (limited)
  console.log('🧪 Test 3: Listing First 10 Users...');
  try {
    const listResult = await admin.auth().listUsers(10);
    console.log(`   ✅ Retrieved ${listResult.users.length} users`);
    listResult.users.forEach((user, idx) => {
      console.log(`      ${idx + 1}. ${user.email} (${user.uid})`);
    });
    console.log('');
  } catch (err) {
    console.error(`   ❌ Error listing users: ${err.code} - ${err.message}\n`);
  }

  // Test 4: Check database connection
  console.log('🧪 Test 4: Checking Database Connection...');
  try {
    const db = admin.database();
    const testRead = await db.ref('test').once('value');
    console.log(`   ✅ Database connection working\n`);
  } catch (err) {
    console.error(`   ❌ Database error: ${err.message}\n`);
  }

  // Test 5: Attempt to create a test user
  console.log('🧪 Test 5: Creating Test User...');
  const testEmail = `test-${Date.now()}@datasell.local`;
  const testPassword = 'TestPassword123456789!';
  
  try {
    const testUser = await admin.auth().createUser({
      email: testEmail,
      password: testPassword,
      displayName: 'Test User'
    });
    console.log(`   ✅ Test user created: ${testUser.uid}`);
    console.log(`      Email: ${testUser.email}\n`);
    
    // Clean up test user
    try {
      await admin.auth().deleteUser(testUser.uid);
      console.log('   ✅ Test user cleaned up\n');
    } catch (delErr) {
      console.log(`   ⚠️  Could not delete test user: ${delErr.message}\n`);
    }
  } catch (createErr) {
    console.error(`   ❌ Failed to create test user: ${createErr.code}`);
    console.error(`      Message: ${createErr.message}\n`);
  }

  // Test 6: Check service account permissions
  console.log('🧪 Test 6: Service Account Info...');
  try {
    console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
    console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`   ℹ️  Ensure this service account has:`);
    console.log(`      - Editor role in Firebase Console`);
    console.log(`      - Firebase Authentication Admin permission`);
    console.log(`      - Firebase Realtime Database admin access\n`);
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}\n`);
  }

  console.log('✅ Debug check complete!');
  process.exit(0);
}

debugFirebaseAuth().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
