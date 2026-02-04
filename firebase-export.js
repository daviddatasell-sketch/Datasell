const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Initialize Firebase Admin SDK with current credentials
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
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.database();
const exportDir = path.join(__dirname, 'firebase-backup-' + new Date().toISOString().split('T')[0]);

// Create backup directory
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

async function exportDatabase() {
  console.log('\n🔄 Starting Firebase database export...\n');
  
  const dataToExport = {
    timestamp: new Date().toISOString(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    exportedCollections: {}
  };

  try {
    // 1. Export Users
    console.log('📥 Exporting users...');
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val() || {};
    dataToExport.exportedCollections.users = users;
    console.log(`   ✅ Exported ${Object.keys(users).length} users`);

    // 2. Export Orders
    console.log('📥 Exporting orders...');
    const ordersSnap = await db.ref('orders').once('value');
    const orders = ordersSnap.val() || {};
    dataToExport.exportedCollections.orders = orders;
    console.log(`   ✅ Exported ${Object.keys(orders).length} orders`);

    // 3. Export Packages
    console.log('📥 Exporting packages...');
    const packagesSnap = await db.ref('packages').once('value');
    const packages = packagesSnap.val() || {};
    dataToExport.exportedCollections.packages = packages;
    console.log(`   ✅ Exported packages data`);

    // 4. Export Transactions
    console.log('📥 Exporting transactions...');
    const transactionsSnap = await db.ref('transactions').once('value');
    const transactions = transactionsSnap.val() || {};
    dataToExport.exportedCollections.transactions = transactions;
    console.log(`   ✅ Exported ${Object.keys(transactions).length} transactions`);

    // 5. Export Wallets
    console.log('📥 Exporting wallets...');
    const walletsSnap = await db.ref('wallets').once('value');
    const wallets = walletsSnap.val() || {};
    dataToExport.exportedCollections.wallets = wallets;
    console.log(`   ✅ Exported ${Object.keys(wallets).length} wallets`);

    // 6. Export Admin Data
    console.log('📥 Exporting admin data...');
    const adminSnap = await db.ref('admin').once('value');
    const adminData = adminSnap.val() || {};
    dataToExport.exportedCollections.admin = adminData;
    console.log(`   ✅ Exported admin data`);

    // 7. Export Sessions
    console.log('📥 Exporting sessions...');
    const sessionsSnap = await db.ref('sessions').once('value');
    const sessions = sessionsSnap.val() || {};
    dataToExport.exportedCollections.sessions = sessions;
    console.log(`   ✅ Exported ${Object.keys(sessions).length} sessions`);

    // 8. Export Support Tickets
    console.log('📥 Exporting support tickets...');
    const ticketsSnap = await db.ref('supportTickets').once('value');
    const tickets = ticketsSnap.val() || {};
    dataToExport.exportedCollections.supportTickets = tickets;
    console.log(`   ✅ Exported ${Object.keys(tickets).length} support tickets`);

    // 9. Export Notifications
    console.log('📥 Exporting notifications...');
    const notificationsSnap = await db.ref('notifications').once('value');
    const notifications = notificationsSnap.val() || {};
    dataToExport.exportedCollections.notifications = notifications;
    console.log(`   ✅ Exported notifications`);

    // 10. Export Stats
    console.log('📥 Exporting stats...');
    const statsSnap = await db.ref('stats').once('value');
    const stats = statsSnap.val() || {};
    dataToExport.exportedCollections.stats = stats;
    console.log(`   ✅ Exported stats`);

    // Save complete backup
    const backupFile = path.join(exportDir, 'complete-backup.json');
    fs.writeFileSync(backupFile, JSON.stringify(dataToExport, null, 2));
    console.log(`\n✅ Complete backup saved to: ${backupFile}`);

    // Save individual exports for easier review
    const collectionsDir = path.join(exportDir, 'collections');
    if (!fs.existsSync(collectionsDir)) {
      fs.mkdirSync(collectionsDir, { recursive: true });
    }

    for (const [collection, data] of Object.entries(dataToExport.exportedCollections)) {
      const collectionFile = path.join(collectionsDir, `${collection}.json`);
      fs.writeFileSync(collectionFile, JSON.stringify(data, null, 2));
      console.log(`   💾 Saved ${collection}.json`);
    }

    // Create summary
    const summary = {
      exportDate: new Date().toISOString(),
      projectId: process.env.FIREBASE_PROJECT_ID,
      collections: {
        users: Object.keys(users).length,
        orders: Object.keys(orders).length,
        transactions: Object.keys(transactions).length,
        wallets: Object.keys(wallets).length,
        sessions: Object.keys(sessions).length,
        supportTickets: Object.keys(tickets).length
      }
    };

    const summaryFile = path.join(exportDir, 'EXPORT_SUMMARY.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(JSON.stringify(summary, null, 2));
    console.log('='.repeat(60));
    console.log(`\n✅ All data exported successfully to: ${exportDir}`);

    return true;

  } catch (error) {
    console.error('❌ Export failed:', error);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 DATASELL FIREBASE MIGRATION - DATA EXPORT');
  console.log('='.repeat(60));
  console.log(`Current Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Export Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const success = await exportDatabase();

  if (success) {
    console.log('\n✅ Export completed successfully!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Create a NEW Firebase project in Firebase Console');
    console.log('2. Get the new Firebase credentials (service account key)');
    console.log('3. Update the .env file with the new credentials');
    console.log('4. Run: node firebase-import.js');
    console.log('\n' + '='.repeat(60));
  }

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
