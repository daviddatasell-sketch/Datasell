const admin = require('firebase-admin');
const fs = require('fs');
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

// Generate SMS-friendly password (alphanumeric only)
function generateSMSFriendlyPassword() {
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

async function generateAndSavePasswords() {
  try {
    console.log('\n📥 Fetching all users from Firebase...\n');
    
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.once('value');
    const allUsers = snapshot.val() || {};
    
    const userList = [];
    let count = 0;
    let updated = 0;
    
    console.log('🔄 Generating new SMS-friendly passwords and updating database...\n');
    
    for (const [uid, userData] of Object.entries(allUsers)) {
      const email = userData.email || 'N/A';
      const name = userData.name || 'N/A';
      const phone = userData.phone || userData.phoneNumber || 'N/A';
      
      // Skip if no email
      if (email === 'N/A' || !email) {
        count++;
        continue;
      }
      
      // Generate new SMS-friendly password
      const newPassword = generateSMSFriendlyPassword();
      
      // Update in database
      await admin.database().ref(`users/${uid}`).update({
        tempPassword: newPassword,
        tempPasswordCreatedAt: new Date().toISOString()
      });
      
      userList.push({
        email,
        name,
        phone,
        tempPassword: newPassword
      });
      
      count++;
      updated++;
      console.log(`✅ Updated: ${email}`);
    }
    
    if (count === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
    // Create formatted text file
    const timestamp = new Date().toISOString();
    let textContent = `DATASELL - NEW SMS-FRIENDLY TEMPORARY PASSWORDS
Generated: ${timestamp}
Total Users Updated: ${updated}
Format: Alphanumeric only (A-Z, a-z, 0-9) - SMS Provider Compatible

================================================================================\n\n`;
    
    userList.forEach(u => {
      textContent += `Email: ${u.email}\n`;
      if (u.name !== 'N/A') {
        textContent += `Name: ${u.name}\n`;
      }
      if (u.phone !== 'N/A') {
        textContent += `Phone: ${u.phone}\n`;
      }
      textContent += `Temporary Password: ${u.tempPassword}\n`;
      textContent += `\n`;
    });
    
    textContent += `================================================================================\n\n`;
    textContent += `Instructions for users:\n`;
    textContent += `1. Go to www.datasell.store\n`;
    textContent += `2. Login with your email and temporary password\n`;
    textContent += `3. Change your password in Settings\n\n`;
    
    const textFile = 'NEW-SMS-FRIENDLY-TEMPORARY-PASSWORDS.txt';
    fs.writeFileSync(textFile, textContent);
    console.log(`\n✅ Password file created: ${textFile}`);
    
    // Create CSV for SMS bulk import
    const csvHeader = 'Email,Phone,Temporary Password\n';
    const csvContent = userList
      .filter(u => u.phone !== 'N/A')
      .map(u => `"${u.email}","${u.phone}","${u.tempPassword}"`)
      .join('\n');
    
    const csvFile = 'sms-password-bulk-import.csv';
    fs.writeFileSync(csvFile, csvHeader + csvContent);
    console.log(`✅ SMS bulk import file created: ${csvFile}`);
    
    // Create JSON backup
    const jsonFile = 'new-temp-passwords-backup.json';
    fs.writeFileSync(jsonFile, JSON.stringify(userList, null, 2));
    console.log(`✅ JSON backup created: ${jsonFile}`);
    
    // Display summary
    console.log(`\n📋 SUMMARY OF NEW PASSWORDS:`);
    console.log('═'.repeat(90));
    userList.slice(0, 10).forEach(u => {
      console.log(`📧 ${u.email.padEnd(35)} | 📱 ${(u.phone || 'N/A').padEnd(15)} | 🔐 ${u.tempPassword}`);
    });
    if (userList.length > 10) {
      console.log(`... and ${userList.length - 10} more users`);
    }
    console.log('═'.repeat(90));
    
    console.log(`\n✅ Successfully updated ${updated} users in Firebase`);
    console.log(`\nFiles created for you:`);
    console.log(`  1. ${textFile} - User-friendly format with instructions`);
    console.log(`  2. ${csvFile} - For bulk SMS import`);
    console.log(`  3. ${jsonFile} - Technical backup\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating passwords:', error);
    process.exit(1);
  }
}

generateAndSavePasswords();
