# SQLite Migration Guide

## Status: COMPLETE ✅

The platform no longer depends on Supabase. Every database operation —
frontend and Express backend — now runs against the local SQLite database
(`data/cgs.db`, managed by `sql.js`).

## How it works

1. **Database layer** — `lib/db/`
   - `client.ts` — loads/saves `data/cgs.db` with sql.js.
   - `schema.ts` — idempotent schema (all `cgs_*` tables, indexes, seeds).
   - `sqlite-adapter.ts` — a Supabase-compatible query layer
     (`from().select/insert/update/delete/upsert/eq/ilike/in/order/limit/
     single/maybeSingle`, plus `auth`). This keeps the existing call sites
     working without a Supabase project.
2. **Compatibility modules** — `lib/supabase/`
   - `server.ts` / `service.ts` — client factories (SQLite-backed).
   - `audit.ts` — `logAudit()` writes to `admin_audit_log`.
   - `sessions.ts` — `readPublicOnlineSessions()` for the public site.
3. **Storage** — `lib/supabase-storage.ts` replaces Supabase Storage:
   - Public content images → `public/uploads/content/<kind>/`.
   - Private application files (CVs, application JSON) → `data/private/…`,
     served only through the signed `/api/admin/private-file` route.
4. **Backend** — `backend/src/config/db.ts` uses the same adapter; admin
   login (`POST /api/auth/login`) verifies Argon2id hashes in
   `admin_users`.

## Database schema

Tables: `admin_users`, `online_sessions`, `cgs_speakers`,
`cgs_session_speakers`, `cgs_registrants`, `cgs_session_registrations`,
`cgs_attendance_records`, `cgs_managed_content`, `cgs_inbox_messages`,
`cgs_portal_settings`, `cgs_payment_ledger`, `cgs_google_sheet_connections`,
`cgs_google_sync_runs`, `applications`, `admin_audit_log`.

Booleans are stored as INTEGER 0/1 (round-tripped to JS booleans by the
adapter). JSON columns (`permission_keys`, `social_links`, `metadata`,
`details`) are stored as TEXT and round-tripped to JS objects.

## Admin credentials

The first admin is seeded by `npx tsx scripts/seed-admin.ts` using
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`. Passwords are hashed
with Argon2id (`lib/security/password.ts`); legacy bcrypt hashes are also
accepted.

## Verification

- `npm run typecheck` — frontend + backend TypeScript checks.
- `npx tsx scripts/test-adapter.ts` (or compile+run) — 28 assertions
  covering every query pattern the platform uses.

## Known deployment note

sql.js holds the database in memory and rewrites the file after writes.
Run a single Next.js process per database file in production; if the
Express backend shares the same `data/cgs.db`, deploy it on the same
machine and avoid concurrent write bursts between the two processes.
