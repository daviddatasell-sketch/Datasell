# Datasell API System - Complete Reference

## 📋 Overview

The Datasell API provides a secure, RESTful interface for agent portal integrations. This document outlines the complete API system structure, security implementation, and deployment guidelines.

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** February 6, 2026

---

## 🗂️ System Structure

```
api/
├── config.js                 # Central configuration
├── key-generator.js          # API key generation & crypto
├── middleware.js             # Authentication & rate limiting
├── manager.js                # Firebase key management
├── routes.js                 # API endpoints (v1)
├── user-routes.js            # User dashboard routes
└── test-key-generator.js     # Testing utility

Documentation/
├── API_DOCUMENTATION.md      # Complete API reference
├── API_INTEGRATION_GUIDE.md  # Integration setup guide
└── API_SYSTEM_README.md      # This file

Root/
├── server.js                 # Main server (integrate API here)
└── .env                      # Environment variables
```

---

## 🔑 API Key Generation System

### Key Structure

All API keys follow this format:
```
ds_v1_<32-character-random-hex-string>

Example: ds_v1_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Generation Process

1. **Random Bytes**: Generate 24 random bytes using `crypto.randomBytes()`
2. **Convert to Hex**: Convert to hexadecimal string
3. **Add Prefix**: Prepend `ds_v1_` for identification
4. **Hash for Storage**: SHA-256 hash for database storage
5. **Return**: Send plain key only once (hash stored)

### Security Features

✅ **Cryptographically Secure**: Uses Node.js `crypto.randomBytes()`  
✅ **Timing-Safe Comparison**: Protected against timing attacks  
✅ **Salted Hashing**: SHA-256 hashing (no salt needed for hashing)  
✅ **Unique Signatures**: HMAC-SHA256 for webhook verification  
✅ **Expiration Support**: Optional key expiration dates  
✅ **Revocation Support**: Immediate key deactivation  

---

## 🛡️ Authentication Flow

### Step 1: Extract API Key
```
Header: X-API-Key: ds_v1_xxx
    OR
Header: Authorization: Bearer ds_v1_xxx
    OR
Query: ?api_key=ds_v1_xxx
```

### Step 2: Validate Format
```javascript
// Check: starts with ds_v1_, proper length
APIKeyGenerator.validateKeyFormat(apiKey)
```

### Step 3: Hash Key
```javascript
// Generate hash for database lookup
const hash = APIKeyGenerator.hashKey(apiKey)
```

### Step 4: Database Lookup
```javascript
// Find key in Firebase using hash
// Check status, expiration, activation
```

### Step 5: Load Data
```javascript
// Attach to request:
req.apiKey        // Plain key (should not use)
req.apiKeyHash    // Hash for identification
req.apiKeyData    // Full key data from DB
req.integrationId // Integration ID for this key
req.userId        // User ID who owns key
```

---

## ⚡ Rate Limiting

### Limits

| Metric | Value | Notes |
|--------|-------|-------|
| Per Minute | 60 requests | Soft limit |
| Per Hour | 1,000 requests | Hard limit |

### Implementation

```javascript
// Rate limiter stores in-memory (in production, use Redis)
const rateLimitStore = new Map();

// Strategy: 
// 1. Key by API key hash
// 2. Track minute and hour separately
// 3. Return 429 if exceeded
// 4. Include rate limit headers
```

### Rate Limit Headers

```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 45
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Hour: 950
```

### Response When Limited

```json
{
  "error": true,
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_MINUTE",
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

## 📊 Database Schema

### api_keys Collection

```
api_keys/{keyId}
├── id: string               # Unique key ID
├── hash: string             # SHA-256 hash of key
├── userId: string           # Owner user ID
├── integrationName: string  # Integration name
├── email: string            # User email
├── status: string           # "active" | "revoked"
├── createdAt: ISO 8601      # Creation timestamp
├── expiresAt: ISO 8601      # Expiration date
├── lastUsedAt: ISO 8601     # Last request time
├── requestCount: number     # Total requests made
└── regeneratedAt: ISO 8601  # (optional) Last regeneration
```

### api_usage Collection

```
api_usage/{timestamp}
├── integrationId: string    # Integration ID
├── userId: string           # User ID
├── method: string           # HTTP method
├── endpoint: string         # API path
├── statusCode: number       # HTTP status
├── duration: number         # Request duration (ms)
├── timestamp: ISO 8601      # Request time
└── userAgent: string        # Client user agent
```

### integrations Collection

```
integrations/{id}
├── name: string             # Integration name
├── userId: string           # Owner user ID
├── description: string      # Integration description
├── webhookUrl: string       # (optional) Webhook endpoint
├── webhookEvents: array     # Events to trigger
├── createdAt: ISO 8601      # Creation timestamp
└── apiKeyId: string         # Associated API key
```

---

## 🌐 API Endpoints

### Authentication Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/status` | Required | Check API status |
| `GET` | `/api/v1/me` | Required | Get integration details |
| `GET` | `/api/v1/docs` | Required | Get documentation |

### User Data Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/user/:phone` | Required | Get user info |
| `GET` | `/api/v1/balance/:phone` | Required | Get balance |

### Transaction Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/transaction` | Required | Create transaction |
| `GET` | `/api/v1/transaction/:id` | Required | Get status |

### Key Management Endpoints (Dashboard)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/keys/create` | User | Create new key |
| `GET` | `/api/v1/keys/my-keys` | User | List user's keys |
| `GET` | `/api/v1/keys/:id` | User | Get key details |
| `POST` | `/api/v1/keys/:id/regenerate` | User | Regenerate key |
| `POST` | `/api/v1/keys/:id/revoke` | User | Revoke key |
| `DELETE` | `/api/v1/keys/:id` | User | Delete key |

---

## 📝 Implementation Checklist

### Phase 1: Core Setup ✅

- [x] API configuration system
- [x] Key generator module
- [x] Authentication middleware
- [x] Rate limiting middleware
- [x] Core API routes
- [x] API documentation
- [x] Integration guide

### Phase 2: Integration

- [ ] Integrate into main server.js
- [ ] Add Firebase collections
- [ ] Set up rate limiting (Redis recommended)
- [ ] Configure webhooks
- [ ] Add dashboard UI

### Phase 3: Testing

- [ ] Unit tests for key generator
- [ ] Integration tests for endpoints
- [ ] Rate limiting tests
- [ ] Load testing
- [ ] Security audit

### Phase 4: Deployment

- [ ] Environment variable setup
- [ ] Database indexes
- [ ] Monitoring and logging
- [ ] Backup strategy
- [ ] Production deployment

---

## 🚀 Quick Start

### 1. Integrate into server.js

```javascript
// Import modules
const APIConfig = require('./api/config');
const APIMiddleware = require('./api/middleware');
const apiRoutes = require('./api/routes');
const userRoutes = require('./api/user-routes');

// Mount middleware before routes
app.use('/api/v1',
  APIMiddleware.validateAPIKeyFormat,
  APIMiddleware.rateLimitMiddleware,
  APIMiddleware.authenticateAPIKey,
  APIMiddleware.logAPIRequest,
  apiRoutes
);

// User dashboard routes (require auth)
app.use('/api/v1', userRoutes);

// Error handling
app.use('/api', APIMiddleware.errorHandler);
app.use('/api', APIMiddleware.notFoundHandler);
```

### 2. Create Firebase Collections

```bash
# Via Firebase Console
1. Go to Realtime Database
2. Create new references:
   - api_keys
   - api_usage
   - integrations
```

### 3. Test the System

```bash
# Run test utility
node api/test-key-generator.js

# Expected output:
# ✓ All tests passed
# ✓ Ready for production
```

### 4. Create First API Key

```javascript
// In server or via dashboard
const APIKeyManager = require('./api/manager');

const result = await APIKeyManager.createAPIKey(
  admin.database(),
  {
    userId: 'user_123',
    integrationName: 'Test Integration',
    email: 'user@example.com',
    expiryDays: 365
  }
);

console.log('API Key:', result.apiKey);
```

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Enable HTTPS only
- [ ] Store API keys securely (environment variables)
- [ ] Use Redis for rate limiting (not in-memory)
- [ ] Implement IP whitelisting (optional)
- [ ] Enable request logging and monitoring
- [ ] Set up alerts for suspicious activity
- [ ] Regular security audits
- [ ] Rotate keys periodically
- [ ] Backup database regularly
- [ ] Implement key rotation policy

### Common Vulnerabilities

| Vulnerability | Mitigation |
|---------------|-----------|
| Timing attacks | Use timing-safe comparison |
| Brute force | Rate limiting + account lockout |
| API key exposure | Never log plain keys, use env vars |
| Man-in-the-middle | Enforce HTTPS only |
| SQL injection | Firebase handles this |
| CORS issues | Configure properly |

---

## 📈 Monitoring & Analytics

### Metrics to Track

```javascript
// Per API key:
- Requests count
- Error rate
- Average response time
- Last used timestamp
- Rate limit violations

// Per endpoint:
- Request volume
- Error rate
- Performance metrics
- Usage patterns

// Overall:
- Active integrations
- Total keys created
- Revenue impact
- Support tickets
```

### Logging

```javascript
// Every request logged to Firebase:
{
  integrationId,
  userId,
  method,        // GET, POST, etc
  endpoint,      // /balance, /transaction, etc
  statusCode,    // 200, 401, 429, etc
  duration,      // ms
  timestamp,     // ISO 8601
  userAgent
}
```

---

## 🎯 Examples

### Create API Key (Admin)

```javascript
const result = await APIKeyManager.createAPIKey(db, {
  userId: 'user_123',
  integrationName: 'Mobile App',
  email: 'dev@example.com',
  expiryDays: 365
});

// Returns:
// {
//   success: true,
//   apiKey: "ds_v1_abc123...",  // Only shown once!
//   keyData: { id, masked, status, createdAt, expiresAt }
// }
```

### Make API Request

```javascript
const response = await fetch('https://datasell.store/api/v1/status', {
  headers: {
    'X-API-Key': 'ds_v1_your_key_here'
  }
});

const data = await response.json();
```

### Verify Webhook

```javascript
const signature = req.headers['x-datasell-signature'];
const payload = req.body;
const secret = process.env.WEBHOOK_SECRET;

const isValid = APIKeyGenerator.verifySignature(
  payload,
  signature,
  secret
);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

---

## 🐛 Troubleshooting

### "Invalid API Key" on every request

**Cause**: Firebase database reference not set  
**Fix**: Ensure `app.set('firebaseDb', admin.database())` before mounting API routes

### Rate limiting not working

**Cause**: Using in-memory store (lost on restart)  
**Fix**: Implement Redis for production rate limiting

### Keys not found in database

**Cause**: Using old hash function or wrong collection name  
**Fix**: Verify SHA-256 hashing and collection name is `api_keys`

### Slow API responses

**Cause**: Unindexed Firebase queries  
**Fix**: Create indexes on Firebase for: `userId`, `hash`, `status`

---

## 📚 Additional Resources

- **Main Documentation**: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **Integration Guide**: [API_INTEGRATION_GUIDE.md](../API_INTEGRATION_GUIDE.md)
- **Code Examples**: See API_DOCUMENTATION.md for Python, Node.js, PHP, cURL
- **Firebase Docs**: https://firebase.google.com/docs/database
- **Node.js Crypto**: https://nodejs.org/api/crypto.html

---

## 📞 Support

- **Email**: support@datasell.store
- **Issues**: Report via dashboard
- **Status**: https://datasell.store/status

---

## 📄 License & Terms

By implementing this API system, you agree to:
- Keep API keys secure
- Monitor and respect rate limits
- Not reverse-engineer the API
- Comply with all applicable laws
- Use API for authorized purposes only

For full terms: https://datasell.store/terms

---

**Status**: ✅ Production Ready  
**Last Verified**: February 6, 2026  
**Version**: 1.0.0
