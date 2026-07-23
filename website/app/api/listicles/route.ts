import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { createListicleSchema } from '@/lib/zod/schemas';
import { enqueueJob } from '@/lib/redis/client';
import { withLogging } from '@/lib/with-logging';
import fs from 'fs/promises';
import path from 'path';

const RESEARCH_DATA_DIR = path.join(process.cwd(), '..', 'resources', 'research-data');

async function createListicleHandler(request: Request) {
  const body = await request.json();

  const validation = createListicleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { productUrl, referenceUrl, researchFileName } = validation.data;

  const researchFilePath = path.join(RESEARCH_DATA_DIR, researchFileName);
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

  await enqueueJob(listicleId);

  return NextResponse.json({ success: true, id: listicleId }, { status: 201 });
}

export const POST = withLogging(createListicleHandler, '/api/listicles');
