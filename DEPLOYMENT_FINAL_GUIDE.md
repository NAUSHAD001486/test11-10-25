# 🚀 Final Deployment Guide - Production Ready

## ✅ Pre-Deployment Checklist

### Backend Improvements ✅
- [x] ✅ `.env.example` created with all required variables
- [x] ✅ Hardcoded paths removed (using `process.env` and `path.join(__dirname, ...)`)
- [x] ✅ Excessive console.logs cleaned up (production-ready)
- [x] ✅ CORS configured to only allow Vercel domains in production
- [x] ✅ Cloudinary configuration verified
- [x] ✅ API rate limiting verified
- [x] ✅ File cleanup cronjob verified

### Frontend Improvements ✅
- [x] ✅ `app.js` uses `getApiBaseUrl()` for all API calls
- [x] ✅ `vercel.json` configured with proper headers
- [x] ✅ `.env.local.example` created
- [x] ✅ All static assets in place

## 📋 Step-by-Step Deployment

### Step 1: Backend Deployment (AWS EC2)

#### 1.1 Setup AWS EC2 Instance
```bash
# Launch EC2 instance (Ubuntu 22.04 LTS)
# Configure security groups:
# - Port 22 (SSH)
# - Port 80 (HTTP)
# - Port 443 (HTTPS)
# - Port 3000 (Node.js - internal only)
```

#### 1.2 SSH into Server
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 1.3 Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should be v18+
```

#### 1.4 Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-username/your-repo.git
cd your-repo/backend
sudo chown -R ubuntu:ubuntu /opt/your-repo
```

#### 1.5 Install Dependencies
```bash
cd /opt/your-repo/backend
npm install --production
```

#### 1.6 Configure Environment Variables
```bash
# Create .env file
cp .env.example .env
nano .env

# Add your actual values:
# - CLOUDINARY_CLOUD_NAME
# - CLOUDINARY_API_KEY
# - CLOUDINARY_API_SECRET
# - ALLOWED_ORIGINS (Comma-separated: https://your-site.vercel.app,https://www.example.com)
# - FRONTEND_URL
# - SMTP settings (if using contact form)
# - LOG_LEVEL (optional: info, warn, error - default: info)
```

**Important:** `ALLOWED_ORIGINS` should be comma-separated without spaces between domains:
```env
ALLOWED_ORIGINS=https://your-site.vercel.app,https://www.example.com
```

#### 1.7 Install PM2
```bash
sudo npm install -g pm2
pm2 start server.js --name "love-u-convert-api"
pm2 save
pm2 startup
# Follow the command output to enable PM2 on startup
```

#### 1.8 Setup Nginx Reverse Proxy
```bash
sudo apt update
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/love-u-convert-api
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for large file uploads
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/love-u-convert-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 1.9 Setup HTTPS (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
# Follow prompts and enter email
# Certbot will auto-configure HTTPS
```

#### 1.10 Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### 1.11 Setup PM2 Cronjob for Cleanup (Recommended)
```bash
# Create cleanup script
nano /opt/your-repo/backend/scripts/cleanup.sh
```

**cleanup.sh:**
```bash
#!/bin/bash
# Daily cleanup script - Runs independently of Node.js process

# Reset daily usage (via API endpoint)
curl -X POST http://localhost:3000/api/admin/reset-usage 2>/dev/null

# Cleanup old files in uploads directory
find /opt/your-repo/backend/uploads -type f -mtime +1 -delete 2>/dev/null

# Log cleanup
echo "$(date): Cleanup completed" >> /opt/your-repo/backend/logs/cleanup.log
```

```bash
# Make executable
chmod +x /opt/your-repo/backend/scripts/cleanup.sh

# Edit crontab
crontab -e

# Add these lines:
# Daily usage reset at midnight
0 0 * * * curl -X POST http://localhost:3000/api/admin/reset-usage

# File cleanup every 2 hours
0 */2 * * * /opt/your-repo/backend/scripts/cleanup.sh

# Verify cronjob
crontab -l
```

**Benefits:**
- ✅ Runs even if server crashes
- ✅ Independent of Node.js process
- ✅ More reliable for critical tasks

#### 1.12 Verify Backend
```bash
# Test health endpoint
curl http://localhost:3000/health
# Should return: {"status":"OK","timestamp":"..."}

# Test from external
curl https://api.yourdomain.com/health

# Check PM2
pm2 status
pm2 logs love-u-convert-api

# Check cronjobs
crontab -l

# Check logs
tail -f /opt/your-repo/backend/logs/combined.log
tail -f /opt/your-repo/backend/logs/error.log
```

### Step 2: Frontend Deployment (Vercel)

#### 2.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 2.2 Deploy to Vercel
```bash
cd frontend
vercel
# Follow prompts:
# - Link to existing project? No
# - Project name: love-u-convert
# - Directory: ./
# - Override settings? No
```

#### 2.3 Configure Environment Variables
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add: `NEXT_PUBLIC_API_URL = https://api.yourdomain.com`
- Save and redeploy

#### 2.4 Configure Domain
- Go to Vercel Dashboard → Your Project → Settings → Domains
- Add domain: `www.yourdomain.com`
- Follow DNS configuration instructions
- Update DNS records in your domain registrar

#### 2.5 Verify Frontend
```bash
# Test frontend
curl https://www.yourdomain.com
# Should return HTML

# Test in browser
# Open: https://www.yourdomain.com
# Check browser console for API calls
```

### Step 3: Update Backend CORS

#### 3.1 Update .env File
```bash
# On AWS server
cd /opt/your-repo/backend
nano .env

# Update ALLOWED_ORIGINS:
ALLOWED_ORIGINS=https://www.yourdomain.com,https://your-vercel-domain.vercel.app
```

#### 3.2 Restart Backend
```bash
pm2 restart love-u-convert-api
pm2 logs love-u-convert-api
```

### Step 4: Verify Integration

#### 4.1 Test All Features
- [ ] Upload image from device
- [ ] Upload image from URL
- [ ] Convert image (all 13 formats)
- [ ] Download single image
- [ ] Download ZIP (multiple images)
- [ ] Daily limit check
- [ ] Contact form submission
- [ ] Error handling

#### 4.2 Performance Check
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] File upload speed acceptable
- [ ] Conversion speed acceptable

#### 4.3 Security Check
- [ ] HTTPS enforced
- [ ] CORS working correctly
- [ ] Rate limiting active
- [ ] File validation working

## 🔒 Security Best Practices

### Backend Security
- ✅ **Environment Variables**: All secrets in `.env` (NOT in Git)
- ✅ **CORS**: Only Vercel domains allowed
- ✅ **HTTPS**: Enforced via Nginx and Let's Encrypt
- ✅ **Rate Limiting**: 1000 requests/day per IP
- ✅ **File Validation**: Magic bytes + size checks
- ✅ **Auto Cleanup**: Files deleted after 2 hours

### Frontend Security
- ✅ **HTTPS**: Automatic via Vercel
- ✅ **Security Headers**: Configured in `vercel.json`
- ✅ **CSP**: Content Security Policy enabled
- ✅ **No Secrets**: No API keys in frontend code

## 🚀 Optional: Cloudflare CDN Setup

### Why Cloudflare?
- ✅ Global CDN for faster loading
- ✅ DDoS protection
- ✅ Free SSL
- ✅ Cache optimization

### Setup Steps
1. Sign up at https://cloudflare.com
2. Add your domain
3. Update DNS nameservers
4. Enable Proxy (orange cloud)
5. Configure SSL/TLS → Full (strict)
6. Enable Auto Minify
7. Enable Brotli compression

## 📊 Monitoring & Maintenance

### PM2 Monitoring
```bash
# Check status
pm2 status

# View logs
pm2 logs love-u-convert-api

# Monitor
pm2 monit

# Restart
pm2 restart love-u-convert-api
```

### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Cloudinary Monitoring
- Check Cloudinary Dashboard for usage
- Monitor API calls
- Check storage usage
- Review error logs

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs love-u-convert-api --lines 50

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check firewall
sudo ufw status
```

### Frontend Issues
- Check Vercel Dashboard → Deployments → Logs
- Check browser console for errors
- Verify environment variables
- Check API URL configuration

### CORS Issues
```bash
# Check backend .env
cat .env | grep ALLOWED_ORIGINS

# Should include Vercel domain
# Restart backend after changes
pm2 restart love-u-convert-api
```

## ✅ Success Criteria

### Backend
- ✅ Health check: `https://api.yourdomain.com/health` returns `{"status":"OK"}`
- ✅ PM2 running: `pm2 status` shows running
- ✅ HTTPS working: Browser shows green lock
- ✅ CORS working: Frontend can make API calls

### Frontend
- ✅ Website loads: `https://www.yourdomain.com` loads correctly
- ✅ All pages working: About, Contact, Privacy, Terms
- ✅ API calls successful: No CORS errors in console
- ✅ HTTPS working: Browser shows green lock

### Integration
- ✅ Upload working: Images upload successfully
- ✅ Convert working: Images convert to all formats
- ✅ Download working: Files download correctly
- ✅ Contact form working: Emails sent successfully

---

**Status**: ✅ Production Ready | Follow steps above for deployment

