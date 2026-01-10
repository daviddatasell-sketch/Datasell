# 🔐 Firebase Account Migration Guide - DataSell

## Overview
This guide walks you through migrating your DataSell application from the compromised Firebase account to a new secure Firebase account, including all user data, orders, and application state.

---

## Phase 1: Pre-Migration Setup

### Step 1: Create a New Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a new project"**
3. Name it something like `datasell-new` or `datasell-secure`
4. Follow the setup wizard to enable:
   - ✅ Realtime Database
   - ✅ Authentication
   - ✅ Storage
   - ✅ Cloud Messaging (for notifications)

### Step 2: Get New Firebase Credentials

#### For Realtime Database Admin Access:
1. In Firebase Console, go to your new project
2. Click **Settings** (⚙️) → **Project Settings**
3. Go to **Service Accounts** tab
4. Click **Generate New Private Key** (Node.js)
5. This downloads a JSON file with your new credentials
6. Keep this file safe and secure

#### For Web API Keys:
1. Still in Project Settings
2. Go to **General** tab
3. Scroll down to find your **Web API Key** and other config values

### Step 3: Backup Current Data

Run the export script to backup all your current data:

```bash
node firebase-export.js
```

This will:
- ✅ Export all users with credentials
- ✅ Export all orders
- ✅ Export all transactions
- ✅ Export all packages/products
- ✅ Export wallets and balances
- ✅ Export admin data
- ✅ Export sessions
- ✅ Export support tickets
- ✅ Export notifications
- ✅ Export statistics

**Output:** A backup folder `firebase-backup-YYYY-MM-DD/` with:
- `complete-backup.json` - Full database dump
- `collections/` - Individual collection files
- `EXPORT_SUMMARY.json` - Summary of what was exported

---

## Phase 2: Update Credentials

### Step 1: Update `.env` File

Replace your current Firebase credentials with the new ones. From the JSON file you downloaded:

```env
# NEW Firebase Configuration
FIREBASE_API_KEY=<new_api_key>
FIREBASE_AUTH_DOMAIN=<new_project>.firebaseapp.com
FIREBASE_DATABASE_URL=https://<new_project>-default-rtdb.<region>.firebasedatabase.app
FIREBASE_PROJECT_ID=<new_project_id>
FIREBASE_STORAGE_BUCKET=<new_project>.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=<new_sender_id>
FIREBASE_APP_ID=<new_app_id>

# NEW Firebase Service Account
FIREBASE_PRIVATE_KEY_ID=<from_service_account_json>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=<from_service_account_json>
FIREBASE_CLIENT_ID=<from_service_account_json>
FIREBASE_CLIENT_CERT_URL=<from_service_account_json>
```

**Important Notes:**
- Replace ALL Firebase-related variables
- Keep the `FIREBASE_PRIVATE_KEY` formatted exactly as shown (with `\n` for newlines)
- Do NOT change any other configuration variables

### Step 2: Verify `.env` Format

The new `.env` should have all the same variables as the old one, just with different values. You can copy the structure and replace values.

---

## Phase 3: Data Migration

### Step 1: Configure New Firebase Rules

Before importing data, set up Realtime Database Rules. In Firebase Console:

1. Go to **Realtime Database** → **Rules**
2. Replace the default rules with rules from your `firebase.rules.json`
3. Click **Publish**

### Step 2: Run Import Script

With the new credentials in `.env`, run:

```bash
node firebase-import.js
```

This will:
- ✅ Connect to the NEW Firebase database
- ✅ Import all users
- ✅ Import all orders
- ✅ Import all transactions
- ✅ Import all wallets
- ✅ Import all other data
- ✅ Preserve all relationships and data integrity

**Expected Output:**
```
✅ Imported 500 users records
✅ Imported 1200 orders records
✅ Imported 2500 transactions records
...
```

---

## Phase 4: Update Application Code

The following files use Firebase credentials and need verification:

### Core Files That Reference Firebase:

1. **`server.js`** - Main server file
   - Uses `admin.initializeApp()` with environment variables
   - Uses `admin.database()` for data access
   - **No code changes needed** if `.env` is updated correctly

2. **`check-users.js`** - User verification utility
   - **No code changes needed**

3. **`restore-admin.js`** - Admin restoration utility
   - **No code changes needed**

4. **`restore-admin-simple.js`** - Simple admin restore
   - **No code changes needed**

5. **`android-wrapper/server.js`** - Mobile wrapper server
   - **No code changes needed**

### Frontend Files (if using Firebase SDK):

Check if these use hardcoded credentials:
- `public/firebase-messaging-sw.js` - Service worker
- `public/sw.js` - Service worker
- Any HTML files with Firebase initialization

Update Firebase config in these files if they directly import the API key.

---

## Phase 5: Testing

### Step 1: Test Backend Connection

```bash
node check-users.js
```

Should show user data from the new Firebase account.

### Step 2: Test Server Startup

```bash
npm start
```

or 

```bash
node server.js
```

Check logs for:
- ✅ `Firebase Admin initialized successfully`
- ✅ `Email service ready`
- ✅ Server listening on port 3000

### Step 3: Test Key Features

1. **User Login** - Try logging in with existing credentials
2. **User Signup** - Create a test account
3. **Orders** - Place a test order
4. **Transactions** - Check transaction history
5. **Admin Panel** - Login and verify admin access
6. **Notifications** - Test notification system
7. **Wallet** - Check wallet balance

### Step 4: Verify Data Integrity

Run this to verify all data matches backup:

```javascript
// Quick verification script
const admin = require('firebase-admin');
require('dotenv').config();

// ... initialize admin ...

const db = admin.database();

async function verify() {
  const users = await db.ref('users').once('value');
  const orders = await db.ref('orders').once('value');
  
  console.log('Users:', Object.keys(users.val() || {}).length);
  console.log('Orders:', Object.keys(orders.val() || {}).length);
}

verify();
```

---

## Phase 6: Security Hardening

### Step 1: Disable Old Project Access

1. Go to Firebase Console
2. Select the **OLD project**
3. Go to **Project Settings** → **Locations**
4. Consider disabling or deleting the old project after 30 days

### Step 2: Secure Your Credentials

1. **Never commit `.env` to Git** - Already have `.gitignore`?
2. **Rotate admin password** - Update `ADMIN_PASSWORD` in `.env`
3. **Enable Firebase Authentication** - Enable in new project
4. **Review IAM Permissions** - Limit who can access the Firebase project

### Step 3: Monitor Access

1. In new Firebase project, enable **Realtime Database Logging**
2. Check **Activity logs** for any suspicious access
3. Set up alerts for unusual activity

---

## Phase 7: Deployment

### Step 1: Update Environment Variables

On your deployment platform (Render, etc.):

1. Go to your app settings
2. Update all `FIREBASE_*` environment variables
3. Make sure to update:
   - All API keys
   - Database URL
   - Service account credentials

### Step 2: Rebuild and Deploy

```bash
# If using Git
git add .env  # (or update in deployment platform)
git commit -m "Update Firebase credentials to new secure account"
git push
```

Your deployment platform will automatically rebuild with new credentials.

### Step 3: Verify Production

1. Wait for deployment to complete
2. Test login at production URL
3. Check application logs for errors
4. Monitor for 24 hours

---

## Troubleshooting

### Issue: "Firebase initialization failed"
**Solution:** Check that all `FIREBASE_*` variables are correctly set in `.env`

### Issue: "Permission denied" when importing data
**Solution:** 
1. Verify new Firebase Rules are published
2. Check that service account has correct permissions
3. Try importing smaller collections first

### Issue: "Users can't login"
**Solution:** Users are still in the old Firebase Auth. You need to:
1. Export user credentials from old account
2. Recreate users in new Authentication system
3. Or use manual password reset for all users

### Issue: "Realtime Database connection timeout"
**Solution:**
1. Verify `FIREBASE_DATABASE_URL` is correct
2. Check Firebase Console for any alerts
3. Ensure region matches

### Issue: "Old data not appearing in new database"
**Solution:**
1. Check `EXPORT_SUMMARY.json` to see what was exported
2. Run `firebase-import.js` again
3. Verify the backup file exists and has data

---

## Quick Reference: Files to Update

| File | Update Method | Status |
|------|---------------|--------|
| `.env` | Edit directly | ✅ Manual |
| `server.js` | No changes needed | ✅ Auto |
| `check-users.js` | No changes needed | ✅ Auto |
| `restore-admin.js` | No changes needed | ✅ Auto |
| `firebase-messaging-sw.js` | Check & update API key | ⚠️ Check |
| `firebase.json` | Update project ID | ⚠️ Check |
| `render.yaml` | Update environment vars | ⚠️ Check |

---

## Rollback Plan

If something goes wrong:

1. **Keep the old Firebase project for 30 days**
2. **Have the backup file saved securely**
3. **If needed**, revert `.env` to old credentials:
   ```bash
   git checkout HEAD -- .env
   npm start
   ```
4. **Report issues** and we can troubleshoot

---

## Checklist for Completion

- [ ] New Firebase project created
- [ ] Service account JSON downloaded
- [ ] Database backup exported successfully
- [ ] `.env` file updated with new credentials
- [ ] Firebase Rules published to new project
- [ ] Data imported successfully
- [ ] Backend tests passed
- [ ] Frontend login tested
- [ ] Admin panel verified
- [ ] Key features tested
- [ ] Deployed to production
- [ ] Production verified working
- [ ] Old project access disabled/monitored
- [ ] Team notified of change

---

## Support

If you encounter issues:

1. Check the logs: `node server.js` should show detailed errors
2. Verify credentials in `.env` match the JSON file
3. Check that all required fields are present
4. Ensure database rules allow read/write operations

---

## Summary

**Before Migration:**
- 🔓 Old Firebase account potentially compromised
- ⚠️ Security risk for all user data

**After Migration:**
- ✅ New secure Firebase account
- ✅ All user data migrated
- ✅ New credentials in place
- ✅ Old account can be disabled
- ✅ Full audit trail available

**Total Time:** ~2-3 hours (depending on data size)

---

*Last Updated: 2026-01-06*
*DataSell Firebase Migration Guide v1.0*
