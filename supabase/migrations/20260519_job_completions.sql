-- Job completions table
create table if not exists job_completions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000001',
  lead_id uuid references leads(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  before_photo_url text not null default '',
  after_photo_url text not null default '',
  job_type text not null default 'Kitchen Remodel',
  description text not null default '',
  customer_name text not null default '',
  customer_phone text not null default '',
  area text not null default '',
  instagram_post_url text,
  google_post_url text,
  nextdoor_copied boolean not null default false,
  review_request_sent boolean not null default false,
  review_request_sent_at timestamptz,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Review requests log table
create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000001',
  job_completion_id uuid references job_completions(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  customer_name text not null default '',
  phone text not null default '',
  message text not null default '',
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed', 'delivered'))
);

-- Storage bucket for job photos (run this in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', true) on conflict do nothing;

create index if not exists idx_job_completions_org on job_completions(org_id);
create index if not exists idx_job_completions_lead on job_completions(lead_id);
create index if not exists idx_review_requests_job on review_requests(job_completion_id);
