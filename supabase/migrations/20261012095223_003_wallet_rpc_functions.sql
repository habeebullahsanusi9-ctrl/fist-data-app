/*
# Add atomic wallet operations (deduct + credit)

Creates SECURITY DEFINER functions for atomic wallet balance changes.
EXECUTE revoked from anon/authenticated — only service role can call these.
*/

CREATE OR REPLACE FUNCTION deduct_wallet_balance(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result numeric;
BEGIN
  UPDATE wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING wallets.balance INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION credit_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reference text
)
RETURNS TABLE(new_balance numeric, already_processed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count int;
  current_balance numeric;
  credited_balance numeric;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM transactions
  WHERE reference = p_reference AND status = 'successful';

  IF existing_count > 0 THEN
    SELECT w.balance INTO current_balance FROM wallets w WHERE w.user_id = p_user_id;
    RETURN QUERY SELECT current_balance, true;
    RETURN;
  END IF;

  UPDATE wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING wallets.balance INTO credited_balance;

  RETURN QUERY SELECT credited_balance, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION deduct_wallet_balance(uuid, numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION credit_wallet_balance(uuid, numeric, text) FROM anon, authenticated;
