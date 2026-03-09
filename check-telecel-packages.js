#!/usr/bin/env node

require('dotenv').config();

const admin = require('firebase-admin');

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

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.database();

async function checkAndCleanupTelecel() {
  try {
    console.log('📦 Checking Telecel packages in Firebase...\n');
    
    const snapshot = await db.ref('packages/tc').once('value');
    const packages = snapshot.val() || {};
    
    console.log('📊 All Telecel packages:');
    Object.entries(packages).forEach(([id, pkg]) => {
      console.log(`  - ${id}: ${pkg.name} (₵${pkg.price}, ${pkg.validity})`);
    });
    
    if (packages['tc-3gb']) {
      console.log('\n⚠️  Found tc-3gb - deleting it...');
      await db.ref('packages/tc/tc-3gb').remove();
      console.log('✅ tc-3gb deleted successfully');
    } else {
      console.log('\n✅ tc-3gb not found - no cleanup needed');
    }
    
    const finalSnapshot = await db.ref('packages/tc').once('value');
    const finalPackages = finalSnapshot.val() || {};
    console.log(`\n📊 Final Telecel packages count: ${Object.keys(finalPackages).length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAndCleanupTelecel();
