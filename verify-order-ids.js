#!/usr/bin/env node
/**
 * Verify Order IDs were properly backfilled
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
try {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  process.exit(1);
}

async function verifyOrderIds() {
  try {
    console.log('🔍 Verifying Order ID backfill...\n');
    
    // Get all transactions
    const transactionsSnapshot = await admin.database().ref('transactions').once('value');
    const transactions = transactionsSnapshot.val() || {};
    
    const allOrderIds = Object.entries(transactions);
    console.log(`📊 Total transactions: ${allOrderIds.length}`);
    
    // Check samples across the range
    const samples = allOrderIds.slice(0, 10);
    
    console.log('\n📌 Sample of first 10 transactions:');
    let withOrderId = 0;
    let withoutOrderId = 0;
    let nullOrderId = 0;
    
    for (const [id, transaction] of samples) {
      const orderId = transaction.orderId;
      const hasOrderId = orderId !== null && orderId !== undefined && orderId !== '';
      
      if (hasOrderId) {
        withOrderId++;
        console.log(`  ✓ ${id.substring(0, 12)}... → Order ID: ${orderId} | ${transaction.packageName} | ${transaction.network}`);
      } else {
        withoutOrderId++;
        console.log(`  ✗ ${id.substring(0, 12)}... → Order ID: ${orderId} (NULL) | ${transaction.packageName} | ${transaction.network}`);
      }
      
      if (orderId === null || orderId === undefined) {
        nullOrderId++;
      }
    }
    
    // Count all
    let totalWithOrderId = 0;
    let totalWithoutOrderId = 0;
    
    for (const [id, transaction] of Object.entries(transactions)) {
      const hasOrderId = transaction.orderId !== null && transaction.orderId !== undefined && transaction.orderId !== '';
      if (hasOrderId) {
        totalWithOrderId++;
      } else {
        totalWithoutOrderId++;
      }
    }
    
    console.log(`\n📊 Total Summary:`);
    console.log(`  ✓ With Order ID: ${totalWithOrderId}`);
    console.log(`  ✗ Without Order ID: ${totalWithoutOrderId}`);
    console.log(`  ⚠️  Null/Undefined: ${nullOrderId}`);
    
    if (totalWithoutOrderId > 0) {
      console.log(`\n⚠️  WARNING: ${totalWithoutOrderId} transactions still missing Order IDs!`);
      console.log('Running another backfill cycle...\n');
      
      // Run backfill again
      const counterRef = admin.database().ref('system/orderIdCounter');
      const counterSnapshot = await counterRef.once('value');
      let currentCounter = counterSnapshot.val() || 110000;
      
      const updates = {};
      let allocated = 0;
      
      for (const [id, transaction] of Object.entries(transactions)) {
        const hasOrderId = transaction.orderId !== null && transaction.orderId !== undefined && transaction.orderId !== '';
        const isAT = transaction.network?.toLowerCase() === 'at';
        
        if (!hasOrderId && !isAT) {
          currentCounter++;
          allocated++;
          updates[`transactions/${id}/orderId`] = currentCounter;
          
          if (allocated <= 10) {
            console.log(`  Allocating #${currentCounter} → ${id.substring(0, 12)}...`);
          }
        }
      }
      
      if (allocated > 10) {
        console.log(`  ... and ${allocated - 10} more`);
      }
      
      updates['system/orderIdCounter'] = currentCounter;
      
      console.log(`\n💾 Allocating ${allocated} more Order IDs...`);
      await admin.database().ref().update(updates);
      console.log('✅ Done!');
    } else {
      console.log(`\n✅ All transactions have Order IDs!`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  }
}

verifyOrderIds();
