import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'crm.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'Homeowner',
    area TEXT NOT NULL DEFAULT 'Boca Raton',
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT DEFAULT 'Manual',
    notes TEXT DEFAULT '',
    website TEXT DEFAULT '',
    rating TEXT DEFAULT '',
    potential TEXT DEFAULT 'medium',
    date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    category TEXT DEFAULT 'Hardware',
    status TEXT DEFAULT 'active',
    notes TEXT DEFAULT '',
    last_contact TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scan_results (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    website TEXT DEFAULT '',
    area TEXT,
    type TEXT,
    source TEXT,
    rating TEXT DEFAULT '',
    potential TEXT DEFAULT 'medium',
    notes TEXT DEFAULT '',
    scan_date TEXT,
    imported INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed demo data on first run
const leadCount = (db.prepare('SELECT COUNT(*) as c FROM leads').get() as { c: number }).c;
if (leadCount === 0) {
  const ins = db.prepare(`
    INSERT INTO leads (id, name, phone, email, type, area, status, source, notes, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  ins.run(uuidv4(), 'David Cohen', '954-555-0192', 'd.cohen@email.com', 'Homeowner', 'Boca Raton', 'qualified', 'Referral', 'Wants full kitchen remodel, budget ~$25k', '2026-04-28');
  ins.run(uuidv4(), 'Miami Contractors LLC', '305-555-0347', 'info@miamicontractors.com', 'Contractor', 'Miami', 'contacted', 'Google Maps', 'Large residential projects, looking for cabinet supplier', '2026-04-30');
  ins.run(uuidv4(), 'Sarah Levy', '561-555-0821', 'sarah.levy@gmail.com', 'Homeowner', 'Delray Beach', 'new', 'Web Form', 'Recently moved, wants custom shaker cabinets', '2026-05-01');
}

const supCount = (db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as { c: number }).c;
if (supCount === 0) {
  const ins = db.prepare(`
    INSERT INTO suppliers (id, name, contact, phone, email, category, status, notes, last_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  ins.run(uuidv4(), 'WoodCraft Materials', 'Tom Hernandez', '954-400-1122', 'tom@woodcraft.com', 'Wood & MDF', 'active', 'Primary supplier for MDF sheets. Net-30 terms.', '2026-04-25');
  ins.run(uuidv4(), 'Premier Hardware Co.', 'Lisa Park', '305-400-3344', 'lisa@premhardware.com', 'Hardware', 'active', 'Handles all drawer slides and hinges. Volume discount >200 units.', '2026-04-20');
}

export default db;
