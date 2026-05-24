-- ── Campaign Learning Layer ───────────────────────────────────────────────────
-- Persists the patterns Claude extracts from historical recommendation data,
-- and stores a confidence score on each campaign recommendation row so
-- operators can see which suggestions are backed by evidence.

-- ── Extend campaign_recommendations with a confidence column ──────────────────
-- Nullable (NULL = no learning data was available when the rec was generated).
ALTER TABLE campaign_recommendations
  ADD COLUMN IF NOT EXISTS confidence FLOAT
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

COMMENT ON COLUMN campaign_recommendations.confidence IS
  'Probability 0.0–1.0 that this recommendation will increase leads, '
  'derived from historical correlation analysis. NULL when insufficient history.';

-- ── campaign_learnings ────────────────────────────────────────────────────────
-- Each row represents one extracted pattern from a weekly learning pass.
-- Multiple patterns can be saved per week_of (one per discovered correlation).
CREATE TABLE IF NOT EXISTS campaign_learnings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The Monday (or run date) of the review week that generated this learning
  week_of          DATE        NOT NULL,

  -- Human-readable description of the marketing pattern
  -- e.g. "Instagram before/after photo posts correlate with 2× lead increases"
  pattern          TEXT        NOT NULL,

  -- Probability 0.0–1.0 that this pattern leads to higher leads the following week
  confidence_score FLOAT       NOT NULL
    CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- How many historical weeks the pattern was observed across
  based_on_weeks   INTEGER     NOT NULL CHECK (based_on_weeks >= 1),

  -- Claude's plain-language reasoning, e.g. "appeared in 6/8 weeks, avg 8 leads
  -- the following week vs 3 in weeks without this pattern"
  reasoning        TEXT
);

-- Retrieve this week's learnings quickly
CREATE INDEX IF NOT EXISTS idx_campaign_learnings_week
  ON campaign_learnings (org_id, week_of DESC);

-- Time-series view of all patterns (for UI trend charts)
CREATE INDEX IF NOT EXISTS idx_campaign_learnings_pattern
  ON campaign_learnings (org_id, pattern, week_of DESC);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE campaign_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_learnings: service role full access"
  ON campaign_learnings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
