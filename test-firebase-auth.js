#!/usr/bin/env node
/**
 * Test Firebase Auth Integration
 * Verifies that Firebase Auth is working
 */

const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

async function testFirebaseAuth() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING FIREBASE AUTH INTEGRATION');
  console.log('='.repeat(60) + '\n');

  try {
    // Test 1: Try to create a test user
    const testEmail = 'firebase-auth-test-' + Date.now() + '@test.com';
    const testPassword = 'TestPassword123!@#';

    console.log('📝 Test 1: Creating test user in Firebase Auth...');
    console.log(`   Email: ${testEmail}`);
    
    const userRecord = await admin.auth().createUser({
      email: testEmail,
      password: testPassword,
      displayName: 'Firebase Test User'
    });

    console.log('✅ SUCCESS! Firebase Auth is working!\n');
    console.log('User created with:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Display Name: ${userRecord.displayName}`);

    // Test 2: Verify the user exists
    console.log('\n📝 Test 2: Verifying user was created...');
    const verifyUser = await admin.auth().getUser(userRecord.uid);
    console.log(`✅ User verified: ${verifyUser.email}`);

    // Test 3: Sign in the user
    console.log('\n📝 Test 3: Testing sign-in...');
    const axios = require('axios');
    const signInResponse = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + process.env.FIREBASE_API_KEY, {
      email: testEmail,
      password: testPassword,
      returnSecureToken: true
    });
    console.log('✅ Sign-in successful!');
    console.log(`   Auth Token: ${signInResponse.data.idToken.substring(0, 20)}...`);

    // Test 4: Clean up - delete test user
    console.log('\n📝 Test 4: Cleaning up test user...');
    await admin.auth().deleteUser(userRecord.uid);
    console.log('✅ Test user deleted');

    console.log('\n' + '='.repeat(60));
    console.log('✅ FIREBASE AUTH INTEGRATION: WORKING PERFECTLY!');
    console.log('='.repeat(60) + '\n');
    console.log('Your signup endpoint will now:');
    console.log('1. Create users in Firebase Auth');
    console.log('2. Store them in Realtime Database');
    console.log('3. Hash passwords for backup');
    console.log('4. Use Firebase Auth for login\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ FIREBASE AUTH NOT WORKING\n');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Email/Password auth not enabled in Firebase Console');
    console.error('2. Invalid Firebase credentials in .env');
    console.error('3. Firebase project ID mismatch\n');
    process.exit(1);
  }
}

testFirebaseAuth();
