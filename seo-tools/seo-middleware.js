/**
 * SEO Server Middleware
 * Add to your Express server for better SEO
 * 
 * Import and use:
 * const { seoMiddleware, CrawlErrorMonitor } = require('./seo-tools/seo-middleware');
 * app.use(seoMiddleware);
 */

const helmet = require('helmet');
const CrawlErrorMonitor = require('./crawl-error-monitor');

const monitor = new CrawlErrorMonitor();

/**
 * Main SEO middleware
 * Adds important headers and handles errors
 */
const seoMiddleware = (req, res, next) => {
  // Store original send function
  const originalSend = res.send;

  // Override send to track responses
  res.send = function(data) {
    // Log 404 errors
    if (res.statusCode === 404 && req.path !== '/api/health') {
      monitor.logError('404', `${req.protocol}://${req.get('host')}${req.path}`, {
        method: req.method,
        referrer: req.get('referer') || 'direct'
      });
    }

    // Log 500 errors
    if (res.statusCode >= 500) {
      monitor.logError('500', `${req.protocol}://${req.get('host')}${req.path}`, {
        method: req.method,
        statusCode: res.statusCode
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  // Add critical SEO headers
  res.set({
    'X-UA-Compatible': 'IE=edge',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });

  // Enable compression header
  res.set('Vary', 'Accept-Encoding');

  next();
};

/**
 * Meta tags middleware for dynamic pages
 * Usage: app.get('/bundle', metaTagMiddleware({
 *   title: 'Buy Data Bundles - DataMart Ghana',
 *   description: '...'
 * }), controller);
 */
const metaTagMiddleware = (metaData) => {
  return (req, res, next) => {
    res.locals.metaData = {
      title: metaData.title || 'DataMart Ghana - Cheapest Data Bundles',
      description: metaData.description || 'Buy data from GH₵1 with instant delivery',
      keywords: metaData.keywords || 'data bundles Ghana, MTN, Telecel, AirtelTigo',
      image: metaData.image || 'https://datamartgh.shop/logo.png',
      url: metaData.url || `https://datamartgh.shop${req.path}`
    };
    next();
  };
};

/**
 * Structured data middleware
 * Adds JSON-LD schema for rich snippets
 */
const structuredDataMiddleware = (schema) => {
  return (req, res, next) => {
    res.locals.structuredData = schema;
    next();
  };
};

/**
 * 404 handler with logging
 * Use as last middleware
 */
const notFoundHandler = (req, res) => {
  monitor.logError('404', `${req.protocol}://${req.get('host')}${req.path}`, {
    method: req.method,
    userAgent: req.get('user-agent')
  });

  res.status(404).json({
    error: 'Page not found',
    path: req.path,
    message: 'The page you are looking for does not exist'
  });
};

/**
 * Error handler with logging
 * Use as error middleware: app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  monitor.logError(statusCode.toString(), `${req.protocol}://${req.get('host')}${req.path}`, {
    message: err.message,
    stack: err.stack
  });

  res.status(statusCode).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};

/**
 * Sitemap handler
 * Add to your routes: app.get('/sitemap.xml', sitemapHandler);
 */
const sitemapHandler = (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  
  if (fs.existsSync(sitemapPath)) {
    res.type('application/xml');
    res.sendFile(sitemapPath);
  } else {
    res.status(404).send('Sitemap not found');
  }
};

/**
 * Robots.txt handler
 * Add to your routes: app.get('/robots.txt', robotsHandler);
 */
const robotsHandler = (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const robotsPath = path.join(__dirname, '../public/robots.txt');
  
  if (fs.existsSync(robotsPath)) {
    res.type('text/plain');
    res.sendFile(robotsPath);
  } else {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: https://datamartgh.shop/sitemap.xml`);
  }
};

module.exports = {
  seoMiddleware,
  metaTagMiddleware,
  structuredDataMiddleware,
  notFoundHandler,
  errorHandler,
  sitemapHandler,
  robotsHandler,
  CrawlErrorMonitor,
  monitor
};
