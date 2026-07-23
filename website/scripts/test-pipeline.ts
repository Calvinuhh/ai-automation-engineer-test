import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import { join } from 'path';
import { scrapeProductPage } from '@/lib/pipeline/scrape-product';
import { scrapeReferencePage } from '@/lib/pipeline/scrape-reference';
import { downloadProductAssets, readResearchData } from '@/lib/pipeline/download-assets';

const PRODUCT_URL = process.argv[2] || 'https://getwidestep.com/products/widestep-elora-bogo';
const REFERENCE_URL = process.argv[3] || 'https://offers.hike-footwear.com/l/li06';

function findResearchFile(): string {
  const dir = join(process.cwd(), 'data', 'research');
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    if (files.length > 0) {
      return join(dir, files[0]);
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return '';
}

const RESEARCH_PATH = process.argv[4] || findResearchFile();

async function main() {
  console.log('=== Pipeline Test — Phases 1-3 ===\n');

  let researchFilePath = RESEARCH_PATH;
  if (!researchFilePath) {
    console.log('No research file path provided. Skipping phase 3 research read.\n');
  }

  let browser;
  try {
    console.log('Launching Chromium (headless=false)...');
    browser = await chromium.launch({ headless: false });
  } catch (err) {
    console.error('Visible browser error:', err);
    console.log('Falling back to headless mode...');
    browser = await chromium.launch();
  }
  console.log('Chromium launched.\n');
  try {
    console.log('[Phase 1] Scraping product page:', PRODUCT_URL);
    const productData = await scrapeProductPage(browser, PRODUCT_URL);
    console.log('  Title:', productData.title);
    console.log('  Description:', productData.description.slice(0, 120), '...');
    console.log('  Price:', productData.price);
    console.log('  Images:', productData.imageUrls.length);
    for (const url of productData.imageUrls) {
      console.log('    -', url.slice(0, 100));
    }
    console.log('  Videos:', productData.videoUrls.length);
    console.log();

    console.log('[Phase 2] Analyzing reference page:', REFERENCE_URL);
    const referenceData = await scrapeReferencePage(browser, REFERENCE_URL);
    console.log('  Headings:', referenceData.structure.headingCount);
    for (const h of referenceData.structure.headings) {
      console.log(`    ${h.tag}: ${h.text.slice(0, 80)}`);
    }
    console.log('  Has images:', referenceData.structure.hasImages);
    console.log('  Has videos:', referenceData.structure.hasVideos);
    console.log('  CTAs:', referenceData.structure.ctaTexts);
    console.log();

    console.log('[Phase 3] Downloading product assets...');
    const { assetMap, imagesDir, imageCount } = await downloadProductAssets(
      9999,
      productData.imageUrls
    );
    console.log('  Downloaded:', imageCount, '/', productData.imageUrls.length);
    console.log('  Saved to:', imagesDir);
    for (const [url, local] of assetMap) {
      console.log(`    ${url.slice(0, 60)} -> ${local}`);
    }

    if (researchFilePath) {
      console.log('\n[Phase 3b] Reading research JSON:', researchFilePath);
      const researchData = await readResearchData(researchFilePath);
      const keys = Object.keys(researchData);
      console.log('  Keys:', keys.join(', '));
      console.log('  Size:', JSON.stringify(researchData).length, 'chars');
    } else {
      console.log('\n[Phase 3b] Skipped — no research file path.');
    }

    console.log('\n=== All phases completed successfully ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
