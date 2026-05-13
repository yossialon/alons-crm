import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// persistSession/autoRefreshToken disabled: we use our own JWT/cookie auth,
// not Supabase Auth. This also prevents supabase-js from touching localStorage
// during SSR / next build, which would throw ReferenceError.
export const supabase = createClient(url, key, {
  auth: {
    persistSession:    false,
    autoRefreshToken:  false,
    detectSessionInUrl: false,
  },
});
