import type { ScrapedProduct } from './scrape-product';
import type { ScrapedReference, ReferenceStyles } from './scrape-reference';

interface N8nPayload {
  listicleId: number;
  callbackUrl: string;
  product: {
    title: string;
    price: string;
  };
  reference: {
    headings: { tag: string; text: string }[];
    styles: ReferenceStyles;
  };
  research: Record<string, unknown>;
  instructions: {
    ctaUrl: string;
  };
  assetMap: Record<string, string>;
}

export function buildN8nPayload(
  product: ScrapedProduct,
  reference: ScrapedReference,
  researchData: Record<string, unknown>,
  assetMap: Map<string, string>,
  productUrl: string,
  listicleId: number,
  callbackUrl: string
): N8nPayload {
  const solidHeadings = reference.structure.headings.filter(
    (h) => h.text && h.text.trim().length > 0
  );
  const cleanTitle = product.title.replace(/�/g, '').trim() || 'WideStep Elora Comfort Flat';

  return {
    listicleId,
    callbackUrl,
    product: {
      title: cleanTitle,
      price: product.price || '$89.00',
    },
    reference: {
      headings: solidHeadings,
      styles: reference.styles,
    },
    research: researchData,
    instructions: {
      ctaUrl: productUrl,
    },
    assetMap: Object.fromEntries(assetMap),
  };
}
