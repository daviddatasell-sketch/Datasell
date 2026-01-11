// Simpler debug - run this in browser console on datasell.store/login

console.log('=== LOCATION DEBUG ===');
console.log('window.location:', window.location);
console.log('window.location.origin:', window.location.origin);
console.log('window.location.href:', window.location.href);
console.log('window.location.protocol:', window.location.protocol);
console.log('window.location.hostname:', window.location.hostname);
console.log('window.location.host:', window.location.host);

const baseUrl = window.location.origin || (window.location.protocol + '//' + window.location.host);
console.log('');
console.log('Fallback baseUrl:', baseUrl);

const redirectUri = encodeURIComponent(baseUrl.replace(/\/$/, '') + '/auth/google/callback');
console.log('Final redirect_uri:', redirectUri);
console.log('Decoded:', decodeURIComponent(redirectUri));
