-- Align the hosted schema with the application's server-side database contract.
-- The website uses signed admin sessions and password hashes in admin_users;
-- it does not authenticate admins through auth.users.

do $$
declare
  foreign_key record;
begin
  for foreign_key in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and confrelid = 'auth.users'::regclass
      and connamespace = 'public'::regnamespace
  loop
    execute format('alter table %s drop constraint %I', foreign_key.table_name, foreign_key.conname);
  end loop;
end;
$$;

alter table public.admin_users
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists is_protected boolean not null default false,
  add column if not exists permission_keys text[] not null default '{}'::text[];

update public.admin_users as admins
set email = users.email
from auth.users as users
where admins.user_id = users.id and admins.email is null;

do $$
begin
  if exists (select 1 from public.admin_users where email is null or password_hash is null) then
    raise exception 'Existing hosted admin rows need an email and password_hash before this migration can continue.';
  end if;
end;
$$;

alter table public.admin_users
  alter column email set not null,
  alter column password_hash set not null,
  alter column permission_keys set default '{}'::text[];

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in (
    'super_admin', 'admin', 'content_manager', 'session_manager',
    'speaker_manager', 'finance_manager', 'inbox_manager', 'auditor', 'limited_admin'
  ));

create unique index if not exists admin_users_email_ci_uidx on public.admin_users (lower(email));
create unique index if not exists admin_users_username_ci_uidx
  on public.admin_users (lower(username)) where username is not null;

alter table public.online_sessions alter column created_by type text using created_by::text;
alter table public.cgs_managed_content alter column created_by type text using created_by::text;
alter table public.cgs_payment_ledger alter column created_by type text using created_by::text;
alter table public.cgs_google_sheet_connections add column if not exists created_by text;

alter table public.admin_audit_log
  alter column id drop identity if exists;

alter table public.admin_audit_log
  alter column id type text using id::text,
  alter column id set default gen_random_uuid()::text,
  alter column actor_id type text using actor_id::text,
  alter column actor_id drop not null,
  alter column entity_id drop not null;

alter table public.cgs_session_speakers
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists created_at timestamptz not null default now();
create unique index if not exists cgs_session_speakers_id_uidx
  on public.cgs_session_speakers (id);

alter table public.cgs_inbox_messages
  add column if not exists subject text,
  add column if not exists source text;

do $$
declare
  check_constraint record;
begin
  for check_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.cgs_inbox_messages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.cgs_inbox_messages drop constraint %I', check_constraint.conname);
  end loop;
end;
$$;

alter table public.cgs_portal_settings
  add column if not exists id text,
  add column if not exists created_at timestamptz not null default now();
update public.cgs_portal_settings set id = 'setting-' || key where id is null;
alter table public.cgs_portal_settings alter column id set default gen_random_uuid()::text;
alter table public.cgs_portal_settings alter column id set not null;
create unique index if not exists cgs_portal_settings_id_uidx on public.cgs_portal_settings (id);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  status text not null default 'received',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_status_idx on public.applications (status);

create table if not exists public.newsletter_subscribers (
  email text primary key check (char_length(email) between 3 and 254),
  source text not null default 'team-page',
  subscribed_at timestamptz not null default now()
);

create table if not exists public.admin_login_lockouts (
  identifier text primary key,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 4),
  lockout_count integer not null default 0 check (lockout_count >= 0),
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

create table if not exists public.admin_ip_rate_limits (
  limit_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null
);

create or replace function public.record_admin_login_failure(identifier_key text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_lockout public.admin_login_lockouts%rowtype;
  next_attempt integer;
  tier integer;
  duration_seconds integer;
  next_locked_until timestamptz;
begin
  if identifier_key is null or char_length(identifier_key) not between 1 and 320 then
    raise exception 'Invalid administrator identifier.' using errcode = '22023';
  end if;

  insert into public.admin_login_lockouts (identifier) values (identifier_key)
  on conflict (identifier) do nothing;

  select * into existing_lockout
  from public.admin_login_lockouts
  where identifier = identifier_key
  for update;

  if existing_lockout.locked_until is not null and existing_lockout.locked_until > now() then
    return jsonb_build_object(
      'isNowLocked', true,
      'remainingAttempts', 0,
      'lockedUntil', existing_lockout.locked_until
    );
  end if;

  next_attempt := existing_lockout.failed_attempts + 1;
  if next_attempt >= 5 then
    tier := least(existing_lockout.lockout_count, 2);
    duration_seconds := case tier when 0 then 900 when 1 then 3600 else 14400 end;
    next_locked_until := now() + make_interval(secs => duration_seconds);
    update public.admin_login_lockouts
    set failed_attempts = 0,
        lockout_count = existing_lockout.lockout_count + 1,
        locked_until = next_locked_until,
        last_attempt_at = now()
    where identifier = identifier_key;
    return jsonb_build_object(
      'isNowLocked', true,
      'remainingAttempts', 0,
      'lockedUntil', next_locked_until
    );
  end if;

  update public.admin_login_lockouts
  set failed_attempts = next_attempt,
      locked_until = null,
      last_attempt_at = now()
  where identifier = identifier_key;
  return jsonb_build_object(
    'isNowLocked', false,
    'remainingAttempts', 5 - next_attempt,
    'lockedUntil', null
  );
end;
$$;

revoke all on function public.record_admin_login_failure(text) from public, anon, authenticated;
grant execute on function public.record_admin_login_failure(text) to service_role;

create or replace function public.consume_admin_ip_rate_limit(
  p_limit_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  rate_limit public.admin_ip_rate_limits%rowtype;
  next_reset timestamptz;
begin
  if p_limit_key is null or char_length(p_limit_key) not between 1 and 500
     or p_max_requests not between 1 and 1000 or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters.' using errcode = '22023';
  end if;

  insert into public.admin_ip_rate_limits (limit_key, request_count, reset_at)
  values (p_limit_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (limit_key) do nothing;

  select * into rate_limit from public.admin_ip_rate_limits
  where admin_ip_rate_limits.limit_key = p_limit_key
  for update;

  if rate_limit.reset_at <= now() then
    next_reset := now() + make_interval(secs => p_window_seconds);
    update public.admin_ip_rate_limits
    set request_count = 1, reset_at = next_reset
    where admin_ip_rate_limits.limit_key = p_limit_key;
    return jsonb_build_object('allowed', true, 'remaining', p_max_requests - 1, 'retryAfterSeconds', p_window_seconds);
  end if;

  if rate_limit.request_count >= p_max_requests then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from (rate_limit.reset_at - now())))::integer)
    );
  end if;

  update public.admin_ip_rate_limits
  set request_count = request_count + 1
  where admin_ip_rate_limits.limit_key = p_limit_key;
  return jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - rate_limit.request_count - 1,
    'retryAfterSeconds', greatest(1, ceil(extract(epoch from (rate_limit.reset_at - now())))::integer)
  );
end;
$$;

revoke all on function public.consume_admin_ip_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_admin_ip_rate_limit(text, integer, integer) to service_role;

alter table public.admin_users enable row level security;
alter table public.applications enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_login_lockouts enable row level security;
alter table public.admin_ip_rate_limits enable row level security;
grant select, insert, update, delete on public.applications to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- Retain the same initial visible content shipped by the local JSON fallback.
insert into public.cgs_managed_content
  (id, content_type, title, slug, summary, body, action_url, category, price, currency, status, sort_order)
values
  ('d1000000-0000-0000-0000-000000000001', 'announcement',
   'Registration Open for CGS Cybersecurity Bootcamp 2026', 'registration-open-cgs-bootcamp-2026',
   'Applications are now open for our intensive threat hunting and blue team operations bootcamp.',
   'Get hands-on experience in threat detection, DFIR, and defensive engineering. Free for accepted community members.',
   '/#join', 'COMMUNITY', null, 'USD', 'published', 1),
  ('d1000000-0000-0000-0000-000000000002', 'product',
   'CGS Threat Radar Toolkit', 'cgs-threat-radar-toolkit',
   'Automated threat hunting telemetry collection scripts and alerting rules built for blue teams.',
   'Community-developed signatures, Sigma rules, and endpoint telemetry parsing tools.',
   'https://github.com/cyberguardiansociety', 'DEFENSIVE TOOLING', 0, 'USD', 'published', 1),
  ('d1000000-0000-0000-0000-000000000003', 'resource',
   'CGS Incident Response Field Guide', 'cgs-incident-response-guide',
   'A structured, battle-tested playbook for triaging ransomware and active intrusions.',
   'Step-by-step containment checklists, memory dump procedures, and stakeholder communication templates.',
   '/services', 'PLAYBOOK', null, 'USD', 'published', 1)
on conflict (id) do nothing;

-- Values are synchronized with lib/db/schema.ts and lib/portal-settings.ts.
insert into public.cgs_portal_settings (key, value) values
  ('portal_open', 'true'),
  ('registration_open', 'true'),
  ('attendance_open', 'true'),
  ('join_cgs_coming_soon', 'false'),
  ('speaker_coming_soon', 'false'),
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'Our website is temporarily unavailable while we complete scheduled maintenance. Please check back soon.')
on conflict (key) do nothing;
