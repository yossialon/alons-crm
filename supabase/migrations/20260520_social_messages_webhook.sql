-- Reconcile social_messages for webhook-based inserts.
-- The original schema.sql table has connection_id NOT NULL and uses `content`
-- for message text. Webhook routes don't have a connection record, so we make
-- connection_id nullable and add the webhook-era columns if they don't exist.

ALTER TABLE social_messages ALTER COLUMN connection_id DROP NOT NULL;

ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS is_hot       boolean    NOT NULL DEFAULT false;
ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS is_read      boolean    NOT NULL DEFAULT false;
ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS sender_phone text;
ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS sender_ig_id text;
ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS meta_message_id text;

-- lead_id may already exist from schema.sql
ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

-- Index for hot-message queries
CREATE INDEX IF NOT EXISTS social_msg_hot_idx ON social_messages(org_id, is_hot) WHERE is_hot = true;

-- Make external_id nullable so webhook inserts without a dedup ID still work
ALTER TABLE social_messages ALTER COLUMN external_id DROP NOT NULL;
