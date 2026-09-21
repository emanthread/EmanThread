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
  test("Vercel generates the Prisma client without running schema-engine checks", () => {
    expect(vercelConfig.buildCommand).toBe("npm run vercel-build");
    expect(packageJson.scripts["vercel-build"]).toBe(
      "prisma generate && next build"
    );
  });

  test("the default Hostinger build avoids the non-executable schema engine", () => {
    expect(packageJson.scripts["build"]).toBe(
      "prisma generate && next build"
    );
  });

  test("the deployment build never mutates or seeds the production database", () => {
    const buildCommands = [
      packageJson.scripts["build"],
      packageJson.scripts["vercel-build"],
    ].join(" ");

    expect(buildCommands).not.toMatch(
      /migrate (deploy|status|reset)|db push|seed/i
    );
    expect(packageJson.scripts["db:migrate-safe"]).toBe(
      "prisma migrate deploy"
    );
  });
});
