#!/usr/bin/env node

/**
 * Test OAuth Configuration
 * Verifies that the redirect_uri being sent matches what's registered in Google Cloud Console
 */

require('dotenv').config();

console.log('\n=====================================');
console.log('🧪 OAuth Configuration Test');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`   BASE_URL: ${process.env.BASE_URL || 'NOT SET'}`);
console.log(`   DOMAIN: ${process.env.DOMAIN || 'NOT SET'}`);
console.log(`   GOOGLE_OAUTH_CALLBACK_URL: ${process.env.GOOGLE_OAUTH_CALLBACK_URL || 'NOT SET'}`);
console.log(`   GOOGLE_OAUTH_CLIENT_ID: ${process.env.GOOGLE_OAUTH_CLIENT_ID ? '✓ SET' : 'NOT SET'}`);
console.log(`   GOOGLE_OAUTH_CLIENT_SECRET: ${process.env.GOOGLE_OAUTH_CLIENT_SECRET ? '✓ SET' : 'NOT SET'}`);

console.log('\n📌 Redirect URI Construction (Backend):');

// Simulate what the backend does
const redirectUri = (process.env.GOOGLE_OAUTH_CALLBACK_URL || process.env.BASE_URL + '/auth/google/callback').replace(/\/$/, '');
console.log(`   Final redirect_uri: ${redirectUri}`);

console.log('\n✅ Expected by Google Cloud Console:');
console.log('   - http://localhost:3000/auth/google/callback');
console.log('   - https://datasell.store/auth/google/callback');

console.log('\n🔍 Verification:');
if (redirectUri === 'http://localhost:3000/auth/google/callback') {
  console.log('   ✅ MATCHES localhost config');
} else if (redirectUri === 'https://datasell.store/auth/google/callback') {
  console.log('   ✅ MATCHES production config');
} else {
  console.log(`   ❌ DOES NOT MATCH! Actual: ${redirectUri}`);
}

console.log('\n📤 Frontend will send:');
const frontendBaseUrl = 'https://datasell.store'; // This is what frontend hardcodes as fallback
const frontendRedirectUri = frontendBaseUrl.replace(/\/$/, '') + '/auth/google/callback';
console.log(`   Frontend redirect_uri: ${frontendRedirectUri}`);

console.log('\n🔗 Comparison:');
console.log(`   Backend sends: ${redirectUri}`);
console.log(`   Frontend sends: ${frontendRedirectUri}`);
console.log(`   Match? ${redirectUri === frontendRedirectUri ? '✅ YES' : '❌ NO'}`);

console.log('\n=====================================\n');
