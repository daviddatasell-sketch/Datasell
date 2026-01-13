#!/usr/bin/env node

/**
 * Test Admin Login with New Credentials
 */

require('dotenv').config();
const admin = require('firebase-admin');

async function testAdminLogin() {
  console.log('🔐 Testing Admin Login with New Credentials\n');

  // Initialize Firebase
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

  const db = admin.database();
  const testEmail = process.env.ADMIN_EMAIL;
  const testPassword = process.env.ADMIN_PASSWORD;

  console.log(`📧 Testing Login with:`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword.substring(0, 10)}...***\n`);

  try {
    // Search for user with the new admin email
    console.log('🔍 Step 1: Searching for user in database...');
    const snapshot = await db.ref('users').orderByChild('email').equalTo(testEmail).once('value');

    if (!snapshot.exists()) {
      console.log(`   ❌ User not found with email: ${testEmail}`);
      process.exit(1);
    }

    const users = snapshot.val();
    const userId = Object.keys(users)[0];
    const userData = users[userId];

    console.log(`   ✅ User found!`);
    console.log(`      User ID: ${userId}`);
    console.log(`      Email: ${userData.email}`);
    console.log(`      isAdmin: ${userData.isAdmin}\n`);

    // Verify password
    console.log('🔐 Step 2: Verifying password...');
    if (userData.password === testPassword) {
      console.log(`   ✅ Password matches!\n`);
    } else {
      console.log(`   ❌ Password does not match`);
      console.log(`      Stored: ${userData.password.substring(0, 10)}...***`);
      console.log(`      Provided: ${testPassword.substring(0, 10)}...***\n`);
      process.exit(1);
    }

    // Check admin status
    console.log('👤 Step 3: Verifying admin status...');
    if (userData.isAdmin === true) {
      console.log(`   ✅ User is an admin\n`);
    } else {
      console.log(`   ⚠️  User is not marked as admin`);
      console.log(`      isAdmin: ${userData.isAdmin}\n`);
    }

    console.log('✅ LOGIN TEST SUCCESSFUL!\n');
    console.log('✅ Summary:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Admin: ${userData.isAdmin}`);
    console.log(`   Status: Ready to login\n`);

    console.log('📝 Next Steps:');
    console.log(`   1. Open http://localhost:3000/admin-login.html`);
    console.log(`   2. Enter email: ${testEmail}`);
    console.log(`   3. Enter password: ${testPassword}`);
    console.log(`   4. You should be able to login to the admin panel\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAdminLogin();
