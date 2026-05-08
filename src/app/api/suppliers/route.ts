import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all();
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, contact = '', phone = '', email = '',
    category = 'Hardware', status = 'active', notes = '',
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const id = uuidv4();
  const lastContact = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO suppliers (id, name, contact, phone, email, category, status, notes, last_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), contact, phone, email, category, status, notes, lastContact);

  return NextResponse.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id), { status: 201 });
}
