require('dotenv').config();

// Log startup immediately
console.log('═══════════════════════════════════════════════════════════');
console.log('🔥 DATASELL SERVER STARTUP - VERSION 1.0.1');
console.log('═══════════════════════════════════════════════════════════');
console.log(`⏰ Time: ${new Date().toISOString()}`);
console.log(`📝 Node Version: ${process.version}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('🔴 NOTE: DATAMART SYNC IS DISABLED FOR STABILITY');
console.log('═══════════════════════════════════════════════════════════\n');

// Check required environment variables
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_CLIENT_CERT_URL'
];

console.log('🔍 Checking environment variables...');
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
  console.warn('⚠️  WARNING: Missing environment variables:', missingVars);
  console.warn('ℹ️  Make sure these are set in Render dashboard under Environment settings');
} else {
  console.log('✅ All required environment variables are present');
}

const express = require('express');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { validatePhoneSignup, validatePhoneOrder, logBlockedPhoneAttempt } = require('./phone-blocking-system');
const { validateGhanianPhone, toInternationalFormat } = require('./ghana-phone-validator');
// rate limiting removed per request

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment (needed for correct IP addresses and HTTPS)
// Render uses a reverse proxy, so we need to trust it
app.set('trust proxy', 1);

// Email transporter configuration for password reset (Gmail SMTP)
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL (port 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify email configuration on startup with detailed logging
console.log('🔧 Email Configuration Startup Check:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET (' + process.env.EMAIL_PASSWORD.length + ' chars)' : '❌ NOT SET');
console.log('   EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || 'DataSell (default)');

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.log('⚠️ Email transporter verification failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error command:', error.command);
    } else {
      console.log('✅ Email service ready - SMTP connection verified');
    }
  });
} else {
  console.log('❌ Email credentials missing - password reset will NOT work');
}

// Function to send password reset email
async function sendPasswordResetEmail(email, resetLink, userName = 'User') {
  try {
    console.log(`📨 Attempting to send password reset email to: ${email}`);
    console.log(`📨 Using sender: ${process.env.EMAIL_USER}`);
    console.log(`📨 Email transporter ready: checking connection...`);
    
    // Verify transporter connection before sending (convert callback to promise)
    try {
      await new Promise((resolve, reject) => {
        emailTransporter.verify((error, success) => {
          if (error) reject(error);
          else resolve(success);
        });
      });
      console.log('✅ Email transporter verified and ready');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError.message);
    }
    
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'DataSell'} <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - DataSell',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">Password Reset Request</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
            <p>Hello ${userName},</p>
            <p>We received a request to reset the password for your DataSell account. If you did not make this request, please ignore this email.</p>
            <p>To reset your password, click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;"><code>${resetLink}</code></p>
            <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">If you didn't request this, your account is still secure. The link will expire automatically.</p>
            <p style="color: #999; font-size: 12px;">© 2026 DataSell. All rights reserved.</p>
          </div>
        </div>
      `
    };

    console.log(`📬 Sending email with options:`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully to:', email);
    console.log('📧 Email response:', info.response);
    console.log('📧 Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ EMAIL SEND FAILED - Full Error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    return false;
  }
}

// Wigal SMS configuration (replacing mNotify)
const WIGAL_SMS_API_URL = 'https://frogapi.wigal.com.gh/api/v3/sms/send';
const WIGAL_SMS_API_KEY = process.env.WIGAL_API_KEY || '$2a$10$7inYR.nIaYyOq.tGcTECQOrrh9WYm5k1IBdykmoLFXyggc20kvMwK';
const WIGAL_SMS_USERNAME = 'Datasell';
const WIGAL_SMS_SENDER = 'Datasellgh';

async function sendSmsToUser(userId, phoneFallback, message) {
  try {
    const userSnap = await admin.database().ref(`users/${userId}`).once('value');
    const user = userSnap.val() || {};
    const phone = (user.phone || user.phoneNumber || phoneFallback || '').toString();
    if (!phone || phone.length < 8) {
      console.log('📱 SMS not sent: no valid phone for user', userId);
      return;
    }

    console.log(`📱 [WIGAL-SMS] Sending SMS to ${phone} for user ${userId}`);

    // Generate unique message ID
    const msgId = `MSG${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Personalized message format - message inside each destination
    const payload = {
      senderid: WIGAL_SMS_SENDER,
      destinations: [
        {
          destination: phone,
          message: message,
          msgid: msgId,
          smstype: 'text'
        }
      ]
    };

    const response = await axios.post(WIGAL_SMS_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': WIGAL_SMS_API_KEY,
        'USERNAME': WIGAL_SMS_USERNAME
      },
      timeout: 15000
    });

    console.log(`✅ [WIGAL-SMS] SMS sent successfully to ${phone}`);
    console.log(`📩 [WIGAL-SMS] Response:`, response.data);
  } catch (err) {
    console.error(`❌ [WIGAL-SMS] SMS send error for user ${userId}:`, {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });
  }
}
console.log('Loaded environment variables:', process.env);

// Initialize Firebase Admin SYNCHRONOUSLY (required before using admin.database())
console.log('🔄 Initializing Firebase Admin (CRITICAL - must happen first)...');
let firebaseInitialized = false;
try {
  if (!admin.apps.length) {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('❌ CRITICAL: Firebase initialization failed:', error.message);
  console.error('This is required for the server to work. Check your environment variables.');
  process.exit(1);
}


// Enhanced Package Cache System with error recovery
let packageCache = {
  mtn: [],
  at: [],
  lastUpdated: null,
  isInitialized: false
};

function initializePackageCache() {
  console.log('🔄 Initializing real-time package cache (non-blocking)...');
  
  // Don't block startup - run in background
  setTimeout(() => {
    try {
      const mtnRef = admin.database().ref('packages/mtn');
      const atRef = admin.database().ref('packages/at');
      
      mtnRef.on('value', (snapshot) => {
        try {
          const packages = snapshot.val() || {};
          const packagesArray = Object.entries(packages).map(([key, pkg]) => ({
            id: key,
            ...pkg
          }));
          
          packageCache.mtn = packagesArray;
          packageCache.lastUpdated = Date.now();
          packageCache.isInitialized = true;
          console.log(`✅ MTN packages cache updated (${packagesArray.length} packages)`);
        } catch (error) {
          console.error('❌ Error updating MTN packages cache:', error);
        }
      }, (error) => {
        console.error('⚠️  MTN packages listener warning:', error.message);
      });
      
      atRef.on('value', (snapshot) => {
        try {
          const packages = snapshot.val() || {};
          const packagesArray = Object.entries(packages).map(([key, pkg]) => ({
            id: key,
            ...pkg
          }));
          
          packageCache.at = packagesArray;
          packageCache.lastUpdated = Date.now();
          packageCache.isInitialized = true;
          console.log(`✅ AirtelTigo packages cache updated (${packagesArray.length} packages)`);
        } catch (error) {
          console.error('❌ Error updating AirtelTigo packages cache:', error);
        }
      }, (error) => {
        console.error('⚠️  AirtelTigo packages listener warning:', error.message);
      });
    } catch (error) {
      console.error('⚠️  Package cache initialization warning:', error.message);
    }
  }, 100);
}

// Schedule cache initialization to run after server starts
let cacheInitialized = false;

// Custom Firebase Session Store (persists sessions across restarts)
class FirebaseSessionStore extends session.Store {
  constructor() {
    super();
    this.sessionsRef = admin.database().ref('sessions');
  }

  get(sessionId, callback) {
    console.log('📖 Session store: GET', sessionId);
    this.sessionsRef.child(sessionId).once('value', (snapshot) => {
      const data = snapshot.val();
      if (data && data.expires > Date.now()) {
        // Session still valid
        console.log('✅ Session store: GET found valid session for', sessionId);
        try {
          const parsedSession = data.session ? JSON.parse(data.session) : null;
          callback(null, parsedSession);
        } catch (parseError) {
          console.error('❌ Error parsing session data:', parseError);
          this.sessionsRef.child(sessionId).remove();
          callback(null, null);
        }
      } else if (data) {
        // Session expired, delete it
        console.log('⏰ Session store: GET found expired session for', sessionId, '- deleting');
        this.sessionsRef.child(sessionId).remove();
        callback(null, null);
      } else {
        console.log('❌ Session store: GET found NO session for', sessionId);
        callback(null, null);
      }
    }).catch((err) => {
      console.error('❌ Session store GET error:', err);
      callback(err);
    });
  }

  set(sessionId, sessionData, callback) {
    const expiresMs = sessionData.cookie.maxAge || 24 * 60 * 60 * 1000;
    console.log('💾 Session store: SET', sessionId, 'with user:', sessionData.user?.uid || 'no user');
    this.sessionsRef.child(sessionId).set({
      session: JSON.stringify(sessionData),
      expires: Date.now() + expiresMs,
      createdAt: Date.now()
    }, (err) => {
      if (err) {
        console.error('❌ Session store SET error:', err);
        callback(err);
      } else {
        console.log('✅ Session store: SET complete for', sessionId);
        callback(null);
      }
    });
  }

  destroy(sessionId, callback) {
    console.log('🗑️  Session store: DESTROY', sessionId);
    this.sessionsRef.child(sessionId).remove((err) => {
      if (err) {
        console.error('❌ Session store DESTROY error:', err);
        callback(err);
      } else {
        console.log('✅ Session store: DESTROY complete for', sessionId);
        callback(null);
      }
    });
  }

  touch(sessionId, sessionData, callback) {
    const expiresMs = sessionData.cookie.maxAge || 24 * 60 * 60 * 1000;
    console.log('🔄 Session store: TOUCH', sessionId);
    this.sessionsRef.child(sessionId).update({
      expires: Date.now() + expiresMs
    }, (err) => {
      if (err) {
        console.error('❌ Session store TOUCH error:', err);
        callback(err);
      } else {
        console.log('✅ Session store: TOUCH complete for', sessionId);
        callback(null);
      }
    });
  }
}

// Enhanced middleware setup
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to capture raw body for Paystack webhook signature verification
// CRITICAL: Only for webhook path, not for all JSON requests
app.use('/api/paystack/webhook', express.raw({ type: 'application/json', limit: '10mb' }), (req, res, next) => {
  // For webhook, preserve the raw Buffer for signature verification
  req.rawBody = req.body.toString('utf8');
  try {
    req.body = JSON.parse(req.rawBody);
  } catch (e) {
    console.error('❌ [WEBHOOK MIDDLEWARE] Failed to parse JSON:', e.message);
    req.body = {};
  }
  console.log(`📥 [WEBHOOK MIDDLEWARE] Raw body captured, length: ${req.rawBody.length}`);
  next();
});

// Now parse JSON for all other routes AFTER the webhook middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced session configuration with Firebase persistence
app.use(session({
  store: new FirebaseSessionStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // Allow overriding secure flag via env `SESSION_COOKIE_SECURE` for local testing
  cookie: {
    secure: (typeof process.env.SESSION_COOKIE_SECURE !== 'undefined') ? (process.env.SESSION_COOKIE_SECURE === 'true') : (process.env.NODE_ENV === 'production'),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000 // 30 minutes inactivity timeout
  },
  name: 'datasell.sid',
  rolling: true // Reset the session timeout on each request (rolling expiration)
}));

// Enhanced CORS configuration
const allowedDomains = [
  'datasell.store',
  'datasell.com', 
  'datasell.onrender.com',
  'datasell.io',
  'datasell.pro',
  'datasell.shop',
  'localhost:3000',
'datasell-5w0w.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedDomains.some(domain => origin.includes(domain))) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ============================================
// SESSION TIMEOUT & INACTIVITY MIDDLEWARE
// ============================================
// Auto-logout users after 30 minutes of inactivity
app.use((req, res, next) => {
  // Skip timeout check for public/auth endpoints
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/api/login',
    '/api/signup',
    '/api/auth/verify',
    '/api/check-auth',
    '/api/health',
    '/api/ping',
    '/api/hubnet-webhook',
    '/api/datamart-webhook',
    '/config.js'
  ];

  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // For authenticated routes, track activity
  if (req.session && req.session.user) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const inactiveMs = now - lastActivity;
    const inactiveMinutes = inactiveMs / (1000 * 60);
    
    // 24 hours timeout
    if (inactiveMinutes > 1440) {
      console.log(`⏰ Session timeout for user ${req.session.user.uid} after ${Math.floor(inactiveMinutes)} minutes of inactivity`);
      // Destroy session and redirect to login
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Session expired due to inactivity. Please login again.',
        code: 'SESSION_TIMEOUT'
      });
    }
    
    // Update last activity timestamp for rolling window
    req.session.lastActivity = now;
  }

  next();
});

// Enhanced domain restriction middleware
app.use((req, res, next) => {
  const host = req.get('host');
  const origin = req.get('origin');
  
  // Skip domain check for health endpoints, webhooks and lightweight config
  if (req.path === '/api/health' || req.path === '/api/ping' || req.path === '/api/paystack/webhook' || req.path === '/api/hubnet-webhook' || req.path === '/api/datamart-webhook' || req.path === '/config.js') {
    return next();
  }
  
  // Development bypass: do not enforce domain restrictions when not in production
  if (process.env.NODE_ENV !== 'production') {
    // Log host/origin to help diagnose local dev issues
    console.log('Domain check bypass (dev). host:', host, 'origin:', origin, 'path:', req.path);
    return next();
  }

  const isAllowed = allowedDomains.some(domain => 
    host?.includes(domain) || origin?.includes(domain)
  );

  if (!isAllowed) {
    console.log('🚫 Blocked access from:', { host, origin, path: req.path });
    return res.status(403).json({ 
      success: false,
      error: 'Access forbidden - Domain not allowed'
    });
  }

  next();
});

// Rate limiting removed to allow seamless login/signup access.

// Enhanced authentication middleware
const requireAuth = (req, res, next) => {
  // Debug: log session state
  console.log('🔐 Session check for', req.path, ':', {
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    userId: req.session?.user?.uid || 'none',
    sessionId: req.sessionID || 'none'
  });

  if (req.session.user) {
    next();
  } else {
    // Prefer JSON for API routes to avoid HTML redirects being returned to fetch()
    if (req.path && req.path.startsWith('/api')) {
      console.warn('Unauthorized API request:', { path: req.path, cookies: req.headers.cookie, session: req.session && Object.keys(req.session).length ? '[session present]' : '[no session]' });
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // If the client accepts HTML, redirect to login page for browser navigations
    if (req.accepts && req.accepts('html')) {
      return res.redirect('/login');
    }

    // Fallback to JSON
    res.status(401).json({ success: false, error: 'Authentication required' });
  }
};

// Lightweight client config endpoint (serves runtime values to the browser)
app.get('/config.js', (req, res) => {
  const domainEnv = process.env.DOMAIN || null;
  const base = (domainEnv ? (domainEnv.match(/^https?:\/\//) ? domainEnv : `https://${domainEnv}`) : (process.env.BASE_URL || 'https://datasell.onrender.com')).replace(/\/$/, '');
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || null,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || null,
    projectId: process.env.FIREBASE_PROJECT_ID || null,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || null,
    appId: process.env.FIREBASE_APP_ID || null
  };
  res.set('Content-Type', 'application/javascript');
  const vapid = process.env.FIREBASE_VAPID_KEY || null;
  
  // Safely serialize config to JavaScript
  const configScript = `
window.__DOMAIN = ${JSON.stringify(domainEnv)};
window.__BASE_URL = ${JSON.stringify(base)};
window.__FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)};
window.__FCM_VAPID_KEY = ${JSON.stringify(vapid)};
`;
  res.send(configScript);
});

// Health check endpoint for monitoring services (UptimeRobot, Render, etc.)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve Firebase Messaging Service Worker dynamically with server-side config
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  const fbConfig = {
    apiKey: process.env.FIREBASE_API_KEY || null,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || null,
    projectId: process.env.FIREBASE_PROJECT_ID || null,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || null,
    appId: process.env.FIREBASE_APP_ID || null
  };

  const sw = `importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');\nimportScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');\n\nfirebase.initializeApp(${JSON.stringify(fbConfig)});\nconst messaging = firebase.messaging();\n\nmessaging.onBackgroundMessage(function(payload) {\n  try {\n    const title = (payload.notification && payload.notification.title) || 'Notification';\n    const options = {\n      body: (payload.notification && payload.notification.body) || '',\n      icon: (payload.notification && payload.notification.image) || '/images/app-icon.png',\n      data: payload.data || {}\n    };\n    self.registration.showNotification(title, options);\n  } catch (e) { console.error('SW background message error', e); }\n});\n\nself.addEventListener('notificationclick', function(event) {\n  event.notification.close();\n  const url = event.notification.data && event.notification.data.click_action ? event.notification.data.click_action : '/notifications';\n  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {\n    for (let i = 0; i < windowClients.length; i++) {\n      const client = windowClients[i];\n      if (client.url === url && 'focus' in client) return client.focus();\n    }\n    if (clients.openWindow) return clients.openWindow(url);\n  }));\n});\n`;

  res.send(sw);
});

// Enhanced admin middleware
const requireAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    // For browser navigation, redirect to admin login page for a smoother UX
    if (req.accepts && req.accepts('html')) {
      return res.redirect('/admin-login');
    }

    res.status(403).json({ 
      success: false, 
      error: 'Admin privileges required' 
    });
  }
};

// ====================
// ENHANCED PAGE ROUTES
// ====================

app.get('/', (req, res) => {
  // Serve clean, static public homepage (CRITICAL FOR SEO)
  // This is a BRAND PAGE - NOT an app interface
  // Google indexes this as the official homepage for DataSell Ghana
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  // Serve authenticated dashboard to logged-in users
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/forgot-password', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/purchase', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'purchase.html'));
});

app.get('/wallet', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wallet.html'));
});

app.get('/orders', requireAuth, (req, res) => {
  // Serve the orders page (replaced with new content)
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

app.get('/notifications', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'notifications.html'));
});

app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/admin-login', (req, res) => {
  // Always show login page, even if already logged in
  // This ensures users must always log in when accessing admin
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
  // Check if user is authenticated and is admin
  console.log('📍 /admin route accessed, session:', { 
    hasSession: !!req.session?.user, 
    uid: req.session?.user?.uid,
    isAdmin: req.session?.user?.isAdmin, 
    sessionID: req.sessionID 
  });
  
  if (req.session?.user && req.session.user.isAdmin) {
    // User is already logged in, serve the admin page
    console.log('✅ Admin access granted for:', req.session.user.uid);
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    // Not logged in or not admin, redirect to login page
    console.log('❌ Admin access denied, redirecting to login');
    res.redirect('/admin-login');
  }
});

// ====================
// ENHANCED AUTHENTICATION API ROUTES
// ====================

// Enhanced User Registration
// ============ EMAIL VALIDATION FUNCTION ============
// Validates email format and checks for common typos
function validateEmail(email) {
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for common domain typos
  const commonDomains = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahou.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com'
  };

  const domain = email.split('@')[1]?.toLowerCase();
  if (commonDomains[domain]) {
    return { 
      valid: false, 
      error: `Did you mean ${email.split('@')[0]}@${commonDomains[domain]}? (detected typo in domain)` 
    };
  }

  // Check email length
  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  // Check for consecutive dots or invalid characters
  if (email.includes('..') || /[<>()\\[\],;:\s]/g.test(email)) {
    return { valid: false, error: 'Email contains invalid characters' };
  }

  // Email is valid
  return { valid: true };
}

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, acceptedTerms } = req.body;
    
    // Validation
    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    // Email validation
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: emailValidation.error 
      });
    }

    // Terms acceptance validation
    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        error: 'You must accept the Terms of Service and Privacy Policy to create an account'
      });
    }

    // Phone validation
    const phoneValidationResult = validateGhanianPhone(phone);
    if (!phoneValidationResult.valid) {
      console.warn(`⚠️ Invalid phone attempt: ${phone} - ${phoneValidationResult.error}`);
      return res.status(400).json({ 
        success: false, 
        error: phoneValidationResult.error 
      });
    }

    const normalizedPhone = phoneValidationResult.normalized;

    console.log(`✅ Valid phone: ${normalizedPhone}`);

    // Check if phone is blocked
    const phoneBlacklistCheck = await validatePhoneSignup(normalizedPhone);
    if (!phoneBlacklistCheck.valid) {
      console.warn(`⚠️ Blocked phone signup attempt: ${normalizedPhone}`);
      await logBlockedPhoneAttempt(normalizedPhone, 'signup', null, { 
        email: email,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({ 
        success: false, 
        error: phoneBlacklistCheck.error 
      });
    }

    // Check if email already exists
    const usersSnapshot = await admin.database().ref('users').once('value');
    const existingUsers = usersSnapshot.val() || {};
    
    for (const [uid, userData] of Object.entries(existingUsers)) {
      if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      }
    }

    let uid = null;
    let authMethod = 'database'; // Track which auth method was used

    // OPTION 1 & 3: Try Firebase Auth first (if enabled)
    try {
      console.log('🔐 Attempting Firebase Auth signup...');
      const userRecord = await admin.auth().createUser({
        email: email.toLowerCase().trim(),
        password,
        displayName: `${firstName} ${lastName}`
      });
      uid = userRecord.uid;
      authMethod = 'firebase';
      console.log(`✅ User created in Firebase Auth: ${uid}`);
    } catch (firebaseError) {
      console.warn(`⚠️ Firebase Auth unavailable: ${firebaseError.message}`);
      console.log('📦 Falling back to database-based authentication...');
      
      // OPTION 2: Fall back to database-based auth
      uid = 'user_' + require('crypto').randomBytes(8).toString('hex');
      authMethod = 'database';
      console.log(`✅ Using database-based auth with UID: ${uid}`);
    }

    // Hash password for database backup (always, regardless of auth method)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create/Update user in database
    await admin.database().ref('users/' + uid).set({
      uid: uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: normalizedPhone,
      passwordHash: passwordHash, // For database auth fallback
      walletBalance: 0,
      createdAt: new Date().toISOString(),
      isAdmin: email === process.env.ADMIN_EMAIL,
      pricingGroup: 'regular',
      suspended: false,
      lastLogin: null,
      authMethod: authMethod // Track which auth system is used
    });

    // Log registration
    await admin.database().ref('userLogs').push().set({
      userId: uid,
      action: 'registration',
      email: email.toLowerCase(),
      phone: normalizedPhone,
      authMethod: authMethod,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    console.log(`✅ User registered successfully: ${email} (${uid}) via ${authMethod}`);

    res.json({ 
      success: true, 
      userId: uid,
      authMethod: authMethod,
      message: 'Account created successfully. You can now log in with your email and password.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create account: ' + error.message 
    });
  }
});

// Check authentication status endpoint (used by login page to redirect if already logged in)
app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.user) {
    // User is logged in
    return res.json({
      success: true,
      authenticated: true,
      user: {
        uid: req.session.user.uid,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName
      }
    });
  } else {
    // User is not logged in
    return res.json({
      success: true,
      authenticated: false
    });
  }
});

// Enhanced User Login
app.post('/api/login', async (req, res) => {
  try {
    console.log('🔓 [LOGIN] Request received');
    console.log('🔓 [LOGIN] Body:', req.body);
    console.log('🔓 [LOGIN] Headers:', req.headers['content-type']);
    
    let { email, password, rememberMe, isAdminLogin } = req.body;
    
    console.log('🔓 [LOGIN] Extracted values:', { email, password: password ? '***' : 'MISSING', rememberMe, isAdminLogin });
    
    // Coerce rememberMe to boolean for safety (clients may send 'true'/'false' strings)
    rememberMe = (rememberMe === true || rememberMe === 'true');
    isAdminLogin = (isAdminLogin === true || isAdminLogin === 'true');
    console.log('🔐 Login attempt received', { email, rememberMe, isAdminLogin });

    // Remember me is now OPTIONAL - users can log in without checking it
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      console.log('❌ Debug - email:', email, 'password:', password);
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Check for admin credentials first (works from either login.html or admin-login.html)
    if ((email === process.env.ADMIN_EMAIL || email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) &&
        password === process.env.ADMIN_PASSWORD) {
      console.log('🔑 Admin login detected for:', email);
      // Admin credentials match
      console.log('✅ Admin credentials match');
      
      // For admin, use database-based auth (Firebase Auth not available)
      // Look for existing admin user record by email
      const usersSnapshot = await admin.database().ref('users').once('value');
      const users = usersSnapshot.val() || {};
      let adminUser = null;
      let adminUid = null;
      
      // Search for existing user with admin email
      for (const [uid, userData] of Object.entries(users)) {
        if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
          adminUser = userData;
          adminUid = uid;
          console.log('✅ Found existing admin user record with UID:', adminUid);
          break;
        }
      }
      
      // If no existing admin user, create one (but with a consistent UID)
      if (!adminUid) {
        adminUid = 'admin-' + email.replace('@', '-').replace(/[^a-z0-9-]/gi, '');
        console.log('📝 Creating new admin user record with UID:', adminUid);
        adminUser = {
          uid: adminUid,
          firstName: 'Admin',
          lastName: 'User',
          email,
          phone: '',
          walletBalance: 0,
          createdAt: new Date().toISOString(),
          isAdmin: true,
          pricingGroup: 'admin',
          suspended: false,
          lastLogin: new Date().toISOString()
        };
        
        // Save new admin user
        await admin.database().ref('users/' + adminUid).set(adminUser);
      } else {
        // Update existing admin user's last login
        await admin.database().ref('users/' + adminUid + '/lastLogin').set(new Date().toISOString());
      }
      
      req.session.user = {
        uid: adminUid,
        email,
        displayName: adminUser?.displayName || adminUser?.firstName + ' ' + adminUser?.lastName || 'Administrator',
        isAdmin: true
      };
      
      // Initialize activity tracker for session timeout
      req.session.lastActivity = Date.now();

      console.log('✅ Admin session set:', { uid: req.session.user.uid, isAdmin: req.session.user.isAdmin, sessionID: req.sessionID });

      // Respect 'remember me' for admin sessions if provided
      try {
        const rememberMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days || 24 hours
        req.session.cookie.maxAge = rememberMs;
      } catch (e) {
        // Ignore if session cookie cannot be modified
      }

      // Return response - express-session middleware will automatically save and set Set-Cookie
      console.log('📤 Sending admin login response with sessionID:', req.sessionID);
      return res.json({ 
        success: true, 
        message: 'Admin login successful',
        user: req.session.user,
        sessionID: req.sessionID,
        isAdmin: true
      });
    }

    // Enhanced Regular user login - Check database first
    console.log('👤 Regular user login attempt for:', email);
    
    // First, try to find user by email in the database
    const usersSnapshot = await admin.database().ref('users').once('value');
    const allUsers = usersSnapshot.val() || {};
    
    let foundUser = null;
    let foundUserId = null;
    
    // Search for user with matching email
    for (const [uid, userData] of Object.entries(allUsers)) {
      if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
        foundUser = userData;
        foundUserId = uid;
        console.log('✅ Found user in database:', uid);
        break;
      }
    }
    
    if (!foundUser) {
      console.log('❌ User not found in database:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    // Check if user is suspended
    if (foundUser.suspended) {
      console.log('⛔ User suspended:', email);
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact administrator.'
      });
    }
    
    // Verify password - check if stored as hashed or plain
    let passwordMatch = false;
    
    if (foundUser.passwordHash) {
      // Compare with bcrypt hash
      try {
        passwordMatch = await bcrypt.compare(password, foundUser.passwordHash);
        console.log('🔐 Password compared with hash:', passwordMatch);
      } catch (e) {
        console.error('❌ Bcrypt error:', e.message);
        passwordMatch = false;
      }
    } else if (foundUser.password) {
      // Fallback: plain text comparison (for legacy users)
      passwordMatch = (foundUser.password === password);
      console.log('⚠️ Plain text password match:', passwordMatch);
    }
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    console.log('✅ Password verified for user:', email);
    
    // Set user session
    req.session.user = {
      uid: foundUserId,
      email: foundUser.email,
      displayName: foundUser.displayName || `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim(),
      isAdmin: foundUser.isAdmin || false
    };
    
    // Initialize activity tracker for session timeout
    req.session.lastActivity = Date.now();

    // Respect 'remember me' for regular user sessions
    try {
      const rememberMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days || 24 hours
      req.session.cookie.maxAge = rememberMs;
    } catch (e) {
      // Ignore if session cookie cannot be modified
    }

    // Update last login - do this in background
    admin.database().ref('users/' + foundUserId).update({
      lastLogin: new Date().toISOString()
    }).catch(err => console.error('Failed to update lastLogin:', err));

    // Log session info for debugging
    console.log('✅ User login for', foundUserId, 'sessionID:', req.sessionID, 'cookieMaxAge:', req.session.cookie.maxAge);
    console.log('🍪 Session data set:', { uid: req.session.user.uid, isAdmin: req.session.user.isAdmin, sessionID: req.sessionID });
    
    // Save session explicitly before returning response
    return req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ success: false, error: 'Session save failed' });
      }
      
      console.log('✅ User session saved successfully');
      // Return response - session is now saved
      return res.json({ 
        success: true, 
        message: 'Login successful',
        user: req.session.user,
        sessionID: req.sessionID
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.response?.data?.error?.message) {
      const errorMessage = error.response.data.error.message;
      if (errorMessage.includes('INVALID_EMAIL') || errorMessage.includes('INVALID_PASSWORD')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }
      // Do not expose or enforce Firebase's TOO_MANY_ATTEMPTS_TRY_LATER limit.
      // Map that specific error to a generic response so the client isn't
      // blocked or shown the rate-limit message.
      if (errorMessage.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      if (errorMessage) {
        return res.status(401).json({ success: false, error: errorMessage });
      }
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
});

// Test Email Configuration endpoint (for debugging email issues in production)
app.post('/api/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ success: false, error: 'Test email is required' });
    }

    console.log('🧪 Testing email configuration...');
    console.log('📧 Email service:', process.env.EMAIL_USER);
    console.log('📧 Test recipient:', testEmail);

    const testMailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'DataSell'} <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: 'Test Email - DataSell Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">✅ Email Configuration Test</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
            <p>If you received this email, your email configuration is working correctly!</p>
            <p><strong>Time sent:</strong> ${new Date().toISOString()}</p>
            <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
            <p><strong>To:</strong> ${testEmail}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">This is a test email from DataSell. You can now safely delete it.</p>
          </div>
        </div>
      `
    };

    const info = await emailTransporter.sendMail(testMailOptions);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      details: {
        messageId: info.messageId,
        response: info.response,
        sentTo: testEmail
      }
    });
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error command:', error.command);
    console.error('   Response:', error.response);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email',
      details: {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        emailUser: process.env.EMAIL_USER,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587
      }
    });
  }
});

// Forgot Password - Handle password reset request
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    console.log('🔑 Password reset request for email:', email);

    // HYBRID APPROACH: Try Firebase Auth first, fall back to database temp password
    let resetMethod = null;
    let tempPassword = null;

    // STEP 1: Try Firebase Auth (for new users created via signup after Firebase integration)
    console.log('🔍 Checking Firebase Auth for user:', email);
    try {
      const user = await Promise.race([
        admin.auth().getUserByEmail(email),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Auth timeout')), 5000))
      ]);
      
      console.log('✅ User found in Firebase Auth:', user.uid);
      
      // Try to generate password reset link with timeout
      try {
        const resetLink = await Promise.race([
          admin.auth().generatePasswordResetLink(email),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Password reset link generation timeout')), 5000))
        ]);
        
        console.log('✅ Password reset link generated');
        resetMethod = 'firebase-auth';
        
        // Send Firebase reset link via email
        const mailOptions = {
          from: `${process.env.EMAIL_FROM_NAME || 'DataSell'} <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Password Reset Request - DataSell',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0;">
                <h2 style="margin: 0;">Password Reset Request</h2>
              </div>
              <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
                <p>Hello,</p>
                <p>We received a request to reset the password for your DataSell account. If you did not make this request, please ignore this email.</p>
                <p>To reset your password, click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 12px;"><code>${resetLink}</code></p>
                <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">If you didn't request this, your account is still secure. The link will expire automatically.</p>
                <p style="color: #999; font-size: 12px;">© 2026 DataSell. All rights reserved.</p>
              </div>
            </div>
          `
        };
        
        // Send email with timeout (non-blocking)
        (async () => {
          try {
            console.log('📧 Attempting to send password reset email to:', email);
            const emailPromise = emailTransporter.sendMail(mailOptions);
            const info = await Promise.race([
              emailPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 10000))
            ]);
            console.log('✅ Password reset email sent via Firebase method:', info.messageId);
          } catch (emailSendError) {
            console.error('❌ Email send failed:', emailSendError.message);
            console.error('Email error code:', emailSendError.code);
            console.error('Email error response:', emailSendError.response);
          }
        })();
        
        return res.json({ 
          success: true, 
          message: 'Password reset link has been sent to your email. Please check your inbox.',
          resetMethod: 'firebase-auth'
        });
      } catch (linkError) {
        console.warn('⚠️ Firebase password reset link failed:', linkError.message);
        // Fall through to database method
      }
    } catch (firebaseError) {
      console.log('ℹ️ User not in Firebase Auth or Firebase unavailable:', firebaseError.message);
      // Fall through to database method
    }

    // STEP 2: Fall back to database method (for existing users or if Firebase fails)
    console.log('📦 Falling back to database method...');
    const usersSnapshot = await admin.database().ref('users').once('value');
    const allUsers = usersSnapshot.val() || {};
    
    let foundUser = null;
    let foundUserId = null;
    
    for (const [uid, userData] of Object.entries(allUsers)) {
      if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
        foundUser = userData;
        foundUserId = uid;
        console.log('✅ Found user in database:', uid);
        break;
      }
    }

    if (!foundUser) {
      console.log('❌ User not found in database:', email);
      // For security, return generic message
      return res.json({ 
        success: true, 
        message: 'If this email exists in our system, a password reset link has been sent to your email. Please check your inbox.'
      });
    }

    // Generate temporary password
    tempPassword = require('crypto').randomBytes(8).toString('hex').toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    console.log('✅ Generated temporary password for:', foundUserId);

    // Store in database
    await admin.database().ref(`users/${foundUserId}`).update({
      passwordHash: passwordHash,
      lastPasswordUpdate: new Date().toISOString()
    });

    // Send temporary password via email
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'DataSell'} <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your DataSell Temporary Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">Password Reset</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
            <p>Hello,</p>
            <p>We received a request to reset your DataSell account password. Here is your temporary password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px;">
                ${tempPassword}
              </div>
            </div>
            <p><strong>Instructions:</strong></p>
            <ol>
              <li>Go to the DataSell login page</li>
              <li>Enter your email: <strong>${email}</strong></li>
              <li>Enter this temporary password: <strong>${tempPassword}</strong></li>
              <li>After logging in, change your password immediately</li>
            </ol>
            <p style="color: #999; font-size: 12px;">
              <strong>Security Note:</strong> This temporary password expires in 24 hours. Never share your password with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            <p style="color: #999; font-size: 12px;">© 2026 DataSell. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    // Send email with timeout (non-blocking)
    (async () => {
      try {
        console.log('📧 Attempting to send temporary password email to:', email);
        const emailPromise = emailTransporter.sendMail(mailOptions);
        const info = await Promise.race([
          emailPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 10000))
        ]);
        console.log('✅ Temporary password email sent successfully:', info.messageId);
      } catch (emailSendError) {
        console.error('❌ Temporary password email send failed:', emailSendError.message);
        console.error('Email error code:', emailSendError.code);
        console.error('Email error response:', emailSendError.response);
      }
    })();
    
    res.json({ 
      success: true, 
      message: 'A temporary password has been sent to your email. Please check your inbox.',
      resetMethod: 'database-temp-password',
      // For development only
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ success: false, error: 'An error occurred. Please try again later.' });
  }
});

// Enhanced Get current user
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.uid;
    console.log('📋 Fetching user data for:', uid, 'isAdmin from session:', req.session.user.isAdmin);
    
    const snap = await admin.database().ref('users/' + uid).once('value');
    const userData = snap.val() || {};

    // Merge session data with database fields we want the client to know
    const user = Object.assign({}, req.session.user, {
      phoneNumber: userData.phone || userData.phoneNumber || null,
      walletBalance: userData.walletBalance || 0,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      displayName: userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.displayName || userData.email || 'User',
      isAdmin: req.session.user.isAdmin || userData.isAdmin || false,
      pricingGroup: userData.pricingGroup || 'regular'
    });

    console.log('✅ User data response:', { uid: user.uid, email: user.email, isAdmin: user.isAdmin });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Get user profile endpoint
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.uid;
    const snap = await admin.database().ref('users/' + uid).once('value');
    const userData = snap.val() || {};

    const profile = {
      uid,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      walletBalance: userData.walletBalance || 0,
      createdAt: userData.createdAt || null,
      lastLogin: userData.lastLogin || null,
      isAdmin: userData.isAdmin || false,
      pricingGroup: userData.pricingGroup || 'regular'
    };

    res.json({ success: true, profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update user profile
app.put('/api/profile/update', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.uid;
    const { firstName, lastName, phone } = req.body;

    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'First name and last name are required' });
    }

    // Update user data in Firebase
    await admin.database().ref('users/' + uid).update({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : ''
    });

    console.log(`✏️ Profile updated for user ${uid}`);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Get user profile statistics
app.get('/api/profile/stats', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.uid;
    
    console.log('📊 Fetching stats for user:', uid);
    
    // Get all transactions and filter client-side (no index needed)
    const transactionsSnap = await admin.database().ref('transactions').once('value');
    const allTransactions = transactionsSnap.val() || {};
    
    // Filter transactions for this user
    const userTransactions = Object.values(allTransactions).filter(t => t.userId === uid);
    
    // Count ONLY successful orders (delivered or success status)
    const successfulTransactions = userTransactions.filter(transaction => 
      transaction.status === 'delivered' || transaction.status === 'success'
    );
    
    const totalOrders = successfulTransactions.length;
    const totalSpent = successfulTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    
    // Successful orders count (same as totalOrders now)
    const successfulOrders = totalOrders;
    
    console.log(`📊 Stats - Total: ${totalOrders}, Successful: ${successfulOrders}, Spent: ₵${totalSpent}`);
    
    // Get wallet info and account status
    const userSnap = await admin.database().ref('users/' + uid).once('value');
    const userData = userSnap.val() || {};
    const walletBalance = userData.walletBalance || 0;
    const accountStatus = userData.isDeactivated === true ? 'Deactivated' : 'Active';

    const stats = {
      totalOrders,
      successfulOrders,
      totalSpent,
      walletBalance,
      accountStatus,
      memberSince: userData.createdAt || null
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Get profile stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// Register FCM token for the logged-in user
app.post('/api/register-fcm-token', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });
    const uid = req.session.user.uid;
    await admin.database().ref(`fcmTokens/${uid}/${token}`).set(true);
    res.json({ success: true });
  } catch (err) {
    console.error('Register FCM token error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get notifications for the logged-in user (latest 100)
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000); // Last 48 hours
    const snap = await admin.database().ref('notifications').orderByChild('createdAt').limitToLast(100).once('value');
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([id, n]) => ({ id, ...n }))
      .filter(n => n.createdAt >= fortyEightHoursAgo); // Only last 48 hours
    list.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, notifications: list });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete notification
app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await admin.database().ref(`notifications/${id}`).remove();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: send notification (text + optional imageBase64)
app.post('/api/send-notification', requireAdmin, async (req, res) => {
  try {
    const { title, body, imageBase64 } = req.body;
    if (!title && !body) return res.status(400).json({ success: false, error: 'Title or body required' });

    let imageUrl = null;
    if (imageBase64) {
      const uploadsDir = path.join(__dirname, 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1].split('/')[1];
        const buf = Buffer.from(matches[2], 'base64');
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buf);
        imageUrl = `/uploads/${filename}`;
      }
    }

    const newRef = admin.database().ref('notifications').push();
    const notif = {
      title: title || '',
      body: body || '',
      imageUrl: imageUrl || null,
      createdAt: Date.now(),
      sentBy: req.session.user?.email || 'admin'
    };

    await newRef.set(notif);

    // Collect all tokens and send push via FCM
    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    const tokens = [];
    Object.values(tokensData).forEach(userTokens => {
      Object.keys(userTokens || {}).forEach(t => tokens.push(t));
    });

    if (tokens.length > 0) {
      const host = req.get('host');
      const fullImageUrl = notif.imageUrl ? `${req.protocol}://${host}${notif.imageUrl}` : null;
      const notificationPayload = {
        title: notif.title,
        body: notif.body
      };
      // include image only when it's a non-empty string to avoid invalid-payload errors
      if (fullImageUrl && typeof fullImageUrl === 'string') {
        notificationPayload.image = String(fullImageUrl);
      }

      const payload = {
        notification: notificationPayload,
        data: {
          click_action: '/notifications',
          notificationId: newRef.key
        }
      };

      // send in batches (max 500 per sendToDevice)
      for (let i = 0; i < tokens.length; i += 500) {
        const chunk = tokens.slice(i, i + 500);
        try {
          await admin.messaging().sendToDevice(chunk, payload);
        } catch (sendErr) {
          console.error('FCM send error for chunk:', sendErr);
        }
      }
    }

    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('Send notification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================
// ADMIN DASHBOARD ENDPOINTS
// ====================

// Admin Dashboard Statistics
app.get('/api/admin/dashboard/stats', requireAdmin, async (req, res) => {
  try {
    const [usersSnapshot, transactionsSnapshot, paymentsSnapshot] = await Promise.all([
      admin.database().ref('users').once('value'),
      admin.database().ref('transactions').once('value'),
      admin.database().ref('payments').once('value')
    ]);

    const users = usersSnapshot.val() || {};
    const transactions = transactionsSnapshot.val() || {};
    const payments = paymentsSnapshot.val() || {};

    const usersArray = Object.values(users);
    const transactionsArray = Object.values(transactions);
    const paymentsArray = Object.values(payments);

    // Calculate time-based metrics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    const todayTransactions = transactionsArray.filter(t => 
      new Date(t.timestamp) >= today
    );
    const weekTransactions = transactionsArray.filter(t => 
      new Date(t.timestamp) >= weekAgo
    );
    const monthTransactions = transactionsArray.filter(t => 
      new Date(t.timestamp) >= monthAgo
    );

    // Calculate revenue
    const totalRevenue = paymentsArray.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const weekRevenue = weekTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const monthRevenue = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate Paystack fees (3%)
    const totalPaystackFees = transactionsArray.reduce((sum, t) => sum + (t.paystackFee || 0), 0);
    const todayPaystackFees = todayTransactions.reduce((sum, t) => sum + (t.paystackFee || 0), 0);
    const weekPaystackFees = weekTransactions.reduce((sum, t) => sum + (t.paystackFee || 0), 0);
    const monthPaystackFees = monthTransactions.reduce((sum, t) => sum + (t.paystackFee || 0), 0);

    // Net revenue (after Paystack fees)
    const netRevenue = totalRevenue - totalPaystackFees;
    const todayNetRevenue = todayRevenue - todayPaystackFees;
    const weekNetRevenue = weekRevenue - weekPaystackFees;
    const monthNetRevenue = monthRevenue - monthPaystackFees;

    // Top packages
    const packageSales = {};
    transactionsArray.forEach(t => {
      if (t.packageName) {
        packageSales[t.packageName] = (packageSales[t.packageName] || 0) + 1;
      }
    });

    const topPackages = Object.entries(packageSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Network performance
    const networkStats = {
      mtn: transactionsArray.filter(t => t.network === 'mtn').length,
      at: transactionsArray.filter(t => t.network === 'at').length
    };

    const stats = {
      totalUsers: usersArray.length,
      totalTransactions: transactionsArray.length,
      totalRevenue,
      netRevenue: parseFloat(netRevenue.toFixed(2)),
      totalPaystackFees: parseFloat(totalPaystackFees.toFixed(2)),
      successfulTransactions: transactionsArray.filter(t => t.status === 'success').length,
      todayTransactions: todayTransactions.length,
      todayRevenue,
      todayNetRevenue: parseFloat(todayNetRevenue.toFixed(2)),
      todayPaystackFees: parseFloat(todayPaystackFees.toFixed(2)),
      weekRevenue,
      weekNetRevenue: parseFloat(weekNetRevenue.toFixed(2)),
      weekPaystackFees: parseFloat(weekPaystackFees.toFixed(2)),
      monthRevenue,
      monthNetRevenue: parseFloat(monthNetRevenue.toFixed(2)),
      monthPaystackFees: parseFloat(monthPaystackFees.toFixed(2)),
      newUsers: usersArray.filter(u => new Date(u.createdAt) >= monthAgo).length,
      topPackages,
      networkStats,
      successRate: transactionsArray.length > 0 ? 
        (transactionsArray.filter(t => t.status === 'success').length / transactionsArray.length * 100).toFixed(1) : 0
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Recent Activity endpoint for dashboard
app.get('/api/admin/recent-activity', requireAdmin, async (req, res) => {
  try {
    const [transactionsSnapshot, webhookLogsSnapshot, usersSnapshot] = await Promise.all([
      admin.database().ref('transactions').limitToLast(10).once('value'),
      admin.database().ref('webhook_logs').limitToLast(5).once('value'),
      admin.database().ref('users').once('value')
    ]);

    const transactions = transactionsSnapshot.val() || {};
    const webhookLogs = webhookLogsSnapshot.val() || {};
    const users = usersSnapshot.val() || {};

    // Helper function to get username
    const getUserName = (userId) => {
      const user = users[userId];
      return user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'Unknown') : 'Unknown User';
    };

    // Get recent transactions
    const recentTransactions = Object.entries(transactions)
      .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map(([id, transaction]) => ({
        id,
        type: 'transaction',
        description: `${transaction.packageName || 'Data Package'} - ${transaction.network}`,
        amount: transaction.amount,
        status: transaction.status,
        timestamp: transaction.timestamp,
        userId: transaction.userId,
        userName: getUserName(transaction.userId),
        reference: transaction.reference
      }));

    // Get recent webhook events
    const recentWebhooks = Object.entries(webhookLogs)
      .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 3)
      .map(([id, log]) => ({
        id,
        type: 'payment',
        description: `Payment: ${log.reference} - ${log.status}`,
        amount: log.amount,
        status: log.status,
        timestamp: log.timestamp,
        userId: log.userId,
        userName: getUserName(log.userId)
      }));

    // Combine and sort
    const recentActivity = [...recentTransactions, ...recentWebhooks]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);

    res.json({ success: true, activity: recentActivity });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deposits endpoint - shows all Paystack payments
app.get('/api/admin/deposits', requireAdmin, async (req, res) => {
  try {
    const paymentsSnapshot = await admin.database().ref('payments').once('value');
    const usersSnapshot = await admin.database().ref('users').once('value');
    
    const payments = paymentsSnapshot.val() || {};
    const users = usersSnapshot.val() || {};

    const deposits = Object.entries(payments)
      .map(([id, payment]) => {
        const user = users[payment.userId] || {};
        return {
          id,
          userId: payment.userId,
          userName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
          userEmail: user.email || 'N/A',
          amount: payment.amount,
          reference: payment.reference,
          status: payment.status,
          source: payment.source || 'paystack',
          timestamp: payment.timestamp,
          walletCredited: payment.walletCredited || false
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, deposits });
  } catch (error) {
    console.error('Deposits error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Users Management
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const usersSnapshot = await admin.database().ref('users').once('value');
    const transactionsSnapshot = await admin.database().ref('transactions').once('value');
    
    const users = usersSnapshot.val() || {};
    const transactions = transactionsSnapshot.val() || {};

    const usersArray = Object.entries(users).map(([uid, userData]) => {
      const userTransactions = Object.values(transactions).filter(t => t.userId === uid);
      const totalSpent = userTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        uid,
        ...userData,
        totalSpent,
        transactionCount: userTransactions.length,
        lastActivity: userData.lastLogin || userData.createdAt,
        status: userData.suspended ? 'suspended' : 'active',
        pricingGroup: userData.pricingGroup || 'regular'
      };
    });

    res.json({ success: true, users: usersArray });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhanced Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Logout page (GET) - redirects to login after destroying session
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    // Redirect to admin-login after logout
    res.redirect('/admin-login');
  });
});

// Change Password Endpoint
app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.uid;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }
    
    // Get user from database
    const userSnapshot = await admin.database().ref('users/' + userId).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    if (!userData.passwordHash) {
      return res.status(400).json({
        success: false,
        error: 'No password set for this account'
      });
    }
    
    // Compare current password with stored hash
    const passwordMatch = await bcrypt.compare(currentPassword, userData.passwordHash);
    
    if (!passwordMatch) {
      console.log('❌ Wrong current password for user:', userId);
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password in database
    await admin.database().ref('users/' + userId).update({
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date().toISOString(),
      requiresPasswordChange: false
    });
    
    console.log('✅ Password changed successfully for user:', userId);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password: ' + error.message
    });
  }
});

// ====================
// ENHANCED WALLET & PAYMENT ROUTES
// ====================

// Enhanced Get wallet balance
app.get('/api/wallet/balance', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.uid;
    const userSnapshot = await admin.database().ref('users/' + userId).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      balance: userData.walletBalance || 0 
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch wallet balance' 
    });
  }
});

// Enhanced Get wallet transactions
app.get('/api/wallet/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.uid;
    
    const transactionsSnapshot = await admin.database()
      .ref('transactions')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    const paymentsSnapshot = await admin.database()
      .ref('payments')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');

    const transactions = transactionsSnapshot.val() || {};
    const payments = paymentsSnapshot.val() || {};

    // Combine and format transactions
    let allTransactions = [];

    // Add data purchases (transactions)
    Object.entries(transactions).forEach(([id, transaction]) => {
      allTransactions.push({
        id,
        type: 'purchase',
        description: `${transaction.packageName} - ${transaction.network?.toUpperCase() || ''}`,
        amount: -transaction.amount,
        status: transaction.status || 'success',
        timestamp: transaction.timestamp,
        reference: transaction.reference
      });
    });

    // Add wallet funding (payments)
    Object.entries(payments).forEach(([id, payment]) => {
      allTransactions.push({
        id,
        type: 'funding',
        description: 'Wallet Funding',
        amount: payment.amount,
        status: payment.status || 'success',
        timestamp: payment.timestamp,
        reference: payment.reference
      });
    });

    // Sort by timestamp (newest first) and limit
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    allTransactions = allTransactions.slice(0, 50);

    res.json({
      success: true,
      transactions: allTransactions
    });
  } catch (error) {
    console.error('Error loading wallet transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load transactions'
    });
  }
});

// Enhanced Get user orders
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.uid;
    const limit = parseInt(req.query.limit) || 20; // Default to 20 recent orders
    
    console.log('📦 Fetching orders for user:', userId, 'limit:', limit);
    
    // Try using orderByChild first (faster with index)
    try {
      const transactionsSnapshot = await admin.database()
        .ref('transactions')
        .orderByChild('userId')
        .equalTo(userId)
        .once('value');

      const transactions = transactionsSnapshot.val() || {};

      // Format transactions as orders
      const orders = Object.entries(transactions)
        .map(([id, transaction]) => ({
          id,
          packageName: transaction.packageName || 'Data Package',
          network: transaction.network || 'unknown',
          phoneNumber: transaction.phoneNumber || '',
          amount: transaction.amount || 0,
          volume: transaction.volume || '0MB',
          status: transaction.status || 'processing',
          reference: transaction.reference || '',
          transactionId: transaction.transactionId || transaction.datamartTransactionId || transaction.hubnetTransactionId || '',
          timestamp: transaction.timestamp || new Date().toISOString(),
          reason: transaction.reason || ''
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit); // Limit to most recent N orders

      console.log(`✅ Found ${orders.length} orders using orderByChild`);

      res.json({
        success: true,
        orders: orders,
        count: orders.length
      });
    } catch (indexError) {
      // Fallback: read all transactions and filter client-side
      console.log('⚠️ OrderByChild failed, using fallback method:', indexError.message);
      
      const allTransactionsSnapshot = await admin.database()
        .ref('transactions')
        .limitToLast(500) // Limit to last 500 transactions to avoid loading everything
        .once('value');

      const allTransactions = allTransactionsSnapshot.val() || {};

      // Filter transactions for current user
      const orders = Object.entries(allTransactions)
        .filter(([id, transaction]) => transaction.userId === userId)
        .map(([id, transaction]) => ({
          id,
          packageName: transaction.packageName || 'Data Package',
          network: transaction.network || 'unknown',
          phoneNumber: transaction.phoneNumber || '',
          amount: transaction.amount || 0,
          volume: transaction.volume || '0MB',
          status: transaction.status || 'processing',
          reference: transaction.reference || '',
          transactionId: transaction.transactionId || transaction.datamartTransactionId || transaction.hubnetTransactionId || '',
          timestamp: transaction.timestamp || new Date().toISOString(),
          reason: transaction.reason || ''
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit); // Limit to most recent N orders

      console.log(`✅ Found ${orders.length} orders using fallback method`);

      res.json({
        success: true,
        orders: orders,
        count: orders.length
      });
    }
  } catch (error) {
    console.error('❌ Error loading orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load orders'
    });
  }
});

// Enhanced Paystack wallet funding
app.post('/api/initialize-payment', requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user.uid;
    const email = req.session.user.email;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount' 
      });
    }

    // Calculate Paystack amount (add 3% fee)
    const paystackAmount = Math.ceil(amount * 100 * 1.06);

    const paystackResponse = await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: paystackAmount,
        callback_url: `${process.env.BASE_URL}/payment-callback`,
        metadata: {
          userId: userId,
          purpose: 'wallet_funding',
          originalAmount: amount
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ Paystack initialization successful:', {
      authorizationUrl: paystackResponse.data.data?.authorization_url,
      accessCode: paystackResponse.data.data?.access_code,
      reference: paystackResponse.data.data?.reference,
      status: paystackResponse.data.status,
      amount: paystackAmount,
      originalAmount: amount
    });

    res.json(paystackResponse.data);
  } catch (error) {
    console.error('❌ Paystack initialization error:', {
      message: error.message,
      paystackResponse: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Payment initialization failed',
      details: error.response?.data
    });
  }
});

// Enhanced Verify wallet payment
app.get('/api/verify-payment/:reference', requireAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.session.user.uid;
    
    console.log(`🔍 [VERIFY-PAYMENT] User ${userId} verifying payment: ${reference}`);
    
    // CRITICAL: Check if this payment was ALREADY processed via webhook
    const paymentsRef = admin.database().ref('payments');
    const existingPaymentSnapshot = await paymentsRef
      .orderByChild('reference')
      .equalTo(reference)
      .once('value');
    
    if (existingPaymentSnapshot.exists()) {
      const existingPayments = existingPaymentSnapshot.val();
      const existingPayment = Object.values(existingPayments)[0];
      
      console.log(`⚠️ [VERIFY-PAYMENT] Payment ${reference} already exists in database`);
      console.log(`   Status: ${existingPayment.status}`);
      console.log(`   Source: ${existingPayment.source}`);
      console.log(`   Wallet Credited: ${existingPayment.walletCredited}`);
      
      // If payment was already credited via webhook, don't credit again!
      if (existingPayment.status === 'success' && existingPayment.walletCredited) {
        console.log(`✅ [VERIFY-PAYMENT] Payment already credited via webhook - returning success without double-credit`);
        return res.json({
          success: true,
          message: 'Payment already processed',
          alreadyProcessed: true,
          amount: existingPayment.amount,
          reference: reference
        });
      }
    }
    
    // Payment hasn't been processed yet, proceed with verification and credit
    const paystackResponse = await axios.get(
      `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        },
        timeout: 15000
      }
    );

    const result = paystackResponse.data;
    
    if (result.data.status === 'success') {
      // Get the ORIGINAL amount from metadata
      const originalAmount = result.data.metadata.originalAmount || (result.data.amount / 100);
      const amount = parseFloat(originalAmount);
      
      const userRef = admin.database().ref('users/' + userId);
      const userSnapshot = await userRef.once('value');
      const currentBalance = userSnapshot.val().walletBalance || 0;
      
      // Credit the ORIGINAL amount
      await userRef.update({ 
        walletBalance: currentBalance + amount 
      });

      const paymentRef = admin.database().ref('payments').push();
      await paymentRef.set({
        userId,
        amount: amount,
        paystackAmount: result.data.amount / 100,
        fee: (result.data.amount / 100) - amount,
        reference,
        status: 'success',
        source: 'manual-verify',
        paystackData: result.data,
        walletCredited: true,
        timestamp: new Date().toISOString()
      });

      // Send wallet funding SMS to user
      try {
        const userData = userSnapshot.val() || {};
        const username = userData.displayName || userData.username || userData.name || userData.email || 'Customer';
        const phoneFallback = userData.phone || userData.phoneNumber || '';
        const message = `hello ${username} your DataSell has been credited with ${amount} Thank you for choosing DataSell`;
        sendSmsToUser(userId, phoneFallback, message);
      } catch (smsErr) {
        console.error('Wallet funding SMS error:', smsErr);
      }

      res.json({ 
        success: true, 
        amount: amount,
        newBalance: currentBalance + amount
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Payment failed or pending' 
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Payment verification failed' 
    });
  }
});

// Direct payment callback endpoint (OPTIMIZED for instant credit & fast redirect)
// Rate limit: Allow 1 request per reference to prevent abuse
const callbackRateLimiter = new Map();

app.get('/payment-callback', async (req, res) => {
  const callbackStartTime = Date.now();
  
  try {
    const reference = req.query.reference || req.query.trxref;
    
    if (!reference) {
      console.log('❌ [CALLBACK] No reference found in callback');
      return res.redirect('/');
    }

    // Rate limiting: prevent duplicate processing of same reference
    if (callbackRateLimiter.has(reference)) {
      console.warn(`⚠️ [CALLBACK] Duplicate callback attempt for ref: ${reference}`);
      return res.redirect('/payment-confirmation');
    }
    callbackRateLimiter.set(reference, true);
    setTimeout(() => callbackRateLimiter.delete(reference), 60000); // Clear after 1 minute

    console.log(`🔄 [CALLBACK] Payment callback received for reference: ${reference}`);

    // CRITICAL: Verify payment with Paystack FIRST (most important)
    console.log(`⏱️ [CALLBACK] Starting Paystack verification...`);
    let paystackResponse;
    try {
      paystackResponse = await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          },
          timeout: 10000
        }
      );
    } catch (paystackError) {
      console.error(`❌ [CALLBACK] Paystack verification failed:`, paystackError.message);
      return res.redirect('/payment-confirmation?status=failed');
    }

    const result = paystackResponse.data;
    
    if (result.data.status !== 'success') {
      console.log(`❌ [CALLBACK] Payment status is not success: ${result.data.status}`);
      return res.redirect('/payment-confirmation?status=failed');
    }

    const metadata = result.data.metadata;
    const userId = metadata?.userId;
    const originalAmount = metadata?.originalAmount || (result.data.amount / 100);
    const amount = parseFloat(originalAmount);

    if (!userId) {
      console.error(`❌ [CALLBACK] No userId in metadata for ref: ${reference}`);
      return res.redirect('/payment-confirmation?status=failed');
    }

    console.log(`✅ [CALLBACK] Paystack verified success for ref: ${reference} | User: ${userId} | Amount: ₵${amount}`);

    // STEP 2: Credit wallet IMMEDIATELY (this is the critical operation)
    const userRef = admin.database().ref('users/' + userId);
    
    let currentBalance = 0;
    try {
      const userSnapshot = await userRef.once('value');
      if (!userSnapshot.exists()) {
        console.error(`❌ [CALLBACK] User not found: ${userId}`);
        return res.redirect('/payment-confirmation?status=failed');
      }
      currentBalance = userSnapshot.val().walletBalance || 0;
    } catch (userError) {
      console.error(`❌ [CALLBACK] Error fetching user: ${userError.message}`);
      return res.redirect('/payment-confirmation?status=failed');
    }

    const newBalance = currentBalance + amount;

    // Store confirmation in session immediately (non-blocking)
    req.session.paymentConfirmation = {
      amount: amount,
      userId: userId,
      reference: reference,
      timestamp: new Date().toISOString(),
      source: 'callback_credited'
    };

    // SEND REDIRECT IMMEDIATELY - ULTRA-SHARP (0.1ms delay)
    console.log(`📤 [CALLBACK] SENDING REDIRECT INSTANTLY - All operations running async in background`);
    res.redirect('/payment-confirmation');

    // FIRE-AND-FORGET SMS - Send SMS immediately without any awaits
    // This runs FIRST and doesn't block anything
    (async () => {
      try {
        const userSnapshot = await admin.database().ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val() || {};
        const username = userData.displayName || userData.username || userData.name || userData.firstName || userData.fullName || userData.email || 'User';
        const phoneFallback = userData.phone || userData.phoneNumber || '';
        const smsTime = Date.now();
        const message = `Hi ${username}, GHS${amount.toFixed(2)} has been credited to your Datasell account. Current Balance: GHS${newBalance.toFixed(2)}`;
        // Fire-and-forget SMS - don't await
        sendSmsToUser(userId, phoneFallback, message);
        console.log(`📱 [CALLBACK-SMS] SMS sent immediately at ${Date.now() - smsTime}ms - User: ${username}`);
      } catch (smsErr) {
        console.error(`⚠️ [CALLBACK-SMS] SMS error: ${smsErr.message}`);
      }
    })();

    // WALLET CREDIT IN BACKGROUND - doesn't block redirect or SMS
    (async () => {
      try {
        await userRef.update({
          walletBalance: newBalance,
          lastWalletUpdate: new Date().toISOString(),
          lastWalletCredit: {
            amount: amount,
            reference: reference,
            timestamp: new Date().toISOString()
          }
        });
        const creditTime = Date.now() - callbackStartTime;
        console.log(`✅ [CALLBACK-BG] WALLET CREDITED in ${creditTime}ms`);
      } catch (walletErr) {
        console.error(`⚠️ [CALLBACK-BG] Wallet credit error: ${walletErr.message}`);
      }

      // Save session in background
      req.session.save((err) => {
        if (err) {
          console.error('⚠️ [CALLBACK-BG] Session save error:', err);
        }
      });

      try {
        // Record payment record
        const paymentRef = admin.database().ref('payments').push();
        await paymentRef.set({
          userId,
          userEmail: metadata?.email || result.data.customer?.email,
          amount: amount,
          paystackAmount: result.data.amount / 100,
          fee: (result.data.amount / 100) - amount,
          reference,
          status: 'success',
          source: 'callback',
          paystackData: {
            status: result.data.status,
            authorization: result.data.authorization || {},
            customer: result.data.customer || {},
            created_at: result.data.created_at,
            paid_at: result.data.paid_at
          },
          timestamp: new Date().toISOString()
        });
        console.log(`📝 [CALLBACK-BG] Payment record created for ref: ${reference}`);
      } catch (err) {
        console.error(`⚠️ [CALLBACK-BG] Failed to record payment: ${err.message}`);
      }
    })();

  } catch (error) {
    console.error(`❌ [CALLBACK] Unexpected error:`, {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    res.redirect('/payment-confirmation?status=error');
  }
});

// Payment confirmation page
app.get('/payment-confirmation', (req, res) => {
  const status = req.query.status || 'success';
  const urlAmount = parseFloat(req.query.amount) || null;
  const confirmation = req.session.paymentConfirmation;
  
  // Get amount from session or URL parameter
  const amount = confirmation?.amount || urlAmount;
  
  if (status === 'success' && amount) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful | DataSell</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .confirmation-card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 60px 40px;
            text-align: center;
            max-width: 500px;
            animation: slideUp 0.6s ease-out;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            animation: scaleIn 0.5s ease-out;
          }
          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }
          .success-icon svg {
            width: 50px;
            height: 50px;
            color: white;
            stroke-width: 2;
          }
          h1 {
            color: #1f2937;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .amount {
            font-size: 48px;
            font-weight: 700;
            color: #10b981;
            margin: 20px 0;
          }
          .currency {
            font-size: 28px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            margin: 15px 0;
          }
          .btn-continue {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 15px 60px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 50px;
            margin-top: 30px;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .btn-continue:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
            color: white;
            text-decoration: none;
          }
          .timer {
            color: #9ca3af;
            font-size: 14px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="confirmation-card">
          <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1>Payment Successful!</h1>
          <p>Your wallet has been credited with</p>
          <div class="amount"><span class="currency">₵</span>${amount.toFixed(2)}</div>
          <p>Your funds are now available to use immediately.</p>
          <a href="/dashboard" class="btn btn-continue">Return to Homepage</a>
          <div class="timer">Redirecting in <span id="countdown">5</span> seconds...</div>
        </div>
        
        <script>
          let count = 5;
          const interval = setInterval(() => {
            count--;
            document.getElementById('countdown').textContent = count;
            if (count === 0) {
              clearInterval(interval);
              window.location.href = '/dashboard';
            }
          }, 1000);
        </script>
      </body>
      </html>
    `);
  } else {
    // Failed or error state
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed | DataSell</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .confirmation-card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 60px 40px;
            text-align: center;
            max-width: 500px;
            animation: slideUp 0.6s ease-out;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .error-icon {
            width: 80px;
            height: 80px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
          }
          .error-icon svg {
            width: 50px;
            height: 50px;
            color: white;
          }
          h1 {
            color: #1f2937;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            margin: 15px 0;
          }
          .btn-continue {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 15px 60px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 50px;
            margin-top: 30px;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .btn-continue:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
            color: white;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="confirmation-card">
          <div class="error-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1>Payment Failed</h1>
          <p>We couldn't process your payment. Please try again.</p>
          <a href="/wallet" class="btn btn-continue">Return to Wallet</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Direct payment endpoints removed: application now supports wallet purchases and wallet funding only.

// ====================
// ENHANCED DATA PURCHASE ROUTES
// ====================

// Helper function to map internal network names to DataMart network identifiers
function mapNetworkToDataMart(network) {
  const networkMap = {
    'mtn': 'YELLO',
    'at': 'AT_PREMIUM',
    'airteltigo': 'AT_PREMIUM',
    'vodafone': 'TELECEL',
    'telecel': 'TELECEL'
  };
  return networkMap[network?.toLowerCase()] || network?.toUpperCase();
}

// Helper function to check if DataMart error is due to provider balance
function isProviderBalanceError(datamartData) {
  if (!datamartData) return false;
  
  const message = String(datamartData.message || datamartData.error || '').toLowerCase();
  const details = String(datamartData.details || '').toLowerCase();
  const fullResponse = JSON.stringify(datamartData || {}).toLowerCase();
  
  // Check for common DataMart balance error messages
  const balanceErrorKeywords = [
    'insufficient', 'balance', 'low balance', 'out of stock', 'unavailable', 
    'account balance', 'no stock', 'low', 'rejected', 'insufficient funds'
  ];
  
  // Check if any balance error keyword appears in message, details, or full response
  return balanceErrorKeywords.some(keyword => 
    message.includes(keyword) || 
    details.includes(keyword) ||
    fullResponse.includes(keyword)
  );
}

// ============================================
// PAYSTACK WEBHOOK ENDPOINT - Automatic Payment Confirmation
// ============================================
// This endpoint receives automatic payment notifications from Paystack
// Configure in Paystack Dashboard: Settings > Webhook URL
// Set to: https://datasell.store/api/paystack/webhook
// ============================================
// ULTRA-EFFICIENT PAYSTACK WEBHOOK
// Credits wallet in <500ms, handles notifications async
// ============================================

// TEST ENDPOINT - Verify webhook is reachable
app.get('/api/paystack/webhook/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint is reachable from Paystack',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    baseUrl: process.env.BASE_URL
  });
});

app.post('/api/paystack/webhook', async (req, res) => {
  const webhookStartTime = Date.now();
  
  // CRITICAL: Log webhook arrival immediately
  console.log('🔔🔔🔔 [WEBHOOK RECEIVED] Paystack sent webhook!');
  console.log(`📍 Time: ${new Date().toISOString()}`);
  console.log(`📦 Event: ${req.body?.event}`);
  console.log(`📎 Reference: ${req.body?.data?.reference}`);
  console.log(`💰 Amount: ${req.body?.data?.amount}`);
  console.log(`🧑 User ID: ${req.body?.data?.metadata?.userId}`);
  
  try {
    // Verify webhook signature from Paystack
    const paystackSignature = req.headers['x-paystack-signature'];
    
    if (!paystackSignature) {
      console.error('❌ [WEBHOOK] No x-paystack-signature header present');
      console.log('📋 Headers:', Object.keys(req.headers));
      return res.status(200).json({ success: false, error: 'Missing signature' });
    }
    
    // Use rawBody if available, otherwise stringify the body
    const bodyForSignature = req.rawBody || JSON.stringify(req.body);
    
    if (!bodyForSignature) {
      console.error('❌ [WEBHOOK] No body content to verify');
      return res.status(200).json({ success: false, error: 'No body' });
    }
    
    // Compute HMAC-SHA512 signature
    const crypto = require('crypto');
    
    console.log(`🔐 [WEBHOOK] Verifying signature...`);
    console.log(`   Raw body length: ${bodyForSignature.length}`);
    console.log(`   Signature from header: ${paystackSignature.substring(0, 20)}...`);
    console.log(`   Secret key length: ${process.env.PAYSTACK_SECRET_KEY.length}`);
    
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(bodyForSignature)
      .digest('hex');

    console.log(`   Computed signature: ${hash.substring(0, 20)}...`);
    
    // Verify signature matches
    if (hash !== paystackSignature) {
      console.warn('❌ [WEBHOOK] BLOCKED: Invalid webhook signature from Paystack');
      console.warn(`📝 Expected signature: ${paystackSignature}`);
      console.warn(`📝 Computed signature: ${hash}`);
      console.warn(`🔑 Using secret key ending with: ...${process.env.PAYSTACK_SECRET_KEY.slice(-10)}`);
      console.warn(`📊 Body sample: ${bodyForSignature.substring(0, 100)}...`);
      return res.status(200).json({ success: false, error: 'Invalid signature' });
    }

    const event = req.body.event;
    const data = req.body.data;

    console.log(`🔔 [WEBHOOK] Event: ${event} | Reference: ${data?.reference}`);

    // Only process successful charge events
    if (event === 'charge.success' && data?.status === 'success') {
      const { reference, amount, metadata } = data;
      const userId = metadata?.userId;
      const originalAmount = metadata?.originalAmount || (amount / 100);
      const amountInCedis = parseFloat(originalAmount);

      // Validate required fields
      if (!userId) {
        console.error('❌ [WEBHOOK] No userId in webhook metadata for reference:', reference);
        return res.status(200).json({ success: true, message: 'Missing userId - payment not credited' });
      }

      if (!reference) {
        console.error('❌ [WEBHOOK] No reference in webhook data');
        return res.status(200).json({ success: true, message: 'Missing reference' });
      }

      console.log(`⏱️ [WEBHOOK] Processing payment - Reference: ${reference}, User: ${userId}, Amount: ₵${amountInCedis}`);

      // STEP 1: Record payment IMMEDIATELY with 'processing' status to prevent duplicates
      const paymentsRef = admin.database().ref('payments');
      const existingPaymentSnapshot = await paymentsRef
        .orderByChild('reference')
        .equalTo(reference)
        .once('value');

      if (existingPaymentSnapshot.exists()) {
        console.warn(`⚠️ [WEBHOOK] Duplicate payment detected: ${reference}`);
        return res.status(200).json({ 
          success: true, 
          message: 'Payment already processed',
          duplicate: true,
          processingTime: Date.now() - webhookStartTime + 'ms'
        });
      }

      // Mark payment as being processed to block any concurrent requests
      const tempPaymentRef = admin.database().ref('payments').push();
      const paymentId = tempPaymentRef.key;
      const nowTimestamp = new Date().toISOString();

      await tempPaymentRef.set({
        userId,
        reference,
        amount: amountInCedis,
        status: 'processing',
        source: 'webhook',
        timestamp: nowTimestamp,
        initiatedAt: nowTimestamp
      });

      console.log(`📌 [WEBHOOK] Payment marked as processing: ${paymentId}`);

      // STEP 2: Get user data
      const userRef = admin.database().ref('users/' + userId);
      const userSnapshot = await userRef.once('value');
      
      if (!userSnapshot.exists()) {
        console.error(`❌ [WEBHOOK] User not found: ${userId}`);
        // Mark as failed and remove the processing record
        await tempPaymentRef.remove();
        return res.status(200).json({ success: true, message: 'User not found' });
      }

      const userData = userSnapshot.val();
      const currentBalance = userData.walletBalance || 0;
      const newBalance = currentBalance + amountInCedis;

      // STEP 3: CREDIT THE WALLET IMMEDIATELY (Primary operation - must be fast)
      console.log(`💰 [WEBHOOK] CREDITING WALLET: ${userId} | Old Balance: ₵${currentBalance} → New Balance: ₵${newBalance}`);
      
      await userRef.update({
        walletBalance: newBalance,
        lastWalletUpdate: new Date().toISOString(),
        lastWalletCredit: {
          amount: amountInCedis,
          reference: reference,
          timestamp: new Date().toISOString()
        }
      });

      const walletCreditTime = Date.now() - webhookStartTime;
      console.log(`✅ [WEBHOOK] WALLET CREDITED in ${walletCreditTime}ms for ${userId} - USER IS NOW CREDITED PERMANENTLY IN DATABASE`);

      // STEP 4: Return response immediately to Paystack (wallet is already credited!)
      // This is the critical response - Paystack knows payment succeeded
      const response = {
        success: true,
        message: 'Payment received and wallet credited permanently',
        amount: amountInCedis,
        newBalance: newBalance,
        reference: reference,
        userId: userId,
        processingTime: walletCreditTime + 'ms',
        timestamp: new Date().toISOString()
      };

      console.log(`📤 [WEBHOOK] Sending success response after ${walletCreditTime}ms`);
      
      // Send response immediately
      res.status(200).json(response);

      // STEP 6: Handle all background tasks AFTER response is sent (non-blocking)
      // These execute asynchronously and don't affect response time
      setImmediate(async () => {
        try {
          // Update payment record with full details and mark as complete
          await tempPaymentRef.update({
            status: 'success',
            amount: amountInCedis,
            timestamp: new Date().toISOString(),
            paystackAmount: amount / 100,
            fee: (amount / 100) - amountInCedis,
            paystackData: {
              status: data.status,
              authorization: data.authorization || {},
              customer: data.customer || {},
              created_at: data.created_at,
              paid_at: data.paid_at
            },
            walletCredited: true,
            creditedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          });
          console.log(`✅ [WEBHOOK-ASYNC] Payment record updated for ${reference}`);
        } catch (err) {
          console.error(`⚠️ [WEBHOOK-ASYNC] Failed to update payment: ${err.message}`);
        }

        try {
          // Send SMS notification with deposit confirmation
          const username = userData.displayName || userData.username || userData.name || userData.firstName || userData.fullName || userData.email || 'Customer';
          const phoneFallback = userData.phone || userData.phoneNumber || '';
          const message = `Hi ${username}, GHS${amountInCedis.toFixed(2)} has been credited to your Datasell account. Current Balance: GHS${newBalance.toFixed(2)}`;
          sendSmsToUser(userId, phoneFallback, message);
          console.log(`📱 [WEBHOOK-BG] SMS sent to ${userId} - User: ${username}`);
        } catch (smsErr) {
          console.error(`⚠️ [WEBHOOK-BG] SMS failed: ${smsErr.message}`);
        }

        try {
          // Send in-app notification
          const notificationRef = admin.database().ref('notifications').push();
          await notificationRef.set({
            userId,
            title: '💰 Wallet Funded Successfully',
            message: `Your wallet has been credited with ₵${amountInCedis}`,
            type: 'wallet_funded',
            amount: amountInCedis,
            reference,
            read: false,
            timestamp: new Date().toISOString()
          });
          console.log(`🔔 [WEBHOOK-ASYNC] In-app notification created for ${userId}`);
        } catch (notifErr) {
          console.error(`⚠️ [WEBHOOK-ASYNC] Notification failed: ${notifErr.message}`);
        }

        try {
          // Log the successful webhook processing
          const logsRef = admin.database().ref('webhook_logs').push();
          await logsRef.set({
            event: event,
            reference: reference,
            userId: userId,
            status: 'success',
            amount: amountInCedis,
            walletCreditTime: walletCreditTime,
            totalProcessingTime: Date.now() - webhookStartTime,
            timestamp: new Date().toISOString()
          });
          console.log(`📊 [WEBHOOK-ASYNC] Webhook log recorded for ${reference}`);
        } catch (logErr) {
          console.error(`⚠️ [WEBHOOK-ASYNC] Logging failed: ${logErr.message}`);
        }
      });

      // Don't return here - let execution continue to the end of the try block

    } else if (event === 'charge.success') {
      console.warn(`⚠️ [WEBHOOK] Charge success but status is not 'success': ${data.status}`);
      return res.status(200).json({ success: true, message: 'Non-success charge event ignored' });
    } else {
      console.log(`ℹ️ [WEBHOOK] Non-payment event: ${event}`);
      return res.status(200).json({ success: true, message: 'Event received' });
    }

  } catch (error) {
    console.error(`❌ [WEBHOOK] CRITICAL ERROR:`, {
      message: error.message,
      stack: error.stack,
      processingTime: Date.now() - webhookStartTime + 'ms'
    });

    // Try to log the error to database
    try {
      const logsRef = admin.database().ref('webhook_logs').push();
      await logsRef.set({
        event: 'WEBHOOK_ERROR',
        error: error.message,
        stack: error.stack?.substring(0, 500),
        status: 'failed',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - webhookStartTime
      });
    } catch (logErr) {
      console.error('⚠️ Failed to log webhook error:', logErr);
    }

    // Always return 200 to Paystack to prevent retries
    return res.status(200).json({ 
      success: false, 
      error: 'Webhook processing failed',
      message: error.message,
      processingTime: Date.now() - webhookStartTime + 'ms'
    });
  }
});

// ============================================
// DATAMART WEBHOOK ENDPOINT - Order Status Updates
// Receives real-time order status updates from Datamart
// ============================================
// DATAMART WEBHOOK ENDPOINT - Order Status Updates
// ============================================

// Test endpoint to verify webhook is accessible
app.get('/api/datamart-webhook', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Datamart webhook endpoint is accessible',
    webhook_url: 'https://datasell.store/api/datamart-webhook',
    method: 'POST',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/datamart-webhook', async (req, res) => {
  try {
    const crypto = require('crypto');
    const signature = req.headers['x-datamart-signature'];
    const event = req.headers['x-datamart-event'];
    const payload = req.body;
    const secret = process.env.DATAMART_WEBHOOK_SECRET;

    console.log(`📩 [DATAMART-WEBHOOK] Received event: ${event}`);
    console.log(`📩 [DATAMART-WEBHOOK] Webhook URL: https://datasell.store/api/datamart-webhook`);
    console.log(`📩 [DATAMART-WEBHOOK] Payload:`, JSON.stringify(payload, null, 2));
    console.log(`📩 [DATAMART-WEBHOOK] Signature header:`, signature);

    // Verify signature if present
    if (signature) {
      if (!secret) {
        console.error('❌ [DATAMART-WEBHOOK] DATAMART_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      if (signature !== expected) {
        console.warn(`⚠️ [DATAMART-WEBHOOK] Invalid signature`);
        console.warn(`⚠️ [DATAMART-WEBHOOK] Expected: ${expected}`);
        console.warn(`⚠️ [DATAMART-WEBHOOK] Received: ${signature}`);
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log(`✅ [DATAMART-WEBHOOK] Signature verified`);
    } else {
      console.log(`ℹ️  [DATAMART-WEBHOOK] No signature header - accepting (test webhook)`);
    }

    // Extract data - support both nested and flat payload formats
    const data = payload.data || payload;
    const { orderId, transactionId, phone, network, capacity, price, status } = data;

    // For test webhooks, accept even without transactionId
    if (!transactionId && !event) {
      console.log(`ℹ️  [DATAMART-WEBHOOK] Test webhook with minimal payload - accepted`);
      return res.status(200).json({ received: true, test: true, timestamp: new Date().toISOString() });
    }

    if (event === 'order.completed') {
      console.log(`✅ [DATAMART-WEBHOOK] Order completed: ${transactionId}`);
      
      const transactionsRef = admin.database().ref('transactions');
      const snapshot = await transactionsRef.orderByChild('datamartTransactionId').equalTo(transactionId).once('value');
      
      if (!snapshot.exists()) {
        console.warn(`⚠️ [DATAMART-WEBHOOK] Transaction not found for ID: ${transactionId}`);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      let transactionKey = null;
      let transaction = null;
      snapshot.forEach(child => {
        transactionKey = child.key;
        transaction = child.val();
      });

      await admin.database().ref(`transactions/${transactionKey}`).update({
        status: 'delivered',
        lastSyncedAt: new Date().toISOString(),
        datamartStatus: 'completed'
      });

      console.log(`✅ [DATAMART-WEBHOOK] Updated ${transactionKey} to delivered`);

      try {
        const msg = `✅ Your data order has been delivered successfully! Enjoy your ${capacity}GB of data on ${network}.`;
        await sendSmsToUser(transaction.userId, phone || transaction.phoneNumber, msg);
        console.log(`📱 [DATAMART-WEBHOOK] SMS sent`);
      } catch (smsErr) {
        console.error(`⚠️ [DATAMART-WEBHOOK] SMS failed:`, smsErr.message);
      }

      return res.status(200).json({ received: true, transactionId, timestamp: new Date().toISOString() });

    } else if (event === 'order.failed') {
      console.log(`❌ [DATAMART-WEBHOOK] Order failed: ${transactionId}`);
      
      const transactionsRef = admin.database().ref('transactions');
      const snapshot = await transactionsRef.orderByChild('datamartTransactionId').equalTo(transactionId).once('value');
      
      if (!snapshot.exists()) {
        console.warn(`⚠️ [DATAMART-WEBHOOK] Transaction not found for ID: ${transactionId}`);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      let transactionKey = null;
      let transaction = null;
      snapshot.forEach(child => {
        transactionKey = child.key;
        transaction = child.val();
      });

      await admin.database().ref(`transactions/${transactionKey}`).update({
        status: 'failed',
        lastSyncedAt: new Date().toISOString(),
        datamartStatus: 'failed'
      });

      console.log(`✅ [DATAMART-WEBHOOK] Updated ${transactionKey} to failed`);

      try {
        const amount = transaction.amount;
        const userId = transaction.userId;
        const userRef = admin.database().ref(`users/${userId}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();
        const newBalance = (userData.walletBalance || 0) + amount;
        await userRef.update({ walletBalance: newBalance });
        console.log(`💰 [DATAMART-WEBHOOK] Refunded ₵${amount}`);
      } catch (refundErr) {
        console.error(`⚠️ [DATAMART-WEBHOOK] Refund failed:`, refundErr.message);
      }

      try {
        const msg = `❌ Your data order failed. Your wallet has been refunded. Contact support: 0553843255`;
        await sendSmsToUser(transaction.userId, phone || transaction.phoneNumber, msg);
        console.log(`📱 [DATAMART-WEBHOOK] Failure notification sent`);
      } catch (smsErr) {
        console.error(`⚠️ [DATAMART-WEBHOOK] SMS failed:`, smsErr.message);
      }

      return res.status(200).json({ received: true, transactionId, timestamp: new Date().toISOString() });

    } else if (event === 'order.created') {
      console.log(`✅ [DATAMART-WEBHOOK] Order created: ${transactionId}`);
      
      const transactionsRef = admin.database().ref('transactions');
      const snapshot = await transactionsRef.orderByChild('datamartTransactionId').equalTo(transactionId).once('value');
      
      if (snapshot.exists()) {
        let transactionKey = null;
        snapshot.forEach(child => {
          transactionKey = child.key;
        });
        
        // Mark as pending/processing when created
        await admin.database().ref(`transactions/${transactionKey}`).update({
          lastSyncedAt: new Date().toISOString(),
          datamartStatus: 'pending'
        });
        console.log(`✅ [DATAMART-WEBHOOK] Updated ${transactionKey} status to pending`);
      }
      
      return res.status(200).json({ received: true, transactionId, timestamp: new Date().toISOString() });

    } else {
      console.warn(`⚠️ [DATAMART-WEBHOOK] Unknown event: ${event}`);
      return res.status(200).json({ received: true, event });
    }

  } catch (error) {
    console.error(`❌ [DATAMART-WEBHOOK] Error:`, error.message);
    console.error(`❌ [DATAMART-WEBHOOK] Full error:`, error);
    console.error(`❌ [DATAMART-WEBHOOK] Request body:`, req.body);
    console.error(`❌ [DATAMART-WEBHOOK] Headers:`, req.headers);
    return res.status(200).json({ received: true, error: error.message });
  }
});

// ============================================
// MANUAL PAYMENT VERIFICATION ENDPOINT
// Allows users to manually verify/claim their payment if webhook failed
// ============================================
app.post('/api/verify-and-credit-payment', requireAuth, async (req, res) => {
  try {
    const { reference } = req.body;
    const userId = req.session.user.uid;
    const userEmail = req.session.user.email;
    const userRef = admin.database().ref('users/' + userId);

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference required' });
    }

    // Sanitize reference - only allow alphanumeric and common characters
    const cleanReference = reference.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(cleanReference)) {
      console.warn(`⚠️ [AUTO-VERIFY] Invalid reference format attempt by ${userId}: ${reference}`);
      return res.status(400).json({ success: false, error: 'Invalid reference code format' });
    }

    console.log(`🔍 [AUTO-VERIFY] User ${userId} attempting payment verification for ref: ${cleanReference}`);

    // STEP 1: Check if already credited in our database (FAST PATH - < 0.01s)
    console.log(`⚡ [AUTO-VERIFY] Checking local payments database for reference: ${cleanReference}`);
    const paymentsRef = admin.database().ref('payments');
    const existingPaymentSnapshot = await paymentsRef
      .orderByChild('reference')
      .equalTo(cleanReference)
      .once('value');

    if (existingPaymentSnapshot.exists()) {
      console.log(`✅ [AUTO-VERIFY] Reference already in system (previously credited) for ref: ${cleanReference}`);
      // Get the payment record
      const payments = existingPaymentSnapshot.val();
      const payment = Object.values(payments)[0];
      
      // CRITICAL: Check if the payment belongs to the current user
      if (payment.userId !== userId) {
        console.error(`❌ [AUTO-VERIFY] SECURITY BREACH ATTEMPT: User ${userId} tried to claim payment for user ${payment.userId}`);
        return res.status(403).json({ 
          success: false, 
          error: '❌ Security validation failed. This payment belongs to a different account.'
        });
      }
      
      // If it already belongs to this user and is credited, it means manual admin credited it or it was auto-credited before
      console.log(`✅ [AUTO-VERIFY] Payment already credited to user ${userId}. Balance should be updated.`);
      
      // Fetch current user balance to return accurate info
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();
      
      return res.status(200).json({ 
        success: true, 
        message: `✅ Payment verified! ₵${payment.amount} has been credited to your wallet (previously processed)`,
        amount: payment.amount,
        newBalance: userData.walletBalance || 0,
        reference: cleanReference,
        alreadyCredited: true
      });
    }

    // STEP 2: Verify payment with Paystack - THIS IS THE PRIMARY VALIDATION
    console.log(`🔐 [AUTO-VERIFY] Verifying with Paystack API...`);
    let paystackResponse;
    try {
      paystackResponse = await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${cleanReference}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          },
          timeout: 15000
        }
      );
    } catch (paystackError) {
      console.error(`❌ [AUTO-VERIFY] Paystack API error:`, {
        status: paystackError.response?.status,
        message: paystackError.message,
        data: paystackError.response?.data
      });
      
      // Specific error messages based on Paystack response
      if (paystackError.response?.status === 404) {
        return res.status(400).json({ 
          success: false, 
          error: '❌ Incorrect reference code. Please check your Paystack receipt and try again.'
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        error: '❌ Could not verify payment with provider. Please try again shortly.',
        paystackStatus: paystackError.response?.status
      });
    }

    const paystackData = paystackResponse.data;

    // STRICT VALIDATION: Check if payment status is 'success'
    if (!paystackData.status || paystackData.data?.status !== 'success') {
      console.warn(`⚠️ [AUTO-VERIFY] Paystack shows payment not successful. Status: ${paystackData.data?.status}, Ref: ${cleanReference}`);
      
      const status = paystackData.data?.status || 'unknown';
      if (status === 'failed') {
        return res.status(400).json({ 
          success: false, 
          error: '❌ This payment failed. Please make another payment.'
        });
      } else if (status === 'pending') {
        return res.status(400).json({ 
          success: false, 
          error: '❌ This payment is still pending. Please wait and try again shortly.'
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: `❌ Payment was not successful (Status: ${status}). Only verified payments can be credited.`
        });
      }
    }

    const { amount, metadata, customer } = paystackData.data;
    const originalAmount = metadata?.originalAmount || (amount / 100);
    const amountInCedis = parseFloat(originalAmount);
    const paystackUserId = metadata?.userId;
    const paystackEmail = customer?.email || metadata?.email;
    const paystackTimestamp = paystackData.data?.paid_at;

    // EMAIL VALIDATION: Verify Paystack email matches user account email
    if (paystackEmail && paystackEmail.toLowerCase() !== userEmail.toLowerCase()) {
      console.error(`❌ [AUTO-VERIFY] SECURITY: Email mismatch for ref ${cleanReference}. User: ${userEmail}, Paystack: ${paystackEmail}`);
      return res.status(403).json({ 
        success: false, 
        error: '❌ Email mismatch. The payment was made with a different email address than your account.'
      });
    }

    // TIME WINDOW CHECK: Only allow verification for recent payments (last 24 hours)
    // This prevents very old transactions from being credited multiple times
    if (paystackTimestamp) {
      const paymentDate = new Date(paystackTimestamp);
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      if (paymentDate < twentyFourHoursAgo) {
        console.warn(`⚠️ [AUTO-VERIFY] Payment too old (${paymentDate.toISOString()}) - beyond 24hr window. Ref: ${cleanReference}`);
        return res.status(403).json({ 
          success: false, 
          error: '❌ This payment is older than 24 hours. Automatic creditation is disabled for older payments. Please contact support for manual assistance.'
        });
      }
    }

    // CRITICAL VALIDATION: Verify the reference belongs to the logged-in user
    // Check BOTH userId from metadata AND email address
    if (paystackUserId && paystackUserId !== userId) {
      console.error(`❌ [AUTO-VERIFY] SECURITY: User ${userId} attempted to claim payment for different user ${paystackUserId}`);
      return res.status(403).json({ 
        success: false, 
        error: '❌ Security validation failed. This payment belongs to a different account.'
      });
    }
    
    // Additional layer: if no userId in metadata, email must match (failsafe validation)
    if (!paystackUserId && paystackEmail && paystackEmail.toLowerCase() !== userEmail.toLowerCase()) {
      console.error(`❌ [AUTO-VERIFY] SECURITY: Email doesn't match despite no userId in metadata for ref ${cleanReference}`);
      return res.status(403).json({ 
        success: false, 
        error: '❌ Payment email does not match your account email.'
      });
    }

    // FINAL SAFETY CHECK: Re-verify the reference hasn't been credited between our check and now (race condition prevention)
    const finalCheckSnapshot = await paymentsRef
      .orderByChild('reference')
      .equalTo(cleanReference)
      .once('value');
    
    if (finalCheckSnapshot.exists()) {
      console.warn(`⚠️ [AUTO-VERIFY] RACE CONDITION DETECTED: Reference ${cleanReference} was already credited by another request`);
      const finalPayment = Object.values(finalCheckSnapshot.val())[0];
      
      // If it's the same user, just return success with current balance
      if (finalPayment.userId === userId) {
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();
        return res.status(200).json({
          success: true,
          message: `✅ Payment verified! ₵${finalPayment.amount} has been credited to your wallet`,
          amount: finalPayment.amount,
          newBalance: userData.walletBalance || 0,
          reference: cleanReference
        });
      }
      
      return res.status(409).json({ 
        success: false, 
        error: '❌ This reference code was just verified by another request. Please refresh and check your balance.'
      });
    }

    // Get user data
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      console.error(`❌ [MANUAL-VERIFY] User not found: ${userId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userSnapshot.val();
    const currentBalance = userData.walletBalance || 0;
    const newBalance = currentBalance + amountInCedis;

    // CREDIT THE WALLET
    console.log(`💰 [AUTO-VERIFY] AUTO-CREDITING WALLET: ${userId} | Amount: ₵${amountInCedis} | Reference: ${cleanReference}`);
    
    await userRef.update({
      walletBalance: newBalance,
      lastWalletUpdate: new Date().toISOString(),
      lastWalletCredit: {
        amount: amountInCedis,
        reference: cleanReference,
        timestamp: new Date().toISOString()
      }
    });

    // Record the payment
    const paymentRef = admin.database().ref('payments').push();
    await paymentRef.set({
      userId,
      userEmail: userEmail,
      amount: amountInCedis,
      paystackAmount: amount / 100,
      fee: (amount / 100) - amountInCedis,
      reference: cleanReference,
      status: 'success',
      source: 'automatic_verification',
      autoVerified: true,
      autoVerificationTime: new Date().toISOString(),
      paystackData: paystackData.data,
      timestamp: new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    });

    console.log(`✅ [AUTO-VERIFY] Payment auto-credited for ${userId} | Ref: ${cleanReference} | Amount: ₵${amountInCedis}`);

    // Send notifications async
    setImmediate(async () => {
      try {
        const username = userData.displayName || userData.username || userData.email || 'Customer';
        const phoneFallback = userData.phone || userData.phoneNumber || '';
        const message = `Hello ${username}, your payment of ₵${amountInCedis} has been verified and credited to your wallet!`;
        sendSmsToUser(userId, phoneFallback, message);
      } catch (err) {
        console.error(`⚠️ [AUTO-VERIFY] SMS error:`, err.message);
      }
    });

    return res.status(200).json({
      success: true,
      message: '✅ Payment verified! ₵' + amountInCedis + ' added to your wallet',
      amount: amountInCedis,
      newBalance: newBalance,
      reference: cleanReference
    });

  } catch (error) {
    console.error(`❌ [AUTO-VERIFY] Error:`, {
      message: error.message,
      stack: error.stack,
      paystackError: error.response?.data
    });

    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Payment verification failed. Please try again.',
      details: error.response?.data
    });
  }
});

// Enhanced Get packages
app.get('/api/packages/:network', requireAuth, async (req, res) => {
  try {
    const { network } = req.params;
    
    if (!['mtn', 'at'].includes(network)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid network' 
      });
    }

    // Use cache if available, otherwise fetch from database
    if (!packageCache[network] || packageCache[network].length === 0) {
      const packagesSnapshot = await admin.database().ref('packages/' + network).once('value');
      const packages = packagesSnapshot.val() || {};
      const packagesArray = Object.values(packages).filter(pkg => pkg.active !== false);
      
      packagesArray.sort((a, b) => {
        const getVolume = (pkg) => {
          if (pkg.name) {
            const volumeMatch = pkg.name.match(/\d+/);
            return volumeMatch ? parseInt(volumeMatch[0]) : 0;
          }
          return 0;
        };
        return getVolume(a) - getVolume(b);
      });
      
      packageCache[network] = packagesArray;
    }
    
    res.json({ 
      success: true, 
      packages: packageCache[network] || []
    });
  } catch (error) {
    console.error('Packages fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch packages' 
    });
  }
});

// Enhanced Purchase with wallet
app.post('/api/purchase-data', requireAuth, async (req, res) => {
  let transactionRef = null;
  
  try {
    const { network, volume, phoneNumber, amount, packageName } = req.body;
    const userId = req.session.user.uid;
    
    console.log('🔄 Purchase request received:', { network, volume, phoneNumber, amount, packageName });

    // Validation
    if (!network || !volume || !phoneNumber || !amount || !packageName) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number must be 10 digits' 
      });
    }

    // 🚫 CHECK IF TARGET PHONE IS BLOCKED (NEW)
    const phoneValidation = await validatePhoneOrder(phoneNumber);
    if (!phoneValidation.valid) {
      console.warn(`⚠️ Attempt to purchase data to blocked phone: ${phoneNumber} by user ${userId}`);
      await logBlockedPhoneAttempt(phoneNumber, 'order', userId, {
        network: network,
        amount: amount,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({ 
        success: false, 
        error: phoneValidation.error 
      });
    }

    // Convert volume to GB for DataMart (they expect capacity in GB)
    let volumeValue = volume;
    let capacityGB = volumeValue;
    if (volumeValue && parseInt(volumeValue) >= 100) {
      // If volume is in MB, convert to GB
      capacityGB = (parseInt(volumeValue) / 1000).toString();
      console.log(`🔢 VOLUME CONVERTED: ${volume}MB → ${capacityGB}GB`);
    }

    const userRef = admin.database().ref('users/' + userId);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get user tier and calculate discount
    const userTier = userData.pricingGroup || 'regular';
    const tierDiscounts = {
      'regular': 0,
      'premium': 5,
      'vip': 10
    };
    const discountPercent = tierDiscounts[userTier] || 0;
    const discountAmount = (amount * discountPercent) / 100;
    const finalAmount = amount - discountAmount;
    
    console.log(`💳 [PRICING] User tier: ${userTier}, Discount: ${discountPercent}%, Original: ₵${amount}, Discount: ₵${discountAmount.toFixed(2)}, Final: ₵${finalAmount.toFixed(2)}`);

    if (userData.walletBalance < finalAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient wallet balance',
        required: finalAmount.toFixed(2),
        available: userData.walletBalance.toFixed(2)
      });
    }

    const reference = `DS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create order record first
    transactionRef = admin.database().ref('transactions').push();
    const transactionId = transactionRef.key; // Get the Firebase ID
    
    const initialOrderData = {
      userId,
      network,
      packageName,
      volume: volumeValue,
      phoneNumber,
      amount: finalAmount,
      originalAmount: amount,
      discountPercent: discountPercent,
      discountAmount: discountAmount,
      userTier: userTier,
      status: 'processing',
      datamartStatus: 'processing',
      reference: reference,
      transactionId: null,
      datamartTransactionId: null,
      datamartResponse: null,
      datamartConfirmed: false,
      timestamp: new Date().toISOString(),
      paymentMethod: 'wallet'
    };
    
    await transactionRef.set(initialOrderData);
    console.log('✅ Order record created in Firebase:', {
      firebaseId: transactionId,
      reference: reference,
      userId: userId,
      network: network,
      packageName: packageName,
      amount: amount
    });

    // Notify user that payment/order is received and processing
    try {
      const notifyMsg = `Order received. Your ${packageName} will be delivered to ${phoneNumber} within 1 to 30 minutes. If any troubles contact support on datasellgh@gmail.com`;
      await sendSmsToUser(userId, phoneNumber, notifyMsg);
      console.log('📩 Order-created SMS sent for transaction', transactionId);
    } catch (smsErr) {
      console.error('❌ Failed to send order-created SMS for', transactionId, smsErr);
    }

    // Map network to DataMart format
    const datamartNetwork = mapNetworkToDataMart(network);
    
    // DataMart API call
    const datamartResponse = await axios.post(
      'https://api.datamartgh.shop/api/developer/purchase',
      {
        phoneNumber: phoneNumber,
        network: datamartNetwork,
        capacity: capacityGB,
        gateway: 'wallet'
      },
      {
        headers: {
          'X-API-Key': process.env.DATAMART_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const datamartData = datamartResponse.data;
    console.log('📡 DataMart response:', datamartData);
    console.log('📡 DataMart response full:', JSON.stringify(datamartData, null, 2));

    // Handle DataMart response structure
    if (datamartData.status === 'success' && datamartData.data) {
      // SUCCESS: Deduct balance (using discounted amount) and update order
      const newBalance = userData.walletBalance - finalAmount;
      await userRef.update({ walletBalance: newBalance });

      const purchaseData = datamartData.data;
      await transactionRef.update({
        status: 'success',
        transactionId: purchaseData.purchaseId || purchaseData.transactionReference,
        datamartTransactionId: purchaseData.purchaseId || purchaseData.transactionReference,
        datamartResponse: purchaseData
      });

      console.log('✅ Purchase successful, order updated to success:', {
        reference: reference,
        transactionId: purchaseData.purchaseId || purchaseData.transactionReference,
        newBalance: newBalance,
        originalAmount: amount,
        discountApplied: discountAmount.toFixed(2),
        paidAmount: finalAmount.toFixed(2)
      });

      res.json({ 
        success: true, 
        data: purchaseData,
        newBalance: newBalance,
        reference: reference,
        message: 'Data purchase successful!',
        pricingInfo: {
          userTier: userTier,
          originalPrice: amount,
          discountPercent: discountPercent,
          discountAmount: discountAmount.toFixed(2),
          paidAmount: finalAmount.toFixed(2)
        }
      });
    } else {
      // FAILURE: Update order status but DON'T deduct balance
      await transactionRef.update({
        status: 'failed',
        datamartResponse: datamartData,
        reason: datamartData.message || 'Purchase failed'
      });

      console.log('❌ Purchase failed, order updated to failed');

      // Check if it's a provider balance issue
      const isOutOfStock = isProviderBalanceError(datamartData);
      console.log('🔍 Balance error check:', { isOutOfStock, datamartData });
      const errorMessage = isOutOfStock ? 'Out of Stock - Please try again later' : (datamartData.message || 'Purchase failed');

      res.status(400).json({ 
        success: false, 
        error: errorMessage,
        isOutOfStock: isOutOfStock
      });
    }

  } catch (error) {
    console.error('❌ Purchase error:', error);
    
    // Check if it's an Axios error with response data (e.g., 400 from DataMart)
    if (error.response && error.response.data) {
      const datamartErrorData = error.response.data;
      console.log('📡 DataMart error response:', datamartErrorData);
      
      if (transactionRef) {
        await transactionRef.update({
          status: 'failed',
          datamartResponse: datamartErrorData,
          reason: datamartErrorData.message || 'DataMart error'
        });
      }
      
      // Check if it's a provider balance issue
      const isOutOfStock = isProviderBalanceError(datamartErrorData);
      console.log('🔍 Balance error check (from catch):', { isOutOfStock, datamartErrorData });
      
      // Provide clearer error messages
      let errorMessage;
      if (isOutOfStock) {
        // Check if it's specifically a provider wallet balance issue
        if (datamartErrorData.message?.toLowerCase().includes('insufficient wallet balance') || 
            datamartErrorData.message?.toLowerCase().includes('insufficient balance')) {
          errorMessage = 'Service temporarily unavailable - Provider balance issue. Please try again later or contact support.';
        } else {
          errorMessage = 'Out of Stock - Please try again later';
        }
      } else {
        errorMessage = datamartErrorData.message || 'Purchase failed';
      }
      
      return res.status(400).json({ 
        success: false, 
        error: errorMessage,
        isOutOfStock: isOutOfStock,
        details: process.env.NODE_ENV !== 'production' ? datamartErrorData : undefined
      });
    }
    
    // Handle other errors
    if (transactionRef) {
      await transactionRef.update({
        status: 'failed',
        datamartResponse: { error: error.message },
        reason: 'System error: ' + error.message
      });
    }
    
    let errorMessage = 'Purchase failed';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. Please check your connection and try again.';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// ====================
// REFUND WALLET ON FAILED PURCHASE
// ====================

async function refundWallet(userId, amount) {
  try {
    const userRef = admin.database().ref(`users/${userId}`);
    const userSnap = await userRef.once('value');
    const user = userSnap.val();

    if (!user) {
      console.error(`User ${userId} not found. Refund failed.`);
      return;
    }

    const updatedBalance = (user.walletBalance || 0) + amount;
    await userRef.update({ walletBalance: updatedBalance });

    console.log(`Refunded ₵${amount} to user ${userId}. New balance: ₵${updatedBalance}`);
  } catch (error) {
    console.error(`Failed to refund ₵${amount} to user ${userId}:`, error);
  }
}

// Example route for purchase
app.post('/api/purchase', async (req, res) => {
  const { userId, amount, purchaseDetails } = req.body;

  try {
    // Deduct wallet balance
    const userRef = admin.database().ref(`users/${userId}`);
    const userSnap = await userRef.once('value');
    const user = userSnap.val();

    if (!user || user.walletBalance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    const newBalance = user.walletBalance - amount;
    await userRef.update({ walletBalance: newBalance });

    console.log(`Deducted ₵${amount} from user ${userId}. New balance: ₵${newBalance}`);

    // Simulate purchase process
    const purchaseSuccess = Math.random() > 0.2; // 80% success rate for simulation

    if (purchaseSuccess) {
      // Handle successful purchase
      console.log(`Purchase successful for user ${userId}`);
      return res.json({ success: true, message: 'Purchase completed successfully' });
    } else {
      // Refund on failure
      console.log(`Purchase failed for user ${userId}. Refunding ₵${amount}...`);
      await refundWallet(userId, amount);
      return res.status(500).json({ success: false, error: 'Purchase failed. Amount refunded to wallet.' });
    }
  } catch (error) {
    console.error('Error during purchase:', error);
    return res.status(500).json({ success: false, error: 'An error occurred during the purchase process.' });
  }
});

// ====================
// ADDITIONAL ADMIN ENDPOINTS
// ====================

// Admin Packages Management
// Update package price
app.post('/api/admin/packages/update-price', requireAdmin, async (req, res) => {
  try {
    const { network, packageId, newPrice } = req.body;
    
    console.log('🔄 Updating package:', { network, packageId, newPrice });

    if (!network || !packageId || !newPrice) {
      return res.status(400).json({ 
        success: false, 
        error: 'Network, packageId, and newPrice are required' 
      });
    }

    const packagesRef = admin.database().ref(`packages/${network}`);
    const packagesSnapshot = await packagesRef.once('value');
    const packages = packagesSnapshot.val() || {};
    
    let packageKey = packageId;
    
    // Remove network prefix if present
    if (packageId.startsWith('mtn-')) {
      packageKey = packageId.replace('mtn-', '');
    } else if (packageId.startsWith('at-')) {
      packageKey = packageId.replace('at-', '');
    }
    
    // Check if package exists
    if (!packages[packageKey]) {
      return res.status(404).json({ 
        success: false, 
        error: `Package not found. Available packages: ${Object.keys(packages).join(', ')}` 
      });
    }

    const oldPrice = packages[packageKey].price;
    const packageName = packages[packageKey].name;

    // Update the price
    await admin.database().ref(`packages/${network}/${packageKey}`).update({
      price: parseFloat(newPrice)
    });

    // Update cache
    if (packageCache[network]) {
      const packageIndex = packageCache[network].findIndex(pkg => pkg.id === packageKey);
      if (packageIndex !== -1) {
        packageCache[network][packageIndex].price = parseFloat(newPrice);
      }
    }

    // Log admin action
    const logRef = admin.database().ref('adminLogs').push();
    await logRef.set({
      adminId: req.session.user.uid,
      action: 'update_package_price',
      targetPackage: packageKey,
      details: `Updated ${network} package ${packageName} from ₵${oldPrice} to ₵${newPrice}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: `"${packageName}" price updated to ₵${newPrice}`,
      oldPrice: oldPrice,
      newPrice: parseFloat(newPrice),
      packageName: packageName
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle package active status
app.post('/api/admin/packages/toggle-active', requireAdmin, async (req, res) => {
  try {
    const { network, packageId } = req.body;
    
    if (!network || !packageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Network and packageId are required' 
      });
    }

    const packageRef = admin.database().ref(`packages/${network}/${packageId}`);
    const packageSnapshot = await packageRef.once('value');
    
    if (!packageSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const currentStatus = packageSnapshot.val().active !== false;
    await packageRef.update({ active: !currentStatus });

    // Update cache
    if (packageCache[network]) {
      const packageIndex = packageCache[network].findIndex(pkg => pkg.id === packageId);
      if (packageIndex !== -1) {
        packageCache[network][packageIndex].active = !currentStatus;
      }
    }

    // Log admin action
    const logRef = admin.database().ref('adminLogs').push();
    await logRef.set({
      adminId: req.session.user.uid,
      action: 'toggle_package_status',
      targetPackage: packageId,
      details: `Package ${!currentStatus ? 'activated' : 'deactivated'}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: `Package ${!currentStatus ? 'activated' : 'deactivated'}`,
      active: !currentStatus
    });
  } catch (error) {
    console.error('Toggle package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new package
app.post('/api/admin/packages/create', requireAdmin, async (req, res) => {
  try {
    const { network, id, name, price, validity, active } = req.body;

    if (!network || !id || !name || price === undefined) {
      return res.status(400).json({ success: false, error: 'network, id, name and price are required' });
    }

    const packageRef = admin.database().ref(`packages/${network}/${id}`);
    const snap = await packageRef.once('value');
    if (snap.exists()) {
      return res.status(400).json({ success: false, error: 'Package with that id already exists' });
    }

    const payload = {
      name,
      price: parseFloat(price),
      validity: validity || null,
      active: active === false ? false : true,
      createdAt: new Date().toISOString()
    };

    await packageRef.set(payload);

    // Update cache if present
    if (packageCache[network]) {
      packageCache[network].push({ id, ...payload });
    }

    // Log admin action
    const logRef = admin.database().ref('adminLogs').push();
    await logRef.set({
      adminId: req.session.user.uid,
      action: 'create_package',
      targetPackage: id,
      details: `Created package ${id} (${name}) on ${network}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ success: true, message: 'Package created successfully', package: { id, ...payload } });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a package
app.post('/api/admin/packages/delete', requireAdmin, async (req, res) => {
  try {
    const { network, packageId } = req.body;

    if (!network || !packageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Network and packageId are required' 
      });
    }

    const packageRef = admin.database().ref(`packages/${network}/${packageId}`);
    const packageSnapshot = await packageRef.once('value');
    
    if (!packageSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const packageData = packageSnapshot.val();
    const packageName = packageData.name;

    // Delete the package
    await packageRef.remove();

    // Update cache
    if (packageCache[network]) {
      packageCache[network] = packageCache[network].filter(pkg => pkg.id !== packageId);
    }

    // Log admin action
    const logRef = admin.database().ref('adminLogs').push();
    await logRef.set({
      adminId: req.session.user.uid,
      action: 'delete_package',
      targetPackage: packageId,
      details: `Deleted package ${packageId} (${packageName}) from ${network}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: `Package "${packageName}" deleted successfully`
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Packages Management
app.get('/api/admin/packages', requireAdmin, async (req, res) => {
  try {
    const { network } = req.query;
    
    let packages = [];
    
    if (network && network !== 'all') {
      // Get packages for specific network
      const networkPath = network === 'airteltigo' || network === 'at' ? 'at' : network;
      const packagesSnapshot = await admin.database().ref(`packages/${networkPath}`).once('value');
      const data = packagesSnapshot.val();
      console.log(`📦 Admin fetching network=${network}, path=packages/${networkPath}, data type: ${typeof data}, null: ${data === null}, keys: ${data ? Object.keys(data).length : 0}`);
      packages = Object.entries(data || {}).map(([id, pkg]) => ({
        id,
        network: networkPath,
        ...pkg
      }));
    } else {
      // Get all packages from both networks
      const mtnSnapshot = await admin.database().ref('packages/mtn').once('value');
      const atSnapshot = await admin.database().ref('packages/at').once('value');
      
      const mtnData = mtnSnapshot.val();
      const atData = atSnapshot.val();
      
      console.log(`📦 Admin fetching all packages - MTN: ${mtnData ? Object.keys(mtnData).length : 0}, AT: ${atData ? Object.keys(atData).length : 0}`);
      
      Object.entries(mtnData || {}).forEach(([id, pkg]) => {
        packages.push({
          id,
          network: 'mtn',
          ...pkg
        });
      });
      
      Object.entries(atData || {}).forEach(([id, pkg]) => {
        packages.push({
          id,
          network: 'at',
          ...pkg
        });
      });
    }
    
    // Sort by network and name
    packages.sort((a, b) => {
      if (a.network !== b.network) return a.network.localeCompare(b.network);
      return (a.name || '').localeCompare(b.name || '');
    });
    
    console.log(`✅ Admin packages fetched: ${packages.length} packages found`);
    
    res.json({ 
      success: true, 
      packages,
      count: packages.length
    });
  } catch (error) {
    console.error('❌ Admin packages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Transactions Management
app.get('/api/admin/transactions', requireAdmin, async (req, res) => {
  try {
    const { status, network, dateFrom, dateTo, search, limit } = req.query;
    
    const transactionsSnapshot = await admin.database().ref('transactions').once('value');
    const usersSnapshot = await admin.database().ref('users').once('value');
    
    let transactions = Object.entries(transactionsSnapshot.val() || {}).map(([id, transaction]) => ({
      id,
      ...transaction
    }));

    const users = usersSnapshot.val() || {};

    // Apply filters
    let filteredTransactions = transactions;

    if (status && status !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.status === status);
    }
    
    if (network && network !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.network === network);
    }
    
    if (dateFrom) {
      filteredTransactions = filteredTransactions.filter(t => 
        new Date(t.timestamp) >= new Date(dateFrom)
      );
    }
    
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter(t => 
        new Date(t.timestamp) <= endDate
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        t.phoneNumber?.includes(search) ||
        t.reference?.includes(search) ||
        t.packageName?.toLowerCase().includes(searchLower) ||
        t.userId?.includes(search)
      );
    }

    // Apply limit if specified
    if (limit) {
      filteredTransactions = filteredTransactions.slice(0, parseInt(limit));
    }

    // Add user information to transactions
    const transactionsWithUsers = filteredTransactions.map(transaction => {
      const user = users[transaction.userId];
      return {
        ...transaction,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        userEmail: user?.email || 'N/A'
      };
    });

    // Sort by timestamp (newest first)
    transactionsWithUsers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, transactions: transactionsWithUsers });
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction details
app.get('/api/admin/transactions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const transactionSnapshot = await admin.database().ref(`transactions/${id}`).once('value');
    const transaction = transactionSnapshot.val();

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const userSnapshot = await admin.database().ref(`users/${transaction.userId}`).once('value');
    const user = userSnapshot.val();

    res.json({
      success: true,
      transaction: {
        id,
        ...transaction,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        userEmail: user?.email || 'N/A'
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Refund transaction
app.post('/api/admin/transactions/:id/refund', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transactionSnapshot = await admin.database().ref(`transactions/${id}`).once('value');
    const transaction = transactionSnapshot.val();

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.status === 'refunded') {
      return res.status(400).json({ success: false, error: 'Transaction already refunded' });
    }

    // Update transaction status
    await admin.database().ref(`transactions/${id}`).update({
      status: 'refunded',
      refundedAt: new Date().toISOString(),
      refundReason: reason || 'Admin refund'
    });

    // Refund amount to user wallet
    const userSnapshot = await admin.database().ref(`users/${transaction.userId}`).once('value');
    const user = userSnapshot.val();

    if (user) {
      await admin.database().ref(`users/${transaction.userId}`).update({
        walletBalance: (user.walletBalance || 0) + transaction.amount,
        updatedAt: new Date().toISOString()
      });
    }

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'refund_transaction',
      details: `Refunded transaction ${id} for user ${transaction.userId.substring(0, 8)}...`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ success: true, message: 'Transaction refunded successfully' });
  } catch (error) {
    console.error('Refund transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle transaction delivery status
app.post('/api/admin/transactions/:id/toggle-delivery', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const transactionSnapshot = await admin.database().ref(`transactions/${id}`).once('value');
    const transaction = transactionSnapshot.val();

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const newDeliveredStatus = !transaction.delivered;
    await admin.database().ref(`transactions/${id}`).update({
      delivered: newDeliveredStatus,
      deliveredAt: newDeliveredStatus ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'toggle_delivery',
      details: `${newDeliveredStatus ? 'Marked' : 'Unmarked'} transaction ${id} as ${newDeliveredStatus ? 'delivered' : 'pending'}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: newDeliveredStatus ? 'Marked as delivered' : 'Marked as pending'
    });
  } catch (error) {
    console.error('Toggle delivery error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Pricing Groups
app.get('/api/admin/pricing', requireAdmin, async (req, res) => {
  try {
    const pricingSnapshot = await admin.database().ref('pricingGroups').once('value');
    const pricing = pricingSnapshot.val() || {
      regular: { discount: 0, name: 'Regular Users' },
      vip: { discount: 10, name: 'VIP Users' },
      premium: { discount: 15, name: 'Premium Users' }
    };

    // Flatten for easier frontend access
    const flatPricing = {
      regular: pricing.regular?.discount || 0,
      vip: pricing.vip?.discount || 10,
      premium: pricing.premium?.discount || 15
    };

    res.json({ success: true, pricing: flatPricing });
  } catch (error) {
    console.error('Pricing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/pricing/groups', requireAdmin, async (req, res) => {
  try {
    const pricingSnapshot = await admin.database().ref('pricingGroups').once('value');
    const pricing = pricingSnapshot.val() || {
      regular: { discount: 0, name: 'Regular Users' },
      vip: { discount: 10, name: 'VIP Users' },
      premium: { discount: 15, name: 'Premium Users' }
    };

    res.json({ success: true, pricingGroups: pricing });
  } catch (error) {
    console.error('Pricing groups error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pricing group discounts
app.post('/api/admin/pricing/groups/update', requireAdmin, async (req, res) => {
  try {
    const { group, discount } = req.body;
    
    if (!group || discount === undefined || discount < 0 || discount > 100) {
      return res.status(400).json({ success: false, error: 'Invalid group or discount value' });
    }

    await admin.database().ref(`pricingGroups/${group}`).update({
      discount: parseFloat(discount),
      updatedAt: new Date().toISOString()
    });

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'update_pricing_group',
      details: `Updated ${group} group discount to ${discount}%`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ success: true, message: `${group} group discount updated to ${discount}%` });
  } catch (error) {
    console.error('Update pricing group error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user pricing group
app.post('/api/admin/users/:uid/update-role', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    if (!role || !['regular', 'vip', 'premium'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid pricing group' });
    }

    await admin.database().ref(`users/${uid}`).update({
      pricingGroup: role,
      updatedAt: new Date().toISOString()
    });

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'update_user_role',
      details: `Changed user ${uid.substring(0, 8)}... pricing group to ${role}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ success: true, message: `User pricing group updated to ${role}` });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle user suspension
app.post('/api/admin/users/:uid/toggle-suspend', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    
    const userSnapshot = await admin.database().ref(`users/${uid}`).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newSuspended = !user.suspended;
    await admin.database().ref(`users/${uid}`).update({
      suspended: newSuspended,
      suspendedAt: newSuspended ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: newSuspended ? 'suspend_user' : 'activate_user',
      details: `${newSuspended ? 'Suspended' : 'Activated'} user ${uid.substring(0, 8)}...`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: newSuspended ? 'User suspended' : 'User activated'
    });
  } catch (error) {
    console.error('Toggle suspension error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add funds to user wallet
app.post('/api/admin/users/:uid/add-funds', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { amount, note } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const userSnapshot = await admin.database().ref(`users/${uid}`).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newBalance = (user.walletBalance || 0) + parseFloat(amount);
    
    await admin.database().ref(`users/${uid}`).update({
      walletBalance: newBalance,
      updatedAt: new Date().toISOString()
    });

    // Log transaction
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'add_funds',
      details: `Added ₵${amount} to user ${uid.substring(0, 8)}... wallet. Note: ${note || 'N/A'}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Record in transactions
    await admin.database().ref('transactions').push({
      userId: uid,
      type: 'admin_fund',
      amount: parseFloat(amount),
      description: `Admin added funds: ${note || 'No note'}`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });

    res.json({ success: true, message: `₵${amount} added to user wallet` });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deduct funds from user wallet
app.post('/api/admin/users/:uid/deduct-funds', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { amount, note } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const userSnapshot = await admin.database().ref(`users/${uid}`).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newBalance = Math.max(0, (user.walletBalance || 0) - parseFloat(amount));
    
    await admin.database().ref(`users/${uid}`).update({
      walletBalance: newBalance,
      updatedAt: new Date().toISOString()
    });

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'deduct_funds',
      details: `Deducted ₵${amount} from user ${uid.substring(0, 8)}... wallet. Note: ${note || 'N/A'}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Record in transactions
    await admin.database().ref('transactions').push({
      userId: uid,
      type: 'admin_deduction',
      amount: parseFloat(amount),
      description: `Admin deducted funds: ${note || 'No note'}`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });

    res.json({ success: true, message: `₵${amount} deducted from user wallet` });
  } catch (error) {
    console.error('Deduct funds error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle User Pricing Tier (Regular/Premium/VIP)
app.post('/api/admin/users/:uid/set-tier', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { tier } = req.body;

    // Define available tiers with their discounts
    const tiers = {
      'regular': { discount: 0, displayName: 'Regular' },
      'premium': { discount: 5, displayName: 'Premium (5% Discount)' },
      'vip': { discount: 10, displayName: 'VIP (10% Discount)' }
    };

    if (!tier || !tiers[tier]) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tier. Must be: regular, premium, or vip' 
      });
    }

    const userSnapshot = await admin.database().ref(`users/${uid}`).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const oldTier = user.pricingGroup || 'regular';
    const tierInfo = tiers[tier];

    // Update user tier
    await admin.database().ref(`users/${uid}`).update({
      pricingGroup: tier,
      pricingTierUpdatedAt: new Date().toISOString(),
      pricingTierDiscount: tierInfo.discount
    });

    // Log admin action
    await admin.database().ref('adminLogs').push({
      adminId: req.session.user?.uid || 'system',
      action: 'set_user_tier',
      details: `Changed user ${uid.substring(0, 8)}... tier from "${oldTier}" to "${tier}" (${tierInfo.discount}% discount)`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: `User tier updated to ${tierInfo.displayName}`,
      tier: tier,
      discount: tierInfo.discount
    });
  } catch (error) {
    console.error('Set tier error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin System Status
app.get('/api/admin/system/status', requireAdmin, async (req, res) => {
  try {
    const usersSnapshot = await admin.database().ref('users').once('value');
    const transactionsSnapshot = await admin.database().ref('transactions').once('value');
    
    // Count successful transactions in last 24 hours
    const transactions = transactionsSnapshot.val() || {};
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTransactions = Object.values(transactions).filter(t => 
      new Date(t.timestamp || 0).getTime() > oneDayAgo
    ).length;
    
    const successfulTransactions = Object.values(transactions).filter(t => 
      t.status === 'completed' && new Date(t.timestamp || 0).getTime() > oneDayAgo
    ).length;
    const successRate = recentTransactions > 0 ? Math.round((successfulTransactions / recentTransactions) * 100) : 0;

    const systemStatus = {
      datamart: {
        status: 'online',
        message: 'Connected'
      },
      paystack: {
        status: 'online',
        message: 'Connected'
      },
      successRate: successRate,
      recentTransactions: recentTransactions,
      packageCache: {
        mtnCount: packageCache.mtn.length,
        atCount: packageCache.at.length,
        lastUpdated: packageCache.lastUpdated
      },
      server: {
        status: 'online',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      },
      stats: {
        totalUsers: Object.keys(usersSnapshot.val() || {}).length,
        totalTransactions: Object.keys(transactions).length
      }
    };

    res.json({ success: true, systemStatus: systemStatus });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Security Logs
app.get('/api/admin/security/logs', requireAdmin, async (req, res) => {
  try {
    const logsSnapshot = await admin.database().ref('adminLogs').once('value');
    const logs = logsSnapshot.val() || {};
    
    const logsArray = Object.entries(logs)
      .map(([id, log]) => ({ id, ...log }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100); // Return last 100 logs

    res.json({ success: true, logs: logsArray });
  } catch (error) {
    console.error('Security logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ DIAGNOSTIC ENDPOINT ============
// Check which users exist in DB vs Firebase Auth
app.get('/api/admin/diagnostic-users', requireAuth, async (req, res) => {
  try {
    // Only allow admin
    if (req.session.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    // Get all users from database
    const dbSnapshot = await admin.database().ref('users').once('value');
    const dbUsers = dbSnapshot.val() || {};
    const dbUsersList = Object.entries(dbUsers).map(([uid, user]) => ({
      uid,
      email: user.email,
      firstName: user.firstName,
      walletBalance: user.walletBalance
    }));

    // Get all users from Firebase Auth
    const authUsers = [];
    let nextPageToken;
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      authUsers.push(...result.users.map(u => u.email));
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    // Find mismatches
    const missingInAuth = dbUsersList.filter(u => !authUsers.includes(u.email));
    const onlyInAuth = authUsers.filter(email => !Object.values(dbUsers).some(u => u.email === email));

    res.json({
      success: true,
      summary: {
        totalInDatabase: dbUsersList.length,
        totalInAuth: authUsers.length,
        missingInAuth: missingInAuth.length,
        onlyInAuth: onlyInAuth.length
      },
      missingInAuth: missingInAuth.slice(0, 50), // First 50
      onlyInAuth: onlyInAuth.slice(0, 50)
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SYNC ENDPOINT ============
// Sync users between Database and Firebase Auth
app.post('/api/admin/sync-users', requireAuth, async (req, res) => {
  try {
    // Only allow admin
    if (req.session.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    console.log('🔄 Starting user sync process...');

    // Get all users from database
    const dbSnapshot = await admin.database().ref('users').once('value');
    const dbUsers = dbSnapshot.val() || {};

    // Get all users from Firebase Auth
    const authUsers = [];
    let nextPageToken;
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      authUsers.push(...result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    const authEmails = authUsers.map(u => u.email);
    const dbEmails = Object.values(dbUsers).map(u => u.email);

    // 1. Remove test users from database
    const testUsersToRemove = [];
    for (const [uid, user] of Object.entries(dbUsers)) {
      if (user.email === 'test@example.com') {
        await admin.database().ref('users/' + uid).remove();
        testUsersToRemove.push(user.email);
        console.log(`❌ Removed test user: ${user.email}`);
      }
    }

    // 2. Create DB records for users only in Auth
    const usersCreated = [];
    for (const authUser of authUsers) {
      if (!dbEmails.includes(authUser.email)) {
        const userRef = admin.database().ref('users').push();
        await userRef.set({
          firstName: authUser.displayName?.split(' ')[0] || 'User',
          lastName: authUser.displayName?.split(' ').slice(1).join(' ') || '',
          email: authUser.email.toLowerCase().trim(),
          phone: authUser.phoneNumber || '',
          walletBalance: 0,
          createdAt: new Date(authUser.metadata.creationTime).toISOString(),
          isAdmin: authUser.email === process.env.ADMIN_EMAIL,
          pricingGroup: 'regular',
          suspended: false,
          lastLogin: null
        });
        usersCreated.push(authUser.email);
        console.log(`✅ Created DB record for: ${authUser.email}`);
      }
    }

    res.json({
      success: true,
      summary: {
        testUsersRemoved: testUsersToRemove.length,
        dbRecordsCreated: usersCreated.length,
      },
      removedUsers: testUsersToRemove,
      createdUsers: usersCreated,
      message: 'User sync completed successfully'
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SEARCH ENDPOINT ============
// Search for users by email pattern
app.get('/api/admin/search-user/:emailPattern', requireAuth, async (req, res) => {
  try {
    // Only allow admin
    if (req.session.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const pattern = req.params.emailPattern.toLowerCase();
    
    // Get all users from database
    const dbSnapshot = await admin.database().ref('users').once('value');
    const dbUsers = dbSnapshot.val() || {};
    
    const matches = [];
    for (const [uid, user] of Object.entries(dbUsers)) {
      if (user.email.toLowerCase().includes(pattern)) {
        matches.push({
          uid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletBalance: user.walletBalance,
          createdAt: user.createdAt
        });
      }
    }

    res.json({
      success: true,
      pattern: pattern,
      found: matches.length,
      matches: matches
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ UPDATE USER EMAIL ENDPOINT ============
// Update user email in both Auth and Database
app.post('/api/admin/update-user-email', requireAuth, async (req, res) => {
  try {
    // Only allow admin
    if (req.session.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { uid, newEmail } = req.body;

    if (!uid || !newEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'uid and newEmail are required' 
      });
    }

    // Validate new email
    const emailValidation = validateEmail(newEmail.trim());
    if (!emailValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: emailValidation.error 
      });
    }

    const trimmedEmail = newEmail.toLowerCase().trim();

    // Check if new email already exists in database
    const dbSnapshot = await admin.database().ref('users').once('value');
    const dbUsers = dbSnapshot.val() || {};
    const emailExists = Object.values(dbUsers).some(u => u.email === trimmedEmail);
    
    if (emailExists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already exists in system' 
      });
    }

    // Update Firebase Auth
    try {
      await admin.auth().updateUser(uid, {
        email: trimmedEmail
      });
      console.log(`✅ Firebase Auth email updated for UID ${uid}`);
    } catch (authError) {
      console.error('❌ Auth update error:', authError.message);
      return res.status(400).json({ 
        success: false, 
        error: `Auth error: ${authError.message}` 
      });
    }

    // Update Database
    // Find the user in database and update email
    let userRef = null;
    for (const [key, user] of Object.entries(dbUsers)) {
      if (key === uid) {
        userRef = key;
        break;
      }
    }

    if (!userRef) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found in database' 
      });
    }

    await admin.database().ref(`users/${userRef}/email`).set(trimmedEmail);
    console.log(`✅ Database email updated for UID ${uid}`);

    res.json({
      success: true,
      message: `Email updated successfully from ${dbUsers[userRef].email} to ${trimmedEmail}`,
      uid: uid,
      oldEmail: dbUsers[userRef].email,
      newEmail: trimmedEmail
    });
  } catch (error) {
    console.error('Email update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DATAMART ORDER STATUS SYNC - Auto-sync every 5 minutes
// ============================================
// This function periodically checks Datamart for order status updates
// and syncs them to Firebase to keep order status current

async function syncDatamartOrderStatus() {
  try {
    console.log('🔄 Starting Datamart order status sync...');
    
    // Get all transactions with status 'success' or 'processing' that haven't been delivered
    const transactionsRef = admin.database().ref('transactions');
    const snapshot = await transactionsRef.once('value');
    const allTransactions = snapshot.val() || {};
    
    let syncedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const [transactionId, transaction] of Object.entries(allTransactions)) {
      try {
        // Only sync orders that:
        // 1. Have a Datamart transaction ID
        // 2. Status is NOT 'delivered' or 'failed' (already final)
        // 3. Status is NOT 'refunded'
        if (!transaction.datamartTransactionId || 
            ['delivered', 'failed', 'refunded', 'cancelled'].includes(transaction.status?.toLowerCase())) {
          continue;
        }
        
        // Query Datamart API for this transaction's status
        // Note: Datamart might not have a direct query endpoint, so we'll use the purchase reference
        // For now, we'll store the status locally until Datamart provides a status endpoint
        
        console.log(`📋 Checking order status for: ${transaction.datamartTransactionId}`);
        
        // TODO: Once Datamart provides a status query endpoint, uncomment and use this:
        /*
        const datamartStatusResponse = await axios.get(
          'https://api.datamartgh.shop/api/developer/transaction/status',
          {
            headers: {
              'X-API-Key': process.env.DATAMART_API_KEY,
            },
            params: {
              transactionId: transaction.datamartTransactionId
            },
            timeout: 10000
          }
        );
        
        const statusData = datamartStatusResponse.data;
        if (statusData && statusData.data) {
          const currentStatus = statusData.data.status;
          
          // Map Datamart status to DataSell status
          const mappedStatus = mapDatamartStatusToDataSell(currentStatus);
          
          if (mappedStatus && mappedStatus !== transaction.status) {
            await admin.database().ref(`transactions/${transactionId}`).update({
              status: mappedStatus,
              datamartStatus: currentStatus,
              lastSyncedAt: new Date().toISOString()
            });
            
            syncedCount++;
            console.log(`✅ Updated status for ${transactionId}: ${transaction.status} → ${mappedStatus}`);
            
            // Notify user of status change
            try {
              const userRef = admin.database().ref(`users/${transaction.userId}`);
              const userSnap = await userRef.once('value');
              const userData = userSnap.val();
              
              const statusMessage = getStatusMessage(mappedStatus);
              await sendSmsToUser(transaction.userId, transaction.phoneNumber, statusMessage);
            } catch (smsErr) {
              console.error(`❌ Failed to notify user ${transaction.userId}:`, smsErr);
            }
          }
        }
        */
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error syncing transaction ${transactionId}:`, error.message);
      }
    }
    
    console.log(`✅ Datamart sync completed - Updated: ${syncedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Datamart order status sync error:', error);
  }
}

// Helper function to map Datamart status to DataSell status
function mapDatamartStatusToDataSell(datamartStatus) {
  const statusMap = {
    'pending': 'processing',
    'processing': 'processing',
    'delivered': 'delivered',
    'failed': 'failed',
    'cancelled': 'cancelled',
    'success': 'delivered'
  };
  
  return statusMap[datamartStatus?.toLowerCase()] || datamartStatus;
}

// Helper function to get user-friendly status message
function getStatusMessage(status) {
  const messages = {
    'processing': 'Your data order is being processed. You will receive your data shortly.',
    'delivered': '✅ Your data has been delivered successfully!',
    'failed': '❌ Unfortunately, your order failed. Please contact support.',
    'cancelled': 'Your order has been cancelled.',
    'refunded': 'Your order has been refunded to your wallet.'
  };
  
  return messages[status?.toLowerCase()] || `Your order status: ${status}`;
}

// Start periodic sync (every 5 minutes) - DISABLED
// Only using Datamart webhook for real-time status updates
console.log('⏰ Datamart order status sync - DISABLED (webhook only)');
/*
setInterval(() => {
  syncDatamartOrderStatus().catch(err => console.error('Sync error:', err));
}, 5 * 60 * 1000);
*/

// DISABLED: Run sync after 30 seconds
// setTimeout(() => {
//   console.log('🔄 Starting initial Datamart sync...');
//   syncDatamartOrderStatus().catch(err => console.error('Initial sync error:', err));
// }, 30000);

// Keep the process alive indefinitely (prevent Node.js from exiting)
setInterval(() => {
  // Empty interval just to keep the event loop alive
}, 1000000);

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at promise:', promise, 'reason:', reason);
  // Don't exit - keep server running
});

// Endpoint to manually trigger sync (for testing/admin)
app.post('/api/admin/sync-datamart-orders', requireAdmin, async (req, res) => {
  try {
    console.log('🔄 Manual Datamart order sync triggered by admin');
    await syncDatamartOrderStatus();
    res.json({ 
      success: true, 
      message: 'Datamart order sync completed' 
    });
  } catch (error) {
    console.error('Error during manual sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sync failed: ' + error.message 
    });
  }
});

// Endpoint to check order status manually
app.get('/api/order-status/:transactionId', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.session.user.uid;
    
    const transactionRef = admin.database().ref(`transactions/${transactionId}`);
    const snapshot = await transactionRef.once('value');
    const transaction = snapshot.val();
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    // Verify user owns this transaction
    if (transaction.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    res.json({ 
      success: true, 
      transaction: {
        id: transactionId,
        status: transaction.status,
        reference: transaction.reference,
        network: transaction.network,
        packageName: transaction.packageName,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        phoneNumber: transaction.phoneNumber,
        datamartTransactionId: transaction.datamartTransactionId
      }
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch order status' 
    });
  }
});

// Health check endpoint for Render deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
console.log(`⏳ Attempting to start server on port ${PORT}...`);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 DataSell Server is running!
📍 Port: ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
⏰ Started at: ${new Date().toISOString()}
  `);
  
  // Initialize package cache after server is running
  if (!cacheInitialized) {
    cacheInitialized = true;
    initializePackageCache();
  }
  
  // Confirm server is still running after a brief delay
  setTimeout(() => {
    console.log('✅ Server confirmed running and stable after 2 seconds');
  }, 2000);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  // Don't exit - log the error and keep running
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please kill the process using that port or change PORT.`);
  }
});

// Log when server closes
server.on('close', () => {
  console.log('⚠️  Server closed');
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  // Log but don't exit - server should continue running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Log but don't exit - server should continue running
});

console.log('✅ All error handlers registered. Server is ready.');
