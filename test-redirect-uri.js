// Test script to verify redirect_uri values
require('dotenv').config();

console.log('\n=== OAUTH REDIRECT_URI DEBUG ===\n');
console.log('Environment variables:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  BASE_URL: ${process.env.BASE_URL}`);
console.log(`  DOMAIN: ${process.env.DOMAIN}`);
console.log(`  GOOGLE_OAUTH_CALLBACK_URL: ${process.env.GOOGLE_OAUTH_CALLBACK_URL}`);
console.log(`  GOOGLE_OAUTH_CLIENT_ID: ${process.env.GOOGLE_OAUTH_CLIENT_ID}`);

// Simulate backend token exchange
const redirectUri = (process.env.GOOGLE_OAUTH_CALLBACK_URL || process.env.BASE_URL + '/auth/google/callback').replace(/\/$/, '');
console.log(`\n✅ Backend will send to Google:`);
console.log(`   redirect_uri: ${redirectUri}`);

// What the frontend will send
const frontendBaseUrl = process.env.DOMAIN || process.env.BASE_URL || 'https://datasell.store';
const frontendRedirectUri = frontendBaseUrl.replace(/\/$/, '') + '/auth/google/callback';
console.log(`\n✅ Frontend will send to Google:`);
console.log(`   redirect_uri: ${frontendRedirectUri}`);

console.log(`\n✅ Google Cloud Console expects:`);
console.log(`   https://datasell.store/auth/google/callback`);
console.log(`   http://localhost:3000/auth/google/callback`);

console.log(`\n🔍 Do they match?`);
console.log(`   Backend == Frontend: ${redirectUri === frontendRedirectUri ? '✅ YES' : '❌ NO'}`);
console.log(`   Backend == GCC: ${redirectUri === 'https://datasell.store/auth/google/callback' ? '✅ YES' : '❌ NO'}`);
console.log(`   Frontend == GCC: ${frontendRedirectUri === 'https://datasell.store/auth/google/callback' ? '✅ YES' : '❌ NO'}`);
