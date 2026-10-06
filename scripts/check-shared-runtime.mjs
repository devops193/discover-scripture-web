import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(30000);
const errors = [];
let engineDownloads = 0;
page.on('request', r => { if (/\/entry-[^/]+\.js(?:\.gz)?$/.test(r.url())) engineDownloads++; });
page.on('pageerror', e => { errors.push(e.message); console.log('RUNTIME_ERROR', e.stack); });
page.on('console', m => { if (m.type() === 'error' && /corpus|SQLite|startup|TypeError/i.test(m.text())) errors.push(m.text()); });
const records = [];
const report = { errors, records };
let frame;
try {
  await page.goto(process.env.VIEWPORT_URL || 'http://localhost:3095', { waitUntil: 'domcontentloaded' });
  report.testedOrigin = new URL(page.url()).origin;
  await page.locator('#product-panel [role=status]').waitFor({ state: 'hidden', timeout: 90000 });
  frame = await (await page.locator('#product-panel iframe').elementHandle()).contentFrame();
  const evidence = () => frame.evaluate(() => globalThis.__scriptureRuntimeEvidence());
  const baseline = await evidence();
  console.log('BASELINE', baseline);
  await page.locator('#product-tab-commander').click();
  await frame.getByRole('button', { name: 'Open Discover Account', exact: true }).click();
  await frame.getByRole('button', { name: 'Create Profile', exact: true }).click();
  await frame.getByRole('textbox', { name: 'Display Name', exact: true }).fill('WEBSITE TEST OPERATOR');
  await frame.getByRole('button', { name: 'Save Profile', exact: true }).click();
  await frame.getByLabel('Profile name WEBSITE TEST OPERATOR', {exact:true}).waitFor();
  // Return through the app's Back action to the Commander workspace.
  await frame.getByRole('button', { name: 'Back to Discover', exact: true }).click();
  await frame.getByRole('button', { name: 'Open Church', exact: true }).click();
  await frame.getByRole('button', { name: 'Create Church', exact: true }).click();
  await frame.getByRole('textbox', { name: 'Church Name', exact: true }).fill('WEBSITE TEST MINISTRY');
  await frame.getByRole('button', { name: 'Create Church', exact: true }).click();
  await frame.getByRole('button', { name: 'Open Commander', exact: true }).click();
  console.log('COMMANDER', await frame.locator('body').innerText());
  const switchTo = async product => {
    await page.locator(`#product-tab-${product}`).click();
    await frame.waitForURL(product === 'commander' ? /\/digital-altar\/commander/ : /\/product-app\/(?!digital-altar)/);
    await page.waitForTimeout(250);
  };
  await switchTo('discover');
  await frame.getByText('Abraham', {exact:true}).click();
  await frame.getByRole('button', {name:'Open Character World',exact:true}).click();
  await page.waitForTimeout(1000);
  console.log('WORLD_ROUTE', frame.url());
  report.worldOpened = await evidence();
  await frame.getByText('Abraham World', { exact: true }).waitFor();
  await frame.getByRole('button', { name: "Begin with Abraham's profile", exact: true }).waitFor();
  await frame.getByText('Where the story can go next', { exact: true }).waitFor();
  assert.equal(report.worldOpened.counts.worldRoots, 1);
  assert.equal(report.worldOpened.counts.worldKernel ?? 0, 0);
  report.currentSemanticWorld = true;
  const worldRoute = frame.url();
  await switchTo('commander');
  await switchTo('discover');
  assert.equal(frame.url(), worldRoute);
  report.worldRouteRetained = true;
  // Use app navigation (never fabricate Expo's private history state).
  for (let i=0; i<5 && !(await frame.getByText('Reading',{exact:true}).isVisible()); i++) {
    await frame.getByRole('button', { name: /Leave Character World|Back to/ }).filter({visible:true}).first().click();
    await page.waitForTimeout(250);
  }
  await frame.getByText('Reading', {exact:true}).click();
  await frame.getByRole('button', {name:'Choose Genesis',exact:true}).click();
  await frame.getByRole('button', {name:'Genesis chapter 12',exact:true}).click();
  await frame.getByText('Genesis 12', {exact:true}).first().waitFor();
  console.log('READER', (await frame.locator('body').innerText()).slice(0,500));
  const readerUrl = frame.url();
  const identityBefore = await evidence();
  const start = Date.now();
  await switchTo('commander');
  report.commanderSwitchMs = Date.now() - start;
  await switchTo('discover');
  assert.equal(frame.url(), readerUrl);
  await frame.getByText('Genesis 12', {exact:true}).first().waitFor();
  report.scriptureContextRetained = true;
  for (const [width,height] of [[360,800],[430,930],[768,1024],[1024,768],[1024,1366],[1366,1024],[1440,900]]) {
    await page.setViewportSize({width,height});
    for (const product of ['discover','commander']) {
      await switchTo(product);
      assert.deepEqual(await evidence(), identityBefore);
      assert.equal(await page.locator('iframe').count(), 1);
      const outerOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      const innerOverflow = await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      const text = await frame.locator('body').innerText();
      const switchTargets = await page.locator('[role=tablist] button').evaluateAll(buttons => buttons.map(button => {
        const {width,height}=button.getBoundingClientRect();return {width,height};
      }));
      assert(switchTargets.every(target => target.width >= 44 && target.height >= 44));
      assert(!outerOverflow && !innerOverflow);
      assert(text.includes(product === 'discover' ? 'Genesis 12' : 'Ministry at a glance'));
      records.push({width,height,product,outerOverflow,innerOverflow,switchTargets,engine:await evidence()});
      await page.screenshot({path:`docs/viewport-evidence/${width}x${height}-${product}.png`});
    }
  }
  report.engineIdentityRetained = true;
  await page.locator('#product-tab-commander').focus();
  await page.keyboard.press('Home');
  await frame.waitForURL(/\/reading/);
  await page.keyboard.press('End');
  await frame.waitForURL(/\/digital-altar\/commander/);
  assert.deepEqual(await evidence(), identityBefore);
  report.keyboardSwitch = true;
  assert.equal(engineDownloads, 1);
  report.engineDownloadsBeforeRefresh = engineDownloads;
  console.log('MATRIX_PASS', records.length);
  fs.writeFileSync('docs/viewport-evidence/shared-runtime.json', JSON.stringify(report,null,2));
  await switchTo('discover');
  await switchTo('commander');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#product-tab-discover')?.getAttribute('aria-selected') === 'true');
  await frame.waitForURL(/\/reading/);
  report.browserBack = true;
  console.log('BACK_PASS');
  await page.goForward();
  await frame.waitForURL(/\/digital-altar\/commander/);
  report.browserForward = true;
  console.log('FORWARD_PASS');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#product-panel [role=status]').waitFor({state:'hidden',timeout:90000});
  frame = await (await page.locator('#product-panel iframe').elementHandle()).contentFrame();
  await frame.waitForURL(/\/digital-altar\/commander/);
  await frame.getByText('Ministry at a glance', {exact:true}).waitFor();
  const refreshed = await evidence();
  assert.notEqual(refreshed.engineId, identityBefore.engineId);
  assert.equal(refreshed.counts.canonicalBoot, 1);
  report.refresh = true;
  assert.equal(engineDownloads, 2);
  report.afterRefresh = refreshed;
  assert.deepEqual(errors, []);
  report.status = 'PASS';
} catch(error) {
  console.error(error.message);
  if (frame && !frame.isDetached()) console.log('FAILURE_SCREEN', await frame.locator('body').innerText());
  process.exitCode = 1;
  report.status = 'FAIL'; report.failure = error.message;
} finally {
  console.log('ERRORS', errors);
  if (!page.isClosed()) await page.screenshot({path:'docs/viewport-probe-shared.png'});
  fs.writeFileSync('docs/viewport-evidence/shared-runtime.json', JSON.stringify(report,null,2));
  await browser.close();
}
