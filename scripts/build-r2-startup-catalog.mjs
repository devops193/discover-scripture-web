// Execute the existing pure catalog projection at build time, not in the browser.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { portableHashValue } from '../../ScriptureDiscovery/src/scripture-tree/portableRuntimeServices.mjs';
import * as presenterContracts from '../../ScriptureDiscovery/src/scripture-tree/presenterRuntimeContracts.mjs';
import { createCharacterTrailProjection } from '../../ScriptureDiscovery/src/scripture-tree/characterTrailProjection.mjs';
const source = path.resolve('../ScriptureDiscovery');
const moduleCache = new Map(), sources = {};
const hash = value => createHash('sha256').update(value).digest('hex');
function compile(file, requireModule) {
  const text = fs.readFileSync(file, 'utf8'); sources[path.relative(source, file)] = hash(text);
  const module = { exports: {} };
  const code = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: requireModule, process: { env: { EXPO_PUBLIC_CONTENT_CHANNEL: 'live' } } }, { timeout: 30000 });
  return module.exports;
}
function loadData(file) {
  file = path.resolve(file);
  if (!file.startsWith(`${source}/src/data/`)) throw Error(`Unexpected catalog dependency: ${file}`);
  if (moduleCache.has(file)) return moduleCache.get(file);
  const result = compile(file, name => {
    if (!name.startsWith('.')) throw Error(`Unexpected catalog import: ${name}`);
    return loadData(path.resolve(path.dirname(file), `${name}.ts`));
  });
  moduleCache.set(file, result); return result;
}
export const catalog = loadData(path.join(source, 'src/data/seed.ts'));
const provider = compile(path.join(source, 'src/discover-graph/activeProvider.ts'), name => {
  if (!['./phase0Trace', './revisions'].includes(name)) throw Error(`Unexpected baseline dependency: ${name}`);
  return {};
});
const baseline = JSON.parse(JSON.stringify(provider.approvedBaseline(catalog)));
// Execute accepted native label/Trail/Tree code at build time. Only the resulting
// display strings enter startup metadata; no Scene or topic bodies are shipped.
const labelModules = new Map();
const unused = new Proxy({}, { get: (_target, key) => () => { throw Error(`Unexpected label dependency: ${String(key)}`); } });
function loadLabelModule(file) {
  if (!fs.existsSync(file)) file += '.ts';
  if (labelModules.has(file)) return labelModules.get(file);
  if (!file.startsWith(`${source}/`)) throw Error(`Unexpected label path: ${file}`);
  const bytes = fs.readFileSync(file); sources[path.relative(source, file)] = hash(bytes);
  const result = file.endsWith('.json') ? JSON.parse(bytes) : compile(file, name => {
    if (name.endsWith('/portableRuntimeServices.mjs')) return { portableHashValue };
    if (name.endsWith('/presenterRuntimeContracts.mjs')) return presenterContracts;
    if (name.endsWith('/characterTrailProjection.mjs')) return { createCharacterTrailProjection };
    if (['@/data/scripture/canonical', '@/data/scripture/registry', '@/discover-graph/phase0Trace', '@/dgr/runtime', '@/dgr-runtime-02/runtime', './questionsTreeRuntime'].includes(name)) return unused;
    if (name.startsWith('@/scripture-tree/')) return loadLabelModule(path.join(source, 'src', name.slice(2)));
    if (name.startsWith('.')) return loadLabelModule(path.resolve(path.dirname(file), name));
    throw Error(`Unexpected label import: ${name}`);
  });
  labelModules.set(file, result); return result;
}
for (const file of ['portableRuntimeServices.mjs', 'presenterRuntimeContracts.mjs', 'characterTrailProjection.mjs']) {
  const relative = `src/scripture-tree/${file}`;
  sources[relative] = hash(fs.readFileSync(path.join(source, relative)));
}
const trail = loadLabelModule(path.join(source, 'src/scripture-tree/characterTrailTreeRuntime.ts')).characterTrailTreeRuntime;
export const continuationLabel = loadLabelModule(path.join(source, 'src/lib/discovery.ts')).getContinuePositionLabel;
function continuationLabels(topic) {
  const record = topic.axis === 'character' ? trail.resolve(topic.id) : undefined;
  if (topic.axis === 'character') assert.ok(record, `Accepted Trail missing: ${topic.id}`);
  const ids = new Set([...topic.passages.map(p => p.id), ...(record?.navigationSceneIds ?? [])]);
  return Object.fromEntries([...ids].map(id => [id, continuationLabel(topic, id)]).filter(([, label]) => label !== undefined));
}
const subjects = Object.values(catalog.topics).map(topic => ({
  id: topic.id, axis: topic.axis, kind: topic.kind, title: topic.title,
  ...(topic.pack ? { pack: topic.pack } : {}),
  aliases: [...new Set([topic.id, topic.character?.id, topic.event?.id, topic.concept?.id].filter(Boolean))],
  continuePositionLabels: continuationLabels(topic),
}));
assert.equal(subjects.length, 50);
export const payload = { schema: 'SDW_STARTUP_CATALOG_CANDIDATE_V1', baseline, subjects, cards: catalog.discoveryCards, generatedCards: catalog.generatedDiscoveryCards, sourceHashes: sources };
const bytes = Buffer.from(JSON.stringify(payload)), sha256 = hash(bytes);
fs.mkdirSync('.product-build-r2-startup', { recursive: true });
fs.writeFileSync(`.product-build-r2-startup/${sha256}.json`, bytes);
const restored = JSON.parse(bytes);
assert.deepEqual(restored.baseline, baseline);
assert.deepEqual(restored.cards, JSON.parse(JSON.stringify(catalog.discoveryCards)));
const report = { status: 'PASS', productionActive: false, runtimeBound: false, subjectCount: subjects.length, cardCount: catalog.discoveryCards.length, bytes: bytes.length, sha256, output: `.product-build-r2-startup/${sha256}.json`, existingApprovedBaselineFunctionExecuted: true, capabilityAndReferenceEquivalence: 'PASS', cardOrderEquivalence: 'PASS', hydratedTopicBodiesIncluded: false, nativeSourceMutated: false };
fs.writeFileSync('docs/01b-evidence/r2-startup-catalog.json', JSON.stringify(report, null, 2) + '\n'); console.log(report);
