require('dotenv').config();
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();
const auth = admin.auth();

async function migrateLegacyUsers() {
  console.log('\n============================================================');
  console.log('🔄 MIGRATING LEGACY USERS TO FIREBASE AUTH');
  console.log('============================================================\n');

  try {
    // Get all database users
    const dbSnapshot = await db.ref('users').once('value');
    const dbUsers = dbSnapshot.val() || {};

    // Get all Firebase Auth users
    let authEmails = new Set();
    let pageToken;
    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      listUsersResult.users.forEach(user => {
        authEmails.add(user.email.toLowerCase());
      });
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    // Find legacy users (in database but not in Firebase Auth)
    const legacyUsers = [];
    for (const [uid, user] of Object.entries(dbUsers)) {
      if (!user.email || uid === 'undefined') {
        console.log(`⏭️  Skipping corrupted entry: ${uid}`);
        continue;
      }
      
      if (!authEmails.has(user.email.toLowerCase())) {
        legacyUsers.push({ uid, ...user });
      }
    }

    console.log(`Found ${legacyUsers.length} legacy users to migrate\n`);

    if (legacyUsers.length === 0) {
      console.log('✅ All users already in Firebase Auth!');
      process.exit(0);
    }

    // Migrate each user
    let successCount = 0;
    let failureCount = 0;
    const migrationReport = [];

    for (const user of legacyUsers) {
      try {
        const tempPassword = crypto.randomBytes(12).toString('hex');
        
        console.log(`🔄 Migrating: ${user.email}`);

        // Create user in Firebase Auth with temp password
        await auth.createUser({
          email: user.email.toLowerCase().trim(),
          password: tempPassword,
          displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          uid: user.uid
        });

        // Update database to track migration
        await db.ref(`users/${user.uid}`).update({
          authMethod: 'firebase',
          migratedAt: new Date().toISOString(),
          migratedFromDatabase: true
        });

        console.log(`   ✅ Created in Firebase Auth`);
        console.log(`   📧 Temp Password: ${tempPassword}`);

        successCount++;
        migrationReport.push({
          email: user.email,
          uid: user.uid,
          status: 'success',
          tempPassword: tempPassword
        });

      } catch (error) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`   ⚠️  Already in Firebase Auth (syncing metadata...)`);
          
          // Just update the database metadata
          await db.ref(`users/${user.uid}`).update({
            authMethod: 'firebase',
            migratedAt: new Date().toISOString()
          });
          
          successCount++;
          migrationReport.push({
            email: user.email,
            uid: user.uid,
            status: 'already_exists',
            message: 'User already in Firebase Auth'
          });
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          failureCount++;
          migrationReport.push({
            email: user.email,
            uid: user.uid,
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    // Save migration report
    const reportPath = `migration-report-${new Date().toISOString().split('T')[0]}.json`;
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));

    console.log('\n============================================================');
    console.log('📊 MIGRATION RESULTS');
    console.log('============================================================\n');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`\n📄 Full report saved to: ${reportPath}`);

    if (successCount > 0) {
      console.log('\n⚠️  NEXT STEPS:');
      console.log('1. Email each user their temporary password');
      console.log('2. Direct them to /forgot-password to reset to their preferred password');
      console.log('3. Users can then use password reset feature going forward\n');
    }

    console.log('============================================================\n');

    process.exit(failureCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateLegacyUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
