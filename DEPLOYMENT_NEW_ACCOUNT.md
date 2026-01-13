# DataSell Deployment Guide - New GitHub & Render Account

## New Repository Details
- **GitHub Repo**: https://github.com/daviddatasell-sketch/Datasell
- **Account**: daviddatasell-sketch (new)
- **Deployment**: Render (new account)

---

## Step 1: Push Current Code to New GitHub Repository

### 1.1 Initialize Git (if not already done)
```powershell
cd C:\Users\HEDGEHOG\Downloads\DataSell-main
git init
```

### 1.2 Add new GitHub repository as remote
```powershell
git remote add origin https://github.com/daviddatasell-sketch/Datasell.git
```

### 1.3 Configure Git (if needed)
```powershell
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

### 1.4 Add all files
```powershell
git add .
```

### 1.5 Create initial commit
```powershell
git commit -m "Initial commit - DataSell application with Firebase Auth enabled"
```

### 1.6 Push to GitHub
```powershell
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Render Deployment

### 2.1 Create New Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Select **GitHub** as the repository source
4. Authorize Render to access your GitHub account
5. Select repository: `daviddatasell-sketch/Datasell`
6. Select branch: `main`

### 2.2 Configure Web Service Settings
**Name**: `datasell` (or your preferred name)

**Runtime**: Node

**Build Command**:
```
npm install
```

**Start Command**:
```
node server.js
```

### 2.3 Set Environment Variables
Click **Environment** and add these variables:

```
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=datasell-7b993
FIREBASE_PRIVATE_KEY_ID=<your-private-key-id>
FIREBASE_PRIVATE_KEY=<your-private-key>
FIREBASE_CLIENT_EMAIL=<your-service-account-email>
FIREBASE_CLIENT_ID=<your-client-id>
FIREBASE_DATABASE_URL=https://datasell-7b993-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_CLIENT_CERT_URL=<your-cert-url>

# Admin Credentials
ADMIN_EMAIL=fotsiemmanuel397@gmail.com
ADMIN_PASSWORD=<your-secure-password>

# Paystack Configuration
PAYSTACK_SECRET_KEY=<your-paystack-secret>
PAYSTACK_PUBLIC_KEY=<your-paystack-public>

# Email Configuration (if using Nodemailer)
EMAIL_USER=<your-email>
EMAIL_PASSWORD=<your-email-password>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### 2.4 Deploy
1. Click **Create Web Service**
2. Render will automatically deploy when you push to GitHub
3. Monitor deployment in the **Logs** tab

---

## Step 3: Verify Deployment

Once deployed, your app will be available at:
```
https://datasell-<random-name>.onrender.com
```

### Test the deployment:
1. Visit `/login` page
2. Test signup with a valid phone number
3. Test login with credentials
4. Check that all features work

---

## Step 4: Set Up Auto-Deploy

Render automatically deploys when you push to `main` branch. To deploy new changes:

```powershell
# Make your changes
git add .
git commit -m "Your commit message"
git push origin main
```

Render will automatically:
1. Detect the push
2. Run `npm install`
3. Run `node server.js`
4. Deploy the new version

---

## Important Notes

### ⚠️ Security
- **Never commit `.env` file** - Use Render's environment variables instead
- Keep private keys secure in Render dashboard only
- Rotate admin password regularly

### 📊 Database
- All user data stays in Firebase Realtime Database
- Render is just the application server
- Database is shared across all deployments

### 🔄 Continuous Deployment
- Every push to `main` triggers a new deployment
- Check Render dashboard for deployment status
- Logs are available in Render dashboard

### 🚀 Performance
- Render may "spin down" inactive apps after 15 minutes (free tier)
- First request might be slow after inactivity
- Pro tier keeps apps running 24/7

---

## Troubleshooting

### Deployment Fails
1. Check **Logs** tab in Render
2. Verify all environment variables are set
3. Ensure `package.json` has correct start command
4. Check that Firebase credentials are valid

### App Crashes After Deploy
1. Check Render logs for error messages
2. Verify `.env` variables match what was in old Render
3. Test locally first: `node server.js`
4. Check Firebase connection

### Database Connection Issues
1. Verify `FIREBASE_DATABASE_URL` is correct
2. Check Firebase Realtime Database is accessible
3. Ensure service account has read/write permissions
4. Test connection locally

---

## Next Steps

1. ✅ Push code to new GitHub repo
2. ✅ Create Render web service
3. ✅ Set environment variables
4. ✅ Deploy and test
5. ✅ Update DNS if you have a domain
6. ✅ Monitor logs and performance

---

## GitHub & Render Links

- **GitHub Repository**: https://github.com/daviddatasell-sketch/Datasell
- **Render Dashboard**: https://dashboard.render.com
- **Firebase Console**: https://console.firebase.google.com

---

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render web service created
- [ ] All environment variables set
- [ ] Deployment successful
- [ ] Login page loads
- [ ] Signup works
- [ ] Database operations work
- [ ] Wallet system works
- [ ] Payment processing works
- [ ] Admin panel works

---

Generated: 2026-01-06
Updated for: New GitHub Account (daviddatasell-sketch) & New Render Account
