import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, contact, phone, email, category, status, notes } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  db.prepare(`
    UPDATE suppliers
    SET name=?, contact=?, phone=?, email=?, category=?, status=?, notes=?,
        updated_at=datetime('now')
    WHERE id=?
  `).run(name.trim(), contact, phone, email, category, status, notes, id);

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
