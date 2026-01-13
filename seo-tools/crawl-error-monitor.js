/**
 * Google Search Console Crawl Error Monitoring
 * Helps track and fix SEO issues
 * 
 * To use:
 * 1. Get Google Search Console API credentials
 * 2. Add to your .env file
 * 3. Run: node seo-tools/crawl-error-monitor.js
 */

const fs = require('fs');
const path = require('path');

// Check for crawl error logs
class CrawlErrorMonitor {
  constructor() {
    this.logsDir = path.join(__dirname, '../seo-logs');
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  // Log a potential crawl error
  logError(errorType, url, details = {}) {
    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      type: errorType, // '404', '500', 'redirect', 'mobile-error', 'blocked-resource'
      url,
      details,
      severity: this.calculateSeverity(errorType),
      action: this.suggestAction(errorType)
    };

    const logFile = path.join(this.logsDir, `errors-${new Date().toISOString().split('T')[0]}.json`);
    
    let errors = [];
    if (fs.existsSync(logFile)) {
      errors = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    errors.push(errorLog);
    fs.writeFileSync(logFile, JSON.stringify(errors, null, 2));
    
    return errorLog;
  }

  calculateSeverity(errorType) {
    const severities = {
      '500': 'CRITICAL',
      '404': 'HIGH',
      'redirect': 'MEDIUM',
      'mobile-error': 'MEDIUM',
      'blocked-resource': 'LOW',
      'slow-page': 'MEDIUM'
    };
    return severities[errorType] || 'LOW';
  }

  suggestAction(errorType) {
    const actions = {
      '500': 'Check server logs immediately. Restart if needed.',
      '404': 'Remove broken link or create 301 redirect',
      'redirect': 'Convert to direct links, avoid redirect chains',
      'mobile-error': 'Test on mobile device, ensure responsive design',
      'blocked-resource': 'Check robots.txt, ensure CSS/JS can be crawled',
      'slow-page': 'Optimize images, minify JS/CSS, enable caching'
    };
    return actions[errorType] || 'Review and fix';
  }

  // Generate daily report
  generateDailyReport(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `errors-${dateStr}.json`);
    
    if (!fs.existsSync(logFile)) {
      return { date: dateStr, errors: [], summary: 'No errors logged' };
    }

    const errors = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    
    const summary = {
      date: dateStr,
      totalErrors: errors.length,
      by404: errors.filter(e => e.type === '404').length,
      by500: errors.filter(e => e.type === '500').length,
      byMobile: errors.filter(e => e.type === 'mobile-error').length,
      byRedirect: errors.filter(e => e.type === 'redirect').length,
      critical: errors.filter(e => e.severity === 'CRITICAL'),
      errors: errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };

    return summary;
  }

  // Print formatted report
  printReport(report) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     CRAWL ERROR REPORT - ' + report.date + '    ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`📊 Total Errors: ${report.totalErrors}`);
    console.log(`   🔴 404 Not Found: ${report.by404}`);
    console.log(`   🔴 500 Server Error: ${report.by500}`);
    console.log(`   ⚠️  Mobile Issues: ${report.byMobile}`);
    console.log(`   ↩️  Redirect Issues: ${report.byRedirect}\n`);

    if (report.critical.length > 0) {
      console.log('🚨 CRITICAL ISSUES (Immediate Action Required):\n');
      report.critical.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error.type} - ${error.url}`);
        console.log(`      Action: ${error.action}\n`);
      });
    }

    if (report.totalErrors === 0) {
      console.log('✅ No errors detected! Your site is crawl-friendly.\n');
    }
  }
}

// Export for use in middleware
module.exports = CrawlErrorMonitor;

// Quick CLI usage
if (require.main === module) {
  const monitor = new CrawlErrorMonitor();
  
  // Example: Log some test errors
  if (process.argv[2] === 'test') {
    console.log('📝 Logging test errors...\n');
    
    monitor.logError('404', 'https://datamartgh.shop/old-page', { 
      referrer: 'internal link from homepage' 
    });
    monitor.logError('500', 'https://datamartgh.shop/api/bundles', { 
      message: 'Database connection failed' 
    });
    monitor.logError('mobile-error', 'https://datamartgh.shop/bundle', {
      message: 'Buttons too small for mobile'
    });
  }
  
  // Show report for today
  const report = monitor.generateDailyReport();
  monitor.printReport(report);
}
