# API System Implementation Checklist

**Last Updated**: February 6, 2026  
**Status**: Ready for Implementation  
**Estimated Time**: 30-60 minutes

---

## Pre-Implementation Review

### What's Included ✅

- [x] Complete API key generation system
- [x] Secure authentication middleware
- [x] Rate limiting (in-memory, production ready with Redis)
- [x] Core API endpoints for integrations
- [x] User dashboard API management
- [x] Comprehensive documentation
- [x] Security best practices
- [x] Testing utilities
- [x] Firebase schema
- [x] Code examples (Python, JavaScript, PHP, cURL)

### What's NOT Included ❌

- [ ] Frontend dashboard UI (you'll build this)
- [ ] Webhook implementation (template provided)
- [ ] PaymentProcessor integration (you have Paystack)
- [ ] SMS notification for API events (optional)
- [ ] Custom analytics dashboard (optional)

---

## Phase 1: Core Integration (15 minutes)

### 1.1 Review Files Structure

```
✓ Check: api/ folder created with:
  - config.js
  - key-generator.js
  - middleware.js
  - manager.js
  - routes.js
  - user-routes.js
  - test-key-generator.js

✓ Check: Documentation files:
  - API_DOCUMENTATION.md
  - API_INTEGRATION_GUIDE.md
  - API_SYSTEM_README.md
```

### 1.2 Update server.js - Add Imports

```javascript
// At top of server.js, add:

const APIConfig = require('./api/config');
const APIKeyGenerator = require('./api/key-generator');
const APIKeyManager = require('./api/manager');
const APIMiddleware = require('./api/middleware');
const apiRoutes = require('./api/routes');
const userRoutes = require('./api/user-routes');
```

- [ ] Imports added
- [ ] No syntax errors

### 1.3 Mount API Routes

```javascript
// In server.js, AFTER Firebase initialization
// but BEFORE other routes, add:

// Store Firebase reference for API middleware
app.set('firebaseDb', admin.database());

// API Routes with authentication chain
app.use('/api/v1',
  APIMiddleware.validateAPIKeyFormat,        // Validate format
  APIMiddleware.rateLimitMiddleware,         // Check rate limits
  APIMiddleware.authenticateAPIKey,         // Verify in database
  APIMiddleware.logAPIRequest,               // Log all calls
  apiRoutes                                  // Mount routes
);

// User dashboard API key management (requires auth)
// Mount this route group ONLY if user is authenticated
app.use('/api/v1', (req, res, next) => {
  // Add authentication check here if needed
  next();
}, userRoutes);

// API Error handlers (must be last)
app.use('/api', APIMiddleware.errorHandler);
app.use('/api', APIMiddleware.notFoundHandler);
```

- [ ] Firebase reference set
- [ ] API routes mounted
- [ ] Error handlers mounted
- [ ] No route conflicts

### 1.4 Test Imports

```bash
# In terminal, run:
node -e "require('./api/config'); console.log('✓ API modules load successfully')"
```

- [ ] No import errors
- [ ] All modules load

---

## Phase 2: Firebase Setup (10 minutes)

### 2.1 Create Database Collections

**Option A: Via Firebase Console**

1. Open Firebase Console → Datasell project
2. Navigate to Realtime Database
3. Create new child references:
   - `api_keys` (for storing API keys)
   - `api_usage` (for logging requests)
   - `integrations` (for integration metadata)
4. Copy database URL to .env if not already there

**Option B: Via Code (Firebase Admin)**

```javascript
// Run once during initialization
const db = admin.database();

async function setupCollections() {
  try {
    // Create empty collections
    await db.ref('api_keys').set({ _initialized: true });
    await db.ref('api_usage').set({ _initialized: true });
    await db.ref('integrations').set({ _initialized: true });
    
    // Remove init markers
    await db.ref('api_keys/_initialized').remove();
    await db.ref('api_usage/_initialized').remove();
    await db.ref('integrations/_initialized').remove();
    
    console.log('✓ Collections created');
  } catch (error) {
    console.error('Error creating collections:', error);
  }
}

setupCollections();
```

- [ ] `api_keys` collection created
- [ ] `api_usage` collection created
- [ ] `integrations` collection created

### 2.2 Set Up Indexes (Optional but Recommended)

In Firebase Console → Realtime Database → Indexes:

```
Collection: api_keys
  Index 1:
    - userId (Ascending)
    - .key (Ascending)
  
  Index 2:
    - hash (Ascending)
    - status (Ascending)
```

- [ ] Indexes created (optional)

---

## Phase 3: Environment Variables (5 minutes)

### 3.1 Update .env

```env
# API Configuration
API_VERSION=1.0.0
API_KEY_PREFIX=ds_
API_KEY_LENGTH=32

# Rate Limiting
API_RATE_LIMIT_MINUTE=60
API_RATE_LIMIT_HOUR=1000

# Legacy variables (already in your .env, verify):
FIREBASE_DATABASE_URL=https://datasell-7b993-default-rtdb.firebaseio.com
PORT=3000
NODE_ENV=production
BASE_URL=https://datasell.store
```

- [ ] API_VERSION set
- [ ] API_KEY_PREFIX set
- [ ] Rate limits configured
- [ ] Firebase URL verified

---

## Phase 4: Testing (10 minutes)

### 4.1 Run Key Generator Test

```bash
node api/test-key-generator.js
```

**Expected Output**:
```
✓ Test 1: Generating API Key...
✓ Test 2: Validating Key Format...
✓ Test 3: Testing Hash Verification...
...
✓ All tests passed
✓ Ready for production deployment
```

- [ ] All tests pass
- [ ] Key generation working

### 4.2 Start Server and Test Endpoints

```bash
npm start
```

Then in another terminal:

```bash
# Create a test API key first (via database or admin endpoint)

# Test 1: Status endpoint
curl -X GET "http://localhost:3000/api/v1/status" \
  -H "X-API-Key: ds_v1_test_key_here"

# Expected response: 200 OK with status data

# Test 2: Documentation endpoint
curl -X GET "http://localhost:3000/api/v1/docs" \
  -H "X-API-Key: ds_v1_test_key_here"

# Expected response: 200 OK with docs

# Test 3: Invalid key
curl -X GET "http://localhost:3000/api/v1/status" \
  -H "X-API-Key: invalid_key"

# Expected response: 401 Unauthorized
```

- [ ] Status endpoint returns 200
- [ ] Docs endpoint returns 200
- [ ] Invalid key returns 401
- [ ] Rate limit headers present

### 4.3 Create First API Key

```bash
# Option A: Via Node script
node -e "
const admin = require('firebase-admin');
const APIKeyManager = require('./api/manager');

// Initialize Firebase
// ... then:

APIKeyManager.createAPIKey(admin.database(), {
  userId: 'admin_user_id',
  integrationName: 'Test Integration',
  email: 'admin@datasell.store',
  expiryDays: 365
}).then(result => {
  console.log('API Key:', result.apiKey);
}).catch(err => console.error(err));
"

# Option B: Via Dashboard (create admin endpoint first)
```

- [ ] Test API key created
- [ ] Key format correct (starts with `ds_v1_`)
- [ ] Key is functional

---

## Phase 5: Admin Endpoint Setup (10 minutes)

### 5.1 Create Admin Routes File (optional, for key management)

If you want admin users to manage keys directly in dashboard:

```javascript
// Create file: routes/admin-api-keys.js

const express = require('express');
const router = express.Router();
const APIKeyManager = require('../api/manager');
const admin = require('firebase-admin');

// Middleware: Check if user is admin
const isAdmin = (req, res, next) => {
  // Your admin check logic here
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

/**
 * POST /admin/api-keys/create
 * Create new API key for a user
 */
router.post('/create', isAdmin, async (req, res) => {
  try {
    const { userId, integrationName, email, expiryDays } = req.body;

    const result = await APIKeyManager.createAPIKey(
      admin.database(),
      { userId, integrationName, email, expiryDays: expiryDays || 365 }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /admin/api-keys/:userId
 * List all API keys for a user
 */
router.get('/:userId', isAdmin, async (req, res) => {
  try {
    const result = await APIKeyManager.listUserAPIKeys(
      admin.database(),
      req.params.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /admin/api-keys/:keyId/revoke
 * Revoke an API key
 */
router.post('/:keyId/revoke', isAdmin, async (req, res) => {
  try {
    const result = await APIKeyManager.revokeAPIKey(
      admin.database(),
      req.params.keyId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

In server.js, mount with:
```javascript
app.use('/admin/api-keys', adminAPIKeyRoutes);
```

- [ ] Admin routes created (optional)
- [ ] Admin endpoints mounted
- [ ] Authentication check implemented

---

## Phase 6: Dashboard UI (Optional - 20-30 minutes)

### 6.1 Create Frontend for Users

Create `/public/api-dashboard.html`:

```html
<div class="api-dashboard">
  <h2>API Keys Management</h2>
  
  <!-- Create New Key Section -->
  <div class="create-key-section">
    <h3>Create New API Key</h3>
    <form id="createKeyForm">
      <input type="text" id="integrationName" placeholder="Integration Name" required>
      <input type="number" id="expiryDays" value="365" min="1" max="3650">
      <button type="submit">Generate API Key</button>
    </form>
  </div>

  <!-- Keys List Section -->
  <div class="keys-list-section">
    <h3>Your API Keys</h3>
    <table id="keysTable">
      <thead>
        <tr>
          <th>Integration</th>
          <th>Key (Masked)</th>
          <th>Status</th>
          <th>Created</th>
          <th>Expires</th>
          <th>Requests</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="keysTableBody">
      </tbody>
    </table>
  </div>
</div>

<script>
// Load keys on page load
document.addEventListener('DOMContentLoaded', loadKeys);

// Create key form
document.getElementById('createKeyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const response = await fetch('/api/v1/keys/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      integrationName: document.getElementById('integrationName').value,
      expiryDays: Number(document.getElementById('expiryDays').value)
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    const keyText = `Your new API Key (save it now, won't be shown again):\n\n${result.apiKey}\n\nIntegration: ${result.keyData.integrationName}`;
    alert(keyText);
    loadKeys();
    e.target.reset();
  } else {
    alert('Error: ' + result.message);
  }
});

// Load and display keys
async function loadKeys() {
  const response = await fetch('/api/v1/keys/my-keys');
  const result = await response.json();
  
  const tbody = document.getElementById('keysTableBody');
  tbody.innerHTML = '';
  
  result.data.forEach(key => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${key.integrationName}</td>
      <td><code>${key.masked}</code></td>
      <td><span class="badge ${key.status}">${key.status}</span></td>
      <td>${new Date(key.createdAt).toLocaleDateString()}</td>
      <td>${key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}</td>
      <td>${key.requestCount || 0}</td>
      <td>
        <button onclick="regenerateKey('${key.id}')">Regenerate</button>
        <button onclick="revokeKey('${key.id}')">Revoke</button>
      </td>
    `;
  });
}

// Regenerate key
async function regenerateKey(keyId) {
  if (!confirm('Regenerate this key? Current key will stop working.')) return;
  
  const response = await fetch(`/api/v1/keys/${keyId}/regenerate`, {
    method: 'POST'
  });
  
  const result = await response.json();
  if (result.success) {
    alert(`New API Key:\n\n${result.apiKey}`);
    loadKeys();
  }
}

// Revoke key
async function revokeKey(keyId) {
  if (!confirm('Revoke this key? It will stop working immediately.')) return;
  
  const response = await fetch(`/api/v1/keys/${keyId}/revoke`, {
    method: 'POST'
  });
  
  const result = await response.json();
  if (result.success) {
    alert('API key revoked');
    loadKeys();
  }
}
</script>

<style>
.api-dashboard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.create-key-section,
.keys-list-section {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

form input,
form select {
  padding: 10px;
  margin: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

form button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table th,
table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

table th {
  background: #f8f9fa;
  font-weight: bold;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.badge.active {
  background: #d4edda;
  color: #155724;
}

.badge.revoked {
  background: #f8d7da;
  color: #721c24;
}

button {
  padding: 6px 12px;
  margin: 2px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}

code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}
</style>
```

- [ ] Dashboard HTML created
- [ ] JavaScript functionality working
- [ ] Create key working
- [ ] List keys working
- [ ] Regenerate/Revoke working

---

## Phase 7: Production Deployment (15-30 minutes)

### 7.1 Security Audit

- [ ] All API keys stored as hashes only in database
- [ ] No plain API keys logged
- [ ] HTTPS enforced in production
- [ ] Rate limiting enabled
- [ ] Firebase rules updated (see below)
- [ ] Environment variables not committed to git

### 7.2 Firebase Security Rules

In Firebase Console → Realtime Database → Rules, update:

```json
{
  "rules": {
    "api_keys": {
      ".read": false,
      ".write": "root.child('admins').child(auth.uid).exists()",
      "$keyId": {
        ".read": "root.child('users').child(auth.uid).exists()",
        ".write": "root.child('admins').child(auth.uid).exists()"
      }
    },
    "api_usage": {
      ".read": "root.child('admins').child(auth.uid).exists()",
      ".write": false
    },
    "integrations": {
      ".read": "root.child('users').child(auth.uid).exists()",
      ".write": "root.child('admins').child(auth.uid).exists()"
    }
  }
}
```

- [ ] Firebase rules updated
- [ ] Rules tested

### 7.3 Performance Optimization

```javascript
// In api/middleware.js, add Redis for rate limiting:

const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Use Redis for rate limiting instead of Map
```

- [ ] Redis configured (production)
- [ ] Database indexes created
- [ ] Caching implemented (optional)

### 7.4 Monitoring & Alerting

Set up monitoring for:
- [ ] API response times
- [ ] Error rates
- [ ] Rate limit violations
- [ ] Unusual access patterns

---

## Phase 8: Documentation & Support

### 8.1 Review Documentation

- [ ] Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [ ] Read [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
- [ ] Read [API_SYSTEM_README.md](./API_SYSTEM_README.md)

### 8.2 Create Support Resources

- [ ] API endpoint documentation deployed
- [ ] Example code available
- [ ] Troubleshooting guide published
- [ ] Support contact information updated

### 8.3 Communication

- [ ] Notify agents of API availability
- [ ] Provide integration guides
- [ ] Set up support channel
- [ ] Create FAQ

---

## Final Verification

### Checklist

- [ ] Server starts without errors
- [ ] API endpoints accessible
- [ ] Key generation working
- [ ] Authentication working
- [ ] Rate limiting functional
- [ ] Error handling proper
- [ ] Database logging operational
- [ ] Documentation complete
- [ ] Dashboard UI functional
- [ ] Security audit passed
- [ ] Performance acceptable
- [ ] Monitoring configured

### Test Commands

```bash
# Terminal 1: Start server
npm start

# Terminal 2: Run tests
npm test api/

# Terminal 3: Manual integration test
curl -X GET http://localhost:3000/api/v1/status \
  -H "X-API-Key: YOUR_TEST_KEY"
```

---

## Post-Deployment

### Day 1

- [ ] Monitor API usage
- [ ] Check error logs
- [ ] Verify database usage
- [ ] Test all endpoints

### Week 1

- [ ] Analyze usage patterns
- [ ] Gather feedback
- [ ] Fix any issues
- [ ] Performance tuning

### Month 1

- [ ] Full security audit
- [ ] Load testing
- [ ] Documentation review
- [ ] Agent feedback compilation

---

## Support & Issues

**Found an issue?**
- Check API_SYSTEM_README.md Troubleshooting section
- Review API_INTEGRATION_GUIDE.md
- Check Firebase database for key data
- Review server logs for errors

**Need help?**
- Review code examples in API_DOCUMENTATION.md
- Check test output: `node api/test-key-generator.js`
- Verify all environment variables set
- Ensure Firebase is initialized

---

## Success Criteria

The API system is successfully deployed when:

✅ All API endpoints responding with 200 status  
✅ API keys can be created and used  
✅ Rate limiting working (test with rapid requests)  
✅ Database logging requests to api_usage collection  
✅ Users can manage keys via dashboard  
✅ Documentation complete and accessible  
✅ No errors in server logs  
✅ Performance acceptable (< 200ms per request)  
✅ Security audit passed (HTTPS, key hashing, etc)  
✅ Monitoring and alerts configured  

---

**✅ Implementation Complete!**

The API system is ready for agent integrations. Agents can now:
1. Create API keys from their dashboard
2. Integrate into their systems
3. Access user data and make transactions
4. Monitor usage and rate limits
5. Regenerate/revoke keys as needed

---

**Questions?** Review the comprehensive documentation:
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete reference
- [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) - Setup guide
- [API_SYSTEM_README.md](./API_SYSTEM_README.md) - System overview

**Ready to deploy?** ✅ All systems go!
