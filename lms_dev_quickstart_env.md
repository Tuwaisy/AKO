# LMS — Developer Quickstart & Environment

This README gets you from zero to a running **API + Web + Mobile** stack with sensible defaults, local services, and production‑ready env vars.

---

## 1) Tech Overview
- **Backend:** Node.js (Express/Nest) + Postgres + Redis, object storage (S3‑compatible), optional DRM service.
- **Web:** React/Next.js + Tailwind + shadcn/ui.
- **Mobile:** React Native (iOS/Android) with secure player hooks.
- **Auth:** JWT access + rotating refresh (OIDC optional).
- **Infra (local):** Docker Compose → Postgres, Redis, MinIO (S3), MailHog (SMTP), Localstack (optional), Traefik (optional).

> Note: The API endpoints and schemas are defined in **“LMS API — OpenAPI v1.0.”**

---

## 2) Prereqs
- Node.js 18+ and pnpm (or npm/yarn)
- Docker Desktop / Podman
- Xcode + CocoaPods (iOS), Android SDK (Android)

---

## 3) Environment Variables
Create **.env** files in `/api`, `/web`, `/mobile` as needed. Below is a consolidated reference (adjust prefixes per app):

```env
# General
NODE_ENV=development
TIMEZONE=Africa/Cairo
WEB_ORIGIN=http://localhost:3000
API_BASE_URL=http://localhost:4000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me-too
ACCESS_TOKEN_TTL_SEC=900
REFRESH_TOKEN_TTL_SEC=1209600

# Device policy (JSON per role)
FEATURE_DEVICE_LIMIT_PER_ROLE={"student":1}

# Storage (MinIO in dev)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_UPLOADS=lms-uploads
CDN_PUBLIC_BASE_URL=http://localhost:8080

# DRM (dev can use mock)
DRM_PROVIDER=mock # mock|widevine|fairplay|playready
DRM_LICENSE_URL=

# Email (MailHog dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="LMS <no-reply@local.test>"

# Push (optional)
PUSH_FCM_SERVER_KEY=

# Feature flags
FEATURE_IMPERSONATION=true
FEATURE_PARENT_WEEKLY_DIGEST=true
```

---

## 4) Docker Compose (local services)
Create `docker-compose.yml` in repo root (or use your own):

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: lms
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: ["minio:/data"]

  mailhog:
    image: mailhog/mailhog
    ports: ["1025:1025", "8025:8025"]

volumes:
  pgdata: {}
  minio: {}
```

**Init the S3 bucket**:
1. Open MinIO console http://localhost:9001 (minioadmin/minioadmin).  
2. Create bucket **`lms-uploads`**.  
3. (Optional) Set a public read policy for test assets or serve via signed URLs in dev.

---

## 5) Database & Migrations
Use your ORM of choice. Example (Prisma):

```bash
cd api
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed # optional seeding
```

**Create initial admin user** (example CLI):
```bash
pnpm cli create-admin --email admin@example.com --password StrongP@ssw0rd
```

---

## 6) Running the Stack
**1) Start infra:**
```bash
docker compose up -d
```
**2) API:**
```bash
cd api
pnpm dev  # or npm run dev
```
**3) Web:**
```bash
cd web
pnpm dev
```
**4) Mobile:**
```bash
cd mobile
cp .env.example .env
pnpm start  # Expo or React Native CLI
```

> iOS: `cd ios && pod install` before first run.  
> Android: ensure an emulator/device is connected.

---

## 7) Video/DRM in Development
- **Dev default:** `DRM_PROVIDER=mock` → use HLS without license server; still require signed URLs.
- **Watermark:** enable dynamic overlay with user/email/date from a server‑signed claim.
- **Prod:** configure license server endpoints (Widevine/FairPlay/PlayReady) and rotate keys.

**Important:** Desktop screen capture cannot be fully prevented; mobile screenshots/recording blocked via `FLAG_SECURE` (Android) and UISecure (iOS).

---

## 8) One‑Device Policy (Students)
- Device is identified by a hash (web: UA+platform+storage key; mobile: device ID).  
- On new login, previous session is revoked.  
- Admin override/cool‑down available.  
- All actions audited.

---

## 9) CSV Bulk Enrollment
Use the sample in **`bulk_enrollments.sample.csv`** (in canvas). Upload via the Admin/Assistant CSV wizard.

**Validation rules (server):**
- `operation` ∈ {enroll, unenroll, link_parent}
- `student_email` required; create if not exists (role=student).
- For `enroll|unenroll`: require `course_id` **or** `course_code`.
- `parent_email` creates parent if not exists and links to student.
- `send_welcome` defaults to true.

---

## 10) Notifications (Dev)
- Emails are captured by MailHog UI at http://localhost:8025.  
- Push disabled unless you provide keys.

---

## 11) Internationalization & Accessibility
- English & Arabic (RTL) enabled; default timezone **Africa/Cairo**.  
- WCAG 2.1 AA: captions, keyboard navigation, focus states.

---

## 12) Observability
- Use your preferred stack (Winston/Pino logs, OpenTelemetry traces, Prometheus metrics, Sentry for errors).  
- Define SLOs: API availability 99.9%; p95 latency < 300ms.

---

## 13) Production Notes
- Use managed Postgres/Redis; S3/CloudFront; real DRM; WAF + rate limiting.  
- Secrets via Vault/SSM; rotate JWT & DRM keys.  
- Blue/green or canary deploys; daily DB backups (30‑day retention).  
- Audit log retention ≥ 12 months.

---

## 14) Troubleshooting
- **CORS errors:** verify `CORS_ALLOWED_ORIGINS` and frontend `API_BASE_URL`.
- **Uploads fail:** check MinIO bucket & credentials; signed URL clock skew.
- **MFA codes invalid:** ensure server time sync and token drift tolerance.
- **DRM playback issues:** confirm license URL, certs, and MIME types from CDN.

---

## 15) Licensing & Compliance
- Ensure course materials licensing allows DRM/watermarking.  
- Provide ToS acknowledging anti‑cheat limitations and device policy.

