const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// OLD Firebase credentials (from original setup)
const serviceAccount = {
  project_id: 'datasell-a3f57',
  private_key_id: '36b715af87752bb0364d44dfd059767d22a7e7c6',
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCqaNczE3vPbnxc\nEQSgK9/6Ql0he317WWIvcAwyPZQ13rMhiufFsO8khjv6MoKVwiuRGnFJF9kB2g4e\nFLgbuHPCLOgKgqiQUTc20Xudbf1D2Y92dty35LtbHhUx3SL8o7jo3pd0ZoyDRKY4\nOJTroa7hIZZSRnfpe1aJdXhlaNJlkdgcjZlGcS6XuNOIkqaZYGbgcVCzECLjoBkG\npAV2dTTKPy2Ppy6vRsQpqOjWA6aXz8QjCZcWP+eMs3PKO2cWXG6GnAPnrWr8bAKR\nFDrb+3HHvnSoiAmEkrXquZE5437FGM4iL03rbq/+XcY/WTZELb9bZ25Zg7hXEu7j\n6RxPUR/dAgMBAAECggEAFBuewWrX4ct+l4dWunZ/3FsMc1EyxAaODwm83XjWSxX1\nA50TUggMzOBX0dZUK00C214Zkby5VCbmtmigpEUYdFB+Cdcnhn5ChD3hh2WrI9ft\nlqH5gaxPDXNkx6tnY0a30wm1fkY7YS/Gm7WITsgBoA1gmATWbjLtEQnAmosVWOwL\nI6VpiPh2aRbm7Uhh08DmtKddOO1MiDXsn9XLl2iDPGBMUcWb9bWEvikMz3RIcn4V\nOJErzQyRaG83pG37zZUSb9p62DO/+D9Xc2QugG+wZJXrXARwmUjaiay699QXa5oN\nk23tm2u9fjc7scNk9sv4LTuLSO5zMXMJj36rjphwAQKBgQDR+DQ/fR/OxNwZ5HjC\ntYJDB5YIFpog+SbRGHOxxm8aiLPZ2sSCW+LnLiDGU9QIjMVN4bbLFGZkzw4EUGb7\nEmMeglylmNNhCbgFLq2CFy+wV56pt8odCRJE36CcGJcGk2eKjELZVQhKYkEKTNnu\nO+6LjBqbrNuB2ioucMagFn1oWQKBgQC2zUv5DDsyJOwedLnLdmHBKJ5gvyoMYDVV\n6hhGV56fsAzs+Q2nv/LWgcwVVX9Pkijt+OKauIWec+lRk1EXie3ypThxEeP77Kie\nyjL1m937wFkFOYx4qNWWOr/BECGKlsk09C5PRhG6/lLoEBwwzMYNyLTZo3SzUzVp\n9CXgJVKHcwKBgE29sVKkeEdtWfT4Q8ILxEwfHeymubBlr3qRrBxxVSek37pUppeB\nf/SKfrYPyZzUyiS44p40UmkWxKDSSB7DwxFDwRvLBtCR8aFxk+prvUt0VZmPI/U2\nK552khfZful/YEHLBuFC+4vW7y/qHnJ3nC3s1Nk42hks9ps1REV3rj0ZAoGAKH1I\nep1O70hmVEieboaGGHaavesZsSwOJD15qvr1U4F3G3X+pE1LyF9viLorPMCu+CbM\namC8l+AsqbjrmT8fyUL3QXQo/z/oCWPX7bbccEqmbRXWG1OqG2Bf4K9l/oBviJ8d\nMsneW4DBdE09MUHqDFuMUzh1PNMNXa6KRR9/LCkCgYA5ma1wFcezlGNHYC2fHNoI\nVUumdEeStzr5fp2LN+1viFWRy4L1cTTJh70CVtbrtlfJYzZovsCRA7jr0E8vki4J\nFyqCq5d9FPbHQGhHZhbJ8M89VP47FxvOKql4rIwr+Bk/sLLvUtIOibiWPE4Wmvgd\nPdTMgy6n0g40TeKLFKFb4g==\n-----END PRIVATE KEY-----\n",
  client_email: 'firebase-adminsdk-fbsvc@datasell-a3f57.iam.gserviceaccount.com',
  client_id: '106957921867638366969',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40datasell-a3f57.iam.gserviceaccount.com'
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://datasell-a3f57-default-rtdb.europe-west1.firebasedatabase.app'
  });
  console.log('✅ Connected to OLD Firebase account (datasell-a3f57)');
} catch (error) {
  console.error('❌ Failed to initialize:', error.message);
  process.exit(1);
}

const db = admin.database();
const exportDir = path.join(__dirname, 'firebase-backup-' + new Date().toISOString().split('T')[0]);

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

async function exportDatabase() {
  console.log('\n🔄 Starting export from OLD Firebase account...\n');
  
  const dataToExport = {
    timestamp: new Date().toISOString(),
    projectId: 'datasell-a3f57',
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
    console.log(`   ✅ Exported packages`);

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
    console.log(`   ✅ Exported ${Object.keys(tickets).length} tickets`);

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

    // Save individual exports
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
      oldProjectId: 'datasell-a3f57',
      newProjectId: 'datasell-7b993',
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
    console.log(`\n✅ All data exported successfully from OLD Firebase!`);
    console.log(`📁 Backup saved to: ${exportDir}`);

    return true;

  } catch (error) {
    console.error('❌ Export failed:', error);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 FIREBASE MIGRATION - EXPORT FROM OLD ACCOUNT');
  console.log('='.repeat(60));
  console.log('Source Project: datasell-a3f57 (OLD)');
  console.log('Target Project: datasell-7b993 (NEW)');
  console.log(`Export Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const success = await exportDatabase();

  if (success) {
    console.log('\n✅ Export completed successfully!');
    console.log('\n📝 NEXT STEP:');
    console.log('Run: node firebase-import.js');
    console.log('(Make sure .env has NEW Firebase credentials)');
    console.log('\n' + '='.repeat(60));
  }

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
