# DataSell SEO Setup Guide
**Last Updated:** January 9, 2026

## 2. GOOGLE SEARCH CONSOLE SETUP

Google Search Console is where you monitor how your website appears in Google search results.

### Quick Setup (20 minutes)
1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click "Add Property"
3. Enter your website URL: `https://www.datasell.store`
4. Verify ownership (choose any method):
   - HTML file upload (easiest)
   - HTML tag in `<head>`
   - DNS record
   - Google Analytics property
5. Once verified, do these immediately:
   - **Submit Sitemap:** Go to "Sitemaps" → Submit `https://www.datasell.store/sitemap.xml`
   - **Check Coverage:** Look for any errors (fix 404s first)
   - **Check Mobile:** Ensure mobile compatibility
   - **Monitor Performance:** Track impressions, clicks, CTR

### Key Metrics to Watch
- **Impressions:** How often your site appears
- **Clicks:** How many people click to visit
- **Average Position:** Your ranking (1-100+)
- **Click-Through Rate (CTR):** % who click vs appear

---

## 3. TECHNICAL SEO IMPROVEMENTS

### A. XML Sitemap Generation
Run this command to auto-generate your sitemap:

```bash
node seo-tools/sitemap-generator.js
```

This creates:
- `public/sitemap.xml` - List of all your pages
- `public/robots.txt` - Crawling instructions

### B. Meta Tags Implementation
Add to all HTML pages (at minimum your homepage):
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Ghana's #1 cheapest data bundles! Buy MTN, Telecel, AirtelTigo data from GH₵1. Best prices guaranteed. Instant delivery. Non-expiry.">
<meta name="keywords" content="data bundles Ghana, MTN data, Telecel data, AirtelTigo data, cheap bundles, Ghana mobile data">
<meta name="robots" content="index, follow">
<meta property="og:title" content="DataMart Ghana - Cheapest Data Bundles">
<meta property="og:description" content="Buy data from GH₵1 with instant delivery">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.datasell.store">
<meta property="og:image" content="https://www.datasell.store/logo.png">
<link rel="canonical" href="https://www.datasell.store">
```

**For each bundle page, customize:**
- Title: "MTN Data Bundles Ghana - From ₵1"
- Description: Unique description for that bundle type
- og:image: Screenshot of that specific bundle

### C. JSON-LD Structured Data
Add to your main page:
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "DataMart Ghana",
  "url": "https://www.datasell.store",
  "description": "Ghana's #1 cheapest data bundles",
  "image": "https://www.datasell.store/logo.png"
}
```

### D. robots.txt (Auto-generated)
Automatically created with:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/auth
Allow: /sitemap.xml
Sitemap: https://www.datasell.store/sitemap.xml
```

### E. Performance Optimization
- **Images:** Use WebP format, compress sizes
- **CSS/JS:** Minify files
- **Caching:** Enable browser caching
- **GZIP:** Enable compression on server
- **Target:** Page load < 3 seconds

Test your speed:
```
https://pagespeed.web.dev/
```
### D. robots.txt
Create at root:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/auth
Allow: /sitemap.xml
Sitemap: https://www.datasell.store/sitemap.xml
```

### E. Performance Optimization
- Images: Use WebP format, optimize sizes
- Minify CSS/JS
- Enable GZIP compression
- Use CDN if possible
- Page Speed Target: <3 seconds

---

## 5. BACKLINKS & AUTHORITY STRATEGY

### High-Priority Local Directories (Ghana)
1. **Business Ghana** - businessgha.com
2. **Ghana Yellow Pages** - ghyellowpages.com
3. **Ghana Trade Directory** - ghatrade.com
4. **Kumasi Classified** - kumasiclassified.com
5. **Yen Ghana** - yen.com.gh

### Secondary Directories
6. **Tech Ghana** - techghana.com
7. **Ghana Web** - ghanaweb.com
8. **Business Links Ghana** - businesslinks.com.gh

### Content Strategy
1. Create blog posts:
   - "How to buy data bundles in Ghana 2026"
   - "MTN vs Telecel vs AirtelTigo: Price comparison"
   - "Data bundle deals this month"
2. Guest posts on tech blogs
3. Press releases for major updates

---

## 6. MONITORING & CRAWL ERROR FIXES

### What to Monitor
1. **Google Search Console Coverage Errors**
   - Not found (404 errors)
   - Server errors (5xx)
   - Redirects

2. **Mobile Usability Issues**
   - Buttons too small
   - Text too small
   - Not clickable

3. **Page Crawlability**
   - Blocked resources
   - Meta tags issues
   - Structured data errors

### Fixing Common Crawl Errors
| Error | Fix |
|-------|-----|
| 404 - Page Not Found | Remove dead links or create 301 redirects |
| 500 - Server Error | Check server logs, restart services |
| Mobile errors | Test on mobile, use responsive design |
| Slow page | Optimize images, minify CSS/JS |

### Testing Tools
- Google Search Console (free)
- PageSpeed Insights (free)
- Mobile-Friendly Test (free)
- Lighthouse (free)

---

## IMPLEMENTATION CHECKLIST

- [ ] **Google Search Console**
  - [ ] Set up Google Search Console
  - [ ] Verify site ownership
  - [ ] Submit sitemap
  - [ ] Check crawl errors daily for first week
  - [ ] Fix all 404 errors
  - [ ] Check mobile usability

- [ ] **Technical SEO**
  - [ ] Generate XML sitemap
  - [ ] Add meta tags to all pages
  - [ ] Add JSON-LD structured data
  - [ ] Create robots.txt
  - [ ] Enable GZIP compression
  - [ ] Optimize images (WebP format)

- [ ] **Content & Ranking**
  - [ ] Create blog posts (1 per week)
  - [ ] Optimize for keywords
  - [ ] Add internal links
  - [ ] Keep content fresh

- [ ] **Backlinks**
  - [ ] Submit to 5+ Ghana directories
  - [ ] Reach out to local tech blogs
  - [ ] Create guest post opportunities
  - [ ] Send press release for major updates

---

## MONTHLY MAINTENANCE

1. **Week 1:** Review Google Search Console for new errors
2. **Week 2:** Check ranking for target keywords
3. **Week 3:** Add new blog content
4. **Week 4:** Analyze top queries, optimize for them

---

## RESOURCES

- Google Search Console: https://search.google.com/search-console
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
- PageSpeed Insights: https://pagespeed.web.dev/
