#!/bin/bash

# AKO LMS Setup Script
# This script sets up the development environment

set -e  # Exit on any error

echo "🚀 Starting AKO LMS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

print_status "docker-compose is available"

# Start infrastructure services
echo "📦 Starting infrastructure services..."
docker-compose up -d postgres redis minio mailhog

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Wait for PostgreSQL
echo "🐘 Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "PostgreSQL is not ready yet... waiting"
    sleep 2
done
print_status "PostgreSQL is ready"

# Wait for Redis
echo "🔴 Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "Redis is not ready yet... waiting"
    sleep 2
done
print_status "Redis is ready"

# Wait for MinIO
echo "🗄️  Waiting for MinIO..."
until curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    echo "MinIO is not ready yet... waiting"
    sleep 2
done
print_status "MinIO is ready"

# Install API dependencies
echo "📚 Installing API dependencies..."
cd api
npm install
print_status "API dependencies installed"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
print_status "Prisma client generated"

# Run database migrations
echo "🗃️  Running database migrations..."
npx prisma db push
print_status "Database migrations completed"

# Seed database (optional)
if [ -f "prisma/seed.ts" ]; then
    echo "🌱 Seeding database..."
    npm run db:seed
    print_status "Database seeded"
fi

# Go back to root
cd ..

# Install web dependencies
echo "🌐 Installing web dependencies..."
cd web
npm install
print_status "Web dependencies installed"

# Go back to root
cd ..

# Create MinIO bucket
echo "🪣 Setting up MinIO bucket..."
docker-compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin || true
docker-compose exec -T minio mc mb local/ako-uploads || true
docker-compose exec -T minio mc policy set public local/ako-uploads || true
print_status "MinIO bucket configured"

# Check if all services are healthy
echo "🏥 Checking service health..."

# Check API health (if running)
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    print_status "API is healthy"
else
    print_warning "API is not running yet - start it with: cd api && npm run dev"
fi

# Check web health (if running)
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "Web app is healthy"
else
    print_warning "Web app is not running yet - start it with: cd web && npm run dev"
fi

# Print service URLs
echo ""
echo "🎉 Setup completed! Service URLs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PostgreSQL:      localhost:5432"
echo "🔴 Redis:           localhost:6379"
echo "🗄️  MinIO Console:   http://localhost:9001 (minioadmin/minioadmin)"
echo "🗄️  MinIO API:       http://localhost:9000"
echo "📧 MailHog:         http://localhost:8025"
echo "🚀 API:             http://localhost:4000"
echo "🌐 Web App:         http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🚀 To start the development servers:"
echo "  API:  cd api && npm run dev"
echo "  Web:  cd web && npm run dev"
echo ""

echo "📖 Check the logs:"
echo "  docker-compose logs -f"
echo ""

print_status "AKO LMS setup completed successfully!"