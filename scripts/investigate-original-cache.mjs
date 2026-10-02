import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// Reproduce the original gzip transfer using the preserved baseline export and
// Next's unchanged default public-file cache policy (outside optimized paths).
const source='/private/tmp/web-sdw-01b-original-export/_expo/static/js/web';
const entry=fs.readdirSync(source).find(n=>n.startsWith('entry-'));
const bytes=gzipSync(fs.readFileSync(path.join(source,entry)),{level:9});
const hash=createHash('sha256').update(bytes).digest('hex');
const destination=`public/cache-investigation/${hash}.js.gz`;
fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.writeFileSync(destination,bytes);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const cdp=await page.context().newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
const records=[]; let row;
cdp.on('Network.responseReceived',e=>{if(e.response.url.includes(hash))Object.assign(row,{status:e.response.status,diskCache:!!e.response.fromDiskCache,headers:e.response.headers});});
cdp.on('Network.requestWillBeSent',e=>{if(e.request.url.includes(hash))row.requestId=e.requestId;});
cdp.on('Network.requestServedFromCache',e=>{if(row?.requestId===e.requestId)row.memoryOrDiskCache=true;});
cdp.on('Network.loadingFinished',e=>{if(row?.requestId===e.requestId)row.transferredBytes=e.encodedDataLength;});
try {
  await page.goto('http://localhost:3096/api/health');
  for(const phase of ['cold','warm-same-page','warm-after-reload']) {
    if(phase==='warm-after-reload')await page.reload();
    row={phase}; records.push(row);
    row.decodedBodyBytes=await page.evaluate(async url=>(await (await fetch(url)).arrayBuffer()).byteLength,`/cache-investigation/${hash}.js.gz`);
    await page.waitForTimeout(200);
    assert.equal(row.status,200);
    assert.equal(row.decodedBodyBytes,bytes.length);
  }
  const report={cacheDisabled:false,routingInterception:false,bodyBytes:bytes.length,sha256:hash,source:'Preserved 01A build staging; baseline export reproduced. This is a fetch/cache-policy reproduction, not a second historical application measurement.',records};
  fs.writeFileSync('docs/01b-evidence/original-cache-reproduction.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  await browser.close();
  // Keep generated probe recoverable outside the publish directory.
  fs.mkdirSync('.product-build-cache-probe',{recursive:true});
  fs.renameSync(destination,`.product-build-cache-probe/${hash}.gz`);
  fs.rmdirSync(path.dirname(destination));
}
