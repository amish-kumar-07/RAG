import "dotenv/config"; // ✅ REQUIRED to load .env
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!); // ✅ must be defined

export const db = drizzle(sql); // ✅ NOT an object
