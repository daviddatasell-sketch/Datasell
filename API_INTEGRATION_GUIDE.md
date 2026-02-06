# API Integration Guide

## Quick Setup

This guide shows you how to integrate the API system into your Express server.

### Step 1: Import API Modules into server.js

Add these imports at the top of your `server.js` file:

```javascript
const APIConfig = require('./api/config');
const APIKeyGenerator = require('./api/key-generator');
const APIKeyManager = require('./api/manager');
const APIMiddleware = require('./api/middleware');
const apiRoutes = require('./api/routes');
```

### Step 2: Mount API Routes

Add this after your Firebase initialization and before other routes:

```javascript
// API Routes - Initialize AFTER Firebase DB is set
app.use('/api/v1', 
  APIMiddleware.validateAPIKeyFormat,        // Check key format
  APIMiddleware.rateLimitMiddleware,          // Apply rate limiting
  APIMiddleware.authenticateAPIKey,          // Verify key in database
  APIMiddleware.logAPIRequest,                // Log usage
  apiRoutes                                   // Mount routes
);

// API 404 handler
app.use('/api', APIMiddleware.notFoundHandler);
app.use('/api', APIMiddleware.errorHandler);
```

### Step 3: Add Admin Routes for API Key Management

Create admin endpoints in your admin routes file:

```javascript
const express = require('express');
const router = express.Router();
const APIKeyManager = require('../api/manager');

/**
 * POST /admin/api-keys/create
 * Create new API key (admin only)
 */
router.post('/api-keys/create', async (req, res) => {
  try {
    const { userId, integrationName, email, expiryDays } = req.body;

    const result = await APIKeyManager.createAPIKey(
      admin.database(),
      {
        userId,
        integrationName,
        email,
        expiryDays: expiryDays || 365
      }
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
router.post('/api-keys/:keyId/revoke', async (req, res) => {
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

/**
 * POST /admin/api-keys/:keyId/regenerate
 * Regenerate an API key
 */
router.post('/api-keys/:keyId/regenerate', async (req, res) => {
  try {
    const result = await APIKeyManager.regenerateAPIKey(
      admin.database(),
      req.params.keyId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /admin/api-keys/user/:userId
 * List all API keys for a user
 */
router.get('/api-keys/user/:userId', async (req, res) => {
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
 * GET /admin/api-keys/:keyId
 * Get API key details
 */
router.get('/api-keys/:keyId', async (req, res) => {
  try {
    const result = await APIKeyManager.getAPIKeyDetails(
      admin.database(),
      req.params.keyId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /admin/api-keys/:keyId
 * Delete an API key
 */
router.delete('/api-keys/:keyId', async (req, res) => {
  try {
    const result = await APIKeyManager.deleteAPIKey(
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

### Step 4: Environment Variables

Ensure your `.env` file has:

```env
# API Settings
API_VERSION=1.0.0
API_KEY_PREFIX=ds_
API_RATE_LIMIT_MINUTE=60
API_RATE_LIMIT_HOUR=1000
```

### Step 5: Database Setup

The API system uses these Firebase collections:

```
database/
├── api_keys/           # Store API keys
│   └── {keyId}/
│       ├── hash
│       ├── userId
│       ├── integrationName
│       ├── email
│       ├── status
│       ├── createdAt
│       ├── expiresAt
│       └── lastUsedAt
├── api_usage/          # Log API calls
│   └── {timestamp}/
│       ├── integrationId
│       ├── method
│       ├── endpoint
│       ├── statusCode
│       └── timestamp
└── integrations/       # Integration info
    └── {integationId}/
        ├── name
        ├── userId
        └── createdAt
```

---

## Testing the API

### Using cURL

```bash
# Test API Status
curl -X GET "http://localhost:3000/api/v1/status" \
  -H "X-API-Key: ds_v1_your_test_key"

# Test API Documentation
curl -X GET "http://localhost:3000/api/v1/docs" \
  -H "X-API-Key: ds_v1_your_test_key"
```

### Using Postman

1. Create new collection "Datasell API"
2. Create new request "GET Status"
3. Set URL to `http://localhost:3000/api/v1/status`
4. Go to Headers tab
5. Add header: `X-API-Key: ds_v1_your_test_key`
6. Click Send

### Using Node.js Script

Create `test-api.js`:

```javascript
const http = require('http');
const { createHash } = require('crypto');

const API_KEY = 'ds_v1_test_key_123456789012345';

function testAPI(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n${method} ${path}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(data);
        resolve();
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  try {
    await testAPI('/status');
    await testAPI('/me');
    await testAPI('/docs');
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
```

Run with: `node test-api.js`

---

## Dashboard Integration

### Create user-facing API Key Management Page

HTML Template for dashboard:

```html
<div class="api-keys-container">
  <h2>API Keys Management</h2>
  
  <div class="api-key-form">
    <h3>Create New API Key</h3>
    <form id="createKeyForm">
      <input type="text" id="integrationName" placeholder="Integration Name" required>
      <input type="text" id="integrationDescription" placeholder="Description (optional)">
      <select id="expiryDays">
        <option value="30">Expires in 30 days</option>
        <option value="90">Expires in 90 days</option>
        <option value="365" selected>Expires in 1 year</option>
        <option value="0">Never expires</option>
      </select>
      <button type="submit">Generate API Key</button>
    </form>
  </div>

  <div class="api-keys-list">
    <h3>Your API Keys</h3>
    <table id="keysTable">
      <thead>
        <tr>
          <th>Integration</th>
          <th>API Key</th>
          <th>Status</th>
          <th>Created</th>
          <th>Expires</th>
          <th>Requests</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="keysTableBody">
        <!-- Populated by JavaScript -->
      </tbody>
    </table>
  </div>
</div>

<script>
// Create API Key
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
  
  const data = await response.json();
  
  if (data.success) {
    alert(`API Key created! Copy it now (only shown once):\n\n${data.apiKey}`);
    loadAPIKeys();
  }
});

// Load user's API keys
async function loadAPIKeys() {
  const response = await fetch('/api/v1/keys/my-keys');
  const data = await response.json();
  
  const tbody = document.getElementById('keysTableBody');
  tbody.innerHTML = '';
  
  data.data.forEach(key => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${key.integrationName}</td>
      <td>${key.masked}</td>
      <td><span class="badge ${key.status}">${key.status}</span></td>
      <td>${new Date(key.createdAt).toLocaleDateString()}</td>
      <td>${new Date(key.expiresAt).toLocaleDateString()}</td>
      <td>${key.requestCount}</td>
      <td>
        <button onclick="regenerateKey('${key.id}')">Regenerate</button>
        <button onclick="revokeKey('${key.id}')">Revoke</button>
      </td>
    `;
  });
}

// Regenerate API Key
async function regenerateKey(keyId) {
  if (confirm('Regenerate this API key? Current key will stop working.')) {
    const response = await fetch(`/api/v1/keys/${keyId}/regenerate`, {
      method: 'POST'
    });
    const data = await response.json();
    if (data.success) {
      alert(`New API Key:\n\n${data.apiKey}`);
      loadAPIKeys();
    }
  }
}

// Revoke API Key
async function revokeKey(keyId) {
  if (confirm('Revoke this API key? It will stop working immediately.')) {
    const response = await fetch(`/api/v1/keys/${keyId}/revoke`, {
      method: 'POST'
    });
    const data = await response.json();
    if (data.success) {
      alert('API key revoked');
      loadAPIKeys();
    }
  }
}

// Load on page load
loadAPIKeys();
</script>
```

---

## Security Best Practices

### For Integrations

1. **Store API Keys Securely**
   - Use environment variables
   - Never commit to version control
   - Use secure vaults (.env files with .gitignore)

2. **Rotate Keys Regularly**
   - Recommended every 90 days
   - Use regenerate function for smooth transitions

3. **Monitor Usage**
   - Check rate limit headers
   - Watch for unusual activity
   - Review request logs

4. **Use Appropriate Headers**
   - Always use `Authorization: Bearer` or `X-API-Key`
   - Never use query parameters in production

### For Datasell

1. **Key Generation**
   - Uses cryptographically secure random bytes
   - SHA-256 hashing for storage
   - Timing-safe comparison for verification

2. **Rate Limiting**
   - Per-minute and per-hour limits
   - Prevents abuse
   - Configurable limits

3. **Logging**
   - All API calls logged
   - Integration tracking
   - Usage analytics

---

## Troubleshooting

### "Invalid API Key" Error

**Solution:**
- Check key format starts with `ds_v1_`
- Verify key is not revoked in dashboard
- Check key hasn't expired
- Ensure correct header (`X-API-Key` or `Authorization: Bearer`)

### Rate Limit Exceeded

**Solution:**
- Wait 60 seconds before retrying
- Check rate limit headers
- Implement request queuing
- Contact support for higher limits

### "API Key Not Found"

**Solution:**
- Verify key was created in dashboard
- Check for typos in key
- Try regenerating key
- Ensure Firebase database is initialized

### Webhook Not Receiving

**Solution:**
- Verify webhook URL is accessible
- Check firewall settings
- Verify signature calculation
- Check webhook logs in dashboard

---

## Advanced Usage

### Custom Rate Limiting

To customize rate limits, edit `api/config.js`:

```javascript
RATE_LIMIT: {
  REQUESTS_PER_MINUTE: 100,  // Change from 60
  REQUESTS_PER_HOUR: 5000,   // Change from 1000
}
```

### Webhook Signature Verification

Generate webhook signatures using:

```javascript
const APIKeyGenerator = require('./api/key-generator');

// Create signature
const signature = APIKeyGenerator.createSignature(
  payload,
  webhookSecret
);

// Verify signature
const isValid = APIKeyGenerator.verifySignature(
  payload,
  providedSignature,
  webhookSecret
);
```

### Custom Endpoints

Add custom endpoints to `api/routes.js`:

```javascript
router.get('/custom-endpoint', async (req, res) => {
  // req.integrationId - Integration ID
  // req.userId - User ID
  // req.apiKeyData - Full API key data
  
  res.json({
    status: 'success',
    data: { /* your data */ }
  });
});
```

---

## Migration Path

If you have an existing API:

1. **Parallel Running** - Run both APIs simultaneously
2. **Client Migration** - Gradually move clients to new API
3. **Deprecation** - Set sunset date for old API
4. **Shutdown** - Remove old API after migration complete

---

## Support & Resources

- **Documentation:** [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **Code Examples:** See documentation for Python, JavaScript, cURL, PHP
- **Issues:** Contact support@datasell.store
- **Status:** Check https://datasell.store/status
