#!/bin/bash
# Local Testing Script - Start Backend and Frontend

echo "🚀 Starting Local Testing Environment..."
echo ""

# Kill any existing processes on ports 3000 and 3001
echo "📋 Checking for existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Port 3000 is free"
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "Port 3001 is free"

echo ""
echo "✅ Ports cleared"
echo ""

# Start Backend
echo "🔧 Starting Backend Server (port 3000)..."
cd "$(dirname "$0")/backend"
if [ ! -f .env ]; then
    if [ -f config.env ]; then
        cp config.env .env
        echo "✅ Created .env from config.env"
    fi
fi

# Start backend in background
node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait a bit for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running: http://localhost:3000"
    echo "   Health check: http://localhost:3000/health"
else
    echo "⚠️  Backend may not be running. Check backend.log for errors"
fi

echo ""

# Start Frontend
echo "🌐 Starting Frontend Server (port 3001)..."
cd "$(dirname "$0")/frontend"
python3 -m http.server 3001 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

# Wait a bit for frontend to start
sleep 2

# Check if frontend is running
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend is running: http://localhost:3001"
else
    echo "⚠️  Frontend may not be running. Check frontend.log for errors"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Local Testing Environment Ready!"
echo ""
echo "📋 Test URLs:"
echo "   Backend API: http://localhost:3000"
echo "   Backend Health: http://localhost:3000/health"
echo "   Frontend: http://localhost:3001"
echo ""
echo "🌐 Open browser: http://localhost:3001"
echo ""
echo "📝 Logs:"
echo "   Backend: backend.log"
echo "   Frontend: frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   OR: lsof -ti:3000,3001 | xargs kill -9"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

