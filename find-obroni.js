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

async function findUser() {
  try {
    const snapshot = await admin.database().ref('users').once('value');
    const users = snapshot.val();
    
    if (!users) {
      console.log('No users found');
      process.exit(0);
    }
    
    const found = Object.entries(users).find(([uid, data]) => {
      return data.firstName === 'Obroni' || data.email === 'chongprincess7@gmail.com';
    });
    
    if (found) {
      const [uid, data] = found;
      console.log(`\nFound user!\nUID: ${uid}\n`);
      console.log('Full user data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('User not found, showing all users with their emails:');
      Object.entries(users).slice(0, 10).forEach(([uid, data]) => {
        console.log(`${uid}: ${data.firstName} ${data.lastName} (${data.email})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

findUser();
