const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Initialize Firebase
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
  console.log('✅ Firebase connected');
} catch (error) {
  console.error('❌ Firebase init failed:', error.message);
  process.exit(1);
}

async function syncPasswordHashes() {
  const db = admin.database();
  
  // Load backup
  const backupPath = path.join(__dirname, 'firebase-backup-2026-01-06/complete-backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup not found');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const backupUsers = backup.exportedCollections.users || {};

  console.log('\n' + '='.repeat(60));
  console.log('🔐 SYNCING PASSWORD HASHES');
  console.log('='.repeat(60));
  console.log(`Backup users: ${Object.keys(backupUsers).length}`);

  // Get current users
  const snap = await db.ref('users').once('value');
  const currentUsers = snap.val() || {};

  console.log(`Current users: ${Object.keys(currentUsers).length}`);
  console.log('='.repeat(60) + '\n');

  let updated = 0;
  let failed = 0;

  // Sync hashes
  for (const [currentUid, currentUser] of Object.entries(currentUsers)) {
    if (!currentUser.email) continue;

    // Find matching user in backup by email
    let backupUser = null;
    for (const [backupUid, bUser] of Object.entries(backupUsers)) {
      if (bUser.email && bUser.email.toLowerCase() === currentUser.email.toLowerCase()) {
        backupUser = bUser;
        break;
      }
    }

    if (!backupUser) {
      console.log(`⏭️  ${currentUser.email} - Not in backup`);
      failed++;
      continue;
    }

    if (!backupUser.passwordHash) {
      console.log(`⚠️  ${currentUser.email} - No password hash in backup`);
      failed++;
      continue;
    }

    if (currentUser.passwordHash === backupUser.passwordHash) {
      console.log(`✅ ${currentUser.email} - Already synced`);
      updated++;
      continue;
    }

    try {
      // Update password hash
      await db.ref(`users/${currentUid}`).update({
        passwordHash: backupUser.passwordHash,
        hashSyncedAt: new Date().toISOString()
      });
      console.log(`✅ ${currentUser.email} - Hash synced`);
      updated++;
    } catch (error) {
      console.log(`❌ ${currentUser.email} - Failed: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log('='.repeat(60));
  console.log('\n🎉 PASSWORD HASHES SYNCED!');
  console.log('Users can now login with their original passwords!\n');

  process.exit(failed > 0 ? 1 : 0);
}

syncPasswordHashes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
