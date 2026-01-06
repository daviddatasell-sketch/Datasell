# ✅ Firebase Migration Checklist

## Phase 1: Preparation ✅

- [ ] **Backup current data**
  ```bash
  node firebase-export.js
  ```
  - [ ] Backup folder created: `firebase-backup-YYYY-MM-DD/`
  - [ ] `complete-backup.json` exists
  - [ ] `EXPORT_SUMMARY.json` shows data counts
  - [ ] Keep backup in safe location (USB, cloud, etc.)

- [ ] **Notify stakeholders**
  - [ ] Team informed of migration
  - [ ] Users warned about any potential downtime
  - [ ] Support team ready to handle issues

---

## Phase 2: New Firebase Project Setup ✅

- [ ] **Create new Firebase project**
  - [ ] Go to https://console.firebase.google.com/
  - [ ] Click "Create a new project"
  - [ ] Name it (e.g., `datasell-secure-2026`)
  - [ ] Enable Google Analytics (optional)
  - [ ] Complete setup

- [ ] **Enable required services**
  - [ ] Realtime Database
  - [ ] Authentication
  - [ ] Cloud Storage
  - [ ] Cloud Messaging (if using notifications)

- [ ] **Get credentials**
  - [ ] Go to Settings ⚙️ → Service Accounts
  - [ ] Click "Generate New Private Key" (Node.js)
  - [ ] Save JSON file securely
  - [ ] Extract Web API credentials from General tab

---

## Phase 3: Credential Update ✅

- [ ] **Update `.env` file**
  - [ ] Open `.env` in editor
  - [ ] Replace `FIREBASE_PROJECT_ID`
  - [ ] Replace `FIREBASE_PRIVATE_KEY_ID`
  - [ ] Replace `FIREBASE_PRIVATE_KEY` (multi-line)
  - [ ] Replace `FIREBASE_CLIENT_EMAIL`
  - [ ] Replace `FIREBASE_CLIENT_ID`
  - [ ] Replace `FIREBASE_AUTH_DOMAIN`
  - [ ] Replace `FIREBASE_DATABASE_URL`
  - [ ] Replace `FIREBASE_STORAGE_BUCKET`
  - [ ] Replace `FIREBASE_MESSAGING_SENDER_ID`
  - [ ] Replace `FIREBASE_APP_ID`
  - [ ] Replace `FIREBASE_CLIENT_CERT_URL`

- [ ] **Validate credentials**
  ```bash
  node validate-firebase.js
  ```
  - [ ] All environment variables shown as present
  - [ ] Connected to Realtime Database
  - [ ] Database structure confirmed

---

## Phase 4: Firebase Configuration ✅

- [ ] **Set up Realtime Database Rules**
  - [ ] Go to Firebase Console → Realtime Database
  - [ ] Click "Rules" tab
  - [ ] Copy rules from `firebase.rules.json`
  - [ ] Paste into Rules editor
  - [ ] Click "Publish"
  - [ ] Verify published status

- [ ] **Configure authentication**
  - [ ] Go to Authentication section
  - [ ] Enable Email/Password auth
  - [ ] Verify email settings if needed

- [ ] **Configure Storage (if needed)**
  - [ ] Go to Storage section
  - [ ] Create rules if using file uploads

---

## Phase 5: Data Migration ✅

- [ ] **Prepare for import**
  - [ ] Backup file exists and verified
  - [ ] `.env` updated with new credentials
  - [ ] Firebase Rules published
  - [ ] Database is empty (no conflicting data)

- [ ] **Run import script**
  ```bash
  node firebase-import.js
  ```
  - [ ] Process completes without errors
  - [ ] All collections imported successfully
  - [ ] Check import output:
    - [ ] Users imported: _____ records
    - [ ] Orders imported: _____ records
    - [ ] Transactions imported: _____ records
    - [ ] Wallets imported: _____ records
    - [ ] Other collections imported

- [ ] **Verify imported data**
  - [ ] Check Firebase Console
  - [ ] Expand collections in Realtime Database
  - [ ] Spot-check a few records

---

## Phase 6: Testing ✅

### Local Testing

- [ ] **Test user verification**
  ```bash
  node check-users.js
  ```
  - [ ] Shows users from new database
  - [ ] User count matches EXPORT_SUMMARY

- [ ] **Start server**
  ```bash
  npm start
  ```
  - [ ] No Firebase errors in console
  - [ ] "Firebase Admin initialized successfully" appears
  - [ ] Server listens on port 3000
  - [ ] Email service connects

- [ ] **Test authentication**
  - [ ] Open http://localhost:3000
  - [ ] Try login with existing account
  - [ ] Verify user data loads correctly
  - [ ] Test user profile loads

- [ ] **Test key features**
  - [ ] Can create new account (signup)
  - [ ] Can login/logout
  - [ ] Can view orders
  - [ ] Can place new order
  - [ ] Can view transactions
  - [ ] Can access wallet
  - [ ] Can view notifications

- [ ] **Test admin panel**
  - [ ] Navigate to admin login
  - [ ] Login with admin credentials (from .env)
  - [ ] View admin dashboard
  - [ ] Can access user data
  - [ ] Can view orders

- [ ] **Check database operations**
  - [ ] New user created appears in Firebase
  - [ ] New order appears in Firebase
  - [ ] Transactions recorded correctly
  - [ ] Sessions stored properly

---

## Phase 7: Pre-Production Verification ✅

- [ ] **No hardcoded credentials**
  - [ ] Search for old Firebase API keys in code
  - [ ] Search for old project ID in code
  - [ ] All config uses environment variables

- [ ] **Frontend files updated**
  - [ ] `public/firebase-messaging-sw.js` uses .env values
  - [ ] `public/sw.js` configured correctly
  - [ ] No hardcoded API keys in HTML

- [ ] **Dependencies check**
  ```bash
  npm list firebase firebase-admin
  ```
  - [ ] Versions are current
  - [ ] No conflicting versions

- [ ] **Environment variables verified**
  - [ ] `.env.example` updated (if exists)
  - [ ] All required vars documented
  - [ ] `.gitignore` includes `.env`

---

## Phase 8: Production Deployment ✅

- [ ] **Update deployment platform**
  - [ ] Go to deployment provider (Render, etc.)
  - [ ] Navigate to app settings/environment
  - [ ] Update each `FIREBASE_*` variable:
    - [ ] FIREBASE_PROJECT_ID
    - [ ] FIREBASE_PRIVATE_KEY_ID
    - [ ] FIREBASE_PRIVATE_KEY
    - [ ] FIREBASE_CLIENT_EMAIL
    - [ ] FIREBASE_CLIENT_ID
    - [ ] FIREBASE_AUTH_DOMAIN
    - [ ] FIREBASE_DATABASE_URL
    - [ ] FIREBASE_STORAGE_BUCKET
    - [ ] FIREBASE_MESSAGING_SENDER_ID
    - [ ] FIREBASE_APP_ID
    - [ ] FIREBASE_CLIENT_CERT_URL

- [ ] **Commit changes**
  ```bash
  git add -A
  git commit -m "Update Firebase credentials to new secure account"
  git push origin main
  ```
  - [ ] Changes pushed to repository
  - [ ] Deployment initiated automatically

- [ ] **Monitor deployment**
  - [ ] Build process completes successfully
  - [ ] Deployment shows as active
  - [ ] No error messages in logs
  - [ ] Application starts correctly

---

## Phase 9: Post-Deployment Verification ✅

- [ ] **Test production access**
  - [ ] Visit production URL
  - [ ] Test login with existing account
  - [ ] Verify data loads correctly
  - [ ] No error messages in browser console

- [ ] **Monitor for 24 hours**
  - [ ] Check application logs regularly
  - [ ] Monitor error reports
  - [ ] Watch for user complaints
  - [ ] Verify notifications working

- [ ] **Test critical flows**
  - [ ] User signup works
  - [ ] User login works
  - [ ] Orders can be placed
  - [ ] Payments processed
  - [ ] Notifications sent
  - [ ] Admin panel accessible

- [ ] **Performance check**
  - [ ] Application response times normal
  - [ ] Database queries performant
  - [ ] No timeouts or slow requests

---

## Phase 10: Security Hardening ✅

- [ ] **Disable old Firebase project**
  - [ ] Go to Firebase Console
  - [ ] Select old project
  - [ ] Go to Settings
  - [ ] Note: Don't immediately delete, keep for 30 days
  - [ ] Plan deletion after verification period

- [ ] **Audit Firebase Rules**
  - [ ] Verify least-privilege access
  - [ ] Check authentication requirements
  - [ ] Ensure data is properly protected

- [ ] **Update security policies**
  - [ ] Document new project information
  - [ ] Update security documentation
  - [ ] Inform team of new credentials storage

- [ ] **Enable monitoring**
  - [ ] Set up Firebase logging
  - [ ] Configure alerts for suspicious activity
  - [ ] Monitor API usage

- [ ] **Rotate admin password**
  - [ ] Change `ADMIN_PASSWORD` in .env
  - [ ] Update on deployment platform
  - [ ] Notify admin users of new password

---

## Phase 11: Documentation ✅

- [ ] **Document new project details**
  - [ ] Record new Project ID
  - [ ] Save new Service Account location
  - [ ] Document migration date and time
  - [ ] Note any data discrepancies

- [ ] **Update team documentation**
  - [ ] README updated with new project info
  - [ ] Team wiki updated
  - [ ] Support docs updated if needed
  - [ ] Runbook updated for future migrations

- [ ] **Archive old documentation**
  - [ ] Save old project credentials in secure location
  - [ ] Keep backup of old documentation
  - [ ] Archive for compliance/audit

---

## Phase 12: Post-Migration Tasks ✅

- [ ] **Communicate completion**
  - [ ] Notify all stakeholders
  - [ ] Share success metrics
  - [ ] Thank team for support
  - [ ] Update project status

- [ ] **Schedule old project deletion**
  - [ ] Set calendar reminder for 30 days later
  - [ ] Plan safe deletion process
  - [ ] Verify no dependencies on old project

- [ ] **Plan backup strategy**
  - [ ] Set up regular Firebase backups
  - [ ] Document backup procedure
  - [ ] Test restore process

- [ ] **Review and learn**
  - [ ] Document any issues encountered
  - [ ] Note what went well
  - [ ] Update migration guide for next time
  - [ ] Share lessons learned with team

---

## Emergency Contacts

- **Firebase Support:** https://firebase.google.com/support
- **Project Owner:** _________________
- **Backup Location:** _________________
- **Old Project Credentials:** _________________

---

## Sign-Off

- [ ] **Technical Lead Review**
  - Name: _________________
  - Date: _________________
  - Signature: _________________

- [ ] **Project Manager Approval**
  - Name: _________________
  - Date: _________________
  - Signature: _________________

---

## Notes

Use this space for any observations, issues, or additional information:

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Migration Status:** 🔄 In Progress / ✅ Complete / ❌ Rolled Back

**Start Date:** _______________
**Completion Date:** _______________
**Total Duration:** _______________

---

*Keep this checklist for compliance and audit purposes*
