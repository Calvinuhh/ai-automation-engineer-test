import type { ScrapedProduct } from './scrape-product';
import type { ScrapedReference } from './scrape-reference';

interface N8nPayload {
  product: {
    title: string;
    description: string;
    price: string;
    imageUrls: string[];
    videoUrls: string[];
  };
  reference: {
    headingCount: number;
    headings: { tag: string; text: string }[];
    sectionCount: number;
    hasImages: boolean;
    hasVideos: boolean;
    hasCta: boolean;
    ctaTexts: string[];
  };
  research: Record<string, unknown>;
  instructions: {
    task: string;
    targetAudience: string;
    tone: string;
    sections: number;
    includeCta: boolean;
    ctaText: string;
    ctaUrl: string;
  };
  assetMap: Record<string, string>;
}

export function buildN8nPayload(
  product: ScrapedProduct,
  reference: ScrapedReference,
  researchData: Record<string, unknown>,
  assetMap: Map<string, string>,
  productUrl: string
): N8nPayload {
  const ctaTexts = reference.structure.ctaTexts;
  const defaultCta = ctaTexts.length > 0 ? ctaTexts[0] : 'Get Yours Now';

  return {
    product: {
      title: product.title,
      description: product.description,
      price: product.price,
      imageUrls: product.imageUrls,
      videoUrls: product.videoUrls,
    },
    reference: {
      headingCount: reference.structure.headingCount,
      headings: reference.structure.headings,
      sectionCount: reference.structure.sectionCount,
      hasImages: reference.structure.hasImages,
      hasVideos: reference.structure.hasVideos,
      hasCta: reference.structure.hasCta,
      ctaTexts: reference.structure.ctaTexts,
    },
    research: researchData,
    instructions: {
      task: 'Generate a listicle-style pre-landing page in JSON format. The page should mimic the reference structure but use the provided product data and research. Replace placeholder images with local asset paths from the asset map.',
      targetAudience: 'Women looking for comfortable, stylish footwear for all-day wear',
      tone: 'Conversational, benefit-driven, problem-focused',
      sections: reference.structure.sectionCount || 6,
      includeCta: true,
      ctaText: defaultCta,
      ctaUrl: productUrl,
    },
    assetMap: Object.fromEntries(assetMap),
  };
}
