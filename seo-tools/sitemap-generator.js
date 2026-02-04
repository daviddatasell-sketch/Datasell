/**
 * XML Sitemap Generator for DataSell
 * Generates sitemap.xml for Google Search Console
 * Run: node seo-tools/sitemap-generator.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://datamartgh.shop';
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap.xml');

// Define all important pages on your site
const pages = [
  {
    url: '/',
    changefreq: 'daily',
    priority: 1.0,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/bundle',
    changefreq: 'daily',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/login',
    changefreq: 'monthly',
    priority: 0.8,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/register',
    changefreq: 'monthly',
    priority: 0.8,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/faq',
    changefreq: 'monthly',
    priority: 0.7,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/about',
    changefreq: 'monthly',
    priority: 0.7,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/contact',
    changefreq: 'monthly',
    priority: 0.7,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/privacy-policy',
    changefreq: 'yearly',
    priority: 0.5,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/terms-of-service',
    changefreq: 'yearly',
    priority: 0.5,
    lastmod: new Date().toISOString().split('T')[0]
  },
  // Dynamic routes - add more as your site grows
  {
    url: '/mtn-bundles',
    changefreq: 'daily',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/telecel-bundles',
    changefreq: 'daily',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    url: '/airtel-bundles',
    changefreq: 'daily',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  }
];

// Generate XML sitemap
function generateSitemap() {
  const entries = pages.map(page => `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return sitemap;
}

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory');
}

// Write sitemap
try {
  fs.writeFileSync(OUTPUT_PATH, generateSitemap());
  console.log('✅ Sitemap generated successfully!');
  console.log(`📍 Location: ${OUTPUT_PATH}`);
  console.log(`🌍 URL: ${BASE_URL}/sitemap.xml`);
  console.log(`📄 Total URLs: ${pages.length}`);
} catch (error) {
  console.error('❌ Error generating sitemap:', error.message);
  process.exit(1);
}

// Also generate robots.txt
const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/auth
Disallow: /api/admin
Disallow: /dashboard
Allow: /api

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml

# Crawl delay (optional - in seconds)
Crawl-delay: 1

# Block specific crawlers if needed
# User-agent: BadBot
# Disallow: /`;

const robotsPath = path.join(__dirname, '../public/robots.txt');
fs.writeFileSync(robotsPath, robotsTxt);
console.log('\n✅ robots.txt generated successfully!');
console.log(`📍 Location: ${robotsPath}`);
