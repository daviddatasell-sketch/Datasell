const admin = require('firebase-admin');
require('dotenv').config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ FIREBASE_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

async function removeUserAndBlockPhone(userIdToRemove, phoneToBlock) {
  try {
    console.log('\n============================================================');
    console.log('🔒 REMOVING IMPOSTER ACCOUNT & BLOCKING PHONE NUMBER');
    console.log('============================================================\n');

    // 1. Get user details before deletion (for logging)
    const userRef = admin.database().ref(`users/${userIdToRemove}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      console.error(`❌ User not found: ${userIdToRemove}`);
      process.exit(1);
    }

    console.log('📋 User Details to be Removed:');
    console.log(`   Name: ${userData.name || 'N/A'}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Phone: ${userData.phone}`);
    console.log(`   User ID: ${userIdToRemove}`);
    console.log(`   Created: ${userData.createdAt || userData.created || 'N/A'}\n`);

    // 2. Delete user from Realtime Database
    console.log('🗑️  Deleting user from Realtime Database...');
    await userRef.remove();
    console.log('   ✅ User deleted from Realtime Database');

    // 3. Delete user from Firebase Authentication
    try {
      console.log('🔐 Deleting user from Firebase Authentication...');
      await admin.auth().deleteUser(userIdToRemove);
      console.log('   ✅ User deleted from Firebase Authentication');
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log('   ⚠️  User not found in Firebase Auth (might already be deleted)');
      } else {
        throw authError;
      }
    }

    // 4. Add phone number to blocked list
    const blockedRef = admin.database().ref('blockedPhones');
    const timestamp = new Date().toISOString();
    await blockedRef.child(phoneToBlock.replace(/\D/g, '')).set({
      phone: phoneToBlock,
      blockedAt: timestamp,
      reason: 'Imposter account - permanent block',
      originalUserId: userIdToRemove,
      originalEmail: userData.email,
      originalName: userData.name || 'N/A',
    });
    console.log('🚫 Adding phone number to blocked list...');
    console.log(`   ✅ Phone ${phoneToBlock} is now permanently blocked`);

    // 5. Log the action
    const logsRef = admin.database().ref('adminLogs');
    await logsRef.push({
      action: 'USER_REMOVED_PHONE_BLOCKED',
      timestamp,
      removedUserId: userIdToRemove,
      removedEmail: userData.email,
      removedPhone: userData.phone,
      blockedPhone: phoneToBlock,
      adminEmail: process.env.ADMIN_EMAIL,
      reason: 'Imposter account - permanent removal',
    });
    console.log('📝 Logging action to admin logs...');
    console.log('   ✅ Action logged');

    console.log('\n============================================================');
    console.log('✅ ACCOUNT REMOVAL COMPLETE');
    console.log('============================================================');
    console.log('\n📊 SUMMARY:');
    console.log(`   • User Account Deleted: ${userData.email}`);
    console.log(`   • Phone Number Blocked: ${phoneToBlock}`);
    console.log(`   • Timestamp: ${timestamp}`);
    console.log('   • The imposter can never create a new account with this phone number\n');

    admin.app().delete();
  } catch (error) {
    console.error('❌ Error removing user:', error.message);
    admin.app().delete();
    process.exit(1);
  }
}

// Get arguments from command line
const userId = process.argv[2];
const phone = process.argv[3];

if (!userId || !phone) {
  console.error('\n❌ Missing arguments!');
  console.error('Usage: node remove-imposter.js <USER_ID> <PHONE_NUMBER>');
  console.error('\nExample: node remove-imposter.js kj4rlI8FK8fBvd5O4Rho5ZsOR7f2 0547574061\n');
  process.exit(1);
}

removeUserAndBlockPhone(userId, phone);
