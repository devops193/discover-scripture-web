import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createPacketCache } from '../product-runtime/packetCache.mjs';
import { createProgressiveScriptureReader } from '../product-runtime/progressiveScripture.mjs';
import { createProgressiveGraphCatalog } from '../product-runtime/progressiveGraphCatalog.mjs';
import { createProgressiveDgr } from '../product-runtime/progressiveDgr.mjs';
import { createProgressiveSceneContexts } from '../product-runtime/progressiveSceneContexts.mjs';
import { createProgressiveWorldProjection } from '../product-runtime/progressiveWorldProjection.mjs';
import { createVerifiedWorldRoots } from '../product-runtime/verifiedWorldRoots.mjs';
import { createProgressiveCompare } from '../product-runtime/progressiveCompare.mjs';
import { createProgressiveContradictions } from '../product-runtime/progressiveContradictions.mjs';
import { applyProgressiveConsumerOverlays } from './progressive-consumer-overlays.mjs';
import { OWNER_REGISTRIES, readOwnerSources } from './build-r2-scene-contexts.mjs';
import { portableHashValue } from '../../ScriptureDiscovery/src/scripture-tree/portableRuntimeServices.mjs';
import { QUESTIONS_SOURCE_PINS, createQuestionsTreeReader } from '../../ScriptureDiscovery/src/scripture-tree/questionsTreeReader.mjs';
import * as presenterContracts from '../../ScriptureDiscovery/src/scripture-tree/presenterRuntimeContracts.mjs';
import { createCharacterTrailProjection } from '../../ScriptureDiscovery/src/scripture-tree/characterTrailProjection.mjs';
import { createCompareAccess, compareRouteMode } from '../../ScriptureDiscovery/src/scripture-tree/compareAccess.mjs';
import { sha256 } from '../../ScriptureDiscovery/node_modules/@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '../../ScriptureDiscovery/node_modules/@noble/hashes/utils.js';
const projection = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const stage = fs.mkdtempSync(path.resolve('.product-build-r2-consumers-'));
const source = path.resolve('../ScriptureDiscovery');
for (const relative of ['data/discover-search-index.generated.ts', 'components/DiscoverSearchSheet.tsx', 'digital-altar/presenter/treeGraphResolver.ts', 'app/digital-altar/commander.tsx', 'app/digital-altar/programs.tsx', 'data/contradictions/index.ts', 'app/discovery/[slug]/dissect.tsx', 'components/TrailCapsule.tsx', 'app/(tabs)/saved.tsx']) {
  fs.mkdirSync(path.dirname(path.join(stage, 'src', relative)), { recursive: true });
  fs.copyFileSync(path.join(source, 'src', relative), path.join(stage, 'src', relative));
}
fs.mkdirSync(path.join(stage, 'src/questions'), { recursive: true });
fs.copyFileSync(path.join(source, 'src/questions/runtime.ts'), path.join(stage, 'src/questions/runtime.ts'));
const files = ['data/scripture/runtime.ts', 'data/seed.ts', 'discover-graph/activeProvider.ts', 'dgr-runtime-02/runtime.ts', 'scripture-tree/questionsTreeRuntime.ts', 'scripture-tree/readerGraphAdapter.ts', 'reading-investigation/runtime.ts', 'c3/anchors/sceneMetadata.ts', 'components/QuestionUnitView.tsx', 'app/(tabs)/index.tsx', 'app/discovery/[slug]/scene.tsx', 'app/discover/[axis].tsx', 'app/(tabs)/reading.tsx', 'digital-altar/commander/GraphNativeLiveWorkspace.tsx'];
for (const file of files) { fs.mkdirSync(path.dirname(path.join(stage, 'src', file)), { recursive: true }); fs.copyFileSync(path.join(source, 'src', file), path.join(stage, 'src', file)); }
for (const name of ['smartPresenterTreeRuntime.ts', 'presenterBundleLoaders.generated.ts', 'characterTrailTreeRuntime.ts', 'discoverToolsTreeRuntime.ts', 'ordinaryCompareRuntime.ts', 'compareAccess.mjs']) fs.copyFileSync(path.join(source, 'src/scripture-tree', name), path.join(stage, 'src/scripture-tree', name));
for (const name of ['_layout.tsx', 'index.tsx', 'compare.tsx', 'pivot.tsx']) fs.copyFileSync(path.join(source, 'src/app/discovery/[slug]', name), path.join(stage, 'src/app/discovery/[slug]', name));
fs.mkdirSync(path.join(stage, 'src/worlds'), { recursive: true });
for (const name of ['worldKernel.mjs', 'characterWorldRuntime.ts', 'worldTreeAdapter.ts', 'CharacterWorldScreen.tsx']) fs.copyFileSync(path.join(source, 'src/worlds', name), path.join(stage, 'src/worlds', name));
const changed = applyProgressiveConsumerOverlays(stage);
for (const relative of changed) {
  const result = ts.transpileModule(fs.readFileSync(path.join(stage, 'src', relative), 'utf8'), { fileName: relative, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
}
function compile(file, require) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports, require, performance, location: { origin: 'https://r2.test' } });
  return module.exports;
}
const canonical = compile(path.join(source, 'src/data/scripture/canonical.ts'), name => {
  assert.equal(name, '../../discover-graph/phase0Trace');
  return { phase0Measure: (_s, _e, fn) => fn(), phase0HasActiveTrace: () => false, phase0TouchScripture() {}, phase0Count() {} };
});
const stored = new Map(), network = [], counts = {}, identities = new Map();
const { createProgressiveQuestions } = compile('product-runtime/progressiveQuestions.mjs', name => {
  if (name === '@/scripture-tree/portableRuntimeServices.mjs') return { portableHashValue };
  if (name === '@/scripture-tree/questionsTreeReader.mjs') return { QUESTIONS_SOURCE_PINS };
  throw Error(`Unexpected Questions projection dependency:${name}`);
});
const { createProgressiveTree } = compile('product-runtime/progressiveTree.mjs', name => {
  assert.equal(name, '@/scripture-tree/portableRuntimeServices.mjs'); return { portableHashValue };
});
const cacheStorage = { open: async () => ({ match: async key => stored.get(key)?.clone(), put: async (key, response) => stored.set(key, response.clone()), delete: async key => stored.delete(key) }) };
const runtime = compile('product-runtime/progressiveRuntime.ts', name => {
  if (name === './packetCache.mjs') return { createPacketCache: options => createPacketCache({ ...options, cacheStorage, fetchResource: async url => { network.push(url); return new Response(fs.readFileSync(path.join(projection.output, path.basename(new URL(url).pathname)))); } }) };
  if (name === './progressiveScripture.mjs') return { createProgressiveScriptureReader };
  if (name === './progressiveGraphCatalog.mjs') return { createProgressiveGraphCatalog };
  if (name === './progressiveDgr.mjs') return { createProgressiveDgr };
  if (name === './progressiveQuestions.mjs') return { createProgressiveQuestions };
  if (name === './progressiveSceneContexts.mjs') return { createProgressiveSceneContexts };
  if (name === './progressiveTree.mjs') return { createProgressiveTree };
  if (name === './progressiveCompare.mjs') return { createProgressiveCompare };
  if (name === './progressiveContradictions.mjs') return { createProgressiveContradictions };
  if (name === './progressiveWorldProjection.mjs') return { createProgressiveWorldProjection };
  if (name === './verifiedWorldRoots.mjs') return { createVerifiedWorldRoots };
  if (name === '@/scripture-tree/portableRuntimeServices.mjs') return { portableHashValue };
  if (name === '@/data/scripture/canonical') return canonical;
  if (name === './runtimeEvidence') return { recordBoot: name => { counts[name] = (counts[name] ?? 0) + 1; }, recordIdentity: (name, object) => { assert.ok(!identities.has(name) || identities.get(name) === object); identities.set(name, object); } };
  throw Error(`Unexpected shared runtime import: ${name}`);
});
runtime.bindProgressiveRevision({ revision: projection.revision, canonicalSourceHash: projection.canonicalSourceHash, manifest: projection.manifest });
const boot = runtime.initializeCanonicalCorpus();
assert.equal(runtime.initializeCanonicalCorpus(), boot);
await boot;
assert.equal(counts.canonicalBoot, 1); assert.equal(network.length, 5);
assert.equal(runtime.progressiveRuntimeDiagnostics().scripture.hydratedChapters.length, 0);
assert.equal(runtime.progressiveRuntimeDiagnostics().graph.hydratedTopicIds.length, 0);
function presenterDependency(name) {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === './portableRuntimeServices.mjs') return { portableHashValue };
  if (name === './presenterRuntimeContracts.mjs') return presenterContracts;
  if (name === '@/data/scripture/canonical') return canonical;
  // These separate integration gates must never silently pass through a mock.
  if (name === '@/dgr/runtime') return { getDgrRuntimeBundle() { throw Error('DGR_CHANNEL_OUTSIDE_TREE_RECORD_TEST'); }, getDgrRuntimeChannel() { throw Error('DGR_CHANNEL_OUTSIDE_TREE_RECORD_TEST'); } };
  if (name === '@/dgr-runtime-02/runtime') return { getProductionQuestionRecords() { throw Error('QUESTION_PRESENTATION_OUTSIDE_TREE_RECORD_TEST'); } };
  if (name === './questionsTreeRuntime') return { validateEmbeddedQuestionRecord() { throw Error('QUESTION_PRESENTATION_OUTSIDE_TREE_RECORD_TEST'); } };
  if (name === './presenterBundleLoaders.generated') return compile(path.join(source, 'src/scripture-tree/presenterBundleLoaders.generated.ts'), name => JSON.parse(fs.readFileSync(path.resolve(source, 'src/scripture-tree', name))));
  if (name.startsWith('../../assets/scripture-tree/presenter-v3/')) return { default: JSON.parse(fs.readFileSync(path.resolve(source, 'src/scripture-tree', name))) };
  throw Error(`Unexpected Presenter dependency:${name}`);
}
const stagedPresenter = compile(path.join(stage, 'src/scripture-tree/smartPresenterTreeRuntime.ts'), presenterDependency);
assert.equal(stagedPresenter.smartPresenterTreeRuntime.revisionId, 'bundled-approved');
assert.equal(stagedPresenter.presenterRuntimeDiagnostics().startupImportBytes, 0);
assert.equal(network.length, 5);
assert.throws(() => stagedPresenter.smartPresenterTreeRuntime.resolveScene('anything'), /ACQUISITION_REQUIRED/);
const seed = compile(path.join(stage, 'src/data/seed.ts'), name => { assert.equal(name, '@/website-runtime/progressiveRuntime'); return runtime; });
const revisions = compile(path.join(source, 'src/discover-graph/revisions.ts'), name => { throw Error(`Unexpected revisions import: ${name}`); });
const providerModule = compile(path.join(stage, 'src/discover-graph/activeProvider.ts'), name => {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === './revisions') return revisions;
  if (name === './phase0Trace') return { phase0Measure: (_s,_e,fn) => fn(), phase0Count() {}, phase0TouchScripture() {} };
  throw Error(`Unexpected provider import: ${name}`);
});
const provider = new providerModule.ActiveGraphProvider(seed);
const snapshot = provider.getActiveSnapshot();
assert.equal(snapshot.discoveryCards.length, 55);
assert.equal(Object.keys(snapshot.topics).length, 50);
assert.equal(network.length, 5);
assert.equal(runtime.getProgressiveGraphCatalog().diagnostics().hydratedTopicIds.length, 0);
assert.throws(() => provider.getTopic('abraham'), /TOPIC_ACQUISITION_REQUIRED/);
const reader = canonical.getCanonicalCorpusReader();
await Promise.all(Array.from({ length: 20 }, () => runtime.acquireScripture('Genesis 22')));
assert.equal(network.length, 6);
const discoverySource = canonical.getScripture('Genesis 22');
assert.equal(discoverySource.verses.length, 24);
// Commander imports the same module, invokes the same acquisition method and
// reuses the exact installed reader; it must not construct a second provider.
await runtime.initializeCanonicalCorpus();
const commanderSource = await runtime.acquireScripture('Genesis 22');
assert.equal(commanderSource, discoverySource); assert.equal(canonical.getCanonicalCorpusReader(), reader);
assert.equal(network.length, 6); assert.equal(counts.canonicalBoot, 1);
await runtime.acquireScripture('Genesis 23'); assert.equal(network.length, 7);
await runtime.acquireScripture('Genesis 22'); assert.equal(network.length, 7);
await Promise.all(Array.from({ length: 10 }, () => runtime.getProgressiveGraphCatalog().ensureTopic('abraham')));
assert.equal(network.length, 8);
const topic = provider.getTopic('abraham'); assert.equal(topic.id, 'abraham');
assert.equal(provider.getActiveSnapshot(), snapshot);
assert.equal(await runtime.getProgressiveGraphCatalog().ensureTopic('abraham'), topic);
assert.equal(network.length, 8);
const dgrRuntime = compile(path.join(stage, 'src/dgr-runtime-02/runtime.ts'), name => {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === '@/discover-graph/phase0Trace') return { phase0Measure: (_s,_e,fn) => fn(), phase0Count() {} };
  // Language presentation is not invoked in this record/membership test.
  if (name === './source-language') return { sourceLanguagesForEvidence() { throw Error('Source-language presentation outside this test scope'); } };
  throw Error(`Unexpected DGR import: ${name}`);
});
assert.equal(runtime.getProgressiveDgr().diagnostics().hydratedQuestionCount, 0);
const frozen = JSON.parse(fs.readFileSync(path.join(source, 'assets/dgr/runtime-02/production-runtime-bundle.json')));
const findingIds = new Set(frozen.questionRecords.flatMap(record => record.findings.map(item => item.findingId)));
const evidenceIds = new Set(frozen.questionRecords.flatMap(record => record.evidence.map(item => item.refId)));
assert.equal(findingIds.size, 308); assert.equal(evidenceIds.size, 220);
const lookup = runtime.getProgressiveDgr().lookup;
const first = frozen.questionRecords[0];
assert.throws(() => runtime.getProgressiveDgr().recordByQuestionId.get(first.contract.questionId), /ACQUISITION_REQUIRED/);
await runtime.getProgressiveDgr().ensureQuestion(first.contract.questionId);
assert.equal(network.length, 9);
assert.equal(dgrRuntime.isProductionQuestionRecordValid(runtime.getProgressiveDgr().recordByQuestionId.get(first.contract.questionId)), true);
for (const record of frozen.questionRecords) {
  const value = await runtime.getProgressiveDgr().ensureQuestion(record.contract.questionId);
  assert.deepEqual(value, record);
  assert.equal(dgrRuntime.isProductionQuestionRecordValid(value), true);
}
const byId = new Map(frozen.questionRecords.map(record => [record.contract.questionId, record]));
for (const row of lookup.records) {
  const actual = dgrRuntime.getProductionQuestionRecords({ sceneId: row.sceneId, subjectId: row.subjectId, mode: 'TOPIC' });
  const expected = row.questionIds.map(id => byId.get(id)).filter(record => record && record.contract.sceneId === row.sceneId && record.contract.subjectId === row.subjectId && record.sourceIndexHash === row.sourceIndexHash);
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
}
await runtime.acquireReadingMetadata();
const metadata = runtime.getReadingMetadata();
const originalQuestions = createQuestionsTreeReader({ tree: metadata.tree, coordinates: metadata.coordinates,
  bundle: frozen, lookup, authority: runtime.getProgressiveDgr().authority });
assert.equal(originalQuestions.valid, true);
const progressiveQuestions = runtime.getProgressiveQuestionReader();
for (const row of lookup.records) for (const mode of ['TOPIC', 'PINNED', 'READING_DISCOVER']) {
  const input = { sceneId: row.sceneId, subjectId: row.subjectId, mode };
  assert.deepEqual(JSON.parse(JSON.stringify(progressiveQuestions.list(input))), JSON.parse(JSON.stringify(originalQuestions.list(input))));
}
assert.equal(progressiveQuestions.get(first.contract.questionId, 'wrong-owner', first.contract.sceneId), undefined);
assert.equal(progressiveQuestions.get(first.contract.questionId, first.contract.subjectId, first.contract.sceneId, 'wrong-revision'), undefined);
const tampered = structuredClone(metadata); tampered.tree.sceneQuestionRefs[`scene:${first.contract.sceneId}`] = [];
assert.throws(() => createProgressiveQuestions({ revision: projection.revision, metadata: tampered, dgr: runtime.getProgressiveDgr() }), /INTEGRITY/);
const readerBefore = network.length;
await runtime.acquireReadingScripture('Genesis 22');
assert.equal(network.length, readerBefore);
const stagedReader = compile(path.join(stage, 'src/scripture-tree/readerGraphAdapter.ts'), name => {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === '@/discover-graph/phase0Trace') return { phase0Measure: (_a,_b,fn) => fn(), phase0Count() {}, phase0TouchScripture() {} };
  if (name === '@noble/hashes/sha2.js') return { sha256 };
  if (name === '@noble/hashes/utils.js') return { utf8ToBytes, bytesToHex };
  throw Error(`Unexpected Reader dependency:${name}`);
});
const readingAdapter = stagedReader.createReaderGraphAdapter(metadata.coordinates);
for (const [chapterKey, indices] of Object.entries(metadata.tree.chapterRows)) {
  const split = chapterKey.lastIndexOf(':');
  const rows = readingAdapter.resolveReadingScope(chapterKey.slice(0, split), Number(chapterKey.slice(split+1)), 1, 999);
  assert.deepEqual(JSON.parse(JSON.stringify(rows)), indices.map(index => metadata.coordinates.coordinates[index]));
}
const treeBefore = network.length;
await Promise.all(Array.from({ length: 5 }, () => runtime.acquireTopicTree('abraham')));
const tree = runtime.getProgressiveTree();
assert.equal(tree.diagnostics().hydratedRecords, 2);
assert.equal(network.length - treeBefore, 5); // metadata, Trail metadata, owner index, two selected records
const abrahamIndex = tree.getIndex('subject', 'abraham');
assert.ok(abrahamIndex.identities[`scene:${topic.passages[0].id}`]);
const stagedTrail = compile(path.join(stage, 'src/scripture-tree/characterTrailTreeRuntime.ts'), name => {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === './characterTrailBinding.generated') return compile(path.join(source, 'src/scripture-tree/characterTrailBinding.generated.ts'), () => { throw Error('Unexpected Trail binding dependency'); });
  if (name === './characterTrailProjection.mjs') return { createCharacterTrailProjection };
  if (name === './smartPresenterTreeRuntime') return stagedPresenter;
  throw Error(`Unexpected Trail dependency:${name}`);
}).characterTrailTreeRuntime;
const originalTrail = createCharacterTrailProjection(tree.getTrail(), tree.metadata.trailHash);
assert.deepEqual(stagedTrail.resolve('abraham'), originalTrail.resolve('abraham'));
assert.equal(tree.diagnostics().hydratedRecords, 2, 'Trail identity checks must not hydrate every Scene');
let trailPositions = 0;
for (const record of tree.getTrail().records) {
  await tree.ensureIndex('subject', record.id);
  assert.deepEqual(stagedTrail.resolve(record.id), originalTrail.resolve(record.id));
  assert.equal(stagedTrail.hasCharacter(record.id), true);
  for (const scene of record.scenes) {
    assert.deepEqual(stagedTrail.scene(record.id, scene.id), originalTrail.scene(record.id, scene.id));
    assert.deepEqual(stagedTrail.position(record.id, scene.id), originalTrail.position(record.id, scene.id)); trailPositions++;
  }
}
assert.equal(stagedTrail.resolve('abraham', 'wrong-revision'), undefined);
assert.equal(stagedTrail.hasCharacter('unknown'), false);
assert.equal(tree.diagnostics().hydratedRecords, 2);
fs.writeFileSync('docs/01b-evidence/r2-trail-metadata-equivalence.json', JSON.stringify({ status: 'PASS', revision: projection.revision,
  scope: 'NATIVE_TRAIL_RESOLVER_WITH_VERIFIED_IDENTITY_METADATA_NOT_FULL_UI', records: tree.getTrail().records.length,
  sceneAndPositionComparisons: trailPositions, sceneBodyHydrations: 0, exactOriginalTrailHash: tree.metadata.trailHash, publicActivation: false }, null, 2)+'\n');
assert.throws(() => tree.getRecord('subject', 'abraham', 'presenter', `scene:${topic.passages[0].id}`), /ACQUISITION_REQUIRED/);
await runtime.acquireSceneTree('abraham', topic.passages[0].id);
const sceneTreeRequests = network.length;
await runtime.acquireSceneTree('abraham', topic.passages[0].id); assert.equal(network.length, sceneTreeRequests);
const sceneBefore = network.length;
await runtime.acquireScene('abraham', topic.passages[0].id);
assert.equal(network.length - sceneBefore, 3);
await runtime.acquireScene('abraham', topic.passages[0].id);
assert.equal(network.length - sceneBefore, 3);
await assert.rejects(runtime.acquireScene('abraham', 'unknown-scene'), /OWNER_MISMATCH/);
let treeRecordCount = 0;
for (const descriptor of tree.metadata.manifest.packages) {
  const segment = JSON.parse(fs.readFileSync(path.join(source, 'assets/scripture-tree/presenter-v3', path.basename(descriptor.file))));
  for (const family of ['capability', 'analysis', 'presenter', 'related']) for (const row of segment[family] ?? []) {
    const ref = family === 'related' ? row.contextRef : row.ref;
    assert.deepEqual(await tree.ensureRecord(descriptor.kind, descriptor.id, family, ref), row); treeRecordCount++;
  }
}
assert.equal(treeRecordCount, tree.diagnostics().hydratedRecords);
const stagedAccess = compile(path.join(stage, 'src/scripture-tree/compareAccess.mjs'), name => {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === './portableRuntimeServices.mjs') return { portableHashValue };
  throw Error(`Unexpected Compare access dependency:${name}`);
});
function compareDependency(staged) { return name => {
  if (name === '@/website-runtime/progressiveRuntime') return runtime;
  if (name === './portableRuntimeServices.mjs') return { portableHashValue };
  if (name === '@/data/scripture/canonical') return canonical;
  if (name === './compareAccess.mjs') return staged ? stagedAccess : { createCompareAccess, compareRouteMode };
  if (name === './compareBinding.generated') return compile(path.join(source, 'src/scripture-tree/compareBinding.generated.ts'), () => { throw Error('Unexpected Compare pin import'); });
  if (name === './presenterBundleLoaders.generated') return presenterDependency(name);
  if (name.startsWith('../../assets/')) return { default: JSON.parse(fs.readFileSync(path.resolve(source, 'src/scripture-tree', name))) };
  throw Error(`Unexpected Compare dependency:${name}`);
}; }
const stagedCompare = compile(path.join(stage, 'src/scripture-tree/ordinaryCompareRuntime.ts'), compareDependency(true)).ordinaryCompareRuntime;
assert.equal(stagedCompare.diagnostics().startupImportBytes, 0);
assert.throws(() => stagedCompare.resolve('abraham'), /ACQUISITION_REQUIRED/);
await runtime.acquireCompareMetadata();
const compareStore = runtime.getProgressiveCompare();
const originalCompare = compile(path.join(source, 'src/scripture-tree/ordinaryCompareRuntime.ts'), compareDependency(false)).ordinaryCompareRuntime;
const compareMetadata = JSON.parse(fs.readFileSync(path.join(source, 'assets/scripture-tree/compare-v3.json')));
let ordinaryCompareCount = 0, compareSceneBindings = 0;
const normalizeCompare = value => value === undefined ? undefined : JSON.parse(JSON.stringify({ ...value, openedAt: 0 }));
for (const id of Object.keys(compareMetadata.topics)) await compareStore.ensureOwner(id);
for (const ref of Object.keys(compareMetadata.bindings).filter(ref => ref.startsWith('compare:'))) {
  const [, subjectId, compareId] = ref.split(':');
  assert.deepEqual(normalizeCompare(stagedCompare.resolve(subjectId, compareId)), normalizeCompare(originalCompare.resolve(subjectId, compareId)));
  assert.equal(stagedCompare.resolve(subjectId, compareId, undefined, 'wrong-revision'), undefined);
  ordinaryCompareCount++;
}
for (const [sceneRef, ids] of Object.entries(compareMetadata.sceneCompares)) {
  const subjectId = tree.metadata.dgr.sceneOwners.find(row => row.contextRef === sceneRef)?.subjectId;
  for (const id of ids) {
    assert.deepEqual(normalizeCompare(stagedCompare.resolve(subjectId, id, sceneRef.slice(6))), normalizeCompare(originalCompare.resolve(subjectId, id, sceneRef.slice(6)))); compareSceneBindings++;
  }
}
assert.equal(ordinaryCompareCount, 1510);
fs.writeFileSync('docs/01b-evidence/r2-compare-owner-equivalence.json', JSON.stringify({ status: 'PASS', revision: projection.revision,
  scope: 'NATIVE_COMPARE_RESOLVER_ON_VERIFIED_OWNER_PACKETS_NOT_FULL_UI', ordinaryCompareCount, compareSceneBindings,
  exactRecordNavigationCapsuleAndPivotEquivalence: true, originalRowRouteHashChecksPreserved: true,
  originalAggregatePinsValidatedAtBuild: true, ownerPacketsContentHashVerifiedAtRuntime: true, startupComparePacketRequests: 0,
  contradictionRuntimeChanged: false, publicActivation: false }, null, 2)+'\n');
const originalPresenter = compile(path.join(source, 'src/scripture-tree/smartPresenterTreeRuntime.ts'), presenterDependency).smartPresenterTreeRuntime;
const migratedPresenter = stagedPresenter.smartPresenterTreeRuntime;
let presenterComparisons = 0;
function comparePresenter(method, ...args) {
  const normalize = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  assert.deepEqual(normalize(migratedPresenter[method](...args)), normalize(originalPresenter[method](...args)), `${method}:${args.join('/')}`);
  presenterComparisons++;
}
for (const descriptor of tree.metadata.manifest.packages) {
  const segment = JSON.parse(fs.readFileSync(path.join(source, 'assets/scripture-tree/presenter-v3', path.basename(descriptor.file))));
  for (const row of segment.presenter ?? []) {
    if (row.ref.startsWith('scene:')) {
      const id = row.ref.slice(6);
      comparePresenter('resolveScene', id); comparePresenter('ownerForScene', id);
      comparePresenter('resolveContextEdgeRefs', id); comparePresenter('resolveLegacySceneLookup', id, row.displayIdentity?.citation);
    } else if (/^(character|event|concept):/.test(row.ref)) {
      const [kind, ...id] = row.ref.split(':'); comparePresenter('resolveTopic', kind.toUpperCase(), id.join(':'));
    }
  }
  for (const row of segment.analysis ?? []) comparePresenter('resolveAnalysis', row.ref);
  for (const row of segment.related ?? []) if (!row.contextRef.startsWith('scripture:')) {
    comparePresenter('resolveRelatedPresentation', row.contextRef);
    comparePresenter('resolveRelatedContextEntries', row.contextRef);
  }
  for (const row of segment.capability ?? []) {
    const [kind, ...id] = row.ref.split(':');
    comparePresenter('resolveCapability', kind.toUpperCase(), id.join(':'), row.contextBinding?.subjectId, row.contextBinding?.sceneId);
  }
}
fs.writeFileSync('docs/01b-evidence/r2-presenter-selected-resolver-equivalence.json', JSON.stringify({ status: 'PASS', revision: projection.revision,
  scope: 'NATIVE_RESOLVER_ALGORITHMS_ON_ACQUIRED_RECORDS_NOT_FULL_UI', presenterComparisons, startupPacketRequests: 5,
  startupTreePacketRequests: 0, knownUnacquiredTreeThrows: true, recordCount: treeRecordCount,
  dgrChannelAndQuestionPresentationTested: false, publicActivation: false }, null, 2)+'\n');
fs.writeFileSync('docs/01b-evidence/r2-tree-record-equivalence.json', JSON.stringify({ status: 'PASS', revision: projection.revision,
  scope: 'SELECTED_RECORD_TRANSPORT_NOT_NATIVE_TREE_CONSUMER_ACCEPTANCE', recordCount: treeRecordCount,
  selectedTopicRecordHydrations: 2, selectedTopicPacketRequests: 5, sceneIdentityMetadataRequiresNoBody: true,
  knownUnacquiredBodyThrows: true, repeatedScenePacketRequests: 0, exactOriginalRecordEquivalence: true,
  nativeSegmentHashesValidatedAtBuild: true, runtimeRecordHashesAndAuthorityChecked: true, publicActivation: false }, null, 2)+'\n');
assert.throws(() => runtime.bindProgressiveRevision({ revision: '0'.repeat(64) }), /REBIND_FORBIDDEN/);
// Exercise the generated loader facades and the original NQL selection logic.
// This test never replaces a missing owner with a partial/empty semantic body.
assert.equal(runtime.progressiveRuntimeDiagnostics().governedOwners.metadataAcquired, false);
assert.deepEqual(Array.from(runtime.progressiveRuntimeDiagnostics().governedOwners.hydrated), []);
const ownerInputs = readOwnerSources(source);
const ownerModules = {};
for (const [family, relative, exportName] of OWNER_REGISTRIES) {
  ownerModules[family] = compile(path.join(stage, relative), name => {
    assert.equal(name, '@/website-runtime/progressiveRuntime'); return runtime;
  });
  assert.throws(() => ownerModules[family][exportName].abraham, /METADATA_ACQUISITION_REQUIRED/);
}
const beforeOwners = network.length;
await runtime.acquireOwnerMetadata();
assert.equal(network.length - beforeOwners, 1);
assert.equal(runtime.progressiveRuntimeDiagnostics().governedOwners.hydrated.length, 0);
assert.throws(() => ownerModules.nql.nqlTopicLoaders.abraham(), /OWNER_ACQUISITION_REQUIRED/);
const beforeAbraham = network.length;
await Promise.all(Array.from({ length: 20 }, () => runtime.acquireGovernedOwner('nql', 'abraham')));
assert.equal(network.length - beforeAbraham, 1);
assert.deepEqual(Array.from(runtime.progressiveRuntimeDiagnostics().governedOwners.hydrated), ['nql:abraham']);
await runtime.acquireGovernedOwner('nql', 'abraham'); assert.equal(network.length - beforeAbraham, 1);
assert.throws(() => ownerModules.nql.nqlTopicLoaders.adam(), /OWNER_ACQUISITION_REQUIRED/);
let ownerComparisons = 0, nqlSceneComparisons = 0;
const matching = compile(path.join(source, 'src/c3/nql/matching.ts'), name => { throw Error(name); });
const originalNql = compile(path.join(source, 'src/c3/nql/snapshot.generated.ts'), name => JSON.parse(fs.readFileSync(path.resolve(source, 'src/c3/nql', name))));
function nqlProvider(registry) {
  return compile(path.join(source, 'src/c3/nql/provider.ts'), name => {
    if (name === '@/c3/nql/matching') return matching;
    if (name === '@/c3/nql/snapshot.generated') return registry;
    throw Error(name);
  }).nqlPresetProvider;
}
const originalNqlProvider = nqlProvider(originalNql), stagedNqlProvider = nqlProvider(ownerModules.nql);
for (const [family, , exportName] of OWNER_REGISTRIES) {
  for (const [owner, { value, identity }] of Object.entries(ownerInputs.families[family].owners)) {
    await runtime.acquireGovernedOwner(family, owner);
    const loader = ownerModules[family][exportName][owner];
    const transported = typeof loader === 'function' ? loader() : loader.load();
    assert.deepEqual(JSON.parse(JSON.stringify(transported)), JSON.parse(JSON.stringify(value))); ownerComparisons++;
    if (typeof loader !== 'function') for (const [key, expected] of Object.entries(identity)) assert.equal(loader[key], expected);
    if (family === 'nql') for (const scene of value.scenes) {
      const anchor = { mode: 'SCENE', subjectId: owner, sceneId: scene.sceneId };
      assert.deepEqual(JSON.parse(JSON.stringify(stagedNqlProvider.presetsForAnchor(anchor))), JSON.parse(JSON.stringify(originalNqlProvider.presetsForAnchor(anchor))));
      nqlSceneComparisons++;
    }
  }
}
assert.equal(ownerComparisons, 113); assert.equal(nqlSceneComparisons, 2558);
fs.writeFileSync('docs/01b-evidence/r2-governed-owner-runtime.json', JSON.stringify({ status: 'PASS', revision: projection.revision,
  scope: 'EXACT_ORIGINAL_OWNER_LOADERS_AND_NQL_SELECTION_NOT_FULL_PRODUCT', ownerComparisons, nqlSceneComparisons,
  startupOwnerMetadataRequests: 0, startupOwnerBodyRequests: 0, selectedConcurrentOwnerRequests: 1,
  repeatedOwnerRequests: 0, knownUnacquiredOwnerThrows: true, nativeSemanticResolversChanged: false }, null, 2)+'\n');
const report = { status: 'PASS', scope: 'SHARED_RUNTIME_MODULE_AND_CONSUMER_OVERLAYS_NOT_FULL_APPLICATION_ACCEPTANCE', stage, changed, consumerSyntaxChecks: 'PASS', startupPacketRequests: 5, startupChapterRequests: 0, startupHydratedTopicBodies: 0, startupHydratedQuestionBodies: 0, nativeDerivedSeedAndGraphProviderExecuted: true, nativeDgrValidatorsExecuted: true, exactQuestionRecords: 184, exactSceneLookupRows: lookup.records.length, sourceLanguagePresentationTested: false, subjectCount: 50, cardCount: 55, snapshotIdentitySurvivesTopicHydration: true, missingTopicFailsExplicitly: true, canonicalBoots: 1, readerIdentitySurvivesSurfaceUse: true, sameChapterConcurrentRequests: 1, repeatedReturnPacketRequests: 0, fullSqliteImportRequested: false, publicBootstrapActivated: false, remainingBlocker: 'Graph/DGR UI acquisition boundaries, Tree startup and World kernel consumers are not yet fully progressively bound.' };
fs.writeFileSync('docs/01b-evidence/r2-shared-runtime-integration.json', JSON.stringify(report, null, 2)+'\n'); console.log(report);
