import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const jobId = formData.get('jobId') as string;
    const side = formData.get('side') as string; // 'before' | 'after'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `jobs/${jobId}/${side}.${ext}`;

    const { error } = await supabase.storage
      .from('job-photos')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error) {
      // Fallback: return a data URL for local dev if Supabase storage not configured
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl, fallback: true });
    }

    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
