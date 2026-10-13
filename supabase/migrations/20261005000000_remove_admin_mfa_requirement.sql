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
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;