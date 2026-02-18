require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

async function migrateOrderIds() {
  try {
    console.log('🔄 Starting Order ID migration...\n');

    // Get all transactions
    const transactionsRef = admin.database().ref('transactions');
    const snapshot = await transactionsRef.once('value');
    const transactions = snapshot.val() || {};

    const transactionKeys = Object.keys(transactions);
    const totalOrders = transactionKeys.length;

    console.log(`📊 Found ${totalOrders} existing orders\n`);

    if (totalOrders === 0) {
      console.log('✅ No existing orders to migrate. Setting counter to 110000 for new orders.');
      await admin.database().ref('system/orderIdCounter').set(110000);
      console.log('✅ Migration complete - Counter set to 110000');
      process.exit(0);
    }

    // Sort by timestamp (newest first) so most recent gets highest ID (109,999)
    const sortedTransactions = transactionKeys
      .map(key => ({
        id: key,
        timestamp: transactions[key].timestamp || new Date(0).toISOString(),
        ...transactions[key]
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('📋 Processing transactions:');
    console.log(`   Newest order → Order ID: 109,999`);
    console.log(`   Oldest order → Order ID: ${109999 - (totalOrders - 1)}`);
    console.log(`   Next new order → Order ID: 110,000\n`);

    let startingOrderId = 109999;
    let migratedCount = 0;
    let updatedCount = 0;

    // Update each transaction with Order ID (going backwards from 109,999)
    for (let i = 0; i < sortedTransactions.length; i++) {
      const tx = sortedTransactions[i];
      const orderId = startingOrderId - i;

      try {
        // Update all transactions with correct orderId (force update to ensure consistency)
        await admin.database().ref(`transactions/${tx.id}`).update({ orderId });
        
        if (!tx.orderId) {
          migratedCount++;
        } else {
          updatedCount++;
        }

        if ((i + 1) % 100 === 0) {
          console.log(`   ✅ Processed ${i + 1}/${totalOrders} orders...`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating transaction ${tx.id}:`, error.message);
      }
    }

    // Set the counter to 110,000 so next order gets that ID
    await admin.database().ref('system/orderIdCounter').set(110000);

    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Newly migrated: ${migratedCount} orders`);
    console.log(`   🔄 Updated existing: ${updatedCount} orders`);
    console.log(`   📦 Total processed: ${totalOrders} orders`);
    console.log(`   🎯 Counter set to: 110,000`);
    console.log(`\n✅ Order ID migration complete!\n`);
    console.log(`📈 Order ID ranges:`);
    console.log(`   Existing orders: 109,999 → ${109999 - (migratedCount - 1)}`);
    console.log(`   New orders: 110,000 → 110,001 → 110,002 ...\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateOrderIds();
