import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { requiresCatalogSelection } from '../lib/catalog-editor-policy';

test('existing product edits preserve their assignments until the category is deliberately changed', () => {
  expect(requiresCatalogSelection(true, false)).toBe(false);
  expect(requiresCatalogSelection(true, true)).toBe(true);
  expect(requiresCatalogSelection(false, false)).toBe(true);
  expect(requiresCatalogSelection(false, true)).toBe(true);
});

for (const setting of [undefined, 'false', 'true']) {
  test('category tools rollout preserves purchase behavior with setting ' + String(setting), () => {
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_CATALOG_ADMIN_ASSIGNMENTS_V1;
    if (setting !== undefined) env.NEXT_PUBLIC_CATALOG_ADMIN_ASSIGNMENTS_V1 = setting;
    const output = execFileSync(process.execPath, ['--import', 'tsx', '-e', "const { FEATURE_FLAGS } = require('./lib/feature-flags.ts'); console.log(JSON.stringify({ admin: FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1, purchase: FEATURE_FLAGS.CATALOG_PRODUCT_CONTEXT_V1 }));"], { env, encoding: 'utf8', cwd: process.cwd() });
    expect(JSON.parse(output)).toEqual({ admin: setting !== 'false', purchase: setting === 'true' });
  });
}
