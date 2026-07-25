import { Browser, Page } from 'playwright';
import { logger } from '@/lib/logger';

export interface ReferenceStyles {
  body: {
    fontFamily: string;
    fontSize: string;
    color: string;
    backgroundColor: string;
  };
  h1: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
  };
  h2: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
  };
  p: {
    fontFamily: string;
    fontSize: string;
    color: string;
  };
  cta: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
    backgroundColor: string;
    borderRadius: string;
    padding: string;
    border: string;
  };
  container: {
    maxWidth: string;
    padding: string;
  };
  sectionBackgrounds: string[];
}

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
  styles: ReferenceStyles;
}

export async function scrapeReferencePage(
  browser: Browser,
  referenceUrl: string
): Promise<ScrapedReference> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  try {
    logger.info(
      { type: 'pipeline', step: 'scrape-reference', referenceUrl },
      'Loading reference page'
    );

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      (window as any).chrome = { runtime: {} };
      const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    await page.goto(referenceUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

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
    const styles = await extractStyles(page);

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
      styles,
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

async function extractStyles(page: Page): Promise<ReferenceStyles> {
  try {
    return await page.evaluate(() => {
      const cs = (el: Element | null) => (el ? window.getComputedStyle(el) : null);

      const body = document.querySelector('body');
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const p = document.querySelector('p');
      const cta = document.querySelector(
        'a.button, .button, a[class*="btn"], [class*="cta-button"]'
      );

      const bodyStyle = cs(body);
      const h1Style = cs(h1);
      const h2Style = cs(h2);
      const pStyle = cs(p);
      const ctaStyle = cs(cta);

      const ff = (s: CSSStyleDeclaration | null) =>
        (s?.fontFamily || '').split(',')[0].replace(/['"]/g, '');

      const containers = document.querySelectorAll('section, [class*="section"]');
      const backgrounds = new Set<string>();
      containers.forEach((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') backgrounds.add(bg);
      });

      return {
        body: {
          fontFamily: ff(bodyStyle),
          fontSize: bodyStyle?.fontSize || '16px',
          color: bodyStyle?.color || '#333',
          backgroundColor: bodyStyle?.backgroundColor || '#ffffff',
        },
        h1: {
          fontFamily: ff(h1Style) || 'sans-serif',
          fontSize: h1Style?.fontSize || '2rem',
          fontWeight: h1Style?.fontWeight || '700',
          color: h1Style?.color || '#222',
        },
        h2: {
          fontFamily: ff(h2Style) || 'sans-serif',
          fontSize: h2Style?.fontSize || '1.5rem',
          fontWeight: h2Style?.fontWeight || '700',
          color: h2Style?.color || '#333',
        },
        p: {
          fontFamily: ff(pStyle) || 'sans-serif',
          fontSize: pStyle?.fontSize || '1rem',
          color: pStyle?.color || '#444',
        },
        cta: {
          fontFamily: ff(ctaStyle) || 'sans-serif',
          fontSize: ctaStyle?.fontSize || '1.2rem',
          fontWeight: ctaStyle?.fontWeight || '700',
          color: ctaStyle?.color || '#ffffff',
          backgroundColor: ctaStyle?.backgroundColor || '#4caf50',
          borderRadius: ctaStyle?.borderRadius || '8px',
          padding: ctaStyle?.padding || '12px 32px',
          border: ctaStyle?.border || 'none',
        },
        container: {
          maxWidth: '928px',
          padding: '0 20px',
        },
        sectionBackgrounds: [...backgrounds].slice(0, 4),
      };
    });
  } catch {
    return {
      body: { fontFamily: 'sans-serif', fontSize: '16px', color: '#333', backgroundColor: '#fff' },
      h1: { fontFamily: 'sans-serif', fontSize: '2rem', fontWeight: '700', color: '#222' },
      h2: { fontFamily: 'sans-serif', fontSize: '1.5rem', fontWeight: '700', color: '#333' },
      p: { fontFamily: 'sans-serif', fontSize: '1rem', color: '#444' },
      cta: {
        fontFamily: 'sans-serif',
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#fff',
        backgroundColor: '#4caf50',
        borderRadius: '8px',
        padding: '12px 32px',
        border: 'none',
      },
      container: { maxWidth: '928px', padding: '0 20px' },
      sectionBackgrounds: ['#ffffff'],
    };
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
