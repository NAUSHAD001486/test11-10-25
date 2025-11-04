# 🏗️ Professional Architecture Structure

## ✅ Complete File Structure

### Root Directory (`/`)
```
/Users/nausadalam/11.0/
├── ✅ backend/                    # Backend API (AWS deployment)
├── ✅ frontend/                    # Frontend (Vercel deployment)
├── ⚠️  public/                     # Original frontend (can be removed if frontend/ has all files)
├── ❌ server.js                   # REMOVED - Now in backend/
├── ❌ config.env                  # REMOVED - Now in backend/.env
├── ❌ package.json                # REMOVED - Split into backend/ and frontend/
└── ✅ Documentation files
```

### Backend Directory (`/backend`) ✅
```
backend/
├── ✅ server.js                   # Main API server (refactored with routes/controllers/middleware)
├── ✅ .env                        # Environment variables (NOT in Git)
├── ✅ .env.example                # Example env file (for reference)
├── ✅ package.json                # Backend dependencies
├── ✅ package-lock.json            # Dependencies lock
├── ✅ .gitignore                  # Git ignore rules
├── ✅ routes/
│   └── ✅ api.js                   # All API routes
├── ✅ controllers/
│   ├── ✅ uploadController.js     # Upload logic
│   ├── ✅ convertController.js    # Convert logic
│   ├── ✅ downloadController.js   # Download logic
│   ├── ✅ zipController.js         # ZIP job logic
│   └── ✅ contactController.js    # Contact form logic
├── ✅ middleware/
│   └── ✅ trackUsage.js            # Usage tracking middleware
├── ✅ utils/
│   ├── ✅ usageTracker.js          # Usage tracker Map
│   ├── ✅ cloudinary.js            # Cloudinary utilities
│   ├── ✅ fileValidation.js        # File validation utilities
│   ├── ✅ download.js              # Download utilities
│   └── ✅ axiosKA.js               # Axios with Keep-Alive
└── ✅ uploads/                    # Temporary storage (auto-cleanup)
```

### Frontend Directory (`/frontend`) ✅
```
frontend/
├── ✅ index.html                  # Main page (API_BASE_URL configured)
├── ✅ about-us.html               # About Us page
├── ✅ contact-us.html             # Contact Us page (API call updated)
├── ✅ privacy-policy.html         # Privacy Policy page
├── ✅ terms-of-service.html       # Terms of Service page
├── ✅ package.json                # Frontend dependencies
├── ✅ vercel.json                 # Vercel configuration
├── ✅ .env.local.example           # Example env file (for reference)
├── ✅ .gitignore                  # Git ignore rules
├── ✅ manifest.json                # PWA manifest
├── ✅ sw.js                        # Service Worker
├── ✅ robots.txt                   # SEO robots file
├── ✅ sitemap.xml                  # SEO sitemap
├── ✅ favicon.ico                  # Favicon
├── ✅ favicon.svg                  # SVG favicon
├── ✅ css/
│   └── ✅ styles.css               # All styles (unchanged)
├── ✅ js/
│   └── ✅ app.js                   # Frontend JS (API_BASE_URL updated)
├── ✅ icons/
│   └── ✅ image-icon.svg           # Image icon
└── ✅ logo/
    └── ✅ README.md                # Logo directory readme
```

## 📋 Environment Files (.env)

### Backend `.env` (NOT in Git)
```env
# Node Environment
NODE_ENV=production

# Server Port
PORT=3000

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS Configuration
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://www.yourdomain.com
FRONTEND_URL=https://your-vercel-domain.vercel.app

# SMTP Configuration (for contact form)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_EMAIL=Contact@love-u-convert.com

# Security
HSTS_MAX_AGE=31536000
```

### Frontend `.env.local` (NOT in Git)
```env
# Backend API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🚀 Deployment Checklist

### Backend (AWS) ✅

#### 1. Setup AWS Server
- [ ] Launch EC2 instance (Ubuntu 22.04 LTS recommended)
- [ ] Configure security groups (ports 80, 443, 3000)
- [ ] SSH into server
- [ ] Install Node.js (v18+ recommended)

#### 2. Install Dependencies
```bash
cd /path/to/backend
npm install
```

#### 3. Configure Environment
```bash
# Create .env file
cp .env.example .env
# Edit .env with your actual values
nano .env
```

#### 4. Install PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name "love-u-convert-api"
pm2 save
pm2 startup
```

#### 5. Setup Nginx Reverse Proxy
```bash
sudo apt update
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/love-u-convert-api
```

Nginx Config:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/love-u-convert-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Setup HTTPS (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

#### 7. Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### 8. Verify Backend
- [ ] Test: `curl http://localhost:3000/health`
- [ ] Test: `curl https://api.yourdomain.com/health`
- [ ] Check PM2: `pm2 status`
- [ ] Check logs: `pm2 logs love-u-convert-api`

### Frontend (Vercel) ✅

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Deploy to Vercel
```bash
cd frontend
vercel
```

#### 3. Configure Environment Variables
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add: `NEXT_PUBLIC_API_URL = https://api.yourdomain.com`

#### 4. Configure Domain
- Go to Vercel Dashboard → Project → Settings → Domains
- Add your domain: `www.yourdomain.com`
- Update DNS records as instructed

#### 5. Update Backend CORS
- Update `backend/.env`: `ALLOWED_ORIGINS=https://www.yourdomain.com,https://your-vercel-domain.vercel.app`
- Restart backend: `pm2 restart love-u-convert-api`

#### 6. Verify Frontend
- [ ] Test: `https://www.yourdomain.com`
- [ ] Test: Image upload
- [ ] Test: Image conversion
- [ ] Test: Download
- [ ] Test: Contact form

## 🔍 Key Architecture Points

### Backend Structure
- **Routes**: All API endpoints in `routes/api.js`
- **Controllers**: Business logic separated into controllers
- **Middleware**: Reusable middleware (trackUsage, etc.)
- **Utils**: Shared utilities (cloudinary, validation, etc.)
- **No Static Files**: Backend only serves API, no HTML/CSS/JS

### Frontend Structure
- **Static Files**: All HTML, CSS, JS in `frontend/`
- **API Calls**: All API calls use `getApiBaseUrl()` function
- **Environment Variables**: `NEXT_PUBLIC_API_URL` for production
- **No Build Process**: Pure static files (no React/Vue/etc.)

### Security
- ✅ CORS configured for specific origins
- ✅ Helmet.js security headers
- ✅ Rate limiting on API routes
- ✅ HTTPS enforcement (production)
- ✅ Environment variables (secrets not in Git)

### Performance
- ✅ Keep-Alive HTTP agents
- ✅ Compression middleware
- ✅ Parallel processing (batch size: 8)
- ✅ In-memory ZIP creation
- ✅ Auto-cleanup (2 hours)

## 📝 File Removal Checklist

### Files to Remove from Root
- [ ] `server.js` → Now in `backend/server.js`
- [ ] `config.env` → Now in `backend/.env`
- [ ] `package.json` → Split into `backend/package.json` and `frontend/package.json`
- [ ] `package-lock.json` → Split into backend and frontend

### Files to Keep
- ✅ `public/` → Can keep for reference (or remove if frontend/ has all files)
- ✅ Documentation files (README, guides, etc.)

## 🎯 Next Steps

1. ✅ **Backend Structure**: Complete
2. ✅ **Frontend Structure**: Complete
3. ⏳ **Remove Root Files**: Remove unnecessary files from root
4. ⏳ **Test Locally**: Test separated frontend/backend locally
5. ⏳ **Deploy Backend**: Deploy to AWS
6. ⏳ **Deploy Frontend**: Deploy to Vercel
7. ⏳ **Configure Domains**: Setup DNS and SSL
8. ⏳ **Final Testing**: Test all features in production

## ✅ Verification

### Backend Verification
```bash
cd backend
npm install
node server.js
# Should see: "✅ Server running on port 3000"
# Test: curl http://localhost:3000/health
```

### Frontend Verification
```bash
cd frontend
python3 -m http.server 3001
# Open: http://localhost:3001
# Check console for API calls
```

---

**Status**: ✅ Architecture Complete | Ready for Deployment

