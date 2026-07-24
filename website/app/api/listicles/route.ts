import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { listicles, uploadedFiles } from '@/lib/db/schema';
import { createListicleSchema } from '@/lib/zod/schemas';
import { withLogging } from '@/lib/with-logging';
import { processListicle } from '@/lib/pipeline';
import { desc, eq } from 'drizzle-orm';
import fs from 'fs/promises';

export const GET = withLogging(async () => {
  const rows = await db.select().from(listicles).orderBy(desc(listicles.createdAt));
  return NextResponse.json(rows);
}, '/api/listicles');

async function createListicleHandler(request: Request) {
  const body = await request.json();

  const validation = createListicleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { productUrl, referenceUrl, sessionToken } = validation.data;

  const uploadedRow = await db
    .select({ filePath: uploadedFiles.filePath })
    .from(uploadedFiles)
    .where(eq(uploadedFiles.sessionToken, sessionToken))
    .limit(1)
    .then((rows) => rows[0]);

  if (!uploadedRow) {
    return NextResponse.json(
      { error: 'No research file uploaded for this session' },
      { status: 400 }
    );
  }

  try {
    await fs.access(uploadedRow.filePath);
  } catch {
    return NextResponse.json({ error: 'Research file not found on disk' }, { status: 400 });
  }

  const result = await db
    .insert(listicles)
    .values({
      productUrl,
      referenceUrl,
      sessionToken,
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
