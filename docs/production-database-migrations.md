# Production database migrations

The Vercel build is deliberately read-only with respect to the database. It
generates the Prisma client, checks migration status, and only then builds the
application. When a migration is pending, Vercel must stop the new deployment
so that the previous working deployment and product listing stay online.

For a production schema change:

1. Take and verify a database backup using the hosting provider's production
   backup process.
2. Run `npm run db:migrate:status` against the intended production database.
3. Review every pending SQL migration for destructive statements.
4. Run `npm run db:migrate-safe` to apply committed migrations only.
5. Run `npm run db:verify-catalog` for a read-only product/catalog check.
6. Deploy the application.

Never use `prisma migrate reset`, `prisma db push`, or `npm run db:seed`
against production. The Vercel build must not run migrations automatically.
