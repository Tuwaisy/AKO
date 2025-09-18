# 🧪 AKO LMS Testing Guide

## 📋 Quick Start Testing (5 minutes)

### 1. Start the Infrastructure Services
```bash
# Navigate to the project directory
cd /d/Nextera/AKO/AKO/ako-lms

# Start PostgreSQL, Redis, MinIO, and MailHog
docker-compose up -d

# Check that all services are running
docker-compose ps
```

### 2. Set up the Database
```bash
# Navigate to API directory
cd api

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed the database with test data
npm run db:seed
```

### 3. Start the API Server
```bash
# In the api directory
npm run dev

# API will be available at: http://localhost:4000
# Health check: http://localhost:4000/health
```

### 4. Start the Web Application
```bash
# Open a new terminal and navigate to web directory
cd ../web

# Start the development server
npm run dev

# Web app will be available at: http://localhost:3000
```

---

## 🔐 Test Accounts

### Pre-seeded User Accounts
- **Admin**: admin@akocourses.com / admin123
- **Instructor**: instructor@akocourses.com / instructor123  
- **Student**: student@akocourses.com / student123
- **Parent**: parent@akocourses.com / parent123
- **Assistant**: assistant@akocourses.com / assistant123

---

## 🧪 Testing Scenarios

### 1. Authentication Testing
1. **Login Test**:
   - Go to: http://localhost:3000/auth/login
   - Use any test account from above
   - Verify role-based redirection (admin → admin dashboard, student → student dashboard)

2. **Role-based Access**:
   - Login as different roles and verify appropriate dashboards
   - Try accessing unauthorized routes (should redirect to login)

### 2. Student Experience Testing
1. **Student Dashboard**:
   - Login as: student@akocourses.com / student123
   - View course enrollment status
   - Check progress statistics

2. **Course Browsing**:
   - Navigate to courses page
   - Search and filter courses
   - Enroll in available courses

### 3. Admin Experience Testing
1. **Admin Dashboard**:
   - Login as: admin@akocourses.com / admin123
   - View system statistics
   - Access management tools

2. **User Management**:
   - Create new users
   - Bulk import users via CSV
   - Manage user roles and permissions

### 4. API Testing
1. **Health Check**:
   ```bash
   curl http://localhost:4000/health
   ```

2. **Authentication**:
   ```bash
   # Login
   curl -X POST http://localhost:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@akocourses.com","password":"admin123"}'
   
   # Save the token and use it for subsequent requests
   TOKEN="your_access_token_here"
   ```

3. **Protected Endpoints**:
   ```bash
   # Get courses
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/courses
   
   # Get users (admin only)
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/users
   ```

---

## 🔧 Service URLs & Access

### Core Services
- **Web Application**: http://localhost:3000
- **API Server**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health

### Infrastructure Services
- **PostgreSQL**: localhost:5432 (ako_lms_db / postgres / postgres)
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)
- **MailHog Web UI**: http://localhost:8025

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it ako-lms-postgres-1 psql -U postgres -d ako_lms_db

# Or use Prisma Studio
cd api && npx prisma studio
# Opens at: http://localhost:5555
```

---

## 📊 Testing Workflows

### Complete User Journey Test
1. **Admin Setup**:
   - Login as admin
   - Create course content
   - Create user accounts
   - Set up enrollments

2. **Instructor Workflow**:
   - Login as instructor
   - Create/manage courses
   - Upload content
   - Create quizzes

3. **Student Workflow**:
   - Login as student  
   - Browse courses
   - Enroll in courses
   - Take quizzes
   - Track progress

4. **Parent Workflow**:
   - Login as parent
   - View children's progress
   - Access reports

### API Integration Test
```bash
#!/bin/bash
# Complete API workflow test

# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@akocourses.com","password":"admin123"}' | \
  jq -r '.tokens.accessToken')

echo "Token: $TOKEN"

# 2. Test protected endpoints
echo "=== Testing Courses API ==="
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/courses

echo "=== Testing Users API ==="
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/users

# 3. Create a new course
echo "=== Creating Course ==="
curl -X POST http://localhost:4000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "description": "A test course for API testing",
    "language": "en"
  }'
```

---

## 🐛 Troubleshooting

### Common Issues

**❌ "Connection refused" errors**
```bash
# Check if services are running
docker-compose ps

# Restart services if needed
docker-compose down && docker-compose up -d
```

**❌ "Database connection failed"**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Ensure database is ready before starting API
docker-compose up -d postgres
sleep 10
cd api && npm run dev
```

**❌ "CORS errors"**
```bash
# Verify environment variables
cat api/.env | grep CORS
cat web/.env | grep API_BASE_URL

# Ensure origins match between API and Web
```

**❌ "Prisma client not found"**
```bash
cd api
npx prisma generate
npm run dev
```

### Debug Commands
```bash
# Check API logs
cd api && npm run dev

# Check web logs  
cd web && npm run dev

# Database queries
cd api && npx prisma studio

# Check service health
curl http://localhost:4000/health
```

---

## 📈 Performance Testing

### Load Testing with curl
```bash
# Simple load test
for i in {1..10}; do
  curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/health &
done
wait

# Create curl-format.txt:
echo "     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n" > curl-format.txt
```

### Database Performance
```sql
-- Connect to PostgreSQL and run performance queries
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation 
FROM pg_stats 
WHERE schemaname = 'public';
```

---

## 🧪 Automated Testing

### API Tests (Postman/Newman)
```bash
# Install Newman (Postman CLI)
npm install -g newman

# Create and run API test collection
newman run ako-lms-api-tests.json \
  --environment ako-lms-environment.json
```

### Frontend Tests (Coming Soon)
```bash
# Jest/React Testing Library setup
cd web
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
npm run test
```

---

## 📋 Test Checklist

### ✅ Basic Functionality
- [ ] All services start successfully
- [ ] Database migrations run without errors  
- [ ] API health check returns 200
- [ ] Web application loads at localhost:3000
- [ ] Login works for all user types
- [ ] Role-based redirection works
- [ ] Dashboard data displays correctly

### ✅ API Endpoints
- [ ] Authentication endpoints work
- [ ] User management endpoints work
- [ ] Course management endpoints work
- [ ] Enrollment endpoints work
- [ ] Quiz endpoints work
- [ ] Admin endpoints work

### ✅ Frontend Features
- [ ] Authentication flow works
- [ ] Dashboard displays correctly
- [ ] Course browsing works
- [ ] Responsive design works
- [ ] Navigation works
- [ ] Error handling works

### ✅ Integration
- [ ] Frontend communicates with API
- [ ] Database operations work
- [ ] File uploads work (if implemented)
- [ ] Real-time updates work (if implemented)

---

## 🚀 Production Testing

### Environment Verification
```bash
# Check production environment variables
echo "NODE_ENV=$NODE_ENV"
echo "DATABASE_URL=$DATABASE_URL"

# Test production build
npm run build
npm start
```

### Security Testing
```bash
# Test unauthorized access
curl -I http://localhost:4000/api/admin/users

# Should return 401 Unauthorized
```

---

**Ready to test? Start with the Quick Start section above! 🧪**