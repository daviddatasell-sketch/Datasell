#!/usr/bin/env node

/**
 * Safe Script to Assign Referral Codes to All Existing Users
 * This script:
 * 1. Loads all users from the database
 * 2. For users without a referral code, generates and assigns one
 * 3. Logs the operation for transparency
 * 4. Does NOT modify any other user data
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, 'config', 'serviceAccountKey.json');

const firebaseConfig = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// Generate a single referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique referral code with database check
async function generateUniqueReferralCode(existingCodes) {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 50;

  while (!isUnique && attempts < maxAttempts) {
    code = generateReferralCode();
    if (!existingCodes.has(code)) {
      isUnique = true;
      existingCodes.add(code);
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code after multiple attempts');
  }

  return code;
}

// Main function
async function assignReferralCodes() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 REFERRAL CODE ASSIGNMENT - STARTING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Step 1: Get all users
    console.log('📖 Fetching all users from database...');
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val();

    if (!users) {
      console.log('⚠️  No users found in database. Nothing to do.');
      process.exit(0);
    }

    const userIds = Object.keys(users);
    console.log(`✅ Found ${userIds.length} users`);
    console.log('');

    // Step 2: Collect all existing codes and users without codes
    console.log('🔍 Analyzing users for referral codes...');
    const existingCodes = new Set();
    const usersWithoutCodes = [];

    for (const [userId, userData] of Object.entries(users)) {
      if (userData.referralCode) {
        existingCodes.add(userData.referralCode);
      } else {
        usersWithoutCodes.push({
          userId,
          email: userData.email || 'N/A',
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'N/A',
        });
      }
    }

    console.log(`✅ Users with referral codes: ${existingCodes.size}`);
    console.log(`⚠️  Users WITHOUT referral codes: ${usersWithoutCodes.length}`);
    console.log('');

    if (usersWithoutCodes.length === 0) {
      console.log('✨ All users already have referral codes! Nothing to do.');
      process.exit(0);
    }

    // Step 3: Assign codes to users without them
    console.log(`🚀 Assigning referral codes to ${usersWithoutCodes.length} users...`);
    console.log('');

    const updates = {};
    const assignedCodes = [];

    for (const user of usersWithoutCodes) {
      try {
        const newCode = await generateUniqueReferralCode(existingCodes);
        updates[`users/${user.userId}/referralCode`] = newCode;
        assignedCodes.push({
          ...user,
          code: newCode,
        });
        console.log(`  ✅ ${user.name} (${user.email}): ${newCode}`);
      } catch (error) {
        console.error(`  ❌ Failed to generate code for ${user.email}: ${error.message}`);
      }
    }

    console.log('');

    // Step 4: Write all updates to database
    if (Object.keys(updates).length > 0) {
      console.log(`💾 Writing ${assignedCodes.length} referral code assignments to database...`);
      await db.ref('/').update(updates);
      console.log('✅ All referral codes assigned successfully!');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total users processed: ${userIds.length}`);
    console.log(`Already had codes: ${existingCodes.size}`);
    console.log(`Newly assigned: ${assignedCodes.length}`);
    console.log('');
    console.log('✨ Operation completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
assignReferralCodes();
