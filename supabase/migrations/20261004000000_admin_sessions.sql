create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.online_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 1200),
  starts_at timestamptz not null,
  platform text not null check (char_length(platform) between 2 and 80),
  href text not null check (char_length(href) between 1 and 2048),
  status text not null check (status in ('current', 'upcoming')),
  is_published boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists online_sessions_public_schedule_idx
  on public.online_sessions (status, starts_at)
  where is_published;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and active
      and role in ('super_admin', 'admin')
      and (select auth.jwt() ->> 'aal') = 'aal2'
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.online_sessions enable row level security;
alter table public.admin_audit_log enable row level security;

grant select on public.admin_users to authenticated;
grant select on public.online_sessions to anon, authenticated;
grant insert, update, delete on public.online_sessions to authenticated;
grant select on public.admin_audit_log to authenticated;

create policy admin_users_read_self
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create policy online_sessions_read_published
  on public.online_sessions for select to anon, authenticated
  using (is_published);

create policy online_sessions_admin_manage
  on public.online_sessions for all to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

create policy admin_audit_read_admin
  on public.admin_audit_log for select to authenticated
  using ((select public.is_site_admin()));

create or replace function public.audit_online_session_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed_row jsonb;
  changed_id text;
begin
  if tg_op = 'DELETE' then
    changed_row := to_jsonb(old);
    changed_id := old.id::text;
  else
    changed_row := to_jsonb(new);
    changed_id := new.id::text;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity, entity_id, details)
  values ((select auth.uid()), lower(tg_op), 'online_sessions', changed_id, changed_row);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.audit_online_session_change() from public;
grant execute on function public.audit_online_session_change() to authenticated;

create trigger online_sessions_audit
  after insert or update or delete on public.online_sessions
  for each row execute function public.audit_online_session_change();