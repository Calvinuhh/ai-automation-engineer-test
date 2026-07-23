import { NextResponse } from 'next/server';
import { logRequest, logError } from './logger';

export function withLogging(
  handler: (request: Request) => Promise<NextResponse>,
  routeName: string
) {
  return async (request: Request) => {
    const start = Date.now();
    try {
      const response = await handler(request);
      const duration = Date.now() - start;
      logRequest(request.method, routeName, response.status, duration);
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      logError(error, { route: routeName, duration: `${duration}ms` });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
