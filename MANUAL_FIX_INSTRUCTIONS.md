# 🔧 Manual Fix Instructions (Terminal Commands Issue)

## ❌ Problem: CORS Error

Backend server `localhost:3001` ko allow nahi kar raha. Server ko restart karna hoga with updated CORS settings.

## 📋 Step-by-Step Manual Fix

### Step 1: Backend Server Ko Stop Karein

**Option A: Terminal me process kill karein**
```bash
kill 96932
```

**Option B: Ya phir jis terminal me backend chal raha hai, waha Ctrl+C press karein**

### Step 2: Backend Directory Me Jao

```bash
cd /Users/nausadalam/11.0/backend
```

### Step 3: Verify Config.env

`backend/config.env` file me ye line check karein:
```env
NODE_ENV=development
```

Agar `production` hai to `development` me change karein.

### Step 4: Backend Server Start Karein

```bash
npm start
```

Ya phir:
```bash
node server.js
```

### Step 5: Verify Server Running

Nayi terminal window me ye command run karein:
```bash
curl http://localhost:3000/health
```

Agar response `{"status":"OK"...}` aaye to server running hai.

### Step 6: CORS Test

```bash
curl -v -H "Origin: http://localhost:3001" http://localhost:3000/api/usage
```

Response me `Access-Control-Allow-Origin: http://localhost:3001` dikhna chahiye.

### Step 7: Browser Me Test Karein

1. Browser me `http://localhost:3001` kholo
2. Browser Console (F12) me check karo - CORS error nahi hona chahiye
3. File upload test karo

## ✅ Expected Result

Backend server restart ke baad:
- ✅ Port 3000 par chalega
- ✅ `localhost:3001` ko allow karega (CORS fixed)
- ✅ Frontend se API calls kaam karenge
- ✅ "Failed to fetch" error nahi aayega

## 🔍 Important Notes

1. **Backend server restart ke baad** browser me page **refresh** karo (Ctrl+F5)
2. **Browser cache clear** karo agar zarurat ho
3. **Console me CORS error** check karo - nahi hona chahiye

## 🎯 After Fix

1. Backend restart ✅
2. Browser refresh ✅
3. File upload test ✅
4. Convert test ✅
5. Download test ✅

## 📝 Quick Test Commands

Terminal me ye commands run karein to verify:

```bash
# Health check
curl http://localhost:3000/health

# API usage check
curl http://localhost:3000/api/usage

# CORS test with origin header
curl -v -H "Origin: http://localhost:3001" http://localhost:3000/api/usage
```

Agar sab kuch sahi hai, to browser me test karo! 🚀

