# 🚀 Firebase Migration - Quick Start

## TL;DR - 5 Minute Summary

Your Firebase account is compromised. Here's what to do:

### 1. **Export Current Data** (5 mins)
```bash
node firebase-export.js
```
Creates backup folder: `firebase-backup-2026-01-06/`

### 2. **Create New Firebase Project** (10 mins on Firebase Console)
- Go to https://console.firebase.google.com/
- Create new project
- Get service account JSON (Settings → Service Accounts → Generate Key)

### 3. **Update `.env` File** (2 mins)
Replace all `FIREBASE_*` variables with values from new service account JSON:
```env
FIREBASE_API_KEY=<new_value>
FIREBASE_AUTH_DOMAIN=<new_value>
FIREBASE_DATABASE_URL=<new_value>
FIREBASE_PROJECT_ID=<new_value>
FIREBASE_STORAGE_BUCKET=<new_value>
FIREBASE_MESSAGING_SENDER_ID=<new_value>
FIREBASE_APP_ID=<new_value>
FIREBASE_PRIVATE_KEY_ID=<new_value>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=<new_value>
FIREBASE_CLIENT_ID=<new_value>
FIREBASE_CLIENT_CERT_URL=<new_value>
```

### 4. **Import Data to New Project** (5 mins)
```bash
node firebase-import.js
```

### 5. **Test Everything** (10 mins)
```bash
node check-users.js        # Verify users exist
npm start                  # Start server
```

Test login, orders, admin panel in browser.

### 6. **Deploy** (5 mins)
Push updated `.env` to your deployment platform.

---

## What Gets Migrated

✅ All users (login credentials, profiles, addresses)
✅ All orders (history, status, items)
✅ All transactions (payments, refunds)
✅ All wallets (balances, history)
✅ All packages/products
✅ Admin data
✅ Support tickets
✅ Notifications
✅ Application statistics

---

## What Doesn't Need to Change

✅ All application code (uses .env variables)
✅ Database structure (same format)
✅ Ports and URLs
✅ Authentication logic
✅ Order processing logic
✅ Payment integration (Paystack)

---

## Key Files Created

1. **`firebase-export.js`** - Exports all data from old account
2. **`firebase-import.js`** - Imports all data to new account  
3. **`FIREBASE_MIGRATION_GUIDE.md`** - Detailed step-by-step guide
4. **`firebase-backup-YYYY-MM-DD/`** - Your complete data backup

---

## Important Notes

⚠️ **DO NOT:**
- Commit `.env` to Git
- Share the private key publicly
- Forget to update deployment platform variables

✅ **DO:**
- Keep the backup folder safe
- Test thoroughly before going live
- Give it 24 hours to verify in production
- Monitor application logs

---

## Get Help

If something fails:

1. Check that `.env` has ALL the new credentials
2. Verify Realtime Database is enabled in new Firebase project
3. Run `node check-users.js` to test connection
4. Check error messages carefully (usually credential issues)

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| Export data | 5 min | ✅ Ready |
| Create new Firebase | 10 min | 📋 Your turn |
| Update .env | 2 min | 📋 Your turn |
| Import data | 5 min | ✅ Ready |
| Test locally | 10 min | ✅ Ready |
| Deploy | 5 min | ✅ Ready |
| **Total** | **~40 mins** | |

---

## After Migration Success

1. ✅ Data is safe in new account
2. ✅ Old account can be disabled
3. ✅ All users retain their data
4. ✅ No downtime required
5. ✅ Security improved

---

For detailed instructions, see: **`FIREBASE_MIGRATION_GUIDE.md`**
