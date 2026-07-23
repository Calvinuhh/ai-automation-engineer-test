import { dequeueJob } from '@/lib/redis/client';
import { db } from '@/lib/db/client';
import { listicles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

console.log('Worker started. Waiting for jobs...');

async function processJob(listicleId: number) {
  console.log(`Processing listicle ${listicleId}...`);

  // TODO: Implement full pipeline
  // 1. Scrape product page with Playwright
  // 2. Send data to n8n webhook
  // 3. Validate response with Zod
  // 4. Render EJS template
  // 5. Save to generated/listicles/[id]/
  // 6. Update status to completed/failed

  await db
    .update(listicles)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(listicles.id, listicleId));

  console.log(`Listicle ${listicleId} completed.`);
}

async function worker() {
  while (true) {
    try {
      const listicleId = await dequeueJob(5);
      if (listicleId) {
        await processJob(listicleId);
      }
    } catch (error) {
      console.error('Worker error:', error);
    }
  }
}

worker().catch((err) => {
  console.error('Worker crashed:', err);
  process.exit(1);
});
