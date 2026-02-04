const { validateGhanianPhone, GHANA_NETWORKS } = require('./ghana-phone-validator');

console.log('\n============================================================');
console.log('🇬🇭 GHANAIAN PHONE NUMBER VALIDATOR TEST');
console.log('============================================================\n');

// Test cases
const testCases = [
  // Valid Ghanaian numbers
  { phone: '0501234567', shouldPass: true, description: 'MTN - Local format' },
  { phone: '0551234567', shouldPass: true, description: 'MTN - Local format' },
  { phone: '+233501234567', shouldPass: true, description: 'MTN - International format' },
  { phone: '+233551234567', shouldPass: true, description: 'MTN - International format' },
  { phone: '0201234567', shouldPass: true, description: 'Vodafone - Local format' },
  { phone: '0241234567', shouldPass: true, description: 'Vodafone - Local format' },
  { phone: '+233201234567', shouldPass: true, description: 'Vodafone - International format' },
  { phone: '0261234567', shouldPass: true, description: 'AirtelTigo - Local format' },
  { phone: '0271234567', shouldPass: true, description: 'AirtelTigo - Local format' },
  { phone: '+233261234567', shouldPass: true, description: 'AirtelTigo - International format' },
  { phone: '0101234567', shouldPass: true, description: 'Airtel - Local format' },
  { phone: '+233101234567', shouldPass: true, description: 'Airtel - International format' },
  
  // Invalid numbers
  { phone: '1234567890', shouldPass: false, description: 'No leading 0 or +233' },
  { phone: '123456789', shouldPass: false, description: 'Only 9 digits' },
  { phone: '05012345670', shouldPass: false, description: '11 digits (too long)' },
  { phone: '+2335012345678', shouldPass: false, description: '+233 with 10 digits' },
  { phone: '0991234567', shouldPass: false, description: 'Invalid prefix (099)' },
  { phone: '0441234567', shouldPass: false, description: 'Invalid prefix (044)' },
  { phone: '04912345678', shouldPass: false, description: 'Invalid prefix with wrong length' },
  { phone: 'abc1234567', shouldPass: false, description: 'Contains letters' },
  { phone: '', shouldPass: false, description: 'Empty string' },
  { phone: '0 50 123 4567', shouldPass: true, description: 'Valid with spaces (should be cleaned)' },
  { phone: '050-123-4567', shouldPass: true, description: 'Valid with hyphens (should be cleaned)' },
];

let passed = 0;
let failed = 0;

console.log('📋 TEST RESULTS:\n');

testCases.forEach((testCase, index) => {
  const result = validateGhanianPhone(testCase.phone);
  const isValid = result.valid;
  const passed_test = isValid === testCase.shouldPass;

  const status = passed_test ? '✅' : '❌';
  const result_text = isValid ? 'PASS ✓' : `FAIL: ${result.error}`;

  console.log(`${status} Test ${index + 1}: ${testCase.description}`);
  console.log(`   Input: "${testCase.phone}"`);
  console.log(`   Expected: ${testCase.shouldPass ? 'VALID' : 'INVALID'}`);
  console.log(`   Result: ${result_text}`);
  
  if (isValid && result.network) {
    console.log(`   Network: ${result.network}`);
    console.log(`   Normalized: ${result.normalized}`);
  }
  console.log();

  if (passed_test) {
    passed++;
  } else {
    failed++;
  }
});

console.log('============================================================');
console.log(`📊 RESULTS: ${passed}/${testCases.length} TESTS PASSED\n`);

if (failed === 0) {
  console.log('✅ ALL TESTS PASSED - Ghanaian phone validation is working!\n');
  console.log('📋 SUPPORTED NETWORKS:');
  Object.entries(GHANA_NETWORKS).forEach(([network, prefixes]) => {
    console.log(`   • ${network}: ${prefixes.join(', ')}`);
  });
  console.log();
} else {
  console.log(`❌ ${failed} TEST(S) FAILED\n`);
}

console.log('============================================================');
console.log('🇬🇭 SIGNUP PHONE VALIDATION RULES:');
console.log('============================================================');
console.log(`
✅ ACCEPTED FORMATS:
   • Local: 0501234567 (starts with 0, 10 digits)
   • International: +233501234567 (starts with +233, 9 digits after)

✅ VALID NETWORK PREFIXES:
   • MTN: 050, 051, 055, 059
   • Vodafone: 020, 024
   • AirtelTigo: 026, 027
   • Airtel: 010
   • Glotel: 091, 092

❌ REJECTED:
   • Invalid prefixes (e.g., 044, 099)
   • Wrong length (not 10 digits with 0, not 9 after +233)
   • No leading 0 or +233
   • Non-numeric characters (except formatting)

📱 BENEFITS:
   • Only legitimate Ghanaian numbers can signup
   • Imposter cannot use random numbers
   • International format automatically supported
   • Network type is recorded for analytics
`);
