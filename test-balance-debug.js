#!/usr/bin/env node

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

async function findAdminUser() {
  try {
    console.log('🔍 Searching for admin user: boimanuel356@gmail.com');
    
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    let adminUser = null;
    let adminUid = null;
    
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.email === 'boimanuel356@gmail.com') {
        adminUser = userData;
        adminUid = uid;
        break;
      }
    }
    
    if (adminUser) {
      console.log('\n✅ Found admin user:');
      console.log('   UID:', adminUid);
      console.log('   Email:', adminUser.email);
      console.log('   Name:', adminUser.firstName, adminUser.lastName);
      console.log('   Phone:', adminUser.phone);
      console.log('   walletBalance:', adminUser.walletBalance);
      console.log('   isAdmin:', adminUser.isAdmin);
      console.log('\n📋 Full user object:');
      console.log(JSON.stringify(adminUser, null, 2));
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findAdminUser();
