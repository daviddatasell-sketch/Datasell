# 30-Minute Session Timeout - Quick Reference

## What Was Implemented

Your DataSell application now has **automatic session timeout after 30 minutes of inactivity**. This means:

✅ User logs in and opens the app  
✅ User can do whatever they want (purchase data, check wallet, view orders, etc.)  
✅ **If no activity for 30 minutes** → User is automatically logged out  
✅ Redirected to login page with message: "Session expired due to inactivity"

## Why This Matters

🔒 **Security**: If someone gets physical access to the phone while it's unlocked and open, they can't access the account indefinitely. After 30 minutes of no activity, they'll be logged out.

## User Experience

### Scenario 1: User is Active
```
12:00 PM - User logs in
12:05 PM - Clicks to buy data (activity resets timer)
12:10 PM - Checks wallet (timer resets)
12:15 PM - Completes purchase (timer resets)
→ Session stays active as long as user is doing something
```

### Scenario 2: User Steps Away
```
12:00 PM - User logs in and walks away
12:25 PM - Warning appears: "Session will expire in 5 minutes"
12:26 PM - User returns and clicks "Continue Session" → Timer resets
```

### Scenario 3: User Forgets (No Response)
```
12:00 PM - User logs in and walks away  
12:25 PM - Warning appears (unread)
12:30 PM - Timeout occurs → Auto-logout
12:31 PM - User picks up phone → Login page shown
→ User must log in again
```

## What Triggers Activity?
Any of these actions resets the 30-minute timer:
- 🖱️ Mouse clicks or movement
- ⌨️ Keyboard input (typing)
- 📱 Touch/swipe on mobile
- 📜 Page scrolling
- 🔄 Switching back to the app tab

## Testing It

To test the timeout feature:

1. **Log into the app**
2. **Wait 25 minutes** → You'll see a warning modal
3. **Options:**
   - Click **"Continue Session"** → Stay logged in (timer resets)
   - Click **"Logout Now"** → Immediate logout
   - Do nothing for 5 minutes → Auto-logout

*For faster testing, you can temporarily modify timeouts in the code, but remember to change them back!*

## Where Is This Implemented?

| Component | File | What It Does |
|-----------|------|--------------|
| **Server Logic** | `server.js` (lines 365-449) | Session cookie expires, inactivity detection |
| **Client Manager** | `public/js/session-timeout.js` | Activity tracking, warning modal, logout |
| **Warning Modal** | `public/css/session-timeout.css` | Beautiful timeout warning UI |
| **Integration** | `index.html`, `profile.html`, `wallet.html`, `orders.html`, `purchase.html` | Added script + stylesheet to all pages |

## Configuration

### Change the Timeout Duration

**In server.js (line 376):**
```javascript
maxAge: 30 * 60 * 1000 // Change 30 to any number of minutes
```

**In session-timeout.js (line 7):**
```javascript
this.timeoutDuration = options.timeoutDuration || 30 * 60 * 1000; // Change 30
```

**Example:** For 15 minutes instead of 30:
```javascript
maxAge: 15 * 60 * 1000  // 15 minutes
```

### Change Warning Time

**In session-timeout.js (line 8):**
```javascript
this.warningDuration = options.warningDuration || 5 * 60 * 1000; // Currently 5 min before
```

Change the `5` to show warning earlier/later. Example for 10 minutes before:
```javascript
this.warningDuration = 10 * 60 * 1000; // Warn 10 minutes before timeout
```

## Troubleshooting

### Warning not showing?
- Check browser console (F12) for errors
- Verify `session-timeout.css` is linked in the HTML
- Verify `session-timeout.js` is loaded at end of body

### Logout not working?
- Check server logs for session destruction errors
- Verify user has proper authentication
- Check browser cookies are enabled

### Timeout too short/long?
- Adjust `maxAge` in server.js
- Adjust `timeoutDuration` in session-timeout.js
- Remember: both must match!

## Additional Notes

- ⏱️ Timer is **per-user** (not shared across accounts)
- 🌐 Works across **all browsers and devices**
- 📱 Works on **mobile apps** accessing the web app
- 🔌 **No database changes** needed (uses existing session system)
- ⚠️ **Server-side timeout** still works even if JavaScript fails
- 📊 Session timeout events are **logged to console** for debugging

## For Imposter Security

This timeout feature specifically helps with your imposter situation:

1. **Old compromised account**: Can no longer be used indefinitely even if the imposter gets the phone
2. **New secure account**: Create a new account with secure password
3. **30-minute protection**: Even if compromised, access expires in 30 min of inactivity
4. **Datamart API key**: Once you get the new key, update your .env file

This gives you a strong security layer while you work on getting the new Datamart API key!

---

**Questions?** Check [SESSION_TIMEOUT_IMPLEMENTATION.md](SESSION_TIMEOUT_IMPLEMENTATION.md) for detailed technical documentation.
