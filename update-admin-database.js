#!/usr/bin/env node

/**
 * Update Admin Credentials in Database
 * Firebase Auth is not configured, so we update credentials in the database instead
 * The server.js will use these database credentials for admin login
 */

require('dotenv').config();
const admin = require('firebase-admin');

async function updateAdminInDatabase() {
  console.log('🔐 Admin Account Database Update\n');

  // Initialize Firebase
  try {
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
    
    console.log('✅ Firebase initialized\n');
  } catch (err) {
    console.error('❌ Firebase initialization failed:', err.message);
    process.exit(1);
  }

  const db = admin.database();
  const oldAdminEmail = 'fotsiemmanuel397@gmail.com';
  const newAdminEmail = process.env.ADMIN_EMAIL || 'boimanuel356@gmail.com';
  const newAdminPassword = process.env.ADMIN_PASSWORD || 'Bulletman1234567890123@';

  try {
    // Step 1: Find the current admin user
    console.log('📋 STEP 1: Finding current admin user...');
    let adminSnapshot = await db.ref('users').orderByChild('email').equalTo(oldAdminEmail).once('value');
    let adminKey = null;
    let adminData = null;

    if (adminSnapshot.exists()) {
      const users = adminSnapshot.val();
      adminKey = Object.keys(users)[0];
      adminData = users[adminKey];
      console.log(`   ✅ Found admin: ${adminKey}`);
      console.log(`      Email: ${adminData.email}`);
      console.log(`      isAdmin: ${adminData.isAdmin}\n`);
    } else {
      // If not found by old email, search for any admin user
      console.log(`   ℹ️  Not found with old email, searching for any admin user...`);
      adminSnapshot = await db.ref('users').orderByChild('isAdmin').equalTo(true).once('value');
      
      if (adminSnapshot.exists()) {
        const users = adminSnapshot.val();
        adminKey = Object.keys(users)[0];
        adminData = users[adminKey];
        console.log(`   ✅ Found admin: ${adminKey}`);
        console.log(`      Email: ${adminData.email}`);
        console.log(`      isAdmin: ${adminData.isAdmin}\n`);
      } else {
        console.log('   ❌ No admin user found in database\n');
        process.exit(1);
      }
    }

    // Step 2: Update admin credentials in database
    console.log('✨ STEP 2: Updating admin credentials in database...');
    const updateData = {
      email: newAdminEmail,
      password: newAdminPassword,
      updatedAt: new Date().toISOString(),
      credentialsUpdatedAt: new Date().toISOString()
    };

    await db.ref(`users/${adminKey}`).update(updateData);
    console.log(`   ✅ Admin credentials updated`);
    console.log(`      New Email: ${newAdminEmail}`);
    console.log(`      New Password: ${newAdminPassword}`);
    console.log(`      Updated At: ${new Date().toISOString()}\n`);

    // Step 3: Add to admin logs
    console.log('📝 STEP 3: Logging change to admin logs...');
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'ADMIN_CREDENTIALS_UPDATED',
      oldEmail: oldAdminEmail,
      newEmail: newAdminEmail,
      performedBy: 'system-script',
      status: 'success'
    };

    const logRef = db.ref('adminLogs').push();
    await logRef.set(logEntry);
    console.log(`   ✅ Logged to adminLogs/${logRef.key}\n`);

    // Step 4: Verify the update
    console.log('🔍 STEP 4: Verifying update...');
    const verifySnapshot = await db.ref(`users/${adminKey}`).once('value');
    const updatedAdmin = verifySnapshot.val();
    
    if (updatedAdmin.email === newAdminEmail && updatedAdmin.password === newAdminPassword) {
      console.log(`   ✅ Verification successful!\n`);
      console.log('📋 Updated Admin Account:');
      console.log(`   Email: ${updatedAdmin.email}`);
      console.log(`   Password: ${updatedAdmin.password}`);
      console.log(`   isAdmin: ${updatedAdmin.isAdmin}`);
      console.log(`   Updated: ${updatedAdmin.updatedAt}\n`);
    } else {
      console.log('   ⚠️  Verification failed - data mismatch\n');
    }

    console.log('✅ Admin account update complete!\n');
    console.log('⚠️  IMPORTANT:');
    console.log('   1. Firebase Authentication service is not configured in this Firebase project');
    console.log('   2. Admin login uses database credentials (email/password) stored in users collection');
    console.log('   3. The server.js uses these database credentials for admin authentication');
    console.log(`   4. You can now login with: ${newAdminEmail} / ${newAdminPassword}`);
    console.log('   5. To enable Firebase Auth, visit: https://console.firebase.google.com\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during update:', error.message);
    console.error('Error Code:', error.code);
    process.exit(1);
  }
}

updateAdminInDatabase();
