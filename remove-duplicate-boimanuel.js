require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

async function removeDuplicates() {
  try {
    console.log('📥 Fetching all accounts for boimanuel356@gmail.com...\n');
    
    const snapshot = await db.ref('users').orderByChild('email').equalTo('boimanuel356@gmail.com').once('value');
    const accounts = snapshot.val();
    
    if (!accounts) {
      console.log('❌ No accounts found for this email');
      process.exit(1);
    }
    
    const accountIds = Object.keys(accounts);
    console.log(`Found ${accountIds.length} account(s) for boimanuel356@gmail.com:\n`);
    
    accountIds.forEach((id, index) => {
      const user = accounts[id];
      console.log(`${index + 1}. ID: ${id}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Role: ${user.role || 'user'}`);
      console.log(`   Created: ${user.createdAt || 'N/A'}`);
      console.log(`   Last Login: ${user.lastLogin || 'N/A'}`);
      console.log();
    });
    
    if (accountIds.length <= 1) {
      console.log('✅ No duplicates found - only 1 account exists');
      process.exit(0);
    }
    
    // Keep the first one (earliest), delete the rest
    console.log('🔄 Keeping account #1 (first created), deleting the rest...\n');
    
    for (let i = 1; i < accountIds.length; i++) {
      const idToDelete = accountIds[i];
      await db.ref(`users/${idToDelete}`).remove();
      console.log(`✅ Deleted duplicate account #${i + 1} (ID: ${idToDelete})`);
    }
    
    console.log('\n✅ Duplicate removal complete!');
    console.log(`   Kept: 1 account`);
    console.log(`   Deleted: ${accountIds.length - 1} duplicate(s)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeDuplicates();
