import winston from 'winston';
import path from 'path';
import { config } from '../config/environment';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Create file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
  }),
];

// Add file transport if not in test environment
if (config.NODE_ENV !== 'test') {
  // Ensure logs directory exists
  const logsDir = path.dirname(config.LOG_FILE_PATH);
  
  transports.push(
    // File transport for all logs
    new winston.transports.File({
      filename: config.LOG_FILE_PATH,
      format: fileFormat,
      maxsize: parseFileSize(config.LOG_MAX_SIZE),
      maxFiles: config.LOG_MAX_FILES,
      tailable: true,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: parseFileSize(config.LOG_MAX_SIZE),
      maxFiles: config.LOG_MAX_FILES,
      tailable: true,
    })
  );
}

// Parse file size string (e.g., "10m" -> 10 * 1024 * 1024)
function parseFileSize(size: string): number {
  const match = size.match(/^(\d+)([kmg]?)$/i);
  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const value = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case 'k':
      return value * 1024;
    case 'm':
      return value * 1024 * 1024;
    case 'g':
      return value * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

// Create the logger
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  levels: logLevels,
  format: winston.format.errors({ stack: true }),
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(path.dirname(config.LOG_FILE_PATH), 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(path.dirname(config.LOG_FILE_PATH), 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// Create stream interface for Morgan
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper methods for structured logging
export const logRequest = (req: any, res: any, responseTime?: number) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
  };

  const level = res.statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'HTTP Request', logData);
};

export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    stack: error.stack,
    context,
  });
};

export const logAudit = (action: string, userId: string, target?: string, metadata?: any) => {
  logger.info('Audit Log', {
    action,
    userId,
    target,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
