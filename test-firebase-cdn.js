#!/usr/bin/env node

/**
 * Test script to verify Firebase SDK is loading correctly from jsDelivr CDN
 * This script checks if the CDN URLs are accessible and the Firebase SDK can be loaded
 */

const https = require('https');
const http = require('http');

console.log('🔍 Testing Firebase CDN URLs...\n');

const urls = [
    'https://cdn.jsdelivr.net/npm/firebase@9.22.0/app/dist/firebase-app.js',
    'https://cdn.jsdelivr.net/npm/firebase@9.22.0/auth/dist/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js'
];

function testUrl(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.head(url, { timeout: 5000 }, (res) => {
            resolve({
                url,
                status: res.statusCode,
                success: res.statusCode === 200,
                statusText: `${res.statusCode} ${res.statusMessage}`
            });
        });
        
        request.on('error', (err) => {
            resolve({
                url,
                status: 0,
                success: false,
                statusText: `Error: ${err.message}`
            });
        });
        
        request.on('timeout', () => {
            request.destroy();
            resolve({
                url,
                status: 0,
                success: false,
                statusText: 'Timeout'
            });
        });
    });
}

async function testAllUrls() {
    console.log('Testing Firebase CDN URLs...\n');
    
    const results = await Promise.all(urls.map(testUrl));
    
    console.log('📊 Results:\n');
    
    const jsdelivr = results.filter(r => r.url.includes('jsdelivr'));
    const gstatic = results.filter(r => r.url.includes('gstatic'));
    
    console.log('🎯 jsDelivr CDN (RECOMMENDED):');
    jsdelivr.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        console.log(`  ${icon} ${r.statusText}`);
        console.log(`     ${r.url}\n`);
    });
    
    console.log('📦 Google gstatic CDN (Original):');
    gstatic.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        console.log(`  ${icon} ${r.statusText}`);
        console.log(`     ${r.url}\n`);
    });
    
    const allSuccess = results.every(r => r.success);
    const jsdelivrSuccess = jsdelivr.every(r => r.success);
    
    console.log('\n📈 Summary:');
    console.log(`  ✅ jsDelivr CDN: ${jsdelivr.every(r => r.success) ? 'WORKING' : 'FAILED'}`);
    console.log(`  ✅ Google gstatic: ${gstatic.every(r => r.success) ? 'WORKING' : 'FAILED'}`);
    
    if (jsdelivrSuccess) {
        console.log('\n✨ Firebase CDN is working! The updated code using jsDelivr should load correctly.');
    } else {
        console.log('\n⚠️  jsDelivr CDN is not accessible. Please check your internet connection.');
    }
}

testAllUrls().catch(console.error);
