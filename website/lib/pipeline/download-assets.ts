import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, getR2Key } from '@/lib/r2/client';

export interface DownloadedAssets {
  assetMap: Map<string, string>;
  imageCount: number;
}

export async function downloadProductAssets(
  listicleId: number,
  imageUrls: string[],
  videoUrls: string[]
): Promise<DownloadedAssets> {
  const assetMap = new Map<string, string>();
  let downloaded = 0;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const ext = getImageExtension(url);
      const fileName = `img_${i}${ext}`;
      const r2Key = getR2Key(listicleId, `assets/${fileName}`);

      const response = await fetch(url);
      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || mimeType(ext);

      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2Key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const relativePath = `assets/${fileName}`;
      assetMap.set(url, relativePath);
      downloaded++;
    } catch (err) {
      logger.warn(
        { type: 'pipeline', step: 'download-assets', url, error: String(err) },
        'Failed to download image, skipping'
      );
    }
  }

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    try {
      const ext = getVideoExtension(url);
      const fileName = `video_${i}${ext}`;
      const r2Key = getR2Key(listicleId, `assets/${fileName}`);

      const response = await fetch(url);
      if (!response.ok) continue;

      const contentLength = response.headers.get('content-length');
      const minVideoSize = 102400;
      if (contentLength && parseInt(contentLength, 10) < minVideoSize) {
        logger.warn(
          { type: 'pipeline', step: 'download-assets', url, contentLength },
          'Video too small, likely not a real video, skipping'
        );
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < minVideoSize) {
        logger.warn(
          { type: 'pipeline', step: 'download-assets', url, byteLength: buffer.byteLength },
          'Video too small after download, skipping'
        );
        continue;
      }

      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2Key,
          Body: buffer,
          ContentType: 'video/mp4',
        })
      );

      const relativePath = `assets/${fileName}`;
      assetMap.set(url, relativePath);
      downloaded++;
    } catch (err) {
      logger.warn(
        { type: 'pipeline', step: 'download-assets', url, error: String(err) },
        'Failed to download video, skipping'
      );
    }
  }

  logger.info(
    {
      type: 'pipeline',
      step: 'download-assets',
      imageTotal: imageUrls.length,
      videoTotal: videoUrls.length,
      downloaded,
    },
    'Asset upload to R2 complete'
  );

  return { assetMap, imageCount: downloaded };
}

export async function readResearchData(researchFilePath: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(researchFilePath, 'utf-8');

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Research file is not valid JSON');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Research file must contain a JSON object');
  }

  logger.info(
    { type: 'pipeline', step: 'read-research', filePath: researchFilePath },
    'Research data loaded'
  );

  return data as Record<string, unknown>;
}

function getImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) return ext;
  } catch {
    // ignore
  }
  return '.jpg';
}

function getVideoExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (['.mp4', '.webm', '.mov'].includes(ext)) return ext;
  } catch {
    // ignore
  }
  return '.mp4';
}

function mimeType(ext: string): string {
  const mimes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  return mimes[ext] || 'application/octet-stream';
}
