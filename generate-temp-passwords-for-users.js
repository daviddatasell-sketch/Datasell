const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

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

const db = admin.database();

// Users to generate passwords for
const targetUsers = [
  'tenkorangwilson7@gmail.com',
  'jeffersonbentil@gmail.com'
];

// Function to generate a secure temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function generatePasswordsForUsers() {
  console.log('🔐 Generating temporary passwords for users...\n');
  
  const results = {
    success: [],
    failed: [],
    notFound: []
  };

  for (const email of targetUsers) {
    try {
      console.log(`\n📧 Processing: ${email}`);
      
      // Find user by email
      const usersRef = db.ref('users');
      const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
      
      if (!snapshot.exists()) {
        console.log(`  ❌ User not found in database`);
        results.notFound.push(email);
        continue;
      }

      // Get the user data
      let userId = null;
      let userData = null;
      snapshot.forEach((childSnapshot) => {
        userId = childSnapshot.key;
        userData = childSnapshot.val();
      });

      if (!userId) {
        console.log(`  ❌ Could not retrieve user ID`);
        results.notFound.push(email);
        continue;
      }

      console.log(`  ✅ Found user: ${userId}`);

      // Generate temporary password
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user record with temporary password
      const updateData = {
        password: hashedPassword,
        tempPasswordSet: new Date().toISOString(),
        needsPasswordReset: true
      };

      await db.ref(`users/${userId}`).update(updateData);

      console.log(`  ✅ Temporary password generated and set`);
      console.log(`  📝 Temp Password: ${tempPassword}`);
      console.log(`  🔒 Password hashed and stored in database`);

      results.success.push({
        email: email,
        userId: userId,
        tempPassword: tempPassword
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.failed.push({
        email: email,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEMPORARY PASSWORD GENERATION SUMMARY');
  console.log('='.repeat(60));

  if (results.success.length > 0) {
    console.log('\n✅ Successfully generated passwords:');
    results.success.forEach(user => {
      console.log(`\n  Email: ${user.email}`);
      console.log(`  User ID: ${user.userId}`);
      console.log(`  Temporary Password: ${user.tempPassword}`);
      console.log(`  Action: User can now login with this password`);
    });
  }

  if (results.notFound.length > 0) {
    console.log('\n⚠️  Users not found:');
    results.notFound.forEach(email => {
      console.log(`  - ${email}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed to process:');
    results.failed.forEach(item => {
      console.log(`  - ${item.email}: ${item.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.success.length} successful, ${results.notFound.length} not found, ${results.failed.length} failed`);
  console.log('='.repeat(60) + '\n');

  // Return for reference
  return results;
}

// Run the script
generatePasswordsForUsers()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
