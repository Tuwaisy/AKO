# AKO LMS API

Node.js Express API server for the AKO Learning Management System.

## Features

- **Authentication**: JWT-based auth with MFA support
- **Role-based Access Control**: Student, Parent, Assistant, Instructor, Admin
- **Device Management**: One-device policy for students
- **Course Management**: Create, manage, and deliver courses
- **Quiz System**: MCQ and essay questions with anti-cheat measures
- **Media Streaming**: Secure video delivery with DRM
- **Bulk Operations**: CSV enrollment and reporting
- **Audit Logging**: Complete activity tracking

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup Database**
   ```bash
   # Start PostgreSQL (via Docker Compose)
   docker compose up -d postgres redis

   # Run migrations
   npx prisma migrate dev

   # Generate Prisma client
   npx prisma generate

   # Seed database (optional)
   npm run db:seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000`

## Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (development only)
npm run db:reset

# Create new migration
npx prisma migrate dev --name description

# Deploy migrations (production)
npx prisma migrate deploy
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/mfa/setup` - Setup MFA
- `POST /api/auth/mfa/enable` - Enable MFA
- `POST /api/auth/mfa/disable` - Disable MFA

### Users
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user profile

### Courses
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `GET /api/courses/:id` - Get course details
- `PATCH /api/courses/:id` - Update course

### More endpoints coming soon...

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

### Optional Variables
- `REDIS_URL` - Redis connection (for caching)
- `S3_*` - Object storage configuration
- `SMTP_*` - Email configuration
- `DRM_*` - DRM provider settings

## Development

### Code Structure
```
src/
├── config/         # Configuration and environment
├── middleware/     # Express middleware
├── routes/         # API route handlers
├── services/       # Business logic
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   ```bash
   # Production environment variables
   NODE_ENV=production
   DATABASE_URL=postgresql://user:password@host:5432/db
   # ... other vars
   ```

3. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## Security Features

- **JWT Authentication** with access/refresh token rotation
- **Rate Limiting** to prevent abuse
- **CORS Protection** with configurable origins
- **Helmet.js** for security headers
- **Input Validation** using express-validator
- **Device Binding** for one-device policy
- **Audit Logging** for all sensitive operations
- **MFA Support** using TOTP

## Monitoring

- **Winston Logging** with file rotation
- **Health Check** endpoint at `/health`
- **Structured Error Handling**
- **Performance Metrics** (coming soon)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

Proprietary - AKO Courses
