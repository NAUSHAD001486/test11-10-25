# 🚀 Deployment Guide - AWS & Vercel

## 📋 Pre-Deployment Checklist

### ✅ Separation Complete
- [x] Backend and frontend separated
- [x] Local testing successful
- [x] CORS configured
- [x] All features working

## 🌐 Backend Deployment (AWS)

### Option 1: AWS EC2

#### Step 1: Prepare Files
```bash
cd backend
# Files ready:
# - server.js
# - config.env
# - package.json
# - .gitignore
```

#### Step 2: Upload to EC2
```bash
# Using SCP
scp -r backend/* user@your-ec2-ip:/path/to/app/

# Or using Git
git clone your-repo
cd backend
```

#### Step 3: Install Dependencies
```bash
cd /path/to/app/backend
npm install --production
```

#### Step 4: Configure Environment Variables
Edit `config.env`:
```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://your-domain.com
FRONTEND_URL=https://your-vercel-domain.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CONTACT_EMAIL=Contact@love-u-convert.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Step 5: Start Server
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "love-u-convert-api"
pm2 save
pm2 startup

# Or using systemd
# Create service file and enable
```

#### Step 6: Configure Nginx (Optional)
```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: AWS Lambda/API Gateway

#### Step 1: Prepare Lambda Function
- Use `serverless` framework
- Or AWS SAM
- Configure API Gateway

#### Step 2: Environment Variables
Set in Lambda console:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`

### Option 3: AWS ECS/Fargate

#### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

#### Step 2: Build and Push
```bash
docker build -t love-u-convert-backend .
docker tag love-u-convert-backend:latest your-ecr-repo/love-u-convert-backend:latest
docker push your-ecr-repo/love-u-convert-backend:latest
```

#### Step 3: Deploy to ECS
- Create ECS service
- Configure environment variables
- Set up load balancer

## ⚡ Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Navigate to Frontend
```bash
cd frontend
```

### Step 4: Deploy
```bash
vercel
```

### Step 5: Configure Environment Variables

Vercel Dashboard me:
1. Project Settings → Environment Variables
2. Add variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://your-aws-backend.com`
   - **Environment**: Production, Preview, Development

### Step 6: Update Frontend Code (if needed)

`frontend/index.html` me API Base URL logic verify karein:
```javascript
window.API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-aws-backend.com';
```

### Step 7: Redeploy (if needed)
```bash
vercel --prod
```

## 🔧 Post-Deployment Configuration

### Backend (AWS)
1. ✅ Update `ALLOWED_ORIGINS` in `config.env`
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure SMTP for email
4. ✅ Test `/health` endpoint
5. ✅ Test `/api/usage` endpoint

### Frontend (Vercel)
1. ✅ Set `NEXT_PUBLIC_API_URL` environment variable
2. ✅ Verify API Base URL in browser console
3. ✅ Test all features
4. ✅ Verify CORS working

## 🧪 Production Testing

### Test Checklist
- [ ] Backend health check: `https://your-aws-backend.com/health`
- [ ] Frontend loads: `https://your-vercel-domain.vercel.app`
- [ ] API calls working (no CORS errors)
- [ ] File upload works
- [ ] File conversion works
- [ ] Download works
- [ ] ZIP download works
- [ ] Contact form works
- [ ] All legal pages load

## 🔒 Security Checklist

### Backend
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Environment variables secure
- [ ] SMTP credentials secure

### Frontend
- [ ] HTTPS enabled (Vercel default)
- [ ] API URL secure (HTTPS)
- [ ] No sensitive data in client code

## 📝 DNS Configuration

### Backend API Domain
```
api.your-domain.com → AWS IP/ELB
```

### Frontend Domain
```
your-domain.com → Vercel
www.your-domain.com → Vercel
```

## 🎯 Final Steps

1. ✅ Deploy backend to AWS
2. ✅ Deploy frontend to Vercel
3. ✅ Update environment variables
4. ✅ Test production deployment
5. ✅ Update DNS if using custom domains
6. ✅ Monitor logs and errors
7. ✅ Set up monitoring/alerts

## 🎉 Success!

Agar sab kuch working hai, to deployment successful hai! 🚀

