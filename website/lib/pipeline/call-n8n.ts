import { n8nOutputSchema, type N8nOutput } from '@/lib/zod/schemas';
import { logger } from '@/lib/logger';

const N8N_WEBHOOK_URL = process.env.N8N_MAIN_URL ?? '';

export async function callN8n(payload: unknown): Promise<N8nOutput> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_MAIN_URL environment variable is not set');
  }

  logger.info({ type: 'pipeline', step: 'call-n8n' }, 'Sending payload to n8n');

  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`n8n returned ${res.status}: ${body}`);
  }

  const raw = await res.json();

  const validation = n8nOutputSchema.safeParse(raw);
  if (!validation.success) {
    logger.error(
      {
        type: 'pipeline',
        step: 'call-n8n',
        issues: validation.error.issues,
        rawResponse: typeof raw === 'string' ? raw.slice(0, 500) : 'non-string',
      },
      'n8n response failed Zod validation'
    );

    const fallback = generateFallbackOutput(raw);
    if (fallback) {
      logger.warn({ type: 'pipeline', step: 'call-n8n' }, 'Using fallback output');
      return fallback;
    }

    throw new Error('n8n response validation failed and no fallback available');
  }

  logger.info(
    {
      type: 'pipeline',
      step: 'call-n8n',
      title: validation.data.title,
      sections: validation.data.sections.length,
    },
    'n8n response validated'
  );

  return validation.data;
}

function generateFallbackOutput(raw: unknown): N8nOutput | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.title && typeof obj.title === 'string') {
      return {
        title: obj.title,
        subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : undefined,
        sections: Array.isArray(obj.sections)
          ? (obj.sections as Array<Record<string, unknown>>).map((s) => ({
              heading: typeof s.heading === 'string' ? s.heading : '',
              content: typeof s.content === 'string' ? s.content : '',
              imageUrl: typeof s.imageUrl === 'string' ? s.imageUrl : undefined,
              videoUrl: typeof s.videoUrl === 'string' ? s.videoUrl : undefined,
            }))
          : [{ heading: 'Overview', content: '' }],
        cta:
          obj.cta && typeof obj.cta === 'object'
            ? (() => {
                const c = obj.cta as Record<string, unknown>;
                return {
                  text: typeof c.text === 'string' ? c.text : 'Get Yours Now',
                  url: typeof c.url === 'string' ? c.url : '',
                };
              })()
            : { text: 'Get Yours Now', url: '' },
      };
    }
  }
  return null;
}
