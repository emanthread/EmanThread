import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // NOTE: The migrations.seed hook has been intentionally removed.
  // Automatically running the seed after every `prisma migrate dev` is
  // dangerous — it risks executing destructive operations on production data.
  //
  // To seed the database manually and safely, run:
  //   npx prisma db seed
  //
  // This only runs prisma/seed.ts which is fully idempotent and safe.
});
