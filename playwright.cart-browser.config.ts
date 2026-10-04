import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: ['cart-checkout-browser.spec.ts'], outputDir: '.next/cart-browser-results', workers: 1, reporter: 'list', timeout: 60000, use: { baseURL: 'http://127.0.0.1:3118', headless: true } });
