# OAuth Testing Guide - Steps to Test Locally

## Server Status ✅
- Server is running on **localhost:3000**
- Firebase Admin is initialized
- All services are ready

## What Was Fixed 🔧

1. **Better OAuth flow** with proper scopes
2. **Improved error handling** for popup issues
3. **Better button states** and loading messages
4. **Enhanced logging** for debugging
5. **Firebase persistence** for stable sessions

## Testing Steps

### Step 1: Refresh Your Browser
```
Press: Ctrl + F5 (hard refresh to clear cache)
```

### Step 2: Go to Login Page
```
URL: http://localhost:3000/login
```

### Step 3: Click "Continue with Google"
Expected behavior:
- Button shows "Connecting to Google..."
- Google popup appears (may take 1-3 seconds)
- Sign in with your Google account
- Should redirect to home page

### Step 4: If Popup Doesn't Appear
Check the browser console (F12):
- Press F12 to open Developer Tools
- Click "Console" tab
- Look for error messages
- Screenshot any errors

### Step 5: Test Signup Page
```
URL: http://localhost:3000/signup
```
- Click "Continue with Google"
- Should create new account automatically
- Should redirect to home page

### Step 6: Test with Email/Password Still Works
```
URL: http://localhost:3000/login
```
- Enter email: boimanuel356@gmail.com
- Enter password: Bulletman1234567890123@
- Check "Remember me"
- Click "Sign In"
- Should log in as admin

## What to Look For ✅

**Success Indicators:**
- ✅ Google button is clickable
- ✅ Button text changes to "Connecting to Google..."
- ✅ Google popup appears (may have slight delay)
- ✅ Can sign in with Google account
- ✅ Redirects to home page after login
- ✅ Session is created (user stays logged in)
- ✅ No console errors

**What Should NOT Happen:**
- ❌ Blank page showing just the URL
- ❌ "Invalid token" error in console
- ❌ Redirect to wrong page
- ❌ Infinite loading

## Troubleshooting

### Issue: Popup Doesn't Appear
**Solution**: 
1. Check if popups are blocked in browser
2. Allow popups for localhost:3000
3. Try in incognito mode
4. Check browser console for errors

### Issue: Takes Long to Load
**Solution**:
1. First click is always slower (Firebase loading)
2. Subsequent clicks are faster
3. Hard refresh (Ctrl+F5) can help

### Issue: Firebase URL Shows Instead of Popup
**Solution**:
1. This means the popup is being caught
2. Check if JavaScript is enabled
3. Try in different browser
4. Check browser console for errors

### Issue: "Invalid Token" Error
**Solution**:
1. Check Firebase Console authorized domains
2. Make sure `localhost:3000` is added
3. Wait a few minutes for Firebase to update
4. Clear browser cache (Ctrl+F5)

## Server Console Logs

Watch the terminal where server is running:
```
✅ Google token verified: ...
```
This means the backend received the token.

If you see:
```
❌ Google token verification failed
```
Check that:
1. Firebase is properly configured
2. Token is valid
3. Network is working

## Testing Checklist

- [ ] Refresh browser (Ctrl+F5)
- [ ] Google button visible on login page
- [ ] Google button visible on signup page
- [ ] Can click Google button
- [ ] Google popup appears
- [ ] Can sign in with Google account
- [ ] Redirects to home after OAuth login
- [ ] Email/password login still works
- [ ] Admin login still works
- [ ] No console errors

## Next Steps

After testing:

1. **If working**: Test on mobile (responsive design)
2. **If not working**: 
   - Share console errors with me
   - Check what's in browser DevTools Network tab
   - Let me know the exact error message

3. **Ready for production**:
   - Test on your live domain
   - Add domain to Firebase authorized domains
   - Test with real Google/Apple accounts

## Quick Reference URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000/login | Test OAuth login |
| http://localhost:3000/signup | Test OAuth signup |
| http://localhost:3000/admin | Admin dashboard |
| http://localhost:3000/ | Home page (if logged in) |

## Console Commands (For Debugging)

Open browser console (F12) and run:
```javascript
// Check if Firebase is loaded
console.log(firebase);

// Check auth instance
console.log(firebase.auth());

// Check current user
firebase.auth().currentUser;
```

## Getting Help

If you encounter issues:
1. **Check browser console** (F12 → Console tab)
2. **Check server terminal** for logs
3. **Take a screenshot** of any error messages
4. **Share the error** with me

---

## Updated Files

The following files were updated for better OAuth experience:
- `public/login.html` - Better error handling, clearer loading states
- `public/signup.html` - Same improvements

## What's Different Now

**Before:**
- Generic "Loading..." message
- Limited error messages
- Simpler logging

**Now:**
- "Connecting to Google..." specific message
- Detailed error messages (popup blocked, cancelled, etc.)
- Better console logging for debugging
- Improved Firebase persistence
- Better scopes configuration

---

**Status**: Ready for testing! 🚀
