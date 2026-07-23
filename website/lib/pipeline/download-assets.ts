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
  imageUrls: string[]
): Promise<DownloadedAssets> {
  const imagesDir = path.join(
    process.cwd(),
    'generated',
    'listicles',
    String(listicleId),
    'assets'
  );

  await fs.mkdir(imagesDir, { recursive: true });

  const assetMap = new Map<string, string>();
  let downloaded = 0;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const ext = getExtension(url);
      const fileName = `${i}${ext}`;
      const destPath = path.join(imagesDir, fileName);

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

  logger.info(
    {
      type: 'pipeline',
      step: 'download-assets',
      total: imageUrls.length,
      downloaded,
      imagesDir,
    },
    'Asset download complete'
  );

  return { assetMap, imagesDir, imageCount: downloaded };
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

function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return ext;
  } catch {
    // ignore
  }
  return '.jpg';
}
