import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';

const build = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-private-export.json'));
const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
assert.equal(build.revision, proof.revision, 'Rebuild private export against current packet revision');
const requests = [];
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  let file;
  if (pathname.startsWith(`/sdw/${proof.revision}/`) && /^[a-f0-9]{64}\.json$/.test(path.basename(pathname))) file = path.join(build.packetRoot, path.basename(pathname));
  else if (pathname.startsWith('/product-app')) {
    const relative = pathname.slice('/product-app'.length).replace(/^\//, '');
    file = path.resolve(build.output, relative || 'index.html');
    if (!file.startsWith(build.output + '/')) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(build.output, 'index.html');
  }
  if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
  if (/\.(js|db|sqlite)$/.test(file) && !file.endsWith('/boot.js')) res.setHeader('Content-Encoding', 'br');
  res.setHeader('Cache-Control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  requests.push({ path: pathname, bytes: fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], messages = [];
let report;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/product-app/`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => Boolean(globalThis.__scriptureRuntimeEvidence), null, { timeout: 45000 });
  // Wait for visible real product content or an explicit route error, not a
  // fabricated readiness flag or isolated-reader harness.
  await page.getByText(/Discover|Something went wrong|Acquisition|required|Error/i).first().waitFor({ timeout: 45000 });
  const text = await page.locator('body').innerText();
  await page.screenshot({ path: 'docs/01b-evidence/r2a-private-startup.png', fullPage: false });
  const startupRequestCount = requests.length;
  await page.getByText('Abraham', { exact: true }).first().click();
  await page.getByText('Open Character World', { exact: true }).waitFor({ timeout: 45000 });
  const topicText = await page.locator('body').innerText();
  await page.getByText('Open Character World', { exact: true }).click();
  await page.getByText(/World branches|World unavailable/).first().waitFor({ timeout: 45000 });
  const worldText = await page.locator('body').innerText();
  await page.getByRole('button', { name: 'Scenes · 71', exact: true }).click();
  await page.getByRole('button', { name: /^1\. / }).first().click();
  await expect(page.getByRole('button', { name: 'Return to previous focus', exact: true })).toBeEnabled({ timeout: 45000 });
  const sceneText = await page.locator('body').innerText();
  const beforeReturn = requests.length;
  await page.getByRole('button', { name: 'Return to previous focus', exact: true }).click();
  await page.getByRole('button', { name: /^1\. / }).first().click();
  await expect(page.getByRole('button', { name: 'Return to previous focus', exact: true })).toBeEnabled({ timeout: 45000 });
  assert.equal(requests.length, beforeReturn, 'Repeated World Scene must not request packets again');
  await page.getByRole('button', { name: /^Open QUESTION/ }).first().click();
  await expect(page.getByText('QUESTION', { exact: true })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: /^Open FINDING/ }).first().click();
  await expect(page.getByText('FINDING', { exact: true })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: /^Open EVIDENCE/ }).first().click();
  await expect(page.getByText('EVIDENCE', { exact: true })).toBeVisible({ timeout: 45000 });
  const evidenceText = await page.locator('body').innerText();
  const worldEvidence = await page.evaluate(() => ({ runtime: globalThis.__scriptureRuntimeEvidence?.(), progressive: globalThis.__scriptureProgressiveEvidence?.() }));
  const readPacket = d => JSON.parse(fs.readFileSync(path.join(proof.output, `${d.sha256}.json`)));
  const manifest = readPacket(proof.manifest), attachmentIndex = readPacket(manifest.contradictionIndex);
  const selected = attachmentIndex.rows.find(row => row.id === 'adam-death-timing');
  assert.ok(selected);
  const subjectId = selected.anchors[0].topicIds[0], passageId = selected.anchors[0].passageIds[0];
  const topic = readPacket(readPacket(manifest.locator).topics[subjectId]).topic;
  const dissect = topic.dissects.find(row => row.passageId === passageId); assert.ok(dissect);
  // Reuse the one application tab; a second app tab would compete for the
  // native-derived SQLite access handle and would not test surface switching.
  const contradictionPage = page;
  await contradictionPage.goto(`http://127.0.0.1:${server.address().port}/product-app/discovery/${subjectId}/dissect?${new URLSearchParams({ passage: passageId, dissect: dissect.id })}`, { waitUntil: 'load' });
  const selectedButton = contradictionPage.getByRole('button', { name: `Contradiction. ${selected.title} ${selected.references[0]} compared with ${selected.references[1]}.`, exact: true });
  await selectedButton.waitFor({ timeout: 45000 });
  assert.deepEqual(await contradictionPage.evaluate(() => globalThis.__scriptureProgressiveEvidence().contradictions.hydratedIds), []);
  const beforeSelection = requests.length;
  await selectedButton.click();
  await expect(contradictionPage.getByText('The tension', { exact: true })).toBeVisible({ timeout: 45000 });
  assert.deepEqual(await contradictionPage.evaluate(() => globalThis.__scriptureProgressiveEvidence().contradictions.hydratedIds), [selected.id]);
  const recordUrls = new Set(attachmentIndex.rows.map(row => row.packet.url));
  assert.deepEqual(requests.slice(beforeSelection).filter(row => recordUrls.has(row.path)).map(row => row.path), [selected.packet.url]);
  const afterSelection = requests.length;
  await contradictionPage.goBack(); await selectedButton.waitFor({ timeout: 45000 }); await selectedButton.click();
  await expect(contradictionPage.getByText('The tension', { exact: true })).toBeVisible({ timeout: 45000 });
  assert.equal(requests.slice(afterSelection).filter(row => recordUrls.has(row.path)).length, 0);
  await contradictionPage.reload({ waitUntil: 'load' });
  await expect(contradictionPage.getByText('The tension', { exact: true })).toBeVisible({ timeout: 45000 });
  assert.equal(requests.slice(afterSelection).filter(row => recordUrls.has(row.path)).length, 0);
  const contradictionBrowser = { attachmentListingHydrations: 0, selectedId: selected.id, selectedRecordRequests: 1, otherRecordRequests: 0, returnAndRefreshRecordRequests: 0 };
  report = { status: errors.length ? 'INTEGRATION_DEFECT' : 'STARTUP_OBSERVED_NOT_FULL_ACCEPTANCE', revision: proof.revision,
    cacheDisabled: false, errors, consoleErrors: messages, visibleText: text, topicText, worldText, sceneText, evidenceText, repeatedWorldSceneRequests: 0, startupRequestCount, requests,
    evidence: worldEvidence,
    contradictionBrowser, publicActivation: false };
} catch (error) { report = { status: 'INTEGRATION_DEFECT', revision: proof.revision, failure: String(error), errors, consoleErrors: messages, requests, publicActivation: false }; }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
fs.writeFileSync('docs/01b-evidence/r2a-private-startup.json', JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify({ ...report, requests: `${requests.length} requests; details in receipt`, visibleText: report.visibleText?.slice(0, 2000) }, null, 2));
if (report.status === 'INTEGRATION_DEFECT') process.exitCode = 1;
