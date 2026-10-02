/** Exact build-derived Scene metadata. No beta answers or semantic inference. */
export function createProgressiveSceneContexts({ revision, sourceHash, locator, transport }) {
  const indexes = new Map(), records = new Map(), pending = new Map();
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  async function once(key, load) {
    if (pending.has(key)) return pending.get(key);
    const work = load(); pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  }
  async function ensure(subjectId, sceneId) {
    const descriptor = locator.sceneContexts[subjectId];
    if (!descriptor) throw Error('SDW_SCENE_CONTEXT_SUBJECT_UNKNOWN');
    if (!indexes.has(subjectId)) await once(subjectId, async () => {
      const index = await transport.load(descriptor);
      if (index.schema !== 'SDW_SCENE_CONTEXT_INDEX_V1' || index.revision !== revision || index.sourceHash !== sourceHash || index.subjectId !== subjectId) throw Error('SDW_SCENE_CONTEXT_INDEX_INTEGRITY');
      indexes.set(subjectId, freeze(index));
    });
    const entry = indexes.get(subjectId).scenes[sceneId];
    if (!entry) throw Error('SDW_SCENE_CONTEXT_OWNER_MISMATCH');
    const key = `${subjectId}:${sceneId}`;
    if (!records.has(key)) await once(key, async () => {
      const packet = await transport.load(entry.packet);
      if (packet.schema !== 'SDW_SCENE_CONTEXT_V1' || packet.revision !== revision || packet.sourceHash !== sourceHash
        || packet.subjectId !== subjectId || packet.sceneId !== sceneId || JSON.stringify(packet.owner) !== JSON.stringify(entry.owner)) throw Error('SDW_SCENE_CONTEXT_INTEGRITY');
      records.set(key, freeze(packet));
    });
    return records.get(key);
  }
  function read(subjectId, sceneId) {
    if (!Object.hasOwn(locator.sceneContexts, subjectId)) return undefined;
    const index = indexes.get(subjectId);
    if (!index) throw Error('SDW_SCENE_CONTEXT_ACQUISITION_REQUIRED');
    if (!Object.hasOwn(index.scenes, sceneId)) return undefined;
    const record = records.get(`${subjectId}:${sceneId}`);
    if (!record) throw Error('SDW_SCENE_CONTEXT_ACQUISITION_REQUIRED');
    return record;
  }
  return Object.freeze({ ensure, read, diagnostics: () => ({ indexes: indexes.size, scenes: records.size, inFlight: pending.size }) });
}
