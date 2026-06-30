-- Run in Supabase SQL Editor
-- One row per user per date, with averaged values and a log count

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS log_count integer NOT NULL DEFAULT 1;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS body_fat_log_count integer NOT NULL DEFAULT 0;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS logged_at timestamptz;

-- Backfill counts for existing rows
UPDATE measurements
SET body_fat_log_count = CASE WHEN body_fat IS NOT NULL THEN 1 ELSE 0 END
WHERE body_fat_log_count = 0 AND log_count = 1;

UPDATE measurements
SET logged_at = (date::date + time '12:00:00') AT TIME ZONE 'UTC'
WHERE logged_at IS NULL;

-- Consolidate duplicate date rows into one averaged row (safe to re-run)
WITH dupes AS (
  SELECT user_id, date
  FROM measurements
  GROUP BY user_id, date
  HAVING COUNT(*) > 1
),
agg AS (
  SELECT
    m.user_id,
    m.date,
    COUNT(*)::integer AS log_count,
    COUNT(m.body_fat)::integer AS body_fat_log_count,
    ROUND(AVG(m.weight)::numeric, 1) AS weight,
    ROUND(AVG(m.body_fat) FILTER (WHERE m.body_fat IS NOT NULL)::numeric, 1) AS body_fat,
    MIN(m.id) AS keep_id
  FROM measurements m
  INNER JOIN dupes d ON d.user_id = m.user_id AND d.date = m.date
  GROUP BY m.user_id, m.date
)
UPDATE measurements m
SET
  weight = a.weight,
  body_fat = a.body_fat,
  log_count = a.log_count,
  body_fat_log_count = a.body_fat_log_count
FROM agg a
WHERE m.id = a.keep_id;

DELETE FROM measurements m
USING measurements d
WHERE m.user_id = d.user_id
  AND m.date = d.date
  AND m.id > d.id;

-- Enforce one row per user per date
ALTER TABLE measurements DROP CONSTRAINT IF EXISTS measurements_user_id_date_key;
ALTER TABLE measurements ADD CONSTRAINT measurements_user_id_date_key UNIQUE (user_id, date);

-- Track which Withings readings have been merged (for sync dedup)
CREATE TABLE IF NOT EXISTS withings_synced_grpids (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grpid bigint NOT NULL,
  PRIMARY KEY (user_id, grpid)
);

ALTER TABLE withings_synced_grpids ENABLE ROW LEVEL SECURITY;