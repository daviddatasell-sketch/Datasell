# 🔧 DATAMART WEBHOOK CONFIGURATION CHECKLIST

## ✅ What You Need to Do in Datamart Dashboard

Your Datasell server is **ready to receive webhooks**, but Datamart needs to be **configured to send them**.

---

## 🎯 Step-by-Step Configuration

### Step 1: Access Datamart Admin Dashboard
1. Go to: **https://datamartgh.shop/admin**
2. Log in with your account credentials
3. Look for **Settings**, **API Settings**, or **Developer Console**

### Step 2: Find Webhook Configuration Section
Look for these menu items (exact names may vary):
- "Webhook Settings"
- "API Keys & Webhooks"
- "Developer Settings"
- "Integrations"
- "Notifications Settings"

### Step 3: Add New Webhook URL
Create/register a new webhook with these details:

```
URL: https://datasell.store/api/datamart-webhook
Method: POST
Event Types: ✅ order.completed
             ✅ order.failed
             (Optional: order.pending)
Status: Enable/Active
```

### Step 4: Get Your Webhook Secret
Datamart should provide a **webhook secret** or **API key**:
- This is usually shown once when you create the webhook
- **Copy this value and keep it safe**
- It's used for signature verification (security)

### Step 5: Update Your .env File
Add the webhook secret to your Datasell `.env` file:

```bash
# .env file
DATAMART_WEBHOOK_SECRET=your_webhook_secret_from_datamart
```

### Step 6: Restart Your Datasell Server
```bash
npm start
```
(or if using PM2: `pm2 restart server`)

### Step 7: Test the Webhook
In Datamart dashboard, look for a **"Send Test Webhook"** or **"Test"** button:
1. Click it
2. Select event type: `order.completed`
3. Click "Send" or "Test"
4. You should see success message

---

## 📋 What to Verify in Datamart

Before considering it complete, verify these in Datamart:

- [ ] Webhook URL is: `https://datasell.store/api/datamart-webhook`
- [ ] Webhook method is: `POST`
- [ ] Events enabled: `order.completed` and `order.failed`
- [ ] Webhook status shows: `Active` or `Connected` (not Disabled)
- [ ] Webhook secret is saved and matches your `.env` file
- [ ] Test webhook was sent successfully
- [ ] No error messages displayed

---

## 🧪 Testing After Configuration

### Test Option 1: Using Datamart Dashboard
1. In Datamart webhook settings, find "Send Test" button
2. Select: `order.completed` event
3. Click "Send Test Webhook"
4. Result should show: ✅ Success

### Test Option 2: Using Your Test Script
```bash
cd /path/to/datasell
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

### Test Option 3: Check Datasell Server Logs
When webhook is received, you should see:
```
📩 [DATAMART-WEBHOOK] Received event: order.completed
📩 [DATAMART-WEBHOOK] Payload: {...}
✅ [DATAMART-WEBHOOK] Signature verified
✅ [DATAMART-WEBHOOK] Order completed: TXN123456
✅ [DATAMART-WEBHOOK] Updated txn_key to delivered
📱 [DATAMART-WEBHOOK] SMS sent
```

---

## 🔐 Security Notes

### Webhook Secret
- **Keep it PRIVATE** - Don't share this with anyone
- Paste only in your `.env` file (not in code or chat)
- Used to verify webhooks come from Datamart
- If compromised, regenerate in Datamart settings

### Signature Verification
Datasell automatically:
- ✅ Verifies HMAC-SHA256 signature
- ✅ Rejects requests without valid signature
- ✅ Logs all verification attempts
- ✅ Returns 401 error for invalid signatures

### Best Practices
- [ ] Use HTTPS (not HTTP) for webhook URL
- [ ] Keep webhook secret in `.env` (not in code)
- [ ] Enable both `order.completed` and `order.failed` events
- [ ] Test webhook before considering complete
- [ ] Monitor server logs for webhook activity

---

## 🚨 Troubleshooting

### Webhook Not Being Called

**Problem**: Orders still show "Processing" after delivery

**Solutions**:
1. **Verify webhook is enabled in Datamart**
   - Check webhook status: should show "Active"
   - Look for any error indicators

2. **Verify webhook URL is correct**
   - Should be: `https://datasell.store/api/datamart-webhook`
   - Not: `http://` (must be HTTPS)
   - Not: with `/api/` prefix (full path needed)

3. **Test webhook manually**
   - Run: `node test-datamart-webhook.js`
   - Check for ✅ PASS on all tests

4. **Check server logs**
   - Look for `[DATAMART-WEBHOOK]` messages
   - Verify signature is verified ✅
   - Check for any error messages

### Invalid Signature Error

**Problem**: "Invalid signature" in logs

**Solutions**:
1. **Verify webhook secret matches**
   - Get secret from Datamart dashboard
   - Update `.env`: `DATAMART_WEBHOOK_SECRET=...`
   - Make sure no extra spaces or typos
   - Restart server: `npm start`

2. **Regenerate webhook secret in Datamart**
   - Go to webhook settings
   - Find "Regenerate" or "Reset Secret" option
   - Copy new secret
   - Update `.env` file
   - Restart server

3. **Test signature calculation**
   - Run: `node test-datamart-webhook.js`
   - Should see: ✅ Webhook (Valid Signature): PASS

### Transaction Not Found Error

**Problem**: "Transaction not found for ID: TXN123456"

**Solutions**:
1. **Verify transaction ID format**
   - Check what Datamart sends vs what Datasell stores
   - Log actual transaction ID values

2. **Check transaction exists in Datasell**
   - Admin panel → View orders
   - Search for order by transaction ID
   - Verify `datamartTransactionId` field matches

3. **Contact Datamart support**
   - Provide them the transaction ID
   - Ask if transaction exists on their side
   - Request logs showing order status

---

## 📞 Getting Help

### If Webhook Still Not Working

**Collect this information**:
1. Output from: `node test-datamart-webhook.js`
2. Recent server logs with `[DATAMART-WEBHOOK]` messages
3. Screenshot of Datamart webhook configuration
4. Transaction ID of test order
5. Timestamp of when order was placed

**Then contact**:
- Datamart Support Team
- Your technical team
- Provide all information above

### Quick Reference Links
- Datamart Admin: https://datamartgh.shop/admin
- Datasell Server Logs: Watch terminal running `npm start`
- Test Script: `node test-datamart-webhook.js`

---

## ✅ Completion Checklist

After configuration is complete, verify:

- [ ] Webhook URL added to Datamart: `https://datasell.store/api/datamart-webhook`
- [ ] Events enabled: `order.completed` and `order.failed`
- [ ] Webhook secret saved in `.env` file
- [ ] Server restarted: `npm start`
- [ ] Test webhook sent from Datamart (shows ✅ Success)
- [ ] Test script runs successfully: `node test-datamart-webhook.js`
- [ ] Server logs show webhook received
- [ ] Order status shows as "Delivered" after test delivery

**When all ✅ are checked, webhooks are working!**

---

## 🎉 What Happens Next

Once webhooks are properly configured:

1. Customer buys data on Datasell
2. Datasell sends to Datamart API
3. Datamart delivers data to customer
4. **[AUTOMATIC]** Datamart sends webhook notification
5. **[AUTOMATIC]** Datasell updates status to "Delivered"
6. Customer sees accurate status immediately ✓

No manual intervention needed - everything is automatic!

---

**Last Updated**: 2026-01-20
**Status**: Awaiting Datamart Configuration
