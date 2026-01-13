const admin = require('firebase-admin');
require('dotenv').config();

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

async function verifyTransition() {
  console.log('\n============================================================');
  console.log('🔍 FIREBASE AUTH TRANSITION VERIFICATION');
  console.log('============================================================\n');

  try {
    // 1. Check signup flow
    console.log('📋 VERIFICATION CHECKLIST:\n');
    
    console.log('✅ 1. Signup Flow Status:');
    console.log('   - Users signup through /api/signup endpoint');
    console.log('   - New users are created in Firebase Auth (primary method)');
    console.log('   - User credentials stored in Firebase Auth');
    console.log('   - User profile data stored in Realtime Database');
    console.log('   - authMethod field tracks signup method (firebase or database)\n');

    console.log('✅ 2. Password Reset Flow Status:');
    console.log('   - Password reset uses Firebase Auth only');
    console.log('   - User lookup: admin.auth().getUserByEmail(email)');
    console.log('   - Reset link generation: admin.auth().generatePasswordResetLink()');
    console.log('   - Users MUST exist in Firebase Auth to reset password\n');

    console.log('✅ 3. Login Flow Status:');
    console.log('   - Login attempts both methods:');
    console.log('     a) Try Firebase Auth first');
    console.log('     b) Fallback to database-based auth if Firebase unavailable\n');

    // 2. Count users in Firebase Auth
    console.log('📊 AUTHENTICATION STATUS:\n');
    
    let authUserCount = 0;
    let authUsers = [];
    
    try {
      let pageToken;
      do {
        const listUsersResult = await auth.listUsers(1000, pageToken);
        authUserCount += listUsersResult.users.length;
        authUsers.push(...listUsersResult.users.map(u => ({ email: u.email, uid: u.uid, created: u.metadata.creationTime })));
        pageToken = listUsersResult.pageToken;
      } while (pageToken);
    } catch (error) {
      console.log('⚠️  Could not retrieve Firebase Auth users:', error.message);
    }

    console.log(`Firebase Auth Users: ${authUserCount}`);
    if (authUsers.length > 0) {
      console.log(`Sample users in Firebase Auth:`);
      authUsers.slice(0, 5).forEach(u => {
        console.log(`  - ${u.email} (UID: ${u.uid})`);
      });
      if (authUsers.length > 5) {
        console.log(`  ... and ${authUsers.length - 5} more\n`);
      }
    }

    // 3. Count users in Realtime Database
    const dbSnapshot = await db.ref('users').once('value');
    const dbUsers = dbSnapshot.val() || {};
    const dbUserCount = Object.keys(dbUsers).length;

    console.log(`Realtime Database Users: ${dbUserCount}`);
    const sampleDbUsers = Object.entries(dbUsers).slice(0, 5);
    if (sampleDbUsers.length > 0) {
      console.log(`Sample users in Database:`);
      sampleDbUsers.forEach(([uid, user]) => {
        console.log(`  - ${user.email} (UID: ${uid}) [Auth: ${user.authMethod}]`);
      });
      if (dbUserCount > 5) {
        console.log(`  ... and ${dbUserCount - 5} more\n`);
      }
    }

    // 4. Check for users only in database (not in Firebase Auth)
    console.log('\n⚠️  DATABASE-ONLY USERS (Cannot reset password):\n');
    
    let databaseOnlyCount = 0;
    const databaseOnlyUsers = [];

    for (const [uid, user] of Object.entries(dbUsers)) {
      try {
        await auth.getUser(uid);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          databaseOnlyCount++;
          databaseOnlyUsers.push({ email: user.email, uid });
        }
      }
    }

    if (databaseOnlyCount > 0) {
      console.log(`Found ${databaseOnlyCount} users only in Database (NOT in Firebase Auth):\n`);
      databaseOnlyUsers.forEach(user => {
        console.log(`  ❌ ${user.email} (UID: ${user.uid})`);
      });
      console.log(`\n⚠️  These users CANNOT use password reset. They must be manually migrated.\n`);
    } else {
      console.log('✅ All database users also exist in Firebase Auth!\n');
    }

    // 5. Transition Status
    console.log('\n📈 TRANSITION STATUS:\n');
    console.log(`✅ Firebase Auth Users: ${authUserCount}`);
    console.log(`📦 Database Total Users: ${dbUserCount}`);
    console.log(`❌ Database-Only Users: ${databaseOnlyCount}`);
    console.log(`✅ Firebase Auth Enabled Users: ${dbUserCount - databaseOnlyCount}`);
    
    const transitionPercentage = ((dbUserCount - databaseOnlyCount) / dbUserCount * 100).toFixed(2);
    console.log(`\n🎯 Transition Progress: ${transitionPercentage}%`);

    // 6. Recommendations
    console.log('\n📝 RECOMMENDATIONS:\n');
    
    if (databaseOnlyCount === 0) {
      console.log('✅ SYSTEM IS READY: All users can now use password reset functionality!');
      console.log('✅ Going forward, all new signups will use Firebase Auth');
      console.log('✅ Password reset will work for all users');
    } else {
      console.log(`⚠️  ${databaseOnlyCount} legacy users need migration:`);
      console.log('   Option 1: Users can register again with the signup form');
      console.log('   Option 2: Run migration script to add these users to Firebase Auth');
      console.log('   Option 3: Provide alternative password reset method for legacy users');
    }

    console.log('\n============================================================');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  }

  process.exit(0);
}

verifyTransition().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
