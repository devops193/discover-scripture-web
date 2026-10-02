// Actual staged landing/card React render; native host/navigation adapters only.
// Deliberately unhydrated catalog with a poisoned body boundary (including reads
// that a consumer might catch). Not a browser/full-product acceptance receipt.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToString } from 'react-dom/server';
import { createProgressiveGraphCatalog } from '../product-runtime/progressiveGraphCatalog.mjs';
import { createPacketCache } from '../product-runtime/packetCache.mjs';
import { catalog as original, payload, continuationLabel } from './build-r2-startup-catalog.mjs';
const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const stage = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-private-export.json')).stage;
assert.ok(stage, 'Build the private candidate first');
const native = path.resolve('../ScriptureDiscovery/src');
const read = d => {
  const bytes = fs.readFileSync(path.join(proof.output, `${d.sha256}.json`));
  assert.equal(bytes.length, d.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), d.sha256);
  return JSON.parse(bytes);
};
const manifest = read(proof.manifest), startup = read(manifest.startup), locator = read(manifest.locator);
assert.deepEqual(startup.catalog, JSON.parse(JSON.stringify(payload)));
assert.deepEqual(startup.catalog.cards, JSON.parse(JSON.stringify(original.discoveryCards)));
assert.equal(startup.catalog.subjects.length, 50); assert.equal(startup.catalog.cards.length, 55);
let requests = 0, bodyTouches = 0, navigation = [], selected = [], cardRows = [];
const cache = new Map();
const transport = createPacketCache({ revision: proof.revision, baseUrl: 'https://r2.test',
  cacheStorage: { open: async () => ({ match: async k => cache.get(k)?.clone(), put: async (k, v) => cache.set(k, v.clone()), delete: async k => cache.delete(k) }) },
  fetchResource: async url => { requests++; return new Response(fs.readFileSync(path.join(proof.output, path.basename(new URL(url).pathname)))); },
});
const catalog = createProgressiveGraphCatalog({ revision: proof.revision, startup, locator, transport });
let landing = true;
const trap = id => { bodyTouches++; throw Error(`LANDING_TOPIC_BODY_ACCESS:${id}`); };
const graph = { discoveryCards: catalog.discoveryCards, topics: new Proxy(catalog.topics, { get: (target, key) => landing ? trap(key) : target[key] }) };
const guarded = { ...catalog, topics: graph.topics, getTopic: id => landing ? trap(id) : catalog.getTopic(id) };
let remembered, stateIndex = 0, axisId = 'character';
const host = props => { if (props.onPress) selected.push(props); return React.createElement('div', {}, props.children); };
const hosts = new Proxy({ Platform: { OS: 'web' }, StyleSheet: { create: x => x, hairlineWidth: 1 }, Modal: p => p.visible ? host(p) : null }, { get: (o, k) => o[k] ?? host });
const modules = new Map();
function compile(file, override) {
  if (!override && modules.has(file)) return modules.get(file);
  const module = { exports: {} };
  const require = name => {
    if (name === 'react') return { ...React, useState: initial => {
      const index = ++stateIndex;
      return React.useState(index === 3 ? remembered : index === 4 ? new Set(startup.catalog.subjects.flatMap(s => s.pack ? [s.pack.id] : [])) : initial);
    } };
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react-native') return hosts;
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
    if (name === 'expo-constants') return { expoConfig: { version: 'test' } };
    if (name === 'expo-router') return { Stack: { Screen: host }, useLocalSearchParams: () => ({ axis: axisId }), useFocusEffect() {}, router: { push: r => { assert.equal(catalog.getTopic('abraham').id, 'abraham'); navigation.push(r); } } };
    if (name === '@/lib/useSafeBack') return { useSafeBack: () => ({ headerOptions: {} }) };
    if (name === '@/website-runtime/progressiveRuntime') return { getProgressiveGraphCatalog: () => guarded };
    if (name === './progressiveRuntime') return { acquireDiscoverSearch() { throw Error('Unexpected search acquisition on initial render'); } };
    if (name === '@/website-runtime/useProgressiveDiscoverSearch') return compile(path.resolve('product-runtime/useProgressiveDiscoverSearch.ts'));
    if (name === '@/discover-graph/useActiveGraph') return { useActiveGraphSnapshot: () => graph };
    if (name === '@/theme/tokens') return { useTheme: () => ({}), spacing: {}, radius: {}, typography: {}, elevation: {} };
    if (name === '@/lib/stack') return { replaceDiscoveryStack: async rows => navigation.push(rows) };
    if (name === '@/data/scripture/canonical') return new Proxy({}, { get: () => () => { throw Error('Unexpected canonical read during empty search'); } });
    if (name === '@/data/discover-search-index.generated') return { DISCOVER_SEARCH_INDEX_HASH: 'not-exercised-for-empty-query', discoverSearchRecords: new Proxy([], { get() { throw Error('Unexpected search index read on landing'); } }) };
    if (name === '@/components/ui' || name === '@/components/spatial/ResponsiveWorkspace') return new Proxy({}, { get: (_o, k) => k === '__esModule' ? false : host });
    if (name === '@/components/AppIcon') return { AppIcon: host };
    if (['@/lib/trails', '@/lib/discoverAwareness', '@/scripture-tree/characterTrailTreeRuntime'].includes(name)) return new Proxy({}, { get: () => { throw Error(`Unexpected landing service access:${name}`); } });
    const files = { '@/data/ontology': 'data/ontology.ts', '@/lib/discoverSearch': 'lib/discoverSearch.ts', '@/components/DiscoveryAxisCard': 'components/DiscoveryAxisCard.tsx', '@/components/DiscoverSearchSheet': 'components/DiscoverSearchSheet.tsx', '@/components/DiscoveryEntryCard': 'components/DiscoveryEntryCard.tsx' };
    if (files[name]) {
      const exports = compile(path.join(native, files[name]));
      if (name === '@/components/DiscoveryEntryCard') return { DiscoveryEntryCard: props => { cardRows.push(props); return React.createElement(exports.DiscoveryEntryCard, props); } };
      return exports;
    }
    throw Error(`Unexpected render import:${name}`);
  };
  vm.runInNewContext(ts.transpileModule(override ?? fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, { module, exports: module.exports, require });
  if (!override) modules.set(file, module.exports);
  return module.exports;
}
const file = path.join(stage, 'src/app/(tabs)/index.tsx');
const patched = fs.readFileSync(file, 'utf8');
assert.doesNotMatch(patched, /\btopics\s*\[/);
const Screen = compile(file).default;
function render(Component = Screen) {
  stateIndex = 0; selected = []; cardRows = [];
  return renderToString(React.createElement(Component));
}
const html = render(); assert.ok(html.includes('Look again.'));
assert.deepEqual(cardRows.map(r => r.card), catalog.discoveryCards.filter(c => c.route));
for (const row of cardRows) assert.equal(row.isNew, Boolean(catalog.metadata(row.card.id)?.pack));
let labelCount = 0;
for (const subject of startup.catalog.subjects) {
  const topic = original.topics[subject.id];
  assert.equal(subject.title, topic.title); assert.equal(subject.axis, topic.axis);
  assert.deepEqual(subject.pack, topic.pack ? JSON.parse(JSON.stringify(topic.pack)) : undefined);
  for (const [sceneId, label] of Object.entries(subject.continuePositionLabels)) {
    assert.equal(label, continuationLabel(topic, sceneId)); labelCount++;
  }
  const [sceneId, label] = Object.entries(subject.continuePositionLabels)[0] ?? [];
  remembered = { topicId: subject.id, topicTitle: subject.title, currentPassageId: sceneId, summary: 'fallback' };
  assert.ok(render().includes(label ?? 'fallback'));
}
remembered = undefined;
const AxisScreen = compile(path.join(stage, 'src/app/discover/[axis].tsx')).default;
for (axisId of ['character', 'event', 'concept']) {
  render(AxisScreen);
  assert.deepEqual(cardRows.map(r => r.card), catalog.discoveryCards.filter(c => c.route && c.axis === axisId));
}
render();
assert.equal(bodyTouches, 0); assert.equal(requests, 0);
assert.deepEqual(catalog.diagnostics().hydratedTopicIds, []);
assert.throws(() => catalog.getTopic('abraham'), /SDW_TOPIC_ACQUISITION_REQUIRED:abraham/);
// Mutation control proves the guard fails if the old metadata/body misuse returns.
const broken = patched.replace('startupCatalog.metadata(card.id)?.pack', 'getProgressiveGraphCatalog().topics[card.id]?.pack');
assert.notEqual(broken, patched);
assert.throws(() => render(compile(file, broken).default), /LANDING_TOPIC_BODY_ACCESS:abraham/);
bodyTouches = 0; render();
const abraham = cardRows.find(r => r.card.id === 'abraham'); assert.ok(abraham);
landing = false;
abraham.onPress(); abraham.onPress();
for (let i = 0; i < 100 && navigation.length < 4; i++) await new Promise(resolve => setImmediate(resolve));
assert.equal(navigation.filter(r => r === '/discovery/abraham').length, 2);
assert.equal(requests, 1); assert.deepEqual(catalog.diagnostics().hydratedTopicIds, ['abraham']);
assert.deepEqual(catalog.getTopic('abraham'), JSON.parse(JSON.stringify(original.topics.abraham)));
abraham.onPress();
for (let i = 0; i < 100 && navigation.length < 6; i++) await new Promise(resolve => setImmediate(resolve));
assert.equal(requests, 1);
assert.throws(() => catalog.getTopic('moses'), /SDW_TOPIC_ACQUISITION_REQUIRED:moses/);
const report = { verdict: 'PASS', scope: 'ACTUAL_STAGED_LANDING_AND_CARD_REACT_RENDER_NOT_FULL_BROWSER_ACCEPTANCE', revision: proof.revision,
  subjectCount: 50, cardCount: 55, cardOrderLabelsCapabilitiesReferences: 'EXACT_BUILD_PROJECTION', continuationLabelsVerified: labelCount,
  initialRender: { topicBodyHydrations: 0, topicPacketAcquisitions: 0, bodyAccessorTouches: bodyTouches }, mutationControl: 'PASS',
  selectedAbraham: { topicBodyHydrations: 1, topicPacketAcquisitions: requests, exactBody: true, existingNavigationDispatched: true },
  otherUnhydratedBodiesStillThrow: true, publicExportChanged: false, productionAcceptance: false };
fs.writeFileSync('docs/01b-evidence/r2a-discover-metadata-regression.json', JSON.stringify(report, null, 2)+'\n');
console.log(report);
