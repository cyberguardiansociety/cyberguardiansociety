alter table public.online_sessions
  add column if not exists slug text,
  add column if not exists full_description text,
  add column if not exists banner_url text,
  add column if not exists management_status text not null default 'UPCOMING'
    check (management_status in ('DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
  add column if not exists ends_at timestamptz,
  add column if not exists timezone text not null default 'Asia/Karachi',
  add column if not exists session_number integer,
  add column if not exists bootcamp_tag text not null default 'cgs-bootcamp-2026',
  add column if not exists registration_open boolean not null default true,
  add column if not exists attendance_open boolean not null default false,
  add column if not exists attendance_starts_at timestamptz,
  add column if not exists attendance_ends_at timestamptz,
  add column if not exists is_active boolean not null default true,
  add column if not exists sheet_connection_id uuid;

update public.online_sessions
set
  slug = coalesce(nullif(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), ''), 'session')
    || '-' || substr(replace(id::text, '-', ''), 1, 8),
  ends_at = coalesce(ends_at, starts_at + interval '1 hour'),
  management_status = case
    when status = 'current' then 'LIVE'
    else 'UPCOMING'
  end
where slug is null or ends_at is null;

  create or replace function public.audit_attendance_portal_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = pg_catalog, public
  as $$

    changed_row jsonb;
    changed_id text;
create unique index if not exists online_sessions_slug_unique_idx
    changed_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    changed_id := coalesce(
      changed_row ->> 'id',
      concat_ws(':', changed_row ->> 'session_id', changed_row ->> 'registrant_id', changed_row ->> 'speaker_id'),
      'unknown'
    );

    insert into public.admin_audit_log (actor_id, action, entity, entity_id, details)
    values (
      (select auth.uid()),
      lower(tg_op),
      tg_table_name,
      changed_id,
      jsonb_build_object('operation', lower(tg_op))
    );

    if tg_op = 'DELETE' then return old; end if;
    return new;
  end;
  $$;

  revoke all on function public.audit_attendance_portal_change() from public;
  grant execute on function public.audit_attendance_portal_change() to authenticated;

  drop trigger if exists cgs_registrants_audit on public.cgs_registrants;
  create trigger cgs_registrants_audit after insert or update or delete on public.cgs_registrants
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_session_registrations_audit on public.cgs_session_registrations;
  create trigger cgs_session_registrations_audit after insert or update or delete on public.cgs_session_registrations
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_attendance_records_audit on public.cgs_attendance_records;
  create trigger cgs_attendance_records_audit after insert or update or delete on public.cgs_attendance_records
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_speakers_audit on public.cgs_speakers;
  create trigger cgs_speakers_audit after insert or update or delete on public.cgs_speakers
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_session_speakers_audit on public.cgs_session_speakers;
  create trigger cgs_session_speakers_audit after insert or update or delete on public.cgs_session_speakers
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_google_sheet_connections_audit on public.cgs_google_sheet_connections;
  create trigger cgs_google_sheet_connections_audit after insert or update or delete on public.cgs_google_sheet_connections
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_google_sync_runs_audit on public.cgs_google_sync_runs;
  create trigger cgs_google_sync_runs_audit after insert or update or delete on public.cgs_google_sync_runs
    for each row execute function public.audit_attendance_portal_change();
  drop trigger if exists cgs_portal_settings_audit on public.cgs_portal_settings;
  create trigger cgs_portal_settings_audit after insert or update or delete on public.cgs_portal_settings
    for each row execute function public.audit_attendance_portal_change();
  on public.online_sessions (slug);
create index if not exists online_sessions_management_schedule_idx
  on public.online_sessions (management_status, starts_at desc)
  where is_active;

create table if not exists public.cgs_registrants (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  name text check (name is null or char_length(name) <= 200),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 50),
  organization text check (organization is null or char_length(organization) <= 200),
  country_city text check (country_city is null or char_length(country_city) <= 100),
  experience_level text check (experience_level is null or char_length(experience_level) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cgs_registrants_name_idx on public.cgs_registrants (name);

create table if not exists public.cgs_session_registrations (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references public.cgs_registrants (id) on delete cascade,
  session_id uuid not null references public.online_sessions (id) on delete cascade,
  source text not null default 'manual',
  registered_at timestamptz not null default now(),
  unique (registrant_id, session_id)
);
create index if not exists cgs_session_registrations_session_idx
  on public.cgs_session_registrations (session_id, registered_at desc);

create table if not exists public.cgs_attendance_records (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references public.cgs_registrants (id) on delete cascade,
  session_id uuid not null references public.online_sessions (id) on delete cascade,
  marked_at timestamptz not null default now(),
  method text not null default 'portal' check (method in ('portal', 'manual-override')),
  override_reason text check (override_reason is null or char_length(override_reason) <= 1000),
  ip_address inet,
  created_at timestamptz not null default now(),
  unique (registrant_id, session_id)
);
create index if not exists cgs_attendance_session_idx
  on public.cgs_attendance_records (session_id, marked_at desc);

create table if not exists public.cgs_speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  title text check (title is null or char_length(title) <= 200),
  organization text check (organization is null or char_length(organization) <= 200),
  bio text check (bio is null or char_length(bio) <= 5000),
  email text check (email is null or char_length(email) <= 254),
  photo_url text check (photo_url is null or char_length(photo_url) <= 2048),
  linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 2048),
  social_links jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cgs_speakers_active_name_idx
  on public.cgs_speakers (is_active desc, name);

create table if not exists public.cgs_session_speakers (
  session_id uuid not null references public.online_sessions (id) on delete cascade,
  speaker_id uuid not null references public.cgs_speakers (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (session_id, speaker_id)
);

create table if not exists public.cgs_google_sheet_connections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  spreadsheet_id text not null check (char_length(spreadsheet_id) between 10 and 200),
  sheet_name text not null check (char_length(sheet_name) between 1 and 300),
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.online_sessions
  drop constraint if exists online_sessions_sheet_connection_id_fkey;
alter table public.online_sessions
  add constraint online_sessions_sheet_connection_id_fkey
  foreign key (sheet_connection_id)
  references public.cgs_google_sheet_connections (id)
  on delete set null;

create table if not exists public.cgs_google_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.cgs_google_sheet_connections (id) on delete set null,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  invalid_count integer not null default 0,
  error_message text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists cgs_google_sync_runs_connection_idx
  on public.cgs_google_sync_runs (connection_id, started_at desc);

create table if not exists public.cgs_portal_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.cgs_portal_settings (key, value) values
  ('portal_open', 'true'),
  ('registration_open', 'true'),
  ('attendance_open', 'true'),
  ('join_cgs_coming_soon', 'false'),
  ('speaker_coming_soon', 'false'),
  ('timezone', 'Asia/Karachi')
on conflict (key) do nothing;

alter table public.cgs_registrants enable row level security;
alter table public.cgs_session_registrations enable row level security;
alter table public.cgs_attendance_records enable row level security;
alter table public.cgs_speakers enable row level security;
alter table public.cgs_session_speakers enable row level security;
alter table public.cgs_google_sheet_connections enable row level security;
alter table public.cgs_google_sync_runs enable row level security;
alter table public.cgs_portal_settings enable row level security;

grant select, insert, update, delete on public.cgs_registrants to authenticated;
grant select, insert, update, delete on public.cgs_session_registrations to authenticated;
grant select, insert, update, delete on public.cgs_attendance_records to authenticated;
grant select, insert, update, delete on public.cgs_speakers to authenticated;
grant select, insert, update, delete on public.cgs_session_speakers to authenticated;
grant select, insert, update, delete on public.cgs_google_sheet_connections to authenticated;
grant select, insert, update, delete on public.cgs_google_sync_runs to authenticated;
grant select, insert, update, delete on public.cgs_portal_settings to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cgs_registrants',
    'cgs_session_registrations',
    'cgs_attendance_records',
    'cgs_speakers',
    'cgs_session_speakers',
    'cgs_google_sheet_connections',
    'cgs_google_sync_runs',
    'cgs_portal_settings'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_manage', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_site_admin())) with check ((select public.is_site_admin()))',
      table_name || '_admin_manage',
      table_name
    );
  end loop;
end;
$$;
