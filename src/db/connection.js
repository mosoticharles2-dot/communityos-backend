import pkg from 'postgres';
const sql = pkg;

let db = null;

export async function initializeDatabase() {
  if (db) return db;

  db = sql({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'communityos',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.end();
    db = null;
  }
}
