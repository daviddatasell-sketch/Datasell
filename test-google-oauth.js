/**
 * Google OAuth Integration Test
 * Run this to test the Google OAuth endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Mock Google ID token (you need a real one for actual testing)
const MOCK_GOOGLE_ID_TOKEN = 'YOUR_REAL_GOOGLE_ID_TOKEN_HERE';

console.log('🧪 DataSell Google OAuth Integration Tests\n');

async function testGoogleOAuthVerify() {
    console.log('📝 Test 1: Google OAuth Verify Endpoint');
    console.log('━'.repeat(50));

    try {
        // This test requires a real Google ID token
        console.log('⚠️  Note: This test requires a real Google ID token');
        console.log('   Get one by:');
        console.log('   1. Open browser console on login/signup page');
        console.log('   2. Sign in with Google');
        console.log('   3. In the callback function, log the response.credential');
        console.log('   4. Use that token here\n');

        const response = await axios.post(`${BASE_URL}/auth/google/verify`, {
            idToken: MOCK_GOOGLE_ID_TOKEN,
            isSignup: false
        }, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Success Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n');
}

async function testMissingToken() {
    console.log('📝 Test 2: Missing ID Token Error');
    console.log('━'.repeat(50));

    try {
        const response = await axios.post(`${BASE_URL}/auth/google/verify`, {
            idToken: null,
            isSignup: false
        }, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response:', response.data);
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Correctly rejected missing token');
            console.log('Error Message:', error.response.data.error);
        } else {
            console.log('❌ Unexpected error:', error.response?.data || error.message);
        }
    }

    console.log('\n');
}

async function testLinkPhone() {
    console.log('📝 Test 3: Link Phone Endpoint');
    console.log('━'.repeat(50));

    try {
        // First need to be authenticated
        console.log('⚠️  Note: This test requires an authenticated session');
        console.log('   First sign in with Google, then run this test\n');

        const response = await axios.post(`${BASE_URL}/auth/google/link-phone`, {
            phone: '0501234567'
        }, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Success Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n');
}

async function testInvalidPhone() {
    console.log('📝 Test 4: Invalid Phone Number');
    console.log('━'.repeat(50));

    try {
        const response = await axios.post(`${BASE_URL}/auth/google/link-phone`, {
            phone: 'invalid-phone'
        }, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response:', response.data);
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Correctly rejected invalid phone');
            console.log('Error Message:', error.response.data.error);
        } else {
            console.log('❌ Unexpected error:', error.response?.data || error.message);
        }
    }

    console.log('\n');
}

async function manualTest() {
    console.log('📝 Manual Testing Instructions');
    console.log('━'.repeat(50));
    console.log(`
1. Start your DataSell server:
   npm start

2. Open login page:
   http://localhost:3000/login

3. Click "Sign in with Google" button

4. Sign in with your Google account

5. Check console for success/error messages

6. If successful, you should be redirected to homepage

7. Check database for new user entry:
   - Go to Firebase Realtime Database
   - Navigate to users/[googleUid]
   - Verify account was created with authMethod: "google"

8. For signup testing:
   - Go to http://localhost:3000/signup
   - Click "Sign up with Google"
   - Use a different Google account or email
   - Follow same steps as above

9. Test phone linking (if needed):
   - After Google Sign-In
   - Call /auth/google/link-phone with valid Ghanaian phone
   - Verify phone is saved in database
    `);

    console.log('\n');
}

async function runAllTests() {
    try {
        // Check if server is running
        await axios.get(`${BASE_URL}/auth-check`, {
            withCredentials: true
        });
        console.log('✅ Server is running\n');
    } catch (error) {
        console.log('❌ Server is not running. Start it with: npm start\n');
        return;
    }

    await testMissingToken();
    await testInvalidPhone();
    await manualTest();

    // Only run these if you have real tokens
    // await testGoogleOAuthVerify();
    // await testLinkPhone();

    console.log('✅ All tests completed!');
}

// Run tests
runAllTests();

console.log(`
Additional Testing Tips:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Browser DevTools Testing:
   - Open DevTools (F12)
   - Go to Application > Cookies
   - Verify "connect.sid" (session) is created after login

2. Network Tab Testing:
   - Monitor requests in Network tab
   - Check POST /auth/google/verify request
   - Verify response status is 200
   - Check response body for user data

3. Firebase Database Testing:
   - Go to Firebase Console
   - Navigate to Realtime Database
   - Check users/ for new entries with authMethod: "google"

4. Session Testing:
   - After login, session should persist
   - Reload page and verify you stay logged in
   - Logout and verify session is cleared

5. Error Testing:
   - Try signing in with wrong credentials
   - Try expired Google tokens
   - Try invalid phone numbers
   - Check console for error messages
`);
