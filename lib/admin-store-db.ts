import { Pool } from "pg";
import type { AdminStore } from "./admin-store";

const adminStoreId = "default";
const connectionTimeoutMillis = 5000;

let pool: Pool | undefined;
let initPromise: Promise<void> | undefined;

export function hasDatabaseAdminStore() {
  return Boolean(process.env.DATABASE_URL);
}

export async function readAdminStoreFromDatabase() {
  if (!hasDatabaseAdminStore()) return null;
  await ensureAdminStoreTable();
  const result = await getPool().query<{ data: Partial<AdminStore> }>(
    "select data from admin_store where id = $1",
    [adminStoreId]
  );
  return result.rows[0]?.data ?? null;
}

export async function writeAdminStoreToDatabase(store: AdminStore) {
  if (!hasDatabaseAdminStore()) return store;
  await ensureAdminStoreTable();
  await getPool().query(
    `
      insert into admin_store (id, data, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (id) do update
      set data = excluded.data,
          updated_at = now()
    `,
    [adminStoreId, JSON.stringify(store)]
  );
  return store;
}

async function ensureAdminStoreTable() {
  initPromise ??= getPool().query(`
    create table if not exists admin_store (
      id text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `).then(() => undefined);
  return initPromise;
}

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  pool = new Pool({
    connectionString,
    connectionTimeoutMillis,
    idleTimeoutMillis: 30000,
    max: 5,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined
  });
  return pool;
}

function shouldUseSsl(connectionString: string) {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return true;
  return connectionString.includes("sslmode=require");
}
