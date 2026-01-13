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

async function exportUserPasswords() {
  try {
    console.log('\n📥 Fetching all users and their temporary passwords...\n');
    
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.once('value');
    const allUsers = snapshot.val() || {};
    
    const userList = [];
    let count = 0;
    
    for (const [uid, userData] of Object.entries(allUsers)) {
      const email = userData.email || 'N/A';
      const name = userData.name || 'N/A';
      const phone = userData.phone || userData.phoneNumber || 'N/A';
      const tempPassword = userData.tempPassword || 'N/A';
      
      userList.push({
        uid,
        email,
        name,
        phone,
        tempPassword
      });
      count++;
    }
    
    if (count === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
    // Export as CSV
    const csvHeader = 'Email,Name,Phone,Temporary Password\n';
    const csvContent = userList
      .map(u => `"${u.email}","${u.name}","${u.phone}","${u.tempPassword}"`)
      .join('\n');
    
    const csvFile = 'user-passwords-export.csv';
    fs.writeFileSync(csvFile, csvHeader + csvContent);
    console.log(`✅ Exported ${count} users to ${csvFile}`);
    
    // Export as JSON for reference
    const jsonFile = 'user-passwords-export.json';
    fs.writeFileSync(jsonFile, JSON.stringify(userList, null, 2));
    console.log(`✅ Also exported to ${jsonFile}`);
    
    // Display summary
    console.log('\n📋 USER PASSWORD SUMMARY:');
    console.log('═'.repeat(80));
    userList.forEach(u => {
      console.log(`📧 ${u.email.padEnd(30)} | 📱 ${(u.phone || 'N/A').padEnd(15)} | 🔐 ${u.tempPassword}`);
    });
    console.log('═'.repeat(80));
    console.log(`\nTotal Users: ${count}`);
    console.log(`\nFiles created:`);
    console.log(`  1. ${csvFile} - for easy import to SMS service`);
    console.log(`  2. ${jsonFile} - for reference\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error exporting passwords:', error);
    process.exit(1);
  }
}

exportUserPasswords();
