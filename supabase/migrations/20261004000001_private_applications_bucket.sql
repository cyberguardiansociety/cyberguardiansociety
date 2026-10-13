insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-private',
  'admin-private',
  false,
  5242880,
  array['application/pdf', 'application/json']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;