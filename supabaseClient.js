import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL =
  window.__SUPABASE_URL__ ||
  (window.env && window.env.SUPABASE_URL) ||
  'https://YOUR_SUPABASE_PROJECT.supabase.co';
const SUPABASE_ANON_KEY =
  window.__SUPABASE_ANON_KEY__ ||
  (window.env && window.env.SUPABASE_ANON_KEY) ||
  'YOUR_SUPABASE_ANON_KEY';

if (
  !SUPABASE_URL ||
  SUPABASE_URL.startsWith('https://YOUR_SUPABASE_PROJECT') ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY'
) {
  console.warn(
    '[upword] Supabase environment values are not set. Update window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__ before using auth features.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false // Disable auto-redirect on URL detection
  }
});

