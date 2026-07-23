import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listicles = pgTable("listicles", {
  id: serial("id").primaryKey(),
  productUrl: text("product_url").notNull(),
  status: text("status").notNull().default("pending"),
  productData: jsonb("product_data"),
  generatedContent: jsonb("generated_content"),
  outputPath: text("output_path"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Listicle = typeof listicles.$inferSelect;
export type NewListicle = typeof listicles.$inferInsert;
