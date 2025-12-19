import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  user_id: uuid("user_id").primaryKey().default(sql`gen_random_uuid()`),
  clerk_id: varchar("clerk_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  clerk_id: varchar("clerk_id", { length: 255 })
    .notNull()
    .references(() => users.clerk_id),

  original_name: varchar("original_name", { length: 255 }).notNull(),
  file_type: varchar("file_type", { length: 50 }).notNull(),
  file_size: varchar("file_size", { length: 20 }).notNull(),

  s3_url: text("s3_url").notNull(),

  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
});

export const fileInformation = pgTable("file_information", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  file_id: uuid("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),

  full_content: text("full_content").notNull(), // ✅ ADD THIS - stores complete text

  chunks: jsonb("chunks").notNull(), // ✅ KEEP THIS - stores chunked text

  metadata: jsonb("metadata"),

  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const ragSessions = pgTable("rag_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  clerk_id: varchar("clerk_id", { length: 255 })
    .notNull()
    .references(() => users.clerk_id),

  file_id: uuid("file_id") // ✅ FIXED
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),

  fileInformation : uuid("file_Infomation")
                    .notNull()
                    .references(()=>fileInformation.id ,{ onDelete : "cascade" }),

  title: varchar("title", { length: 150 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});


