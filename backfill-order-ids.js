#!/usr/bin/env node
/**
 * Backfill Order IDs for existing orders that don't have them
 * Allocates sequential Order IDs based on transaction timestamp
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK with environment variables
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

  if (!serviceAccount.private_key || !serviceAccount.project_id) {
    throw new Error('Firebase credentials not found in environment variables');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('✅ Firebase initialized from environment variables');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  process.exit(1);
}

async function backfillOrderIds() {
  try {
    console.log('🚀 Starting aggressive Order ID backfill...');
    console.log('📌 This will allocate Order IDs to ALL transactions without one');
    
    // Get current Order ID counter
    const counterRef = admin.database().ref('system/orderIdCounter');
    const counterSnapshot = await counterRef.once('value');
    let currentCounter = counterSnapshot.val() || 110000;
    console.log('📊 Current Order ID counter:', currentCounter);
    
    // Get all transactions
    const transactionsSnapshot = await admin.database().ref('transactions').once('value');
    const transactions = transactionsSnapshot.val() || {};
    
    console.log(`📦 Total transactions in database: ${Object.keys(transactions).length}`);
    
    // Find ALL transactions without Order IDs (skip AT network ONLY)
    const transactionsToUpdate = Object.entries(transactions)
      .filter(([id, transaction]) => {
        // Skip AT network orders completely
        if (transaction.network?.toLowerCase() === 'at') {
          return false;
        }
        
        // Include if NO orderId exists
        const hasOrderId = transaction.orderId !== null && transaction.orderId !== undefined && transaction.orderId !== '';
        return !hasOrderId;
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
      const pkg = transaction.packageName || 'Unknown';
      const net = transaction.network || 'Unknown';
      console.log(`  ✓ #${currentCounter} → ${transaction.id.substring(0, 12)}... (${pkg} - ${net})`);
      updates[`transactions/${transaction.id}/orderId`] = currentCounter;
    }
    
    // Update counter
    updates['system/orderIdCounter'] = currentCounter;
    
    // Perform bulk update
    console.log(`\n💾 Updating ${allocatedCount} transactions with Order IDs...`);
    await admin.database().ref().update(updates);
    
    console.log(`\n✅ Successfully backfilled ${allocatedCount} Order IDs!`);
    console.log(`📊 New Order ID counter: ${currentCounter}`);
    console.log('\n📝 Restart server and hard refresh to see updated Order IDs');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill error:', error);
    process.exit(1);
  }
}

backfillOrderIds();
