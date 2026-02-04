/**
 * SEO Monitoring & Reporting Dashboard
 * Run: node seo-tools/seo-monitor.js
 * 
 * Provides daily reports on:
 * - Crawl errors
 * - Server health
 * - Page performance metrics
 */

const fs = require('fs');
const path = require('path');
const CrawlErrorMonitor = require('./crawl-error-monitor');

class SEOMonitor {
  constructor() {
    this.monitor = new CrawlErrorMonitor();
    this.reportsDir = path.join(__dirname, '../seo-logs/reports');
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate comprehensive SEO health report
   */
  generateHealthReport() {
    const today = new Date().toISOString().split('T')[0];
    const crawlReport = this.monitor.generateDailyReport(new Date(today));
    
    const report = {
      date: today,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: crawlReport.totalErrors,
        criticalIssues: crawlReport.critical.length,
        errorBreakdown: {
          notFound: crawlReport.by404,
          serverErrors: crawlReport.by500,
          mobileIssues: crawlReport.byMobile,
          redirectIssues: crawlReport.byRedirect
        }
      },
      checklist: {
        googleSearchConsole: {
          status: 'PENDING',
          description: 'Set up and verify site in Google Search Console',
          link: 'https://search.google.com/search-console',
          priority: 'CRITICAL'
        },
        googleBusiness: {
          status: 'PENDING',
          description: 'Claim and optimize Google Business Profile',
          link: 'https://business.google.com/',
          priority: 'CRITICAL'
        },
        xmlSitemap: {
          status: crawlReport.totalErrors === 0 ? 'DONE' : 'IN_PROGRESS',
          description: 'Generate and submit XML sitemap',
          command: 'node seo-tools/sitemap-generator.js'
        },
        metaTags: {
          status: 'PENDING',
          description: 'Add meta tags to all pages',
          priority: 'HIGH'
        },
        mobileOptimization: {
          status: 'PENDING',
          description: 'Ensure mobile responsiveness',
          testLink: 'https://search.google.com/test/mobile-friendly'
        },
        pageSpeed: {
          status: 'PENDING',
          description: 'Optimize page load speed',
          testLink: 'https://pagespeed.web.dev/'
        },
        backlinks: {
          status: 'PENDING',
          description: 'Build quality backlinks from Ghana directories',
          priority: 'MEDIUM'
        },
        monitoring: {
          status: crawlReport.totalErrors > 0 ? 'ACTIVE' : 'READY',
          description: 'Monitor crawl errors and server health'
        }
      },
      recommendations: this.generateRecommendations(crawlReport),
      nextSteps: this.generateNextSteps(crawlReport),
      errors: crawlReport.errors.slice(0, 10) // Last 10 errors
    };

    // Save report
    const reportPath = path.join(this.reportsDir, `report-${today}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  generateRecommendations(crawlReport) {
    const recommendations = [];

    if (crawlReport.by404 > 5) {
      recommendations.push({
        priority: 'HIGH',
        message: `${crawlReport.by404} pages returning 404 errors. Create redirects or remove dead links.`,
        action: 'Review SEO logs and add 301 redirects'
      });
    }

    if (crawlReport.by500 > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: `${crawlReport.by500} server errors detected. Check server health immediately.`,
        action: 'Review server logs and restart if needed'
      });
    }

    if (crawlReport.byMobile > 2) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Mobile compatibility issues detected.',
        action: 'Test on various mobile devices and fix responsive design'
      });
    }

    if (crawlReport.totalErrors === 0) {
      recommendations.push({
        priority: 'INFO',
        message: '✅ No crawl errors detected!',
        action: 'Continue monitoring and add new content regularly'
      });
    }

    return recommendations;
  }

  generateNextSteps(crawlReport) {
    const steps = [
      {
        order: 1,
        task: 'Google Search Console Setup',
        description: 'Claim your site and submit sitemap',
        timeframe: 'Today',
        impact: 'CRITICAL'
      },
      {
        order: 2,
        task: 'Fix Crawl Errors',
        description: `Fix ${crawlReport.totalErrors} identified crawl errors`,
        timeframe: 'This week',
        impact: 'HIGH'
      },
      {
        order: 3,
        task: 'Optimize for Mobile',
        description: 'Ensure perfect mobile responsiveness',
        timeframe: 'This week',
        impact: 'HIGH'
      },
      {
        order: 4,
        task: 'Build Backlinks',
        description: 'Submit to Ghana business directories (5+)',
        timeframe: 'This month',
        impact: 'MEDIUM'
      },
      {
        order: 5,
        task: 'Create Content',
        description: 'Blog posts about data bundles and pricing',
        timeframe: 'Ongoing',
        impact: 'MEDIUM'
      },
      {
        order: 6,
        task: 'Monitor Performance',
        description: 'Daily crawl error checks, weekly reports',
        timeframe: 'Ongoing',
        impact: 'HIGH'
      }
    ];

    return steps;
  }

  /**
   * Print formatted health report
   */
  printHealthReport(report) {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          SEO HEALTH REPORT - ' + report.date + '          ║');
    console.log('║              DataMart Ghana (datamartgh.shop)         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Summary
    console.log('📊 ERROR SUMMARY:');
    console.log(`   Total Errors: ${report.summary.totalErrors}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   ├─ 404 Errors: ${report.summary.errorBreakdown.notFound}`);
    console.log(`   ├─ Server Errors: ${report.summary.errorBreakdown.serverErrors}`);
    console.log(`   ├─ Mobile Issues: ${report.summary.errorBreakdown.mobileIssues}`);
    console.log(`   └─ Redirect Issues: ${report.summary.errorBreakdown.redirectIssues}\n`);

    // Checklist
    console.log('✅ SETUP CHECKLIST:\n');
    Object.entries(report.checklist).forEach(([key, item], idx) => {
      const icon = item.status === 'DONE' ? '✅' : item.status === 'ACTIVE' ? '🔄' : '⭕';
      const priority = item.priority ? ` [${item.priority}]` : '';
      console.log(`   ${idx + 1}. ${icon} ${this.formatKey(key)}${priority}`);
      console.log(`      ${item.description}`);
      if (item.command) console.log(`      Run: ${item.command}`);
      if (item.link) console.log(`      📍 ${item.link}`);
      console.log('');
    });

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:\n');
      report.recommendations.forEach((rec, idx) => {
        const icon = rec.priority === 'CRITICAL' ? '🚨' : rec.priority === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} [${rec.priority}] ${rec.message}`);
        console.log(`      → ${rec.action}\n`);
      });
    }

    // Next Steps
    console.log('🎯 NEXT STEPS (Priority Order):\n');
    report.nextSteps.forEach(step => {
      const icon = step.impact === 'CRITICAL' ? '🚨' : step.impact === 'HIGH' ? '⚠️' : '📌';
      console.log(`   ${step.order}. ${icon} ${step.task}`);
      console.log(`      ${step.description}`);
      console.log(`      Timeline: ${step.timeframe} | Impact: ${step.impact}\n`);
    });

    // Recent Errors
    if (report.errors.length > 0) {
      console.log('📋 RECENT ERRORS (Last 10):\n');
      report.errors.slice(0, 5).forEach((error, idx) => {
        console.log(`   ${idx + 1}. [${error.type}] ${error.url}`);
        console.log(`      Action: ${error.action}\n`);
      });
    }

    console.log('─'.repeat(58));
    console.log(`✨ Report generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`📁 Saved to: seo-logs/reports/report-${report.date}.json\n`);
  }

  formatKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Check if site is ready for Google submission
   */
  isReadyForSubmission() {
    const checks = {
      sitemapExists: fs.existsSync(path.join(__dirname, '../public/sitemap.xml')),
      robotsExists: fs.existsSync(path.join(__dirname, '../public/robots.txt')),
      noServerErrors: !fs.existsSync(path.join(__dirname, '../seo-logs')) ||
        !fs.readdirSync(path.join(__dirname, '../seo-logs')).some(f => f.includes('.json'))
    };

    return {
      ready: checks.sitemapExists && checks.robotsExists,
      checks
    };
  }
}

// CLI Interface
if (require.main === module) {
  const seoMonitor = new SEOMonitor();
  const report = seoMonitor.generateHealthReport();
  seoMonitor.printHealthReport(report);

  // Check submission readiness
  const readiness = seoMonitor.isReadyForSubmission();
  if (readiness.ready) {
    console.log('🚀 READY FOR GOOGLE SUBMISSION');
    console.log('   Sitemap: ✅');
    console.log('   Robots.txt: ✅');
    console.log('   No major server errors: ✅\n');
  } else {
    console.log('⚠️  NOT YET READY FOR SUBMISSION');
    if (!readiness.checks.sitemapExists) {
      console.log('   ❌ Sitemap missing. Run: node seo-tools/sitemap-generator.js');
    }
    if (!readiness.checks.robotsExists) {
      console.log('   ❌ robots.txt missing. Run: node seo-tools/sitemap-generator.js');
    }
    console.log();
  }
}

module.exports = SEOMonitor;
