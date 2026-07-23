import { Browser, Page } from 'playwright';
import { logger } from '@/lib/logger';

export interface ScrapedReference {
  structure: {
    headingCount: number;
    headings: { tag: string; text: string }[];
    sectionCount: number;
    hasImages: boolean;
    hasVideos: boolean;
    hasCta: boolean;
    ctaTexts: string[];
  };
}

export async function scrapeReferencePage(
  browser: Browser,
  referenceUrl: string
): Promise<ScrapedReference> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    logger.info(
      { type: 'pipeline', step: 'scrape-reference', referenceUrl },
      'Loading reference page'
    );

    await page.goto(referenceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || '',
      }))
    );

    const hasImages = await page.$eval('img', () => true).catch(() => false);

    const hasVideos = await page
      .$eval('video, iframe[src*="youtube"], iframe[src*="vimeo"]', () => true)
      .catch(() => false);

    const ctaTexts = await extractCtaTexts(page);

    const structure: ScrapedReference = {
      structure: {
        headingCount: headings.length,
        headings,
        sectionCount: headings.filter((h) => h.tag === 'h2').length || headings.length,
        hasImages,
        hasVideos,
        hasCta: ctaTexts.length > 0,
        ctaTexts,
      },
    };

    logger.info(
      {
        type: 'pipeline',
        step: 'scrape-reference',
        headingCount: headings.length,
        hasImages,
        hasCta: ctaTexts.length > 0,
      },
      'Reference page analyzed'
    );

    return structure;
  } finally {
    await context.close();
  }
}

async function extractCtaTexts(page: Page): Promise<string[]> {
  try {
    const texts = await page.$$eval('a, button', (els) =>
      els
        .filter((el) => {
          const html = el as HTMLElement;
          const text = html.textContent?.toLowerCase() || '';
          const cls = html.className?.toLowerCase() || '';
          const id = html.id?.toLowerCase() || '';
          return (
            text.includes('buy') ||
            text.includes('shop') ||
            text.includes('get') ||
            text.includes('order') ||
            text.includes('claim') ||
            cls.includes('cta') ||
            cls.includes('btn') ||
            id.includes('cta') ||
            id.includes('btn')
          );
        })
        .map((el) => (el as HTMLElement).textContent?.trim() || '')
        .filter(Boolean)
    );
    return [...new Set(texts)].slice(0, 5);
  } catch {
    return [];
  }
}
