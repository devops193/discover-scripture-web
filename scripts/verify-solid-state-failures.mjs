// Browser-only fault injection; never changes deployed manifests or authorities.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { brotliDecompressSync, brotliCompressSync, constants } from 'node:zlib';
import { createServer, request } from 'node:http';
const upstream = process.env.VIEWPORT_URL || 'http://localhost:3096';
let servedRevision, servedTransfer;
const server = createServer((incoming, outgoing) => {
  if (servedRevision && incoming.url === '/product-app/sdw/manifest.json') {
    outgoing.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-cache'}); outgoing.end(JSON.stringify(servedRevision)); return;
  }
  if (servedRevision && incoming.url === servedRevision.contentUrl) {
    outgoing.writeHead(200,{'Content-Type':'application/vnd.sqlite3','Content-Encoding':'br','Content-Length':servedTransfer.length}); outgoing.end(servedTransfer); return;
  }
  const proxy = request(new URL(incoming.url,upstream),{headers:incoming.headers},response=>{ outgoing.writeHead(response.statusCode,response.headers); response.pipe(outgoing); });
  proxy.on('error',()=>{outgoing.writeHead(502);outgoing.end();}); incoming.pipe(proxy);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const manifest = JSON.parse(fs.readFileSync('public/product-app/sdw/manifest.json'));
const browser = await chromium.launch({channel:'chrome',headless:true});
const results = [];
async function state(page) { return page.frames()[1].evaluate(() => globalThis.__sdwInstallationEvidence?.()); }
async function ready(page) { await page.locator('#product-panel [role=status]').waitFor({state:'hidden',timeout:180000}); }
try {
  for (const failure of ['truncated', 'wrong-hash', 'interrupted']) {
    const context = await browser.newContext(); const page = await context.newPage();
    await page.route('**/product-app/sdw/manifest.json', route => route.fulfill({json:{...manifest, bytes:16}}));
    await page.route('**/product-app/sdw/*.sqlite', route => failure === 'interrupted' ? route.abort('failed') : route.fulfill({body:Buffer.alloc(failure === 'truncated' ? 8 : 16),contentType:'application/vnd.sqlite3'}));
    await page.goto(origin); await page.getByRole('button',{name:'Try again',exact:true}).waitFor({timeout:30000});
    const evidence = await state(page); assert.equal(evidence.status,'FAILED'); assert.equal(evidence.installs,0); assert.equal(evidence.activeRevision,'');
    results.push({scenario:failure,result:'PASS',evidence}); await context.close();
  }
  const context = await browser.newContext(); const page = await context.newPage();
  await page.goto(origin); await ready(page); const installed = await state(page);
  assert.equal(installed.activeRevision,manifest.sha256);
  const changedHash = (manifest.sha256[0] === 'a' ? 'b' : 'a') + manifest.sha256.slice(1);
  await page.route('**/product-app/sdw/manifest.json', route => route.fulfill({json:{...manifest,revision:changedHash,sha256:changedHash,contentUrl:`/product-app/sdw/${changedHash}.sqlite`,bytes:16}}));
  await page.route(`**/product-app/sdw/${changedHash}.sqlite`, route => route.fulfill({body:Buffer.alloc(16),contentType:'application/vnd.sqlite3'}));
  await page.reload(); await ready(page); const recovered = await state(page);
  assert.equal(recovered.activeRevision,manifest.sha256); assert.equal(recovered.installs,0); assert.match(recovered.lastUpdateError,/hash mismatch/);
  results.push({scenario:'previous-revision-survives-corrupt-update',result:'PASS',evidence:recovered});
  await page.unrouteAll();
  await page.reload(); await ready(page); const warm = await state(page);
  assert.equal(warm.packageRequests,0); assert.equal(warm.installs,0);
  results.push({scenario:'same-revision-no-package-request',result:'PASS',evidence:warm});
  // Packaging-only fixture: SQLite user_version changes, governed tables do not.
  const revisionBytes = brotliDecompressSync(fs.readFileSync(`public${manifest.contentUrl}`));
  revisionBytes.writeUInt32BE(1,60);
  const revisionHash = createHash('sha256').update(revisionBytes).digest('hex');
  const revision = {...manifest,sha256:revisionHash,revision:revisionHash,contentUrl:`/product-app/sdw/${revisionHash}.sqlite`};
  const revisionTransfer = brotliCompressSync(revisionBytes,{params:{[constants.BROTLI_PARAM_QUALITY]:4}});
  servedRevision = revision; servedTransfer = revisionTransfer;
  await page.reload(); await ready(page); const updated = await state(page);
  assert.equal(updated.activeRevision,revisionHash,JSON.stringify(updated)); assert.equal(updated.installs,1);
  results.push({scenario:'verified-new-revision-activation',fixture:'PACKAGING_ONLY_SQLITE_USER_VERSION',result:'PASS',evidence:updated});
  await page.reload(); await ready(page); const updatedWarm = await state(page);
  assert.equal(updatedWarm.packageRequests,0); assert.equal(updatedWarm.activeRevision,revisionHash);
  results.push({scenario:'new-revision-persists-without-redownload',result:'PASS',evidence:updatedWarm});
  await context.close();
  fs.writeFileSync('docs/01b-evidence/solid-state-failures.json',JSON.stringify({results},null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
