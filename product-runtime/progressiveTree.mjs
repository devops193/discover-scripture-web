import { portableHashValue as hash } from '@/scripture-tree/portableRuntimeServices.mjs';
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key));
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

/** One selected-object store under the shared transport, never a second Tree. */
export function createProgressiveTree({ revision, sourceHash, metadata, transport }) {
  const { manifest } = metadata;
  if (metadata.schema !== 'SDW_TREE_METADATA_V1' || metadata.revision !== revision || metadata.treeSourceHash !== sourceHash
    || hash(without(manifest, 'manifestHash')) !== manifest.manifestHash
    || metadata.citation.semanticHash !== manifest.source.citation || metadata.dgr.semanticHash !== manifest.source.dgr
    || metadata.citation.sourceAuthorityDigest !== manifest.source.runtimeAuthority || metadata.dgr.sourceAuthorityDigest !== manifest.source.runtimeAuthority)
    throw Error('SDW_TREE_METADATA_INTEGRITY');
  freeze(metadata);
  const descriptions = new Map(manifest.packages.map(row => [`${row.kind}:${row.id}`, row]));
  const indexes = new Map(), records = new Map(), pending = new Map();
  let trail;
  async function once(key, load) {
    if (pending.has(key)) return pending.get(key);
    const promise = load(); pending.set(key, promise);
    try { return await promise; } finally { pending.delete(key); }
  }
  async function ensureIndex(kind, id) {
    const key = `${kind}:${id}`;
    if (indexes.has(key)) return indexes.get(key);
    return once(key, async () => {
      const descriptor = metadata.packages[key], accepted = descriptions.get(key);
      if (!descriptor || !accepted) throw Error('SDW_TREE_SEGMENT_UNKNOWN');
      const index = await transport.load(descriptor);
      if (index.schema !== 'SDW_TREE_SEGMENT_INDEX_V1' || index.revision !== revision || index.treeSourceHash !== sourceHash
        || index.kind !== kind || index.id !== id || index.segmentHash !== accepted.segmentHash) throw Error('SDW_TREE_SEGMENT_INTEGRITY');
      for (const family of ['capability', 'analysis', 'presenter', 'related'])
        if (Object.keys(index.families[family]).length !== accepted.counts[family]) throw Error('SDW_TREE_SEGMENT_COUNT');
      indexes.set(key, freeze(index)); return index;
    });
  }
  function getIndex(kind, id) {
    if (!descriptions.has(`${kind}:${id}`)) return undefined;
    const index = indexes.get(`${kind}:${id}`);
    if (!index) throw Error(`SDW_TREE_INDEX_ACQUISITION_REQUIRED:${kind}:${id}`);
    return index;
  }
  function getRecord(kind, id, family, ref) {
    const index = getIndex(kind, id), descriptor = index?.families[family]?.[ref];
    if (!descriptor) return undefined;
    const row = records.get(`${kind}:${id}:${family}:${ref}`);
    if (!row) throw Error(`SDW_TREE_RECORD_ACQUISITION_REQUIRED:${family}:${ref}`);
    if (hash(row) !== descriptor.recordHash) throw Error('SDW_TREE_RECORD_CHANGED');
    return row;
  }
  async function ensureRecord(kind, id, family, ref) {
    const index = await ensureIndex(kind, id), descriptor = index.families[family]?.[ref];
    if (!descriptor) return undefined;
    const key = `${kind}:${id}:${family}:${ref}`;
    if (!records.has(key)) await once(key, async () => {
      const packet = await transport.load(descriptor.packet), row = packet.row;
      const authority = family === 'related' ? manifest.source.relatedAuthority : manifest.source.capabilityAuthority;
      if (packet.schema !== 'SDW_TREE_RECORD_V1' || packet.revision !== revision || packet.treeSourceHash !== sourceHash
        || packet.segmentHash !== index.segmentHash || packet.kind !== kind || packet.id !== id || packet.family !== family || packet.ref !== ref
        || (family === 'related' ? row?.contextRef : row?.ref) !== ref || row.revisionId !== manifest.revisionId
        || row.sourceAuthorityDigest !== authority || row.semanticHash !== descriptor.semanticHash
        || hash(without(row, 'semanticHash')) !== row.semanticHash || hash(row) !== descriptor.recordHash) throw Error('SDW_TREE_RECORD_INTEGRITY');
      records.set(key, freeze(row));
    });
    return getRecord(kind, id, family, ref);
  }
  async function ensureTrail() {
    if (!trail) await once('trail', async () => {
      const packet = await transport.load(metadata.trail);
      if (packet.schema !== 'SDW_TRAIL_METADATA_V1' || packet.revision !== revision || packet.treeSourceHash !== sourceHash
        || packet.projection.artifactHash !== metadata.trailHash
        || hash(without(packet.projection, 'artifactHash')) !== metadata.trailHash) throw Error('SDW_TRAIL_METADATA_INTEGRITY');
      trail = freeze(packet.projection);
    });
    return trail;
  }
  return Object.freeze({ metadata, ensureIndex, getIndex, ensureRecord, getRecord, ensureTrail,
    getTrail() { if (!trail) throw Error('SDW_TRAIL_METADATA_ACQUISITION_REQUIRED'); return trail; },
    identity(kind, id, ref) { return getIndex(kind, id)?.identities[ref]; },
    diagnostics: () => ({ indexes: indexes.size, hydratedRecords: records.size, inFlight: pending.size }),
  });
}
