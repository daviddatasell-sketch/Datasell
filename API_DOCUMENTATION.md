# Datasell API Documentation

## Overview

The Datasell API provides a secure, RESTful interface for integrating with the Datasell platform. This documentation covers all available endpoints, authentication methods, and integration guidelines.

**API Version:** 1.0.0  
**Base URL:** `https://datasell.store/api/v1`  
**Status:** Production Ready

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Key Management](#api-key-management)
4. [Rate Limiting](#rate-limiting)
5. [Endpoints](#endpoints)
6. [Error Handling](#error-handling)
7. [Webhooks](#webhooks)
8. [Code Examples](#code-examples)
9. [Support](#support)

---

## Getting Started

### Prerequisites

To use the Datasell API, you need:
- A valid Datasell account
- An API key (obtain from your dashboard)
- Basic knowledge of REST APIs
- HTTPS support (required)

### Quick Start

1. **Get your API key** from the agent portal dashboard
2. **Choose authentication method** (Bearer token or X-API-Key header)
3. **Make your first request**:

```bash
curl -X GET "https://datasell.store/api/v1/status" \
  -H "X-API-Key: ds_v1_your_api_key_here"
```

---

## Authentication

### API Key Format

All API keys follow this format:
```
ds_v1_<32-character-random-string>
```

- **Prefix:** `ds_` (Datasell)
- **Version:** `v1` (API version)
- **Key:** 32 random hexadecimal characters

### Authentication Methods

#### Method 1: Authorization Header (Recommended)

```bash
Authorization: Bearer ds_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```javascript
const headers = {
  'Authorization': `Bearer ${apiKey}`
};
```

#### Method 2: X-API-Key Header

```bash
X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```javascript
const headers = {
  'X-API-Key': apiKey
};
```

#### Method 3: Query Parameter (Not Recommended)

```
https://datasell.store/api/v1/status?api_key=ds_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ Warning:** Only use query parameters for testing. Always use headers in production.

### Key Secrecy

- **Never hardcode** API keys in your codebase
- **Use environment variables** to store keys
- **Rotate keys regularly** (recommended every 90 days)
- **Revoke immediately** if compromised
- **Don't share** API keys in emails or chat

---

## API Key Management

### Creating a New API Key

Use the agent portal dashboard to create new API keys:

1. Log in to your dashboard
2. Navigate to **Integrations** → **API Keys**
3. Click **Create New Key**
4. Enter integration name and description
5. Set expiration date (recommended: 365 days)
6. Click **Generate**
7. **Copy the key immediately** (only shown once)

### API Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique key identifier |
| `integrationName` | string | Name of the integration |
| `status` | string | `active` or `revoked` |
| `createdAt` | ISO 8601 | Creation timestamp |
| `expiresAt` | ISO 8601 | Expiration date |
| `lastUsedAt` | ISO 8601 | Last usage timestamp |
| `requestCount` | integer | Total requests made |

### Revoking an API Key

To revoke a key from your dashboard:

1. Navigate to **Integrations** → **API Keys**
2. Find the key you want to revoke
3. Click the **Revoke** button
4. Confirm the action

Once revoked:
- The key immediately stops working
- All future requests with this key will fail
- Action is **permanent and irreversible**

### Regenerating an API Key

To regenerate a key (get a new one):

1. Navigate to **Integrations** → **API Keys**
2. Find the key to regenerate
3. Click **Regenerate**
4. Copy the new key (only shown once)
5. Update your integration to use the new key

---

## Rate Limiting

### Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute | 60 |
| Requests per hour | 1,000 |

### Rate Limit Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 45
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Hour: 950
```

### Handling Rate Limits

When you exceed rate limits, you'll receive a **429 Too Many Requests** response:

```json
{
  "error": true,
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_MINUTE",
  "timestamp": "2026-02-06T10:30:00Z"
}
```

**Retry Strategy:**
- Wait 60 seconds before retrying
- Implement exponential backoff
- Monitor rate limit headers

---

## Endpoints

### 1. Check API Status

**Endpoint:** `GET /status`

Check if the API is online and your key is valid.

**Request:**
```bash
curl -X GET "https://datasell.store/api/v1/status" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response (200 OK):**
```json
{
  "status": "online",
  "message": "Request successful",
  "version": "1.0.0",
  "timestamp": "2026-02-06T10:30:00Z",
  "apiKey": {
    "masked": "ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx****",
    "valid": true,
    "integration": "My Integration"
  }
}
```

---

### 2. Get Integration Details

**Endpoint:** `GET /me`

Get detailed information about your integration.

**Request:**
```bash
curl -X GET "https://datasell.store/api/v1/me" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "integrationId": "int_abc123",
    "integrationName": "My Integration",
    "userId": "user_123",
    "email": "contact@example.com",
    "createdAt": "2025-12-01T10:00:00Z",
    "requestsLimit": {
      "perMinute": 60,
      "perHour": 1000
    }
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

### 3. Get User Balance

**Endpoint:** `GET /balance/:phoneNumber`

Retrieve a user's account balance.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string | Yes | User's phone number (e.g., `233XXXXXXXXX`) |

**Request:**
```bash
curl -X GET "https://datasell.store/api/v1/balance/233590000000" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "phone": "233590000000",
    "balance": 150.50,
    "currency": "GHS",
    "creditsAvailable": 300,
    "lastUpdated": "2026-02-06T10:30:00Z"
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": true,
  "message": "User not found",
  "code": "USER_NOT_FOUND",
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

### 4. Get User Information

**Endpoint:** `GET /user/:phoneNumber`

Retrieve comprehensive user profile information.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string | Yes | User's phone number |

**Request:**
```bash
curl -X GET "https://datasell.store/api/v1/user/233590000000" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "uid": "user_abc123",
    "phone": "233590000000",
    "email": "user@example.com",
    "username": "johnsmith",
    "firstName": "John",
    "lastName": "Smith",
    "balance": 150.50,
    "credits": 300,
    "accountStatus": "active",
    "joinedAt": "2025-06-15T08:00:00Z"
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

### 5. Create Transaction

**Endpoint:** `POST /transaction`

Initiate a new transaction (purchase, transfer, etc.).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phoneNumber` | string | Yes | Recipient phone number |
| `amount` | number | Yes | Transaction amount (positive number) |
| `type` | string | Yes | Transaction type (e.g., `data_purchase`, `airtime`, `transfer`) |
| `data_plan` | string | No | Data plan (for data purchases) |
| `reference` | string | Yes | Unique reference ID (idempotency key) |

**Request:**
```bash
curl -X POST "https://datasell.store/api/v1/transaction" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "233590000000",
    "amount": 5.00,
    "type": "data_purchase",
    "data_plan": "1GB",
    "reference": "txn_20260206_001"
  }'
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Request successful",
  "data": {
    "transactionId": "txn_abc123",
    "reference": "txn_20260206_001",
    "status": "pending",
    "createdAt": "2026-02-06T10:30:00Z"
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": true,
  "message": "Missing required fields: phoneNumber, amount, type, reference",
  "code": "MISSING_FIELDS",
  "timestamp": "2026-02-06T10:30:00Z"
}
```

**Error Response (409 Conflict - Duplicate):**
```json
{
  "error": true,
  "message": "Transaction with this reference already exists",
  "code": "DUPLICATE_REFERENCE",
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

### 6. Get Transaction Status

**Endpoint:** `GET /transaction/:transactionId`

Retrieve the status of a specific transaction.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transactionId` | string | Yes | Transaction ID from creation response |

**Request:**
```bash
curl -X GET "https://datasell.store/api/v1/transaction/txn_abc123" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "transactionId": "txn_abc123",
    "reference": "txn_20260206_001",
    "phoneNumber": "233590000000",
    "amount": 5.00,
    "type": "data_purchase",
    "transactionStatus": "completed",
    "createdAt": "2026-02-06T10:30:00Z"
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

### 7. Get API Documentation

**Endpoint:** `GET /docs`

Retrieve available API endpoints and documentation.

**Request:**
```bash
curl -X GET "https://datasell.store/api/v1/docs" \
  -H "X-API-Key: ds_v1_xxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "API Documentation",
  "version": "1.0.0",
  "documentation": {
    "baseURL": "https://datasell.store/api/v1",
    "authentication": {
      "type": "API Key",
      "methods": [
        "Authorization: Bearer YOUR_API_KEY",
        "X-API-Key: YOUR_API_KEY"
      ]
    },
    "endpoints": {
      // ... endpoint details
    },
    "rateLimits": {
      "perMinute": 60,
      "perHour": 1000
    }
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication failed or invalid API key |
| 403 | Forbidden | Action not allowed |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate or conflicting resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

All errors follow this structure:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-02-06T10:30:00Z"
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `MISSING_API_KEY` | No API key provided | Add API key to headers |
| `INVALID_API_KEY_FORMAT` | API key format is wrong | Check key format starts with `ds_v1_` |
| `API_KEY_NOT_FOUND` | API key doesn't exist | Verify key and check in dashboard |
| `API_KEY_INACTIVE` | API key is revoked/inactive | Create new key in dashboard |
| `API_KEY_EXPIRED` | API key has expired | Regenerate key in dashboard |
| `RATE_LIMIT_MINUTE` | Exceeded per-minute limit | Wait 60 seconds and retry |
| `RATE_LIMIT_HOUR` | Exceeded per-hour limit | Wait until hour resets |
| `MISSING_FIELDS` | Required fields missing | Check request body |
| `INVALID_AMOUNT` | Amount is invalid | Amount must be positive number |
| `DUPLICATE_REFERENCE` | Reference already exists | Use unique reference |
| `USER_NOT_FOUND` | User doesn't exist | Check phone number |
| `TRANSACTION_NOT_FOUND` | Transaction doesn't exist | Check transaction ID |

---

## Webhooks

### Overview

Webhooks allow Datasell to notify your system about important events.

### Supported Events

- `transaction.completed` - Transaction completed successfully
- `transaction.failed` - Transaction failed
- `user.created` - New user registered
- `user.updated` - User profile updated
- `balance.updated` - User balance changed

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "transaction.completed",
  "timestamp": "2026-02-06T10:30:00Z",
  "data": {
    "transactionId": "txn_abc123",
    "phoneNumber": "233590000000",
    "amount": 5.00,
    "status": "completed"
  },
  "signature": "sha256_hash_of_payload"
}
```

### Verifying Webhooks

Use the `signature` header to verify webhook authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}
```

### Setting Up Webhooks

1. Go to **Integrations** → **Webhooks** in your dashboard
2. Add webhook URL (example: `https://yoursite.com/webhooks/datasell`)
3. Select events to listen for
4. Save webhook endpoint
5. A secret will be generated for verification

---

## Code Examples

### Python

```python
import requests
import json

API_KEY = "ds_v1_your_api_key_here"
BASE_URL = "https://datasell.store/api/v1"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Check status
response = requests.get(f"{BASE_URL}/status", headers=headers)
print(response.json())

# Get balance
phone = "233590000000"
response = requests.get(f"{BASE_URL}/balance/{phone}", headers=headers)
print(response.json())

# Create transaction
payload = {
    "phoneNumber": "233590000000",
    "amount": 5.00,
    "type": "data_purchase",
    "data_plan": "1GB",
    "reference": "txn_20260206_001"
}
response = requests.post(f"{BASE_URL}/transaction", headers=headers, json=payload)
print(response.json())
```

### JavaScript (Node.js)

```javascript
const https = require('https');

const API_KEY = "ds_v1_your_api_key_here";
const BASE_URL = "https://datasell.store/api/v1";

const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json"
};

// Check status
fetch(`${BASE_URL}/status`, { headers })
  .then(res => res.json())
  .then(data => console.log(data));

// Get balance
fetch(`${BASE_URL}/balance/233590000000`, { headers })
  .then(res => res.json())
  .then(data => console.log(data));

// Create transaction
const payload = {
  phoneNumber: "233590000000",
  amount: 5.00,
  type: "data_purchase",
  data_plan: "1GB",
  reference: "txn_20260206_001"
};

fetch(`${BASE_URL}/transaction`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL

```bash
#!/bin/bash

API_KEY="ds_v1_your_api_key_here"
BASE_URL="https://datasell.store/api/v1"

# Check status
curl -X GET "$BASE_URL/status" \
  -H "X-API-Key: $API_KEY"

# Get balance
curl -X GET "$BASE_URL/balance/233590000000" \
  -H "X-API-Key: $API_KEY"

# Create transaction
curl -X POST "$BASE_URL/transaction" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "233590000000",
    "amount": 5.00,
    "type": "data_purchase",
    "data_plan": "1GB",
    "reference": "txn_20260206_001"
  }'
```

### PHP

```php
<?php

$apiKey = "ds_v1_your_api_key_here";
$baseUrl = "https://datasell.store/api/v1";

$headers = array(
    "X-API-Key: $apiKey",
    "Content-Type: application/json"
);

// Check status
$ch = curl_init("$baseUrl/status");
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo $response;

// Get balance
$ch = curl_init("$baseUrl/balance/233590000000");
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo $response;

// Create transaction
$payload = array(
    "phoneNumber" => "233590000000",
    "amount" => 5.00,
    "type" => "data_purchase",
    "data_plan" => "1GB",
    "reference" => "txn_20260206_001"
);

$ch = curl_init("$baseUrl/transaction");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo $response;

?>
```

---

## Support

### Getting Help

- **Documentation:** https://datasell.store/docs/api
- **Email:** support@datasell.store
- **Phone:** [contact number]
- **Chat:** Available in dashboard

### Report Issues

Found a bug? Report it to:
- **Issue Tracker:** https://datasell.store/support/issues
- **Email:** bugs@datasell.store

### API Status

Check API status at: https://datasell.store/status

---

## Changelog

### Version 1.0.0 (2026-02-06)

- Initial release
- Core endpoints: status, balance, user, transaction
- API key management
- Rate limiting
- Webhook support
- Comprehensive documentation

---

## Terms of Service

By using the Datasell API, you agree to:
- Use API only in authorized ways
- Not abuse rate limits
- Keep API keys secure
- Not reverse-engineer the API
- Comply with all applicable laws

For full terms, visit: https://datasell.store/terms

---

**Last Updated:** February 6, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready ✅
