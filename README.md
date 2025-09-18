# 🎓 AKO Courses - Learning Management System

![Status](https://img.shields.io/badge/Status-Development-yellow)
![API](https://img.shields.io/badge/API-40%25%20Complete-orange)
![Frontend](https://img.shields.io/badge/Frontend-Pending-red)
![License](https://img.shields.io/badge/License-Proprietary-blue)

A comprehensive Learning Management System (LMS) built with modern web technologies, featuring role-based access control, secure video streaming, quiz management, and comprehensive analytics.

---

## 🚀 **Quick Start**

```bash
# 1. Start infrastructure services
./ako-lms/setup.sh

# 2. Start API server
cd ako-lms/api && npm run dev

# 3. Start web application  
cd ako-lms/web && npm run dev
```

**Access URLs:**
- 🌐 **Web App**: http://localhost:3000
- 🚀 **API**: http://localhost:4000
- 📊 **Health Check**: http://localhost:4000/health
- 🗄️ **MinIO Console**: http://localhost:9001
- 📧 **Email Testing**: http://localhost:8025

---

## 📋 **System Overview**

### **Tech Stack**
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL + Redis (caching/sessions)
- **Storage:** MinIO (S3-compatible) for media files
- **Frontend:** Next.js 13+ + React + TypeScript + Tailwind CSS
- **Authentication:** JWT + MFA (TOTP) + Device binding
- **Infrastructure:** Docker Compose for local development

### **Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │────│  Express API    │────│   PostgreSQL    │
│   Frontend      │    │   Backend       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │     MinIO       │
                       │   (Sessions)    │    │  (File Storage) │
                       └─────────────────┘    └─────────────────┘
```

---

## 👥 **User Roles & Capabilities**

| Role | Capabilities |
|------|-------------|
| **👤 Student** | View courses, watch videos, take quizzes, track progress |
| **👨‍👩‍👧‍👦 Parent** | Monitor children's progress, view reports, receive notifications |
| **👨‍💼 Assistant** | Bulk enrollment, manage parent-student links, course assistance |
| **👨‍🏫 Instructor** | Create courses, upload content, create quizzes, view analytics |
| **👑 Admin** | Full system control, user management, impersonation, system settings |

---

## 🏗️ **Current Implementation Status**

### ✅ **Completed (45%)**
- [x] **Core Infrastructure**: Docker setup, database schema, API framework
- [x] **Authentication**: JWT auth, MFA, device binding, session management  
- [x] **Course Management**: CRUD operations, sections, lessons, media upload
- [x] **Quiz System**: Question types (MCQ/Essay), attempts, auto-grading
- [x] **Media Handling**: S3 storage, signed URLs, file validation
- [x] **Role-Based Access**: Middleware, permissions, audit logging

### 🟡 **In Progress (35%)**
- [ ] **Frontend Implementation**: Next.js app structure, components, pages
- [ ] **Analytics & Reporting**: Progress tracking, report generation
- [ ] **Bulk Enrollment**: CSV import/validation, parent linking
- [ ] **Admin Features**: User management, impersonation, system settings

### ❌ **Planned (20%)**
- [ ] **Advanced Security**: DRM integration, watermarking, anti-cheat
- [ ] **Notifications**: Email templates, push notifications
- [ ] **Internationalization**: Multi-language support (EN/AR)
- [ ] **Production Setup**: Deployment config, monitoring, CI/CD

---

## 🔐 **Test Accounts**

After running the setup script, these accounts are available:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@akocourses.com | admin123 | Admin | Full system access |
| instructor@akocourses.com | instructor123 | Instructor | Course management |
| student@akocourses.com | student123 | Student | Learning experience |
| parent@akocourses.com | parent123 | Parent | Child monitoring |
| assistant@akocourses.com | assistant123 | Assistant | Administrative help |

---

## 📚 **API Documentation**

### **Authentication**
```bash
# Login
POST /api/auth/login
{
  "email": "admin@akocourses.com",
  "password": "admin123"
}

# Access protected resources
GET /api/courses
Authorization: Bearer <token>
```

### **Key Endpoints**
- **Authentication**: `/api/auth/*` - Login, refresh, logout, MFA
- **Courses**: `/api/courses/*` - Course CRUD, enrollment
- **Quizzes**: `/api/quizzes/*` - Quiz management, attempts
- **Media**: `/api/media/*` - File upload, signed URLs
- **Users**: `/api/users/*` - User management
- **Admin**: `/api/admin/*` - Administrative functions

Full API specification: [OpenAPI Documentation](lms_api_open_api_v_1%20(1).yaml)

---

## 📁 **Project Structure**

```
AKO/
├── 📁 ako-lms/                # Main LMS application
│   ├── 📁 api/               # Backend API
│   ├── 📁 web/               # Frontend application  
│   ├── docker-compose.yml    # Infrastructure services
│   └── setup.sh              # Automated setup script
├── 📊 IMPLEMENTATION_PROGRESS.md  # Detailed progress tracking
├── 🚀 QUICK_START.md         # Getting started guide
└── 📖 Documentation files    # API specs, requirements
```

---

## 📖 **Documentation**

- 📋 **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- 📊 **[Implementation Progress](IMPLEMENTATION_PROGRESS.md)** - Detailed status tracking
- 🔗 **[API Specification](lms_api_open_api_v_1%20(1).yaml)** - Complete API documentation
- 📝 **[Product Requirements](lms_prd_v_1.md)** - Functional specifications
- ⚙️ **[Environment Setup](lms_dev_quickstart_env.md)** - Detailed configuration guide

---

**Built with ❤️ for AKO Courses**
