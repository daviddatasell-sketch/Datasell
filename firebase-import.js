const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Initialize Firebase Admin SDK with NEW credentials
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
  console.log('✅ Firebase Admin initialized successfully with NEW credentials');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.database();

// Find the backup file
function findBackupFile() {
  const currentDir = __dirname;
  const files = fs.readdirSync(currentDir);
  
  for (const file of files) {
    if (file.startsWith('firebase-backup-') && fs.statSync(path.join(currentDir, file)).isDirectory()) {
      const backupPath = path.join(currentDir, file, 'complete-backup.json');
      if (fs.existsSync(backupPath)) {
        return backupPath;
      }
    }
  }
  
  return null;
}

async function importDatabase() {
  console.log('\n🔄 Starting Firebase database import...\n');

  const backupFile = findBackupFile();
  
  if (!backupFile) {
    console.error('❌ No backup file found. Run firebase-export.js first.');
    return false;
  }

  console.log(`📂 Using backup file: ${backupFile}\n`);

  try {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const collections = backupData.exportedCollections;

    // List of collections to import
    const collectionsToImport = [
      'users',
      'orders',
      'packages',
      'transactions',
      'wallets',
      'admin',
      'sessions',
      'supportTickets',
      'notifications',
      'stats'
    ];

    for (const collection of collectionsToImport) {
      if (collections[collection] && Object.keys(collections[collection]).length > 0) {
        console.log(`📤 Importing ${collection}...`);
        
        const data = collections[collection];
        const updates = {};
        updates[collection] = data;

        try {
          await db.ref().update(updates);
          console.log(`   ✅ Imported ${Object.keys(data).length} ${collection} records`);
        } catch (error) {
          console.error(`   ⚠️ Error importing ${collection}:`, error.message);
        }
      } else {
        console.log(`⏭️  Skipping ${collection} (no data)`);
      }
    }

    console.log('\n✅ All data imported successfully!');
    return true;

  } catch (error) {
    console.error('❌ Import failed:', error);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 DATASELL FIREBASE MIGRATION - DATA IMPORT');
  console.log('='.repeat(60));
  console.log(`Target Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Import Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Verify this is a new project
  console.log('\n⚠️  WARNING: Make sure you have updated .env with NEW Firebase credentials!');
  console.log('This will import ALL data into the NEW Firebase project.\n');

  const success = await importDatabase();

  if (success) {
    console.log('\n✅ Import completed successfully!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. ✅ Data has been migrated to your new Firebase project');
    console.log('2. 🧪 Run tests to verify everything works');
    console.log('3. 🚀 Deploy the updated application');
    console.log('\n' + '='.repeat(60));
  }

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
