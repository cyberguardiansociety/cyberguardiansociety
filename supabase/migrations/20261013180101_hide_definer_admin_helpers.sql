create schema if not exists private authorization postgres;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_site_admin() set schema private;
alter function public.has_admin_permission(text) set schema private;
alter function public.audit_attendance_portal_change() set schema private;
alter function public.audit_managed_record_change() set schema private;
alter function public.audit_online_session_change() set schema private;

revoke all on function private.is_site_admin() from public, anon;
revoke all on function private.has_admin_permission(text) from public, anon;
revoke all on function private.audit_attendance_portal_change() from public, anon;
revoke all on function private.audit_managed_record_change() from public, anon;
revoke all on function private.audit_online_session_change() from public, anon;

grant execute on function private.is_site_admin() to authenticated, service_role;
grant execute on function private.has_admin_permission(text) to authenticated, service_role;
grant execute on function private.audit_attendance_portal_change() to authenticated, service_role;
grant execute on function private.audit_managed_record_change() to authenticated, service_role;
grant execute on function private.audit_online_session_change() to authenticated, service_role;

notify pgrst, 'reload schema';
