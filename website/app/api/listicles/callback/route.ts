import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { n8nCallbackSchema } from '@/lib/zod/schemas';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

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
      const outputDir = path.join(process.cwd(), 'generated', 'listicles', String(listicleId));
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(path.join(outputDir, 'index.html'), html);

      await db
        .update(listicles)
        .set({
          status: 'completed',
          outputPath: `generated/listicles/${listicleId}/`,
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
