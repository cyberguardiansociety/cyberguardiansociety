# Supabase Removal Notes

## Status: COMPLETE ✅

Supabase has been fully removed from the platform — frontend AND backend.
There are no remaining Supabase imports, packages, or runtime dependencies.
See `SQLITE_MIGRATION_GUIDE.md` for the replacement architecture.

## What was removed

- Supabase npm packages (`@supabase/supabase-js`, `@supabase/ssr`).
- `lib/supabase/` Supabase implementation (replaced by SQLite-backed
  compatibility modules that keep the same exported names).
- Supabase Storage (replaced by local filesystem storage in
  `lib/supabase-storage.ts` + the signed `/api/admin/private-file` route).
- Supabase Auth (replaced by SQLite `admin_users` + Argon2id verification
  in `lib/security/password.ts`).
- Supabase-related environment variables.

## What replaced it

| Former Supabase piece        | Replacement                                        |
| ---------------------------- | -------------------------------------------------- |
| PostgREST query client       | `lib/db/sqlite-adapter.ts` (Supabase-compatible API)|
| `auth.admin.createUser` etc. | `auth.admin` on the SQLite client                  |
| Supabase Auth login          | `admin_users.password_hash` + Argon2id             |
| Supabase Storage             | `public/uploads/` + `data/private/`                |
| Realtime subscriptions       | Not used by this platform                          |
| Row-level security           | Application-level `requirePermission()` checks     |
