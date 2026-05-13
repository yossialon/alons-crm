/**
 * Run the CRM schema against the local SQLite database.
 *
 * Usage:
 *   node scripts/migrate.mjs
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dir = dirname(fileURLToPath(import.meta.url));

const schemaPath = resolve(__dir, 'schema-sqlite.sql');
let schema;
try {
  schema = readFileSync(schemaPath, 'utf8');
} catch {
  console.error('❌  scripts/schema-sqlite.sql not found.');
  process.exit(1);
}

const dbBaseDir = resolve(process.cwd(), 'data');
if (!existsSync(dbBaseDir)) mkdirSync(dbBaseDir, { recursive: true });
const dbPath = resolve(dbBaseDir, 'database.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Split on statement boundaries and execute individually so ALTER TABLE ADD COLUMN
// statements are idempotent (duplicate column errors are silently ignored).
const statements = schema
  .replace(/--[^\n]*/g, '')      // strip line comments
  .split(/;\s*\n/)               // split on semicolons
  .map((s) => s.trim())
  .filter(Boolean);

let applied = 0;
let skipped = 0;
try {
  for (const stmt of statements) {
    try {
      db.exec(stmt + ';');
      applied++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate column name') || msg.includes('already exists')) {
        skipped++;
      } else {
        throw err;
      }
    }
  }
  console.log(`✅  SQLite schema applied: ${applied} statements, ${skipped} already-exist skips → ${dbPath}`);
} catch (err) {
  console.error('❌  Migration failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  db.close();
}
