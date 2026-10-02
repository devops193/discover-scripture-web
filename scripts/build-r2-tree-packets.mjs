import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { portableHashValue as hash } from '../../ScriptureDiscovery/src/scripture-tree/portableRuntimeServices.mjs';
import { createCharacterTrailProjection } from '../../ScriptureDiscovery/src/scripture-tree/characterTrailProjection.mjs';

const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key));
export function readTreeSources(source) {
  const directory = path.join(source, 'assets/scripture-tree/presenter-v3');
  const hashes = {};
  const read = name => {
    const file = path.join(directory, name), bytes = fs.readFileSync(file);
    hashes[name] = createHash('sha256').update(bytes).digest('hex'); return JSON.parse(bytes);
  };
  const manifest = read('manifest.json'), citation = read('citation-metadata.json'), dgr = read('dgr-channel-metadata.json');
  const trail = read('../character-trail-v3.json');
  const trailBinding = fs.readFileSync(path.join(source, 'src/scripture-tree/characterTrailBinding.generated.ts'), 'utf8');
  const trailHash = /TRAIL_HASH = '([a-f0-9]{64})'/.exec(trailBinding)?.[1];
  assert.ok(trailHash); createCharacterTrailProjection(trail, trailHash);
  hashes['characterTrailBinding.generated.ts'] = createHash('sha256').update(trailBinding).digest('hex');
  const bindings = fs.readFileSync(path.join(source, 'src/scripture-tree/presenterBundleLoaders.generated.ts'), 'utf8');
  const expectedManifest = /PRESENTER_BUNDLE_MANIFEST_HASH = "([a-f0-9]{64})"/.exec(bindings)?.[1];
  assert.equal(manifest.manifestHash, expectedManifest, 'Native accepted Presenter manifest pin');
  hashes['presenterBundleLoaders.generated.ts'] = createHash('sha256').update(bindings).digest('hex');
  assert.equal(hash(without(manifest, 'manifestHash')), manifest.manifestHash);
  assert.equal(manifest.source.citation, citation.semanticHash); assert.equal(manifest.source.dgr, dgr.semanticHash);
  assert.equal(manifest.source.runtimeAuthority, citation.sourceAuthorityDigest);
  assert.equal(manifest.source.runtimeAuthority, dgr.sourceAuthorityDigest);
  const segments = manifest.packages.map(description => {
    const segment = read(path.basename(description.file));
    assert.equal(segment.schema, 'SCRIPTURE_TREE_V3_PRESENTER_SEGMENT_V1');
    assert.equal(segment.revisionId, manifest.revisionId); assert.equal(segment.kind, description.kind); assert.equal(segment.id, description.id);
    assert.equal(segment.segmentHash, description.segmentHash); assert.equal(hash(without(segment, 'segmentHash')), segment.segmentHash);
    for (const family of ['capability', 'analysis', 'presenter', 'related']) {
      const rows = segment[family] ?? [];
      assert.equal(rows.length, description.counts[family]);
      assert.equal(new Set(rows.map(row => family === 'related' ? row.contextRef : row.ref)).size, rows.length);
      for (const row of rows) {
        assert.equal(row.revisionId, manifest.revisionId);
        assert.equal(row.sourceAuthorityDigest, family === 'related' ? manifest.source.relatedAuthority : manifest.source.capabilityAuthority);
        assert.equal(hash(without(row, 'semanticHash')), row.semanticHash);
      }
    }
    return { description, segment };
  });
  return { manifest, citation, dgr, segments, trail, trailHash,
    sourceHash: createHash('sha256').update(JSON.stringify(hashes)).digest('hex') };
}
export function writeTreePackets(sources, revision, write) {
  const packages = {}; let count = 0;
  for (const { description, segment } of sources.segments) {
    const families = {}, identities = {};
    for (const family of ['capability', 'analysis', 'presenter', 'related']) {
      families[family] = {};
      for (const row of segment[family] ?? []) {
        const ref = family === 'related' ? row.contextRef : row.ref;
        const packet = write({ schema: 'SDW_TREE_RECORD_V1', revision, treeSourceHash: sources.sourceHash,
          segmentHash: segment.segmentHash, kind: segment.kind, id: segment.id, family, ref, row });
        families[family][ref] = { semanticHash: row.semanticHash, recordHash: hash(row), packet }; count++;
        if (family === 'presenter') identities[ref] = Object.fromEntries(['ref', 'ownerRef', 'objectRouteHash', 'sourceHash']
          .filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));
      }
    }
    packages[`${segment.kind}:${segment.id}`] = write({ schema: 'SDW_TREE_SEGMENT_INDEX_V1', revision,
      treeSourceHash: sources.sourceHash, segmentHash: segment.segmentHash, kind: segment.kind, id: segment.id,
      counts: description.counts, families, identities });
  }
  return { descriptor: write({ schema: 'SDW_TREE_METADATA_V1', revision, treeSourceHash: sources.sourceHash,
    manifest: sources.manifest, citation: sources.citation, dgr: sources.dgr, packages,
    trailHash: sources.trailHash, trail: write({ schema: 'SDW_TRAIL_METADATA_V1', revision, treeSourceHash: sources.sourceHash, projection: sources.trail }) }), count };
}
