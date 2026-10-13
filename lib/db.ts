import { supabaseAdmin } from './supabaseAdmin';

/**
 * Database access layer for FIST DATA.
 * All queries use the service role client (bypasses RLS).
 * Authorization is enforced in the API route handlers.
 */
export const db = supabaseAdmin();
