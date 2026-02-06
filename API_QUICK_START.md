# API Integration - Quick Start Guide

**Date**: February 6, 2026  
**Status**: ✅ Ready for Deployment

## 🎯 What You Have

Your Datasell API integration system is now complete with:

✅ **Core API System**
- Secure API key generation (ds_v1_ prefixed)
- Authentication middleware
- Rate limiting (60/min, 1000/hour)
- 7 functional endpoints

✅ **User Dashboard**
- API key management interface (`/api-dashboard`)
- Create, regenerate, revoke keys
- View usage statistics
- Beautiful responsive UI

✅ **Firebase Integration**
- Collections for api_keys, api_usage, integrations
- Secure hashing with SHA-256
- Request logging and analytics

✅ **Comprehensive Documentation**
- Complete API reference
- Code examples (Python, JavaScript, PHP, cURL)
- Integration guide
- System architecture

---

## 🚀 Deployment Steps

### Step 1: Set Up Firebase Collections (2 minutes)

```bash
cd c:\Users\HEDGEHOG\Downloads\Datasell-main
node api/setup-firebase-collections.js
```

**Expected Output:**
```
✓ Collections created:
  - api_keys
  - api_usage
  - integrations
✓ Ready for production
```

### Step 2: Start Your Server

```bash
npm start
```

The API system will initialize automatically. Look for:
```
✅ Firebase database reference set for API system
✅ API integration system mounted on /api/v1
```

### Step 3: Access the Dashboard

Navigate to: **http://localhost:3000/api-dashboard**

(Requires login - use your Datasell account)

### Step 4: Create First API Key

1. Fill in "Integration Name" (e.g., "Test Integration")
2. Select expiration period (e.g., 1 Year)
3. Click "Generate API Key"
4. **Copy the key immediately** (only shown once)
5. Save it somewhere secure

---

## 🧪 Test the API

### Quick Test with cURL

```bash
# Replace YOUR_API_KEY with the key from Step 4
curl -X GET "http://localhost:3000/api/v1/status" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Expected Response:**
```json
{
  "status": "online",
  "message": "Request successful",
  "version": "1.0.0",
  "apiKey": {
    "masked": "ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx****",
    "valid": true,
    "integration": "Test Integration"
  }
}
```

### Test Get Documentation

```bash
curl -X GET "http://localhost:3000/api/v1/docs" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Test Rate Limiting

```bash
# Make multiple requests rapidly
for i in {1..65}; do
  curl -X GET "http://localhost:3000/api/v1/status" \
    -H "X-API-Key: YOUR_API_KEY"
done
```

After 60 requests, you should see:
```json
{
  "error": true,
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_MINUTE"
}
```

---

## 📚 Available Endpoints

### Public Endpoints (no key needed for docs)
- `GET /api/v1/docs` - API documentation
- `GET /api/health` - Health check

### Authenticated Endpoints (API key required)

#### Status & Info
- `GET /api/v1/status` - Check API status
- `GET /api/v1/me` - Get integration info

#### User Data
- `GET /api/v1/user/:phone` - Get user information
- `GET /api/v1/balance/:phone` - Get user balance

#### Transactions
- `POST /api/v1/transaction` - Create transaction
- `GET /api/v1/transaction/:id` - Get transaction status

#### Key Management (Dashboard)
- `POST /api/v1/keys/create` - Create new key
- `GET /api/v1/keys/my-keys` - List your keys
- `POST /api/v1/keys/:id/regenerate` - Regenerate key
- `POST /api/v1/keys/:id/revoke` - Revoke key
- `DELETE /api/v1/keys/:id` - Delete key

---

## 💾 Firebase Collections

After setup, you'll have these collections:

### api_keys
```
api_keys/{keyId}
├── hash: string (SHA-256 of key)
├── userId: string
├── integrationName: string
├── status: "active" | "revoked"
├── createdAt: ISO 8601
├── expiresAt: ISO 8601
├── lastUsedAt: ISO 8601
└── requestCount: number
```

### api_usage
```
api_usage/{timestamp}
├── integrationId: string
├── userId: string
├── method: string (GET, POST)
├── endpoint: string
├── statusCode: number
├── duration: number (ms)
└── timestamp: ISO 8601
```

### integrations
```
integrations/{id}
├── name: string
├── userId: string
├── description: string
├── createdAt: ISO 8601
└── apiKeyId: string
```

---

## 🔒 Security Best Practices

### For Integrations Using Your API

1. **Store API Keys Securely**
   ```javascript
   // Use environment variables
   const API_KEY = process.env.DATASELL_API_KEY;
   
   // Never do this:
   // const API_KEY = "ds_v1_abc123..."; // ❌ Bad!
   ```

2. **Use Authorization Header**
   ```bash
   # Better than query parameters
   curl -X GET "https://datasell.store/api/v1/balance/233590000000" \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **Rotate Keys Regularly**
   - Every 90 days recommended
   - Use regenerate feature
   - Update integration immediately

4. **Monitor Rate Limits**
   ```javascript
   // Check response headers
   console.log(response.headers['X-RateLimit-Remaining-Minute']);
   ```

### System Protections

✅ Keys hashed with SHA-256 (never stored plain)  
✅ Timing-safe comparison prevents timing attacks  
✅ Rate limiting prevents brute force  
✅ Request logging for audit trail  
✅ Key expiration support  
✅ Revocation with immediate effect  

---

## 📝 Code Examples

### JavaScript/Node.js

```javascript
const API_KEY = process.env.DATASELL_API_KEY;

// Check status
fetch('https://datasell.store/api/v1/status', {
  headers: { 'X-API-Key': API_KEY }
})
.then(res => res.json())
.then(data => console.log(data));

// Get user balance
fetch('https://datasell.store/api/v1/balance/233590000000', {
  headers: { 'X-API-Key': API_KEY }
})
.then(res => res.json())
.then(data => console.log(data.data));

// Create transaction
fetch('https://datasell.store/api/v1/transaction', {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '233590000000',
    amount: 5.00,
    type: 'data_purchase',
    data_plan: '1GB',
    reference: 'txn_unique_123'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### Python

```python
import requests
import os

API_KEY = os.getenv('DATASELL_API_KEY')
BASE_URL = 'https://datasell.store/api/v1'

headers = {'X-API-Key': API_KEY}

# Check status
response = requests.get(f'{BASE_URL}/status', headers=headers)
print(response.json())

# Get balance
response = requests.get(f'{BASE_URL}/balance/233590000000', headers=headers)
print(response.json())

# Create transaction
payload = {
    'phoneNumber': '233590000000',
    'amount': 5.00,
    'type': 'data_purchase',
    'data_plan': '1GB',
    'reference': 'txn_unique_123'
}
response = requests.post(f'{BASE_URL}/transaction', 
                         json=payload, headers=headers)
print(response.json())
```

### cURL

```bash
export API_KEY="your_api_key_here"

# Status check
curl -X GET "https://datasell.store/api/v1/status" \
  -H "X-API-Key: $API_KEY"

# Get balance
curl -X GET "https://datasell.store/api/v1/balance/233590000000" \
  -H "X-API-Key: $API_KEY"

# Create transaction
curl -X POST "https://datasell.store/api/v1/transaction" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "233590000000",
    "amount": 5.00,
    "type": "data_purchase",
    "data_plan": "1GB",
    "reference": "txn_unique_123"
  }'
```

---

## 🔄 Workflow for New Integrations

1. **Agent Logs In**
   - Navigate to `/api-dashboard`

2. **Create API Key**
   - Fill in integration details
   - Generate key
   - Copy and save securely

3. **Integrate into System**
   - Add key to environment variables
   - Update code to use endpoints
   - Test with sample requests

4. **Monitor Usage**
   - Check rate limit headers
   - Review request logs
   - Monitor success rates

5. **Rotate on Schedule**
   - Every 90 days, regenerate
   - Update integration code
   - Revoke old key

---

## ⚙️ Configuration

### API Rate Limits

Current limits (configurable in `api/config.js`):
- Per minute: 60 requests
- Per hour: 1,000 requests

To change:
```javascript
// api/config.js
RATE_LIMIT: {
  REQUESTS_PER_MINUTE: 120,  // Change from 60
  REQUESTS_PER_HOUR: 5000,   // Change from 1000
}
```

### Environment Variables

```env
# Already set in your .env
API_VERSION=1.0.0
API_KEY_PREFIX=ds_
FIREBASE_DATABASE_URL=https://datasell-7b993-default-rtdb.firebaseio.com
```

---

## 🐛 Troubleshooting

### "Invalid API Key" Error

**Check:**
1. Key starts with `ds_v1_`
2. Key is not revoked in dashboard
3. Key hasn't expired
4. Using correct header (`X-API-Key` or `Authorization: Bearer`)

### Rate Limit Exceeded

**Solution:**
- Wait 60 seconds
- Check rate limit headers
- Implement request queuing
- Contact support for higher limits

### Database Connection Error

**Check:**
1. Firebase is initialized
2. Collections exist in Firebase
3. Environment variables set correctly
4. Database rules allow operations

**Fix:**
```bash
rm api/test-*.js
node api/setup-firebase-collections.js
npm start
```

---

## 📊 Monitoring & Analytics

### Check API Usage

In Firebase Console → Realtime Database:
```
api_usage/ → View request logs
api_keys/ → Check key statistics
integrations/ → See integration details
```

### Rate Limit Status

Response headers show current usage:
```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 42
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Hour: 950
```

---

## 📞 Support & Resources

**Documentation:**
- Full Reference: `/API_DOCUMENTATION.md`
- Integration Guide: `/API_INTEGRATION_GUIDE.md`
- System Overview: `/API_SYSTEM_README.md`

**Dashboard:**
- Navigate to: `http://localhost:3000/api-dashboard`
- Links to all documentation

**Support Email:**
- support@datasell.store

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] Firebase collections created
- [ ] Server starts without errors
- [ ] API dashboard loads
- [ ] Can create API keys
- [ ] Test endpoints with key
- [ ] Rate limiting works
- [ ] Request logging functional
- [ ] Key regeneration works
- [ ] Key revocation works
- [ ] Documentation accessible
- [ ] Sample integrations tested

---

## 🎉 You're All Set!

Your API integration system is ready for production!

**Next Actions:**
1. ✅ Set up Firebase collections (done above)
2. ✅ Server integration (done in server.js)
3. ✅ Dashboard deployed (at `/api-dashboard`)
4. 📌 Share dashboard link with agents
5. 📌 Create integration documentation
6. 📌 Set up support channel

---

**Last Updated**: February 6, 2026  
**API Version**: 1.0.0  
**Status**: Production Ready ✅
