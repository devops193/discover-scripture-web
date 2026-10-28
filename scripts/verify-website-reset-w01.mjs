import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const base = process.env.W01_URL || 'http://localhost:4101';
const out = 'docs/w01-evidence';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
const report = { base, checkedAt: new Date().toISOString(), routes: [], viewports: [], app: {}, errors: [], productionPush: false };
page.on('pageerror', e => report.errors.push(e.message));
const banned = /Commander CE|Digital Altar|Church Edition|church pilot|Network and Partners|institutional sales|ministry workspace/i;
try {
  for (const path of ['/', '/about', '/privacy', '/terms', '/support', '/sitemap.xml', '/robots.txt', '/product-app/']) {
    const response = await page.request.get(base + path);
    const body = await response.text();
    report.routes.push({ path, status: response.status() });
    assert.equal(response.status(), 200, path);
    if (!path.startsWith('/product-app') && path !== '/robots.txt') assert(!banned.test(body), `Promotional copy in ${path}`);
  }
  for (const path of ['/church-edition', '/church-pilot', '/commander-ce', '/digital-altar', '/network-and-partners', '/partners', '/investors']) {
    const response = await page.request.get(base + path, { maxRedirects: 0 });
    report.routes.push({ path, status: response.status(), location: response.headers().location });
    assert.equal(response.status(), 308, path);
    assert.equal(response.headers().location, '/');
  }
  await page.goto(base + '/?product=commander', { waitUntil: 'domcontentloaded' });
  await page.locator('#product-panel [role=status]').waitFor({ state: 'hidden', timeout: 120000 });
  const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  const entryText = await frame.locator('body').innerText();
  assert(entryText.includes('Character') && entryText.includes('Concept'));
  assert(!frame.url().includes('digital-altar'));
  report.app.legacyMarketingQueryStillOpensDiscover = true;
  report.app.entryUrl = frame.url();
  for (const [name, width, height] of [['desktop',1440,1000],['tablet',768,1024],['phone',390,844],['small-phone',320,740],['landscape',844,390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, appTop: document.querySelector('iframe').getBoundingClientRect().top }));
    assert(!layout.overflow, name);
    assert(layout.appTop < height - 50, `${name}: app must be visible immediately`);
    assert(!(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `${name}: inner overflow`);
    await page.screenshot({ path: `${out}/after-${name}.png`, fullPage: true });
    report.viewports.push({ name, width, height, ...layout });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '200% text overflow');
  report.textScaling200Percent = true;
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.locator('.reset-open').focus();
  assert(await page.locator('.reset-open').evaluate(e => e === document.activeElement));
  report.keyboardEntryFocusable = true;
  await frame.getByText('Abraham', { exact: true }).first().click();
  await frame.getByRole('button', { name: 'Open Character World', exact: true }).click();
  await frame.getByText('Abraham World', { exact: true }).waitFor();
  report.app.characterWorld = frame.url();
  await page.screenshot({ path: `${out}/after-character-world.png` });
  // The app restores the last World on reload. Use its real Back controls.
  for (let i = 0; i < 5 && !(await frame.getByText('Reading', { exact: true }).isVisible()); i++) {
    await frame.getByRole('button', { name: /Leave Character World|Back to/ }).filter({ visible: true }).first().click();
    await page.waitForTimeout(250);
  }
  await frame.getByText('Reading', { exact: true }).waitFor();
  await frame.getByText('Reading', { exact: true }).click();
  await frame.getByRole('button', { name: 'Choose Genesis', exact: true }).click();
  await frame.getByRole('button', { name: 'Genesis chapter 1', exact: true }).click();
  await frame.getByText('In the beginning, God created the heavens and the earth.', { exact: false }).first().waitFor();
  report.app.reading = { route: frame.url(), openingTextVerified: 'In the beginning, God created the heavens and the earth.' };
  await page.screenshot({ path: `${out}/after-reading.png` });
  const standalone = await browser.newPage();
  await standalone.goto(base + '/product-app/reading');
  // A fresh standalone reader has no saved chapter; it correctly offers books.
  await standalone.getByText('Choose a book', { exact: true }).waitFor({ timeout: 90000 });
  await standalone.getByText('Genesis', { exact: true }).waitFor();
  report.app.standaloneDeepLink = 'PASS: fresh reader opens the book chooser';
  await standalone.close();
  const manifest = fs.readFileSync('public/product-app/build-manifest.json');
  report.app.manifestSha256 = createHash('sha256').update(manifest).digest('hex');
  report.app.provenance = JSON.parse(manifest).provenance;
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL'; report.failure = String(error);
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(`${out}/verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
