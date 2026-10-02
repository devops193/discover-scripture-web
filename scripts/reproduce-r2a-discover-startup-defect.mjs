// Runs the actual DiscoverScreen render with React hooks and the current R2A
// catalog. Non-executed navigation/native services are stubbed; this is a
// focused consumer integration probe, not a browser or full-product PASS.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import { createProgressiveGraphCatalog } from '../product-runtime/progressiveGraphCatalog.mjs';
const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const read = descriptor => {
  const bytes = fs.readFileSync(path.join(proof.output, `${descriptor.sha256}.json`));
  assert.equal(bytes.length, descriptor.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
  return JSON.parse(bytes);
};
const manifest = read(proof.manifest), locator = read(manifest.locator), startup = read(manifest.startup);
let fetches = 0;
const catalog = createProgressiveGraphCatalog({ revision: proof.revision, startup, locator, transport: { load: async d => { fetches++; return read(d); } } });
const snapshot = Object.freeze({ topics: catalog.topics, discoveryCards: catalog.discoveryCards, revisionId: 'bundled-approved' });
const sourceFile = path.resolve('../ScriptureDiscovery/src/app/(tabs)/index.tsx');
const source = fs.readFileSync(sourceFile, 'utf8');
assert.ok(source.includes('const pack = topics[card.id]?.pack;'));
const module = { exports: {} };
const imports = [];
const require = name => {
  imports.push(name);
  if (name === 'react') return React;
  if (name === 'react/jsx-runtime') return jsxRuntime;
  if (name === '@/discover-graph/useActiveGraph') return { useActiveGraphSnapshot: () => snapshot };
  if (name === '@/theme/tokens') return { useTheme: () => ({}), spacing: {}, radius: {}, typography: {}, elevation: {} };
  if (name === 'react-native') return { StyleSheet: { create: x => x, hairlineWidth: 1 } };
  if (name === '@/lib/discoverSearch') return { searchDiscover: query => { assert.equal(query, ''); return { classification: 'FREE_TEXT', results: [] }; } };
  return {};
};
vm.runInNewContext(ts.transpileModule(source, { fileName: sourceFile, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, require }, { filename: sourceFile });
let failure;
try { renderToString(React.createElement(module.exports.default)); }
catch (error) { failure = error; }
assert.ok(failure, 'Expected the known startup consumer integration defect');
assert.match(failure.message, /^SDW_TOPIC_ACQUISITION_REQUIRED:/);
assert.equal(catalog.diagnostics().hydratedTopicIds.length, 0);
assert.equal(fetches, 0);
const subjectId = failure.message.split(':')[1];
const metadata = catalog.metadata(subjectId);
assert.ok(metadata);
// Metadata needed by this failing operation is already present, so fetching
// every topic or fabricating partial topics is neither needed nor acceptable.
const legacyTopic = read(locator.topics[subjectId]).topic;
assert.deepEqual(metadata.pack, legacyTopic.pack);
const line = source.split('\n').findIndex(line => line.includes('const pack = topics[card.id]?.pack;')) + 1;
const report = {
  verdict: 'SPECIFIC_INTEGRATION_DEFECT_REPRODUCED', defectId: 'R2A-DISCOVER-STARTUP-PACK-METADATA',
  scope: 'ACTUAL_DISCOVER_COMPONENT_REACT_RENDER_PROBE_NOT_BROWSER_ACCEPTANCE',
  revision: proof.revision, sourceFile, sourceSha256: createHash('sha256').update(source).digest('hex'), line,
  error: failure.message, stack: failure.stack, subjectId,
  cause: 'DiscoverScreen contentPackDescriptors reads topics[card.id].pack through the body-only accessor before any topic acquisition. Its optional chaining cannot suppress the throwing property getter.',
  impact: 'Discover initial render fails before the initial-route UI is produced.',
  availableMetadataMatchesLegacyPack: true, topicBodiesHydrated: 0, unexpectedFetches: 0,
  requiredRepair: 'Bind startup pack/title/axis reads to verified startup metadata; retain explicit acquisition for consumers requiring full topics. Do not preload all topic bodies.',
  publicExportChanged: false, gitPush: false,
};
fs.writeFileSync('docs/01b-evidence/r2a-discover-startup-defect.json', JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify({ ...report, stack: undefined }, null, 2));
process.exitCode = 2;
