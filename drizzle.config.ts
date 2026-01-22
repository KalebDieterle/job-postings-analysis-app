import { config } from 'dotenv'; // Change this import
import { defineConfig } from "drizzle-kit";

// Explicitly load .env.local
config({ path: '.env.local' }); 

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env.local");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});