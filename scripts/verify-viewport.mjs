import { chromium } from '@playwright/test';
import fs from 'node:fs';
const sizes = [[360,800],[430,930],[768,1024],[1024,768],[1024,1366],[1366,1024],[1440,900]];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: {width:1440,height:900} });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /corpus|SQLite|startup|TypeError/i.test(m.text())) errors.push(m.text()); });
const started = Date.now();
await page.goto('http://localhost:3095', { waitUntil:'domcontentloaded' });
await page.locator('#product-panel-discover [role=status]').waitFor({state:'hidden',timeout:90000});
const startupMs = Date.now()-started;
await page.getByRole('tab',{name:'Commander CE',exact:true}).click();
await page.locator('#product-panel-commander [role=status]').waitFor({state:'hidden',timeout:45000}).catch(error => errors.push(error.message));
fs.mkdirSync('docs/viewport-evidence',{recursive:true});
const records = [];
for(const [width,height] of sizes) {
  await page.setViewportSize({width,height});
  for(const product of ['discover','commander']) {
    await page.locator(`#product-tab-${product}`).click();
    await page.waitForTimeout(4000);
    const frame = await (await page.locator(`#product-panel-${product} iframe`).elementHandle()).contentFrame();
    const geometry = await page.evaluate(() => {
      const area=document.querySelector('section[aria-label="Interactive Scripture products"]');
      const r=area.getBoundingClientRect();
      const buttons=[...document.querySelectorAll('[role=tab]')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height};});
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,top:r.top,width:r.width,height:r.height,bottom:r.bottom,buttons};
    });
    const text=await frame.locator('body').innerText();
    const inside = await frame.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,viewportWidth:innerWidth,viewportHeight:innerHeight}));
    const tabletOnly=text.includes('Commander is optimized for the church tablet.');
    const productMounted = product === 'discover' ? text.includes('Look again.') : frame.url().includes('/digital-altar/commander') && text.includes('Commander') && !text.includes('Restoring Commander') && !text.includes('Unmatched Route');
    records.push({width,height,product,geometry,inside,tabletOnly,productMounted,textSample:text.slice(0,1200)});
    await page.screenshot({path:`docs/viewport-evidence/${width}x${height}-${product}.png`});
  }
}
await page.locator('#product-tab-discover').click();
await page.locator('#product-tab-commander').click();
await page.goBack();
const back=await page.locator('#product-tab-discover').getAttribute('aria-selected')==='true';
await page.goForward();
const forward=await page.locator('#product-tab-commander').getAttribute('aria-selected')==='true';
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>document.querySelector('#product-tab-commander')?.getAttribute('aria-selected')==='true');
const refresh=await page.locator('#product-tab-commander').getAttribute('aria-selected')==='true';
const report={startupMs,errors,records,browserBack:back,browserForward:forward,refresh};
fs.writeFileSync('docs/viewport-evidence/results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({startupMs,errors,viewports:records.length,browserBack:back,browserForward:forward,refresh,overflowDefects:records.filter(r=>r.geometry.overflow||r.inside.overflow).length,phoneCommanderTabletOnly:records.filter(r=>r.tabletOnly).length}));
await browser.close();
process.exitCode = errors.length || records.some(r=>!r.productMounted||r.tabletOnly||r.geometry.overflow||r.inside.overflow) || !back || !forward || !refresh ? 1 : 0;
