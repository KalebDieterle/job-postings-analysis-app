import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), ".env.local") });

// Debug: Check if env var is loaded
console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not defined. Check your .env.local file."
  );
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export { db };