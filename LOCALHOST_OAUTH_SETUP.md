# Localhost Google OAuth Setup

## The Issue
You're getting `Error 400: redirect_uri_mismatch` because Google Cloud Console doesn't have the localhost redirect URI registered.

## Solution: Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **datasell-7b993**
3. Navigate to **APIs & Services → Credentials**
4. Click on your OAuth 2.0 Client ID (Desktop application)
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/auth/google/callback`

6. Click **Save**

## Your Complete Redirect URIs Should Be:
- ✅ `http://localhost:3000/auth/google/callback` (for local testing)
- ✅ `https://datasell.store/auth/google/callback` (for production)

## After Adding

1. Wait 1-2 minutes for changes to propagate
2. Hard refresh your browser: **Ctrl + Shift + R**
3. Try clicking "Continue with Google" again at http://localhost:3000/login

## Deploying Back to datasell.store

Once localhost works and you're ready to deploy to production, you only need to change:
- `BASE_URL` in `.env` from `http://localhost:3000` to `https://datasell.store`
- `NODE_ENV` from `development` to `production`

The OAuth callback path `/auth/google/callback` stays the same in the code.
