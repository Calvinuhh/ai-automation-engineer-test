import { Browser, Page } from 'playwright';
import { logger } from '@/lib/logger';

export interface ScrapedProduct {
  title: string;
  description: string;
  price: string;
  imageUrls: string[];
  videoUrls: string[];
}

export async function scrapeProductPage(
  browser: Browser,
  productUrl: string
): Promise<ScrapedProduct> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    logger.info({ type: 'pipeline', step: 'scrape-product', productUrl }, 'Loading product page');

    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await extractTitle(page);
    const description = await extractDescription(page);
    const price = await extractPrice(page);
    const imageUrls = await extractImages(page);
    const videoUrls = await extractVideos(page);

    logger.info(
      {
        type: 'pipeline',
        step: 'scrape-product',
        title,
        imageCount: imageUrls.length,
        videoCount: videoUrls.length,
      },
      'Product page scraped successfully'
    );

    return { title, description, price, imageUrls, videoUrls };
  } finally {
    await context.close();
  }
}

async function extractTitle(page: Page): Promise<string> {
  try {
    return (
      (await page.$eval('meta[property="og:title"]', (el) => (el as HTMLMetaElement).content)) ||
      (await page.$eval('h1', (el) => el.textContent)) ||
      ''
    ).trim();
  } catch {
    return '';
  }
}

async function extractDescription(page: Page): Promise<string> {
  try {
    return (
      (await page.$eval('meta[name="description"]', (el) => (el as HTMLMetaElement).content)) || ''
    ).trim();
  } catch {
    return '';
  }
}

async function extractPrice(page: Page): Promise<string> {
  const selectors = ['[data-price]', '[itemprop="price"]', '.price', '.product-price'];
  for (const sel of selectors) {
    try {
      const text = await page.$eval(sel, (el) => el.textContent);
      if (text) return text.trim();
    } catch {
      // continue
    }
  }
  return '';
}

async function extractImages(page: Page): Promise<string[]> {
  const images = await page.$$eval('img', (els) =>
    els
      .map((el) => (el as HTMLImageElement).src)
      .filter((src) => src && !src.startsWith('data:') && !src.includes('icon'))
  );

  return [...new Set(images)].slice(0, 10);
}

async function extractVideos(page: Page): Promise<string[]> {
  const videoSrcs = await page.$$eval('video source, video[src]', (els) =>
    els.map((el) => (el as HTMLSourceElement | HTMLVideoElement).src || '').filter(Boolean)
  );

  return [...new Set(videoSrcs)].slice(0, 3);
}
