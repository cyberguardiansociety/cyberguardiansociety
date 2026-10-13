insert into public.cgs_portal_settings (key, value) values
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'Our website is temporarily unavailable while we complete scheduled maintenance. Please check back soon.')
on conflict (key) do nothing;
