#!/usr/bin/env node

const admin = require('firebase-admin');
require('dotenv').config();

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
    console.log(`❌ ${varName}: MISSING`);
    missingVars.push(varName);
    allVarsPresent = false;
  } else {
    const displayValue = varName.includes('KEY') || varName.includes('PASSWORD') 
      ? '[' + value.substring(0, 10) + '...]' 
      : value.substring(0, 30) + (value.length > 30 ? '...' : '');
    console.log(`✅ ${varName}: ${displayValue}`);
  }
}

if (!allVarsPresent) {
  console.log(`\n⚠️  Missing ${missingVars.length} required variable(s):`);
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\nUpdate your .env file with all required values.\n');
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

  console.log('✅ Firebase Admin SDK initialized successfully');

} catch (error) {
  console.log(`❌ Firebase initialization failed: ${error.message}`);
  console.log('\nPossible issues:');
  console.log('  - Invalid FIREBASE_PRIVATE_KEY format (check escaping)');
  console.log('  - Incorrect service account email');
  console.log('  - Invalid project ID');
  process.exit(1);
}

// Test database connection
async function validateConnection() {
  console.log('\n🗄️  Testing Realtime Database connection...\n');

  const db = admin.database();

  try {
    // Try to read root level with timeout
    const rootRef = db.ref();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );

    const dataPromise = rootRef.once('value');

    const snapshot = await Promise.race([dataPromise, timeoutPromise]);
    
    console.log('✅ Successfully connected to Realtime Database');

    const data = snapshot.val();
    
    console.log('\n📊 Database structure:\n');
    if (data) {
      const keys = Object.keys(data);
      console.log(`   Database contains ${keys.length} top-level collections:`);
      for (const key of keys) {
        const count = Object.keys(data[key] || {}).length;
        console.log(`   - ${key}: ${count} records`);
      }
    } else {
      console.log('   (Empty database - ready for import)');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Validation Complete - Ready to Proceed');
    console.log('='.repeat(70));
    console.log('\nNext steps:');
    console.log('  1. Run: node firebase-export.js (to backup old data)');
    console.log('  2. Run: node firebase-import.js (to import data to new Firebase)');
    console.log('  3. Test server with: npm start\n');

    process.exit(0);
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    console.log('\nPossible issues:');
    console.log('  - Realtime Database not enabled in Firebase');
    console.log('  - Database URL is incorrect');
    console.log('  - Service account lacks permissions');
    process.exit(1);
  }
}

validateConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
