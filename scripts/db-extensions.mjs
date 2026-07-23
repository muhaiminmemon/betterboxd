// Enables required Postgres extensions before drizzle-kit push.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
await sql.end();
console.log("pg_trgm ready");
