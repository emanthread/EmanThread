const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

const site = process.env.STOREFRONT_URL || 'https://www.emanthread.com';

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(`${site}/women`, { waitUntil: 'networkidle', timeout: 60000 });
    const sections = page.locator('nav[aria-label$="sections"]');
    assert.equal(await sections.getAttribute('aria-label'), 'WOMEN sections');
    await page.getByRole('navigation', { name: 'Catalog departments' })
      .getByRole('link', { name: 'Teens' }).hover();
    await page.waitForTimeout(200);
    const onHover = await sections.getAttribute('aria-label');
    await page.mouse.move(1200, 500);
    await page.waitForTimeout(300);
    const afterLeave = await sections.getAttribute('aria-label');
    assert.equal(onHover, 'TEENS sections', 'Hover should preview Teens categories');
    assert.equal(afterLeave, 'WOMEN sections', 'Pointer leave should restore Women categories');
    await page.getByRole('navigation', { name: 'Catalog departments' })
      .getByRole('link', { name: 'Teens' }).focus();
    assert.equal(await sections.getAttribute('aria-label'), 'TEENS sections');
    await page.evaluate(() => {
      const main = document.querySelector('main');
      main.tabIndex = -1;
      main.focus();
    });
    await page.waitForTimeout(100);
    assert.equal(await sections.getAttribute('aria-label'), 'WOMEN sections',
      'Leaving keyboard focus should restore Women categories');

    const productLink = page.locator('a[href^="/product/"]').first();
    const href = await productLink.getAttribute('href');
    const started = Date.now();
    await productLink.click();
    await page.waitForURL(`**${href}`, { timeout: 20000 });
    await page.locator('h1').first().waitFor({ timeout: 20000 });
    const productMs = Date.now() - started;
    assert.equal(await page.getByText('Something went wrong', { exact: true }).isVisible().catch(() => false), false);

    await page.getByRole('link', { name: 'Eman Thread home' }).first().click();
    await page.waitForURL(`${site}/`, { timeout: 20000 });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    const slideTwo = page.getByRole('button', { name: 'Go to slide 2' });
    if (await slideTwo.count()) {
      await slideTwo.click();
      await page.waitForTimeout(450);
      await page.getByRole('link', { name: 'Eman Thread home' }).first().click();
      await page.waitForTimeout(150);
      assert.match(await page.getByRole('button', { name: 'Go to slide 1' }).getAttribute('class'), /w-8/);
    }
    await page.getByRole('navigation', { name: 'Catalog departments' })
      .getByRole('link', { name: 'Teens' }).click();
    await page.locator('div[data-home-department="teens"]').first().waitFor({ timeout: 20000 });
    assert.equal(await page.locator('header[data-home-department]').getAttribute('data-home-department'), 'teens');
    assert.deepEqual(errors, [], 'Browser and server errors during the journey');
    console.log(JSON.stringify({ onHover, afterLeave, productMs, productHref: href, logoUrl: page.url() }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
