#!/usr/bin/env node

/**
 * Frontend OAuth URL Test
 * Simulates what the frontend code generates for the Google OAuth URL
 */

console.log('\n=====================================');
console.log('🧪 Frontend OAuth URL Test');
console.log('=====================================\n');

// Simulate frontend conditions
const scenarios = [
  {
    name: 'Production (window.location.origin works)',
    origin: 'https://datasell.store',
    protocol: null,
    host: null,
  },
  {
    name: 'Production (window.location.origin undefined - fallback to protocol+host)',
    origin: undefined,
    protocol: 'https:',
    host: 'datasell.store',
  },
  {
    name: 'Production (all undefined - fallback to hardcoded)',
    origin: undefined,
    protocol: undefined,
    host: undefined,
  },
];

const clientId = '503108953382-uk7ks61h051bot7kkv8m1ml9uhla8rkq.apps.googleusercontent.com';

scenarios.forEach((scenario, index) => {
  console.log(`\n📌 Scenario ${index + 1}: ${scenario.name}`);
  
  // Simulate frontend code
  let baseUrl = scenario.origin;
  if (!baseUrl && scenario.protocol && scenario.host) {
    baseUrl = scenario.protocol + '//' + scenario.host;
  }
  if (!baseUrl) {
    baseUrl = 'https://datasell.store'; // hardcoded fallback
  }
  
  const redirectUri = baseUrl.replace(/\/$/, '') + '/auth/google/callback';
  
  const scope = encodeURIComponent('openid email profile');
  const responseType = 'code';
  const prompt = 'select_account';
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&prompt=${prompt}`;
  
  console.log(`   baseUrl: ${baseUrl}`);
  console.log(`   redirectUri (before encode): ${redirectUri}`);
  console.log(`   redirectUri (after encode): ${encodeURIComponent(redirectUri)}`);
  
  // Extract the redirect_uri param from the URL
  const urlObj = new URL(googleAuthUrl);
  const sentRedirectUri = urlObj.searchParams.get('redirect_uri');
  console.log(`   ✓ redirect_uri sent to Google: ${sentRedirectUri}`);
  
  // Decode it to see what Google will see
  const decodedRedirectUri = decodeURIComponent(sentRedirectUri);
  console.log(`   ✓ After Google decodes it: ${decodedRedirectUri}`);
  
  // Check if it matches registered URIs
  const registered = [
    'http://localhost:3000/auth/google/callback',
    'https://datasell.store/auth/google/callback'
  ];
  
  const matches = registered.includes(decodedRedirectUri);
  console.log(`   ✓ Matches registered URI? ${matches ? '✅ YES' : '❌ NO'}`);
  
  if (!matches) {
    console.log(`   ⚠️  PROBLEM! Google will reject this because it doesn't match:`);
    registered.forEach(uri => console.log(`      - ${uri}`));
  }
});

console.log('\n=====================================\n');
