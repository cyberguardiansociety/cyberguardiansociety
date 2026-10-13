create table if not exists public.cgs_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'membership_interest')),
  name text not null check (char_length(name) between 2 and 150),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 5000),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cgs_inbox_status_created_idx
  on public.cgs_inbox_messages (status, created_at desc);
create index if not exists cgs_inbox_email_idx
  on public.cgs_inbox_messages (email, created_at desc);

alter table public.cgs_inbox_messages enable row level security;
grant select, update on public.cgs_inbox_messages to authenticated;

create policy cgs_inbox_admin_read
  on public.cgs_inbox_messages for select to authenticated
  using ((select public.is_site_admin()));
create policy cgs_inbox_admin_update
  on public.cgs_inbox_messages for update to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

create trigger cgs_inbox_messages_audit
  after insert or update or delete on public.cgs_inbox_messages
  for each row execute function public.audit_attendance_portal_change();
