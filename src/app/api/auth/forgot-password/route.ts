import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/outreach/email';

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle();

    if (user) {
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', user.id)
        .is('used_at', null);

      const { data: token, error } = await supabase
        .from('password_reset_tokens')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${token.id}`;

      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1e293b;margin-bottom:8px">Reset your password</h2>
          <p style="color:#475569;margin-bottom:24px">
            Hi ${user.name || user.email},<br><br>
            We received a request to reset the password for your account.
            Click the button below to choose a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#b45309;color:#fff;font-weight:700;
                    text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:28px">
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color:#cbd5e1;font-size:11px;margin-top:8px">
            Or copy this URL: ${resetUrl}
          </p>
        </div>
      `;

      const result = await sendEmail({ to: user.email, subject: 'Reset your password', html });
      if (!result.ok) console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password]', err);
    return NextResponse.json({ ok: true }); // always 200 to avoid user enumeration
  }
}
