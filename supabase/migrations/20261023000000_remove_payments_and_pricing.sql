-- Remove the payment ledger subsystem and product pricing from the platform.
--
-- Apply this in the Supabase SQL Editor (or with `supabase db push`).
-- It is safe to run more than once.

-- 1. Payment ledger ---------------------------------------------------------
-- Cascades to the ledger's RLS policies and audit trigger.
drop table if exists public.cgs_payment_ledger cascade;

-- Drop the payment permission from any administrator who still has it.
update public.admin_users
set permission_keys = array_remove(permission_keys, 'payments')
where 'payments' = any(permission_keys);

-- Re-create the shared audit trigger function without the ledger branch.
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

-- 2. Product / merchandise pricing -----------------------------------------
alter table public.cgs_managed_content
  drop column if exists price,
  drop column if exists currency;
