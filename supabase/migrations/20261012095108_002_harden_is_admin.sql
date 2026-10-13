/*
# Harden is_admin() function execution

The is_admin() SECURITY DEFINER function should not be callable by anon role
via the REST API. Revoke EXECUTE from anon and authenticated since admin checks
are done server-side via the service role key which bypasses RLS.
*/

REVOKE EXECUTE ON FUNCTION is_admin() FROM anon, authenticated;
