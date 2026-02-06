/**
 * API Configuration
 * Centralized configuration for API system
 */

const API_CONFIG = {
  // API Key Configuration
  KEY_LENGTH: 32,
  KEY_PREFIX: 'ds_', // Datasell prefix
  KEY_VERSION: 'v1',
  
  // Rate Limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
  },
  
  // API Versioning
  VERSION: '1.0.0',
  SUPPORTED_VERSIONS: ['v1'],
  
  // Database Collections
  COLLECTIONS: {
    API_KEYS: 'api_keys',
    API_USAGE: 'api_usage',
    INTEGRATIONS: 'integrations',
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMIT_EXCEEDED: 429,
    INTERNAL_ERROR: 500,
  },
  
  // API Response Messages
  MESSAGES: {
    SUCCESS: 'Request successful',
    INVALID_API_KEY: 'Invalid or missing API key',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    ENDPOINT_NOT_FOUND: 'Endpoint not found',
    INVALID_REQUEST: 'Invalid request',
    INTERNAL_ERROR: 'Internal server error',
    KEY_CREATED: 'API key created successfully',
    KEY_REVOKED: 'API key revoked successfully',
    KEY_REGENERATED: 'API key regenerated successfully',
  },
};

module.exports = API_CONFIG;
