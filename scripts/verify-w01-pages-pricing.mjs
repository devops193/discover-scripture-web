import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.W01_URL || 'http://localhost:4101';
const result = { checkedAt: new Date().toISOString(), base, pages: [], price: '$9.99 USD', productionPush: false };
try {
  await page.goto(base);
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  assert.match(await page.locator('#pricing').innerText(), /\$9\.99 USD/);
  assert.match(await page.locator('#pricing').innerText(), /One purchase\. No subscription\./);
  await page.screenshot({ path: 'docs/w01-evidence/pricing-phone.png' });
  for (const [label, path, heading] of [['About','/about','About Discover Scripture'],['Support','/support','Support'],['Privacy','/privacy','Privacy Policy'],['Terms','/terms','Terms & Conditions']]) {
    await page.locator('footer').getByRole('link', { name: label, exact: true }).click();
    await page.waitForURL(base + path);
    await page.getByRole('heading', { name: heading, exact: true, level: 1 }).waitFor();
    assert.equal((await page.request.get(base + path, { maxRedirects: 0 })).status(), 200);
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    result.pages.push({ label, path, status: 200, footerNavigation: 'PASS', mobileOverflow: false });
    await page.screenshot({ path: `docs/w01-evidence/${label.toLowerCase()}-phone.png`, fullPage: true });
  }
  const sitemap = await (await page.request.get(base + '/sitemap.xml')).text();
  for (const row of result.pages) assert(sitemap.includes('https://www.dscripture.com' + row.path));
  result.result = 'PASS';
} catch (error) { result.result = 'FAIL'; result.error = String(error); process.exitCode = 1; }
finally {
  fs.writeFileSync('docs/w01-evidence/pages-pricing-verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
