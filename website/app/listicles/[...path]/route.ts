import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { COOKIE_NAME } from '@/lib/auth/config';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return new NextResponse('Invalid token', { status: 401 });
  }

  const resolvedParams = await params;
  const filePath = resolvedParams.path.join('/');
  const fullPath = path.join(process.cwd(), 'generated', 'listicles', filePath);

  try {
    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentType =
      ext === '.html'
        ? 'text/html'
        : ext === '.css'
          ? 'text/css'
          : ext === '.js'
            ? 'application/javascript'
            : ext === '.json'
              ? 'application/json'
              : ext === '.png'
                ? 'image/png'
                : ext === '.jpg' || ext === '.jpeg'
                  ? 'image/jpeg'
                  : ext === '.gif'
                    ? 'image/gif'
                    : ext === '.svg'
                      ? 'image/svg+xml'
                      : 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
