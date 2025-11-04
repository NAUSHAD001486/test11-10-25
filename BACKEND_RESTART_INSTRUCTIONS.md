# 🔧 Backend Server Restart Instructions

## ❌ Current Issue: CORS Error

Backend server `localhost:3001` ko allow nahi kar raha. Server ko restart karna hoga.

## 📋 Manual Steps (Terminal me ye commands run karein)

### Step 1: Backend Server Stop Karein

Terminal me ye command run karein:
```bash
kill 96932
```

Ya phir Ctrl+C se backend server ko stop karein.

### Step 2: Backend Directory me Jao

```bash
cd /Users/nausadalam/11.0/backend
```

### Step 3: Backend Server Start Karein

```bash
npm start
```

Ya phir:
```bash
node server.js
```

### Step 4: Verify Server Running

Nayi terminal me ye command run karein:
```bash
curl http://localhost:3000/health
```

Agar response `{"status":"OK"...}` aaye to server running hai.

### Step 5: CORS Test

```bash
curl -v -H "Origin: http://localhost:3001" http://localhost:3000/api/usage
```

Agar response me `Access-Control-Allow-Origin: http://localhost:3001` dikhe to CORS fix ho gaya hai.

## ✅ Expected Result

Backend server restart ke baad:
- ✅ Port 3000 par chalega
- ✅ `localhost:3001` ko allow karega (CORS)
- ✅ Frontend se API calls kaam karenge

## 🔍 Troubleshooting

### Agar CORS error still aaye:

1. Backend `config.env` check karein:
   ```env
   NODE_ENV=development
   ```

2. Backend `server.js` me `allowedOrigins` check karein:
   ```javascript
   : ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000'];
   ```

3. Server restart ke baad browser me page refresh karein (Ctrl+F5)

## 🎯 After Restart

1. Backend restart karein
2. Browser me http://localhost:3001 refresh karein
3. Console me CORS error check karein
4. File upload test karein

