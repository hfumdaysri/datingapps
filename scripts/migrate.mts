import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("SUPABASE_DB_URL is required");

const dir = path.join(process.cwd(), "supabase", "migrations");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(
  "create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())",
);
await client.query("alter table public._migrations enable row level security");
const done = new Set((await client.query("select name from public._migrations")).rows.map((r) => r.name));
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  console.log("applying", f);
  await client.query("begin");
  try {
    await client.query(readFileSync(path.join(dir, f), "utf8"));
    await client.query("insert into public._migrations(name) values ($1)", [f]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}
await client.end();
console.log("migrations up to date");
