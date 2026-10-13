alter table public.admin_users
  add column if not exists updated_at timestamptz not null default now();

alter table public.cgs_google_sync_runs
  add column if not exists created_at timestamptz not null default now();
