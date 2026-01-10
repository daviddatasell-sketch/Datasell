# Session Timeout Implementation - 30 Minutes Inactivity

## Overview
Added automatic session timeout after **30 minutes of inactivity** for enhanced security. When a user is inactive (no mouse clicks, keyboard input, scrolling, or touch), they will be automatically logged out and returned to the login page.

## Features

### 1. **Server-Side Session Timeout** (server.js)
- **Cookie Expiration**: Session cookie set to expire after 30 minutes of inactivity
- **Rolling Expiration**: Cookie is reset on each user request (rolling window)
- **Inactivity Middleware**: Custom middleware that:
  - Tracks last activity timestamp
  - Calculates inactivity duration
  - Automatically destroys session if 30 minutes exceeded
  - Returns 401 error with `SESSION_TIMEOUT` code to client

### 2. **Client-Side Session Manager** (session-timeout.js)
Comprehensive JavaScript class that handles:

#### Activity Tracking
- Monitors user interactions: mouse, keyboard, scroll, touch, click
- Tab visibility changes (detects when user switches tabs)
- Automatically resets timeout on any user activity

#### Warning System
- Shows warning modal **5 minutes before timeout** (25 minutes into session)
- Animated warning with clock icon
- User can click "Continue Session" to reset timeout
- Or click "Logout Now" to end session immediately
- Warning automatically closes if user becomes active again

#### Automatic Logout
- After 30 minutes of complete inactivity, user is logged out
- Session is destroyed server-side
- User redirected to `/login` page
- Optional message displayed on login page

#### Error Handling
- Gracefully handles API failures
- Falls back to redirect if logout API unavailable
- Catches and logs errors for debugging

### 3. **Warning Modal Styling** (session-timeout.css)
Beautiful, responsive warning modal with:
- Animated pulse icon
- Clear warning message
- Two action buttons (Continue / Logout)
- Mobile responsive design
- Accessibility features (reduced motion, high contrast support)
- Full-screen overlay to prevent accidental clicks

## Files Modified/Created

### New Files:
1. **public/js/session-timeout.js** - Session timeout manager class
2. **public/css/session-timeout.css** - Warning modal styles

### Modified Files:
1. **server.js**
   - Updated session configuration: 30-minute timeout with rolling expiration
   - Added inactivity detection middleware (lines 409-449)

2. **public/index.html**
   - Added CSS link: `<link rel="stylesheet" href="/css/session-timeout.css">`
   - Added script: `<script src="/js/session-timeout.js"></script>`

3. **public/profile.html**
   - Added CSS and script tags

4. **public/wallet.html**
   - Added CSS and script tags

5. **public/orders.html**
   - Added CSS and script tags

6. **public/purchase.html**
   - Added CSS and script tags

## How It Works

### Timeline:
1. **0-25 minutes**: User is active and logged in
   - Any activity resets the 30-minute counter
   - No warning shown

2. **25 minutes**: Warning shown
   - User sees modal with 5-minute warning
   - Can click "Continue" to stay logged in
   - Can click "Logout" to end session

3. **30 minutes**: Automatic logout
   - Session destroyed server-side
   - User redirected to login page
   - Message displayed: "Session expired due to inactivity"

### Activity Events Monitored:
- Mouse movement/clicks
- Keyboard input
- Page scrolling
- Touch screen input
- Tab/window focus changes

## Security Benefits

✅ **Protection Against Unauthorized Access**
- If someone steals/accesses the phone while unlocked and idle
- Session will auto-terminate after 30 minutes of non-use
- Original user can reclaim account by logging in

✅ **Reduced Session Hijacking Risk**
- Limits exposure time of session cookies
- Automatic cleanup of inactive sessions

✅ **Compliance**
- Meets security best practices
- Similar to banking/financial apps

## Configuration

To adjust timeout duration, modify in **server.js** and **session-timeout.js**:

### Server-side (server.js):
```javascript
maxAge: 30 * 60 * 1000 // Change 30 to desired minutes
```

### Client-side (session-timeout.js):
```javascript
constructor(options = {}) {
    this.timeoutDuration = options.timeoutDuration || 30 * 60 * 1000; // 30 minutes
    this.warningDuration = options.warningDuration || 5 * 60 * 1000; // 5 minutes before
}
```

## Testing

### Manual Testing:
1. Login to application
2. Wait 25 minutes → Warning modal appears
3. Options:
   - **Click "Continue"** → Timeout resets, session continues
   - **Click "Logout"** → Immediate logout to login page
   - **Do nothing for 5 mins** → Auto-logout occurs
4. Any activity (mouse/keyboard) → Warning closes, timer resets

### API Testing:
```bash
# Test inactivity timeout
curl -X GET http://localhost:3000/api/profile \
  -H "Cookie: datasell.sid=<expired_session>" \
  
# Response: 401 Unauthorized with SESSION_TIMEOUT code
```

## Browser Compatibility

✅ Works in all modern browsers:
- Chrome/Edge (88+)
- Firefox (85+)
- Safari (14+)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- Session timeout is per-user (not global)
- Each active session has independent 30-minute timer
- Timer is shared between browser tabs (via session)
- Works offline: Once timeout threshold is reached, page will handle it
- Graceful degradation: If JavaScript fails, server-side timeout still protects session

## Future Enhancements

Possible improvements:
- Configurable timeout via admin dashboard
- Different timeouts for mobile vs desktop
- Option to extend session before logout
- Audit log of auto-logouts
- Different timeouts for different user roles
