// Applies any new database migrations from ./drizzle. Runs before the app starts on Render.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add your Neon connection string to the environment.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Database is up to date.");
} finally {
  await pool.end();
}
