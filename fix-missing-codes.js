const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

// Generate unique referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function assignMissingCodes() {
  try {
    const snapshot = await admin.database().ref('users').once('value');
    const users = snapshot.val();
    
    if (!users) {
      console.log('No users found');
      process.exit(0);
    }
    
    const usersWithoutCodes = [];
    const existingCodes = new Set();
    
    // Collect existing codes
    Object.entries(users).forEach(([uid, data]) => {
      if (data.referralCode) {
        existingCodes.add(data.referralCode);
      }
    });
    
    // Find users without codes
    Object.entries(users).forEach(([uid, data]) => {
      if (!data.referralCode) {
        usersWithoutCodes.push(uid);
      }
    });
    
    console.log(`Found ${usersWithoutCodes.length} users without referral codes`);
    console.log(`Existing codes: ${existingCodes.size}`);
    
    if (usersWithoutCodes.length === 0) {
      console.log('All users already have referral codes!');
      process.exit(0);
    }
    
    // Assign codes
    let assigned = 0;
    for (const uid of usersWithoutCodes) {
      let code;
      let attempts = 0;
      do {
        code = generateReferralCode();
        attempts++;
        if (attempts > 100) {
          console.error(`Could not generate unique code for user ${uid}`);
          break;
        }
      } while (existingCodes.has(code));
      
      if (attempts <= 100) {
        await admin.database().ref(`users/${uid}/referralCode`).set(code);
        existingCodes.add(code);
        assigned++;
        console.log(`✅ Assigned ${code} to user ${uid}`);
      }
    }
    
    console.log(`\n✨ Successfully assigned ${assigned} referral codes!`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

assignMissingCodes();
