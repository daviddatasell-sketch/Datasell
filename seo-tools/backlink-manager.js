#!/usr/bin/env node
/**
 * DataMart SEO Backlink Manager
 * Submit your site to Ghana business directories for better authority
 * 
 * Run: node seo-tools/backlink-manager.js
 */

const fs = require('fs');
const path = require('path');

class BacklinkManager {
  constructor() {
    this.backlinkLog = path.join(__dirname, '../seo-logs/backlinks.json');
    this.ensureBacklinkLog();
  }

  ensureBacklinkLog() {
    if (!fs.existsSync(path.dirname(this.backlinkLog))) {
      fs.mkdirSync(path.dirname(this.backlinkLog), { recursive: true });
    }
    if (!fs.existsSync(this.backlinkLog)) {
      fs.writeFileSync(this.backlinkLog, JSON.stringify({ submissions: [] }, null, 2));
    }
  }

  /**
   * Ghana Business Directories
   * High-value backlinks for local SEO
   */
  getGhanaDirectories() {
    return [
      {
        name: 'Business Ghana',
        url: 'https://www.businessgha.com',
        category: 'Business Directory',
        submissionUrl: 'https://www.businessgha.com/submit',
        difficulty: 'Easy',
        authority: 'High',
        priority: 1
      },
      {
        name: 'Ghana Yellow Pages',
        url: 'https://www.ghyellowpages.com',
        category: 'Business Directory',
        submissionUrl: 'https://www.ghyellowpages.com/submit-listing',
        difficulty: 'Easy',
        authority: 'High',
        priority: 1
      },
      {
        name: 'Ghana Trade Directory',
        url: 'https://www.ghatrade.com',
        category: 'B2B Directory',
        submissionUrl: 'https://www.ghatrade.com/add-business',
        difficulty: 'Easy',
        authority: 'Medium',
        priority: 2
      },
      {
        name: 'Kumasi Classified',
        url: 'https://www.kumasiclassified.com',
        category: 'Classified Ads',
        submissionUrl: 'https://www.kumasiclassified.com/post-ad',
        difficulty: 'Easy',
        authority: 'Medium',
        priority: 2
      },
      {
        name: 'Yen Ghana',
        url: 'https://yen.com.gh',
        category: 'News & Business',
        submissionUrl: 'https://yen.com.gh/contact',
        difficulty: 'Medium',
        authority: 'Very High',
        priority: 1,
        notes: 'Contact for guest post opportunity'
      },
      {
        name: 'MTN Ghana Partners',
        url: 'https://www.mtn.com.gh',
        category: 'Official Partner',
        submissionUrl: 'https://www.mtn.com.gh/partner-with-us',
        difficulty: 'Hard',
        authority: 'Very High',
        priority: 1,
        notes: 'Apply to be official MTN reseller'
      },
      {
        name: 'Telecel Ghana Partners',
        url: 'https://www.telecelghana.com',
        category: 'Official Partner',
        submissionUrl: 'https://www.telecelghana.com/business/partner',
        difficulty: 'Hard',
        authority: 'Very High',
        priority: 1,
        notes: 'Apply to be official Telecel reseller'
      },
      {
        name: 'Google My Business',
        url: 'https://business.google.com',
        category: 'Search Engine',
        submissionUrl: 'https://business.google.com',
        difficulty: 'Very Easy',
        authority: 'Highest',
        priority: 1
      },
      {
        name: 'Tech Ghana',
        url: 'https://www.techghana.com',
        category: 'Tech Blog',
        submissionUrl: 'https://www.techghana.com/contact',
        difficulty: 'Medium',
        authority: 'Medium',
        priority: 2,
        notes: 'Guest post opportunity'
      },
      {
        name: 'Ghana Web',
        url: 'https://www.ghanaweb.com',
        category: 'News Portal',
        submissionUrl: 'https://www.ghanaweb.com',
        difficulty: 'Medium',
        authority: 'Very High',
        priority: 2,
        notes: 'Press release or business listing'
      }
    ];
  }

  /**
   * Get submission information template
   */
  getSubmissionTemplate() {
    return {
      businessName: 'DataMart Ghana',
      businessUrl: 'https://datamartgh.shop',
      category: 'Mobile Data & Telecom Services',
      description: `Ghana's #1 cheapest data bundles! Buy MTN, Telecel, AirtelTigo data from GH₵1. 
        Best prices guaranteed. Instant delivery. Non-expiry data plans. 30000+ daily orders.
        Serving Ghana since 2024.`,
      phone: '+233XXXXXXXXX', // Add your number
      email: 'contact@datamartgh.shop', // Update with your email
      address: 'Your Business Address, Ghana',
      keywords: 'data bundles, MTN data, Telecel data, AirtelTigo data, Ghana mobile data',
      socialMedia: {
        facebook: 'https://facebook.com/datamartghana',
        twitter: 'https://twitter.com/datamartghana',
        whatsapp: '+233XXXXXXXXX'
      }
    };
  }

  /**
   * Log a backlink submission
   */
  logSubmission(directoryName, status = 'pending', notes = '') {
    const log = JSON.parse(fs.readFileSync(this.backlinkLog, 'utf8'));
    
    log.submissions.push({
      directory: directoryName,
      url: 'https://datamartgh.shop',
      date: new Date().toISOString(),
      status: status, // pending, submitted, approved, rejected
      notes: notes,
      result: {
        backlinksCreated: status === 'approved' ? 1 : 0,
        authorityGained: 'TBD'
      }
    });

    fs.writeFileSync(this.backlinkLog, JSON.stringify(log, null, 2));
  }

  /**
   * Generate submission plan
   */
  generateSubmissionPlan() {
    const directories = this.getGhanaDirectories();
    
    // Sort by priority
    const plan = {
      week1: directories.filter(d => d.priority === 1 && d.difficulty === 'Very Easy'),
      week2: directories.filter(d => d.priority === 1 && d.difficulty === 'Easy'),
      week3: directories.filter(d => d.priority === 1 && (d.difficulty === 'Medium' || d.difficulty === 'Hard')),
      week4: directories.filter(d => d.priority === 2)
    };

    return plan;
  }

  /**
   * Print formatted backlink strategy
   */
  printStrategy() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          BACKLINK BUILDING STRATEGY                    ║');
    console.log('║              DataMart Ghana (datamartgh.shop)          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const directories = this.getGhanaDirectories();
    
    console.log('🎯 HIGH PRIORITY DIRECTORIES (Do First):\n');
    directories
      .filter(d => d.priority === 1)
      .sort((a, b) => {
        const order = { 'Very Easy': 0, 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        return order[a.difficulty] - order[b.difficulty];
      })
      .forEach((dir, idx) => {
        console.log(`${idx + 1}. ${dir.name}`);
        console.log(`   📍 ${dir.url}`);
        console.log(`   📝 ${dir.category} | Difficulty: ${dir.difficulty}`);
        console.log(`   🔗 Submit at: ${dir.submissionUrl}`);
        if (dir.notes) console.log(`   💡 ${dir.notes}`);
        console.log('');
      });

    console.log('\n📊 MEDIUM PRIORITY DIRECTORIES:\n');
    directories
      .filter(d => d.priority === 2)
      .forEach((dir, idx) => {
        console.log(`${idx + 1}. ${dir.name}`);
        console.log(`   📍 ${dir.url}`);
        console.log(`   🔗 Submit at: ${dir.submissionUrl}\n`);
      });

    console.log('\n📋 SUBMISSION CHECKLIST:\n');
    console.log('Before submitting to any directory, prepare:');
    console.log('   ✅ Business name: DataMart Ghana');
    console.log('   ✅ Website: https://datamartgh.shop');
    console.log('   ✅ Business description (ready above)');
    console.log('   ✅ Phone number');
    console.log('   ✅ Email address');
    console.log('   ✅ Business address');
    console.log('   ✅ Business logo (if required)');
    console.log('   ✅ Social media links\n');

    console.log('📅 4-WEEK SUBMISSION SCHEDULE:\n');
    
    const plan = this.generateSubmissionPlan();
    
    console.log('WEEK 1 - Very Easy (Quick wins):');
    plan.week1.forEach(d => console.log(`   • ${d.name}`));
    
    console.log('\nWEEK 2 - Easy:');
    plan.week2.forEach(d => console.log(`   • ${d.name}`));
    
    console.log('\nWEEK 3 - Medium/Hard (High authority):');
    plan.week3.forEach(d => console.log(`   • ${d.name}`));
    
    console.log('\nWEEK 4 - Secondary directories:');
    plan.week4.forEach(d => console.log(`   • ${d.name}`));

    console.log('\n\n🚀 EXPECTED RESULTS:\n');
    console.log('   Expected new backlinks: 10-15');
    console.log('   Authority gain: Significant');
    console.log('   Timeline: 4 weeks minimum');
    console.log('   Ranking improvement: 2-4 months\n');

    console.log('💻 Submission Template saved to: seo-tools/backlink-manager.js');
    console.log('   Use getSubmissionTemplate() method for fill-in details\n');
  }
}

// CLI
if (require.main === module) {
  const manager = new BacklinkManager();
  manager.printStrategy();
  
  // Show template
  const template = manager.getSubmissionTemplate();
  console.log('\n📋 SUBMISSION TEMPLATE:');
  console.log(JSON.stringify(template, null, 2));
}

module.exports = BacklinkManager;
