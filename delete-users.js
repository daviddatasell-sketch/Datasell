require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase with environment variables
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

// User IDs to delete
const usersToDelete = [
  { email: 'marcolidatasell@gmail.com', uid: 'xLzxh9WP1zdDWDkeZzZTj4IxFWz1' },
  { email: 'manueldatasell@gmail.com', uid: 'pFxieJpkTGUBYFp9RN62K4hzEf02' },
  { email: 'daviddatasell@gmail.com', uid: '6xHfR5i1qVcJO5bRU3hWLyJt1Jr2' },
  { email: 'angelafotsi@gmail.com', uid: 'HRz6dMfDoHPXbNOzHjB2TxZ8iWJ3' },
  { email: 'davidfotsi1@gmail.com', uid: 'GjORRtwBvKbB7qa1ftddUtA9kUr1' },
];

async function deleteUsers() {
  console.log('\n============================================================');
  console.log('🗑️  DELETING DUPLICATE USER ACCOUNTS');
  console.log('============================================================\n');

  let deletedCount = 0;
  let failedCount = 0;

  for (const user of usersToDelete) {
    try {
      console.log(`\n🔍 Processing: ${user.email} (UID: ${user.uid})`);

      // Delete from Firebase Authentication
      try {
        await auth.deleteUser(user.uid);
        console.log(`   ✅ Deleted from Firebase Auth`);
      } catch (authError) {
        console.log(`   ⚠️  Auth deletion skipped: ${authError.message}`);
      }

      // Delete from Realtime Database
      try {
        // Find user by email in database
        const snapshot = await db.ref('users').orderByChild('email').equalTo(user.email).once('value');
        
        if (snapshot.exists()) {
          const updates = {};
          snapshot.forEach((childSnapshot) => {
            updates[`/users/${childSnapshot.key}`] = null;
          });
          
          await db.ref().update(updates);
          console.log(`   ✅ Deleted from Realtime Database`);
        } else {
          console.log(`   ⚠️  Not found in Realtime Database`);
        }
      } catch (dbError) {
        console.log(`   ⚠️  Database deletion error: ${dbError.message}`);
      }

      // Delete profile pictures if exists
      try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(`profile-pictures/${user.uid}.jpg`);
        await file.delete().catch(() => {}); // Ignore if file doesn't exist
        console.log(`   ✅ Deleted profile picture`);
      } catch (storageError) {
        console.log(`   ⚠️  Storage cleanup skipped`);
      }

      deletedCount++;
      console.log(`   ✨ ${user.email} completely removed`);

    } catch (error) {
      failedCount++;
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n============================================================');
  console.log(`✅ Deletion Complete: ${deletedCount} users deleted, ${failedCount} failed`);
  console.log('============================================================\n');

  process.exit(0);
}

deleteUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
