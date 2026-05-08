import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

function sanitizeUrl(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch {}
  return '';
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, phone, email, type, area, status, source, notes, website, rating, potential } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!phone?.trim()) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

  db.prepare(`
    UPDATE leads
    SET name=?, phone=?, email=?, type=?, area=?, status=?, source=?, notes=?,
        website=?, rating=?, potential=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name.trim(), phone.trim(), email, type, area, status, source, notes, sanitizeUrl(website), rating, potential, id);

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lead);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
