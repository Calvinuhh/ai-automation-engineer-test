import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/hash';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '@/lib/auth/config';

export async function register() {
  console.log('[Instrumentation] Checking admin user...');

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME))
    .limit(1);

  if (existingUser.length > 0) {
    console.log('[Instrumentation] Admin user already exists. Skipping seed.');
    return;
  }

  console.log('[Instrumentation] Creating admin user...');
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  await db.insert(users).values({
    username: ADMIN_USERNAME,
    passwordHash,
  });

  console.log('[Instrumentation] Admin user created successfully.');
}
