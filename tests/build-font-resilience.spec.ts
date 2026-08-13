import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production builds do not depend on remote Google Font downloads", () => {
  const layout = source("app/layout.tsx");
  const globals = source("app/globals.css");

  expect(layout).not.toContain('from "next/font/google"');
  expect(layout).toContain('className="font-sans antialiased"');
  expect(globals).toContain("ui-sans-serif, system-ui");
  expect(globals).toContain('Georgia, "Times New Roman", serif');
});

test("PWA build tooling uses the stable source-map release", () => {
  const packageJson = JSON.parse(source("package.json")) as {
    dependencies: Record<string, string>;
  };
  const lockfile = source("package-lock.json");

  expect(packageJson.dependencies["@serwist/next"]).toBe("9.5.12");
  expect(packageJson.dependencies.serwist).toBe("9.5.12");
  expect(lockfile).toContain('"source-map": "0.8.0"');
  expect(lockfile).not.toContain('"source-map": "0.8.0-beta.0"');
});
