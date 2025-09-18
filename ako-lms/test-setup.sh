#!/bin/bash
# 🧪 AKO LMS Quick Test Setup Script

set -e  # Exit on any error

echo "🚀 Starting AKO LMS Test Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "docker-compose.yml" ]]; then
    print_error "docker-compose.yml not found. Please run this script from the ako-lms directory."
    exit 1
fi

print_status "Step 1: Starting infrastructure services..."
docker-compose up -d

print_status "Waiting for services to start..."
sleep 10

print_status "Checking service status..."
docker-compose ps

print_status "Step 2: Setting up API..."
cd api

print_status "Installing API dependencies..."
npm install

print_status "Generating Prisma client..."
npx prisma generate

print_status "Running database migrations..."
npx prisma migrate dev --name init

print_status "Seeding database with test data..."
npm run db:seed

print_success "API setup complete!"

print_status "Step 3: Setting up Web application..."
cd ../web

print_status "Installing Web dependencies..."
npm install

print_success "Web setup complete!"

print_status "Step 4: Starting applications..."

# Start API in background
print_status "Starting API server..."
cd ../api
npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 5

# Start Web in background  
print_status "Starting Web server..."
cd ../web
npm run dev &
WEB_PID=$!

# Wait for everything to start
sleep 10

print_success "🎉 AKO LMS is ready for testing!"
echo
echo "📋 Access URLs:"
echo "  🌐 Web Application: http://localhost:3000"
echo "  🔧 API Server: http://localhost:4000"
echo "  📊 API Health Check: http://localhost:4000/health"
echo "  🗄️  Prisma Studio: Run 'cd api && npx prisma studio'"
echo "  📧 MailHog: http://localhost:8025"
echo "  📁 MinIO Console: http://localhost:9001"
echo
echo "🔐 Test Accounts:"
echo "  Admin: admin@akocourses.com / admin123"
echo "  Student: student@akocourses.com / student123"
echo "  Instructor: instructor@akocourses.com / instructor123"
echo "  Parent: parent@akocourses.com / parent123"
echo
echo "🧪 Quick Health Check:"
curl -s http://localhost:4000/health && echo " ✅ API is healthy" || echo " ❌ API not responding"
echo

print_status "Test setup complete! Check the TESTING_GUIDE.md for detailed testing scenarios."
echo
echo "To stop the servers:"
echo "  kill $API_PID $WEB_PID"
echo "  docker-compose down"