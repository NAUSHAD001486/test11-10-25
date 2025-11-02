# Production Deployment Guide - Live Server Setup

## Overview
Complete guide for deploying Love U Convert to a live production server with HTTPS, security, and SEO optimizations.

## Pre-Deployment Checklist

### ✅ Required Updates Before Deployment

1. **Update Domain in Config Files:**
   - `config.env` - Set `PRODUCTION_DOMAIN` and `ALLOWED_ORIGINS`
   - `public/index.html` - Update `og:url`, `og:image`, `canonical`, structured data
   - `public/robots.txt` - Update sitemap URL
   - `public/sitemap.xml` - Update all URLs
   - `public/manifest.json` - Update start_url if needed

2. **Environment Variables (`config.env`):**
   ```env
   PRODUCTION_DOMAIN=https://yourdomain.com
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   NODE_ENV=production
   ENABLE_CACHE=true
   ```

3. **SSL Certificate:**
   - Ensure SSL certificate is installed on server
   - HTTPS must be configured (Let's Encrypt recommended)
   - Server must support HTTPS on port 443

## Security Features (All Enabled in Production)

### ✅ HTTPS Enforcement
- **Automatic HTTP → HTTPS redirect** (301 redirect)
- **HSTS Headers**: Force HTTPS for 1 year with subdomains
- **HSTS Preload**: Eligible for browser preload lists
- **X-Forwarded-Proto**: Support for proxy/load balancer

### ✅ Security Headers (Helmet.js)
- **Content Security Policy (CSP)**: XSS protection
- **XSS Filter**: Enabled
- **Frame Guard**: Prevent clickjacking (deny)
- **No Sniff**: Prevent MIME type sniffing
- **Referrer Policy**: SEO-friendly referrer policy
- **Permissions Policy**: Restrict geolocation, mic, camera

### ✅ Rate Limiting
- **1000 requests per day per IP**
- **Applied only to API endpoints**
- **Site always browsable** (no rate limit on HTML/assets)

### ✅ File Security
- **File type validation**: Magic bytes + extension check
- **File size limits**: 2GB max per file, 2GB daily limit per IP
- **Auto cleanup**: Files deleted after 2 hours
- **Server-side validation**: All uploads validated

### ✅ CORS Protection
- **Production domain whitelist only**
- **Credentials enabled** for secure requests
- **Development**: Allows localhost only

### ✅ API Security
- **No caching**: All API endpoints never cached
- **Secure headers**: All API responses include security headers
- **Input validation**: All inputs validated server-side

## SEO Features (All Enabled)

### ✅ Meta Tags
- **Title**: Optimized with keywords
- **Description**: SEO-friendly description
- **Keywords**: Relevant keywords included
- **Author**: Proper attribution
- **Robots**: Index, follow with max preview
- **Language**: English
- **Canonical URL**: Prevents duplicate content

### ✅ Open Graph (Social Media)
- **Title, Description, Image**: Optimized for sharing
- **Type**: Website
- **Locale**: en_US
- **Site Name**: Love U Convert

### ✅ Twitter Cards
- **Summary large image**: For better preview
- **Title, Description, Image**: Optimized

### ✅ Structured Data (JSON-LD)
- **WebApplication schema**: Complete application info
- **Aggregate rating**: For rich snippets
- **Feature list**: Highlighted features
- **Offers**: Free pricing info

### ✅ Technical SEO
- **Robots.txt**: Properly configured
- **Sitemap.xml**: Complete with all pages
- **Canonical tags**: Prevent duplicate content
- **Mobile-friendly**: Responsive meta tags
- **Fast loading**: Optimized assets

## Deployment Steps

### Step 1: Update Domain Configuration

Edit `config.env`:
```env
PRODUCTION_DOMAIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
ENABLE_CACHE=true
```

### Step 2: Update HTML Meta Tags

Edit `public/index.html`:
- Replace `https://yourdomain.com` with your actual domain
- Update `og:url`, `og:image`, `canonical`, structured data URLs

### Step 3: Update Sitemap & Robots.txt

Edit `public/sitemap.xml`:
- Replace `https://yourdomain.com` with your actual domain
- Update `lastmod` dates to current date

Edit `public/robots.txt`:
- Replace `https://yourdomain.com` in sitemap URL

### Step 4: Server Setup

#### Option A: Direct Node.js (Recommended)
1. Upload all files to server
2. Install dependencies: `npm install --production`
3. Set environment variables
4. Start: `npm start` or use PM2

#### Option B: Behind Reverse Proxy (Nginx/Apache)
1. Configure reverse proxy (Nginx/Apache)
2. SSL termination at proxy level
3. Forward to Node.js on port 3000
4. Ensure `X-Forwarded-Proto` header is forwarded

### Step 5: SSL Certificate Setup

#### Let's Encrypt (Recommended - Free)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 6: PM2 Setup (Process Manager - Recommended)

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server.js --name "love-u-convert"

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Step 7: Verify Deployment

1. **HTTPS Check:**
   - Visit `http://yourdomain.com` → Should redirect to `https://yourdomain.com`
   - Check SSL certificate is valid

2. **Security Headers Check:**
   ```bash
   curl -I https://yourdomain.com
   ```
   Should show:
   - `Strict-Transport-Security`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`

3. **SEO Check:**
   - Validate with Google Search Console
   - Check robots.txt: `https://yourdomain.com/robots.txt`
   - Check sitemap: `https://yourdomain.com/sitemap.xml`
   - Test meta tags with Facebook Debugger, Twitter Card Validator

4. **Performance Check:**
   - Test with Google PageSpeed Insights
   - Test with GTmetrix
   - Verify cache headers for CSS/JS (1 year cache)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PRODUCTION_DOMAIN` | Your production domain | `https://loveuconvert.com` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://loveuconvert.com,https://www.loveuconvert.com` |
| `NODE_ENV` | Environment | `production` |
| `ENABLE_CACHE` | Enable smart caching | `true` |
| `CACHE_VERSION` | Cache version for busting | `1.0.0` |
| `HTTPS_ONLY` | Force HTTPS | `true` |
| `HSTS_MAX_AGE` | HSTS max age in seconds | `31536000` (1 year) |

## Production Checklist

### Before Going Live:
- [ ] Domain configured in `config.env`
- [ ] Meta tags updated in `index.html`
- [ ] Sitemap URLs updated
- [ ] Robots.txt sitemap URL updated
- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect working
- [ ] Security headers verified
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Cache enabled for production
- [ ] Error handling tested
- [ ] API endpoints working
- [ ] File upload working
- [ ] Conversion working
- [ ] Download working

### After Going Live:
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify robots.txt in Search Console
- [ ] Test with PageSpeed Insights
- [ ] Monitor error logs
- [ ] Check HTTPS status
- [ ] Verify security headers
- [ ] Test mobile responsiveness
- [ ] Test all browsers

## Monitoring & Maintenance

### Logs
```bash
# PM2 logs
pm2 logs love-u-convert

# Error logs
pm2 logs love-u-convert --err
```

### Updates
1. Make changes to files
2. Increment `CACHE_VERSION` in `config.env`
3. Update version in `index.html` (CSS/JS URLs)
4. Restart server: `pm2 restart love-u-convert`
5. Users will get new version automatically

### SSL Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Auto-renewal is setup by default
# Check cron: sudo crontab -e
```

## Troubleshooting

### HTTPS Not Working?
1. Check SSL certificate is installed
2. Verify port 443 is open
3. Check firewall rules
4. Verify reverse proxy configuration

### CORS Errors?
1. Check `ALLOWED_ORIGINS` in `config.env`
2. Verify domain matches exactly
3. Check browser console for exact error

### Cache Not Working?
1. Check `ENABLE_CACHE=true` in `config.env`
2. Verify `NODE_ENV=production`
3. Check browser cache headers

### SEO Issues?
1. Verify sitemap is accessible
2. Check robots.txt is accessible
3. Validate structured data with Google Rich Results Test
4. Submit sitemap to Search Console

## Support

For issues or questions:
- Check server logs
- Verify environment variables
- Test with curl commands
- Check browser console for errors

---

**Your website is now production-ready with enterprise-level security and SEO!**

