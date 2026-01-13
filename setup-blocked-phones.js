const admin = require('firebase-admin');
require('dotenv').config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ FIREBASE_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

async function addBlockedPhones() {
  try {
    console.log('\n============================================================');
    console.log('🚫 ADDING BLOCKED PHONE NUMBERS TO SYSTEM');
    console.log('============================================================\n');

    const phonesToBlock = [
      {
        phone: '0266676258',
        reason: 'Imposter account abuse - riosbaby123@gmail.com'
      },
      {
        phone: '0533742701',
        reason: 'Imposter account abuse - comfortisoutofthisworld@gmail.com'
      }
    ];

    const blockedRef = admin.database().ref('blockedPhones');
    const timestamp = new Date().toISOString();

    for (const phoneData of phonesToBlock) {
      const normalized = phoneData.phone.replace(/\D/g, '');
      
      await blockedRef.child(normalized).set({
        phone: phoneData.phone,
        normalizedPhone: normalized,
        blockedAt: timestamp,
        reason: phoneData.reason,
        blockedBy: 'admin-system',
        blockType: 'permanent',
        description: 'This number is permanently blocked from account creation and data bundle orders'
      });

      console.log(`✅ Blocked: ${phoneData.phone}`);
      console.log(`   Reason: ${phoneData.reason}`);
    }

    console.log('\n============================================================');
    console.log('✅ BLOCKED PHONES CONFIGURATION COMPLETE');
    console.log('============================================================\n');
    console.log('📋 RESTRICTIONS ACTIVE:');
    console.log('   • No account creation with these numbers');
    console.log('   • No data bundle orders TO these numbers');
    console.log('   • All attempts logged to blockedPhoneAttempts');
    console.log('   • Imposter cannot bypass even with different account\n');

    admin.app().delete();
  } catch (error) {
    console.error('❌ Error adding blocked phones:', error.message);
    admin.app().delete();
    process.exit(1);
  }
}

addBlockedPhones();
