import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('admin and authentication routes have private no-store response headers', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "const { default: config } = await import('./next.config.mjs'); console.log(JSON.stringify(await config.headers()));",
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  const rules = JSON.parse(output.trim().split(/\r?\n/).at(-1) ?? '[]') as Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;

  for (const source of ['/admin/:path*', '/api/admin/:path*', '/api/auth/:path*', '/api/user/:path*']) {
    const rule = rules.find((candidate) => candidate.source === source);
    const cacheControl = rule?.headers.find((header) => header.key.toLowerCase() === 'cache-control')?.value ?? '';
    expect(cacheControl, source).toContain('private');
    expect(cacheControl, source).toContain('no-store');
  }
});