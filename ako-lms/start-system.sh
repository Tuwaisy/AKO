#!/bin/bash
# 🚀 AKO LMS Full System Startup Script

echo "🚀 Starting AKO LMS System..."

# Navigate to project directory
cd /d/Nextera/AKO/AKO/ako-lms

# Function to check if port is in use
check_port() {
    local port=$1
    if netstat -an | grep -q ":$port.*LISTENING"; then
        echo "✅ Port $port is active"
        return 0
    else
        echo "❌ Port $port is not active"
        return 1
    fi
}

# Start Docker services if not running
echo "📦 Checking Docker services..."
if docker compose ps | grep -q "Up"; then
    echo "✅ Docker services already running"
else
    echo "🔄 Starting Docker services..."
    docker compose up -d
    sleep 10
fi

# Start API Server
echo "🔧 Starting API Server..."
cd api
# Kill existing process if any
pkill -f "nodemon src/server.ts" || true
npm run dev &
API_PID=$!
echo "📝 API PID: $API_PID"
cd ..

# Wait for API to start
echo "⏳ Waiting for API to start..."
for i in {1..30}; do
    if curl -s http://localhost:4000/health > /dev/null; then
        echo "✅ API Server running at http://localhost:4000"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 2
done

# Start Web App  
echo "🌐 Starting Web Application..."
cd web
# Kill existing process if any
pkill -f "next dev" || true
npm run dev &
WEB_PID=$!
echo "📝 Web PID: $WEB_PID"
cd ..

# Wait for Web to start
echo "⏳ Waiting for Web App to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Web App running at http://localhost:3000"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 2
done

echo ""
echo "🎉 AKO LMS System Started Successfully!"
echo ""
echo "📋 Service URLs:"
echo "   🌐 Web Application: http://localhost:3000"
echo "   🔧 API Server: http://localhost:4000"
echo "   📊 API Health: http://localhost:4000/health"
echo ""
echo "🔐 Test Accounts:"
echo "   Admin: admin@akocourses.com / admin123"
echo "   Student: student@akocourses.com / student123"
echo "   Instructor: instructor@akocourses.com / instructor123"
echo "   Parent: parent@akocourses.com / parent123"
echo ""
echo "🛑 To stop the system:"
echo "   kill $API_PID $WEB_PID"
echo "   docker compose down"
echo ""

# Keep script running
echo "Press Ctrl+C to stop all services..."
trap "echo 'Stopping services...'; kill $API_PID $WEB_PID; docker compose down; exit" INT
wait