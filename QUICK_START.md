# 🚀 AKO LMS - Quick Start Instructions

## Prerequisites

1. **Node.js** 18+ installed
2. **Docker Desktop** installed and running
3. **Git** installed
4. **VS Code** (recommended) or any code editor

## 🏃‍♂️ Quick Start (5 Minutes)

### Step 1: Clone and Setup
```bash
# Navigate to the project
cd ako-lms

# Make setup script executable (Linux/Mac)
chmod +x setup.sh

# Run the automated setup
./setup.sh
```

**Windows Users**: Use Git Bash or WSL to run the setup script, or follow manual steps below.

### Step 2: Start Development Servers

**Terminal 1 - API Server:**
```bash
cd api
npm run dev
```

**Terminal 2 - Web Application:**
```bash
cd web  
npm run dev
```

### Step 3: Access the Application

- 🌐 **Web App**: http://localhost:3000
- 🚀 **API**: http://localhost:4000
- 📊 **API Health**: http://localhost:4000/health
- 🗄️ **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- 📧 **Email Testing**: http://localhost:8025

---

## 📝 Manual Setup (If Automated Script Fails)

### 1. Start Infrastructure Services
```bash
docker-compose up -d postgres redis minio mailhog
```

### 2. Install Dependencies
```bash
# API dependencies
cd api
npm install

# Web dependencies  
cd ../web
npm install
```

### 3. Setup Database
```bash
cd api

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed with sample data
npm run db:seed
```

### 4. Create MinIO Bucket
```bash
# Access MinIO console at http://localhost:9001
# Login: minioadmin / minioadmin
# Create bucket named: ako-uploads
# Set bucket policy to public (for development)
```

---

## 🔐 Test Accounts

After seeding, these accounts are available:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@akocourses.com | admin123 | Full system access |
| Instructor | instructor@akocourses.com | instructor123 | Course creation/management |
| Student | student@akocourses.com | student123 | Course consumption |
| Parent | parent@akocourses.com | parent123 | Child progress monitoring |
| Assistant | assistant@akocourses.com | assistant123 | Enrollment management |

---

## 🧪 Testing the API

### Authentication
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@akocourses.com","password":"admin123"}'

# Use the returned token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/courses
```

### Health Check
```bash
curl http://localhost:4000/health
```

---

## 📁 Project Structure

```
ako-lms/
├── 📁 api/                    # Backend API (Node.js/Express)
│   ├── 📁 src/
│   │   ├── 📁 config/         # Environment configuration
│   │   ├── 📁 middleware/     # Auth, error handling
│   │   ├── 📁 routes/         # API endpoints
│   │   ├── 📁 utils/          # Logging, helpers
│   │   └── server.ts          # Main server file
│   ├── 📁 prisma/             # Database schema & migrations
│   ├── package.json
│   └── .env                   # Environment variables
├── 📁 web/                    # Frontend (Next.js/React)
│   ├── 📁 src/
│   │   ├── 📁 app/            # Next.js 13+ app directory
│   │   ├── 📁 components/     # Reusable UI components
│   │   └── 📁 lib/            # Utilities and helpers
│   ├── package.json
│   └── .env                   # Frontend environment
├── docker-compose.yml         # Infrastructure services
├── setup.sh                   # Automated setup script
└── IMPLEMENTATION_PROGRESS.md # Progress tracking
```

---

## 🔧 Development Commands

### API Commands
```bash
cd api

npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

### Web Commands
```bash
cd web

npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart postgres

# Clean up (removes data!)
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Port already in use"
```bash
# Kill processes on ports
npx kill-port 4000 3000 5432 6379 9000

# Or change ports in .env files
```

#### 2. "Database connection failed"
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### 3. "MinIO bucket not found"
```bash
# Access MinIO console: http://localhost:9001
# Create bucket: ako-uploads
# Set public policy for development
```

#### 4. "Prisma client not generated"
```bash
cd api
npx prisma generate
npm run dev
```

#### 5. "Dependencies not installed"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Issues

If you get authentication or connection errors, verify your `.env` files:

**API .env should have:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ako_lms
JWT_SECRET=your-super-secret-jwt-key-change-in-production-random-string-32-chars-long
```

**Web .env should have:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 🚀 Next Steps

1. **Explore the API**: Use the test accounts to login and explore endpoints
2. **Check Progress**: Review `IMPLEMENTATION_PROGRESS.md` for current status
3. **Frontend Development**: The web app structure is ready for implementation
4. **Add Features**: See the progress tracker for priority items

---

## 📚 Documentation Links

- 📖 [API Documentation](lms_api_open_api_v_1.yaml) - OpenAPI specification
- 🏗️ [Architecture Guide](lms_prd_v_1.md) - Product requirements
- ⚙️ [Environment Setup](lms_dev_quickstart_env.md) - Detailed setup guide
- 📊 [Progress Tracker](IMPLEMENTATION_PROGRESS.md) - Current implementation status

---

## 🆘 Getting Help

1. Check the troubleshooting section above
2. Review the logs: `docker-compose logs -f`
3. Verify all services are running: `docker-compose ps`
4. Check the health endpoint: `curl http://localhost:4000/health`

---

**Happy coding! 🎉**