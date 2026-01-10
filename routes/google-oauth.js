/**
 * Google OAuth Routes
 * Handles Google Sign-In and user account creation/linking
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { validateGhanianPhone } = require('../ghana-phone-validator');

/**
 * POST /auth/google/verify
 * Verify Google ID token and create/login user
 * This is called from the client-side Google Sign-In button
 */
router.post('/verify', async (req, res) => {
  try {
    const { idToken, isSignup } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Google ID token is required'
      });
    }

    console.log(`🔐 Google OAuth verification attempt (${isSignup ? 'Signup' : 'Login'})`);

    // Verify the Google ID token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log(`✅ Google ID token verified for: ${decodedToken.email}`);
    } catch (tokenError) {
      console.error(`❌ Invalid Google ID token: ${tokenError.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired Google token. Please try again.',
        details: tokenError.message
      });
    }

    const { email, name, picture, uid: googleUid } = decodedToken;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Google account does not have an email address'
      });
    }

    const userEmail = email.toLowerCase().trim();

    // Check if user already exists
    const usersSnapshot = await admin.database().ref('users').once('value');
    const existingUsers = usersSnapshot.val() || {};
    
    let existingUser = null;
    let existingUid = null;

    // Search for user by email
    for (const [uid, userData] of Object.entries(existingUsers)) {
      if (userData.email && userData.email.toLowerCase() === userEmail) {
        existingUser = userData;
        existingUid = uid;
        console.log(`✅ Found existing user with email: ${userEmail}`);
        break;
      }
    }

    let userId, authMethod, isNewUser = false;

    if (existingUser) {
      // User exists - login
      if (isSignup) {
        console.log(`ℹ️ User already exists, proceeding with login instead`);
      }
      userId = existingUid;
      authMethod = existingUser.authMethod || 'database';

      // Update last login
      await admin.database().ref(`users/${userId}/lastLogin`).set(new Date().toISOString());
      await admin.database().ref(`users/${userId}/googleLinked`).set(true);

      console.log(`✅ User logged in: ${email} (${userId})`);
    } else {
      // User does not exist
      if (!isSignup) {
        return res.status(404).json({
          success: false,
          error: 'No account found with this email. Please sign up first.',
          requireSignup: true
        });
      }

      // Create new user
      userId = googleUid; // Use Google's UID as the user ID
      authMethod = 'google';
      isNewUser = true;

      // Parse name
      const [firstName = 'User', lastName = ''] = (name || '').split(' ');

      // Create user in database
      await admin.database().ref(`users/${userId}`).set({
        uid: userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: userEmail,
        phone: '',
        profilePicture: picture || '',
        walletBalance: 0,
        createdAt: new Date().toISOString(),
        isAdmin: userEmail === process.env.ADMIN_EMAIL,
        pricingGroup: 'regular',
        suspended: false,
        lastLogin: new Date().toISOString(),
        authMethod: authMethod,
        googleLinked: true,
        googleUid: googleUid,
        passwordHash: null // No password for OAuth users
      });

      console.log(`✅ New user created via Google OAuth: ${userEmail} (${userId})`);
    }

    // Set session
    req.session.user = {
      uid: userId,
      email: userEmail,
      displayName: name || 'User',
      profilePicture: picture,
      isAdmin: userEmail === process.env.ADMIN_EMAIL,
      authMethod: authMethod
    };

    console.log(`✅ Session created for user: ${userId}`);

    // Set cookie max age for persistent session (7 days)
    try {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
    } catch (e) {
      console.log('⚠️ Could not set session cookie max age');
    }

    // Log the action
    await admin.database().ref('userLogs').push().set({
      userId: userId,
      action: isNewUser ? 'registration_google' : 'login_google',
      email: userEmail,
      authMethod: 'google',
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    return res.json({
      success: true,
      userId: userId,
      email: userEmail,
      displayName: name,
      authMethod: authMethod,
      isNewUser: isNewUser,
      message: isNewUser 
        ? 'Account created successfully!' 
        : 'Logged in successfully!'
    });

  } catch (error) {
    console.error('❌ Google OAuth verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed: ' + error.message
    });
  }
});

/**
 * POST /auth/google/link-phone
 * Link phone number to Google OAuth account (for new users)
 */
router.post('/link-phone', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Validate phone
    const phoneValidationResult = validateGhanianPhone(phone);
    if (!phoneValidationResult.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidationResult.error
      });
    }

    const userId = req.session.user.uid;
    const normalizedPhone = phoneValidationResult.normalized;

    // Update user's phone
    await admin.database().ref(`users/${userId}/phone`).set(normalizedPhone);

    console.log(`✅ Phone linked for user: ${userId} - ${normalizedPhone}`);

    return res.json({
      success: true,
      phone: normalizedPhone,
      message: 'Phone number linked successfully!'
    });

  } catch (error) {
    console.error('❌ Phone linking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link phone: ' + error.message
    });
  }
});

module.exports = router;
