import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { chromium } from 'playwright';
import { scrapeProductPage } from './scrape-product';
import { scrapeReferencePage } from './scrape-reference';
import { downloadProductAssets, readResearchData } from './download-assets';
import { buildN8nPayload } from './build-payload';
import { callN8n } from './call-n8n';
import { renderAndSaveListicle } from './render-listicle';

export async function processListicle(listicleId: number): Promise<void> {
  logger.info({ type: 'pipeline', listicleId }, 'Starting pipeline execution');

  try {
    const rows = await db.select().from(listicles).where(eq(listicles.id, listicleId)).limit(1);

    const listicle = rows[0];
    if (!listicle) {
      logger.error({ type: 'pipeline', listicleId }, 'Listicle not found');
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

      const { assetMap } = await downloadProductAssets(listicleId, productData.imageUrls);
      const researchData = await readResearchData(listicle.researchFilePath);

      const n8nPayload = buildN8nPayload(
        productData,
        referenceData,
        researchData,
        assetMap,
        listicle.productUrl
      );

      const n8nOutput = await callN8n(n8nPayload);
      const outputPath = await renderAndSaveListicle(listicleId, n8nOutput, assetMap);

      await db
        .update(listicles)
        .set({
          status: 'completed',
          outputPath,
          updatedAt: new Date(),
        })
        .where(eq(listicles.id, listicleId));

      logger.info({ type: 'pipeline', listicleId, outputPath }, 'Pipeline completed successfully');
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
