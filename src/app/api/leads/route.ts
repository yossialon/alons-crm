import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

function sanitizeUrl(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch {}
  return '';
}

export async function GET() {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, phone, email = '', type = 'Homeowner', area = 'Boca Raton',
    status = 'new', source = 'Manual', notes = '',
    website = '', rating = '', potential = 'medium',
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!phone?.trim()) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

  const id = uuidv4();
  const date = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO leads (id, name, phone, email, type, area, status, source, notes, website, rating, potential, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), phone.trim(), email, type, area, status, source, notes, sanitizeUrl(website), rating, potential, date);

  return NextResponse.json(db.prepare('SELECT * FROM leads WHERE id = ?').get(id), { status: 201 });
}
