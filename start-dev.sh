#!/bin/bash

echo "🚀 Starting Video Translate App Development Environment..."

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# Kill any existing processes on ports 3000 and 3001
echo "🔄 Cleaning up existing processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "ts-node" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

# Wait a moment for processes to stop
sleep 2

# Check if backend is running
if check_port 3001; then
    echo "✅ Backend is already running on port 3001"
else
    echo "🔄 Starting backend server..."
    cd backend && npm run dev &
    BACKEND_PID=$!
    echo "✅ Backend started with PID: $BACKEND_PID"
fi

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if frontend is running
if check_port 3000; then
    echo "✅ Frontend is already running on port 3000"
else
    echo "🔄 Starting frontend server..."
    cd frontend && npm start &
    FRONTEND_PID=$!
    echo "✅ Frontend started with PID: $FRONTEND_PID"
fi

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Test the services
echo "🧪 Testing services..."

# Test backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is responding correctly"
else
    echo "❌ Backend is not responding"
fi

# Test frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is responding correctly"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo "📊 Health Check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep the script running and handle cleanup
trap 'echo ""; echo "🛑 Stopping services..."; pkill -f "react-scripts"; pkill -f "ts-node"; pkill -f "nodemon"; echo "✅ Services stopped"; exit 0' INT

# Wait indefinitely
wait 