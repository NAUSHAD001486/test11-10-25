# 🚀 Local Testing Instructions

## ✅ Quick Start

### Terminal 1 - Backend Server
```bash
cd /Users/nausadalam/11.0/backend
node server.js
```

### Terminal 2 - Frontend Server
```bash
cd /Users/nausadalam/11.0/frontend
python3 -m http.server 3001
```

## 📋 Test URLs

- **Backend Health**: http://localhost:3000/health
- **Frontend**: http://localhost:3001

## ✅ Status Check

Backend started successfully if you see:
```
✅ Server running on port 3000
📦 Environment: development
🌐 API available at: http://localhost:3000/api
❤️  Health check: http://localhost:3000/health
```

## 🛑 To Stop Servers

Press `Ctrl+C` in each terminal, or:
```bash
lsof -ti:3000,3001 | xargs kill -9
```

