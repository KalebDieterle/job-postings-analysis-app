import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

// Load .env.local from project root on server
if (typeof window === "undefined") {
  config({ path: path.resolve(process.cwd(), ".env.local") });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not defined. Check your .env.local file."
  );
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export { db };