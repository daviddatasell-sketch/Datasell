const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = {
  type: 'service_account',
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

async function checkReferralCodes() {
  try {
    const snapshot = await admin.database().ref('users').once('value');
    const users = snapshot.val() || {};

    console.log('📊 Sample of users and their referral codes:\n');
    
    let count = 0;
    for (const [uid, userData] of Object.entries(users)) {
      if (count < 10) {
        console.log(`User: ${uid.substring(0, 8)}...`);
        console.log(`  Email: ${userData.email}`);
        console.log(`  Phone: ${userData.phone}`);
        console.log(`  Referral Code: ${userData.referralCode}`);
        console.log('');
        count++;
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReferralCodes();
