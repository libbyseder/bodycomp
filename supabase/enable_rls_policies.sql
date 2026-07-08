-- Run in Supabase SQL Editor (recomptrack project)
-- Enables RLS and adds policies so the bodycomp app works with security on.
--
-- Client (anon key + user JWT): profiles, measurements
-- Server API routes (service role key): withings_tokens, withings_synced_grpids, sync/delete

-- =============================================================================
-- profiles
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- measurements
-- =============================================================================
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own measurements" ON measurements;
CREATE POLICY "Users can view own measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own measurements" ON measurements;
CREATE POLICY "Users can insert own measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own measurements" ON measurements;
CREATE POLICY "Users can update own measurements"
  ON measurements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own measurements" ON measurements;
CREATE POLICY "Users can delete own measurements"
  ON measurements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- withings_tokens (server-only via service role; block all client access)
-- =============================================================================
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- withings_synced_grpids (server-only via service role; block all client access)
-- =============================================================================
ALTER TABLE withings_synced_grpids ENABLE ROW LEVEL SECURITY;