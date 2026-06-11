# 🛡️ AGENT SAFETY CONTEXT — Eman Thread

## 🚫 NEVER Do
- Destructive SQL (`DROP`, `TRUNCATE`, `DELETE FROM`)
- `prisma migrate dev`, `db push`, `migrate reset` against production DB
- `deleteMany()` in seed

## ✅ Always Do
- All schema changes → Prisma migrations only
- Backup before ANY migration (`pg_dump` or Supabase SQL snapshot)
- Seed must use `upsert` only (idempotent, safe to re-run)
- Local `.env` → localhost only (NEVER supabase.com)
- Production `DATABASE_URL` exists ONLY on Vercel

## Vercel Build Command (Safe)
```bash
npx prisma generate && npx prisma migrate deploy && next build
```
No `migrate dev`, `db push`, `migrate reset`, or `db seed` in build.

## API Security
All mutation endpoints require: CSRF protection, rate limiting, input validation.

## Auth
JWT stateless — no DB calls per request. DB lookups only on login/refresh.

## Pre-Deploy Checklist
1. Backup DB
2. Run safe migration (`prisma migrate deploy`)
3. Run seed (if needed — safe upsert only)
4. Health check
5. Deploy

## Golden Rule
> If a change can destroy data, it must be reversible or blocked.