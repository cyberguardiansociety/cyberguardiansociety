alter table public.admin_users
  add column if not exists permission_keys text[] not null default '{}'::text[];

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in (
    'super_admin', 'admin', 'content_manager', 'session_manager',
    'speaker_manager', 'finance_manager', 'inbox_manager', 'auditor', 'limited_admin'
  ));

create or replace function public.has_admin_permission(requested_permission text)
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
      and (
        role in ('super_admin', 'admin')
        or requested_permission = any(permission_keys)
      )
  );
$$;

revoke all on function public.has_admin_permission(text) from public;
grant execute on function public.has_admin_permission(text) to authenticated;

create policy online_sessions_permission_manage
  on public.online_sessions for all to authenticated
  using (public.has_admin_permission('sessions'))
  with check (public.has_admin_permission('sessions'));

create policy cgs_registrants_permission_manage
  on public.cgs_registrants for all to authenticated
  using (public.has_admin_permission('sessions'))
  with check (public.has_admin_permission('sessions'));
create policy cgs_session_registrations_permission_manage
  on public.cgs_session_registrations for all to authenticated
  using (public.has_admin_permission('sessions'))
  with check (public.has_admin_permission('sessions'));
create policy cgs_attendance_records_permission_manage
  on public.cgs_attendance_records for all to authenticated
  using (public.has_admin_permission('sessions'))
  with check (public.has_admin_permission('sessions'));
create policy cgs_portal_settings_permission_manage
  on public.cgs_portal_settings for all to authenticated
  using (public.has_admin_permission('sessions'))
  with check (public.has_admin_permission('sessions'));
create policy google_connections_permission_manage
  on public.cgs_google_sheet_connections for all to authenticated
  using (public.has_admin_permission('google_sync'))
  with check (public.has_admin_permission('google_sync'));
create policy google_sync_runs_permission_manage
  on public.cgs_google_sync_runs for all to authenticated
  using (public.has_admin_permission('google_sync'))
  with check (public.has_admin_permission('google_sync'));

create table if not exists public.cgs_managed_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('announcement', 'product', 'merchandise', 'resource')),
  title text not null check (char_length(title) between 2 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 180),
  summary text not null check (char_length(summary) between 1 and 800),
  body text check (body is null or char_length(body) <= 8000),
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  action_url text check (action_url is null or char_length(action_url) <= 2048),
  category text check (category is null or char_length(category) <= 100),
  price numeric(12,2) check (price is null or price >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, slug)
);

create index if not exists cgs_managed_content_public_idx
  on public.cgs_managed_content (content_type, sort_order, created_at desc)
  where status = 'published';

create table if not exists public.cgs_payment_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('payment', 'refund', 'failed', 'commission')),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payer text not null check (char_length(payer) between 1 and 180),
  payee text check (payee is null or char_length(payee) <= 180),
  reference text not null check (char_length(reference) between 1 and 180),
  payment_method text check (payment_method is null or char_length(payment_method) <= 80),
  commission numeric(12,2) not null default 0 check (commission >= 0),
  occurred_at timestamptz not null default now(),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cgs_payment_ledger_date_idx
  on public.cgs_payment_ledger (occurred_at desc);

alter table public.cgs_managed_content enable row level security;
alter table public.cgs_payment_ledger enable row level security;

grant select on public.cgs_managed_content to anon, authenticated;
grant insert, update, delete on public.cgs_managed_content to authenticated;
grant select, insert, update on public.cgs_payment_ledger to authenticated;

create policy cgs_managed_content_public_read
  on public.cgs_managed_content for select to anon, authenticated
  using (status = 'published');
create policy cgs_managed_content_admin_read
  on public.cgs_managed_content for select to authenticated
  using (public.has_admin_permission('content_' || content_type));
create policy cgs_managed_content_admin_insert
  on public.cgs_managed_content for insert to authenticated
  with check (public.has_admin_permission('content_' || content_type));
create policy cgs_managed_content_admin_update
  on public.cgs_managed_content for update to authenticated
  using (public.has_admin_permission('content_' || content_type))
  with check (public.has_admin_permission('content_' || content_type));
create policy cgs_managed_content_admin_delete
  on public.cgs_managed_content for delete to authenticated
  using (public.has_admin_permission('content_' || content_type));

create policy cgs_payment_ledger_admin_read
  on public.cgs_payment_ledger for select to authenticated
  using (public.has_admin_permission('payments'));
create policy cgs_payment_ledger_admin_insert
  on public.cgs_payment_ledger for insert to authenticated
  with check (public.has_admin_permission('payments'));
create policy cgs_payment_ledger_admin_update
  on public.cgs_payment_ledger for update to authenticated
  using (public.has_admin_permission('payments'))
  with check (public.has_admin_permission('payments'));

create policy admin_users_manage_admins
  on public.admin_users for all to authenticated
  using (public.has_admin_permission('admins'))
  with check (public.has_admin_permission('admins'));

create policy cgs_audit_read_auditors
  on public.admin_audit_log for select to authenticated
  using (public.has_admin_permission('audit'));

create policy cgs_speaker_applications_read
  on public.cgs_inbox_messages for select to authenticated
  using (
    metadata ->> 'source' = 'speaker-application'
    and public.has_admin_permission('speaker_applications')
  );
create policy cgs_speaker_applications_update
  on public.cgs_inbox_messages for update to authenticated
  using (
    metadata ->> 'source' = 'speaker-application'
    and public.has_admin_permission('speaker_applications')
  )
  with check (
    metadata ->> 'source' = 'speaker-application'
    and public.has_admin_permission('speaker_applications')
  );
grant delete on public.cgs_inbox_messages to authenticated;
create policy cgs_speaker_applications_delete
  on public.cgs_inbox_messages for delete to authenticated
  using (
    metadata ->> 'source' = 'speaker-application'
    and public.has_admin_permission('speaker_applications')
  );

create policy cgs_speakers_permission_manage
  on public.cgs_speakers for all to authenticated
  using (public.has_admin_permission('speakers'))
  with check (public.has_admin_permission('speakers'));
create policy cgs_session_speakers_permission_manage
  on public.cgs_session_speakers for all to authenticated
  using (
    public.has_admin_permission('speakers')
    or public.has_admin_permission('sessions')
  )
  with check (
    public.has_admin_permission('speakers')
    or public.has_admin_permission('sessions')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cgs-public-assets', 'cgs-public-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy cgs_public_assets_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'cgs-public-assets');
create policy cgs_public_assets_admin_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cgs-public-assets'
    and public.has_admin_permission('content_' || split_part(name, '/', 1))
  );
create policy cgs_public_assets_admin_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'cgs-public-assets'
    and public.has_admin_permission('content_' || split_part(name, '/', 1))
  )
  with check (
    bucket_id = 'cgs-public-assets'
    and public.has_admin_permission('content_' || split_part(name, '/', 1))
  );
create policy cgs_public_assets_admin_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cgs-public-assets'
    and public.has_admin_permission('content_' || split_part(name, '/', 1))
  );

create or replace function public.audit_managed_record_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  row_data jsonb;
  record_id text;
  audit_entity text;
  audit_details jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  record_id := coalesce(row_data ->> 'id', 'unknown');
  audit_entity := tg_table_name;
  audit_details := jsonb_build_object('operation', lower(tg_op));
  if tg_table_name = 'cgs_managed_content' then
    audit_details := audit_details || jsonb_build_object('content_type', row_data ->> 'content_type', 'title', row_data ->> 'title', 'status', row_data ->> 'status');
  elsif tg_table_name = 'cgs_payment_ledger' then
    audit_details := audit_details || jsonb_build_object('entry_type', row_data ->> 'entry_type', 'status', row_data ->> 'status');
  elsif tg_table_name = 'admin_users' then
    record_id := coalesce(row_data ->> 'user_id', 'unknown');
    audit_details := audit_details || jsonb_build_object('role', row_data ->> 'role', 'active', row_data ->> 'active');
  end if;

  insert into public.admin_audit_log (actor_id, action, entity, entity_id, details)
  values ((select auth.uid()), lower(tg_op), audit_entity, record_id, audit_details);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.audit_managed_record_change() from public;
grant execute on function public.audit_managed_record_change() to authenticated;

drop trigger if exists cgs_managed_content_audit on public.cgs_managed_content;
create trigger cgs_managed_content_audit after insert or update or delete on public.cgs_managed_content
  for each row execute function public.audit_managed_record_change();
drop trigger if exists cgs_payment_ledger_audit on public.cgs_payment_ledger;
create trigger cgs_payment_ledger_audit after insert or update on public.cgs_payment_ledger
  for each row execute function public.audit_managed_record_change();
drop trigger if exists admin_users_audit on public.admin_users;
create trigger admin_users_audit after insert or update or delete on public.admin_users
  for each row execute function public.audit_managed_record_change();
