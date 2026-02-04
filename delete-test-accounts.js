#!/usr/bin/env node

/**
 * Batch Delete Test Accounts
 * Removes identified test accounts completely
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Test account emails to delete
const testAccounts = [
  'datasellgh@gmail.com',           // Datasell
  'edithdatasell@gmail.com',        // Edith Datasell
  'daviddatasell@gmail.com',        // daviddatasell User
  'angelafotsi@gmail.com',          // MANUEL TEST 1
  'datasellcharles@gmail.com',      // John test 1
  'fotsiemmanuel397@gmail.com'      // fotsiemmanuel397 User
];

// UIDs to delete (for corrupted entries without email)
const corruptedUIDs = [];

async function deleteTestAccounts() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🗑️  BATCH DELETE TEST ACCOUNTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get all users
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    let deletedCount = 0;
    let failedCount = 0;
    const deletedUsers = [];

    // Find and delete test accounts by email or corrupted entries
    for (const [uid, userData] of Object.entries(users)) {
      const userEmail = userData.email || '';
      const isCorrupted = !userEmail || userEmail === 'N/A' || !userData.firstName || userData.firstName === 'undefined';
      
      if (testAccounts.includes(userEmail) || (isCorrupted && corruptedUIDs.includes(uid))) {
        try {
          console.log(`\n🔍 Found test account: ${userData.email} (${userData.firstName} ${userData.lastName})`);
          console.log(`   UID: ${uid}`);
          console.log(`   Created: ${userData.createdAt}`);
          
          // Delete from database
          await admin.database().ref(`users/${uid}`).remove();
          console.log('   ✅ Deleted from database');

          // Delete from Firebase Auth
          try {
            await admin.auth().deleteUser(uid);
            console.log('   ✅ Deleted from Firebase Auth');
          } catch (authError) {
            console.log('   ⚠️  Could not delete from Firebase Auth');
          }

          // Delete transactions
          const transactionsSnapshot = await admin.database().ref('transactions').once('value');
          const transactions = transactionsSnapshot.val() || {};
          let deletedTransactions = 0;

          const updates = {};
          Object.entries(transactions).forEach(([transId, transaction]) => {
            if (transaction.userId === uid) {
              updates[`transactions/${transId}`] = null;
              deletedTransactions++;
            }
          });

          if (Object.keys(updates).length > 0) {
            await admin.database().ref().update(updates);
            console.log(`   ✅ Deleted ${deletedTransactions} transactions`);
          }

          // Delete logs
          const logsSnapshot = await admin.database().ref('userLogs').once('value');
          const logs = logsSnapshot.val() || {};
          let deletedLogs = 0;

          const logUpdates = {};
          Object.entries(logs).forEach(([logId, log]) => {
            if (log.userId === uid) {
              logUpdates[`userLogs/${logId}`] = null;
              deletedLogs++;
            }
          });

          if (Object.keys(logUpdates).length > 0) {
            await admin.database().ref().update(logUpdates);
            console.log(`   ✅ Deleted ${deletedLogs} activity logs`);
          }

          console.log(`\n   ✅ ${userData.email} PERMANENTLY DELETED\n`);
          deletedUsers.push({
            email: userData.email,
            name: `${userData.firstName} ${userData.lastName}`,
            uid: uid
          });
          deletedCount++;

        } catch (error) {
          console.error(`   ❌ Error deleting user: ${error.message}`);
          failedCount++;
        }
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 DELETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (deletedCount > 0) {
      console.log(`✅ Successfully deleted: ${deletedCount} accounts\n`);
      deletedUsers.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.email} (${user.name})`);
      });
    }

    if (failedCount > 0) {
      console.log(`\n❌ Failed to delete: ${failedCount} accounts`);
    }

    console.log(`\n✅ Total removed: ${deletedCount} test accounts`);
    console.log('\n═══════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

deleteTestAccounts();
