import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',          // returns ?code= in the query string, safe for static hosting
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,  // exchanges the code automatically on /auth/callback
  },
});
