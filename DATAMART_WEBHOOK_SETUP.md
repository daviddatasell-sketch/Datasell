# 🎯 DataSell Datamart Webhook Setup & Configuration

## 📢 What This Does

Your DataSell system automatically updates order status from **Processing** → **Delivered** when Datamart notifies you via webhook that the data bundle has been delivered to the customer.

**In simple terms**: When a customer receives their data on Datamart, Datasell automatically updates your order status to show "Delivered" instead of staying stuck on "Processing".

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your Webhook URL
Your webhook endpoint is already configured on the server:

```
https://datasell.store/api/datamart-webhook
```

**Current status**: ✅ ACTIVE and LISTENING

### Step 2: Configure Datamart Webhook Settings

You need to register this webhook URL in **Datamart Dashboard**:

1. **Log into Datamart Account** - https://datamartgh.shop/admin
2. **Navigate to Settings/API Settings**
3. **Find "Webhook Configuration" or "Developer Settings"**
4. **Add New Webhook**:
   - **URL**: `https://datasell.store/api/datamart-webhook`
   - **Events**: Enable these events:
     - `order.completed` (when customer receives data)
     - `order.failed` (when delivery fails)
     - `order.pending` (optional - when order is queued)
   - **Webhook Secret**: Get this from your Datamart account settings
5. **Save and Verify** - Datamart should show webhook as "Active" or "Connected"

### Step 3: Update Your .env File

Add the webhook secret from Datamart to your `.env` file:

```env
DATAMART_WEBHOOK_SECRET=7cfa4d9ea9e1c493774f448f6cd5cb2fbb14019f36ec335baaf6a366c3f9b4c5
```

**NOTE**: This secret is already in your current `.env` file ✓

---

## 📊 How It Works (Complete Flow)

```
1. Customer buys 1GB on Datasell
                ↓
2. Datasell sends order to Datamart API
                ↓
3. Datamart receives order (Status: PROCESSING)
                ↓
4. Datasell shows: "Processing" ⏳
                ↓
5. Datamart delivers data to customer's phone
                ↓
6. [AUTOMATIC] Datamart webhook sends:
   POST /api/datamart-webhook
   {
     "event": "order.completed",
     "transactionId": "xxx",
     "status": "completed",
     "phone": "0241234567",
     "network": "MTN"
   }
                ↓
7. [AUTOMATIC] Datasell server receives webhook
                ↓
8. [AUTOMATIC] Server verifies webhook signature
                ↓
9. [AUTOMATIC] Server finds matching transaction
                ↓
10. [AUTOMATIC] Server updates status: "Delivered"
                ↓
11. Customer sees: "Delivered" ✓ (on Datasell)
```

---

## 🔍 Webhook Endpoint Details

### Endpoint
```
POST /api/datamart-webhook
```

### Expected Headers
```
x-datamart-signature: [HMAC-SHA256 signature]
x-datamart-event: order.completed | order.failed | order.pending
Content-Type: application/json
```

### Expected Payload (order.completed)
```json
{
  "event": "order.completed",
  "data": {
    "transactionId": "TXN123456",
    "orderId": "ORD789",
    "phone": "0241234567",
    "network": "MTN",
    "capacity": "1",
    "price": 4.80,
    "status": "completed"
  }
}
```

Or flat format:
```json
{
  "transactionId": "TXN123456",
  "orderId": "ORD789",
  "phone": "0241234567",
  "network": "MTN",
  "capacity": "1",
  "price": 4.80,
  "status": "completed"
}
```

### Expected Payload (order.failed)
```json
{
  "event": "order.failed",
  "data": {
    "transactionId": "TXN123456",
    "phone": "0241234567",
    "network": "MTN",
    "status": "failed",
    "reason": "Network error" 
  }
}
```

### Server Responses

**✅ Success (order.completed)**
```json
{
  "received": true,
  "transactionId": "TXN123456",
  "status": "delivered",
  "timestamp": "2026-01-20T11:33:06.287Z"
}
```

**✅ Success (order.failed)**
```json
{
  "received": true,
  "transactionId": "TXN123456",
  "status": "failed",
  "refunded": true,
  "timestamp": "2026-01-20T11:33:06.287Z"
}
```

**❌ Invalid Signature**
```json
{
  "error": "Invalid signature",
  "expected": "...",
  "received": "..."
}
```

**❌ Transaction Not Found**
```json
{
  "error": "Transaction not found",
  "transactionId": "TXN123456"
}
```

---

## 🛡️ Security Features

### Signature Verification
The webhook handler verifies that requests come from Datamart:

```javascript
// 1. Datamart sends x-datamart-signature header
// 2. Server computes HMAC-SHA256 using DATAMART_WEBHOOK_SECRET
// 3. Server compares signatures
// 4. If match → request is authentic ✓
```

**How it protects you**:
- ✅ Prevents fraudulent status updates from unknown sources
- ✅ Ensures only legitimate Datamart events update your orders
- ✅ Logs all verification attempts

### No Duplicate Processing
The handler includes transaction lookup before updating:
- ✅ Finds exact transaction by `datamartTransactionId`
- ✅ Only updates if transaction exists
- ✅ Handles retries gracefully

---

## 🧪 Testing the Webhook

### Method 1: Using cURL (Test Webhook)
```bash
curl -X POST http://localhost:3000/api/datamart-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.completed",
    "data": {
      "transactionId": "TEST123",
      "phone": "0241234567",
      "network": "MTN",
      "capacity": "1"
    }
  }'
```

Expected response:
```json
{
  "received": true,
  "test": true,
  "timestamp": "2026-01-20T11:33:06.287Z"
}
```

### Method 2: Using Postman
1. Create POST request to: `http://localhost:3000/api/datamart-webhook`
2. Headers:
   - `Content-Type: application/json`
3. Body (raw JSON):
```json
{
  "event": "order.completed",
  "data": {
    "transactionId": "TEST123",
    "phone": "0241234567",
    "network": "MTN",
    "capacity": "1"
  }
}
```
4. Send and check response

### Method 3: Datamart Test Webhook
Datamart dashboard usually has a "Send Test Webhook" button:
1. Go to Datamart Webhook Settings
2. Click "Test Webhook" or "Send Test"
3. Select event type: `order.completed`
4. Click Send
5. Check server logs for confirmation

---

## 📋 What Gets Updated in Datasell

When webhook is received and verified, these fields update:

```javascript
{
  "status": "delivered",                    // Changed from "processing"
  "lastSyncedAt": "2026-01-20T11:33:06.287Z",
  "datamartStatus": "completed",            // From Datamart
  "webhookProcessedAt": "2026-01-20T11:33:06.287Z"
}
```

**Also triggered**:
- ✅ SMS sent to customer: "Your data has been delivered!"
- ✅ In-app notification created
- ✅ Server logs updated
- ✅ Firebase transaction updated

---

## 🔧 Troubleshooting

### Problem: Status Still Shows "Processing"

**Cause 1: Webhook not configured in Datamart**
- **Solution**: 
  1. Go to Datamart dashboard
  2. Verify webhook URL is set to: `https://datasell.store/api/datamart-webhook`
  3. Verify webhook is "Active" (not disabled)
  4. Try sending test webhook

**Cause 2: Webhook secret mismatch**
- **Solution**:
  1. Get correct secret from Datamart settings
  2. Update `.env` file with: `DATAMART_WEBHOOK_SECRET=your_secret`
  3. Restart server: `npm start`
  4. Test again

**Cause 3: Transaction not found**
- **Check server logs**:
  ```
  ⚠️ [DATAMART-WEBHOOK] Transaction not found for ID: TXN123456
  ```
- **Solution**:
  1. Verify transaction exists in Datasell
  2. Check if `datamartTransactionId` matches what Datamart is sending
  3. Contact Datamart support if transactionId format doesn't match

### Problem: "Invalid Signature" Error

**Cause**: Webhook secret doesn't match
- **Solution**:
  1. Get webhook secret from Datamart dashboard
  2. Compare with value in `.env` file
  3. If mismatch: update `.env` and restart server
  4. Test webhook again

---

## 📊 Webhook Logs & Monitoring

### View Webhook Activity
Server logs show all webhook processing:

```
📩 [DATAMART-WEBHOOK] Received event: order.completed
📩 [DATAMART-WEBHOOK] Payload: {...}
✅ [DATAMART-WEBHOOK] Signature verified
✅ [DATAMART-WEBHOOK] Order completed: TXN123456
✅ [DATAMART-WEBHOOK] Updated txn_key to delivered
📱 [DATAMART-WEBHOOK] SMS sent
```

### In Production
Logs are written to server console and can be:
- Monitored in real-time
- Archived for audits
- Used for debugging
- Tracked in monitoring dashboards

---

## 📱 Customer Experience

### Before (Without Webhook)
1. Customer buys data
2. Datamart delivers immediately
3. Datasell still shows "Processing" ❌
4. Customer confused - thinks order stuck
5. Manually refresh or wait for manual update

### After (With Webhook)
1. Customer buys data
2. Datamart delivers
3. Webhook fires automatically
4. Datasell updates to "Delivered" ✓
5. Customer sees accurate status instantly

---

## ✅ Verification Checklist

- [ ] Webhook URL accessible: `https://datasell.store/api/datamart-webhook`
- [ ] Webhook configured in Datamart dashboard
- [ ] Webhook shows "Active" status in Datamart
- [ ] `.env` has correct `DATAMART_WEBHOOK_SECRET`
- [ ] Server restarted after `.env` changes
- [ ] Test webhook sent successfully
- [ ] Server logs show successful verification
- [ ] Order status changed from "Processing" to "Delivered"
- [ ] Customer received SMS notification
- [ ] Transaction shows `datamartStatus: "completed"`

---

## 📞 Need Help?

### Check These Files
- `server.js` - Webhook handler code (lines ~2966-3080)
- `.env` - Webhook secret configuration
- Server logs - Real-time webhook activity

### Contact Datamart
If webhook not working after verification:
1. Contact Datamart support
2. Provide webhook URL: `https://datasell.store/api/datamart-webhook`
3. Ask them to:
   - Verify webhook endpoint is registered
   - Resend test webhook
   - Check webhook delivery logs on their side

### Server Health Check
```
GET https://datasell.store/api/datamart-webhook
```

Expected response:
```json
{
  "success": true,
  "message": "Datamart webhook endpoint is accessible",
  "webhook_url": "https://datasell.store/api/datamart-webhook",
  "method": "POST"
}
```

---

## 📝 Summary

| What | Value |
|------|-------|
| **Webhook URL** | `https://datasell.store/api/datamart-webhook` |
| **Method** | POST |
| **Authentication** | HMAC-SHA256 signature |
| **Events Handled** | `order.completed`, `order.failed` |
| **Status Update** | Processing → Delivered |
| **Notifications** | SMS + In-app |
| **Setup Time** | 5 minutes |
| **Cost** | Free (automatic) |

---

**Last Updated**: 2026-01-20
**Status**: ✅ Production Ready
