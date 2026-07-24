import { SignJWT } from 'jose';
import { logger } from '@/lib/logger';

const N8N_BASE_URL = process.env.N8N_MAIN_URL;
const N8N_PROD_URL = `${N8N_BASE_URL}/webhook/read-pipeline-data`;
const JWT_SECRET = process.env.JWT_SECRET;

export async function callN8n(payload: unknown): Promise<void> {
  if (!N8N_BASE_URL) {
    throw new Error('N8N_MAIN_URL environment variable is not set');
  }
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  logger.info(
    { type: 'pipeline', step: 'call-n8n', payloadSize: JSON.stringify(payload).length },
    'Building JWT and sending payload to n8n'
  );

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('45m')
    .sign(new TextEncoder().encode(JWT_SECRET));

  const res = await fetch(N8N_PROD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`n8n returned ${res.status}: ${body}`);
  }

  logger.info({ type: 'pipeline', step: 'call-n8n' }, 'Payload dispatched to n8n successfully');
}
