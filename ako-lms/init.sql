-- Database initialization script
-- Creates initial database structure and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'Africa/Cairo';

-- Create initial indexes for performance
-- These will be recreated by Prisma migrations but useful for initial setup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_owner ON courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_view_events_user_lesson ON view_events(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_ts ON audit_logs(actor_id, ts);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_courses_search ON courses USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_lessons_search ON lessons USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

COMMENT ON DATABASE ako_lms IS 'AKO Courses Learning Management System Database';
