import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

declare global {
  // Reuse one pool across hot reloads in development.
  var __e585Pool: pg.Pool | undefined;
}

function pool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string to the environment.");
  }
  globalThis.__e585Pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return globalThis.__e585Pool;
}

let instance: NodePgDatabase<typeof schema> | undefined;

export function db() {
  instance ??= drizzle(pool(), { schema });
  return instance;
}

export { schema };
