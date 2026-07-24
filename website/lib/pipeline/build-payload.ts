import type { ScrapedProduct } from './scrape-product';
import type { ScrapedReference } from './scrape-reference';

interface N8nPayload {
  listicleId: number;
  callbackUrl: string;
  product: {
    title: string;
    price: string;
  };
  reference: {
    headings: { tag: string; text: string }[];
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
  return {
    listicleId,
    callbackUrl,
    product: {
      title: product.title,
      price: product.price,
    },
    reference: {
      headings: reference.structure.headings,
    },
    research: researchData,
    instructions: {
      ctaUrl: productUrl,
    },
    assetMap: Object.fromEntries(assetMap),
  };
}
