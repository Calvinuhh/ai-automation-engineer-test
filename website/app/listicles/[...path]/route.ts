import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { COOKIE_NAME } from '@/lib/auth/config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2/client';
import path from 'path';

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
  const r2Key = `listicles/${filePath}`;

  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
      })
    );

    if (!response.Body) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = Buffer.from(await response.Body.transformToByteArray());
    const ext = path.extname(filePath).toLowerCase();

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
                      : ext === '.mp4'
                        ? 'video/mp4'
                        : ext === '.webm'
                          ? 'video/webm'
                          : response.ContentType || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
