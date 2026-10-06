import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.GTM_REVIEW_URL ?? 'http://127.0.0.1:4173';
const output = resolve(process.cwd(), 'docs/review/DISCOVER-GTM-PILOT-01B');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const consoleErrors = [];
const results = { baseURL, generatedAt: new Date().toISOString(), viewports: {}, accessibility: {}, performance: {} };

async function openPage(path, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      consoleErrors.push(`${path}: ${message.text()}${location.url ? ` [${location.url}:${location.lineNumber}]` : ''}`);
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(`${path}: ${error.message}`));
  page.on('response', (response) => { if (response.status() >= 400) consoleErrors.push(`${path}: HTTP ${response.status()} ${response.url()}`); });
  await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  return { context, page };
}

async function loadVisibleOnScroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(500, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
}

const checks = [
  ['phone-portrait', { width: 390, height: 844 }],
  ['phone-landscape', { width: 844, height: 390 }],
  ['tablet-portrait', { width: 820, height: 1180 }],
  ['tablet-landscape', { width: 1180, height: 820 }],
  ['desktop', { width: 1440, height: 1000 }],
];

for (const [name, viewport] of checks) {
  const { context, page } = await openPage('/', viewport);
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    h1Count: document.querySelectorAll('h1').length,
    imageFailures: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute('src')),
    overflowElements: [...document.querySelectorAll('body *')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
    }).slice(0, 12).map((element) => ({ tag: element.tagName.toLowerCase(), className: element.className, right: Math.round(element.getBoundingClientRect().right) })),
  }));
  results.viewports[name] = { ...viewport, ...layout, horizontalOverflow: layout.scrollWidth > layout.clientWidth + 1 };
  await context.close();
}

{
  const { context, page } = await openPage('/', { width: 1440, height: 1000 });
  await loadVisibleOnScroll(page);
  await page.screenshot({ path: resolve(output, 'homepage-desktop.png'), fullPage: true });
  await page.locator('#commander-ce').screenshot({ path: resolve(output, 'commander-ce-desktop.png') });
  await page.locator('#network-and-partners').screenshot({ path: resolve(output, 'network-and-partners-desktop.png') });
  await page.locator('.site-header').screenshot({ path: resolve(output, 'navigation-desktop.png') });
  await context.close();
}

{
  const { context, page } = await openPage('/', { width: 390, height: 844 });
  await loadVisibleOnScroll(page);
  await page.screenshot({ path: resolve(output, 'homepage-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('.site-header').screenshot({ path: resolve(output, 'navigation-mobile.png') });
  results.accessibility.mobileNavigationLabels = await page.locator('#site-navigation a, #site-navigation [aria-disabled="true"]').allTextContents();
  await context.close();
}

for (const [path, file] of [['/church-pilot', 'church-pilot-desktop.png']]) {
  const { context, page } = await openPage(path, { width: 1440, height: 1000 });
  await loadVisibleOnScroll(page);
  await page.screenshot({ path: resolve(output, file), fullPage: true });
  await context.close();
}

{
  const { context, page } = await openPage('/church-pilot', { width: 390, height: 844 });
  const audit = await page.evaluate(() => {
    const unlabeledControls = [...document.querySelectorAll('input, textarea, button, select')].filter((element) => {
      const id = element.getAttribute('id');
      const hasTextName = element.tagName === 'BUTTON' && element.textContent?.trim();
      return !hasTextName && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !element.closest('label') && !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
    }).map((element) => element.outerHTML.slice(0, 120));
    const imagesWithoutAlt = [...document.querySelectorAll('img:not([alt])')].map((image) => image.getAttribute('src'));
    const landmarks = [...document.querySelectorAll('header, nav, main, footer, form')].map((node) => node.tagName.toLowerCase());
    const headingLevels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => Number(heading.tagName.slice(1)));
    return { unlabeledControls, imagesWithoutAlt, landmarks, headingLevels };
  });
  const form = page.locator('form');
  await form.locator('button[type="submit"]').click();
  audit.requiredFieldValidation = await form.locator('input:invalid').count() >= 2;
  await page.keyboard.press('Tab');
  audit.keyboardFocusVisible = await page.evaluate(() => document.activeElement !== document.body && document.activeElement?.matches(':focus-visible'));
  results.accessibility = { ...results.accessibility, ...audit };
  await context.close();
}

{
  const { context, page } = await openPage('/', { width: 390, height: 844 });
  results.performance = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const initial = resources.filter((entry) => entry.startTime < 2500);
    return {
      navigation: performance.getEntriesByType('navigation').map((entry) => ({
        domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
        loadMs: Math.round(entry.loadEventEnd),
        transferBytes: entry.transferSize,
      }))[0],
      initialResourceCount: initial.length,
      initialTransferBytes: initial.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      initialImages: initial.filter((entry) => entry.initiatorType === 'img').map((entry) => entry.name),
      initialIframes: initial.filter((entry) => entry.initiatorType === 'iframe').map((entry) => entry.name),
    };
  });
  await context.close();
}

results.consoleErrors = [...new Set(consoleErrors)].filter((message) => !message.includes('favicon'));
await browser.close();
await writeFile(resolve(output, 'validation.json'), `${JSON.stringify(results, null, 2)}\n`);

const failed = Object.values(results.viewports).some((viewport) => viewport.horizontalOverflow || viewport.h1Count !== 1 || viewport.imageFailures.length)
  || results.accessibility.unlabeledControls.length
  || results.accessibility.imagesWithoutAlt.length
  || !results.accessibility.requiredFieldValidation
  || results.consoleErrors.length;

console.log(JSON.stringify(results, null, 2));
if (failed) process.exitCode = 1;
