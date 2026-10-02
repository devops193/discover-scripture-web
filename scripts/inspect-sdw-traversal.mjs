import {chromium} from '@playwright/test';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(process.env.VIEWPORT_URL || 'http://localhost:3096');
  await page.locator('#product-panel [role=status]').waitFor({state:'hidden',timeout:120000});
  const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.getByText('Abraham',{exact:true}).click();
  await frame.getByRole('button',{name:'Open Character World',exact:true}).click();
  console.log('WORLD', await frame.getByRole('button').allTextContents());
  await frame.getByRole('button',{name:/^Scenes ·/}).click();
  console.log('SCENES', await frame.getByRole('button').allTextContents());
  await frame.getByRole('button',{name:/^1\. /}).click();
  console.log('FOCUS', await frame.locator('body').innerText());
  await frame.getByRole('button',{name:'Leave Character World',exact:true}).click();
  console.log('DISCOVERY', await frame.getByRole('button').allTextContents());
  await frame.getByRole('button',{name:'Enter the trail',exact:true}).click();
  await frame.waitForURL(/\/trail/);
  await frame.getByRole('button',{name:'Expand',exact:true}).click();
  await frame.getByRole('button',{name:/^Scene 1,/}).first().click();
  await frame.waitForURL(/\/scene/);
  await frame.getByRole('button',{name:'Dissect this scene',exact:true}).click();
  await frame.waitForURL(/\/dissect/);
  console.log('TRAIL', await frame.getByRole('button').allTextContents());
} finally { await browser.close(); }
