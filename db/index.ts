import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

// Load .env.local from project root on server
if (typeof window === "undefined") {
  config({ path: path.resolve(process.cwd(), ".env.local") });
}

// Validate URL only when accessing the DB, not on import
// This prevents build-time crashes if the env var is missing during build

let _db: ReturnType<typeof drizzle> | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (_target, prop) => {
    // Lazy initialization
    if (!_db) {
       if (!process.env.DATABASE_URL) {
          throw new Error("DATABASE_URL is not defined. Check your .env.local file or Vercel Environment Variables.");
       }
       const sql = neon(process.env.DATABASE_URL);
       _db = drizzle(sql);
    }
    return (_db as any)[prop];
  },
});
