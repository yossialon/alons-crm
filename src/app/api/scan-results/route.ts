import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const rows = db
    .prepare('SELECT * FROM scan_results ORDER BY created_at DESC LIMIT 300')
    .all() as Record<string, unknown>[];
  return NextResponse.json(rows.map((r) => ({ ...r, imported: Boolean(r.imported) })));
}

export async function POST(req: NextRequest) {
  const { results } = await req.json();
  if (!Array.isArray(results)) {
    return NextResponse.json({ error: 'results must be an array' }, { status: 400 });
  }

  const ins = db.prepare(`
    INSERT INTO scan_results (id, name, phone, email, website, area, type, source, rating, potential, notes, scan_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const insertAll = db.transaction((items: Record<string, string>[]) => {
    for (const r of items) {
      ins.run(
        uuidv4(),
        r.name ?? '', r.phone ?? '', r.email ?? '', r.website ?? '',
        r.area ?? '', r.type ?? '', r.source ?? '', r.rating ?? '',
        r.potential ?? 'medium', r.notes ?? '', now,
      );
    }
  });

  insertAll(results);
  return NextResponse.json({ ok: true, count: results.length });
}

export async function DELETE() {
  db.prepare('DELETE FROM scan_results').run();
  return NextResponse.json({ ok: true });
}
