#!/usr/bin/env node
/**
 * One-shot migration: SQLite (data/database.db) → Supabase (DATABASE_URL).
 * Safe to re-run: uses ON CONFLICT DO NOTHING for every table.
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import BetterSqlite from 'better-sqlite3';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load .env.local ───────────────────────────────────────────────────────────
try {
  const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* rely on env */ }

const pgUrl = process.env.DATABASE_URL;
if (!pgUrl?.startsWith('postgres')) {
  console.error('❌  DATABASE_URL must be a postgres:// URL in .env.local');
  process.exit(1);
}

const dbFile = join(ROOT, 'data', 'database.db');
const sqlite = new BetterSqlite(dbFile, { readonly: true });
const pg = postgres(pgUrl, {
  ssl: { rejectUnauthorized: false },
  max: 3,
  transform: { undefined: null },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// SQLite JSONB columns are stored as TEXT; parse them
const JSONB_COLS = new Set([
  'metadata', 'attachments', 'raw', 'diff',
  'target_filter', 'lead_filter',
]);
// SQLite BOOLEAN columns are stored as INTEGER (0/1)
const BOOL_COLS = new Set(['enabled', 'imported']);

function coerce(col, val) {
  if (val === null || val === undefined) return null;
  if (JSONB_COLS.has(col)) {
    if (typeof val === 'string') try { return JSON.parse(val); } catch { return {}; }
    return val;
  }
  if (BOOL_COLS.has(col)) return val === 1 || val === true;
  return val;
}

async function migrateTable(table, conflictCol = 'id') {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) { console.log(`  – ${table}: empty, skip`); return; }

  const keys = Object.keys(rows[0]);
  const coerced = rows.map(row =>
    Object.fromEntries(keys.map(k => [k, coerce(k, row[k])]))
  );

  // Build INSERT ... ON CONFLICT DO NOTHING
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const query = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let inserted = 0;
  for (const row of coerced) {
    try {
      const vals = keys.map(k => row[k]);
      await pg.unsafe(query, vals);
      inserted++;
    } catch (e) {
      console.error(`  ✗  ${table} row ${row.id}: ${e.message}`);
    }
  }
  console.log(`  ✓  ${table}: ${inserted}/${rows.length} rows`);
}

// ── Run migration in dependency order ─────────────────────────────────────────
console.log('\n🚀  Migrating SQLite → Supabase…\n');

const TABLES = [
  'organizations',
  'leads',
  'clients',
  'projects',
  'tasks',
  'suppliers',
  'scan_results',
  'outreach_log',
  'audit_log',
  'social_connections',
  'social_messages',
  'message_templates',
  'campaigns',
  'campaign_sends',
  'scheduled_outreach',
  'automation_rules',
  'users',
  'org_invites',
];

for (const table of TABLES) {
  // Check table exists in SQLite
  const exists = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(table);
  if (!exists) { console.log(`  – ${table}: not in SQLite, skip`); continue; }
  await migrateTable(table);
}

await pg.end();
sqlite.close();

console.log('\n✅  Migration complete.\n');
