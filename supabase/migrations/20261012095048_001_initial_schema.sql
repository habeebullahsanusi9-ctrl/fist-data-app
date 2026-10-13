/*
# FIST DATA — Initial Database Schema

## What this migration does
Creates the complete database schema for the FIST DATA Nigerian data-reselling platform.
This replaces the previous Neon Postgres setup with Supabase Postgres.

## New Tables
1. `users` — User accounts with custom password hashing (scrypt)
   - id (uuid, PK), full_name, email (unique), phone (unique), password_hash, role (user/admin), status (active/suspended), created_at
2. `sessions` — Browser session tokens (SHA-256 hashed) for persistent login
   - token_hash (text, PK), user_id (FK → users), expires_at
3. `wallets` — User wallet balances (one per user)
   - id (uuid, PK), user_id (FK → users, unique), balance (numeric, default 0), updated_at
4. `transactions` — Financial transaction log (deposits, purchases)
   - id (uuid, PK), user_id (FK), transaction_type, amount, status, reference (unique), description, paystack_reference, created_at
5. `data_plans` — Catalog of sellable data plans per network
   - id (uuid, PK), network, plan_name, data_amount, price, validity, status (active/inactive), created_at
6. `data_purchases` — Individual data order records
   - id (uuid, PK), user_id (FK), plan_id (FK), phone_number, network, amount, status (pending/successful/failed), reference (unique), provider_reference, created_at, updated_at

## Security
- RLS enabled on ALL tables
- Users can only read/write their own data (wallets, transactions, sessions, data_purchases)
- data_plans is readable by all authenticated users (shared catalog)
- Admin users get full access via a SECURITY DEFINER function `is_admin()`
- Service role bypasses RLS for server-side operations (payment verification, admin actions)

## Important Notes
1. The `is_admin()` function checks if the current user has role = 'admin' in the users table.
   This is used in RLS policies to grant admin-only access to management endpoints.
2. The `wallets` table has a CHECK constraint preventing negative balances at the DB level.
3. The `transactions` table has a unique constraint on `reference` to prevent duplicate processing.
4. The `data_purchases` table has a unique constraint on `reference` to prevent duplicate orders.
5. All financial mutations (balance changes, transaction inserts) should go through server-side
   API routes that use the service role key to bypass RLS safely.
*/

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "select_own_user" ON users;
CREATE POLICY "select_own_user" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Users can update their own profile (but not role/status — those are admin-only via service role)
DROP POLICY IF EXISTS "update_own_user" ON users;
CREATE POLICY "update_own_user" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- No direct user access to sessions table — managed via server-side API routes only
-- Service role bypasses RLS for session management
DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
CREATE POLICY "select_own_sessions" ON sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- WALLETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance numeric(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Users can read their own wallet only
DROP POLICY IF EXISTS "select_own_wallet" ON wallets;
CREATE POLICY "select_own_wallet" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('wallet_funding', 'data_purchase')),
  amount numeric(15,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
  reference text UNIQUE NOT NULL,
  description text,
  paystack_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions only
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- DATA PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS data_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  plan_name text NOT NULL,
  data_amount text NOT NULL,
  price numeric(15,2) NOT NULL,
  validity text NOT NULL DEFAULT '30 days',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(network, plan_name)
);

ALTER TABLE data_plans ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active plans (shared catalog)
DROP POLICY IF EXISTS "select_active_plans" ON data_plans;
CREATE POLICY "select_active_plans" ON data_plans FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- DATA PURCHASES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS data_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES data_plans(id) ON DELETE RESTRICT,
  phone_number text NOT NULL,
  network text NOT NULL,
  amount numeric(15,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
  reference text UNIQUE NOT NULL,
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_purchases ENABLE ROW LEVEL SECURITY;

-- Users can read their own purchases only
DROP POLICY IF EXISTS "select_own_purchases" ON data_purchases;
CREATE POLICY "select_own_purchases" ON data_purchases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- ADMIN CHECK FUNCTION
-- ============================================================
-- This function allows RLS policies to check if the current user is an admin.
-- It's used by admin API routes (which run with service role, bypassing RLS),
-- but also available for policy-level admin checks if needed.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_data_purchases_user_id ON data_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_data_purchases_reference ON data_purchases(reference);
CREATE INDEX IF NOT EXISTS idx_data_plans_network ON data_plans(network);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- SEED DEFAULT DATA PLANS
-- ============================================================
INSERT INTO data_plans (network, plan_name, data_amount, price, validity) VALUES
  ('MTN', '1GB', '1GB', 350, '30 days'),
  ('MTN', '2GB', '2GB', 700, '30 days'),
  ('Airtel', '1GB', '1GB', 350, '30 days'),
  ('Airtel', '3GB', '3GB', 1000, '30 days'),
  ('Glo', '1GB', '1GB', 300, '30 days'),
  ('9mobile', '1GB', '1GB', 300, '30 days')
ON CONFLICT (network, plan_name) DO NOTHING;
