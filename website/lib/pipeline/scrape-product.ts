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
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  try {
    logger.info({ type: 'pipeline', step: 'scrape-product', productUrl }, 'Loading product page');

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      (window as any).chrome = { runtime: {} };
      const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

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
  const selectors = [
    'meta[property="og:price:amount"]',
    'meta[property="product:price:amount"]',
    'meta[itemprop="price"]',
    '.product-price-box',
    '[data-price]',
    '[data-product-price]',
    '.product-sale-price',
    'span.money',
    '.price__current',
    '.price',
    '.product-price',
    'span.price-item',
  ];
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const text = (await el.getAttribute('content')) || (await el.textContent());
      if (text) return text.trim();
    } catch {
      // continue
    }
  }
  return '';
}

async function extractImages(page: Page): Promise<string[]> {
  const rawUrls: string[] = await page.$$eval('img', (els) =>
    (els as HTMLImageElement[])
      .map((el) => el.src)
      .filter((src) => src && !src.startsWith('data:') && !src.includes('icon'))
  );

  return [
    ...new Set(rawUrls.filter((src) => !isThirdPartyImageUrl(src)).map(normalizeImageUrl)),
  ].slice(0, 10);
}

function normalizeImageUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.delete('width');
  u.searchParams.delete('height');
  u.searchParams.delete('crop');
  return u.toString();
}

function isThirdPartyImageUrl(src: string): boolean {
  const thirdPartyDomains = [
    'flagcdn.com',
    'googleapis.com',
    'google.com',
    'doubleclick.net',
    'facebook.com',
    'fbcdn.net',
  ];
  try {
    const host = new URL(src).hostname;
    return thirdPartyDomains.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

async function extractVideos(page: Page): Promise<string[]> {
  const videoSrcs = await page.$$eval('video source, video[src]', (els) =>
    els
      .map((el) => {
        const element = el as HTMLSourceElement | HTMLVideoElement;
        const type = (element as HTMLSourceElement).type || '';
        const src = element.src || '';
        const isM3u8 = src.includes('.m3u8') || type === 'application/x-mpegURL';
        const isReal =
          (src.includes('.mp4') ||
            src.includes('.webm') ||
            src.includes('.mov') ||
            type.startsWith('video/')) &&
          !isM3u8;
        return { src, type, isReal };
      })
      .filter((v) => v.src && v.isReal && !v.src.startsWith('blob:') && !v.src.startsWith('data:'))
      .map((v) => v.src)
  );

  return [...new Set(videoSrcs)].slice(0, 3);
}
