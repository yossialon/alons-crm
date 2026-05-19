import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

const GOOGLE_REVIEW_LINK = process.env.GOOGLE_REVIEW_LINK ?? '';

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const { job_completion_id, lead_id, customer_name, phone, job_type, area } = await req.json() as {
    job_completion_id: string;
    lead_id?: string;
    customer_name: string;
    phone: string;
    job_type: string;
    area: string;
  };

  const message = `Hi ${customer_name}! Thank you for choosing Alon's Kitchens for your ${job_type} in ${area}. We loved working on your home! A quick Google review would mean the world to us 🙏 ${GOOGLE_REVIEW_LINK}`;

  let status: 'sent' | 'failed' = 'sent';
  let errorMsg: string | undefined;

  try {
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (sid && token && from && phone) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const body = new URLSearchParams({ Body: message, From: from, To: phone });
      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        },
        body: body.toString(),
      });
      if (!twilioRes.ok) {
        const errData = await twilioRes.json().catch(() => ({})) as { message?: string };
        throw new Error(errData.message ?? 'Twilio request failed');
      }
    }

    // Log to DB
    await supabase.from('review_requests').insert({
      org_id: orgId,
      job_completion_id,
      lead_id: lead_id || null,
      customer_name,
      phone,
      message,
      status,
    });

    // Mark job completion as review sent
    await supabase
      .from('job_completions')
      .update({ review_request_sent: true, review_request_sent_at: new Date().toISOString() })
      .eq('id', job_completion_id);

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    status = 'failed';
    errorMsg = String(err);
    // Still log the attempt — fire and forget
    void supabase.from('review_requests').insert({
      org_id: orgId,
      job_completion_id,
      lead_id: lead_id || null,
      customer_name,
      phone,
      message,
      status,
    });
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
