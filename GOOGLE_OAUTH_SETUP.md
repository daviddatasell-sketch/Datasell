# Google OAuth Implementation Guide

## Overview

This guide explains how to set up and use Google OAuth for the DataSell application. Users can now sign in and sign up using their Google accounts directly from the login and signup pages.

## Features

✅ **Sign in with Google** - Existing users can log in using their Google account
✅ **Sign up with Google** - New users can create accounts using their Google account
✅ **Automatic Account Linking** - Google accounts are linked to existing email-based accounts
✅ **Session Management** - Secure session handling with persistent login (7 days)
✅ **Responsive Design** - Mobile-friendly Google Sign-In button
✅ **Error Handling** - Comprehensive error messages and user feedback
✅ **Traditional Login/Signup** - Still works independently alongside Google OAuth

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing "datasell-7b993"
3. From the search bar, search for "Google+ API"
4. Click "Enable" to activate Google+ API

### Step 2: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   ```
   http://localhost:3000/auth/google/callback
   http://localhost:3000
   http://localhost:3000/login
   http://localhost:3000/signup
   https://your-domain.com/auth/google/callback
   https://your-domain.com
   https://your-domain.com/login
   https://your-domain.com/signup
   ```
5. Copy your **Client ID** and **Client Secret**

### Step 3: Update Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

For production:
```env
GOOGLE_OAUTH_CALLBACK_URL=https://your-domain.com/auth/google/callback
```

### Step 4: Update HTML Files

The `login.html` and `signup.html` files have been updated with Google Sign-In buttons. Replace `YOUR_GOOGLE_CLIENT_ID` in both files with your actual Client ID:

**In login.html and signup.html:**
```javascript
google.accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace with actual Client ID
    callback: handleGoogleSignIn
});
```

## How It Works

### Login Flow (Login Page)

1. User clicks "Sign in with Google" button
2. Google Sign-In popup appears
3. User authenticates with Google
4. Client sends ID token to `/auth/google/verify` endpoint
5. Server verifies token with Firebase Admin SDK
6. If user exists, logs them in
7. If user doesn't exist, returns error and suggests sign-up
8. Session is created with 7-day expiration
9. User is redirected to homepage

### Sign-up Flow (Sign-up Page)

1. User clicks "Sign up with Google" button
2. Google Sign-In popup appears
3. User authenticates with Google
4. Client sends ID token to `/auth/google/verify` endpoint
5. Server verifies token with Firebase Admin SDK
6. If user exists, logs them in anyway
7. If user doesn't exist, creates new account:
   - Uses Google UID as user ID
   - Extracts name and profile picture from Google account
   - Sets auth method to "google"
   - Initializes wallet balance to 0
8. Session is created with 7-day expiration
9. User is redirected to homepage

### Account Linking

- If a user signs up with email/password, they can later sign in with Google using the same email
- If a user signs in with Google, they can link a phone number via the dedicated endpoint
- The system tracks authentication method for each user

## API Endpoints

### POST /auth/google/verify
Verifies Google ID token and creates/logs in user

**Request Body:**
```json
{
  "idToken": "google_id_token_from_client",
  "isSignup": true/false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "userId": "user_uid",
  "email": "user@example.com",
  "displayName": "User Name",
  "authMethod": "google",
  "isNewUser": true/false,
  "message": "Account created successfully!" / "Logged in successfully!"
}
```

**Error Responses:**
- **400** - Missing ID token or invalid email
- **401** - Invalid/expired Google token
- **404** - User not found (for login, suggests sign-up)
- **500** - Server error

### POST /auth/google/link-phone
Links a phone number to Google OAuth account

**Request Body:**
```json
{
  "phone": "0501234567"
}
```

**Success Response:**
```json
{
  "success": true,
  "phone": "0501234567",
  "message": "Phone number linked successfully!"
}
```

## Database Schema

### User Object (Google OAuth)
```javascript
{
  uid: "google_uid",
  firstName: "First",
  lastName: "Last",
  email: "user@example.com",
  phone: "0501234567",
  profilePicture: "https://...",
  walletBalance: 0,
  createdAt: "2026-01-10T...",
  isAdmin: false,
  pricingGroup: "regular",
  suspended: false,
  lastLogin: "2026-01-10T...",
  authMethod: "google",
  googleLinked: true,
  googleUid: "google_uid",
  passwordHash: null
}
```

## User Logs

Each authentication action is logged:
```javascript
{
  userId: "user_uid",
  action: "login_google" / "registration_google",
  email: "user@example.com",
  authMethod: "google",
  timestamp: "2026-01-10T...",
  ip: "192.168.1.1"
}
```

## Security Considerations

✅ **Token Verification**: All Google ID tokens are verified server-side using Firebase Admin SDK
✅ **Session Security**: Sessions use secure cookies with HttpOnly flag
✅ **No Password Storage**: OAuth users don't have password hashes stored
✅ **Account Isolation**: Users can only access their own accounts
✅ **CSRF Protection**: Express-session provides CSRF protection
✅ **Rate Limiting**: Consider adding rate limiting for production

## Troubleshooting

### "Google Sign-In button doesn't work"
- Verify Client ID is correct
- Check redirect URIs in Google Cloud Console
- Ensure domain is whitelisted
- Clear browser cache and try again

### "Invalid or expired Google token"
- Token may have expired (they expire after ~1 hour)
- User clicked sign-in but page was closed before completion
- Ask user to sign in again

### "No account found with this email"
- This is normal for login - suggest user to sign up
- Sign-up automatically creates account

### "User already exists"
- On sign-up, if user exists by email, it logs them in instead
- On login, if user doesn't exist, it suggests sign-up

## Testing

### Local Testing
```env
GOOGLE_OAUTH_CLIENT_ID=YOUR_DEV_CLIENT_ID
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Testing Steps
1. Go to http://localhost:3000/login
2. Click "Sign in with Google"
3. Select your Google account
4. Verify you're logged in
5. Repeat for sign-up

## Migration from Traditional Auth

Existing users can seamlessly switch to Google sign-in:
1. User has account with email "user@example.com" (email/password)
2. User clicks Google Sign-In on login page with same Google account
3. System finds user by email and logs them in
4. User account is updated with `googleLinked: true`

No manual migration needed!

## Limitations & Future Enhancements

### Current Limitations
- Requires Google account with email
- Can't change email after Google OAuth (tied to Google account)
- Phone number must be set separately if needed

### Future Enhancements
- Support for other OAuth providers (Facebook, GitHub)
- Automatic phone number detection from Google profile (if available)
- Two-factor authentication via Google Authenticator
- Account linking (link Google to existing email account)

## Production Checklist

- [ ] Create production Google OAuth credentials
- [ ] Update `.env` with production credentials
- [ ] Update redirect URIs to production domain
- [ ] Test login/signup flow thoroughly
- [ ] Enable HTTPS (required for Google OAuth)
- [ ] Set `NODE_ENV=production`
- [ ] Monitor user logs for authentication issues
- [ ] Set up error tracking (Sentry, LogRocket)

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review Google Cloud Console credentials
3. Check server logs for error messages
4. Verify all environment variables are set correctly

---

**Last Updated**: January 10, 2026
**Version**: 1.0.0
