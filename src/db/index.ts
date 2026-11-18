import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: PostgresJsDatabase<typeof schema> | undefined;
};

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.db) return globalForDb.db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const conn =
    globalForDb.conn ??
    postgres(databaseUrl, {
      prepare: false,
      max: 5,
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.conn = conn;
  }

  const db = drizzle(conn, { schema });
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
  }
  return db;
}

export * from './schema';
