# Firebase Google Sign-In Implementation

## Overview
This implementation uses **Firebase Authentication with Google Sign-In** instead of manual Google OAuth. This approach:
- ✅ Eliminates redirect_uri_mismatch errors
- ✅ Works on localhost and production without configuration changes
- ✅ No Google Cloud Console OAuth setup needed
- ✅ Simpler frontend code
- ✅ Secure token verification via Firebase Admin SDK

## Architecture

### Frontend Flow
1. User clicks "Continue with Google" button
2. Firebase `signInWithPopup()` opens Google Sign-In popup
3. User selects Google account and grants permissions
4. Firebase returns `idToken` to frontend
5. Frontend sends `idToken` to backend `/auth/firebase-google` endpoint
6. User is logged in or account is created

### Backend Flow
1. Backend receives Firebase `idToken` from frontend
2. Backend verifies token using `admin.auth().verifyIdToken()`
3. Backend checks if user exists in database
4. Backend either:
   - Creates new user (if signup and user doesn't exist)
   - Updates existing user (if login or signup with existing email)
5. Backend creates session and returns success response

## Firebase Configuration

### Current Firebase Project
- **Project ID:** datasell-7b993
- **Auth Domain:** datasell-7b993.firebaseapp.com
- **API Key:** AIzaSyAdB-9vEhC6dXSQvCjBpZrB8_HqL2Xmwvs

### Firebase Console Settings
1. Go to [Firebase Console](https://console.firebase.google.com/project/datasell-7b993)
2. Navigate to Authentication → Sign-in method
3. Ensure **Google** is enabled
4. No additional OAuth configuration needed on Google Cloud Console

## Files Modified

### server.js
- **Removed endpoints:**
  - `GET /debug/oauth-config` (debug endpoint)
  - `POST /auth/google/verify` (old OAuth verification)
  - `GET /auth/google/callback` (old OAuth callback)
  
- **New endpoint:**
  - `POST /auth/firebase-google` - Verifies Firebase token and creates/logs in user

### public/login.html
- **Added:** Firebase SDK initialization
- **Added:** Firebase Google Sign-In popup flow
- **Removed:** Manual Google OAuth code
- **New behavior:** Clicks "Continue with Google" → Firebase popup → Token verification

### public/signup.html
- **Added:** Firebase SDK initialization
- **Added:** Firebase Google Sign-In popup flow
- **Removed:** Manual Google OAuth code
- **New behavior:** Clicks "Continue with Google" → Firebase popup → Token verification

## Testing Checklist

### Prerequisites
- ✅ Firebase Admin SDK configured in server.js
- ✅ Database rules allow read/write access
- ✅ Environment variables set up correctly

### Testing Steps

#### 1. Test on Localhost (http://localhost:3000)
```bash
# Start the server
node server.js

# Visit the login page
# Navigate to http://localhost:3000/login

# Click "Continue with Google"
# You should see:
#   1. Google Sign-In popup
#   2. Account selection screen
#   3. Permissions request
#   4. Redirect to dashboard
```

#### 2. Test on Production (https://datasell.store)
```bash
# Deploy changes to production
git push origin main

# Visit the login page
# Navigate to https://datasell.store/login

# Click "Continue with Google"
# Should work identically to localhost
```

#### 3. Test Signup Flow
```bash
# Use a NEW Google account or email that hasn't signed up
# Click "Continue with Google" on signup page
# You should be:
#   1. Logged in
#   2. Redirected to /complete-profile (or dashboard)
#   3. User created in database with auth method "google"
```

#### 4. Test Login Flow
```bash
# Use an EXISTING Google account that has already signed up
# Click "Continue with Google" on login page
# You should be:
#   1. Logged in immediately
#   2. Redirected to dashboard
#   3. Last login timestamp updated
```

#### 5. Browser Console Testing
```javascript
// In browser console, you should see:
console.log('Google Sign-In button clicked');
console.log('✅ Firebase Google Sign-In successful: user@example.com');
console.log('✅ Backend verification successful');
// Then redirect to dashboard
```

## Troubleshooting

### Issue: "Firebase is not defined"
**Solution:** Ensure Firebase SDK is loaded before the Google Sign-In script
- Check that `<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js">` is present
- Check that Firebase initialization code runs before button click handler

### Issue: "signInWithPopup is not a function"
**Solution:** Ensure Firebase Auth module is loaded
- Check that `<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js">` is present

### Issue: Popup blocked
**Solution:** 
- The popup must be opened in response to a direct user click
- Cannot use async/await before opening the popup
- Browser may have popup blocker enabled

### Issue: "Invalid or expired token"
**Solution:**
- Token may have expired (tokens expire after ~1 hour)
- Backend Firebase Admin SDK may not be initialized correctly
- Check Firebase Admin SDK configuration in server.js

### Issue: User created but not logged in
**Solution:**
- Session may not be created properly
- Check that `req.session.user` is set correctly
- Verify session middleware is configured in Express

### Issue: Email not matching between login and signup
**Solution:**
- Emails are normalized to lowercase in database
- Check that email comparison is case-insensitive

## Database Structure

### User Object (after Google Sign-In)
```javascript
{
  uid: "firebase-uid-123456",
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "",
  profilePicture: "https://example.com/photo.jpg",
  walletBalance: 0,
  createdAt: "2024-01-10T10:30:00.000Z",
  lastLogin: "2024-01-10T10:30:00.000Z",
  isAdmin: false,
  pricingGroup: "regular",
  suspended: false,
  authMethod: "google",
  googleLinked: true,
  passwordHash: null
}
```

## Security Notes

✅ **What's Secure:**
- Token verified server-side using Firebase Admin SDK
- No client-side token acceptance
- Session created server-side
- User email and credentials never exposed to frontend

⚠️ **What to Monitor:**
- Firebase rules allow proper access control
- Session cookies are secure and HttpOnly
- User data is not logged in console on production

## Next Steps

1. ✅ Deploy changes to production
2. Test on both localhost and https://datasell.store
3. Monitor console logs for any errors
4. Verify users can login and signup
5. Check database for new users created via Google

## Rollback (if needed)

If you need to revert to manual Google OAuth:
```bash
git revert <commit-hash>
# Or restore from backup of old server.js
```

## Support

- Firebase Console: https://console.firebase.google.com/project/datasell-7b993
- Firebase Documentation: https://firebase.google.com/docs/auth
- Google Sign-In: https://developers.google.com/identity/gsi/web
