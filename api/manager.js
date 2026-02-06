/**
 * API Key Manager
 * Manage API keys in Firebase database
 */

const APIKeyGenerator = require('./key-generator');
const API_CONFIG = require('./config');

class APIKeyManager {
  /**
   * Create a new API key
   * @param {object} firebaseDb - Firebase database reference
   * @param {object} keyData - Key data { userId, integrationName, email, expiryDays }
   * @returns {Promise<object>} - Created key data
   */
  static async createAPIKey(firebaseDb, keyData) {
    try {
      const {
        userId,
        integrationName,
        email,
        expiryDays = 365,
      } = keyData;

      if (!userId || !integrationName || !email) {
        throw new Error('Missing required fields: userId, integrationName, email');
      }

      // Generate key
      const { key, hash } = APIKeyGenerator.generateKey();

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Create database entry
      const apiKeyId = firebaseDb.ref().child(API_CONFIG.COLLECTIONS.API_KEYS).push().key;
      const apiKeyEntry = {
        id: apiKeyId,
        hash: hash,
        userId: userId,
        integrationName: integrationName,
        email: email,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastUsedAt: null,
        requestCount: 0,
      };

      // Save to database
      await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .set(apiKeyEntry);

      return {
        success: true,
        message: API_CONFIG.MESSAGES.KEY_CREATED,
        apiKey: key, // Return plain key only once
        keyData: {
          id: apiKeyId,
          masked: APIKeyGenerator.maskKey(key),
          integrationName: integrationName,
          status: 'active',
          createdAt: apiKeyEntry.createdAt,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * Revoke an API key
   * @param {object} firebaseDb - Firebase database reference
   * @param {string} apiKeyId - API key ID
   * @returns {Promise<object>}
   */
  static async revokeAPIKey(firebaseDb, apiKeyId) {
    try {
      if (!apiKeyId) {
        throw new Error('API key ID is required');
      }

      // Update status to revoked
      await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .update({
          status: 'revoked',
          revokedAt: new Date().toISOString(),
        });

      return {
        success: true,
        message: API_CONFIG.MESSAGES.KEY_REVOKED,
        apiKeyId: apiKeyId,
      };
    } catch (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  /**
   * Regenerate an API key
   * @param {object} firebaseDb - Firebase database reference
   * @param {string} apiKeyId - API key ID to regenerate
   * @returns {Promise<object>}
   */
  static async regenerateAPIKey(firebaseDb, apiKeyId) {
    try {
      if (!apiKeyId) {
        throw new Error('API key ID is required');
      }

      // Get existing key data
      const snapshot = await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .once('value');

      if (!snapshot.exists()) {
        throw new Error('API key not found');
      }

      const existingData = snapshot.val();

      // Generate new key
      const { key, hash } = APIKeyGenerator.generateKey();

      // Update in database
      await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .update({
          hash: hash,
          regeneratedAt: new Date().toISOString(),
          previousHash: existingData.hash,
        });

      return {
        success: true,
        message: API_CONFIG.MESSAGES.KEY_REGENERATED,
        apiKey: key,
        keyData: {
          id: apiKeyId,
          masked: APIKeyGenerator.maskKey(key),
          regeneratedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to regenerate API key: ${error.message}`);
    }
  }

  /**
   * Get API key details
   * @param {object} firebaseDb - Firebase database reference
   * @param {string} apiKeyId - API key ID
   * @returns {Promise<object>}
   */
  static async getAPIKeyDetails(firebaseDb, apiKeyId) {
    try {
      if (!apiKeyId) {
        throw new Error('API key ID is required');
      }

      const snapshot = await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .once('value');

      if (!snapshot.exists()) {
        throw new Error('API key not found');
      }

      const keyData = snapshot.val();

      return {
        success: true,
        data: {
          id: keyData.id,
          masked: APIKeyGenerator.maskKey(keyData.hash), // Use hash for mask
          integrationName: keyData.integrationName,
          email: keyData.email,
          status: keyData.status,
          createdAt: keyData.createdAt,
          expiresAt: keyData.expiresAt,
          lastUsedAt: keyData.lastUsedAt,
          requestCount: keyData.requestCount,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get API key details: ${error.message}`);
    }
  }

  /**
   * List all API keys for a user (masked)
   * @param {object} firebaseDb - Firebase database reference
   * @param {string} userId - User ID
   * @returns {Promise<array>}
   */
  static async listUserAPIKeys(firebaseDb, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const snapshot = await firebaseDb
        .ref(API_CONFIG.COLLECTIONS.API_KEYS)
        .orderByChild('userId')
        .equalTo(userId)
        .once('value');

      if (!snapshot.exists()) {
        return {
          success: true,
          data: [],
          count: 0,
        };
      }

      const keys = [];
      snapshot.forEach((child) => {
        const data = child.val();
        keys.push({
          id: child.key,
          masked: APIKeyGenerator.maskKey(data.hash),
          integrationName: data.integrationName,
          status: data.status,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          lastUsedAt: data.lastUsedAt,
          requestCount: data.requestCount,
        });
      });

      return {
        success: true,
        data: keys,
        count: keys.length,
      };
    } catch (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }
  }

  /**
   * Update API key last used timestamp
   * @param {object} firebaseDb - Firebase database reference
   * @param {string} apiKeyId - API key ID
   * @returns {Promise<void>}
   */
  static async updateLastUsed(firebaseDb, apiKeyId) {
    try {
      await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .update({
          lastUsedAt: new Date().toISOString(),
          requestCount: firebaseDb.ServerValue.increment(1),
        });
    } catch (error) {
      console.error('Failed to update last used:', error);
    }
  }

  /**
   * Delete an API key
   * @param {object} firebaseDb - Firebase database reference
   * @param {string} apiKeyId - API key ID
   * @returns {Promise<object>}
   */
  static async deleteAPIKey(firebaseDb, apiKeyId) {
    try {
      if (!apiKeyId) {
        throw new Error('API key ID is required');
      }

      await firebaseDb
        .ref(`${API_CONFIG.COLLECTIONS.API_KEYS}/${apiKeyId}`)
        .remove();

      return {
        success: true,
        message: 'API key deleted successfully',
        apiKeyId: apiKeyId,
      };
    } catch (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }
}

module.exports = APIKeyManager;
