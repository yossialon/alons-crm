import { NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';

// Protected by middleware: super_admin only
export async function GET() {
  try {
    const { data: orgs, error } = await serverDb
      .from('organizations')
      .select('id, name, subscription_status, trial_ends_at, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Fetch counts in parallel for each org
    const result = await Promise.all((orgs ?? []).map(async (org) => {
      const [{ count: lead_count }, { count: user_count }] = await Promise.all([
        serverDb.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
        serverDb.from('users').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
      ]);
      return { ...org, lead_count: Number(lead_count ?? 0), user_count: Number(user_count ?? 0) };
    }));

    return NextResponse.json({ orgs: result });
  } catch (err) {
    console.error('[GET /api/admin/orgs]', err);
    return NextResponse.json({ error: 'Failed to fetch orgs' }, { status: 500 });
  }
}
