const admin = require('firebase-admin');
require('dotenv').config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ FIREBASE_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  console.log('✅ Firebase Admin initialized successfully\n');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

async function listAllUsers() {
  try {
    console.log('============================================================');
    console.log('📋 FETCHING ALL USERS FROM DATABASE');
    console.log('============================================================\n');

    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.once('value');
    const users = snapshot.val();

    if (!users) {
      console.log('❌ No users found in database');
      process.exit(0);
    }

    const userArray = [];
    Object.keys(users).forEach((userId) => {
      userArray.push({
        userId,
        ...users[userId],
      });
    });

    // Sort by creation date (newest first)
    userArray.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created || 0);
      const dateB = new Date(b.createdAt || b.created || 0);
      return dateB - dateA;
    });

    console.log(`📊 Total Users: ${userArray.length}\n`);
    console.log('============================================================');

    userArray.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'N/A'}`);
      console.log(`   └─ Email: ${user.email || 'N/A'}`);
      console.log(`   └─ Phone: ${user.phone || 'N/A'}`);
      console.log(`   └─ User ID: ${user.userId}`);
      console.log(`   └─ Created: ${user.createdAt || user.created || 'N/A'}`);
      console.log(`   └─ Role: ${user.role || 'user'}`);
      if (user.status) console.log(`   └─ Status: ${user.status}`);
      if (user.profilePicture) console.log(`   └─ Has Profile Picture: Yes`);
      console.log('   ' + '─'.repeat(50));
    });

    console.log('\n============================================================');
    console.log('✅ User List Complete');
    console.log('============================================================\n');

    // Export to file for reference
    const fs = require('fs');
    const timestamp = new Date().toISOString().split('T')[0];
    fs.writeFileSync(
      `users-list-${timestamp}.json`,
      JSON.stringify(userArray, null, 2)
    );
    console.log(`📄 Users exported to: users-list-${timestamp}.json`);

    admin.app().delete();
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }
}

listAllUsers();
