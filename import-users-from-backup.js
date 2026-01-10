#!/usr/bin/env node

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Initialize Firebase with service account
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

// Load backup data
const backupPath = path.join(__dirname, 'firebase-backup-2026-01-06', 'complete-backup.json');
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const usersFromBackup = backupData.exportedCollections.users || {};

async function generateTemporaryPassword() {
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

async function importUsers() {
  console.log('\n📥 Starting user import from backup...\n');
  
  const userEmails = Object.keys(usersFromBackup);
  console.log(`Found ${userEmails.length} users in backup\n`);
  
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const importedUsers = [];
  
  for (const uid of userEmails) {
    const userData = usersFromBackup[uid];
    const email = userData.email;
    
    try {
      console.log(`⏳ Processing: ${email}`);
      
      // Check if user already exists in new Firebase
      let existingUser = null;
      try {
        existingUser = await auth.getUserByEmail(email);
        console.log(`   ⏭️  Skipped: User already exists (UID: ${existingUser.uid})`);
        skipped++;
        continue;
      } catch (err) {
        // User doesn't exist, proceed with creation
        if (err.code !== 'auth/user-not-found') {
          throw err;
        }
      }
      
      // Generate temporary password
      const tempPassword = await generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Create user in Firebase Auth
      const createdUser = await auth.createUser({
        email: email,
        password: tempPassword,
        displayName: `${userData.firstName} ${userData.lastName}`
      });
      
      // Store user data in Realtime Database with password hash
      await db.ref(`users/${createdUser.uid}`).set({
        ...userData,
        uid: createdUser.uid,
        passwordHash: hashedPassword,
        importedAt: new Date().toISOString(),
        requiresPasswordReset: true
      });
      
      importedUsers.push({
        email: email,
        tempPassword: tempPassword,
        name: `${userData.firstName} ${userData.lastName}`,
        uid: createdUser.uid
      });
      
      console.log(`   ✅ Imported successfully`);
      imported++;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Import Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${imported + skipped + failed}/${userEmails.length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (importedUsers.length > 0) {
    // Save temporary passwords to file for admin notification
    const csvContent = [
      'Email,Name,Temporary Password,User ID',
      ...importedUsers.map(u => `${u.email},"${u.name}",${u.tempPassword},${u.uid}`)
    ].join('\n');
    
    const outputPath = path.join(__dirname, `imported-users-${new Date().toISOString().split('T')[0]}.csv`);
    fs.writeFileSync(outputPath, csvContent);
    console.log(`📄 Temporary passwords saved to: ${outputPath}`);
    console.log(`⚠️  Share these with users so they can reset their passwords on first login\n`);
  }
  
  process.exit(imported === userEmails.length ? 0 : 1);
}

importUsers().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
