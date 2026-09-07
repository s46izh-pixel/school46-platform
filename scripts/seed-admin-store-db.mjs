import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  })
);

const databaseUrl = process.env.DATABASE_URL;
const sourceUrl = args.get("source") || process.env.ADMIN_STORE_SOURCE_URL || "https://sosh46.ru/api/admin-store";
const filePath = args.get("file");
const force = args.get("force") === "true";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 1,
  ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
});

try {
  const store = filePath ? await readStoreFromFile(filePath) : await readStoreFromUrl(sourceUrl);
  await ensureAdminStoreTable();

  const existing = await pool.query("select data from admin_store where id = $1", ["default"]);
  if (existing.rowCount && !force) {
    console.log("admin_store.default already exists. Add --force=true to overwrite it.");
    process.exit(0);
  }

  await pool.query(
    `
      insert into admin_store (id, data, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (id) do update
      set data = excluded.data,
          updated_at = now()
    `,
    ["default", JSON.stringify(store)]
  );

  console.log(`Seeded admin_store.default from ${filePath || sourceUrl}.`);
} finally {
  await pool.end();
}

async function ensureAdminStoreTable() {
  await pool.query(`
    create table if not exists admin_store (
      id text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `);
}

async function readStoreFromUrl(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to read ${url}: ${response.status}`);
  return response.json();
}

async function readStoreFromFile(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function shouldUseSsl(connectionString) {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return true;
  return connectionString.includes("sslmode=require");
}
