import { initializeDatabase, getDatabase, closeDatabase } from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  try {
    console.log('🔄 Initializing database connection...');
    await initializeDatabase();
    const db = getDatabase();

    console.log('📝 Reading schema file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('⚙️  Executing schema migration...');
    await db.query(schema);

    console.log('✅ Database migration completed successfully!');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
