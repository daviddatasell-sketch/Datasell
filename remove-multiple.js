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

async function removeMultipleUsers(userIds) {
  try {
    console.log('\n============================================================');
    console.log('🔒 REMOVING IMPOSTER ACCOUNTS (BATCH)');
    console.log('============================================================\n');

    const removedUsers = [];
    const timestamp = new Date().toISOString();

    for (const userId of userIds) {
      try {
        console.log(`\n📋 Processing User ID: ${userId}`);

        // Get user details before deletion
        const userRef = admin.database().ref(`users/${userId}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData) {
          console.log(`   ⚠️  User not found in database`);
          continue;
        }

        console.log(`   Email: ${userData.email}`);
        console.log(`   Phone: ${userData.phone || 'N/A'}`);

        // Delete from Realtime Database
        console.log(`   🗑️  Deleting from database...`);
        await userRef.remove();
        console.log(`   ✅ Deleted from Realtime Database`);

        // Delete from Firebase Authentication
        try {
          await admin.auth().deleteUser(userId);
          console.log(`   ✅ Deleted from Firebase Authentication`);
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.log(`   ⚠️  Not found in Firebase Auth`);
          } else {
            console.log(`   ❌ Auth deletion failed: ${authError.message}`);
          }
        }

        // Block phone number if available
        if (userData.phone) {
          const blockedRef = admin.database().ref('blockedPhones');
          await blockedRef.child(userData.phone.replace(/\D/g, '')).set({
            phone: userData.phone,
            blockedAt: timestamp,
            reason: 'Imposter account - permanent block',
            originalUserId: userId,
            originalEmail: userData.email,
          });
          console.log(`   🚫 Phone ${userData.phone} blocked`);
        } else {
          console.log(`   ℹ️  No phone number to block`);
        }

        removedUsers.push({
          userId,
          email: userData.email,
          phone: userData.phone || 'N/A',
        });

      } catch (error) {
        console.error(`   ❌ Error processing user ${userId}: ${error.message}`);
      }
    }

    // Log all removals to admin logs
    const logsRef = admin.database().ref('adminLogs');
    await logsRef.push({
      action: 'BATCH_USER_REMOVAL',
      timestamp,
      removedCount: removedUsers.length,
      removedUsers,
      adminEmail: process.env.ADMIN_EMAIL,
      reason: 'Multiple imposter accounts - batch removal',
    });

    console.log('\n============================================================');
    console.log('✅ BATCH REMOVAL COMPLETE');
    console.log('============================================================\n');
    console.log(`📊 Removed ${removedUsers.length} imposter accounts:\n`);

    removedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.phone})`);
    });

    console.log('\n   ✅ All accounts permanently deleted');
    console.log('   ✅ All available phone numbers blocked');
    console.log('   ✅ Actions logged for audit trail\n');

    admin.app().delete();
  } catch (error) {
    console.error('❌ Error during batch removal:', error.message);
    admin.app().delete();
    process.exit(1);
  }
}

// Get user IDs from command line arguments
const userIds = process.argv.slice(2);

if (userIds.length === 0) {
  console.error('\n❌ No user IDs provided!');
  console.error('Usage: node remove-multiple.js <USER_ID_1> <USER_ID_2> ...');
  console.error('\nExample: node remove-multiple.js -Ohu61odvmtFJkQZF8xT -Ohu61knYSRlHtOr0J_k v51rfr2vrdgWY3RteTbyDrRGW4M2 hCXWrFLZhiaJzdPUeXSqKwuaVBU2\n');
  process.exit(1);
}

removeMultipleUsers(userIds);
