import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export function getRedisClient() {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 2000,
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err);
  });

  return redisClient;
}

export async function enqueueJob(listicleId: number) {
  const client = getRedisClient();
  await client.lPush('listicle:queue', String(listicleId));
}

export async function dequeueJob(timeout = 5): Promise<number | null> {
  const client = getRedisClient();
  const result = await client.brPop('listicle:queue', timeout);
  if (!result || !result.element) return null;
  return parseInt(result.element, 10);
}
