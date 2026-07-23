import pino from 'pino';
import path from 'path';
import fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = pino({
  level: 'info',
  transport: {
    targets: [
      {
        target: 'pino/file',
        level: 'info',
        options: {
          destination: path.join(logDir, 'app.log'),
          mkdir: true,
        },
      },
      {
        target: 'pino/file',
        level: 'error',
        options: {
          destination: path.join(logDir, 'error.log'),
          mkdir: true,
        },
      },
    ],
  },
});

export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  metadata?: Record<string, unknown>
) {
  logger.info({
    type: 'request',
    method,
    url,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

export function logError(error: unknown, context?: Record<string, unknown>) {
  logger.error({
    type: 'error',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...context,
  });
}
