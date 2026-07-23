import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

// Lazy so `next build` succeeds without a database; reused across dev reloads.
const globalForDb = globalThis as unknown as { bbDb?: Db };

function getDb(): Db {
  if (globalForDb.bbDb) return globalForDb.bbDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at a Postgres database.",
    );
  }
  const client = postgres(url, { max: 10, prepare: false });
  globalForDb.bbDb = drizzle(client, { schema });
  return globalForDb.bbDb;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
