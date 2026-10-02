import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCompareAccess } from '../../ScriptureDiscovery/src/scripture-tree/compareAccess.mjs';
import { portableHashValue as hash } from '../../ScriptureDiscovery/src/scripture-tree/portableRuntimeServices.mjs';
export function readCompareSources(source, tree) {
  const metadata = JSON.parse(fs.readFileSync(path.join(source, 'assets/scripture-tree/compare-v3.json')));
  const pivots = JSON.parse(fs.readFileSync(path.join(source, 'assets/scripture-tree/compare-pivots-v3.json')));
  const pins = fs.readFileSync(path.join(source, 'src/scripture-tree/compareBinding.generated.ts'), 'utf8');
  const expectedHash = /COMPARE_BINDING_HASH = '([a-f0-9]{64})'/.exec(pins)?.[1];
  assert.ok(expectedHash); assert.equal(hash(pivots), metadata.pivotsHash);
  assert.equal(metadata.sourceAuthorityDigest, tree.manifest.source.capabilityAuthority);
  assert.equal(metadata.analysisArtifactHash, tree.manifest.source.analysis);
  const rows = new Map(tree.segments.flatMap(({ segment }) => (segment.analysis ?? []).map(row => [row.ref, row])));
  const reader = createCompareAccess(metadata, expectedHash, ref => ref.startsWith('pivot:') ? pivots[ref] : rows.get(ref));
  for (const [ref, binding] of Object.entries(metadata.bindings)) assert.ok(reader.open(ref, binding.ownerRef), ref);
  return { metadata, pivots, expectedHash, sourceHash: createHash('sha256').update(JSON.stringify([hash(metadata), hash(pivots), pins])).digest('hex') };
}
export function writeComparePackets(source, tree, revision, write) {
  const { bindings, navigation, sceneCompares, capsuleTopics, ...header } = source.metadata;
  const sceneOwners = new Map(tree.dgr.sceneOwners.map(row => [row.contextRef, row.subjectId]));
  const owners = {};
  const rebuilt = { bindings: {}, navigation: {}, sceneCompares: {}, capsuleTopics: {}, pivots: {} };
  for (const subjectId of Object.keys(header.topics)) {
    const own = object => Object.fromEntries(Object.entries(object).filter(([ref]) => ref.split(':')[1] === subjectId));
    const packet = { schema: 'SDW_COMPARE_OWNER_V1', revision, compareSourceHash: source.sourceHash, subjectId,
      bindingHash: source.expectedHash, pivotsHash: header.pivotsHash, bindings: own(bindings), navigation: own(navigation),
      sceneCompares: Object.fromEntries(Object.entries(sceneCompares).filter(([ref]) => sceneOwners.get(ref) === subjectId)),
      capsuleTopic: capsuleTopics[subjectId], pivots: own(source.pivots) };
    owners[subjectId] = write(packet);
    for (const field of ['bindings', 'navigation', 'sceneCompares', 'pivots']) Object.assign(rebuilt[field], packet[field]);
    if (packet.capsuleTopic !== undefined) rebuilt.capsuleTopics[subjectId] = packet.capsuleTopic;
  }
  assert.deepEqual(rebuilt.bindings, bindings); assert.deepEqual(rebuilt.navigation, navigation);
  assert.deepEqual(rebuilt.sceneCompares, sceneCompares); assert.deepEqual(rebuilt.capsuleTopics, capsuleTopics);
  assert.deepEqual(rebuilt.pivots, source.pivots);
  return write({ schema: 'SDW_COMPARE_METADATA_V1', revision, compareSourceHash: source.sourceHash,
    bindingHash: source.expectedHash, header, owners, sceneOwners: Object.fromEntries(sceneOwners) });
}
