import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const scan = db.prepare('SELECT * FROM scan_results WHERE id = ?').get(id) as Record<string, string> | undefined;
  if (!scan) return NextResponse.json({ error: 'Scan result not found' }, { status: 404 });

  const existing = db.prepare('SELECT id FROM leads WHERE name = ?').get(scan.name);
  if (existing) return NextResponse.json({ error: 'Already imported' }, { status: 409 });

  const leadId = uuidv4();
  db.prepare(`
    INSERT INTO leads (id, name, phone, email, type, area, status, source, notes, website, rating, potential, date)
    VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)
  `).run(
    leadId, scan.name, scan.phone, scan.email,
    scan.type, scan.area, scan.source, scan.notes,
    scan.website, scan.rating, scan.potential,
    new Date().toISOString().split('T')[0],
  );

  db.prepare('UPDATE scan_results SET imported = 1 WHERE id = ?').run(id);

  return NextResponse.json({ ok: true, leadId });
}
