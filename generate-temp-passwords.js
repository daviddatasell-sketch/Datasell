const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

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

async function generateTempPasswords() {
  const db = admin.database();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔑 GENERATING TEMPORARY PASSWORDS FOR USERS');
  console.log('='.repeat(60) + '\n');

  // Get all users
  const snap = await db.ref('users').once('value');
  const users = snap.val() || {};

  const results = [];
  let updated = 0;

  for (const [uid, user] of Object.entries(users)) {
    if (!user.email) continue;

    // Skip if already has a password hash
    if (user.passwordHash && user.passwordHash.startsWith('$2')) {
      console.log(`✅ ${user.email} - Already has password hash`);
      continue;
    }

    // Generate temporary password
    const tempPassword = generatePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    try {
      // Store hashed password in database
      await db.ref(`users/${uid}`).update({
        passwordHash: passwordHash,
        tempPasswordCreatedAt: new Date().toISOString(),
        requiresPasswordChange: true
      });

      console.log(`✅ ${user.email} - Temp password set`);
      
      results.push({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        tempPassword: tempPassword,
        walletBalance: user.walletBalance || 0
      });

      updated++;
    } catch (error) {
      console.log(`❌ ${user.email} - Failed: ${error.message}`);
    }
  }

  // Save password list for admin
  const outputPath = path.join(__dirname, 'TEMPORARY_PASSWORDS_FOR_USERS.txt');
  let output = `DATASELL - TEMPORARY PASSWORDS FOR USERS\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Total Users: ${results.length}\n`;
  output += `\n${'='.repeat(80)}\n\n`;
  
  results.forEach(user => {
    output += `Email: ${user.email}\n`;
    output += `Name: ${user.name}\n`;
    output += `Wallet Balance: $${user.walletBalance}\n`;
    output += `Temporary Password: ${user.tempPassword}\n`;
    output += `\n`;
  });

  output += `\n${'='.repeat(80)}\n`;
  output += `INSTRUCTIONS FOR USERS:\n`;
  output += `1. Visit the login page\n`;
  output += `2. Enter your email\n`;
  output += `3. Enter your temporary password (shown above)\n`;
  output += `4. After login, you'll be prompted to change your password\n`;
  output += `5. Set a strong password you'll remember\n`;
  output += `=`.repeat(80) + `\n`;

  fs.writeFileSync(outputPath, output);

  // Also save as JSON for quick lookup
  const jsonPath = path.join(__dirname, 'user-temp-passwords.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passwords generated: ${updated}`);
  console.log(`📄 Saved to: ${outputPath}`);
  console.log(`📋 JSON saved to: ${jsonPath}`);
  console.log('='.repeat(60));
  console.log('\n🎉 ALL USERS NOW HAVE TEMPORARY PASSWORDS!\n');
  console.log('Users can login with:');
  console.log('- Email: their registered email');
  console.log('- Password: the temporary password from the file above\n');

  process.exit(0);
}

generateTempPasswords().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
