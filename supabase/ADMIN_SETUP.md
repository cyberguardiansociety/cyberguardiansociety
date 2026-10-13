# Admin Setup

Admin access uses Supabase Auth sessions and the `admin_users` table. The `/admin` path is not secret and is not an authorization control; every protected page and write checks the authenticated user against this table, and database row-level security repeats the check.

1. Apply `migrations/20261004000000_admin_sessions.sql` to the Supabase project.
2. Disable public signups and create the administrator account in Supabase Auth with email confirmation enabled.
3. Add the account's Auth user UUID to `public.admin_users` with the `super_admin` role using the Supabase SQL editor.
4. Apply `migrations/20261005000000_remove_admin_mfa_requirement.sql` so admin RLS checks do not require an AAL2 session. The application login is password-only; set the Supabase Auth MFA policy to Optional or Disabled if it is currently Enforced.
5. Apply `migrations/20261005010000_add_attendance_portal.sql` to enable session timing, attendance, registrants, speakers, and Google Sheets management.
6. Apply `migrations/20261005020000_add_submission_inbox.sql` to persist and review contact and membership enquiries, then sign in at `/admin/login`.

The membership application route stores CVs and application records in the private `admin-private` Storage bucket. Apply the storage bucket migration before accepting applications. Do not add public read policies for this bucket; the server uploads with its service-role key.

```sql
insert into public.admin_users (user_id, role)
values ('SUPABASE_AUTH_USER_UUID', 'super_admin');
```

The application uses the publishable/anon key with the signed-in user's cookies. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; never add it to a `NEXT_PUBLIC_` variable or send it to the browser.

Google Sheets sync requires the server-only `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` variables. Enable the Google Sheets API in Google Cloud and share each source spreadsheet with that service account as a Viewer. The private key must never be exposed to the browser.
