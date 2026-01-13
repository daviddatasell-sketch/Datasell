const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Initialize NEW Firebase with .env credentials
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
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const auth = admin.auth();
const db = admin.database();

// Helper function to generate random password
function generatePassword() {
  // SMS-friendly: Only alphanumeric (no special chars, no emojis)
  // Format: 3 uppercase + 3 numbers + 6 lowercase = 12 chars total
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  
  let password = '';
  // Add 3 uppercase
  for (let i = 0; i < 3; i++) {
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  }
  // Add 3 numbers
  for (let i = 0; i < 3; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  // Add 6 lowercase
  for (let i = 0; i < 6; i++) {
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  }
  return password;
}

async function migrateUsers() {
  const backupPath = path.join(__dirname, 'firebase-backup-2026-01-06/complete-backup.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found at:', backupPath);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const users = backup.exportedCollections.users || {};
  
  console.log('\n' + '='.repeat(60));
  console.log('👥 MIGRATING USERS TO NEW FIREBASE');
  console.log('='.repeat(60));
  console.log(`Total users to migrate: ${Object.keys(users).length}`);
  console.log('='.repeat(60) + '\n');

  const results = {
    created: [],
    alreadyExists: [],
    failed: [],
    passwordHashesSynced: []
  };

  let index = 0;
  for (const [uid, userData] of Object.entries(users)) {
    index++;
    const email = userData.email;
    
    if (!email) {
      console.log(`⏭️  [${index}] Skipping user - no email`);
      results.failed.push({ uid, reason: 'No email' });
      continue;
    }

    try {
      // Check if user already exists
      let existingUser = null;
      try {
        existingUser = await auth.getUserByEmail(email);
      } catch (err) {
        // User doesn't exist, which is what we want
      }

      if (existingUser) {
        // User exists, just sync password hash if not already there
        console.log(`♻️  [${index}] ${email} - Syncing password hash`);
        
        if (userData.passwordHash) {
          await db.ref(`users/${existingUser.uid}`).update({
            passwordHash: userData.passwordHash,
            hybridAuth: true,
            hashSyncedAt: new Date().toISOString()
          });
          results.passwordHashesSynced.push(email);
        }
        results.alreadyExists.push(email);
        continue;
      }

      // Generate temporary password for initial Firebase Auth setup
      const tempPassword = generatePassword();

      // Create user in Firebase Auth with temporary password
      const userRecord = await auth.createUser({
        email: email,
        password: tempPassword,
        displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        disabled: userData.suspended === true
      });

      console.log(`✅ [${index}] ${email} - Created in Firebase Auth`);
      
      // Copy all user data to database with password hash for bcrypt auth
      const userDataToStore = {
        ...userData,
        firebaseUid: userRecord.uid,
        migratedAt: new Date().toISOString(),
        hybridAuth: true // Enable hybrid authentication (Firebase + bcrypt)
      };

      // Make sure password hash is included
      if (userData.passwordHash) {
        userDataToStore.passwordHash = userData.passwordHash;
        results.passwordHashesSynced.push(email);
      }

      await db.ref(`users/${userRecord.uid}`).set(userDataToStore);

      results.created.push({
        uid: userRecord.uid,
        email: email,
        name: `${userData.firstName} ${userData.lastName}`,
        hasPasswordHash: !!userData.passwordHash
      });

    } catch (error) {
      console.log(`❌ [${index}] ${email} - Failed: ${error.message}`);
      results.failed.push({
        uid,
        email,
        reason: error.message
      });
    }

    // Rate limiting
    if (index % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Save results
  const resultsFile = path.join(__dirname, 'migration-results-' + new Date().toISOString().split('T')[0] + '.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Created:              ${results.created.length}`);
  console.log(`⏭️  Already Exist:        ${results.alreadyExists.length}`);
  console.log(`🔐 Password Hashes Synced: ${results.passwordHashesSynced.length}`);
  console.log(`❌ Failed:               ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    console.log('\n⚠️  Failed Users:');
    results.failed.forEach(f => {
      console.log(`   - ${f.email || f.uid}: ${f.reason}`);
    });
  }

  console.log('\n✅ Results saved to: ' + resultsFile);
  console.log('\n📝 NEXT STEPS:');
  console.log('1. ✅ Users are now in Firebase Auth');
  console.log('2. ✅ Password hashes are synced from old Firebase');
  console.log('3. ✅ Users can NOW LOG IN WITH THEIR ORIGINAL PASSWORDS!');
  console.log('4. The login system uses bcrypt to verify passwords against the backup hashes');
  console.log('5. No password reset needed - just use the same password they created the account with');
  console.log('='.repeat(60) + '\n');

  process.exit(results.failed.length > 0 ? 1 : 0);
}

migrateUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
