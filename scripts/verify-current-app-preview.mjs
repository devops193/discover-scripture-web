import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const baseURL = process.env.CURRENT_APP_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const sourceRoot = process.env.DISCOVERY_SOURCE ?? '../ScriptureDiscovery';
const manifest = JSON.parse(fs.readFileSync('public/product-app/build-manifest.json'));
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashObject = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const mismatches = [];

for (const [relative, expected] of Object.entries({ ...manifest.sourceFiles, ...manifest.sourceInputs })) {
  if (sha256(path.join(sourceRoot, relative)) !== expected) mismatches.push(relative);
}
for (const [relative, expected] of Object.entries(manifest.websiteAdapters)) {
  if (sha256(relative) !== expected) mismatches.push(relative);
}
const sourceSnapshotSha256 = hashObject({
  sourceFiles: manifest.sourceFiles,
  sourceInputs: manifest.sourceInputs,
  sourcePackageSha256: sha256(path.join(sourceRoot, 'package.json')),
  sourceLockSha256: sha256(path.join(sourceRoot, 'package-lock.json')),
});
const sourceCommit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (sourceCommit !== manifest.provenance.sourceCommit) mismatches.push('sourceCommit');
if (sourceSnapshotSha256 !== manifest.provenance.sourceSnapshotSha256) mismatches.push('sourceSnapshotSha256');
if (hashObject(manifest.files) !== manifest.provenance.artifactSha256) mismatches.push('artifactSha256');
if (manifest.provenance.destinationPath !== 'public/product-app' || path.resolve(manifest.provenance.destinationPath) !== manifest.provenance.destinationAbsolutePath) mismatches.push('destinationPath');
if (mismatches.length) throw Error(`CURRENT_APP_SOURCE_MISMATCH:${mismatches.join(',')}`);

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 430, height: 930 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error' && /startup|SQLite|TypeError|corpus/i.test(message.text())) errors.push(message.text()); });

try {
  await page.goto(`${baseURL}/product-app/`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Look again.', { exact: true }).waitFor({ timeout: 90000 });

  await page.getByRole('search', { name: 'Explore Scripture', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search Scripture discoveries', exact: true });
  await search.fill('Disobedience');
  await page.getByRole('button', { name: 'Search mode, Search', exact: true }).click();
  await page.getByRole('button', { name: 'Use Semantic Lesson Search', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Yes', exact: true });
  if (await confirm.isVisible()) await confirm.click();
  else await page.getByRole('button', { name: 'Run Semantic Lesson Search', exact: true }).click();
  await page.getByText('BIBLICAL LESSONS', { exact: true }).waitFor();
  const lessonResults = await page.getByText(/Genesis 3|1 Samuel 15|Numbers 20/).count();
  if (lessonResults < 3) throw Error(`BIBLICAL_LESSON_RESULT_COUNT:${lessonResults}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Look again.', { exact: true }).waitFor({ timeout: 90000 });
  await page.getByText('Abraham', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Open Character World', exact: true }).click();
  await page.getByText('Abraham World', { exact: true }).waitFor();
  await page.getByText('Where the story can go next', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Scenes\. Step into Abraham's story/ }).click();
  await page.getByRole('button', { name: /Named in Terah’s family\. Genesis 11:26–32/ }).click();
  await page.getByText('Swipe to move through the Scene', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Later moment', exact: true }).waitFor();

  if (errors.length) throw Error(`CURRENT_APP_RUNTIME_ERRORS:${errors.join('|')}`);
  console.log(JSON.stringify({
    CURRENT_APP_PREVIEW: 'PASS',
    sourceFiles: Object.keys(manifest.sourceFiles).length,
    sourceInputs: Object.keys(manifest.sourceInputs).length,
    websiteAdapters: Object.keys(manifest.websiteAdapters).length,
    sourceMismatches: 0,
    provenance: manifest.provenance,
    semanticLessonSearch: 'PASS',
    biblicalLessons: lessonResults,
    characterWorld: 'PASS',
    sceneStory: 'PASS',
    runtimeErrors: 0,
  }, null, 2));
} catch (error) {
  console.error('CURRENT_APP_PREVIEW_FAILURE', error instanceof Error ? error.message : String(error));
  console.error('URL', page.url());
  console.error('ERRORS', errors);
  await page.screenshot({ path: 'docs/review/DISCOVER-GTM-PILOT-01B/current-app-preview-failure.png', fullPage: true });
  console.error((await page.locator('body').innerText()).slice(0, 6000));
  throw error;
} finally {
  await browser.close();
}
