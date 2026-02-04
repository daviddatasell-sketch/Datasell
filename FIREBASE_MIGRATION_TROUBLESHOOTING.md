# 🔧 Firebase Migration - Troubleshooting Guide

## Common Issues & Solutions

---

## ❌ "Firebase initialization failed"

### Error Message:
```
Error: Failed to initialize Firebase Admin SDK
```

### Causes & Solutions:

**1. Invalid FIREBASE_PRIVATE_KEY format**
```bash
# ❌ Wrong - newlines not escaped
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkq...
-----END PRIVATE KEY-----

# ✅ Correct - newlines as \n
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"
```

**Solution:**
- Copy the PRIVATE_KEY value exactly from the JSON file
- Keep the entire value in quotes
- Ensure all newlines are represented as `\n`
- Test with: `node validate-firebase.js`

---

**2. Missing required environment variables**

```bash
# Check what's missing
node validate-firebase.js
```

**Solution:**
- Copy ALL Firebase variables from your service account JSON
- Don't skip any variables
- Ensure values are not empty

---

**3. Incorrect Project ID or Project doesn't exist**

```bash
# ❌ Wrong
FIREBASE_PROJECT_ID=datasell-a3f57

# ✅ Correct (new project ID)
FIREBASE_PROJECT_ID=datasell-secure-2026
```

**Solution:**
- Verify project ID matches the new Firebase project
- Check it in Firebase Console → Project Settings
- Ensure new project was created successfully

---

## ❌ "Permission denied" - Import fails

### Error Message:
```
Error: Permission denied: Missing or insufficient permissions
```

### Causes & Solutions:

**1. Firebase Realtime Database Rules blocking writes**

**Solution:**
```bash
# 1. Go to Firebase Console
# 2. Realtime Database → Rules
# 3. Add these rules:
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
# 4. Click Publish
# 5. Try import again
```

**2. Service account doesn't have permissions**

**Solution:**
```bash
# 1. Go to Firebase Console → Settings → Service Accounts
# 2. Check that the email ends with: .iam.gserviceaccount.com
# 3. Go to GCP Console (same project)
# 4. IAM & Admin → IAM
# 5. Verify service account has "Editor" or "Owner" role
# 6. If not, click on the service account and grant role
```

**3. Database URL in .env is wrong**

```bash
# ❌ Wrong
FIREBASE_DATABASE_URL=https://datasell-a3f57.firebasedatabase.app

# ✅ Correct format
FIREBASE_DATABASE_URL=https://<new_project_id>-default-rtdb.<region>.firebasedatabase.app
```

**Solution:**
- Copy `FIREBASE_DATABASE_URL` exactly from Firebase Console
- Go to: Realtime Database → Copy your database URL from the connection info

---

## ❌ "Database connection timeout"

### Error Message:
```
Error: ETIMEDOUT - Connection timeout
```

### Causes & Solutions:

**1. Realtime Database not enabled**

**Solution:**
```bash
# 1. Go to Firebase Console
# 2. Click Realtime Database from left menu
# 3. If not present, click "Create Database"
# 4. Choose region (Europe recommended)
# 5. Choose "Start in test mode"
# 6. Click Enable
# 7. Try again
```

**2. Network/Firewall issue**

**Solution:**
```bash
# Test basic connectivity
ping firebaseio.com

# If fails, check:
# - Company firewall blocking Google APIs
# - VPN issues
# - Network connectivity
# Try from different network if possible
```

**3. Invalid database URL**

```bash
# Check the format: https://<project>-default-rtdb.<region>.firebasedatabase.app
# Make sure:
# - No typos in project name
# - Region matches Firebase Console
# - Uses HTTPS not HTTP
```

---

## ❌ Export script fails - "Cannot read users"

### Error Message:
```
Error: Cannot read property 'ref' of undefined
```

### Causes & Solutions:

**1. Firebase not initialized before export starts**

**Solution:**
```bash
# Make sure Firebase Admin is initialized
# Check that all FIREBASE_* variables exist in .env

# Run validation first
node validate-firebase.js

# If validation passes, try export again
node firebase-export.js
```

**2. Old Firebase credentials expired or revoked**

**Solution:**
```bash
# 1. Go to Firebase Console (old project)
# 2. Settings → Service Accounts
# 3. Check if key still exists
# 4. If not, generate a new private key
# 5. Update .env with new key
# 6. Try export again
```

---

## ❌ Import script fails - "Backup file not found"

### Error Message:
```
Error: No backup file found. Run firebase-export.js first.
```

### Causes & Solutions:

**1. Export was never run or failed**

**Solution:**
```bash
# Run export first
node firebase-export.js

# Should create folder: firebase-backup-YYYY-MM-DD/
# Check it exists with dir/ls command
ls -la firebase-backup-*

# Try import again
node firebase-import.js
```

**2. Backup folder deleted or moved**

**Solution:**
```bash
# Look for backup folder
ls -la firebase-backup-*

# If found but in different location:
# Move it back to project root
mv /path/to/firebase-backup-2026-01-06 ./

# Try import again
node firebase-import.js
```

**3. Backup data is corrupted**

**Solution:**
```bash
# Check backup file integrity
cat firebase-backup-*/EXPORT_SUMMARY.json

# Should show user/order counts
# If file is empty or invalid, re-run export:
node firebase-export.js

# Make sure export completes with "Export completed successfully!"
```

---

## ❌ Users can't login after migration

### Error Message:
```
Incorrect password or user not found
```

### Causes & Solutions:

**1. User data exported but passwords aren't migrated**

**Problem:** Firebase Auth and Realtime Database are separate systems. User passwords are in Firebase Authentication, not the database.

**Solution:**
```bash
# Option 1: Use password reset feature
# 1. Go to login page
# 2. Click "Forgot Password?"
# 3. Enter email address
# 4. User gets reset email
# 5. User can set new password

# Option 2: Bulk password reset
# Create a script that:
# 1. Exports all user emails from backup
# 2. Triggers password reset for each
# 3. Notifies users

# Option 3: Manual recreation
# For small user base:
# 1. Export user emails and details
# 2. Manually create accounts in new Firebase Auth
# 3. Send reset emails to all users
```

**2. Firebase Auth not enabled in new project**

**Solution:**
```bash
# 1. Go to Firebase Console (new project)
# 2. Authentication → Get Started
# 3. Enable Email/Password provider
# 4. Make sure authentication is fully set up
```

**3. Database query not finding users**

**Solution:**
```bash
# Verify users exist in new database:
node check-users.js

# Should show users from new Firebase
# If no users shown:
# 1. Check import completed successfully
# 2. Verify import script didn't have errors
# 3. Check Firebase Console Realtime Database for users
```

---

## ❌ Old data not in new Firebase

### Error Message:
```
Check-users shows no data
```

### Causes & Solutions:

**1. Import script didn't complete successfully**

**Solution:**
```bash
# Check for previous import errors
# Look for messages like:
# "Error importing users"
# "Error importing orders"

# If there were errors:
# 1. Check Database Rules (should allow writes)
# 2. Check service account has permissions
# 3. Try import again: node firebase-import.js
```

**2. Import used old .env credentials**

**Problem:** Import script might have initialized with old credentials.

**Solution:**
```bash
# 1. Stop any running processes
# 2. Verify .env has NEW credentials (not old ones)
# 3. Run validate-firebase.js to confirm
# 4. Run import again
```

**3. Backup file is from old system or corrupted**

**Solution:**
```bash
# Check backup contents:
cat firebase-backup-*/EXPORT_SUMMARY.json

# Expected output:
# {
#   "exportDate": "...",
#   "projectId": "datasell-a3f57",  # Old project ID
#   "collections": {
#     "users": 500,
#     "orders": 1200,
#     ...
#   }
# }

# If projectId is wrong or counts are 0:
# 1. Delete bad backup: rm -rf firebase-backup-*
# 2. Make sure you're pointing to old Firebase
# 3. Re-run export: node firebase-export.js
```

---

## ❌ Server won't start after credential update

### Error Message:
```
Express server error: Cannot find module or Firebase initialization failed
```

### Causes & Solutions:

**1. .env file syntax error**

**Solution:**
```bash
# Common .env syntax issues:
# ❌ Missing quotes around multi-line values
FIREBASE_PRIVATE_KEY=-----BEGIN...

# ✅ Correct format
FIREBASE_PRIVATE_KEY="-----BEGIN...\n-----END..."

# ❌ Spaces around equals
FIREBASE_API_KEY = value

# ✅ Correct
FIREBASE_API_KEY=value

# Test .env validity:
node validate-firebase.js
```

**2. Server still using old credentials (cached)**

**Solution:**
```bash
# Kill all Node processes
# Windows:
taskkill /F /IM node.exe

# macOS/Linux:
pkill -f "node"

# Wait 2 seconds, then start server:
npm start
```

**3. Incomplete .env update**

**Solution:**
```bash
# Make sure ALL these are updated:
grep "FIREBASE_" .env | wc -l  # Should be 11 entries

# Should have:
# FIREBASE_API_KEY
# FIREBASE_AUTH_DOMAIN
# FIREBASE_DATABASE_URL
# FIREBASE_PROJECT_ID
# FIREBASE_STORAGE_BUCKET
# FIREBASE_MESSAGING_SENDER_ID
# FIREBASE_APP_ID
# FIREBASE_PRIVATE_KEY_ID
# FIREBASE_PRIVATE_KEY
# FIREBASE_CLIENT_EMAIL
# FIREBASE_CLIENT_ID
# FIREBASE_CLIENT_CERT_URL

# If any missing, add them from service account JSON
```

---

## ❌ Deployment fails after pushing new .env

### Error Message (in deployment logs):
```
Firebase initialization error at startup
```

### Causes & Solutions:

**1. Environment variables not updated on deployment platform**

**Solution:**
```bash
# For Render, Heroku, etc:
# 1. Go to deployment dashboard
# 2. Find "Environment Variables" or "Settings"
# 3. Update EACH Firebase variable:
#    - FIREBASE_PROJECT_ID
#    - FIREBASE_PRIVATE_KEY_ID
#    - FIREBASE_PRIVATE_KEY (entire multi-line value)
#    - FIREBASE_CLIENT_EMAIL
#    - FIREBASE_CLIENT_ID
#    - FIREBASE_AUTH_DOMAIN
#    - FIREBASE_DATABASE_URL
#    - FIREBASE_STORAGE_BUCKET
#    - FIREBASE_MESSAGING_SENDER_ID
#    - FIREBASE_APP_ID
#    - FIREBASE_CLIENT_CERT_URL
# 4. Save/Apply changes
# 5. Trigger redeploy
```

**2. .env file in repository (bad security)**

**Solution:**
```bash
# ❌ Never commit .env with credentials:
git status  # Check if .env is listed

# ✅ Should be in .gitignore:
cat .gitignore | grep "\.env"

# If not in .gitignore:
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push

# Use deployment platform's environment variables section instead
```

---

## ✅ How to Check Everything is Working

```bash
# 1. Validate all credentials
node validate-firebase.js

# 2. Check users exist
node check-users.js

# 3. Start server
npm start

# 4. In another terminal, test API
curl http://localhost:3000

# 5. Open browser
# http://localhost:3000/login
# Try logging in with existing account

# 6. Check browser console (F12) for errors
# Should see no red errors

# 7. Check server logs
# Should see: Firebase Admin initialized successfully
```

---

## 🆘 Still Having Issues?

### Gather debugging info:

```bash
# 1. Run validation
node validate-firebase.js > validation.log 2>&1

# 2. Run export
node firebase-export.js > export.log 2>&1

# 3. Run import
node firebase-import.js > import.log 2>&1

# 4. Try to start server
npm start > server.log 2>&1

# 5. Share these files:
# - validation.log
# - export.log
# - import.log
# - server.log
# - .env (with values masked)
```

### Quick checklist before asking for help:

- [ ] All FIREBASE_* variables in .env
- [ ] `.env` has proper formatting (quotes, newlines)
- [ ] `node validate-firebase.js` passes
- [ ] Backup file exists: `firebase-backup-*/complete-backup.json`
- [ ] New Firebase project created
- [ ] Realtime Database enabled
- [ ] Service account has proper permissions
- [ ] Database Rules published
- [ ] `npm start` runs without Firebase errors

---

## Contact & Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **Firebase Console:** https://console.firebase.google.com
- **Node.js Firebase Admin:** https://firebase.google.com/docs/database/admin/start
- **Troubleshooting:** https://firebase.google.com/support

---

*Last Updated: 2026-01-06*
*DataSell Firebase Migration Troubleshooting v1.0*
