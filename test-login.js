// Simple test to verify login flow works
const http = require('http');
const querystring = require('querystring');

// Test credentials (adjust as needed)
const testEmail = 'test@example.com'; // or use an existing user
const testPassword = 'TestPassword123'; 

console.log('🧪 Testing login flow...\n');

// Step 1: Try to login
console.log('Step 1: Attempting login with email:', testEmail);

const loginData = JSON.stringify({
    email: testEmail,
    password: testPassword,
    rememberMe: false
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
        'Cookie': '' // Track cookies
    }
};

const req = http.request(options, (res) => {
    let data = '';
    const setCookieHeaders = res.headers['set-cookie'] || [];
    
    console.log('Response Status:', res.statusCode);
    console.log('Set-Cookie Headers:', setCookieHeaders);
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Response Body:', JSON.stringify(parsed, null, 2));
            
            if (parsed.success && setCookieHeaders.length > 0) {
                console.log('\n✅ Login successful and cookies set!');
                
                // Step 2: Try to access /api/check-auth with the same cookie
                console.log('\nStep 2: Checking auth with session cookie...');
                
                const sessionCookie = setCookieHeaders[0].split(';')[0];
                const checkAuthOptions = {
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/check-auth',
                    method: 'GET',
                    headers: {
                        'Cookie': sessionCookie
                    }
                };
                
                const checkReq = http.request(checkAuthOptions, (checkRes) => {
                    let checkData = '';
                    
                    checkRes.on('data', (chunk) => {
                        checkData += chunk;
                    });
                    
                    checkRes.on('end', () => {
                        try {
                            const checkParsed = JSON.parse(checkData);
                            console.log('Auth Check Response:', JSON.stringify(checkParsed, null, 2));
                            
                            if (checkParsed.authenticated) {
                                console.log('\n✅ Session is valid! User can access protected routes.');
                            } else {
                                console.log('\n❌ Session not recognized! This is the problem.');
                                console.log('The session cookie set during login is not being recognized.');
                            }
                        } catch (e) {
                            console.error('Failed to parse auth check response:', e);
                        }
                    });
                });
                
                checkReq.end();
            } else {
                console.log('\n❌ Login failed or no cookies set');
                if (!parsed.success) {
                    console.log('Login error:', parsed.error);
                }
            }
        } catch (e) {
            console.error('Failed to parse response:', e, '\nRaw data:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error);
});

req.write(loginData);
req.end();
