const admin = require('firebase-admin');
require('dotenv').config();

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

const db = admin.database();
const auth = admin.auth();

async function resetUserPassword() {
  const email = 'jeffersonbentil@gmail.com';
  const newPassword = 'Jefferson2024!Secure';
  
  try {
    console.log(`\n🔍 Searching for user: ${email}\n`);
    
    // First, check if user exists in database
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    
    if (!snapshot.exists()) {
      console.log(`❌ User not found in database!`);
      console.log(`\nSearching all users...`);
      
      const allUsers = await usersRef.once('value');
      const allData = allUsers.val();
      
      if (allData) {
        console.log(`\n📊 All users in database:`);
        Object.entries(allData).forEach(([uid, userData]) => {
          console.log(`  - ${userData.email || 'No email'} (UID: ${uid})`);
        });
      }
      
      process.exit(1);
    }
    
    // User found in database
    const userData = Object.entries(snapshot.val())[0];
    const uid = userData[0];
    const userInfo = userData[1];
    
    console.log(`✅ User found in database!`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${userInfo.email}`);
    console.log(`   Name: ${userInfo.name || 'N/A'}`);
    
    // Try to update in Firebase Auth
    try {
      await auth.updateUser(uid, {
        password: newPassword
      });
      console.log(`\n✅ Password updated in Firebase Auth!`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log(`\n⚠️  User not in Firebase Auth - creating user...`);
        
        // Create user in Firebase Auth
        const createdUser = await auth.createUser({
          uid: uid,
          email: email,
          password: newPassword,
          emailVerified: false
        });
        
        console.log(`✅ User created in Firebase Auth!`);
      } else {
        throw authError;
      }
    }
    
    // Update database
    await db.ref(`users/${uid}`).update({
      temporaryPassword: newPassword,
      passwordResetRequired: false,
      lastPasswordUpdate: new Date().toISOString()
    });
    
    console.log(`\n` + '='.repeat(50));
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Temporary Password: ${newPassword}`);
    console.log(`🆔 UID: ${uid}`);
    console.log('='.repeat(50) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetUserPassword();
