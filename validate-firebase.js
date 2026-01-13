#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const colors = require('colors');

require('dotenv').config();

// Color setup
colors.setTheme({
  success: 'green',
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  data: 'grey'
});

console.log('\n' + '='.repeat(70));
console.log('🔐 Firebase Credentials Validator');
console.log('='.repeat(70));

// Check required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

console.log('\n📋 Checking environment variables...\n');

let allVarsPresent = true;
const missingVars = [];

for (const varName of requiredEnvVars) {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`.error);
    missingVars.push(varName);
    allVarsPresent = false;
  } else {
    const displayValue = varName.includes('KEY') || varName.includes('PASSWORD') 
      ? '[' + value.substring(0, 10) + '...]' 
      : value.substring(0, 30) + (value.length > 30 ? '...' : '');
    console.log(`✅ ${varName}: ${displayValue}`.success);
  }
}

if (!allVarsPresent) {
  console.log(`\n⚠️  Missing ${missingVars.length} required variable(s):`.warn);
  missingVars.forEach(v => console.log(`   - ${v}`.error));
  console.log('\nUpdate your .env file with all required values.\n'.warn);
  process.exit(1);
}

console.log('\n✅ All environment variables present\n');

// Try to initialize Firebase
console.log('🔗 Attempting to connect to Firebase...\n');

try {
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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  console.log('✅ Firebase Admin SDK initialized successfully'.success);

} catch (error) {
  console.log(`❌ Firebase initialization failed: ${error.message}`.error);
  console.log('\nPossible issues:'.warn);
  console.log('  - Invalid FIREBASE_PRIVATE_KEY format (check escaping)'.warn);
  console.log('  - Incorrect service account email'.warn);
  console.log('  - Invalid project ID'.warn);
  process.exit(1);
}

// Test database connection
async function validateConnection() {
  console.log('\n🗄️  Testing Realtime Database connection...\n');

  const db = admin.database();

  try {
    // Try to read a test path
    const testRef = db.ref('.info/connected');
    
    testRef.on('value', async (snapshot) => {
      if (snapshot.val() === true) {
        console.log('✅ Successfully connected to Realtime Database'.success);

        // Try to read root level
        try {
          const rootRef = db.ref();
          const snapshot = await rootRef.once('value');
          const data = snapshot.val();
          
          console.log('\n📊 Database structure:\n');
          if (data) {
            const keys = Object.keys(data);
            for (const key of keys) {
              const count = Object.keys(data[key] || {}).length;
              console.log(`   ${key}: ${count} records`.data);
            }
          } else {
            console.log('   (Empty database - ready for import)'.warn);
          }

          console.log('\n' + '='.repeat(70));
          console.log('✅ Validation Complete - Ready to Proceed'.success);
          console.log('='.repeat(70));
          console.log('\nNext steps:'.info);
          console.log('  1. Verify the database structure matches your expectations');
          console.log('  2. If empty, run: node firebase-import.js');
          console.log('  3. Test server with: npm start');
          console.log('\n');

          process.exit(0);
        } catch (error) {
          console.log(`⚠️  Could not read database: ${error.message}`.warn);
          console.log('This might mean:'.warn);
          console.log('  - Realtime Database is not enabled in Firebase');
          console.log('  - Database rules deny read access'.warn);
          
          console.log('\n' + '='.repeat(70));
          console.log('⚠️  Partial Validation - Check Firebase Console'.warn);
          console.log('='.repeat(70) + '\n');
          
          process.exit(1);
        }
      } else {
        console.log('❌ Not connected to Realtime Database'.error);
        process.exit(1);
      }
    });

    // Timeout if no response
    setTimeout(() => {
      console.log('❌ Database connection timeout'.error);
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.log(`❌ Connection test failed: ${error.message}`.error);
    process.exit(1);
  }
}

validateConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
