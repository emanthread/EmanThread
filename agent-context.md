SYSTEM SAFETY CONTEXT (DO NOT IGNORE)

Before making ANY change to this project:

### 1. DATABASE SAFETY RULE (HIGHEST PRIORITY)

- NEVER run or write destructive SQL (`DROP`, `TRUNCATE`)
    
- ALL schema changes must go through Prisma migrations
    
- ALL migrations must be backup-first
    
- If migration is unsafe → split into:
    
    - add → migrate → remove
        

---

### 2. BACKUP RULE

Before ANY migration:

- Run `pg_dump` backup automatically
    
- Never deploy migrations without backup step
    

---

### 3. SEED RULE

- Seed must ALWAYS be idempotent
    
- Seed must auto-run after:
    
    - migrate deploy
        
    - db reset
        
- Critical users (admin) must self-heal via seed/upsert
    

---

### 4. ENVIRONMENT RULE

- Deployment must FAIL if required env vars missing
    
- No silent fallback allowed for DATABASE_URL / DIRECT_URL
    

---

### 5. AUTH RULE

- JWT must be stateless (no DB calls per request)
    
- DB lookups only on login / refresh events
    
- tokenVersion only checked when necessary
    

---

### 6. API SECURITY RULE

All mutation endpoints must have:

- CSRF protection
    
- rate limiting
    
- input validation
    

---

### 7. DEPLOYMENT RULE

Every deployment must follow:

1. Backup DB
    
2. Run safe migration
    
3. Run seed
    
4. Run health check
    
5. Deploy
    

---

### 8. GOLDEN RULE

> If a change can destroy data, it must be reversible or it must be blocked.

# 🛡️ 🔥 NON-NEGOTIABLE SAFETY RULES

## 1. 🚫 NEVER run destructive DB commands in production

You must treat these as **blocked actions forever**:

- `DROP TABLE`
    
- `TRUNCATE`
    
- `prisma migrate reset`
    
- manual SQL schema edits in production DB
    

👉 Rule:

> If it deletes data → it is NOT allowed in production flow.

---

## 2. 💾 ALWAYS backup before schema changes

Before ANY migration:

- run `pg_dump`
    
- or enable automated DB snapshots (Vercel/Supabase/Neon)
    

👉 Rule:

> No backup = no migration.

---

## 3. 🧱 Only Prisma migrations allowed

No manual SQL schema changes.

Use only:

```bash
prisma migrate dev
prisma migrate deploy
```

👉 Rule:

> Schema changes must be generated, not handwritten.

---

## 4. 🧪 Treat seed as SAFE restore tool (not a reset tool)

Your seed must:

- use `upsert`
    
- NEVER delete existing real data
    
- NEVER "recreate full DB"
    

👉 Rule:

> Seed = recovery, NOT reset.


 Protect critical data (admin, orders, products)

- never delete users automatically
    
- never cascade delete orders/products unless explicitly required
    
- use `onDelete: SetNull` or controlled cascades only
    

---

# 🚨 REDEPLOYMENT POSTMORTEM — THE MISTAKES & THE GOLDEN RULES

## C1 — What Exactly Happened (Root Cause)

When you made local changes and redeployed, one or more of these occurred:

**Mistake 1 (Most Likely)** — You ran `prisma migrate dev` locally while your `.env` pointed to the **PRODUCTION database**.

`prisma migrate dev` is a DEVELOPMENT command. It can:
- Detect schema drift and offer to reset the database
- Auto-run the seed file after migration
- If the seed file had `deleteMany()` or truncate before inserts → wipes all data

**Mistake 2** — Vercel build command ran a destructive migration.

If your `package.json` build script or Vercel build command was:
```json
"build": "prisma migrate dev && next build"   ← WRONG
"build": "prisma db push && next build"        ← WRONG
"build": "prisma migrate reset && next build"  ← CATASTROPHIC
```

These commands run against whichever `DATABASE_URL` Vercel has set → production data wiped.

**Mistake 3** — Seed ran on deploy and used destructive patterns.

If `seed.ts` had:
```typescript
await db.product.deleteMany();   // ← wipes all products
await db.user.deleteMany();      // ← wipes all users
```

Before inserting new data → every deploy reset the database.

---

## C2 — Verify Which Mistake You Made (Check Now)

**Check 1 — Your Vercel build command:**
Go to Vercel → your project → Settings → General → Build & Development Settings.
Look at "Build Command". It should ONLY be:
```bash
next build
```
or at most:
```bash
prisma migrate deploy && next build
```

> **CURRENT STATUS ✅**: `package.json` build script is `"build": "next build"` — safe. No `migrate dev`, `db push`, or `migrate reset` in build.

**Check 2 — Your package.json:**
```bash
cat package.json | grep -A5 '"scripts"'
```

Look for `"build"` and `"postinstall"` scripts. They must NOT contain:
- `prisma migrate dev`
- `prisma db push`
- `prisma migrate reset`
- `prisma db seed` (unless seed is fully idempotent with upserts only)

> **CURRENT STATUS ✅**: `postinstall` is `prisma generate` (safe). Build is `next build` (safe).

**Check 3 — Your seed.ts:**
```bash
grep -n "deleteMany\|truncate\|drop\|DELETE FROM" prisma/seed.ts
```
If ANY results → your seed is destructive.

> **CURRENT STATUS ✅**: `seed.ts` uses ONLY `upsert` — zero `deleteMany`, zero `truncate`, zero `drop`.

---

## C3 — THE GOLDEN RULES (Never Break These)

### Rule 1 — Two Completely Separate Databases

**LOCAL DEVELOPMENT:**
```env
# .env.local (NEVER commit this file)
DATABASE_URL="postgresql://postgres:password@localhost:5432/emanthread_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/emanthread_dev"
```

**PRODUCTION:**
```env
# Only exists on Vercel. Never in your local .env
DATABASE_URL="postgresql://...supabase.com.../postgres"
```

Your local `.env` must **NEVER** point to the Supabase production URL.
If it does → every local command you run risks production data.

### Rule 2 — Command Rules (Print and stick to your wall)

| Command | Where to run | What it does |
|---|---|---|
| `prisma migrate dev` | LOCAL ONLY | Creates migration files, can reset DB |
| `prisma migrate deploy` | PRODUCTION (via Vercel) | Applies pending migrations safely |
| `prisma db push` | LOCAL ONLY (prototyping) | Pushes schema without migration history |
| `prisma migrate reset` | LOCAL ONLY | WIPES entire database and reseeds |
| `prisma db seed` | LOCAL ONLY | Runs seed.ts |
| `prisma studio` | LOCAL ONLY | Visual DB browser |

> **NEVER** run `migrate dev`, `db push`, `migrate reset`, or `db seed` when your `.env` `DATABASE_URL` points to production.

### Rule 3 — Vercel Build Command Must Be Safe

In Vercel → Settings → Build Command, use ONLY:
```bash
npx prisma generate && npx prisma migrate deploy && next build
```

- `prisma generate` → generates Prisma client (safe, no DB changes)
- `prisma migrate deploy` → applies only pending migrations (safe, never resets)
- `next build` → builds the app

> **NEVER** use `migrate dev` or `db push` in Vercel.

### Rule 4 — Make Seed Fully Idempotent (Safe to Run Multiple Times)

Every operation in `prisma/seed.ts` must use `upsert` not `create`:
```typescript
// WRONG — wipes all products every seed run:
await db.product.deleteMany();
await db.product.createMany({ data: products });

// CORRECT — safe to run 100 times:
for (const product of products) {
  await db.product.upsert({
    where: { sku: product.sku },
    update: product,
    create: product,
  });
}
```

> **CURRENT STATUS ✅**: `seed.ts` uses only `upsert` — fully idempotent.

### Rule 5 — Before ANY Local Migration, Check Which DB You're On

Run this before any prisma command:
```bash
grep DATABASE_URL .env | cut -d'@' -f2 | cut -d'/' -f1
```

If output contains `supabase.com` → **you are on PRODUCTION. STOP.**
If output contains `localhost` → **you are on local dev. Safe to proceed.**

### Rule 6 — Backup Before Every Production Migration

Before running `prisma migrate deploy` on Vercel/production,
ALWAYS run this in Supabase SQL Editor first:
```sql
-- Create timestamped backups
CREATE TABLE "User_backup_YYYYMMDD" AS SELECT * FROM "User";
CREATE TABLE "Product_backup_YYYYMMDD" AS SELECT * FROM "Product";
CREATE TABLE "Order_backup_YYYYMMDD" AS SELECT * FROM "Order";
CREATE TABLE "MeasurementProfile_backup_YYYYMMDD" AS SELECT * FROM "MeasurementProfile";
```

Replace `YYYYMMDD` with today's date (e.g., `User_backup_20260611`).

After confirming migration succeeded, you can drop these:
```sql
DROP TABLE "User_backup_YYYYMMDD";
-- etc.
```

---

## C4 — Set Up Local Dev Database (Do This Once, Protect Production Forever)

### Option A — Local PostgreSQL (Recommended)

Install PostgreSQL locally:
```bash
# Windows: download from postgresql.org installer
# Or use Docker:
docker run --name emanthread-dev -e POSTGRES_PASSWORD=devpass -p 5432:5432 -d postgres
```

Create a local dev database:
```bash
psql -U postgres -c "CREATE DATABASE emanthread_dev;"
```

Create `.env.local` (git-ignored):
```env
DATABASE_URL="postgresql://postgres:devpass@localhost:5432/emanthread_dev"
DIRECT_URL="postgresql://postgres:devpass@localhost:5432/emanthread_dev"
```

Run migrations locally:
```bash
npx prisma migrate dev
npx prisma db seed
```

Now your local dev **NEVER** touches production.

### Option B — Supabase Staging Project (If no local PostgreSQL)

Create a **SECOND** free Supabase project called `emanthread-staging`.
Use its URL in your local `.env`.
Production Supabase URL stays **ONLY** on Vercel.

---

## C5 — Git Safety Checklist

Make sure `.gitignore` contains:
```gitignore
.env
.env.local
.env.production
.env.*.local
```

> **NEVER** commit `.env` files. Vercel reads env vars from its dashboard, not from git.

Verify your current `.env` is not committed:
```bash
git status .env
git log --oneline -- .env
```

If `.env` appears in git history → **rotate ALL secrets immediately** (Supabase password, Cloudinary keys, SendPK password, Auth secret, etc.)

---

## C6 — Quick Pre-Deploy Checklist (Run Before Every Vercel Deploy)

Before pushing to git / triggering a Vercel deploy, run:

```bash
# 1. Am I about to push any .env files?
git diff --cached --name-only | grep ".env"
# Expected: no output

# 2. Is my build script safe?
cat package.json | grep '"build"'
# Expected: should NOT contain migrate dev, db push, migrate reset

# 3. Does seed have any deleteMany?
grep -n "deleteMany" prisma/seed.ts
# Expected: 0 results (or only in clearly non-production-data tables)

# 4. What migrations are pending?
npx prisma migrate status
# Review the list before letting Vercel apply them

# 5. Read the latest migration SQL
cat prisma/migrations/$(ls prisma/migrations | tail -1)/migration.sql
# Verify: no DROP TABLE, no DELETE FROM, no TRUNCATE
```

---

## SUMMARY: THE 3 THINGS THAT KILLED YOUR DATA

1. **Wrong `.env`** — your local `.env` pointed to production Supabase. Every command you ran locally (`migrate dev`, `studio`, `seed`) ran against live data.
2. **Wrong build command** — `prisma migrate dev` or `db push` in Vercel build resets/overwrites production schema on every deploy.
3. **Destructive seed** — `seed.ts` used `deleteMany()` before creating records, so every time seed ran (on migration or deploy), all data was wiped.

> **CURRENT STATUS**: All 3 have been fixed:
> - ✅ Build script: `"build": "next build"` (safe)
> - ✅ Seed script: 100% upsert-based, zero deleteMany
> - ✅ Package.json postinstall: `prisma generate` only