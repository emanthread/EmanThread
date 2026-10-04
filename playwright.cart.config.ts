import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: ['cart-inventory.spec.ts', 'cart-inventory-server.spec.ts'], outputDir: '.next/cart-unit-results', workers: 1, reporter: 'list' });
