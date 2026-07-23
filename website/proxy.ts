import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { COOKIE_NAME } from '@/lib/auth/config';

const publicPaths = ['/', '/login', '/api/auth/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internal routes (static assets, images, etc.)
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
