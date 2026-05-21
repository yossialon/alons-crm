import { NextRequest, NextResponse } from 'next/server';
import { runJobCompletion } from '@/agents/ad-machine';

function verifyAuth(req: NextRequest): boolean {
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? process.env.AGENT_SECRET ?? '';
  if (!secret) return true;
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const result = await runJobCompletion({
      leadId:         body.lead_id      ?? '',
      leadName:       body.lead_name    ?? 'Customer',
      projectType:    body.project_type ?? 'Kitchen Cabinet',
      beforePhotoUrl: body.before_photo_url,
      afterPhotoUrl:  body.after_photo_url,
      testimonial:    body.testimonial,
      customerPhone:  body.customer_phone,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
