const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

require('dotenv').config();

// Initialize Firebase
const serviceAccount = {
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

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('✅ Firebase connected');
} catch (error) {
  console.error('❌ Firebase init failed:', error.message);
  process.exit(1);
}

function generatePassword() {
  // SMS-friendly: Only alphanumeric (no special chars, no emojis)
  // Format: 3 uppercase + 3 numbers + 6 lowercase = 12 chars total
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  
  let password = '';
  // Add 3 uppercase
  for (let i = 0; i < 3; i++) {
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  }
  // Add 3 numbers
  for (let i = 0; i < 3; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  // Add 6 lowercase
  for (let i = 0; i < 6; i++) {
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  }
  return password;
}

async function generatePasswordForUser() {
  const emailToUpdate = process.argv[2];

  if (!emailToUpdate) {
    console.error('❌ Please provide email as argument: node generate-single-user-password.js email@example.com');
    process.exit(1);
  }

  const db = admin.database();

  console.log('\n' + '='.repeat(60));
  console.log('🔑 GENERATING TEMPORARY PASSWORD');
  console.log('='.repeat(60) + '\n');

  try {
    // Get all users
    const snap = await db.ref('users').once('value');
    const users = snap.val() || {};

    // Find user by email
    let targetUid = null;
    let targetUser = null;

    for (const [uid, user] of Object.entries(users)) {
      if (user.email && user.email.toLowerCase() === emailToUpdate.toLowerCase()) {
        targetUid = uid;
        targetUser = user;
        break;
      }
    }

    if (!targetUid) {
      console.error(`❌ User with email "${emailToUpdate}" not found`);
      process.exit(1);
    }

    // Generate temporary password
    const tempPassword = generatePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Update user in database
    await db.ref(`users/${targetUid}`).update({
      passwordHash: passwordHash,
      tempPasswordCreatedAt: new Date().toISOString(),
      requiresPasswordChange: true
    });

    console.log('✅ Password generated and set successfully!\n');
    console.log('='.repeat(60));
    console.log('📝 USER LOGIN DETAILS');
    console.log('='.repeat(60));
    console.log(`Email:                ${targetUser.email}`);
    console.log(`Name:                 ${(targetUser.firstName || '') + ' ' + (targetUser.lastName || '')}`.trim());
    console.log(`Wallet Balance:       $${targetUser.walletBalance || 0}`);
    console.log(`\nTemporary Password:   ${tempPassword}`);
    console.log('='.repeat(60));
    console.log('\n📋 INSTRUCTIONS FOR USER:');
    console.log('1. Go to login page');
    console.log('2. Enter email and temporary password');
    console.log('3. After login, you\'ll be prompted to change password');
    console.log('4. Set a strong password to remember');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generatePasswordForUser();
