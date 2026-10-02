import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('pageerror', error => console.error('PAGE_ERROR', error.message));
page.on('console', message => { if (message.type() === 'error') console.error('CONSOLE_ERROR', message.text()); });
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', {cacheDisabled:false});
let requests = new Map();
const methods = ['requestWillBeSent','responseReceived','requestServedFromCache','loadingFinished','loadingFailed'];
function network(method,e,owner='page') {
  const key = `${owner}:${e.requestId}`;
  if (method === 'requestWillBeSent') requests.set(key,{url:e.request.url,type:e.type,owner,transferredBytes:0});
  const row = requests.get(key) || {};
  if (method === 'responseReceived') Object.assign(row,{status:e.response.status,diskCache:!!e.response.fromDiskCache,serviceWorker:!!e.response.fromServiceWorker,mime:e.response.mimeType,headers:e.response.headers});
  if (method === 'requestServedFromCache') row.cache = true;
  if (method === 'loadingFinished') row.transferredBytes = e.encodedDataLength;
  if (method === 'loadingFailed') row.error = e.errorText;
}
for (const method of methods) cdp.on(`Network.${method}`,e=>network(method,e));
// Workers get their own Network domain: do not estimate their bytes from decoded
// response bodies or omit them from the page's accounting.
let messageId=0;
cdp.on('Target.attachedToTarget', async ({sessionId,targetInfo})=> {
  const send=method=>cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:++messageId,method,params:method==='Network.setCacheDisabled'?{cacheDisabled:false}:{}})});
  await send('Network.enable');
  await send('Network.setCacheDisabled');
  await send('Runtime.runIfWaitingForDebugger');
});
cdp.on('Target.receivedMessageFromTarget',({sessionId,message})=>{
  const e=JSON.parse(message);
  if(e.method?.startsWith('Network.')) network(e.method.slice(8),e.params,`worker:${sessionId}`);
});
await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:false});
const results = { origin:process.env.VIEWPORT_URL || 'http://localhost:3096', cacheDisabled:false, routingInterception:false, method:'Chromium CDP Network in page and dedicated workers; fresh context cold then same-context reload; no throttling; encoded wire bytes including response headers; blob/data excluded', phases:[] };
try {
  for (const phase of ['cold', 'warm', 'commander-switch', 'explicit-warm-asset-cache-probe']) {
    requests = new Map();
    const start = performance.now();
    if (phase === 'cold') await page.goto(results.origin, {waitUntil:'domcontentloaded'});
    else if (phase === 'warm') await page.reload({waitUntil:'domcontentloaded'});
    else if (phase === 'commander-switch') await page.locator('#product-tab-commander').click();
    else {
      const urls=results.phases[0].entries.filter(row=>/\/product-app\/(assets|_expo)\//.test(row.url)).map(row=>row.url);
      await page.evaluate(async urls=>{ await Promise.all(urls.map(async url=>{const response=await fetch(url); if(!response.ok)throw Error(`Asset cache probe HTTP ${response.status}`);await response.arrayBuffer();})); },urls);
    }
    await page.locator('#product-panel [role=status]').waitFor({state:'hidden',timeout:120000});
    const frame = await (await page.locator('#product-panel iframe').elementHandle()).contentFrame();
    if (phase === 'commander-switch') await frame.waitForURL(/digital-altar/);
    const readyMs = Math.round(performance.now()-start);
    await page.waitForTimeout(1500);
    const entries = [...requests.values()].filter(r=>/^https?:/.test(r.url));
    results.phases.push({phase,readyMs,requestCount:entries.length,transferredBytes:entries.reduce((n,r)=>n+r.transferredBytes,0),cachedRequests:entries.filter(r=>r.cache||r.diskCache).length,engine:await frame.evaluate(()=>globalThis.__scriptureRuntimeEvidence()),installation:await frame.evaluate(()=>globalThis.__sdwInstallationEvidence?.()),heap:await cdp.send('Runtime.getHeapUsage'),entries});
    console.log(phase, results.phases.at(-1).transferredBytes, readyMs);
  }
  fs.mkdirSync('docs/01b-evidence',{recursive:true});
  fs.writeFileSync(`docs/01b-evidence/${process.env.MEASURE_LABEL || 'transfer'}.json`,JSON.stringify(results,null,2)+'\n');
} finally { await browser.close(); }
