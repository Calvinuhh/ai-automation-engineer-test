import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const errorSchema = z.object({
  listicleId: z.number(),
  errorMessage: z.string().min(1).max(2000),
  lastNodeExecuted: z.string().optional(),
});

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

  const validation = errorSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { listicleId, errorMessage, lastNodeExecuted } = validation.data;

  try {
    const fullMessage = lastNodeExecuted
      ? `[n8n] ${lastNodeExecuted}: ${errorMessage}`
      : `[n8n] ${errorMessage}`;

    await db
      .update(listicles)
      .set({
        status: 'failed',
        errorMessage: fullMessage.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(listicles.id, listicleId));

    logger.warn(
      { type: 'error-callback', listicleId, errorMessage: fullMessage },
      'Listicle marked as failed via n8n error callback'
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(
      { type: 'error-callback', listicleId, error: String(err) },
      'Failed to update listicle status'
    );
    return NextResponse.json({ error: 'Failed to update listicle' }, { status: 500 });
  }
}
