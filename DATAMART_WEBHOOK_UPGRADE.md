# 🎉 DataMart Webhook Integration - UPGRADED
**Date**: April 5, 2026  
**Status**: ✅ Ready for Production  
**Version**: 2.0 (New Payload Format Support)

---

## 📋 Summary of Changes

Your Datasell system has been upgraded to use the **new DataMart Webhook payload format** with enhanced real-time order tracking. This replaces the 7-hour timer fallback with immediate webhook-driven status updates.

### What's New

✅ **New Payload Format Support**
- `orderReference` field for easy order tracking
- `createdAt` and `updatedAt` timestamps
- `price` field stored for audit trail
- Full nested `data` object structure

✅ **Enhanced Webhook Processing**
- Support for `order.processing` events
- Support for `order.refunded` events  
- Better error logging and tracking
- Signature verification with HMAC-SHA256

✅ **Removed 7-Hour Timer**
- No longer falls back to 7-hour timer
- Status updated in real-time via webhooks
- Immediate order completion notifications

---

## 🚀 New Payload Format

### Example: order.completed

```json
{
  "event": "order.completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "orderId": "60f1e5b3e6b39812345678",
    "orderReference": "GN-AB12CD34",
    "transactionId": "TRX-a1b2c3d4-...",
    "phone": "0551234567",
    "network": "YELLO",
    "capacity": 5,
    "price": 20.50,
    "status": "completed",
    "createdAt": "2024-01-15T10:28:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Headers

```
X-DataMart-Signature: <HMAC-SHA256 signature>
X-DataMart-Event: order.completed
Content-Type: application/json
```

---

## 🔧 Implementation Details

### Signature Verification

The webhook includes HMAC-SHA256 signature verification to ensure requests come from DataMart:

```javascript
const crypto = require('crypto');
const signature = req.headers['x-datamart-signature'];
const secret = process.env.DATAMART_WEBHOOK_SECRET;

const expected = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== expected) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Endpoint Response

**Success Response** (HTTP 200):
```json
{
  "received": true,
  "transactionId": "TRX-a1b2c3d4-...",
  "orderReference": "GN-AB12CD34",
  "status": "delivered",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response** (HTTP 401):
```json
{
  "error": "Invalid signature",
  "received": "provided-signature",
  "expected": "calculated-signature"
}
```

---

## 📊 Database Updates

When a webhook is received, these fields are updated in Firebase:

### order.completed

```javascript
{
  status: 'delivered',
  lastSyncedAt: new Date().toISOString(),
  datamartStatus: 'completed',
  datamartWebhookReceived: true,
  webhookReceivedAt: new Date().toISOString(),
  orderReference: 'GN-AB12CD34',           // NEW
  datamartPrice: 20.50,                    // NEW
  datamartCreatedAt: '2024-01-15T10:28:.000Z', // NEW
  datamartUpdatedAt: '2024-01-15T10:30:00.000Z', // NEW
  deliveredAt: '2024-01-15T10:30:00.000Z' // NEW
}
```

### order.failed

```javascript
{
  status: 'failed',
  datamartStatus: 'failed',
  orderReference: 'GN-AB12CD34',
  failedAt: '2024-01-15T10:30:00.000Z',
  datamartWebhookReceived: true,
  webhookReceivedAt: '2024-01-15T10:30:00.000Z'
}
```

### order.processing

```javascript
{
  status: 'processing',
  datamartStatus: 'processing',
  processingStartedAt: '2024-01-15T10:28:00.000Z'
}
```

### order.refunded

```javascript
{
  status: 'refunded',
  datamartStatus: 'refunded',
  orderReference: 'GN-AB12CD34'
}
```

---

## 📱 SMS Notifications

- **Completed**: "✅ Your 5GB YELLO data has been delivered! Enjoy!"
- **Failed**: "❌ Your data order failed. Your wallet has been refunded. Support: 0553843255"
- **Processing**: (Optional status update)

---

## ✅ Supported Events

| Event | Status Update | Action | SMS |
|-------|--------------|--------|-----|
| `order.created` | pending | Record event | ❌ |
| `order.processing` | processing | Record event | ❌ |
| `order.completed` | delivered | Send SMS ✅ | ✅ |
| `order.failed` | failed | Refund user | ✅ |
| `order.refunded` | refunded | Record event | ❌ |

---

## 🔐 Configuration

### 1. Environment Variables (.env)

```bash
DATAMART_WEBHOOK_SECRET=your_secret_from_datamart
DATAMART_API_KEY=your_api_key
```

### 2. Webhook URL in DataMart Dashboard

```
https://datasell.store/api/datamart-webhook
```

### 3. Verify Webhook Configuration

Run the test script:
```bash
node test-datamart-webhook.js
```

Expected output:
```
✅ Endpoint Accessibility: PASS
✅ Webhook (No Signature): PASS
✅ Webhook (Valid Signature): PASS
✅ Webhook (Invalid Sig): PASS (Rejected)

✅ WEBHOOK SYSTEM IS OPERATIONAL!
```

---

## 🧪 Testing

### Test Webhook with Signature

```bash
# Using the test script (recommended)
node test-datamart-webhook.js

# Or manually with curl
curl -X POST https://datasell.store/api/datamart-webhook \
  -H "Content-Type: application/json" \
  -H "X-DataMart-Signature: <signature>" \
  -H "X-DataMart-Event: order.completed" \
  -d '{
    "event": "order.completed",
    "data": {
      "transactionId": "TRX-test-123",
      "orderReference": "GN-TEST001",
      "phone": "0551234567",
      "network": "YELLO",
      "capacity": 5,
      "price": 20.50,
      "status": "completed"
    }
  }'
```

### Check Server Logs

```bash
# Watch real-time logs
pm2 logs datasell

# Search for webhook entries
pm2 logs datasell | grep "DATAMART-WEBHOOK"
```

---

## 📈 Benefits

✅ **Real-time Updates** - No more waiting 7 hours for orders to be marked as delivered  
✅ **Better Audit Trail** - All order metadata stored with timestamps  
✅ **Tracking** - `orderReference` field for external system integration  
✅ **Security** - HMAC-SHA256 signature verification  
✅ **Instant Notifications** - Users notified immediately when order completes  
✅ **Refund Processing** - Automatic wallet refunds on failure  

---

## 🔍 Troubleshooting

### Webhook Not Being Called

**Check 1**: Verify webhook URL is correct
```bash
curl https://datasell.store/api/datamart-webhook
# Should return: { "success": true, ... }
```

**Check 2**: Verify webhook is enabled in DataMart Dashboard
- Go to DataMart Dashboard → Settings → Webhooks
- Check webhook status shows "Active" or "Connected"

**Check 3**: Run test script
```bash
node test-datamart-webhook.js
# All tests should PASS
```

**Check 4**: Check server logs
```bash
pm2 logs datasell | grep "DATAMART-WEBHOOK"
# Look for signature verification and transaction updates
```

### Signature Verification Failing

**Problem**: Webhook rejected with "Invalid signature"

**Solution**:
1. Verify `DATAMART_WEBHOOK_SECRET` in `.env` matches DataMart settings
2. Ensure payload is not modified during transmission
3. Check that the signature was calculated from the raw JSON body

### Transaction Not Found

**Problem**: Webhook processed but "Transaction not found"

**Solution**:
1. Verify `transactionId` in webhook matches Datasell database
2. Check that order was created in Datasell BEFORE webhook sent
3. Ensure DataMart is sending the correct `transactionId`

---

## 📞 Support

- **DataMart Docs**: https://datamartgh.shop/docs
- **Datasell Support**: 0553843255
- **Email**: support@datasell.store

---

## 📝 Changelog

### Version 2.0 (April 5, 2026)
- ✅ Support new DataMart payload format
- ✅ Added `orderReference` tracking
- ✅ Added `order.processing` and `order.refunded` events
- ✅ Removed 7-hour timer fallback
- ✅ Enhanced logging and monitoring
- ✅ Better error handling and signature verification

### Version 1.0 (Previous)
- ✅ Basic webhook support
- ✅ 7-hour timer fallback
- ✅ Order completed/failed events only

---

**Last Updated**: April 5, 2026  
**Status**: ✅ Production Ready
