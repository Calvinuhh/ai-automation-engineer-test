import { db } from '@/lib/db/client';
import { listicles, uploadedFiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import { chromium } from 'playwright';
import { scrapeProductPage } from './scrape-product';
import { scrapeReferencePage } from './scrape-reference';
import { downloadProductAssets, readResearchData } from './download-assets';
import { buildN8nPayload } from './build-payload';
import { callN8n } from './call-n8n';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

async function getResearchFilePath(sessionToken: string): Promise<string | null> {
  const row = await db
    .select({ filePath: uploadedFiles.filePath })
    .from(uploadedFiles)
    .where(eq(uploadedFiles.sessionToken, sessionToken))
    .limit(1)
    .then((rows) => rows[0]);

  return row?.filePath ?? null;
}

export async function processListicle(listicleId: number): Promise<void> {
  logger.info({ type: 'pipeline', listicleId }, 'Starting pipeline execution');

  try {
    const rows = await db.select().from(listicles).where(eq(listicles.id, listicleId)).limit(1);

    const listicle = rows[0];
    if (!listicle) {
      logger.error({ type: 'pipeline', listicleId }, 'Listicle not found');
      return;
    }

    const researchFilePath = await getResearchFilePath(listicle.sessionToken);
    if (!researchFilePath) {
      logger.error({ type: 'pipeline', listicleId }, 'Research file not found in uploaded_files');
      await db
        .update(listicles)
        .set({
          status: 'failed',
          errorMessage: 'Research file not found in uploaded_files',
          updatedAt: new Date(),
        })
        .where(eq(listicles.id, listicleId));
      return;
    }

    await db
      .update(listicles)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(listicles.id, listicleId));

    const isProduction = process.env.NODE_ENV === 'production';
    const browser = await chromium.launch({
      headless: isProduction,
    });
    try {
      const productData = await scrapeProductPage(browser, listicle.productUrl);
      const referenceData = await scrapeReferencePage(browser, listicle.referenceUrl);

      const { assetMap } = await downloadProductAssets(
        listicleId,
        productData.imageUrls,
        productData.videoUrls
      );
      const researchData = await readResearchData(researchFilePath);

      const callbackUrl = `${APP_URL}/api/listicles/callback`;

      const n8nPayload = buildN8nPayload(
        productData,
        referenceData,
        researchData,
        assetMap,
        listicle.productUrl,
        listicleId,
        callbackUrl
      );

      await callN8n(n8nPayload);

      await fs.unlink(researchFilePath).catch((err) => {
        logger.warn(
          { type: 'pipeline', step: 'cleanup', listicleId, error: String(err) },
          'Failed to delete research file'
        );
      });

      await db
        .delete(uploadedFiles)
        .where(eq(uploadedFiles.sessionToken, listicle.sessionToken))
        .catch((err) => {
          logger.warn(
            { type: 'pipeline', step: 'cleanup', listicleId, error: String(err) },
            'Failed to delete uploaded files record'
          );
        });

      logger.info(
        { type: 'pipeline', listicleId },
        'Pipeline dispatched to n8n, awaiting callback'
      );
    } finally {
      await browser.close();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({ type: 'pipeline', listicleId, error: errorMessage }, 'Pipeline failed');

    try {
      await db
        .update(listicles)
        .set({
          status: 'failed',
          errorMessage: errorMessage.slice(0, 2000),
          updatedAt: new Date(),
        })
        .where(eq(listicles.id, listicleId));
    } catch (dbError) {
      logger.error(
        { type: 'pipeline', listicleId, error: String(dbError) },
        'Failed to update listicle status after pipeline error'
      );
    }
  }
}
