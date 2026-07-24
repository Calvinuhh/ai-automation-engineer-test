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
    const texts = await page.$$eval('a, button, [role="button"], .button, .btn', (els) =>
      (els as HTMLElement[])
        .filter((el) => {
          if (el.offsetParent === null) return false;
          if (el.querySelector('style, script')) return false;
          const text = el.innerText?.toLowerCase() || '';
          const cls = (el.className?.toString() || '').toLowerCase();
          const id = el.id?.toLowerCase() || '';
          const href = (el as HTMLAnchorElement).href?.toLowerCase() || '';
          const style = (el.getAttribute('style') || '').toLowerCase();
          return (
            text.includes('buy') ||
            text.includes('shop') ||
            text.includes('get') ||
            text.includes('order') ||
            text.includes('claim') ||
            text.includes('check out') ||
            text.includes('try') ||
            text.includes('claim') ||
            text.includes('deal') ||
            text.includes('offer') ||
            text.includes('save') ||
            text.includes('comprar') ||
            text.includes('obtener') ||
            text.includes('pedir') ||
            text.includes('oferta') ||
            text.includes('descuento') ||
            cls.includes('cta') ||
            cls.includes('btn') ||
            cls.includes('button') ||
            href.includes('/order') ||
            href.includes('/checkout') ||
            href.includes('/cart') ||
            href.includes('/buy') ||
            id.includes('cta') ||
            id.includes('btn') ||
            style.includes('cursor: pointer')
          );
        })
        .map((el) => el.innerText?.trim() || '')
        .filter((t) => t && t.length < 200)
    );
    return [...new Set(texts)].slice(0, 5);
  } catch {
    return [];
  }
}
