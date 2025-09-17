# AKO Courses - Learning Management System

A comprehensive LMS platform with role-based access, secure video streaming, DRM protection, and advanced course management features.

## Features

- **Multi-role Support**: Student, Parent, Assistant, Instructor, Admin
- **Secure Video Streaming**: DRM protection with watermarking
- **Course Management**: Drip scheduling, prerequisites, quizzes
- **Bulk Operations**: CSV enrollment, parent linking
- **Analytics & Reporting**: Progress tracking, performance reports
- **Anti-cheat**: One-device policy, secure exam environment
- **Multi-language**: English/Arabic with RTL support

## Tech Stack

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: Next.js + React + Tailwind CSS + shadcn/ui  
- **Mobile**: React Native (iOS/Android)
- **Infrastructure**: Docker Compose, Redis, MinIO (S3), MailHog
- **Security**: JWT authentication, DRM, device binding

## Quick Start

1. **Prerequisites**
   ```bash
   # Install dependencies
   node --version  # v18+
   docker --version
   ```

2. **Start Infrastructure**
   ```bash
   docker compose up -d
   ```

3. **Setup Database**
   ```bash
   cd api
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Start Services**
   ```bash
   # Terminal 1 - API
   cd api && npm run dev

   # Terminal 2 - Web
   cd web && npm run dev

   # Terminal 3 - Mobile (optional)
   cd mobile && npm start
   ```

5. **Access Applications**
   - Web App: http://localhost:3000
   - API: http://localhost:4000
   - MinIO Console: http://localhost:9001
   - MailHog: http://localhost:8025

## Project Structure

```
ako-lms/
├── api/              # Node.js Express API
├── web/              # Next.js React frontend
├── mobile/           # React Native app
├── docker-compose.yml
└── README.md
```

## Environment Setup

See individual README files in each directory for detailed setup instructions.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is proprietary software for AKO Courses.
