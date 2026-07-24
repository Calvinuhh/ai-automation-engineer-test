import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

export interface DownloadedAssets {
  assetMap: Map<string, string>;
  imagesDir: string;
  imageCount: number;
}

export async function downloadProductAssets(
  listicleId: number,
  imageUrls: string[],
  videoUrls: string[]
): Promise<DownloadedAssets> {
  const assetsDir = path.join(
    process.cwd(),
    'generated',
    'listicles',
    String(listicleId),
    'assets'
  );

  await fs.mkdir(assetsDir, { recursive: true });

  const assetMap = new Map<string, string>();
  let downloaded = 0;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const ext = getImageExtension(url);
      const fileName = `img_${i}${ext}`;
      const destPath = path.join(assetsDir, fileName);

      const response = await fetch(url);
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      await fs.writeFile(destPath, Buffer.from(buffer));

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
      const destPath = path.join(assetsDir, fileName);

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

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < minVideoSize) {
        logger.warn(
          { type: 'pipeline', step: 'download-assets', url, byteLength: buffer.byteLength },
          'Video too small after download, skipping'
        );
        continue;
      }

      await fs.writeFile(destPath, Buffer.from(buffer));

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
      assetsDir,
    },
    'Asset download complete'
  );

  return { assetMap, imagesDir: assetsDir, imageCount: downloaded };
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
