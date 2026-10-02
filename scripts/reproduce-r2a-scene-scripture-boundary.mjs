// Resume probe: real PrimarySceneCard -> PassageCard -> native source resolver.
// A reproduced stop is exit 2, not a passing integrated application gate.
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
import { createProgressiveScriptureReader } from '../product-runtime/progressiveScripture.mjs';
const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const root = path.resolve('../ScriptureDiscovery/src');
const read = d => {
  const bytes = fs.readFileSync(path.join(proof.output, `${d.sha256}.json`));
  assert.equal(bytes.length, d.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), d.sha256);
  return JSON.parse(bytes);
};
const manifest = read(proof.manifest), locator = read(manifest.locator);
const requests = [], sources = {};
const transport = { load: async d => { requests.push(d.url); return read(d); } };
const catalog = createProgressiveGraphCatalog({ revision: proof.revision, startup: read(manifest.startup), locator, transport });
const reader = createProgressiveScriptureReader({ revision: proof.revision, canonicalSourceHash: proof.canonicalSourceHash, catalog: read(manifest.scriptureCatalog), locator, transport });
const trace = { phase0Measure: (_a, _b, fn) => fn(), phase0HasActiveTrace: () => false, phase0TouchScripture() {}, phase0Count() {} };
function compile(relative, require) {
  const file = path.join(root, relative), source = fs.readFileSync(file, 'utf8');
  sources[relative] = createHash('sha256').update(source).digest('hex');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, { module, exports: module.exports, require });
  return module.exports;
}
const canonical = compile('data/scripture/canonical.ts', name => { assert.equal(name, '../../discover-graph/phase0Trace'); return trace; });
canonical.installCanonicalCorpusReader(reader.reader);
let fallbackReads = 0;
const discovery = compile('lib/discovery.ts', name => {
  if (name === '@/data/scripture/canonical') return canonical;
  if (name === '@/discover-graph/phase0Trace') return trace;
  if (name === '@/data/scripture/registry') return { getRegisteredSource() { fallbackReads++; throw Error('Legacy fallback forbidden'); } };
  if (name === '@/scripture-tree/characterTrailTreeRuntime') return {};
  throw Error(`Unexpected source resolver import:${name}`);
});
const host = p => React.createElement('div', {}, p.children);
function requireUi(name) {
  if (name === 'react/jsx-runtime') return jsx;
  if (name === 'react-native') return { Platform: { OS: 'web' }, View: host, Text: host, Pressable: host, StyleSheet: { create: x => x } };
  if (name === '@/theme/tokens') return { useTheme: () => ({}), elevation: {} };
  if (name === '@/lib/discovery') return discovery;
  if (name === '@/components/SourceRevealCard') return { PassageRevealFront: host };
  if (name === '@/components/SourceRevealWithReadingMode') return { SourceRevealWithReadingMode: host };
  if (name === '@/components/PassageCard') return compile('components/PassageCard.tsx', requireUi);
  throw Error(`Unexpected Scene UI import:${name}`);
}
const { PrimarySceneCard } = compile('components/PrimarySceneCard.tsx', requireUi);
const topic = await catalog.ensureTopic('abraham');
assert.equal(requests.length, 1);
const passage = topic.passages[0];
assert.ok(passage?.reference);
const render = () => renderToString(React.createElement(PrimarySceneCard, { passage, topicId: topic.id, topicTitle: topic.title }));
let failure;
try { render(); } catch (error) { failure = error; }
assert.ok(failure); assert.match(failure.message, /SDW_SCRIPTURE_ACQUISITION_REQUIRED/);
assert.equal(reader.diagnostics().hydratedChapters.length, 0);
assert.equal(requests.length, 1); assert.equal(fallbackReads, 0);
// Diagnostic positive control only: exact requested chapter acquisition makes
// the unchanged source resolver/card pass. This does NOT install a UI boundary.
const parsed = canonical.parseScriptureReference(passage.reference);
const book = canonical.resolveCanonicalBook(parsed.bookAlias);
await reader.ensureRanges(book.id, parsed.ranges);
assert.doesNotThrow(render);
const report = { verdict: 'SPECIFIC_INTEGRATION_DEFECT_REPRODUCED', defectId: 'R2A-SCENE-SCRIPTURE-ACQUISITION-BOUNDARY',
  scope: 'ACTUAL_PRIMARY_SCENE_CARD_AND_NATIVE_SOURCE_RESOLVER_NOT_FULL_ROUTE_BROWSER_ACCEPTANCE', revision: proof.revision,
  subjectId: topic.id, sceneId: passage.id, reference: passage.reference, error: failure.message, stack: failure.stack, sources,
  topicPacketAcquisitionsBeforeScene: 1, scripturePacketAcquisitionsBeforeScene: 0, legacyFallbackReads: fallbackReads,
  cause: 'Acquiring the topic does not acquire its selected Scene Scripture. PassageCard calls getScriptureSource synchronously before the Scene route has awaited the chapter dependency.',
  diagnosticSelectedChapterAcquisition: { packets: requests.length - 1, hydratedChapters: reader.diagnostics().hydratedChapters, unchangedCardRender: 'PASS' },
  repairInstalled: false, requiredRepair: 'Await only the selected Scene Scripture dependencies at the Scene acquisition boundary before mounting body-dependent cards; preserve canonical throw semantics, Source Reveal, and subsequent DGR/Tree dependency gates.',
  publicExportChanged: false, nativeSourceMutated: false, gitPush: false, release: 'STOP_BEFORE_PUSH' };
fs.writeFileSync('docs/01b-evidence/r2a-scene-scripture-boundary-defect.json', JSON.stringify(report, null, 2)+'\n');
console.log({ ...report, stack: undefined, sources: undefined });
process.exitCode = 2;
