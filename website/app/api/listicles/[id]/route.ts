import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import {
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2/client';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listicleId = parseInt(id, 10);

  if (isNaN(listicleId)) {
    return NextResponse.json({ error: 'Invalid listicle ID' }, { status: 400 });
  }

  const rows = await db
    .select({ id: listicles.id, status: listicles.status })
    .from(listicles)
    .where(eq(listicles.id, listicleId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Listicle not found' }, { status: 404 });
  }

  const prefix = `listicles/${listicleId}/`;

  try {
    let continuationToken: string | undefined;
    const keys: string[] = [];

    do {
      const listResult = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of listResult.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    if (keys.length > 0) {
      const objects = keys.map((Key) => ({ Key }));
      await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: objects },
        })
      );
    }

    await db.delete(listicles).where(eq(listicles.id, listicleId));

    logger.info({ type: 'delete', listicleId, deletedObjects: keys.length }, 'Listicle deleted');

    return NextResponse.json({ success: true, deleted: keys.length });
  } catch (err) {
    logger.error({ type: 'delete', listicleId, error: String(err) }, 'Failed to delete listicle');
    return NextResponse.json({ error: 'Failed to delete listicle' }, { status: 500 });
  }
}
