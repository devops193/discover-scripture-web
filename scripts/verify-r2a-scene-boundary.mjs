import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const native = path.resolve('../ScriptureDiscovery/src');
const manifest = JSON.parse(fs.readFileSync(path.join(proof.output, `${proof.manifest.sha256}.json`)));
const locator = JSON.parse(fs.readFileSync(path.join(proof.output, `${manifest.locator.sha256}.json`)));
const topic = JSON.parse(fs.readFileSync(path.join(proof.output, `${locator.topics.abraham.sha256}.json`))).topic;
const first = topic.passages[0], second = topic.passages.find(p => p.chapter !== first.chapter);
assert.ok(first && second);
const virtual = {
  'expo-router': `import React from 'react'; export const RouteContext=React.createContext({}); export const useLocalSearchParams=()=>React.useContext(RouteContext);`,
  'react-native': `import React from 'react'; export const Platform={OS:'web'}; export const StyleSheet={create:x=>x}; export const View=({children,accessibilityLabel})=><div aria-label={accessibilityLabel}>{children}</div>; export const Text=View,Pressable=View,ActivityIndicator=()=> <span>Loading</span>;`,
  '@/theme/tokens': 'export const useTheme=()=>({}); export const elevation={};',
  '@/components/SourceRevealCard': 'export const PassageRevealFront=()=>null;',
  '@/components/SourceRevealWithReadingMode': `import React from 'react'; export const SourceRevealWithReadingMode=({source})=><div data-testid="scene-source">{source.reference}</div>;`,
  '@/data/scripture/registry': `export function getRegisteredSource(){throw Error('UNEXPECTED_LEGACY_FALLBACK')}`,
  '@/scripture-tree/characterTrailTreeRuntime': 'export const characterTrailTreeRuntime={};',
  '@/discover-graph/phase0Trace': 'export const phase0Measure=(_a,_b,fn)=>fn(); export const phase0HasActiveTrace=()=>false,phase0TouchScripture=()=>{},phase0Count=()=>{};',
};
const bundle = await build({ write: false, bundle: true, platform: 'browser', format: 'esm', jsx: 'automatic',
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {RouteContext} from 'expo-router';
    import {ProgressiveSceneBoundary} from './product-runtime/ProgressiveSceneBoundary';
    import * as runtime from './product-runtime/progressiveRuntime';
    import {PrimarySceneCard} from '@/components/PrimarySceneCard';
    import {getScripture} from '@/data/scripture/canonical';
    runtime.bindProgressiveRevision(${JSON.stringify({ revision: proof.revision, canonicalSourceHash: proof.canonicalSourceHash, manifest: proof.manifest })});
    window.runtime=runtime; window.childMounts=[];
    function Child(){const {slug,passageId}=React.useContext(RouteContext); const topic=runtime.getProgressiveGraphCatalog().getTopic(slug);
      const passage=topic.passages.find(p=>p.id===passageId); window.childMounts.push(passage.id);
      if(!getScripture(passage.reference))throw Error('MISSING_SOURCE');
      return <PrimarySceneCard passage={passage} topicId={slug} topicTitle={topic.title}/>;}
    class Errors extends React.Component {state={error:null}; static getDerivedStateFromError(error){return {error:String(error)}};
      render(){return this.state.error?<div data-testid="error">{this.state.error}</div>:this.props.children}}
    function App(){const [route,setRoute]=React.useState(null);window.navigate=setRoute;
      return route?<Errors key={JSON.stringify(route)}><RouteContext.Provider value={route}><ProgressiveSceneBoundary><Child/></ProgressiveSceneBoundary></RouteContext.Provider></Errors>:<div>Landing</div>;}
    await runtime.initializeCanonicalCorpus(); createRoot(document.getElementById('root')).render(<App/>);
  ` },
  plugins: [{ name: 'native-test-hosts', setup(b) {
    b.onResolve({ filter: /.*/ }, args => {
      if (args.path.endsWith('/phase0Trace')) return { path: '@/discover-graph/phase0Trace', namespace: 'hosts' };
      if (Object.hasOwn(virtual, args.path)) return { path: args.path, namespace: 'hosts' };
      if (args.path.startsWith('@/')) {
        const base = path.join(native, args.path.slice(2));
        const file = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`].find(f => fs.existsSync(f));
        if (file) return { path: file };
      }
      if (args.path === 'react' || args.path.startsWith('react/') || args.path.startsWith('react-dom/')) return { path: new URL(import.meta.resolve(args.path)).pathname };
    });
    b.onLoad({ filter: /.*/, namespace: 'hosts' }, args => ({ contents: virtual[args.path], loader: 'tsx', resolveDir: process.cwd() }));
  } }], logLevel: 'silent' });
const requests = [];
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://test').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div><script type="module" src="/test.js"></script>'); return; }
  if (pathname === '/test.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(bundle.outputFiles[0].contents); return; }
  const match = new RegExp(`^/sdw/${proof.revision}/([a-f0-9]{64})\\.json$`).exec(pathname);
  if (!match) { res.writeHead(404); res.end(); return; }
  requests.push(pathname); res.setHeader('Content-Type', 'application/json'); res.end(fs.readFileSync(path.join(proof.output, `${match[1]}.json`)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext(), page = await context.newPage();
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin); await page.waitForFunction(() => Boolean(window.navigate));
  assert.equal(requests.length, 5);
  assert.deepEqual(await page.evaluate(() => window.childMounts), []);
  await page.evaluate(id => window.navigate({ slug: 'abraham', passageId: id }), first.id);
  await page.getByTestId('scene-source').waitFor();
  const firstDiagnostics = await page.evaluate(() => window.runtime.progressiveRuntimeDiagnostics());
  assert.deepEqual(firstDiagnostics.scripture.hydratedChapters, ['engwebu:gen:11']);
  assert.deepEqual(firstDiagnostics.graph.hydratedTopicIds, ['abraham']);
  const afterFirst = requests.length;
  await page.evaluate(() => window.navigate(null)); await page.getByText('Landing', { exact: true }).waitFor();
  await page.evaluate(id => window.navigate({ slug: 'abraham', passageId: id }), first.id);
  await page.getByTestId('scene-source').waitFor(); assert.equal(requests.length, afterFirst);
  // Hold the next chapter to prove old Scene content cannot render during load.
  let held;
  const chapter = locator.scripture[`engwebu:gen:${second.chapter}`]; assert.ok(chapter);
  await page.route(`**/${chapter.sha256}.json`, route => { held = route; });
  await page.evaluate(id => window.navigate({ slug: 'abraham', passageId: id }), second.id);
  await page.getByLabel('Loading scene', { exact: true }).waitFor();
  assert.equal(await page.getByTestId('scene-source').count(), 0);
  await page.waitForFunction(() => window.runtime.progressiveRuntimeDiagnostics().cache.inFlight > 0);
  for (let i = 0; i < 100 && !held; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(held); await held.continue(); await page.getByTestId('scene-source').waitFor();
  await page.unroute(`**/${chapter.sha256}.json`);
  const afterSecond = requests.length;
  await page.reload(); await page.waitForFunction(() => Boolean(window.navigate));
  await context.setOffline(true);
  await page.evaluate(id => window.navigate({ slug: 'abraham', passageId: id }), first.id);
  await page.getByTestId('scene-source').waitFor(); assert.equal(requests.length, afterSecond);
  // Invalid owner must reach the error boundary without mounting semantic UI.
  await page.evaluate(() => window.navigate({ slug: 'abraham', passageId: 'not-a-governed-scene' }));
  await page.getByTestId('error').waitFor(); assert.match(await page.getByTestId('error').innerText(), /SDW_SCENE_OWNER_MISMATCH/);
  assert.equal(await page.getByTestId('scene-source').count(), 0);
  const report = { status: 'PASS', scope: 'CHROME_REAL_SCENE_BOUNDARY_PRIMARY_CARD_CANONICAL_RUNTIME_WITH_NATIVE_HOST_ADAPTERS_NOT_FULL_APP', revision: proof.revision,
    startupTopicAndChapterHydrations: 0, firstScene: first.id, firstSceneHydratedChapters: firstDiagnostics.scripture.hydratedChapters,
    firstSceneQuestionBodies: firstDiagnostics.dgr.hydratedQuestionCount, repeatedScenePacketRequests: 0, warmReloadOfflinePacketRequests: 0,
    pendingRouteNeverRendersPreviousScene: true, invalidOwnerFailsClosed: true, sharedReader: true, publicExportActivated: false };
  fs.writeFileSync('docs/01b-evidence/r2a-scene-boundary.json', JSON.stringify(report, null, 2)+'\n'); console.log(report);
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
