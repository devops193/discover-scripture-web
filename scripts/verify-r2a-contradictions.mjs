import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { readContradictionSources } from './build-r2-contradiction-packets.mjs';
import { applyProgressiveContradictionOverlay } from './progressive-contradiction-overlay.mjs';
import { createProgressiveContradictions } from '../product-runtime/progressiveContradictions.mjs';
import { createPacketCache } from '../product-runtime/packetCache.mjs';
const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(proof.output, `${proof.manifest.sha256}.json`)));
const original = readContradictionSources(path.resolve('../ScriptureDiscovery'));
assert.equal(manifest.contradictionSourceHash, original.sourceHash);
assert.equal(manifest.contradictionAuthorityHash, original.authorityHash);
const stored = new Map(), requests = [];
const cacheStorage = { open: async () => ({ match: async key => stored.get(key)?.clone(), put: async (key, value) => stored.set(key, value.clone()), delete: async key => stored.delete(key) }) };
const cache = createPacketCache({ revision: proof.revision, baseUrl: 'https://r2.test/sdw/', cacheStorage,
  fetchResource: async url => { requests.push(url); return new Response(fs.readFileSync(path.join(proof.output, path.basename(new URL(url).pathname)))); } });
const options = { revision: proof.revision, sourceHash: original.sourceHash, authorityHash: original.authorityHash, descriptor: manifest.contradictionIndex, transport: cache };
const store = createProgressiveContradictions(options);
const stage = fs.mkdtempSync(path.resolve('.product-build-contradiction-test-'));
fs.mkdirSync(path.join(stage, 'src/data/contradictions'), { recursive: true });
fs.copyFileSync('../ScriptureDiscovery/src/data/contradictions/index.ts', path.join(stage, 'src/data/contradictions/index.ts'));
applyProgressiveContradictionOverlay(stage);
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(stage, 'src/data/contradictions/index.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { module, exports: module.exports, require: name => { assert.equal(name, '@/website-runtime/progressiveRuntime'); return { getProgressiveContradictions: () => store }; } });
const staged = module.exports, normalize = value => JSON.parse(JSON.stringify(value));
assert.equal(requests.length, 0);
assert.throws(() => store.rows(), /INDEX_ACQUISITION_REQUIRED/);
await store.ensureIndex(); assert.equal(requests.length, 1);
assert.equal(store.diagnostics().hydratedIds.length, 0);
const startup = JSON.parse(fs.readFileSync(path.join(proof.output, `${manifest.startup.sha256}.json`)));
const subjects = [...startup.catalog.subjects.map(row => row.id), 'unknown'];
const passages = [...new Set(original.records.flatMap(row => row.anchors.flatMap(anchor => anchor.passageIds))), 'unknown'];
let attachmentComparisons = 0;
for (const subject of subjects) for (const passage of passages) {
  const actual = staged.getContradictionAttachmentsForPassage(subject, passage);
  const expected = original.native.getContradictionsForPassage(subject, passage);
  assert.deepEqual(normalize(actual.map(row => [row.id, row.title, row.classification, row.references, row.anchors])),
    normalize(expected.map(row => [row.id, row.title, row.classification, row.evidence.map(item => item.reference), row.anchors])));
  attachmentComparisons++;
}
assert.equal(requests.length, 1); assert.equal(store.diagnostics().hydratedIds.length, 0);
const selected = original.records[0]; assert.ok(selected);
assert.throws(() => staged.getContradictionById(selected.id), /RECORD_ACQUISITION_REQUIRED/);
await Promise.all(Array.from({ length: 20 }, () => store.ensure(selected.id)));
assert.equal(requests.length, 2); assert.deepEqual(store.diagnostics().hydratedIds, [selected.id]);
assert.deepEqual(normalize(staged.getContradictionById(selected.id)), selected);
await store.ensure(selected.id); assert.equal(requests.length, 2);
assert.equal(await store.ensure('unknown'), undefined); assert.equal(requests.length, 2);
if (original.records[1]) assert.throws(() => store.read(original.records[1].id), /RECORD_ACQUISITION_REQUIRED/);
const warm = createProgressiveContradictions(options);
await warm.ensure(selected.id); assert.equal(requests.length, 2);
let recordComparisons = 0;
for (const record of original.records) {
  await store.ensure(record.id);
  const actual = staged.getContradictionById(record.id);
  assert.deepEqual(normalize(actual), record);
  assert.deepEqual(normalize(staged.toContradictionCompareViewModel(actual)), normalize(original.native.toContradictionCompareViewModel(record)));
  recordComparisons++;
}
await assert.rejects(createProgressiveContradictions({ ...options, authorityHash: 'invalid' }).ensureIndex(), /INDEX_INTEGRITY/);
const corrupt = createPacketCache({ revision: proof.revision, baseUrl: 'https://r2.test/sdw/', cacheStorage: { open: async () => ({ match: async () => undefined, put: async () => { throw Error('MUST_NOT_PERSIST_CORRUPT'); } }) },
  fetchResource: async () => new Response('{}') });
await assert.rejects(createProgressiveContradictions({ ...options, transport: corrupt }).ensureIndex());
const report = { status: 'PASS', revision: proof.revision, canonicalAuthorityHash: original.authorityHash,
  recordComparisons, attachmentComparisons, indexBytes: manifest.contradictionIndex.bytes,
  metadataOnlyDiscovery: true, listingRecordHydrations: 0, selectedRecordRequests: 1,
  concurrentSelectedRecordRequests: 1, repeatedRecordRequests: 0, warmCachedRecordRequests: 0,
  exactRecordAndViewModelEquivalence: true, originalAttachmentPredicatePreserved: true,
  sourceAuthorityMismatchRejected: true, corruptBytesRejected: true, ordinaryCompareAuthorityUsed: false,
  fullRegistryPreload: false, scope: 'TRANSPORT_AND_NATIVE_RESOLVER_NOT_FULL_UI', publicActivation: false };
fs.writeFileSync('docs/01b-evidence/r2a-contradiction-attachments.json', JSON.stringify(report, null, 2)+'\n'); console.log(report);
