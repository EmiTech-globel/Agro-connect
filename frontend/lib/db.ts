import { Pool, PoolConfig } from 'pg';

declare global {
  // allow global reuse of the pool during hot-reloads in development
  var __pgPool: Pool | undefined;
}

const connectionOptions = {
  connectionString: process.env.DATABASE_URL,
  // some hosting providers require SSL; keep false in dev
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const pool: Pool = global.__pgPool ?? new Pool(connectionOptions as PoolConfig);

if (process.env.NODE_ENV !== 'production') global.__pgPool = pool;

export async function query(text: string, params?: (string | number | boolean | null)[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}