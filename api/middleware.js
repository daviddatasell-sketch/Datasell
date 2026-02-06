/**
 * API Middleware
 * Authentication, rate limiting, and error handling
 */

const APIKeyGenerator = require('./key-generator');
const API_CONFIG = require('./config');

// In-memory storage for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

/**
 * Extract API key from request headers
 * Supports: Authorization: Bearer <key> or X-API-Key: <key>
 */
function extractAPIKey(req) {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Try query parameter (not recommended but supported)
  if (req.query && req.query.api_key) {
    return req.query.api_key;
  }

  return null;
}

/**
 * Validate API key format middleware
 */
function validateAPIKeyFormat(req, res, next) {
  // Skip API key validation for public endpoints and dashboard routes
  const publicPaths = ['/keys/', '/status', '/docs'];
  if (publicPaths.some(path => req.path.startsWith(path) || req.path === path)) {
    console.log('⏭️  Skipping API key validation for public route:', req.path);
    return next();
  }

  const apiKey = extractAPIKey(req);

  if (!apiKey) {
    return res.status(API_CONFIG.HTTP_STATUS.UNAUTHORIZED).json({
      error: true,
      message: API_CONFIG.MESSAGES.INVALID_API_KEY,
      code: 'MISSING_API_KEY',
      timestamp: new Date().toISOString(),
    });
  }

  if (!APIKeyGenerator.validateKeyFormat(apiKey)) {
    return res.status(API_CONFIG.HTTP_STATUS.UNAUTHORIZED).json({
      error: true,
      message: API_CONFIG.MESSAGES.INVALID_API_KEY,
      code: 'INVALID_API_KEY_FORMAT',
      timestamp: new Date().toISOString(),
    });
  }

  req.apiKey = apiKey;
  req.apiKeyHash = APIKeyGenerator.hashKey(apiKey);
  next();
}

/**
 * Authenticate API key against database
 * This requires Firebase integration
 */
async function authenticateAPIKey(req, res, next) {
  try {
    // Skip API key authentication for public endpoints and dashboard routes
    const publicPaths = ['/keys/', '/status', '/docs'];
    if (publicPaths.some(path => req.path.startsWith(path) || req.path === path)) {
      console.log('⏭️  Skipping API key auth for public route:', req.path);
      return next();
    }

    const apiKeyHash = req.apiKeyHash;

    // Get Firebase reference (passed from main server)
    const firebaseDb = req.app.get('firebaseDb');
    if (!firebaseDb) {
      console.error('Firebase database not initialized');
      return res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
        error: true,
        message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
        code: 'DB_NOT_INITIALIZED',
        timestamp: new Date().toISOString(),
      });
    }

    // Look up API key in database
    const apiKeysRef = firebaseDb.ref(API_CONFIG.COLLECTIONS.API_KEYS);
    const snapshot = await apiKeysRef
      .orderByChild('hash')
      .equalTo(apiKeyHash)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(API_CONFIG.HTTP_STATUS.UNAUTHORIZED).json({
        error: true,
        message: API_CONFIG.MESSAGES.INVALID_API_KEY,
        code: 'API_KEY_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Get the API key data
    let apiKeyData = null;
    snapshot.forEach((child) => {
      apiKeyData = child.val();
      apiKeyData.id = child.key;
    });

    // Check if key is active
    if (apiKeyData.status !== 'active') {
      return res.status(API_CONFIG.HTTP_STATUS.UNAUTHORIZED).json({
        error: true,
        message: 'API key is not active',
        code: 'API_KEY_INACTIVE',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if key has expired
    if (apiKeyData.expiresAt && new Date(apiKeyData.expiresAt) < new Date()) {
      return res.status(API_CONFIG.HTTP_STATUS.UNAUTHORIZED).json({
        error: true,
        message: 'API key has expired',
        code: 'API_KEY_EXPIRED',
        timestamp: new Date().toISOString(),
      });
    }

    // Attach API key data to request
    req.apiKeyData = apiKeyData;
    req.integrationId = apiKeyData.integrationId;
    req.userId = apiKeyData.userId;

    next();
  } catch (error) {
    console.error('API authentication error:', error);
    return res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
      error: true,
      message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Rate limiting middleware
 * Tracks requests per minute and hour
 */
function rateLimitMiddleware(req, res, next) {
  // Skip rate limiting for public endpoints and dashboard routes
  const publicPaths = ['/keys/', '/status', '/docs'];
  if (publicPaths.some(path => req.path.startsWith(path) || req.path === path)) {
    console.log('⏭️  Skipping rate limit for public route:', req.path);
    return next();
  }

  const apiKeyHash = req.apiKeyHash;
  const now = Math.floor(Date.now() / 60000); // Current minute

  if (!rateLimitStore.has(apiKeyHash)) {
    rateLimitStore.set(apiKeyHash, {
      minute: { count: 0, timestamp: now },
      hour: { count: 0, timestamp: Math.floor(now / 60) },
    });
  }

  const limits = rateLimitStore.get(apiKeyHash);

  // Reset if new minute
  if (limits.minute.timestamp !== now) {
    limits.minute = { count: 0, timestamp: now };
  }

  // Reset if new hour
  const currentHour = Math.floor(now / 60);
  if (limits.hour.timestamp !== currentHour) {
    limits.hour = { count: 0, timestamp: currentHour };
  }

  // Check limits
  if (limits.minute.count >= API_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE) {
    return res.status(API_CONFIG.HTTP_STATUS.RATE_LIMIT_EXCEEDED).json({
      error: true,
      message: 'Rate limit exceeded (per minute)',
      code: 'RATE_LIMIT_MINUTE',
      timestamp: new Date().toISOString(),
    });
  }

  if (limits.hour.count >= API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR) {
    return res.status(API_CONFIG.HTTP_STATUS.RATE_LIMIT_EXCEEDED).json({
      error: true,
      message: 'Rate limit exceeded (per hour)',
      code: 'RATE_LIMIT_HOUR',
      timestamp: new Date().toISOString(),
    });
  }

  // Increment counters
  limits.minute.count++;
  limits.hour.count++;

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit-Minute', API_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE);
  res.setHeader('X-RateLimit-Remaining-Minute', API_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE - limits.minute.count);
  res.setHeader('X-RateLimit-Limit-Hour', API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR);
  res.setHeader('X-RateLimit-Remaining-Hour', API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR - limits.hour.count);

  next();
}

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('API Error:', err);

  res.status(API_CONFIG.HTTP_STATUS.INTERNAL_ERROR).json({
    error: true,
    message: API_CONFIG.MESSAGES.INTERNAL_ERROR,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(API_CONFIG.HTTP_STATUS.NOT_FOUND).json({
    error: true,
    message: API_CONFIG.MESSAGES.ENDPOINT_NOT_FOUND,
    code: 'ENDPOINT_NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log API request
 */
async function logAPIRequest(req, res, next) {
  const startTime = Date.now();

  // Log response when it completes
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const firebaseDb = req.app.get('firebaseDb');

      if (firebaseDb && req.apiKeyData) {
        const logEntry = {
          integrationId: req.integrationId,
          userId: req.userId,
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode,
          duration: duration,
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
        };

        // Store log in Firebase
        firebaseDb
          .ref(`${API_CONFIG.COLLECTIONS.API_USAGE}/${Date.now()}`)
          .set(logEntry)
          .catch((err) => console.error('Failed to log API usage:', err));
      }
    } catch (error) {
      console.error('Error logging API request:', error);
    }
  });

  next();
}

module.exports = {
  validateAPIKeyFormat,
  authenticateAPIKey,
  rateLimitMiddleware,
  errorHandler,
  notFoundHandler,
  logAPIRequest,
  extractAPIKey,
};
