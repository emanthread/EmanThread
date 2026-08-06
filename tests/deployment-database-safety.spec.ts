import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const root = resolve(__dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8")
) as { scripts: Record<string, string> };
const vercelConfig = JSON.parse(
  readFileSync(resolve(root, "vercel.json"), "utf8")
) as { buildCommand?: string };

test.describe("production database deployment safety", () => {
  test("Vercel refuses to publish against a database with pending migrations", () => {
    expect(vercelConfig.buildCommand).toBe("npm run vercel-build");
    expect(packageJson.scripts["vercel-build"]).toBe(
      "prisma generate && prisma migrate status && next build"
    );
  });

  test("the deployment build never mutates or seeds the production database", () => {
    const buildCommand = packageJson.scripts["vercel-build"];

    expect(buildCommand).not.toMatch(
      /migrate deploy|migrate reset|db push|seed/i
    );
    expect(packageJson.scripts["db:migrate-safe"]).toBe(
      "prisma migrate deploy"
    );
  });
});
