import { pgTable, serial, text, timestamp, varchar, pgEnum } from 'drizzle-orm/pg-core';

export const listicleStatusEnum = pgEnum('listicle_status', ['pending', 'completed', 'failed']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const listicles = pgTable('listicles', {
  id: serial('id').primaryKey(),
  productUrl: varchar('product_url', { length: 2048 }).notNull(),
  referenceUrl: varchar('reference_url', { length: 2048 }).notNull(),
  researchFilePath: varchar('research_file_path', { length: 500 }).notNull(),
  status: listicleStatusEnum('status').notNull().default('pending'),
  outputPath: varchar('output_path', { length: 500 }),
  errorMessage: varchar('error_message', { length: 2000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Listicle = typeof listicles.$inferSelect;
export type NewListicle = typeof listicles.$inferInsert;
