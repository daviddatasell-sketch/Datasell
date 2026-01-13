const admin = require('firebase-admin');
require('dotenv').config();

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

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const emails = [
  'bennybondzie1994@gmail.com',
  'petersarfo788@gmail.com', 
  'anjoycelyn25@gmail.com',
  'angelafotsi@gmail.com'
];

(async () => {
  console.log('Checking Firebase Auth for users...\n');
  for (const email of emails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      console.log('✅', email, '- FOUND in Auth (UID:', user.uid + ')');
    } catch(e) { 
      console.log('❌', email, '- NOT FOUND in Auth');
    }
  }
  process.exit();
})();
