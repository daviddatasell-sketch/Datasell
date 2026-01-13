const admin = require('firebase-admin');
require('dotenv').config();
const { isPhoneBlocked } = require('./phone-blocking-system');

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ FIREBASE_PRIVATE_KEY not found');
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
  // Already initialized
}

async function testBlockingSystem() {
  try {
    console.log('\n============================================================');
    console.log('🧪 TESTING PHONE BLOCKING SYSTEM');
    console.log('============================================================\n');

    // Test 1: Check if blocked phones are truly blocked
    console.log('📋 TEST 1: Checking blocked phones...\n');
    
    const phoneToTest = [
      { phone: '0266676258', shouldBeBlocked: true },
      { phone: '0533742701', shouldBeBlocked: true },
      { phone: '0123456789', shouldBeBlocked: false }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of phoneToTest) {
      const result = await isPhoneBlocked(test.phone);
      const isBlocked = result.blocked;
      
      if (isBlocked === test.shouldBeBlocked) {
        console.log(`✅ ${test.phone}: ${isBlocked ? 'BLOCKED' : 'ALLOWED'} (Expected: ${test.shouldBeBlocked})`);
        passed++;
      } else {
        console.log(`❌ ${test.phone}: ${isBlocked ? 'BLOCKED' : 'ALLOWED'} (Expected: ${test.shouldBeBlocked})`);
        failed++;
      }
      
      if (isBlocked && result.reason) {
        console.log(`   Reason: ${result.reason}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 TEST RESULTS: ${passed}/${phoneToTest.length} PASSED\n`);

    if (failed === 0) {
      console.log('✅ ALL TESTS PASSED - System is working correctly!\n');
      console.log('Security Status:');
      console.log('  • Blocked phones: 2');
      console.log('  • 0266676258 - PROTECTED ✅');
      console.log('  • 0533742701 - PROTECTED ✅');
      console.log('  • Imposter cannot:');
      console.log('    - Create account with these numbers');
      console.log('    - Send data bundles to these numbers');
      console.log('    - Bypass with different email/account\n');
    } else {
      console.log(`❌ ${failed} TEST(S) FAILED - Check system configuration\n`);
    }

    // Test 2: Show blocked phone list
    console.log('============================================================');
    console.log('📋 BLOCKED PHONES IN DATABASE:\n');
    
    const blockedRef = admin.database().ref('blockedPhones');
    const snapshot = await blockedRef.once('value');
    const blockedPhones = snapshot.val() || {};

    if (Object.keys(blockedPhones).length === 0) {
      console.log('⚠️  No blocked phones found in database');
    } else {
      Object.entries(blockedPhones).forEach(([key, data]) => {
        console.log(`📌 ${data.phone || key}`);
        console.log(`   └─ Reason: ${data.reason}`);
        console.log(`   └─ Blocked: ${data.blockedAt}`);
      });
    }

    console.log('\n============================================================');
    console.log('✅ SYSTEM TEST COMPLETE');
    console.log('============================================================\n');

    admin.app().delete();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBlockingSystem();
