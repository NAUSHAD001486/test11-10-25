# Frontend-Backend Separation Plan

## Current Architecture Analysis

### Current Structure (Monolithic)
```
/Users/nausadalam/11.0/
├── server.js          # Express server serving both static files + API
├── public/            # Frontend files (HTML, CSS, JS)
│   ├── index.html
│   ├── js/app.js      # Makes API calls to /api/*
│   ├── css/styles.css
│   └── ...
├── config.env         # Environment variables
└── package.json       # Dependencies for both frontend & backend
```

### API Endpoints (Backend)
1. `/api/usage` - GET - Check daily usage limit
2. `/api/upload/device` - POST - Upload files from device
3. `/api/upload/url` - POST - Upload files from URL
4. `/api/convert` - POST - Convert files to target format
5. `/api/download` - POST - Download single or multiple files
6. `/api/zip-job` - POST - Create ZIP job
7. `/api/zip-status` - GET - Check ZIP job status
8. `/api/zip-file` - GET - Download ZIP file
9. `/api/contact` - POST - Contact form submission
10. `/health` - GET - Health check

### Frontend API Calls
All API calls in `public/js/app.js` use relative paths:
- `/api/usage`
- `/api/upload/device`
- `/api/upload/url`
- `/api/convert`
- `/api/download`
- `/api/zip-job`
- `/api/zip-status`
- `/api/zip-file`
- `/api/contact`

## Recommended Approach

### ✅ **Separate First, Then Connect**

**Why:**
1. Test separation locally before deployment
2. Configure CORS and environment variables properly
3. Less risk during deployment
4. Easier debugging if issues arise

## New Architecture Structure

### Backend (AWS)
```
backend/
├── server.js          # API-only Express server
├── config.env         # Backend environment variables
├── package.json       # Backend dependencies
└── uploads/           # Temporary file storage (auto-cleanup)
```

### Frontend (Vercel)
```
frontend/
├── index.html
├── js/
│   └── app.js         # Updated with API_BASE_URL
├── css/
│   └── styles.css
├── public/            # Static assets
├── vercel.json        # Vercel configuration
└── package.json       # Frontend dependencies (if any)
```

## Separation Steps

### Step 1: Create Backend Structure
- Remove static file serving from `server.js`
- Keep only API routes
- Remove HTML page routes (frontend will serve these)
- Update CORS to allow Vercel domain

### Step 2: Update Frontend
- Add environment variable for API base URL
- Update all API calls to use `API_BASE_URL` instead of relative paths
- Create Vercel configuration file

### Step 3: Configuration
- Backend: Set `ALLOWED_ORIGINS` to include Vercel domain
- Frontend: Set `API_BASE_URL` to AWS backend URL
- Test CORS and API connectivity

### Step 4: Deployment Preparation
- Backend: Prepare for AWS deployment (EC2/Lambda/ECS)
- Frontend: Prepare for Vercel deployment
- Documentation for both deployments

## Key Changes Required

### Backend (`server.js`)
1. ✅ Remove `express.static` middleware
2. ✅ Remove HTML page routes (`/privacy-policy.html`, etc.)
3. ✅ Update CORS to include Vercel domain
4. ✅ Keep all `/api/*` routes
5. ✅ Keep `/health` endpoint

### Frontend (`public/js/app.js`)
1. ✅ Add `API_BASE_URL` environment variable
2. ✅ Update all `fetch('/api/...')` to `fetch(API_BASE_URL + '/api/...')`
3. ✅ Handle CORS errors gracefully
4. ✅ Keep all UI/UX features unchanged

### Environment Variables

**Backend (`config.env`)**
```env
# Existing variables
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# New for CORS
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://your-domain.com
PRODUCTION_DOMAIN=https://your-vercel-domain.vercel.app

# AWS specific
AWS_REGION=us-east-1
PORT=3000
```

**Frontend (Vercel Environment Variables)**
```env
NEXT_PUBLIC_API_URL=https://your-aws-backend.com
# OR
VITE_API_URL=https://your-aws-backend.com
```

## Features to Preserve
- ✅ All 13 output formats
- ✅ File upload from device
- ✅ File upload from URL
- ✅ Batch conversion
- ✅ ZIP download
- ✅ Daily usage limit (2GB)
- ✅ Error handling
- ✅ Progress tracking
- ✅ Mobile compatibility
- ✅ Safari compatibility
- ✅ Design unchanged
- ✅ All legal pages (Privacy Policy, Terms, About, Contact)

## Testing Strategy
1. Test locally with frontend pointing to local backend
2. Test CORS with different origins
3. Test all API endpoints
4. Test file uploads and downloads
5. Test ZIP functionality
6. Test mobile compatibility
7. Deploy backend to AWS
8. Deploy frontend to Vercel
9. Test production deployment

## Next Steps
1. Create backend structure
2. Update frontend API calls
3. Configure environment variables
4. Test locally
5. Deploy to AWS and Vercel

