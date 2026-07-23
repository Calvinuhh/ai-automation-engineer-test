import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { createListicleSchema } from '@/lib/zod/schemas';
import { withLogging } from '@/lib/with-logging';
import { processListicle } from '@/lib/pipeline';
import fs from 'fs/promises';

async function createListicleHandler(request: Request) {
  const body = await request.json();

  const validation = createListicleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { productUrl, referenceUrl, researchFilePath } = validation.data;

  try {
    await fs.access(researchFilePath);
  } catch {
    return NextResponse.json({ error: 'Research file not found' }, { status: 400 });
  }

  const result = await db
    .insert(listicles)
    .values({
      productUrl,
      referenceUrl,
      researchFilePath,
      status: 'pending',
    })
    .returning({ id: listicles.id });

  const listicleId = result[0].id;

  processListicle(listicleId).catch((err) => {
    console.error('Background pipeline failed:', err);
  });

  return NextResponse.json({ success: true, id: listicleId, status: 'pending' }, { status: 201 });
}

export const POST = withLogging(createListicleHandler, '/api/listicles');
