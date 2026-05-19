-- Instagram interactions
create table if not exists instagram_interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000001',
  commenter_username text not null default '',
  commenter_id text not null default '',
  comment_text text not null default '',
  post_id text not null default '',
  dm_sent boolean not null default false,
  dm_text text,
  dm_message_id text,
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Social messages table (may already exist — use IF NOT EXISTS)
create table if not exists social_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000001',
  platform text not null check (platform in ('whatsapp','instagram','facebook')),
  thread_id text not null default '',
  sender_name text not null default '',
  sender_phone text,
  sender_ig_id text,
  message text not null default '',
  direction text not null default 'inbound' check (direction in ('inbound','outbound')),
  is_read boolean not null default false,
  is_hot boolean not null default false,
  lead_id uuid references leads(id) on delete set null,
  meta_message_id text,
  created_at timestamptz not null default now()
);

-- Ad leads tracking
create table if not exists ad_leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000001',
  lead_id uuid references leads(id) on delete cascade,
  platform text not null default 'facebook',
  ad_id text,
  ad_name text,
  form_id text,
  form_name text,
  campaign_id text,
  campaign_name text,
  created_at timestamptz not null default now()
);

-- Settings store
create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000001',
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  unique(org_id, key)
);

create index if not exists idx_instagram_interactions_org on instagram_interactions(org_id);
create index if not exists idx_social_messages_org on social_messages(org_id);
create index if not exists idx_social_messages_thread on social_messages(thread_id);
create index if not exists idx_ad_leads_org on ad_leads(org_id);
