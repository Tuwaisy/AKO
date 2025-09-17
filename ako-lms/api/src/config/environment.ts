import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  // General
  NODE_ENV: string;
  PORT: number;
  TIMEZONE: string;
  WEB_ORIGIN: string;
  CORS_ALLOWED_ORIGINS: string[];

  // Database
  DATABASE_URL: string;
  REDIS_URL: string;

  // Authentication
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_TTL_SEC: number;
  REFRESH_TOKEN_TTL_SEC: number;

  // Device Policy
  FEATURE_DEVICE_LIMIT_PER_ROLE: Record<string, number>;

  // Storage
  S3_ENDPOINT: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET_UPLOADS: string;
  S3_REGION: string;
  CDN_PUBLIC_BASE_URL: string;

  // DRM
  DRM_PROVIDER: string;
  DRM_LICENSE_URL?: string;
  DRM_CERTIFICATE_PATH?: string;
  DRM_PRIVATE_KEY_PATH?: string;

  // Email
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE: boolean;
  EMAIL_FROM: string;

  // Push Notifications
  PUSH_FCM_SERVER_KEY?: string;
  PUSH_APNS_KEY_ID?: string;
  PUSH_APNS_TEAM_ID?: string;
  PUSH_APNS_BUNDLE_ID?: string;

  // Feature Flags
  FEATURE_IMPERSONATION: boolean;
  FEATURE_PARENT_WEEKLY_DIGEST: boolean;
  FEATURE_MFA: boolean;
  FEATURE_BULK_ENROLLMENT: boolean;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: boolean;

  // File Upload
  MAX_FILE_SIZE_MB: number;
  ALLOWED_FILE_TYPES: string[];

  // Logging
  LOG_LEVEL: string;
  LOG_FILE_PATH: string;
  LOG_MAX_FILES: number;
  LOG_MAX_SIZE: string;

  // Security
  BCRYPT_ROUNDS: number;
  HELMET_CSP_ENABLED: boolean;
  TRUST_PROXY: boolean;
}

const parseJSON = (value: string | undefined, defaultValue: any = {}) => {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const parseArray = (value: string | undefined, delimiter = ','): string[] => {
  return value ? value.split(delimiter).map(item => item.trim()) : [];
};

export const config: Config = {
  // General
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  TIMEZONE: process.env.TIMEZONE || 'Africa/Cairo',
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:3000',
  CORS_ALLOWED_ORIGINS: parseArray(process.env.CORS_ALLOWED_ORIGINS, ','),

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ako_lms',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
  ACCESS_TOKEN_TTL_SEC: parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '900', 10),
  REFRESH_TOKEN_TTL_SEC: parseInt(process.env.REFRESH_TOKEN_TTL_SEC || '1209600', 10),

  // Device Policy
  FEATURE_DEVICE_LIMIT_PER_ROLE: parseJSON(process.env.FEATURE_DEVICE_LIMIT_PER_ROLE, {
    STUDENT: 1,
    PARENT: 2,
    ASSISTANT: 3,
    INSTRUCTOR: 5,
    ADMIN: 10,
  }),

  // Storage
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:9000',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
  S3_BUCKET_UPLOADS: process.env.S3_BUCKET_UPLOADS || 'ako-uploads',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  CDN_PUBLIC_BASE_URL: process.env.CDN_PUBLIC_BASE_URL || 'http://localhost:9000',

  // DRM
  DRM_PROVIDER: process.env.DRM_PROVIDER || 'mock',
  DRM_LICENSE_URL: process.env.DRM_LICENSE_URL,
  DRM_CERTIFICATE_PATH: process.env.DRM_CERTIFICATE_PATH,
  DRM_PRIVATE_KEY_PATH: process.env.DRM_PRIVATE_KEY_PATH,

  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '1025', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  EMAIL_FROM: process.env.EMAIL_FROM || 'AKO Courses <no-reply@akocourses.com>',

  // Push Notifications
  PUSH_FCM_SERVER_KEY: process.env.PUSH_FCM_SERVER_KEY,
  PUSH_APNS_KEY_ID: process.env.PUSH_APNS_KEY_ID,
  PUSH_APNS_TEAM_ID: process.env.PUSH_APNS_TEAM_ID,
  PUSH_APNS_BUNDLE_ID: process.env.PUSH_APNS_BUNDLE_ID,

  // Feature Flags
  FEATURE_IMPERSONATION: process.env.FEATURE_IMPERSONATION === 'true',
  FEATURE_PARENT_WEEKLY_DIGEST: process.env.FEATURE_PARENT_WEEKLY_DIGEST === 'true',
  FEATURE_MFA: process.env.FEATURE_MFA !== 'false', // Default true
  FEATURE_BULK_ENROLLMENT: process.env.FEATURE_BULK_ENROLLMENT !== 'false', // Default true

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',

  // File Upload
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10),
  ALLOWED_FILE_TYPES: parseArray(process.env.ALLOWED_FILE_TYPES, ','),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || 'logs/app.log',
  LOG_MAX_FILES: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  HELMET_CSP_ENABLED: process.env.HELMET_CSP_ENABLED !== 'false', // Default true
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

export default config;
