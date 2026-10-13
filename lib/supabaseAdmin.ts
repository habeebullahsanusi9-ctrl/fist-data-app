import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client using the service role key.
 * This bypasses RLS and is used ONLY in server-side API routes
 * where we enforce authorization manually.
 *
 * NEVER import this in client-side code — the service role key
 * must never reach the browser.
 */
export function supabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
