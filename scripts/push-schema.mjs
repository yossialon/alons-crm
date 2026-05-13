#!/usr/bin/env node
/**
 * Push schema.sql to Supabase (or any PostgreSQL database).
 *
 * Usage:
 *   npm run db:push
 *   # or set DATABASE_URL before running:
 *   DATABASE_URL="postgresql://..." node scripts/push-schema.mjs
 *
 * The script splits on statement boundaries and executes each one
 * individually, skipping "already exists" errors so it's safe to re-run.
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
try {
  const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // Rely on environment variables already set
}

const url = process.env.DATABASE_URL;
if (!url || (!url.startsWith('postgres://') && !url.startsWith('postgresql://'))) {
  console.error('❌  Set DATABASE_URL to a postgres:// or postgresql:// connection string in .env.local.');
  process.exit(1);
}

const sql = postgres(url, {
  ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  max: 1,
});

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

// Strip single-line comments, split on semicolons
const statements = schema
  .replace(/--[^\n]*/g, '')
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`📋  ${statements.length} statements to execute…\n`);

let applied = 0;
let skipped = 0;
let failed  = 0;

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 72);
  try {
    await sql.unsafe(stmt);
    console.log(`  ✓  ${preview}`);
    applied++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate column') ||
      msg.includes('DuplicateTable') ||
      msg.includes('DuplicateObject')
    ) {
      console.log(`  –  (skip) ${preview}`);
      skipped++;
    } else {
      console.error(`  ✗  ${preview}`);
      console.error(`     ${msg}\n`);
      failed++;
    }
  }
}

await sql.end();

console.log(`\n✅  Done — ${applied} applied, ${skipped} skipped, ${failed} failed.`);
if (failed > 0) process.exit(1);
