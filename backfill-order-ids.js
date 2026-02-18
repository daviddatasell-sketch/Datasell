#!/usr/bin/env node
/**
 * Backfill Order IDs for existing orders that don't have them
 * Allocates sequential Order IDs based on transaction timestamp
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://datasell-e38a0.firebaseio.com'
  });
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  process.exit(1);
}

async function backfillOrderIds() {
  try {
    console.log('🚀 Starting Order ID backfill...');
    
    // Get current Order ID counter
    const counterRef = admin.database().ref('system/orderIdCounter');
    const counterSnapshot = await counterRef.once('value');
    let currentCounter = counterSnapshot.val() || 110000;
    console.log('📊 Current Order ID counter:', currentCounter);
    
    // Get all transactions
    const transactionsSnapshot = await admin.database().ref('transactions').once('value');
    const transactions = transactionsSnapshot.val() || {};
    
    console.log(`📦 Total transactions in database: ${Object.keys(transactions).length}`);
    
    // Find transactions without Order IDs (excluding AT network and failed purchases)
    const transactionsToUpdate = Object.entries(transactions)
      .filter(([id, transaction]) => {
        const network = transaction.network?.toLowerCase();
        const status = transaction.status?.toLowerCase();
        const hasOrderId = transaction.orderId !== null && transaction.orderId !== undefined;
        
        // Skip if: already has Order ID, AT network, failed status
        if (hasOrderId || network === 'at' || status === 'failed') {
          return false;
        }
        
        // Include if: MTN network and (processing or success status)
        return network === 'mtn' && (status === 'processing' || status === 'success');
      })
      .sort(([,a], [,b]) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(([id, transaction]) => ({ id, ...transaction }));
    
    console.log(`\n📌 Found ${transactionsToUpdate.length} transactions needing Order IDs`);
    
    if (transactionsToUpdate.length === 0) {
      console.log('✅ No transactions need Order IDs. All caught up!');
      process.exit(0);
    }
    
    // Allocate Order IDs
    let allocatedCount = 0;
    const updates = {};
    
    for (const transaction of transactionsToUpdate) {
      currentCounter++;
      allocatedCount++;
      console.log(`  ✓ Order #${currentCounter} → ${transaction.id.substring(0, 12)}... (${transaction.packageName} - ${transaction.network})`);
      updates[`transactions/${transaction.id}/orderId`] = currentCounter;
    }
    
    // Update counter
    updates['system/orderIdCounter'] = currentCounter;
    
    // Perform bulk update
    console.log(`\n💾 Updating ${allocatedCount} transactions with Order IDs...`);
    await admin.database().ref().update(updates);
    
    console.log(`✅ Successfully backfilled ${allocatedCount} Order IDs!`);
    console.log(`📊 New Order ID counter: ${currentCounter}`);
    console.log('\n📝 Note: Refresh your browser to see the updated Order IDs');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill error:', error);
    process.exit(1);
  }
}

backfillOrderIds();
