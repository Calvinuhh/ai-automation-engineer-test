import { NextResponse } from 'next/server';
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2/client';
import { ZipArchive } from 'archiver';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listicleId = parseInt(id, 10);

  if (isNaN(listicleId)) {
    return NextResponse.json({ error: 'Invalid listicle ID' }, { status: 400 });
  }

  const prefix = `listicles/${listicleId}/`;

  try {
    const listResult = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
      })
    );

    const objects = listResult.Contents ?? [];
    if (objects.length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 404 });
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    for (const obj of objects) {
      if (!obj.Key) continue;

      const response = await r2Client.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: obj.Key,
        })
      );

      if (response.Body) {
        const buffer = Buffer.from(await response.Body.transformToByteArray());
        const fileName = obj.Key.replace(prefix, '');
        archive.append(buffer, { name: fileName });
      }
    }

    archive.finalize();

    const zipBuffer = await archivePromise;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="listicle-${listicleId}.zip"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to download: ' + String(err) }, { status: 500 });
  }
}
