/**
 * API User Routes (Dashboard)
 * User-facing API key management endpoints
 */

const express = require('express');
const router = express.Router();
const APIKeyManager = require('../api/manager');
const APIKeyGenerator = require('../api/key-generator');

/**
 * POST /api/v1/keys/create
 * Create a new API key for the authenticated user
 * 
 * Required auth and body:
 * {
 *   "integrationName": "My Integration",
 *   "integrationDescription": "Optional description",
 *   "expiryDays": 365
 * }
 */
router.post('/create', async (req, res) => {
  try {
    // Verify user is authenticated
    if (!req.user && !req.session) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const { integrationName, integrationDescription, expiryDays } = req.body;

    // Validate input
    if (!integrationName || integrationName.trim().length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Integration name is required',
        code: 'MISSING_INTEGRATION_NAME'
      });
    }

    if (integrationName.length > 100) {
      return res.status(400).json({
        error: true,
        message: 'Integration name too long (max 100 characters)',
        code: 'INVALID_INTEGRATION_NAME'
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    if (!firebaseDb) {
      return res.status(500).json({
        error: true,
        message: 'Database not initialized',
        code: 'DB_ERROR'
      });
    }

    // Create API key
    const result = await APIKeyManager.createAPIKey(firebaseDb, {
      userId: req.user.uid,
      integrationName: integrationName.trim(),
      email: req.user.email,
      expiryDays: expiryDays || 365
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(400).json({
      error: true,
      message: error.message,
      code: 'CREATE_KEY_ERROR'
    });
  }
});

/**
 * GET /api/v1/keys/my-keys
 * Get all API keys for the authenticated user
 */
router.get('/my-keys', async (req, res) => {
  try {
    if (!req.user && !req.session) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    if (!firebaseDb) {
      return res.status(500).json({
        error: true,
        message: 'Database not initialized',
        code: 'DB_ERROR'
      });
    }

    const result = await APIKeyManager.listUserAPIKeys(firebaseDb, req.user.uid);
    res.json(result);
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(400).json({
      error: true,
      message: error.message,
      code: 'LIST_KEYS_ERROR'
    });
  }
});

/**
 * GET /api/v1/keys/:keyId
 * Get details of a specific API key
 */
router.get('/:keyId', async (req, res) => {
  try {
    if (!req.user && !req.session) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    const result = await APIKeyManager.getAPIKeyDetails(firebaseDb, req.params.keyId);
    
    // Verify ownership
    if (result.data && result.success) {
      // Add verification that user owns this key
      res.json(result);
    } else {
      res.status(404).json({ error: true, message: 'Key not found' });
    }
  } catch (error) {
    console.error('Error getting API key details:', error);
    res.status(400).json({
      error: true,
      message: error.message,
      code: 'GET_KEY_ERROR'
    });
  }
});

/**
 * POST /api/v1/keys/:keyId/regenerate
 * Regenerate an API key (get new one, old stops working)
 */
router.post('/:keyId/regenerate', async (req, res) => {
  try {
    if (!req.user && !req.session) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    if (!firebaseDb) {
      return res.status(500).json({
        error: true,
        message: 'Database not initialized',
        code: 'DB_ERROR'
      });
    }

    const result = await APIKeyManager.regenerateAPIKey(firebaseDb, req.params.keyId);
    res.json(result);
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(400).json({
      error: true,
      message: error.message,
      code: 'REGENERATE_KEY_ERROR'
    });
  }
});

/**
 * POST /api/v1/keys/:keyId/revoke
 * Revoke an API key (immediately stops working)
 */
router.post('/:keyId/revoke', async (req, res) => {
  try {
    if (!req.user && !req.session) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    if (!firebaseDb) {
      return res.status(500).json({
        error: true,
        message: 'Database not initialized',
        code: 'DB_ERROR'
      });
    }

    const result = await APIKeyManager.revokeAPIKey(firebaseDb, req.params.keyId);
    res.json(result);
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(400).json({
      error: true,
      message: error.message,
      code: 'REVOKE_KEY_ERROR'
    });
  }
});

/**
 * DELETE /api/v1/keys/:keyId
 * Delete an API key permanently
 */
router.delete('/:keyId', async (req, res) => {
  try {
    if (!req.user && !req.session) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const firebaseDb = req.app.get('firebaseDb');
    if (!firebaseDb) {
      return res.status(500).json({
        error: true,
        message: 'Database not initialized',
        code: 'DB_ERROR'
      });
    }

    const result = await APIKeyManager.deleteAPIKey(firebaseDb, req.params.keyId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(400).json({
      error: true,
      message: error.message,
      code: 'DELETE_KEY_ERROR'
    });
  }
});

module.exports = router;
