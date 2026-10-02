import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWorldKernel as originalKernel } from '../../ScriptureDiscovery/src/worlds/worldKernel.mjs';
import { enrichCharacterRoot } from '../../ScriptureDiscovery/src/worlds/characterActivityProjection.mjs';
import { portableHashValue as hash } from '../../ScriptureDiscovery/src/scripture-tree/portableRuntimeServices.mjs';
import { createProgressiveWorldProjection } from '../product-runtime/progressiveWorldProjection.mjs';
import { createVerifiedWorldRoots, isVerifiedWorldRoots } from '../product-runtime/verifiedWorldRoots.mjs';
import { applyProgressiveWorldKernelOverlay } from './progressive-world-kernel-overlay.mjs';

const proof = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const read = descriptor => {
  const bytes = fs.readFileSync(path.join(proof.output, `${descriptor.sha256}.json`));
  assert.equal(bytes.length, descriptor.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
  return JSON.parse(bytes);
};
const requests = [], locator = read(proof.locator);
const projected = createProgressiveWorldProjection({ revision: proof.revision, governedWorldHash: proof.governedWorldHash,
  acceptedRootIndexHash: proof.rootProjectionProof[0].acceptedRootIndexHash, locator, hashValue: hash,
  transport: { load: async descriptor => { requests.push(descriptor.url); return read(descriptor); } } });
const expectedHash = proof.rootProjectionProof[0].acceptedRootIndexHash;
const verifiedRoots = createVerifiedWorldRoots({ worldProjection: projected, expectedHash, hashValue: hash });
const stage = fs.mkdtempSync(path.resolve('.product-build-r2-world-kernel-'));
fs.mkdirSync(path.join(stage, 'src/worlds'), { recursive: true });
fs.copyFileSync('../ScriptureDiscovery/src/worlds/worldKernel.mjs', path.join(stage, 'src/worlds/worldKernel.mjs'));
applyProgressiveWorldKernelOverlay(stage);
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(stage, 'src/worlds/worldKernel.mjs'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module, exports: module.exports, require(name) {
  if (name === '@/website-runtime/verifiedWorldRoots.mjs') return { isVerifiedWorldRoots };
  if (name === '../scripture-tree/portableRuntimeServices.mjs') return { portableHashValue: hash };
  throw Error(`Unexpected World dependency:${name}`);
} });
const createKernel = module.exports.createWorldKernel;
const baseRoots = JSON.parse(fs.readFileSync('../ScriptureDiscovery/assets/worlds/character-roots.json'));
const enrichment = JSON.parse(fs.readFileSync('../ScriptureDiscovery/assets/worlds/enrichment-index.json'));
const originals = Object.fromEntries(Object.entries(baseRoots).map(([ref, root]) => [ref, enrichCharacterRoot(root, enrichment.roots[ref].descriptors)]));
assert.equal(hash(originals), expectedHash);
const { root, handle } = await verifiedRoots.ensure('character:abraham');
assert.equal(requests.length, 3); // compact entry, proof, curated reference identities
assert.equal(handle.diagnostics().installedReferences, 0);
assert.equal(root.semanticHash, originals[root.ref].semanticHash);
assert.deepEqual(root.branches, originals[root.ref].branches);
assert.deepEqual(root.curatedDiscoveryReferences, originals[root.ref].curatedDiscoveryReferences);
const segment = JSON.parse(fs.readFileSync('../ScriptureDiscovery/assets/scripture-tree/presenter-v3/subject-abraham.json'));
const objects = new Map(segment.presenter.map(row => [row.ref, row]));
const adapter = { binding: root.binding, read: descriptor => objects.get(descriptor.ref), reveal() { throw Error('Reveal outside kernel-input test'); } };
assert.throws(() => createKernel({ expectedHash, adapter, verifiedRoots: { assertAuthority() {} } }), /ROOT_PROJECTION_PROVENANCE/);
assert.throws(() => createKernel({ expectedHash: '0'.repeat(64), adapter, verifiedRoots }), /ROOT_PROJECTION_REQUIRED/);
const kernel = createKernel({ expectedHash, adapter, verifiedRoots });
const original = originalKernel({ roots: originals, expectedHash, adapter });
assert.throws(() => kernel.begin(root.ref), /REFERENCE_ACQUISITION_REQUIRED/);
await handle.ensureReference(root.ref);
const before = kernel.begin(root.ref), originalBefore = original.begin(root.ref);
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(before), originalBefore);
const scene = root.branches.Scenes.refs[0];
assert.throws(() => kernel.traverse(before, scene, 'Scenes'), /REFERENCE_ACQUISITION_REQUIRED/);
await handle.ensureReference(scene);
const after = kernel.traverse(before, scene, 'Scenes');
assert.deepEqual(plain(after), original.traverse(originalBefore, scene, 'Scenes'));
assert.deepEqual(kernel.inspect(after), original.inspect(original.traverse(originalBefore, scene, 'Scenes')));
assert.equal(kernel.return(after), before);
assert.throws(() => kernel.return({ ...after }), /FOREIGN_OR_FORGED_STATE/);
assert.throws(() => kernel.traverse(before, 'scene:unknown', 'Scenes'), /UNGOVERNED_EDGE/);
assert.throws(() => createKernel({ expectedHash, verifiedRoots, adapter: { ...adapter, read: () => ({ forged: true }) } }).begin(root.ref), /TARGET_INTEGRITY/);
const beforeRepeat = requests.length; await verifiedRoots.ensure(root.ref); await handle.ensureReference(scene); assert.equal(requests.length, beforeRepeat);
const report = { status: 'PASS', revision: proof.revision, scope: 'ORIGINAL_KERNEL_WITH_VERIFIED_ROOT_INPUT_NOT_WORLD_UI',
  compactRootEntryBytes: proof.abraham.bytes, aggregateRootHydration: false, rootEntryDescendantDescriptors: 0,
  selectedDescriptors: handle.diagnostics().installedReferences, exactBranchAndCuratedOrder: true,
  beginAndSceneTraversalEquivalent: true, exactReturnIdentity: true, forgedStateRejected: true, forgedProofRejected: true,
  originalTargetHashCheckPreserved: true, repeatedPacketRequests: 0, scripturePacketsRequested: 0, publicActivation: false };
fs.writeFileSync('docs/01b-evidence/r2a-projected-world-kernel.json', JSON.stringify(report, null, 2)+'\n'); console.log(report);
