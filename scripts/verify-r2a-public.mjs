import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const url=process.env.VIEWPORT_URL || 'http://127.0.0.1:3096/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
const cdp=await context.newCDPSession(page),ledger=[],rows=new Map(),errors=[],steps=[],matrix=[];
const consoleErrors=[];
const transportLedger=[], transportPending=[];
context.on('response',response=>transportPending.push((async()=>{
  const request=response.request();
  await response.finished();
  transportLedger.push({url:response.url(),status:response.status(),resourceType:request.resourceType(),headers:await response.allHeaders(),sizes:await request.sizes()});
})().catch(error=>transportLedger.push({url:response.url(),measurementError:String(error)}))));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
cdp.on('Network.requestWillBeSent',e=>{const row={id:e.requestId,url:e.request.url};rows.set(e.requestId,row);ledger.push(row);});
cdp.on('Network.requestServedFromCache',e=>{if(rows.has(e.requestId))rows.get(e.requestId).cache=true;});
cdp.on('Network.responseReceived',e=>Object.assign(rows.get(e.requestId)??{}, {status:e.response.status,cacheControl:e.response.headers['Cache-Control']??e.response.headers['cache-control'],diskCache:e.response.fromDiskCache,serviceWorker:e.response.fromServiceWorker,mime:e.response.mimeType}));
cdp.on('Network.loadingFinished',e=>{if(rows.has(e.requestId))rows.get(e.requestId).wireBytes=e.encodedDataLength;});
page.on('pageerror',e=>errors.push(String(e)));
let frame,report;
const runtime=()=>frame.evaluate(()=>globalThis.__scriptureRuntimeEvidence());
const progressive=()=>frame.evaluate(()=>globalThis.__scriptureProgressiveEvidence());
async function measure(name,fn){const start=ledger.length;await fn();await page.waitForTimeout(250);const workers=await Promise.all(page.workers().map(async worker=>({url:worker.url(),resources:await worker.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize})))})));steps.push({name,requests:ledger.slice(start).map(r=>r.id),wireBytes:ledger.slice(start).reduce((n,r)=>n+(r.wireBytes??0),0),workers});}
async function ready(){frame=await(await page.locator('#product-panel iframe').elementHandle()).contentFrame();await page.locator('#product-panel [role=status]').waitFor({state:'hidden',timeout:90000});}
async function switchTo(mode){await page.locator(`#product-tab-${mode}`).click();await ready();await frame.waitForURL(mode==='commander'?/digital-altar/:/\/reading/);}
try {
  await measure('freshLanding',async()=>{await page.goto(url,{waitUntil:'load'});await ready();await frame.getByText('Abraham',{exact:true}).first().waitFor();});
  const startup=await progressive();assert.deepEqual(startup.graph.hydratedTopicIds,[]);assert.deepEqual(startup.scripture.hydratedChapters,[]);
  assert.equal(startup.cache.networkMisses,5);
  await measure('freshGenesis22',async()=>{
    await frame.getByText('Reading',{exact:true}).click();
    await frame.getByRole('button',{name:'Choose Genesis',exact:true}).click();
    await frame.getByRole('button',{name:'Genesis chapter 22',exact:true}).click();
    await frame.getByText('After these things, God tested Abraham,',{exact:false}).first().waitFor();
  });
  await measure('freshGenesis23',async()=>{await frame.getByRole('button',{name:'Next chapter',exact:true}).click();await frame.getByText('Sarah lived one hundred twenty-seven years.',{exact:false}).first().waitFor();});
  const identity=await runtime(),readerRoute=frame.url();
  await measure('commanderFirstSwitch',async()=>{
    await switchTo('commander');await frame.getByRole('button',{name:'Open Discover Account',exact:true}).waitFor();
  });
  assert.deepEqual(await runtime(),identity);
  await frame.getByRole('button',{name:'Open Discover Account',exact:true}).click();
  await frame.getByRole('button',{name:'Create Profile',exact:true}).click();
  await frame.getByRole('textbox',{name:'Display Name',exact:true}).fill('R2A PUBLIC BUILD TEST');
  await frame.getByRole('button',{name:'Save Profile',exact:true}).click();
  await frame.getByRole('button',{name:'Edit Profile',exact:true}).waitFor();
  await frame.getByRole('button',{name:'Back to Discover',exact:true}).click();
  await frame.getByRole('button',{name:'Open Church',exact:true}).click();
  await frame.getByRole('button',{name:'Create Church',exact:true}).click();
  await frame.getByRole('textbox',{name:'Church Name',exact:true}).fill('R2A LOCAL TEST ONLY');
  await frame.getByRole('button',{name:'Create Church',exact:true}).click();
  await frame.getByRole('button',{name:'Open Commander',exact:true}).click();
  await frame.getByText('Ministry at a glance',{exact:true}).filter({visible:true}).first().waitFor();
  await measure('repeatedSwitch',async()=>{await switchTo('discover');assert.equal(frame.url(),readerRoute);await switchTo('commander');});
  assert.deepEqual(await runtime(),identity);
  if(process.argv.includes('--commander-only')) {
    await measure('commanderProgramScripture',async()=>{
      await frame.getByRole('button',{name:'New Program',exact:true}).click();
      await frame.getByRole('textbox',{name:'Program Title',exact:true}).fill('R2A Public Test Service');
      await frame.getByRole('button',{name:'Create Program',exact:true}).click();
      await frame.getByRole('button',{name:'Announcement',exact:true}).click();
      await frame.getByRole('textbox',{name:'Block Title',exact:true}).fill('R2A Test Welcome');
      await frame.getByRole('textbox',{name:'Block Body',exact:true}).fill('Local browser verification only.');
      await frame.getByRole('button',{name:'Save Block',exact:true}).click();
      await frame.getByText('R2A Test Welcome',{exact:true}).first().waitFor();
      await frame.getByRole('button',{name:'Scripture',exact:true}).click();
      await frame.getByRole('textbox',{name:'Discover Reference',exact:true}).fill('Genesis 22:1');
      await frame.getByRole('button',{name:'Save Block',exact:true}).click();
      await frame.getByRole('textbox',{name:'Discover Reference',exact:true}).waitFor({state:'hidden',timeout:45000});
    });
    // Return through the real surface controls, retaining the same engine.
    await frame.getByRole('button',{name:'Back to Church',exact:true}).click();
    if(await frame.getByRole('button',{name:'Open Commander',exact:true}).isVisible()) await frame.getByRole('button',{name:'Open Commander',exact:true}).click();
    await measure('commanderLiveScripture',async()=>{
      await frame.getByRole('button',{name:'Start Service',exact:true}).click();
      await frame.getByText('Service Preflight',{exact:true}).waitFor({timeout:45000});
      await frame.getByRole('button',{name:/Start.*Service|Start.*Live/}).last().click();
      await frame.getByRole('button',{name:/NEXT ·/}).click();
      await frame.getByRole('button',{name:'Presenter ▾',exact:true}).click();
      await frame.getByText('READING MODE',{exact:true}).click();
      await frame.getByRole('button',{name:/Scripture Tree/}).first().click();
      const chapterColumn=frame.getByText('CHAPTER',{exact:true}).locator('..');
      await chapterColumn.getByRole('button',{name:'23',exact:true}).click();
      const verseColumn=frame.getByText('VERSE',{exact:true}).locator('..');
      await verseColumn.getByRole('button',{name:'20',exact:true}).waitFor();
      await verseColumn.getByRole('button',{name:/^1(?: ◀)?$/}).click();
      await frame.getByText('Genesis 23:1',{exact:true}).first().waitFor();
      await frame.getByRole('button',{name:'Add to Queue',exact:true}).click();
      await frame.getByRole('button',{name:'BROADCAST',exact:true}).click();
      await frame.getByText('BROADCAST ACTIVE',{exact:true}).waitFor();
    });
    const liveIdentity=await runtime();
    assert.equal(liveIdentity.engineId,identity.engineId);
    for(const [key,count]of Object.entries(identity.counts)) assert.equal(liveIdentity.counts[key],count,`Existing ${key} identity changed`);
    // First Tree use may register its lazy singleton; no provider may repeat.
    assert.ok(Object.values(liveIdentity.counts).every(count=>count===1));
    await measure('commanderReturn',async()=>{await switchTo('discover');assert.equal(frame.url(),readerRoute);await switchTo('commander');await frame.getByText('BROADCAST ACTIVE',{exact:true}).waitFor();});
    assert.deepEqual(await runtime(),liveIdentity);
    assert.equal(ledger.filter(row=>steps.at(-1).requests.includes(row.id)&&new URL(row.url).pathname.startsWith('/sdw/')).length,0);
    assert.deepEqual(errors,[]);
    report={status:'PASS',testedUrl:url,startup,identity,liveIdentity,steps,errors,ledger,commander:'PROGRAM_CURRENT_NEXT_TREE_QUEUE_PRESENT_RETURN_PASS'};
  } else {
  for(const [width,height]of(process.argv.includes('--history-only')?[]:[[360,800],[430,930],[768,1024],[1024,768],[1024,1366],[1366,1024],[1440,900]])){
    await page.setViewportSize({width,height});
    for(const mode of ['discover','commander']){
      await switchTo(mode);
      const outer=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      const inner=await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert.equal(outer,false);assert.equal(inner,false);assert.deepEqual(await runtime(),identity);
      const button=mode==='discover'?frame.getByRole('button',{name:'Next chapter',exact:true}):frame.getByRole('button',{name:'Open Programs',exact:true}).first();
      await expect(button).toBeVisible();
      const tabs=await page.getByRole('tab').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
      assert.ok(tabs.every(t=>t.width>=44&&t.height>=44));
      matrix.push({width,height,mode,outerOverflow:outer,innerOverflow:inner,criticalControlVisible:true});
      await page.screenshot({path:`docs/01b-evidence/r2a-public-${width}x${height}-${mode}.png`});
    }
  }
  await switchTo('discover');await switchTo('commander');
  await page.goBack();await expect(page.locator('#product-tab-discover')).toHaveAttribute('aria-selected','true');await frame.waitForURL(/\/reading/);
  await page.goForward();await expect(page.locator('#product-tab-commander')).toHaveAttribute('aria-selected','true');await frame.waitForURL(/digital-altar/);
  await measure('warmCommanderRefresh',async()=>{await page.reload({waitUntil:'load'});await ready();await frame.getByText('Ministry at a glance',{exact:true}).filter({visible:true}).first().waitFor();});
  await measure('warmScriptureReturn',async()=>{await switchTo('discover');assert.equal(frame.url(),readerRoute);await frame.getByText('Sarah lived one hundred twenty-seven years.',{exact:false}).first().waitFor();});
  await measure('warmGenesis22',async()=>{await frame.getByRole('button',{name:'Previous chapter',exact:true}).click();await frame.getByText('After these things, God tested Abraham,',{exact:false}).first().waitFor();});
  const warmStart=ledger.length;
  await measure('warmDiscoverRefresh',async()=>{await page.reload({waitUntil:'load'});await ready();await frame.getByText('After these things, God tested Abraham,',{exact:false}).first().waitFor();});
  for(const step of steps.filter(s=>s.name.startsWith('warm')||s.name==='repeatedSwitch')){
    const entries=ledger.filter(row=>step.requests.includes(row.id));
    assert.equal(entries.filter(row=>new URL(row.url).pathname.startsWith('/sdw/')).length,0,`${step.name}: cached packet requests`);
  }
  assert.equal(ledger.filter(r=>/\.(db|sqlite)(\?|$)/.test(r.url)).length,0);
  assert.deepEqual(errors,[]);
  report={status:'PASS',testedUrl:url,cacheDisabled:false,startup,identity,matrix,steps,errors,ledger,wholeCanonTransfers:0,warmCachedPacketRequests:0,history:'PASS',refresh:'PASS'};
  }
}catch(error){report={status:'FAIL',failure:String(error),screen:frame&&!frame.isDetached()?await frame.locator('body').innerText():undefined,errors,consoleErrors,steps,matrix,ledger};process.exitCode=1;}
finally{await Promise.all(transportPending);report.transportLedger=transportLedger;fs.writeFileSync(`docs/01b-evidence/${process.argv.includes('--commander-only')?'r2a-public-commander':process.argv.includes('--history-only')?'r2a-public-history':'r2a-public-integrated'}.json`,JSON.stringify(report,null,2)+'\n');console.log({status:report.status,failure:report.failure,errors,consoleErrors,matrix:matrix.length,steps:steps.map(({name,wireBytes})=>({name,wireBytes}))});await browser.close();}
