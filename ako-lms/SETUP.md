# 🚀 AKO Courses - Setup Instructions

Welcome to the AKO Courses Learning Management System! This guide will help you get the entire system up and running.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js 18+** and **npm/yarn/pnpm**
- **Docker Desktop** or **Podman**
- **Git**

## 🏗️ Project Structure

```
ako-lms/
├── 📁 api/              # Node.js Express Backend
│   ├── src/             # Source code
│   ├── prisma/          # Database schema & migrations
│   ├── package.json     # Dependencies
│   └── .env.example     # Environment template
├── 📁 web/              # Next.js Frontend
│   ├── src/             # Source code
│   ├── package.json     # Dependencies
│   └── .env.example     # Environment template
├── 📁 mobile/           # React Native App (Future)
├── docker-compose.yml   # Infrastructure services
├── init.sql            # Database initialization
└── README.md           # This file
```

## 🚀 Quick Start (5 minutes)

### 1. Clone & Navigate
```bash
cd ako-lms
```

### 2. Start Infrastructure Services
```bash
# Start PostgreSQL, Redis, MinIO, and MailHog
docker compose up -d

# Verify services are running
docker compose ps
```

### 3. Setup API Backend
```bash
cd api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env if needed (defaults work for development)

# Setup database
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed  # (optional - creates sample data)

# Start API server
npm run dev
```
✅ **API will be available at http://localhost:4000**

### 4. Setup Web Frontend
```bash
# In a new terminal
cd web

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local if needed (defaults work for development)

# Start web server
npm run dev
```
✅ **Web app will be available at http://localhost:3000**

## 🔧 Service URLs

After startup, access these services:

| Service | URL | Credentials |
|---------|-----|-------------|
| 🌐 **Web App** | http://localhost:3000 | Create account or use seeded data |
| 🔌 **API** | http://localhost:4000 | - |
| 🗄️ **Database Admin** | `npx prisma studio` | - |
| 📧 **Email Viewer** | http://localhost:8025 | - |
| 💾 **File Storage** | http://localhost:9001 | minioadmin / minioadmin |
| 📊 **Redis CLI** | `docker exec -it ako-redis redis-cli` | - |

## 👤 Default Accounts (if seeded)

```
Admin: admin@akocourses.com / admin123
Instructor: instructor@akocourses.com / instructor123
Student: student@akocourses.com / student123
Parent: parent@akocourses.com / parent123
```

## 🎯 Key Features Implemented

### ✅ **Authentication & Security**
- JWT-based authentication with refresh tokens
- Multi-Factor Authentication (TOTP)
- Role-based access control (5 roles)
- Device binding and session management
- Password hashing and secure cookie handling

### ✅ **Course Management**
- Course creation and authoring
- Hierarchical content structure (Course → Section → Lesson)
- Multiple lesson types (Video, File, Quiz)
- Drip content scheduling
- Prerequisites and unlock conditions

### ✅ **Media & Security**
- Secure file upload to object storage (MinIO)
- DRM-ready video streaming infrastructure
- Dynamic watermarking support
- Anti-cheat measures for assessments

### ✅ **Assessment System**
- Multiple question types (MCQ, Essay)
- Image support in questions
- Time limits and attempt restrictions
- Automated grading for MCQ
- Manual grading workflow for essays

### ✅ **Analytics & Reporting**
- Video playback tracking
- Quiz performance analytics
- Progress monitoring
- Bulk reporting system
- Parent portal for child monitoring

### ✅ **Administrative Features**
- Bulk user enrollment via CSV
- User impersonation with audit trails
- System-wide settings and policies
- Comprehensive audit logging

## 🛠️ Development Workflow

### API Development
```bash
cd api

# Database operations
npm run db:migrate     # Run migrations
npm run db:seed       # Seed sample data
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database (dev only)

# Development
npm run dev           # Start with hot reload
npm run build         # Build for production
npm run test          # Run tests
npm run lint          # Code linting
```

### Web Development
```bash
cd web

# Development
npm run dev           # Start with hot reload
npm run build         # Build for production
npm run lint          # Code linting
npm run type-check    # TypeScript checking
npm run analyze       # Bundle analysis
```

## 📁 File Upload Setup

1. **Access MinIO Console**: http://localhost:9001
2. **Login**: minioadmin / minioadmin
3. **Create Bucket**: `ako-uploads`
4. **Set Policy**: Public read or configure signed URLs

## 🔍 Debugging & Monitoring

### Logs
```bash
# API logs
cd api && npm run dev  # Console logs in development

# Database queries
# Enable in api/.env: DATABASE_URL with ?log=query

# Docker service logs
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio
```

### Health Checks
- **API Health**: http://localhost:4000/health
- **Database**: Check docker compose ps
- **Redis**: `docker exec -it ako-redis redis-cli ping`

## 🚨 Troubleshooting

### Common Issues

**❌ Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000  # or :4000, :5432, etc.
# Kill the process or change ports in config
```

**❌ Database Connection Failed**
```bash
# Ensure PostgreSQL is running
docker compose ps postgres
# Check connection string in api/.env
```

**❌ CORS Errors**
```bash
# Verify CORS_ALLOWED_ORIGINS in api/.env
# Ensure web app URL is included
```

**❌ File Upload Issues**
```bash
# Check MinIO bucket exists
# Verify S3_* credentials in api/.env
```

## 🔐 Production Deployment

### Environment Variables
Replace development values in `.env` files:

**API (.env)**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/db
JWT_SECRET=super-secure-secret-here
S3_ENDPOINT=https://your-s3-provider.com
# ... other production values
```

**Web (.env.local)**
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_WEB_URL=https://yourdomain.com
# ... other production values
```

### Docker Production
```bash
# Build production images
docker build -t ako-api ./api
docker build -t ako-web ./web

# Deploy with production compose file
docker compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

The API follows the OpenAPI specification provided in the repository:
- **Spec File**: `lms_api_open_api_v_1 (1).yaml`
- **Endpoints**: RESTful APIs with JWT authentication
- **Documentation**: Auto-generated docs available in development

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Submit** a Pull Request

## 📞 Support

- **Issues**: Create GitHub issues for bugs or feature requests
- **Email**: support@akocourses.com
- **Documentation**: Check individual README files in `/api` and `/web`

## 📄 License

Proprietary Software - AKO Courses. All rights reserved.

---

**🎉 Congratulations!** You now have a fully functional Learning Management System running locally. The system includes secure authentication, course management, video streaming infrastructure, assessment tools, and administrative features.

**Next Steps:**
1. 🎨 Customize the branding and themes
2. 📱 Set up the mobile app (React Native)
3. 🔐 Configure production security settings
4. 📊 Set up monitoring and analytics
5. 🚀 Deploy to your preferred cloud platform
