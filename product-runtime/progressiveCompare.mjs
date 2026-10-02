const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
/** Exact build-validated Compare authority, partitioned by its governed owner.
 * The existing createCompareAccess row/route/hash checks still run unchanged. */
export function createProgressiveCompare({ revision, sourceHash, index, transport }) {
  if (index.schema !== 'SDW_COMPARE_METADATA_V1' || index.revision !== revision || index.compareSourceHash !== sourceHash
    || index.header.schema !== 'COMPARE_TREE_V3_BINDINGS_V1' || index.header.revisionId !== 'bundled-approved'
    || index.bindingHash !== index.header.semanticHash) throw Error('SDW_COMPARE_METADATA_INTEGRITY');
  freeze(index);
  const acquired = new Map(), pending = new Map();
  async function ensureOwner(subjectId) {
    if (!Object.hasOwn(index.owners, subjectId)) throw Error('SDW_COMPARE_OWNER_UNKNOWN');
    if (acquired.has(subjectId)) return acquired.get(subjectId);
    if (pending.has(subjectId)) return pending.get(subjectId);
    const promise = (async () => {
      const packet = await transport.load(index.owners[subjectId]);
      if (packet.schema !== 'SDW_COMPARE_OWNER_V1' || packet.revision !== revision || packet.compareSourceHash !== sourceHash
        || packet.subjectId !== subjectId || packet.bindingHash !== index.bindingHash || packet.pivotsHash !== index.header.pivotsHash)
        throw Error('SDW_COMPARE_OWNER_INTEGRITY');
      const ownerRef = `${index.header.topics[subjectId].axis}:${subjectId}`;
      if (Object.entries(packet.bindings).some(([ref, value]) => ref.split(':')[1] !== subjectId || value.ownerRef !== ownerRef)
        || Object.keys(packet.sceneCompares).some(ref => index.sceneOwners[ref] !== subjectId)) throw Error('SDW_COMPARE_OWNER_MEMBERSHIP');
      acquired.set(subjectId, freeze(packet)); return packet;
    })();
    pending.set(subjectId, promise);
    try { return await promise; } finally { pending.delete(subjectId); }
  }
  function owner(subjectId) {
    if (!Object.hasOwn(index.owners, subjectId)) return undefined;
    if (!acquired.has(subjectId)) throw Error(`SDW_COMPARE_OWNER_ACQUISITION_REQUIRED:${subjectId}`);
    return acquired.get(subjectId);
  }
  function projection(field, subjectForKey = ref => ref.split(':')[1]) {
    const read = key => {
      if (typeof key !== 'string') return undefined;
      const packet = owner(subjectForKey(key));
      return field === 'capsuleTopic' ? packet?.capsuleTopic : packet?.[field]?.[key];
    };
    return new Proxy(Object.create(null), {
      get: (_target, key) => read(key),
      getOwnPropertyDescriptor: (_target, key) => read(key) === undefined ? undefined : { configurable: true, enumerable: true, value: read(key), writable: false },
      set() { throw Error('SDW_COMPARE_IMMUTABLE'); },
      ownKeys() { throw Error('SDW_COMPARE_FAMILY_ENUMERATION_FORBIDDEN'); },
    });
  }
  const metadata = Object.freeze({ ...index.header, bindings: projection('bindings'), navigation: projection('navigation'),
    capsuleTopics: projection('capsuleTopic', id => id), sceneCompares: projection('sceneCompares', ref => index.sceneOwners[ref]) });
  return Object.freeze({ metadata, pivots: projection('pivots'), ensureOwner,
    verifyMetadata(value, expectedHash) {
      if (value !== metadata || expectedHash !== index.bindingHash) throw Error('SDW_COMPARE_AUTHORITY_PIN');
    },
    verifyPivots(expectedHash) { if (expectedHash !== index.header.pivotsHash) throw Error('SDW_COMPARE_PIVOTS_PIN'); },
  });
}
