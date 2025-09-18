# 🧪 AKO LMS Quick Test Setup Script (PowerShell)
# Usage: .\test-setup.ps1

Write-Host "🚀 Starting AKO LMS Test Setup..." -ForegroundColor Blue

function Write-Status {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (!(Test-Path "docker-compose.yml")) {
    Write-Error "docker-compose.yml not found. Please run this script from the ako-lms directory."
    exit 1
}

try {
    Write-Status "Step 1: Starting infrastructure services..."
    docker-compose up -d
    
    Write-Status "Waiting for services to start..."
    Start-Sleep -Seconds 10
    
    Write-Status "Checking service status..."
    docker-compose ps
    
    Write-Status "Step 2: Setting up API..."
    Set-Location api
    
    Write-Status "Installing API dependencies..."
    npm install
    
    Write-Status "Generating Prisma client..."
    npx prisma generate
    
    Write-Status "Running database migrations..."
    npx prisma migrate dev --name init
    
    Write-Status "Seeding database with test data..."
    npm run db:seed
    
    Write-Success "API setup complete!"
    
    Write-Status "Step 3: Setting up Web application..."
    Set-Location ../web
    
    Write-Status "Installing Web dependencies..."
    npm install
    
    Write-Success "Web setup complete!"
    
    Write-Status "Step 4: Testing API health..."
    Set-Location ../api
    
    # Start API temporarily to test
    Write-Status "Starting API server for health check..."
    $apiJob = Start-Job -ScriptBlock { 
        Set-Location $args[0]
        npm run dev 
    } -ArgumentList (Get-Location)
    
    Start-Sleep -Seconds 15
    
    try {
        $healthCheck = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get -TimeoutSec 5
        Write-Success "✅ API health check passed: $($healthCheck.message)"
    }
    catch {
        Write-Warning "⚠️ API health check failed, but setup is complete"
    }
    
    # Stop the test API
    Stop-Job $apiJob -Force
    Remove-Job $apiJob -Force
    
    Write-Success "🎉 AKO LMS setup complete!"
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Start the API: cd api && npm run dev"
    Write-Host "2. Start the Web app: cd web && npm run dev"
    Write-Host ""
    Write-Host "📋 Access URLs:" -ForegroundColor Yellow
    Write-Host "  🌐 Web Application: http://localhost:3000"
    Write-Host "  🔧 API Server: http://localhost:4000" 
    Write-Host "  📊 API Health Check: http://localhost:4000/health"
    Write-Host "  🗄️ Prisma Studio: cd api && npx prisma studio"
    Write-Host "  📧 MailHog: http://localhost:8025"
    Write-Host "  📁 MinIO Console: http://localhost:9001"
    Write-Host ""
    Write-Host "🔐 Test Accounts:" -ForegroundColor Yellow
    Write-Host "  Admin: admin@akocourses.com / admin123"
    Write-Host "  Student: student@akocourses.com / student123"
    Write-Host "  Instructor: instructor@akocourses.com / instructor123"
    Write-Host "  Parent: parent@akocourses.com / parent123"
    Write-Host ""
    Write-Host "📖 See TESTING_GUIDE.md for detailed testing scenarios" -ForegroundColor Green
}
catch {
    Write-Error "Setup failed: $($_.Exception.Message)"
    exit 1
}