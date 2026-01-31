#!/usr/bin/env node

/**
 * User Management Tool for DataSell
 * Lists all users and allows permanent deletion
 */

require('dotenv').config();
const admin = require('firebase-admin');
const readline = require('readline');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Simple table formatter without external dependencies
function formatTable(headers, rows) {
  // Calculate column widths
  const colWidths = headers.map((header, idx) => {
    let maxWidth = header.length;
    rows.forEach(row => {
      const cellLength = String(row[idx] || '').length;
      if (cellLength > maxWidth) maxWidth = cellLength;
    });
    return maxWidth + 2;
  });

  // Top border
  let table = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐\n';

  // Header row
  let headerRow = '│';
  headers.forEach((header, idx) => {
    headerRow += ' ' + String(header).padEnd(colWidths[idx] - 1) + '│';
  });
  table += headerRow + '\n';

  // Header separator
  table += '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤\n';

  // Data rows
  rows.forEach(row => {
    let dataRow = '│';
    row.forEach((cell, idx) => {
      dataRow += ' ' + String(cell || 'N/A').padEnd(colWidths[idx] - 1) + '│';
    });
    table += dataRow + '\n';
  });

  // Bottom border
  table += '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘';

  return table;
}

async function listAllUsers() {
  try {
    console.log('\n📋 Loading all users from database...\n');
    
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val() || {};
    const userArray = Object.entries(users).map(([uid, userData]) => ({
      uid,
      ...userData
    }));

    if (userArray.length === 0) {
      console.log('❌ No users found in database');
      return userArray;
    }

    // Prepare table data
    const headers = ['No.', 'User ID', 'Name', 'Email', 'Phone', 'Sign-in', 'Created', 'Admin'];
    const rows = userArray.map((user, index) => {
      const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
      const uidShort = user.uid.substring(0, 8) + '...';
      const createdDate = user.createdAt 
        ? new Date(user.createdAt).toLocaleDateString()
        : 'N/A';
      const signInMethod = user.signInMethod || user.authMethod || 'N/A';
      const isAdmin = user.isAdmin ? 'Yes' : 'No';

      return [
        index + 1,
        uidShort,
        displayName.substring(0, 20),
        user.email ? user.email.substring(0, 25) : 'N/A',
        user.phone || 'N/A',
        signInMethod.substring(0, 8),
        createdDate,
        isAdmin
      ];
    });

    console.log(formatTable(headers, rows));
    console.log(`\n✅ Total Users: ${userArray.length}\n`);

    return userArray;

  } catch (error) {
    console.error('❌ Error loading users:', error.message);
    process.exit(1);
  }
}

async function deleteUser(uid) {
  try {
    console.log(`\n🔍 Fetching user data for: ${uid}`);
    
    const userSnapshot = await admin.database().ref(`users/${uid}`).once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      console.log(`❌ User not found: ${uid}`);
      return false;
    }

    console.log(`\n⚠️  USER DATA TO BE DELETED:`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Name: ${userData.firstName} ${userData.lastName}`);
    console.log(`   UID: ${uid}`);
    console.log(`   Created: ${userData.createdAt}`);

    const confirm = await question('\n🔴 Are you sure you want to PERMANENTLY DELETE this user? (type "yes" to confirm): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Deletion cancelled');
      return false;
    }

    console.log('\n🗑️  Deleting user completely from database...');
    
    // Delete user from database
    await admin.database().ref(`users/${uid}`).remove();
    console.log('✅ User deleted from database');

    // Delete user from Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
      console.log('✅ User deleted from Firebase Authentication');
    } catch (authError) {
      console.log('⚠️  Could not delete from Firebase Auth (user might not exist in auth)');
    }

    // Delete user transactions
    try {
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
        console.log(`✅ Deleted ${deletedTransactions} user transactions`);
      }
    } catch (transError) {
      console.log('⚠️  Could not delete transactions');
    }

    // Delete user logs
    try {
      const logsSnapshot = await admin.database().ref('userLogs').once('value');
      const logs = logsSnapshot.val() || {};
      let deletedLogs = 0;

      const updates = {};
      Object.entries(logs).forEach(([logId, log]) => {
        if (log.userId === uid) {
          updates[`userLogs/${logId}`] = null;
          deletedLogs++;
        }
      });

      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
        console.log(`✅ Deleted ${deletedLogs} user activity logs`);
      }
    } catch (logError) {
      console.log('⚠️  Could not delete logs');
    }

    console.log(`\n✅ User ${userData.email} has been PERMANENTLY deleted with NO TRACES!\n`);
    return true;

  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 DATASELL USER MANAGEMENT TOOL');
  console.log('═══════════════════════════════════════════════════════════');

  // List all users
  const users = await listAllUsers();

  if (users.length === 0) {
    console.log('No users to manage');
    rl.close();
    process.exit(0);
  }

  // Ask user for action
  while (true) {
    const action = await question('What would you like to do?\n1. Delete a user\n2. Exit\n\nEnter choice (1-2): ');

    if (action === '2') {
      console.log('\n👋 Goodbye!\n');
      break;
    }

    if (action === '1') {
      const uidToDelete = await question('\nEnter the full User ID to delete (or "cancel" to go back): ');
      
      if (uidToDelete.toLowerCase() === 'cancel') {
        continue;
      }

      // Verify UID exists
      const userExists = users.find(u => u.uid === uidToDelete);
      if (!userExists) {
        console.log('❌ User ID not found');
        continue;
      }

      const deleted = await deleteUser(uidToDelete);
      
      if (deleted) {
        // Remove from local array and refresh table
        const index = users.findIndex(u => u.uid === uidToDelete);
        if (index > -1) {
          users.splice(index, 1);
        }

        if (users.length > 0) {
          console.log('📋 Updated user list:\n');
          const headers = ['No.', 'User ID', 'Name', 'Email', 'Phone', 'Sign-in', 'Created', 'Admin'];
          const rows = users.map((user, index) => {
            const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
            const uidShort = user.uid.substring(0, 8) + '...';
            const createdDate = user.createdAt 
              ? new Date(user.createdAt).toLocaleDateString()
              : 'N/A';
            const signInMethod = user.signInMethod || user.authMethod || 'N/A';
            const isAdmin = user.isAdmin ? 'Yes' : 'No';

            return [
              index + 1,
              uidShort,
              displayName.substring(0, 20),
              user.email ? user.email.substring(0, 25) : 'N/A',
              user.phone || 'N/A',
              signInMethod.substring(0, 8),
              createdDate,
              isAdmin
            ];
          });

          console.log(formatTable(headers, rows));
          console.log(`\n✅ Remaining Users: ${users.length}\n`);
        } else {
          console.log('\n📭 No more users in database\n');
        }
      }
    }
  }

  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
