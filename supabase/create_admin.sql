-- Create the Auth user in Supabase Dashboard first, with email confirmed.
-- Set user metadata username to "Master" there if needed. Never put a password here.
-- Apply migrations/20261004000000_admin_sessions.sql before running this file.

begin;

do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower('admin@example.com');

  if target_user_id is null then
    raise exception 'No Supabase Auth user found for the configured admin email.';
  end if;

  insert into public.admin_users (user_id, role, active)
  values (target_user_id, 'super_admin', true)
  on conflict (user_id) do update
    set role = excluded.role,
        active = true;
end;
$$;

commit;
