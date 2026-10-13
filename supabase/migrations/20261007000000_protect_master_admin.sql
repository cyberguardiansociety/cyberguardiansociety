alter table public.admin_users
  add column if not exists username text,
  add column if not exists is_protected boolean not null default false;

create unique index if not exists admin_users_username_ci_uidx
  on public.admin_users (lower(username))
  where username is not null;

create or replace function public.prevent_protected_admin_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.is_protected then
    raise exception 'Protected administrator credentials cannot be changed or deleted.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_users_mutation on public.admin_users;
create trigger protect_admin_users_mutation
  before update or delete on public.admin_users
  for each row execute function public.prevent_protected_admin_mutation();
