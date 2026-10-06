import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), 'utf8');
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };

const [home, header, footer, registry, pilot, investors, netlify, packageJson] = await Promise.all([
  read('app/page.tsx'),
  read('app/siteHeader.tsx'),
  read('app/site.tsx'),
  read('app/featurePublications.ts'),
  read('app/church-pilot/page.tsx'),
  read('app/investors/page.tsx'),
  read('netlify.toml'),
  read('package.json'),
]);

const lockedNavigation = [
  'Scripture Discovered',
  'Commander CE',
  'Network and Partners',
];
let navCursor = -1;
for (const label of lockedNavigation) {
  const next = header.indexOf(`>${label}<`, navCursor + 1);
  pass(next > navCursor, `Navigation label missing or out of order: ${label}`);
  navCursor = next;
}

const sectionOrder = [
  'gtm-hero',
  'id="scripture-discovered"',
  'id="commander-ce"',
  'id="network-and-partners"',
  'id="church-pilot"',
];
let sectionCursor = -1;
for (const marker of sectionOrder) {
  const next = home.indexOf(marker, sectionCursor + 1);
  pass(next > sectionCursor, `Homepage section missing or out of order: ${marker}`);
  sectionCursor = next;
}

for (const field of ['featureId', 'publicName', 'shortStatement', 'imageOrDemo', 'productSurface', 'publicationState', 'destination']) {
  pass(registry.includes(field), `Feature registry field missing: ${field}`);
}
for (const state of ['LIVE', 'PILOT', 'PREVIEW']) pass(registry.includes(`'${state}'`), `Publication state unavailable: ${state}`);
for (const claim of ['What is it?', 'Who is it for?', 'What will you test?', 'What do you need?', 'How long is onboarding?', 'How do you join?']) {
  pass(pilot.includes(claim), `Church Pilot answer missing: ${claim}`);
}
pass(!header.includes('Church Pilot') && !header.includes('Investors') && !header.includes('About'), 'Secondary items remain in the top navigation.');
pass(!footer.includes('Church Pilot'), 'Church Pilot remains visible in the footer.');
pass(footer.includes('className="site-nav-locked"') && footer.includes('aria-disabled="true"') && footer.includes('>Investors<'), 'Investors is not visibly locked in the footer.');
pass(!footer.includes('href="/investors"'), 'Locked Investors footer item remains navigable.');
pass(footer.includes('href="/about"') && footer.includes('>About<'), 'About is missing from the footer.');
pass(!home.toLowerCase().includes('investor'), 'Investor language remains on the homepage.');
pass(!/investor brief|for investors|investor overview|fundrais/i.test(footer), 'Investor-facing language remains in the footer beyond the locked label.');
pass(investors.includes("redirect('/')"), 'Direct Investors route is not locked back to the homepage.');

pass(header.includes('href="/product-app/"'), 'Live application is not directly reachable from navigation.');
pass(!header.includes('Discovery Ministry Network'), 'Uncleared Network name remains in public navigation.');
pass(netlify.includes('command = "npm run build:netlify"'), 'Netlify build command changed.');
pass(netlify.includes('publish = ".next"'), 'Netlify publish directory changed.');
pass(JSON.parse(packageJson).scripts['build:netlify'] === 'next build', 'Production build script changed.');

const imagePaths = [...registry.matchAll(/imageOrDemo: '([^']+)'/g)].map((match) => `public${match[1]}`);
pass(imagePaths.length >= 6, 'Fewer than six feature visuals are registered.');
for (const imagePath of imagePaths) {
  try {
    await access(resolve(root, imagePath));
    const image = await stat(resolve(root, imagePath));
    pass(image.size > 10_000, `Feature visual is unexpectedly small: ${imagePath}`);
  } catch {
    failures.push(`Feature visual missing: ${imagePath}`);
  }
}

if (failures.length) {
  console.error('DISCOVER_GTM_PILOT_01B=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('DISCOVER_GTM_PILOT_01B=PASS');
console.log(`headerNavigation=${lockedNavigation.length}/3`);
console.log('footerNavigation=INVESTORS_LOCKED_ABOUT');
console.log(`homepageSections=${sectionOrder.length}/5`);
console.log('investorLanguage=REMOVED');
console.log('investorTab=LOCKED');
console.log(`featureVisuals=${imagePaths.length}`);
console.log('githubNetlifyPathPreserved=PASS');
console.log('productionPush=NO');
