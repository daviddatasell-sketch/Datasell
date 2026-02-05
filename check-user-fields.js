const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

async function checkUsers() {
  try {
    const snapshot = await admin.database().ref('users').limitToFirst(5).once('value');
    const users = snapshot.val();
    
    if (!users) {
      console.log('No users found');
      process.exit(0);
    }
    
    const entries = Object.entries(users);
    console.log(`\n=== Checking first ${entries.length} users ===\n`);
    
    entries.forEach(([uid, userData], idx) => {
      console.log(`\n[User ${idx + 1}] UID: ${uid}`);
      console.log('Data stored in Firebase:');
      console.log(JSON.stringify(userData, null, 2));
      console.log('\nField check:');
      console.log(`  - firstName: ${userData.firstName}`);
      console.log(`  - lastName: ${userData.lastName}`);
      console.log(`  - email: ${userData.email}`);
      console.log(`  - phone: ${userData.phone}`);
      console.log(`  - referralCode: ${userData.referralCode}`);
      console.log(`  - walletBalance: ${userData.walletBalance}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers();
