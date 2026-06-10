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
    
- NEVER “recreate full DB”
    

👉 Rule:

> Seed = recovery, NOT reset.


 Protect critical data (admin, orders, products)

- never delete users automatically
    
- never cascade delete orders/products unless explicitly required
    
- use `onDelete: SetNull` or controlled cascades only
    

