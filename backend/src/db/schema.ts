import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  user_id: uuid("user_id").primaryKey().default(sql`gen_random_uuid()`),
  clerk_id: varchar("clerk_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const ragSessions = pgTable("rag_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  clerk_id: varchar("clerk_id", { length: 255 })
    .notNull()
    .references(() => users.clerk_id), // ✅ CORRECT FK

  title: varchar("title", { length: 150 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});


