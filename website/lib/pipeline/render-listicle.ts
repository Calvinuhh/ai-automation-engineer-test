import ejs from 'ejs';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import type { N8nOutput } from '@/lib/zod/schemas';

const BASE_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background: #fff; }
main { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; }
.subtitle { font-size: 1.1rem; color: #555; margin-bottom: 2rem; }
section { margin-bottom: 2.5rem; }
section h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.75rem; }
section p { font-size: 1rem; color: #333; margin-bottom: 1rem; }
section img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
section video { max-width: 100%; border-radius: 8px; }
.cta { text-align: center; margin: 3rem 0 2rem; }
.cta a { display: inline-block; padding: 1rem 2.5rem; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; }
.cta a:hover { background: #333; }
@media (max-width: 600px) { main { padding: 1.5rem 1rem; } h1 { font-size: 1.5rem; } }
`;

export async function renderAndSaveListicle(
  listicleId: number,
  n8nOutput: N8nOutput,
  assetMap: Map<string, string>
): Promise<string> {
  const resolvedOutput = resolveAssetPaths(n8nOutput, assetMap);

  const templatePath = path.join(process.cwd(), 'templates', 'listicle.ejs');
  const html = await ejs.renderFile(templatePath, {
    title: resolvedOutput.title,
    subtitle: resolvedOutput.subtitle,
    sections: resolvedOutput.sections,
    cta: resolvedOutput.cta,
    styles: BASE_STYLES,
    scripts: '',
  });

  const outputDir = path.join(process.cwd(), 'generated', 'listicles', String(listicleId));
  await fs.mkdir(outputDir, { recursive: true });
  const indexPath = path.join(outputDir, 'index.html');
  await fs.writeFile(indexPath, html);

  const relativePath = `generated/listicles/${listicleId}/`;

  logger.info(
    { type: 'pipeline', step: 'render-ejs', outputDir, relativePath },
    'Listicle rendered and saved'
  );

  return relativePath;
}

function resolveAssetPaths(output: N8nOutput, assetMap: Map<string, string>): N8nOutput {
  return {
    ...output,
    sections: output.sections.map((section) => ({
      ...section,
      imageUrl: section.imageUrl ? assetMap.get(section.imageUrl) || section.imageUrl : undefined,
      videoUrl: section.videoUrl ? assetMap.get(section.videoUrl) || section.videoUrl : undefined,
    })),
  };
}
