#!/usr/bin/env node

/**
 * Delete Corrupted User Entries
 * Removes entries with missing or undefined data
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

async function deleteCorruptedEntries() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🗑️  DELETE CORRUPTED USER ENTRIES');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get all users
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    let deletedCount = 0;
    const deletedUsers = [];

    // Find and delete corrupted entries
    for (const [uid, userData] of Object.entries(users)) {
      const userEmail = userData.email || 'N/A';
      const firstName = userData.firstName || 'N/A';
      const lastName = userData.lastName || 'N/A';
      
      // Check if corrupted (undefined, N/A, or missing email)
      const isCorrupted = !userData.email || 
                         userData.email === 'N/A' || 
                         userData.firstName === 'undefined' || 
                         (uid.toLowerCase().includes('undefined') && !userData.email);
      
      if (isCorrupted) {
        try {
          console.log(`\n🔍 Found corrupted entry:`);
          console.log(`   UID: ${uid}`);
          console.log(`   Name: ${firstName} ${lastName}`);
          console.log(`   Email: ${userEmail}`);
          
          // Delete from database
          await admin.database().ref(`users/${uid}`).remove();
          console.log('   ✅ Deleted from database');

          // Try to delete from Firebase Auth if possible
          try {
            await admin.auth().deleteUser(uid);
            console.log('   ✅ Deleted from Firebase Auth');
          } catch (authError) {
            console.log('   ⚠️  Could not delete from Firebase Auth (already deleted or invalid)');
          }

          console.log(`\n   ✅ CORRUPTED ENTRY PERMANENTLY DELETED\n`);
          deletedUsers.push({
            uid: uid,
            email: userEmail,
            name: `${firstName} ${lastName}`
          });
          deletedCount++;

        } catch (error) {
          console.error(`   ❌ Error deleting entry: ${error.message}`);
        }
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 DELETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (deletedCount > 0) {
      console.log(`✅ Successfully deleted: ${deletedCount} corrupted entries\n`);
      deletedUsers.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.uid} (${user.email})`);
      });
    } else {
      console.log('✅ No corrupted entries found!');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

deleteCorruptedEntries();
