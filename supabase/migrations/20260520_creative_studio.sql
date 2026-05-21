-- ── Creative Studio ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_name TEXT        NOT NULL DEFAULT '',
  tagline       TEXT        NOT NULL DEFAULT '',
  logo_url      TEXT,
  primary_color TEXT        NOT NULL DEFAULT '#92400E',
  secondary_color TEXT      NOT NULL DEFAULT '#D97706',
  bg_color      TEXT        NOT NULL DEFAULT '#FFFFFF',
  text_color    TEXT        NOT NULL DEFAULT '#1C0A00',
  font_pair     TEXT        NOT NULL DEFAULT 'modern-luxury'
                  CHECK (font_pair IN ('modern-luxury','clean-premium','bold-impact','classic-elegant')),
  brand_voice   TEXT        NOT NULL DEFAULT 'luxury-sophisticated'
                  CHECK (brand_voice IN ('luxury-sophisticated','friendly-local','bold-confident','warm-trustworthy')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

CREATE TABLE IF NOT EXISTS creative_templates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL DEFAULT '',
  template_type  TEXT        NOT NULL
                   CHECK (template_type IN ('before-after','showcase','promotion','testimonial','service','print-flyer')),
  platform       TEXT        NOT NULL DEFAULT 'instagram-feed',
  style_variant  TEXT        NOT NULL DEFAULT 'luxury-dark',
  headline       TEXT        NOT NULL DEFAULT '',
  subheadline    TEXT        NOT NULL DEFAULT '',
  cta_text       TEXT        NOT NULL DEFAULT '',
  phone          TEXT        NOT NULL DEFAULT '',
  photo_url      TEXT,
  before_photo_url TEXT,
  after_photo_url  TEXT,
  thumbnail_url  TEXT,
  campaign_name  TEXT        NOT NULL DEFAULT '',
  is_favorite    BOOLEAN     NOT NULL DEFAULT false,
  archived       BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_settings_org_idx   ON brand_settings(org_id);
CREATE INDEX IF NOT EXISTS creative_tmpl_org_idx    ON creative_templates(org_id);
CREATE INDEX IF NOT EXISTS creative_tmpl_type_idx   ON creative_templates(org_id, template_type);
CREATE INDEX IF NOT EXISTS creative_tmpl_camp_idx   ON creative_templates(org_id, campaign_name);
