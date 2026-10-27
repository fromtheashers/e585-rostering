import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

declare global {
  // Reuse one pool across hot reloads in development.
  var __e585Pool: pg.Pool | undefined;
}

// workerd reports this user agent; Node (Render, next dev) reports "Node.js/<version>".
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/* ---------- Node: one long-lived pool ---------- */

function nodePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string to the environment.");
  }
  globalThis.__e585Pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    // Opening a fresh TLS connection to Neon costs several round trips, so keep idle ones
    // around for five minutes (pg's default drops them after ten seconds).
    idleTimeoutMillis: 5 * 60_000,
    keepAlive: true,
  });
  return globalThis.__e585Pool;
}

let nodeDb: Db | undefined;

/* ---------- Workers: a pool per request ---------- */

// A Worker can't reuse a socket from another request, so each request gets its own pool,
// keyed on that request's ExecutionContext. Hyperdrive keeps the real connections to Neon warm,
// so opening one per query is cheap.
const workerDbs = new WeakMap<object, Db>();

function workerDb(): Db {
  const { env, ctx } = getCloudflareContext();
  let instance = workerDbs.get(ctx);
  if (!instance) {
    const pool = new pg.Pool({ connectionString: env.HYPERDRIVE.connectionString, maxUses: 1 });
    // Without a listener, a connection dropping after its query throws and fails the whole request.
    pool.on("error", (e) => console.error(`database connection error: ${e.message}`));
    instance = drizzle(pool, { schema });
    workerDbs.set(ctx, instance);
  }
  return instance;
}

export function db(): Db {
  if (onWorkers) return workerDb();
  nodeDb ??= drizzle(nodePool(), { schema });
  return nodeDb;
}

export { schema };
