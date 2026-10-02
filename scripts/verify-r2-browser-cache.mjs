// Real Cache Storage proof on an isolated test surface; not app acceptance.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const projection = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const requests = [];
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }); res.end('<!doctype html><title>R2 cache verification</title>'); return; }
  if (pathname === '/packetCache.mjs') { res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end(fs.readFileSync('product-runtime/packetCache.mjs')); return; }
  if (pathname === '/progressiveScripture.mjs') { res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end(fs.readFileSync('product-runtime/progressiveScripture.mjs')); return; }
  const match = new RegExp(`^/sdw/${projection.revision}/([a-f0-9]{64})\\.json$`).exec(pathname);
  if (!match) { res.writeHead(404); res.end(); return; }
  const file = path.join(projection.output, `${match[1]}.json`);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const bytes = fs.readFileSync(file); requests.push({ pathname, bytes: bytes.length });
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=31536000, immutable' }); res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  const context = await browser.newContext(); const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  const browserRequests = []; page.on('request', request => { if (request.url().includes('/sdw/')) browserRequests.push(request.url()); });
  const initialize = async () => page.evaluate(async ({ revision }) => {
    const { createPacketCache } = await import('/packetCache.mjs');
    globalThis.transport = createPacketCache({ revision, baseUrl: `${location.origin}/sdw/` });
  }, projection);
  const load = descriptor => page.evaluate(d => globalThis.transport.load(d).then(value => ({ schema: value.schema, chapter: value.chapter, root: value.identity?.ref })), descriptor);
  await page.goto(origin); await initialize();
  assert.equal((await load(projection.genesis22)).chapter, 22);
  assert.equal((await load(projection.abraham)).root, 'character:abraham');
  assert.equal(requests.length, 2); assert.equal(browserRequests.length, 2);
  results.push({ phase: 'cold-selected-packets', networkRequests: 2, decodedResponseBytes: requests.reduce((n,r) => n+r.bytes,0) });
  await page.reload(); await initialize();
  await load(projection.genesis22); await load(projection.abraham);
  assert.equal(requests.length, 2); assert.equal(browserRequests.length, 2);
  results.push({ phase: 'warm-after-document-reload', networkRequests: 0, transferredPacketBytes: 0 });
  await load(projection.genesis23); assert.equal(requests.length, 3); assert.equal(browserRequests.length, 3);
  results.push({ phase: 'new-territory', networkRequests: 1, decodedResponseBytes: projection.genesis23.bytes });
  await context.setOffline(true);
  await load(projection.genesis22); await load(projection.abraham);
  assert.equal(browserRequests.length, 3);
  results.push({ phase: 'offline-cached-reads', networkRequests: 0, result: 'PASS' });
  // Use the same browser Cache Storage and reader adapter intended for the app.
  // Navigation metadata is permitted; no search shards or extra chapters may
  // be requested merely to initialize the reader or switch operating surfaces.
  await context.setOffline(false);
  const installReader = () => page.evaluate(async projection => {
    const { createProgressiveScriptureReader } = await import('/progressiveScripture.mjs');
    const catalog = await transport.load(projection.scriptureCatalog);
    const locator = await transport.load(projection.locator);
    globalThis.scripture = createProgressiveScriptureReader({ ...projection, catalog, locator, transport });
  }, projection);
  await installReader();
  assert.equal(requests.length, 5);
  const readChapter = () => page.evaluate(async () => {
    await scripture.ensureRanges('engwebu:gen', [{ startChapter: 22, endChapter: 22 }]);
    return { rows: scripture.reader.readVerses('engwebu:gen', [{ startChapter: 22, endChapter: 22 }]), diagnostics: scripture.diagnostics() };
  });
  const readerResult = await readChapter();
  const expected = JSON.parse(fs.readFileSync(path.join(projection.output, `${projection.genesis22.sha256}.json`))).verses.map(row => ({ chapter: row.chapter, verseOrdinal: row.verse_ordinal, verseStart: row.verse_start, verseEnd: row.verse_end, verseLabel: row.verse_label, text: row.text, isOmitted: row.is_omitted === 1 }));
  assert.deepEqual(readerResult.rows, expected);
  assert.deepEqual(readerResult.diagnostics.hydratedChapters, ['engwebu:gen:22']);
  assert.equal(requests.length, 5); assert.equal(browserRequests.length, 5);
  await page.reload(); await initialize(); await installReader();
  await context.setOffline(true);
  assert.deepEqual((await readChapter()).rows, expected);
  assert.equal(requests.length, 5); assert.equal(browserRequests.length, 5);
  results.push({ phase: 'reader-adapter-reload-and-offline', canonicalRowsEqual: true, hydratedChapters: ['engwebu:gen:22'], warmNetworkRequests: 0, searchPacketsRequested: 0, wholeCanonRequested: false });
  const diagnostics = await page.evaluate(() => globalThis.transport.diagnostics());
  const report = { status: 'PASS', scope: 'BROWSER_PACKET_CACHE_AND_READER_ADAPTER_NOT_PRODUCT_RUNTIME_ACCEPTANCE', cacheDisabled: false, revision: projection.revision, results, diagnostics, requests, wholeWorldRequested: false };
  fs.writeFileSync('docs/01b-evidence/r2-browser-cache.json', JSON.stringify(report,null,2)+'\n'); console.log(report);
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
