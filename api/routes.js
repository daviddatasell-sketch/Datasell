/**
 * API Routes
 * RESTful endpoints for agent portal integration
 */

const express = require('express');
const router = express.Router();
const APIKeyGenerator = require('./key-generator');
const API_CONFIG = require('./config');

/**
 * GET /api/v1/status
 * Check API status and key validity
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    message: API_CONFIG.MESSAGES.SUCCESS,
    version: API_CONFIG.VERSION,
    timestamp: new Date().toISOString(),
    apiKey: {
      masked: APIKeyGenerator.maskKey(req.apiKey),
      valid: true,
      integration: req.apiKeyData.integrationName || 'Unknown',
    },
  });
});

/**
 * GET /api/v1/me
 * Get integration information
 */
router.get('/me', (req, res) => {
  res.json({
    status: 'success',
    data: {
      integrationId: req.integrationId,
      integrationName: req.apiKeyData.integrationName || 'Unknown',
      userId: req.userId,
      email: req.apiKeyData.email,
      createdAt: req.apiKeyData.createdAt,
      requestsLimit: {
        perMinute: API_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE,
        perHour: API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/balance/:phoneNumber
 * Get user balance (example endpoint)
 * 
 * @param {string} phoneNumber - User phone number
 */
router.get('/balance/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(API_CONFIG.HTTP_STATUS.BAD_REQUEST).json({
        error: true,
        message: 'Phone number is required',
        code: 'MISSING_PHONE_NUMBER',
        timestamp: new Date().toISOString(),
      });
    }

    const firebaseDb = req.app.get('firebaseDb');

    // Look up user by phone number
    const usersRef = firebaseDb.ref('users');
    const snapshot = await usersRef
      .orderByChild('phone')
      .equalTo(phoneNumber)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(API_CONFIG.HTTP_STATUS.NOT_FOUND).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    let userData = null;
    snapshot.forEach((child) => {
      userData = child.val();
      userData.uid = child.key;
    });

    res.json({
      status: 'success',
      data: {
        phone: phoneNumber,
        balance: userData.balance || 0,
        currency: 'GHS',
        creditsAvailable: userData.credits || 0,
        lastUpdated: userData.balanceUpdatedAt || new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
      error: true,
      message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
      code: 'FETCH_BALANCE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/user/:phoneNumber
 * Get user information (example endpoint)
 */
router.get('/user/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(API_CONFIG.HTTP_STATUS.BAD_REQUEST).json({
        error: true,
        message: 'Phone number is required',
        code: 'MISSING_PHONE_NUMBER',
        timestamp: new Date().toISOString(),
      });
    }

    const firebaseDb = req.app.get('firebaseDb');

    // Look up user by phone number
    const usersRef = firebaseDb.ref('users');
    const snapshot = await usersRef
      .orderByChild('phone')
      .equalTo(phoneNumber)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(API_CONFIG.HTTP_STATUS.NOT_FOUND).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    let userData = null;
    snapshot.forEach((child) => {
      userData = child.val();
      userData.uid = child.key;
    });

    res.json({
      status: 'success',
      data: {
        uid: userData.uid,
        phone: userData.phone,
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        balance: userData.balance || 0,
        credits: userData.credits || 0,
        accountStatus: userData.accountStatus || 'active',
        joinedAt: userData.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
      error: true,
      message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
      code: 'FETCH_USER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/transaction
 * Create a new transaction (example endpoint)
 * 
 * Body:
 * {
 *   "phoneNumber": "233XXXXXXXXX",
 *   "amount": 5.00,
 *   "type": "data_purchase",
 *   "data_plan": "1GB",
 *   "reference": "unique-ref-12345"
 * }
 */
router.post('/transaction', async (req, res) => {
  try {
    const {
      phoneNumber,
      amount,
      type,
      data_plan,
      reference,
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !amount || !type || !reference) {
      return res.status(API_CONFIG.HTTP_STATUS.BAD_REQUEST).json({
        error: true,
        message: 'Missing required fields: phoneNumber, amount, type, reference',
        code: 'MISSING_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(API_CONFIG.HTTP_STATUS.BAD_REQUEST).json({
        error: true,
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT',
        timestamp: new Date().toISOString(),
      });
    }

    const firebaseDb = req.app.get('firebaseDb');

    // Check for duplicate reference
    const transactionsRef = firebaseDb.ref('transactions');
    const existingTx = await transactionsRef
      .orderByChild('reference')
      .equalTo(reference)
      .once('value');

    if (existingTx.exists()) {
      return res.status(API_CONFIG.HTTP_STATUS.CONFLICT).json({
        error: true,
        message: 'Transaction with this reference already exists',
        code: 'DUPLICATE_REFERENCE',
        timestamp: new Date().toISOString(),
      });
    }

    // Create transaction
    const transactionId = firebaseDb.ref().child('transactions').push().key;
    const transactionData = {
      id: transactionId,
      phoneNumber: phoneNumber,
      amount: amount,
      type: type,
      data_plan: data_plan || null,
      reference: reference,
      integrationId: req.integrationId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: 'api',
    };

    // Save transaction
    await firebaseDb.ref(`transactions/${transactionId}`).set(transactionData);

    res.status(API_CONFIG.HTTP_STATUS.CREATED).json({
      status: 'success',
      message: API_CONFIG.MESSAGES.SUCCESS,
      data: {
        transactionId: transactionId,
        reference: reference,
        status: 'pending',
        createdAt: transactionData.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
      error: true,
      message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
      code: 'CREATE_TRANSACTION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/transaction/:transactionId
 * Get transaction status
 */
router.get('/transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(API_CONFIG.HTTP_STATUS.BAD_REQUEST).json({
        error: true,
        message: 'Transaction ID is required',
        code: 'MISSING_TRANSACTION_ID',
        timestamp: new Date().toISOString(),
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    const snapshot = await firebaseDb.ref(`transactions/${transactionId}`).once('value');

    if (!snapshot.exists()) {
      return res.status(API_CONFIG.HTTP_STATUS.NOT_FOUND).json({
        error: true,
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const transaction = snapshot.val();

    res.json({
      status: 'success',
      data: {
        transactionId: transactionId,
        reference: transaction.reference,
        phoneNumber: transaction.phoneNumber,
        amount: transaction.amount,
        type: transaction.type,
        transactionStatus: transaction.status,
        createdAt: transaction.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
      error: true,
      message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
      code: 'FETCH_TRANSACTION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/docs
 * Get API documentation (HTML or JSON)
 */
router.get('/docs', (req, res) => {
  console.log('📖 /docs endpoint - Accept:', req.headers.accept, 'UA:', req.headers['user-agent']?.substring(0, 30));
  
  // Always try to send HTML to browser requests
  const acceptHeader = req.headers['accept'] || '';
  
  if (acceptHeader.includes('text/html') || acceptHeader.includes('*/*') || !acceptHeader) {
    // Send HTML file
    const path = require('path');
    const htmlPath = path.resolve(__dirname, '../public/api-docs.html');
    console.log('  Sending HTML from:', htmlPath);
    return res.sendFile(htmlPath, (err) => {
      if (err) {
        console.error('❌ sendFile error:', err.message);
        res.status(500).json({ error: 'Could not load docs', details: err.message });
      }
    });
  } else {
    // Return JSON documentation
    res.json({
      status: 'success',
      message: 'API Documentation',
      version: API_CONFIG.VERSION,
      documentation: {
        baseURL: 'https://datasell.store/api/v1',
        authentication: {
          type: 'API Key',
          methods: [
            'Authorization: Bearer YOUR_API_KEY',
            'X-API-Key: YOUR_API_KEY',
          ],
        },
        endpoints: {
          status: {
            method: 'GET',
            path: '/status',
            description: 'Check API status',
            response: { status: 'online', version: '1.0.0' },
          },
          me: {
            method: 'GET',
            path: '/me',
            description: 'Get integration details',
          },
          balance: {
            method: 'GET',
            path: '/balance/:phoneNumber',
            description: 'Get user balance',
          },
          user: {
            method: 'GET',
            path: '/user/:phoneNumber',
            description: 'Get user information',
          },
          transaction: {
            method: 'POST',
            path: '/transaction',
            description: 'Create a new transaction',
            required_fields: ['phoneNumber', 'amount', 'type', 'reference'],
          },
          transactionStatus: {
            method: 'GET',
            path: '/transaction/:transactionId',
            description: 'Get transaction status',
          },
          docs: {
            method: 'GET',
            path: '/docs',
            description: 'Get this documentation',
          },
        },
        rateLimits: {
          perMinute: API_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE,
          perHour: API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
