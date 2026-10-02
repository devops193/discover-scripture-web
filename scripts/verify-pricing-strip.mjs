import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage();
const records=[];
try {
  await page.goto(process.env.VIEWPORT_URL || 'http://localhost:3095/',{waitUntil:'domcontentloaded'});
  await page.locator('#pricing-ownership').waitFor();
  const strip=page.locator('#pricing-ownership');
  assert((await strip.innerText()).includes('Scripture Discovered online is free. No account required.'));
  assert((await strip.innerText()).includes('One-time purchase.'));
  assert((await strip.innerText()).includes('Coming through selected deployments.'));
  assert(!/[$€£]\s*\d|subscription/i.test(await strip.innerText()));
  fs.mkdirSync('docs/pricing-strip-evidence',{recursive:true});
  for(const [width,height] of [[360,800],[430,930],[768,1024],[1024,768],[1024,1366],[1366,1024],[1440,900]]) {
    await page.setViewportSize({width,height});
    if(width<=1100) await page.waitForFunction(()=>Math.abs(document.querySelector('section[aria-label="Interactive Scripture products"]').getBoundingClientRect().height-(innerHeight-document.querySelector('.site-header').getBoundingClientRect().height))<2);
    const record=await page.evaluate(()=>{
      const pricing=document.querySelector('#pricing-ownership');
      const viewport=document.querySelector('section[aria-label="Interactive Scripture products"]');
      const p=pricing.getBoundingClientRect(),v=viewport.getBoundingClientRect();
      return {width:innerWidth,height:innerHeight,adjacent:viewport.nextElementSibling===pricing,gap:p.top-v.bottom,viewportHeight:v.height,columns:getComputedStyle(pricing).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert(record.adjacent && Math.abs(record.gap)<1 && !record.overflow);
    assert.equal(record.columns,width<=700?1:3);
    if(width<=1100) assert(Math.abs(record.viewportHeight-(height-await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().height)))<2);
    records.push(record);
    await strip.screenshot({path:`docs/pricing-strip-evidence/${width}x${height}.png`});
  }
  // Text enlargement may grow the strip; it must not overlap or overflow.
  await page.setViewportSize({width:360,height:800});
  await page.addStyleTag({content:'html { font-size: 200%; }'});
  assert(await strip.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  fs.writeFileSync('docs/pricing-strip-evidence/results.json',JSON.stringify({status:'PASS',records,largeText:'PASS'},null,2));
  console.log('PASS: placement, free/ownership/availability copy, no numeric price, seven sizes, unchanged mobile viewport height, and enlarged text.');
} finally { await browser.close(); }
