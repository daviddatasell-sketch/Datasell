/**
 * API Key Generator
 * Secure API key generation and management
 */

const crypto = require('crypto');
const API_CONFIG = require('./config');

class APIKeyGenerator {
  /**
   * Generate a secure API key
   * @returns {Object} - { key, hash }
   */
  static generateKey() {
    try {
      // Generate random bytes
      const randomBytes = crypto.randomBytes(24).toString('hex');
      
      // Create API key with prefix
      const apiKey = `${API_CONFIG.KEY_PREFIX}${API_CONFIG.KEY_VERSION}_${randomBytes}`;
      
      // Create hash for storage (bcryptjs would need additional dependency)
      // Using SHA256 for storage instead
      const hash = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
      
      return {
        key: apiKey,
        hash: hash,
        createdAt: new Date(),
        version: API_CONFIG.KEY_VERSION,
      };
    } catch (error) {
      throw new Error(`Failed to generate API key: ${error.message}`);
    }
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean}
   */
  static validateKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Check prefix
    if (!apiKey.startsWith(API_CONFIG.KEY_PREFIX)) {
      return false;
    }

    // Check version
    if (!apiKey.includes(API_CONFIG.KEY_VERSION)) {
      return false;
    }

    // Check length (prefix + version + underscore + random bytes)
    if (apiKey.length < 20 || apiKey.length > 100) {
      return false;
    }

    return true;
  }

  /**
   * Hash an API key for comparison
   * @param {string} apiKey - API key to hash
   * @returns {string} - Hash of the API key
   */
  static hashKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Verify API key against its hash
   * @param {string} apiKey - Plain API key
   * @param {string} hash - Stored hash
   * @returns {boolean}
   */
  static verifyKey(apiKey, hash) {
    const computedHash = this.hashKey(apiKey);
    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    );
  }

  /**
   * Generate a secret key for webhook/signature verification
   * @returns {Object} - { secret, hash }
   */
  static generateSecret() {
    try {
      const secret = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(secret).digest('hex');

      return {
        secret: secret,
        hash: hash,
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to generate secret: ${error.message}`);
    }
  }

  /**
   * Create a signature for request verification
   * @param {string} payload - Request payload
   * @param {string} secret - Secret key
   * @returns {string} - Signature
   */
  static createSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Verify a signature
   * @param {string} payload - Request payload
   * @param {string} signature - Provided signature
   * @param {string} secret - Secret key
   * @returns {boolean}
   */
  static verifySignature(payload, signature, secret) {
    try {
      const expectedSignature = this.createSignature(payload, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Mask API key for display purposes (show only last 8 chars)
   * @param {string} apiKey - API key to mask
   * @returns {string} - Masked key
   */
  static maskKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
      return '****';
    }
    return apiKey.substring(0, apiKey.length - 8) + '****';
  }

  /**
   * Generate a webhook URL signature timestamp
   * @returns {number} - Current timestamp
   */
  static getTimestamp() {
    return Math.floor(Date.now() / 1000);
  }
}

module.exports = APIKeyGenerator;
