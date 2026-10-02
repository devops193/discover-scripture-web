/** Verified acquisition only. The existing DGR runtime retains semantic checks. */
export function createProgressiveDgr({ revision, index, transport }) {
  if (index.schema !== 'SDW_DGR_LOCATOR_V1' || index.revision !== revision || index.authority.authorityHash !== index.bundle.authorityHash || index.authority.authorityHash !== index.lookup.authorityHash) throw Error('SDW_DGR_AUTHORITY');
  if (Object.keys(index.questions).length !== 184 || Object.hasOwn(index.bundle, 'questionRecords')) throw Error('SDW_DGR_STARTUP_SHAPE');
  const records = new Map(), pending = new Map();
  const byScene = new Map(index.lookup.records.map(row => [row.sceneId, row]));
  const known = id => Object.hasOwn(index.questions, id);
  function get(id) {
    if (!known(id)) return undefined;
    if (!records.has(id)) throw Error(`SDW_DGR_ACQUISITION_REQUIRED:${id}`);
    return records.get(id);
  }
  function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  freeze(index);
  async function ensureQuestion(id) {
    if (!known(id)) throw Error('SDW_DGR_UNKNOWN_QUESTION');
    if (records.has(id)) return get(id);
    if (pending.has(id)) return pending.get(id);
    const operation = (async () => {
      const location = index.questions[id], packet = await transport.load(location.packet);
      if (packet.schema !== 'SDW_DGR_QUESTION_V1' || packet.revision !== revision || packet.dgrSourceHash !== index.dgrSourceHash || packet.authorityHash !== index.authority.authorityHash || packet.record?.contract.questionId !== id || packet.record.runtimeRecordHash !== location.runtimeRecordHash) throw Error('SDW_DGR_RECORD_BINDING');
      records.set(id, freeze(packet.record)); return get(id);
    })();
    pending.set(id, operation);
    try { return await operation; } finally { pending.delete(id); }
  }
  return Object.freeze({
    authority: index.authority, bundle: index.bundle, lookup: index.lookup,
    recordByQuestionId: Object.freeze({ get }), ensureQuestion,
    async ensureScene(sceneId, subjectId) {
      const row = byScene.get(sceneId);
      if (!row) throw Error('SDW_DGR_UNKNOWN_SCENE');
      if (subjectId !== undefined && row.subjectId !== subjectId) throw Error('SDW_DGR_SCENE_OWNER_MISMATCH');
      await Promise.all(row.questionIds.map(ensureQuestion));
    },
    diagnostics: () => ({ hydratedQuestionCount: records.size, inFlight: pending.size }),
  });
}
