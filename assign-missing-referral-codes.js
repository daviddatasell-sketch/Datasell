const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  serviceAccountId: process.env.FIREBASE_CLIENT_EMAIL,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

const serviceAccount = {
  type: 'service_account',
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Generate a unique referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Main function
async function assignMissingCodes() {
  try {
    console.log('📋 Fetching all users...');
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val() || {};

    let updated = 0;
    let skipped = 0;
    const updates = {};

    // Check each user
    for (const [uid, userData] of Object.entries(users)) {
      if (!userData.referralCode || userData.referralCode === 'N/A') {
        // Generate new code
        let newCode = generateReferralCode();
        let attempts = 0;
        
        // Ensure unique code
        while (attempts < 10) {
          const existing = await admin
            .database()
            .ref('users')
            .orderByChild('referralCode')
            .equalTo(newCode)
            .once('value');
          
          if (!existing.val()) {
            break; // Code is unique
          }
          newCode = generateReferralCode();
          attempts++;
        }

        updates[`users/${uid}/referralCode`] = newCode;
        console.log(`✅ User ${uid} (${userData.email}) - NEW CODE: ${newCode}`);
        updated++;
      } else {
        console.log(`⏭️ User ${uid} (${userData.email}) - Already has code: ${userData.referralCode}`);
        skipped++;
      }
    }

    // Apply all updates at once
    if (Object.keys(updates).length > 0) {
      console.log(`\n💾 Writing ${updated} referral codes to database...`);
      await admin.database().ref().update(updates);
      console.log(`✅ Successfully updated ${updated} users with referral codes`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️ Already had codes: ${skipped}`);
    console.log(`  📈 Total users: ${updated + skipped}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignMissingCodes();
