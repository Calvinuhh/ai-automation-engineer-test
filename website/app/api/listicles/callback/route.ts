import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { n8nCallbackSchema } from '@/lib/zod/schemas';
import { logger } from '@/lib/logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, getR2Key } from '@/lib/r2/client';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  try {
    await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = n8nCallbackSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { listicleId, html, status, errorMessage } = validation.data;

  if (status === 'completed') {
    try {
      const { cleanHtml, cssContent, jsContent } = splitAssets(html);

      const uploads = [
        r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: getR2Key(listicleId, 'index.html'),
            Body: cleanHtml,
            ContentType: 'text/html',
          })
        ),
        r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: getR2Key(listicleId, 'styles.css'),
            Body: cssContent,
            ContentType: 'text/css',
          })
        ),
      ];

      if (jsContent.trim()) {
        uploads.push(
          r2Client.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: getR2Key(listicleId, 'scripts.js'),
              Body: jsContent,
              ContentType: 'application/javascript',
            })
          )
        );
      }

      await Promise.all(uploads);

      await db
        .update(listicles)
        .set({
          status: 'completed',
          outputPath: `listicles/${listicleId}/`,
          updatedAt: new Date(),
        })
        .where(eq(listicles.id, listicleId));

      logger.info({ type: 'callback', listicleId }, 'Listicle completed via n8n callback');
    } catch (err) {
      logger.error({ type: 'callback', listicleId, error: String(err) }, 'Failed to save listicle');
      return NextResponse.json({ error: 'Failed to save listicle' }, { status: 500 });
    }
  } else {
    await db
      .update(listicles)
      .set({
        status: 'failed',
        errorMessage: errorMessage?.slice(0, 2000) ?? 'n8n reported failure',
        updatedAt: new Date(),
      })
      .where(eq(listicles.id, listicleId));

    logger.warn({ type: 'callback', listicleId, errorMessage }, 'Listicle failed via n8n callback');
  }

  return NextResponse.json({ success: true });
}

function splitAssets(html: string): { cleanHtml: string; cssContent: string; jsContent: string } {
  let cleanHtml = html;
  let cssContent = '';
  let jsContent = '';

  // Extract inline <style> into separate CSS file
  const styleMatch = cleanHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    cssContent = styleMatch[1].trim();
    cleanHtml = cleanHtml.replace(styleMatch[0], '<link rel="stylesheet" href="styles.css">');
  }

  // Extract inline <script> (excluding external scripts with src=) into separate JS file
  const scriptMatch = cleanHtml.match(/<script(?!.*\ssrc=)[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    jsContent = scriptMatch[1].trim();
    cleanHtml = cleanHtml.replace(scriptMatch[0], '<script src="scripts.js"></script>');
  }

  return { cleanHtml, cssContent, jsContent };
}
