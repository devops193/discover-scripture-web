// Focused remaining-gate probe; does not replay accepted World/Contradiction gates.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
const build = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-private-export.json'));
const requests = [], errors = [];
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  let file;
  if (pathname.startsWith(`/sdw/${build.revision}/`) && /^[a-f0-9]{64}\.json$/.test(path.basename(pathname))) file = path.join(build.packetRoot, path.basename(pathname));
  else if (pathname.startsWith('/product-app')) {
    file = path.resolve(build.output, pathname.slice('/product-app'.length).replace(/^\//, '') || 'index.html');
    if (!file.startsWith(build.output + '/')) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(build.output, 'index.html');
  }
  if (!file || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf'})[path.extname(file)] ?? 'application/octet-stream');
  if (/\.(js|db|sqlite)$/.test(file) && !file.endsWith('/boot.js')) res.setHeader('Content-Encoding', 'br');
  res.setHeader('Cache-Control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  requests.push({path:pathname, bytes:fs.statSync(file).size}); fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror', e => errors.push(String(e)));
let report;
try {
  if (process.argv.includes('--compare')) {
    const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
    const read = d => JSON.parse(fs.readFileSync(path.join(build.packetRoot, `${d.sha256}.json`)));
    const manifest = read(proof.manifest), topic = read(read(manifest.locator).topics.abraham).topic;
    const compare = topic.compares.find(row => row.pivotIds.length);
    if (!compare) throw Error('No governed Compare/Pivot fixture');
    await page.goto(`http://127.0.0.1:${server.address().port}/product-app/discovery/abraham/compare?compare=${encodeURIComponent(compare.id)}`,{waitUntil:'load'});
    await page.getByText(compare.title,{exact:true}).first().waitFor({timeout:45000});
    const lens=topic.pivots.find(row=>row.id===compare.pivotIds[0]);
    await page.getByText(lens.title,{exact:true}).click();
    await page.getByRole('button',{name:'Back to Compare',exact:true}).waitFor({timeout:45000});
    const pivotText=await page.locator('body').innerText(),beforeReturn=requests.length;
    await page.getByRole('button',{name:'Back to Compare',exact:true}).click();
    await page.getByText(compare.title,{exact:true}).first().waitFor();
    await page.getByText(lens.title,{exact:true}).click();
    await page.getByRole('button',{name:'Back to Compare',exact:true}).waitFor();
    const repeatedPacketRequests=requests.slice(beforeReturn).filter(row=>row.path.startsWith('/sdw/')).length;
    if(repeatedPacketRequests)throw Error(`Repeat Pivot packets:${repeatedPacketRequests}`);
    report={status:'COMPARE_PIVOT_PASS',pivotText,repeatedPacketRequests};
  } else {
  await page.goto(`http://127.0.0.1:${server.address().port}/product-app/digital-altar/commander`,{waitUntil:'load',timeout:90000});
  await page.getByRole('button',{name:'Open Discover Account',exact:true}).click();
  await page.getByRole('button',{name:'Create Profile',exact:true}).click();
  await page.getByRole('textbox',{name:'Display Name',exact:true}).fill('R2A Browser Verification');
  await page.getByRole('button',{name:'Save Profile',exact:true}).click();
  await page.getByRole('button',{name:'Edit Profile',exact:true}).waitFor();
  await page.goto(`http://127.0.0.1:${server.address().port}/product-app/digital-altar/church`,{waitUntil:'load'});
  await page.getByRole('button',{name:'Create Church',exact:true}).click();
  await page.getByPlaceholder('Grace Assembly').fill('R2A Local Test Workspace');
  await page.getByRole('button',{name:'Create Church',exact:true}).click();
  await page.getByRole('button',{name:'Open Commander',exact:true}).click();
  await page.getByRole('button',{name:'New Program',exact:true}).click();
  await page.getByRole('textbox',{name:'Program Title',exact:true}).fill('R2A Test Service');
  await page.getByRole('button',{name:'Create Program',exact:true}).click();
  await page.getByRole('button',{name:'Announcement',exact:true}).click();
  await page.getByRole('textbox',{name:'Block Title',exact:true}).fill('R2A Test Welcome');
  await page.getByRole('textbox',{name:'Block Body',exact:true}).fill('Local browser verification only.');
  await page.getByRole('button',{name:'Save Block',exact:true}).click();
  await page.getByText('R2A Test Welcome',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Scripture',exact:true}).click();
  await page.getByRole('textbox',{name:'Discover Reference',exact:true}).fill('Genesis 22:1');
  await page.getByRole('button',{name:'Save Block',exact:true}).click();
  await page.getByRole('textbox',{name:'Discover Reference',exact:true}).waitFor({state:'hidden',timeout:45000});
  await page.goto(`http://127.0.0.1:${server.address().port}/product-app/digital-altar/commander`,{waitUntil:'load'});
  await page.getByRole('button',{name:'Start Service',exact:true}).click();
  await page.getByText('Service Preflight',{exact:true}).waitFor({timeout:45000});
  await page.getByRole('button',{name:/Start.*Service|Start.*Live/}).last().click();
  await page.getByRole('button',{name:/NEXT ·/}).click();
  await page.getByRole('button',{name:'Presenter ▾',exact:true}).click();
  await page.getByText('READING MODE',{exact:true}).click();
  await page.getByRole('button',{name:/Scripture Tree/}).first().click();
  const chapterColumn = page.getByText('CHAPTER',{exact:true}).locator('..');
  await chapterColumn.getByRole('button',{name:'23',exact:true}).click();
  const verseColumn = page.getByText('VERSE',{exact:true}).locator('..');
  await verseColumn.getByRole('button',{name:'20',exact:true}).waitFor();
  await verseColumn.getByRole('button',{name:/^1(?: ◀)?$/}).click();
  await page.getByText('Genesis 23:1',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Add to Queue',exact:true}).click();
  await page.getByRole('button',{name:'BROADCAST',exact:true}).click();
  await page.getByText('BROADCAST ACTIVE',{exact:true}).waitFor();
  report = {status:'COMMANDER_PROBE', text:await page.locator('body').innerText()};
  }
} catch(e) { report={status:'INTEGRATION_DEFECT',failure:String(e),text:await page.locator('body').innerText()}; }
report.errors=errors; report.requests=requests;
const evidenceName=process.argv.includes('--compare')?'r2a-compare-probe':'r2a-commander-probe';
await page.screenshot({path:`docs/01b-evidence/${evidenceName}.png`});
fs.writeFileSync(`docs/01b-evidence/${evidenceName}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
await browser.close(); await new Promise(resolve=>server.close(resolve));
