# Learning Management System (LMS) — Product Requirements Document (PRD)

**Version:** 1.0  
**Platforms:** Web (React/Next.js) & Mobile (React Native iOS/Android)  
**Primary Roles:** Student, Parent, Assistant, Instructor, Admin  
**Status:** Draft for build sign‑off

---

## 1) Executive Summary
A role‑based LMS enabling instructors to author courses, upload secure videos/files, build quizzes/exams, and release content via drip schedules with prerequisites. Assistants handle enrollments (single & CSV bulk) and parent linking. Students consume content with strong anti‑cheat/DRM posture and one‑device policy. Parents view progress/attendance for multiple children. Admins govern the system with audit logs, impersonation, exports, and policy controls.

**Success metrics (first 90 days post‑launch):**
- ≥ 85% lesson completion for first enrolled cohort.
- ≤ 1% failed video plays (player/storage/CDN errors).
- ≤ 3% CSV import error rate after validation pass.
- 99.9% API availability; p95 page load < 2.5s on broadband.

---

## 2) Goals & Non‑Goals
**Goals**
- Streamlined course authoring with media upload/transcode and file attachments.
- Drip scheduling by date or prerequisite completion.
- Robust assessments (MCQ, essay) with image support and graded attempts.
- Deep analytics: watch time, playback speed, quiz performance, attendance.
- Parent visibility across linked students; automated bulk reports.
- Enterprise controls: bulk enrollments, exports, impersonation, auditability.
- Security: DRM, watermarking, single‑device policy, least‑privilege RBAC.

**Non‑Goals (v1)**
- Payments/marketplace, live video classes (integrations later), offline downloads.

---

## 3) Roles & Permissions

| Capability | Student | Parent | Assistant | Instructor | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Sign in / MFA | ✓ | ✓ | ✓ | ✓ | ✓ |
| View courses | ✓ | via linked students | ✓ | ✓ | ✓ |
| Watch secure videos/files | ✓ | view via child | ✓ | ✓ | ✓ |
| See viewing analytics | own | child | ✓ | ✓ | ✓ |
| Take quizzes/exams | ✓ | — | — | — | — |
| Author courses/lessons | — | — | — | ✓ | ✓ |
| Create quizzes/exams | — | — | — | ✓ | ✓ |
| Drip scheduling | — | — | — | ✓ | ✓ |
| Enroll students | — | — | ✓ (bulk CSV) | ✓ (own) | ✓ |
| Link parent↔student | — | limited request | ✓ | ✓ | ✓ |
| Export enrollments CSV | — | — | — | — | ✓ |
| Impersonate users | — | — | — | — | ✓ (audited) |
| Device policy mgmt | — | — | — | — | ✓ |
| System settings | — | — | — | — | ✓ |

**Impersonation**: Admin must provide reason; UI banner indicates impersonation; immutable audit log stored.

---

## 4) Key User Journeys (High‑Level)
- **Instructor**: Create course → Add sections/lessons → Upload video/files → Create quiz → Set drip (date/prereq) → Publish → Review analytics.
- **Assistant**: Bulk upload CSV of students → Validate → Commit → Link parents → Enroll cohorts → Monitor progress.
- **Student**: Login (one device) → Resume course → Watch secure video (DRM/watermark) → Complete quiz → Unlock next lesson via drip → View progress.
- **Parent**: Login → Select child → View attendance/grades/progress → Receive weekly digest.
- **Admin**: Search user/course → Export enrollments CSV → Impersonate for support → Review audit logs → Adjust device/DRM policy.

---

## 5) Feature Requirements

### 5.1 Authentication & Accounts
- Email/password with optional SSO (OIDC/Google/Apple); MFA (TOTP/SMS/email).
- **One‑device policy (students)**: Active session bound to device hash; new login invalidates old; grace/cooldown configurable; admin override.
- Session management: short‑lived access tokens + refresh rotation; server‑side revocation.

### 5.2 Course & Content Authoring
- Hierarchy: Course → Sections → Lessons (Video | File | Quiz).
- Media upload to object storage; serverless transcode to HLS/DASH; thumbnail generation.
- Files: PDFs, slides, zips; per‑lesson attachments.
- States: draft, scheduled, published, archived.

### 5.3 DRM, Watermarking & Anti‑Cheat
- DRM: Widevine/FairPlay/PlayReady via EME (web) and native players (mobile).
- Dynamic watermark overlay: user name/email/time; server‑signed claims.
- Exams: full‑screen requirement (web), tab‑switch detection/flagging, disabled copy/paste/print/context menu; mobile screenshot/recording blocked (FLAG_SECURE/UISecure).
- **Reality note:** Desktop screen capture cannot be fully prevented; mitigations + policy acknowledgement required.

### 5.4 Drip Scheduling & Prerequisites
- Per lesson: unlock by date (absolute/relative to enrollment) and/or prerequisite completion (prev. lessons completed + quiz pass threshold).
- Locked lessons visually indicated; next unlock ETA displayed.

### 5.5 Quizzes & Exams
- Types: MCQ (single/multi), essay; image support in stem/options.
- Settings: time limit, shuffle, number of attempts, pass mark, optional negative marking.
- Banks/pools: random draw per attempt.
- Grading: auto (MCQ), rubric/manual (essay). Retake policies: highest/last/average.

### 5.6 Enrollment & Rosters
- Assistant can enroll/unenroll; **CSV bulk import** with template, dry‑run validation, error report, and partial success controls.
- Link/unlink parent↔student; manage cohorts/groups.

### 5.7 Parent Portal
- One parent ↔ many students; per‑child dashboard of courses, grades, attendance, due items.
- Digest emails (weekly) and risk alerts (e.g., missed quiz, low watch time).

### 5.8 Analytics & Reporting
- Student analytics: progress %, last activity, watch time, avg speed, quiz scores, attempts, attendance.
- Course analytics: enrollments, completion rates, watch‑time distribution, drop‑offs.
- **Reports**: Per‑student PDF/CSV; bulk parent report (select students → compile multi‑course summary → send to linked parents).
- Viewing event log: play/pause/seek/speed with timestamps; aggregated view time.

### 5.9 Attendance
- Content attendance: watched ≥ X% within time window.
- Manual attendance: instructor/assistant mark; bulk edit.
- (Later) Live attendance: ingestion from Zoom/Meet logs.

### 5.10 Admin Portal & Governance
- Global search; user/course management; enrollments export (CSV with filters).
- **Impersonation** with reason capture and audit trail.
- Policy settings: device limits by role, DRM toggles, quiet hours, localization.
- System dashboards; error logs; maintenance banner.

### 5.11 Notifications
- Email + push (mobile) + optional SMS; templates for enrollment, drip unlock, due soon, failed quiz, weekly digest.
- Timezone aware; quiet hours per user.

### 5.12 Localization & Accessibility
- English/Arabic; full RTL support; Cairo timezone default.
- WCAG 2.1 AA: captions, keyboard navigation, contrast, focus order.

---

## 6) Security, Privacy & Compliance
- OAuth 2.1/OIDC; JWT access + rotating refresh; token binding to device where applicable.
- PII encryption at rest; TLS 1.2+ in transit; signed URLs for media segments.
- RBAC with least privilege; multi‑tenant safe defaults (if enabled later).
- Rate limiting, IP throttling; device attestation on mobile (Play Integrity/DeviceCheck where feasible).
- Audit logs for: impersonation, grade edits, CSV imports, policy changes, admin sign‑ins.
- Data retention: audit logs ≥ 12 months; backups daily with 30‑day retention.

---

## 7) Data Model (Core Entities)
- **User**(id, email, role, status, locale, tz, createdAt)
- **ParentLink**(parentId, studentId, createdAt)
- **Course**(id, title, description, ownerId, state, language, createdAt)
- **Section**(id, courseId, order, title)
- **Lesson**(id, sectionId, type[video|file|quiz], order, releaseRule)
- **MediaAsset**(id, lessonId, url, drmKeys, duration, captions[])
- **Quiz**(id, lessonId, timeLimit, attempts, passMark, drawRule)
- **Question**(id, quizId, type, text, mediaRef, options[], answers[])
- **Attempt**(id, quizId, userId, startAt, endAt, score, flags)
- **Submission**(id, attemptId, questionId, response, score)
- **Enrollment**(id, courseId, userId, cohortId, status, enrolledAt)
- **Attendance**(id, userId, lessonId, type, value, timestamp)
- **ViewEvent**(id, userId, lessonId, eventType, position, speed, ts)
- **ReportRequest**(id, creatorId, scope, status, fileRef)
- **DeviceBinding**(id, userId, deviceHash, lastSeen, active)
- **Session**(id, userId, deviceId, validUntil)
- **AuditLog**(id, actorId, action, target, metadata, ts)

---

## 8) API Surface (summary)
**REST/JSON** (see separate OpenAPI spec):
- Auth: /auth/login, /auth/refresh, /auth/logout
- Users: /users/:id, /users (admin)
- Parents: /parents/:id/children, /parents/:parentId/children (POST)
- Courses/Sections/Lessons: /courses, /courses/:id, /sections, /lessons
- Media: /media/sign (POST), /lessons/:id/media (POST)
- Enrollments: /courses/:id/enroll (POST), /enrollments/bulk (POST)
- Quizzes: /lessons/:id/quiz (POST), /quizzes/:id/questions (POST)
- Attempts: /quizzes/:id/attempts (POST), /attempts/:id/submit (POST)
- Analytics: /students/:id/progress, /courses/:id/analytics
- Reports: /reports/student, /reports/parent-bulk
- Attendance: /attendance (POST/GET)
- Exports: /courses/:id/enrollments.csv (GET)
- Admin: /admin/impersonate (POST), /admin/audit-logs (GET)

---

## 9) Integrations (later phases)
- Live sessions (Zoom/Google Meet) for attendance ingestion.
- Payment gateway (Stripe) for paid courses/marketplace.
- Institution SSO (Azure AD/Okta) for enterprise deployments.

---

## 10) Non‑Functional Requirements
- **Scale**: 10k concurrent viewers; 100k MAU target.
- **Availability**: 99.9% monthly; blue/green deployments.
- **Performance**: p95 API < 300ms (cached); p95 TTFB < 200ms via edge CDN.
- **Observability**: central logging, tracing, metrics, alerting; SLO dashboards.
- **Backups/DR**: daily DB backups, 30‑day retention; RPO ≤ 24h, RTO ≤ 4h.

---

## 11) Acceptance Criteria (Mapping to Client Bullets)
1. **Five user types sign in** → Role‑based routing; RBAC enforced; MFA optional.
2. **Instructor uploads media/files** → Upload→transcode→attach workflow; playable preview.
3. **Quizzes/exams with images; essay/MCQ** → Editor supports images; MCQ auto‑grade; essay manual; passing thresholds.
4. **Drip courses** → Date/prereq locks; UI indicators; unlock on completion.
5. **Performance reports** → Per‑student PDF/CSV; bulk parent report for selected students across courses.
6. **Parent views attendance/grades; multiple children** → Parent dashboard per child; link many students.
7. **Viewing settings visible to assistant/teacher** → Watch time, speed, last viewed shown per student.
8. **No screen record** → Mobile screenshot/record block; web DRM + watermark + anti‑cheat; limitation note recorded.
9. **One device per student** → New login invalidates old; admin override; audit trail.
10. **Assistant bulk enroll & link parents** → CSV wizard; parent linking tools.
11. **Admin counts & CSV export** → Enrollments dashboard; one‑click CSV export.
12. **Admin full control** → Impersonation with reason; audit logs of all privileged actions.

---

## 12) Phased Delivery Plan
**MVP (8–10 weeks)**
- Auth/RBAC/MFA; device policy (1 device/student).
- Course authoring; media upload & DRM; file attachments.
- Quizzes (MCQ/essay); drip (date/prereq); analytics basics.
- Parent linking & dashboard; CSV enroll; reports (student & bulk parent).
- Admin portal with impersonation, exports, audit logs.
- Mobile player with screenshot/record block.

**V1.1 (4–6 weeks)**
- Live‑class attendance ingestion; advanced dashboards; notifications v2.
- Optional: SSO for institutions, payments, limited offline (if DRM permits).

---

## 13) Risks & Mitigations
- **Desktop screen capture** → Mitigate via DRM + watermark + legal policy; monitor leak signatures.
- **CSV data quality** → Strict schema validation + dry‑run reports + partial commit options.
- **Bandwidth/latency spikes** → Multi‑bitrate HLS, CDN edge caching, pre‑transcode.
- **Impersonation abuse** → Reason capture, banner, immutable audit logs, periodic review.
- **Internationalization complexity** → Centralized i18n; RTL testing automation; content locale fields.

---

## 14) Appendices
- **CSV Templates**: Enrollment (email, name, courseId, cohort, parentEmail?).
- **Report Contents**: Progress %, watch time, last activity, quiz scores, attendance summary, upcoming due items.
- **Glossary**: DRM, EME, HLS/DASH, RBAC, MFA, CSV dry‑run.

