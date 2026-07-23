import { NextResponse } from 'next/server';
import { logRequest, logError } from './logger';

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'jwt',
  'apikey',
  'api_key',
  'authorization',
]);

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

async function extractBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!BODY_METHODS.has(request.method)) return null;

  const clone = request.clone();
  try {
    const text = await clone.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function withLogging(
  handler: (request: Request) => Promise<NextResponse>,
  routeName: string
) {
  return async (request: Request) => {
    const start = Date.now();
    const parsedUrl = new URL(request.url);
    const fullUrl = parsedUrl.pathname + parsedUrl.search;

    try {
      const body = await extractBody(request);
      const response = await handler(request);
      const duration = Date.now() - start;

      const metadata: Record<string, unknown> = {};
      if (body) {
        metadata.body = sanitizeBody(body);
      }
      if (parsedUrl.search) {
        metadata.query = Object.fromEntries(parsedUrl.searchParams);
      }

      logRequest(request.method, fullUrl, response.status, duration, metadata);
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      logError(error, { route: fullUrl, duration: `${duration}ms` });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
