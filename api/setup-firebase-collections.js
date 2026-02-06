#!/usr/bin/env node
/**
 * Firebase Collection Setup Script
 * Initialize API database collections
 * 
 * Usage: node api/setup-firebase-collections.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║       Firebase Collections Setup for API System           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Initialize Firebase
try {
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

  // Initialize if not already done
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }

  console.log('✓ Firebase initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.database();

/**
 * Create a collection with initial data
 */
async function createCollection(path, initialData = null) {
  try {
    console.log(`  Creating collection: ${path}...`);
    
    if (initialData && Object.keys(initialData).length > 0) {
      await db.ref(path).set(initialData);
      console.log(`    ✓ Collection created with data`);
    } else {
      // Create empty collection by checking if it exists
      const snapshot = await db.ref(path).once('value');
      if (!snapshot.exists()) {
        await db.ref(path).set({});
        console.log(`    ✓ Empty collection created`);
      } else {
        console.log(`    ℹ️  Collection already exists`);
      }
    }
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * Create database indexes
 */
async function createIndexes() {
  console.log('\n📊 Creating recommended database indexes...\n');
  console.log('  Note: Indexes must be created in Firebase Console for production performance');
  console.log('  Recommended indexes:');
  console.log('    1. api_keys:');
  console.log('       - userId (Ascending), .key (Ascending)');
  console.log('       - hash (Ascending), status (Ascending)');
  console.log('\n  Fire up Firebase Console and add these indexes for optimal performance.\n');
}

/**
 * Main setup function
 */
async function setupCollections() {
  try {
    console.log('\n🔧 Setting up database collections...\n');

    // Create api_keys collection
    await createCollection('api_keys', {
      _initialized: true
    });

    // Create api_usage collection
    await createCollection('api_usage', {
      _initialized: true
    });

    // Create integrations collection
    await createCollection('integrations', {
      _initialized: true
    });

    // Remove initialization markers
    console.log('\n  Cleaning up initialization markers...');
    await db.ref('api_keys/_initialized').remove();
    await db.ref('api_usage/_initialized').remove();
    await db.ref('integrations/_initialized').remove();
    console.log('    ✓ Cleaned up\n');

    // Suggest creating indexes
    await createIndexes();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║            ✅ Setup Complete - Collections Ready!          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('✓ Collections created:');
    console.log('  - api_keys       (stores hashed API keys)');
    console.log('  - api_usage      (logs API requests)');
    console.log('  - integrations   (stores integration metadata)\n');

    console.log('✓ Next steps:');
    console.log('  1. Create API key for testing:');
    console.log('     node -e "require(\'./api/manager\').createAPIKey(...)"');
    console.log('  2. Test endpoints with cURL/Postman');
    console.log('  3. Deploy dashboard UI');
    console.log('  4. Configure Firebase rules\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupCollections();
