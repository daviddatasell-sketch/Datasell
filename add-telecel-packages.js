#!/usr/bin/env node

require('dotenv').config();

const admin = require('firebase-admin');

// Build serviceAccount from environment variables (same as server.js)
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

const telecelPackages = [
  { id: 'tc-1gb', name: '1 GB', price: 5.00, validity: '7 days' },
  { id: 'tc-2gb', name: '2 GB', price: 9.00, validity: '14 days' },
  { id: 'tc-5gb', name: '5 GB', price: 20.00, validity: '30 days' },
  { id: 'tc-10gb', name: '10 GB', price: 40.00, validity: '30 days' },
  { id: 'tc-unlim', name: 'Unlimited', price: 99.00, validity: '30 days' }
];

async function addTelecelPackages() {
  try {
    console.log('📦 Adding Telecel test packages...');
    
    for (const pkg of telecelPackages) {
      const packageData = {
        name: pkg.name,
        price: pkg.price,
        validity: pkg.validity,
        active: true,
        createdAt: new Date().toISOString()
      };
      
      await db.ref(`packages/tc/${pkg.id}`).set(packageData);
      console.log(`✅ Added Telecel package: ${pkg.id} (${pkg.name}) - ₵${pkg.price}`);
    }
    
    console.log('\n✅ All Telecel packages added successfully!');
    
    // Verify the packages were added
    const snapshot = await db.ref('packages/tc').once('value');
    const data = snapshot.val();
    console.log(`📊 Total Telecel packages in Firebase: ${Object.keys(data || {}).length}`);
    
  } catch (error) {
    console.error('❌ Error adding packages:', error);
  } finally {
    process.exit(0);
  }
}

addTelecelPackages();
