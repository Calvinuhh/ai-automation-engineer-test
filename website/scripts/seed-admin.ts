import 'dotenv/config';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/hash';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '@/lib/auth/config';

async function seedAdmin() {
  console.log('Checking admin user...');

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME))
    .limit(1);

  if (existingUser.length > 0) {
    console.log('Admin user already exists. Skipping seed.');
    return;
  }

  console.log('Creating admin user...');
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  await db.insert(users).values({
    username: ADMIN_USERNAME,
    passwordHash,
  });

  console.log('Admin user created successfully.');
}

seedAdmin()
  .catch((err) => {
    console.error('Failed to seed admin user:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
