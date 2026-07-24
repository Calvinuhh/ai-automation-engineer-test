import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { COOKIE_NAME } from '@/lib/auth/config';

const publicPaths = [
  '/',
  '/login',
  '/api/auth/login',
  '/api/listicles/callback',
  '/api/listicles/error',
];
const redirectAwayPaths = ['/', '/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internal routes (static assets, images, etc.)
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (publicPaths.includes(pathname)) {
    if (redirectAwayPaths.includes(pathname) && token) {
      const payload = await verifyJWT(token);
      if (payload) {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
