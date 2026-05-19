import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from('job_completions')
      .select('*')
      .eq('org_id', orgId)
      .order('completed_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await getOrgId();
    const body = await req.json();
    const {
      lead_id, project_id, before_photo_url, after_photo_url,
      job_type, description, customer_name, customer_phone, area,
    } = body as {
      lead_id?: string;
      project_id?: string;
      before_photo_url: string;
      after_photo_url: string;
      job_type: string;
      description: string;
      customer_name: string;
      customer_phone: string;
      area: string;
    };

    const { data, error } = await supabase
      .from('job_completions')
      .insert({
        org_id: orgId,
        lead_id: lead_id || null,
        project_id: project_id || null,
        before_photo_url,
        after_photo_url,
        job_type,
        description,
        customer_name,
        customer_phone,
        area,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
