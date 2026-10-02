/** Transport only: canonical records and the existing attachment predicate
 * retain authority. This store uses the one shared R2 packet cache. */
export function createProgressiveContradictions({ revision, sourceHash, authorityHash, descriptor, transport }) {
  let index, initialization;
  const records = new Map(), pending = new Map();
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  function ensureIndex() {
    return initialization ??= (async () => {
      const packet = await transport.load(descriptor);
      if (packet.schema !== 'SDW_CONTRADICTION_ATTACHMENT_INDEX_V1' || packet.revision !== revision
        || packet.sourceHash !== sourceHash || packet.authorityHash !== authorityHash
        || new Set(packet.rows.map(row => row.id)).size !== packet.rows.length) throw Error('SDW_CONTRADICTION_INDEX_INTEGRITY');
      index = freeze(packet);
    })();
  }
  function rows() { if (!index) throw Error('SDW_CONTRADICTION_INDEX_ACQUISITION_REQUIRED'); return index.rows; }
  function read(id) {
    if (!id) return undefined;
    if (!rows().some(row => row.id === id)) return undefined;
    if (!records.has(id)) throw Error(`SDW_CONTRADICTION_RECORD_ACQUISITION_REQUIRED:${id}`);
    return records.get(id);
  }
  async function ensure(id) {
    await ensureIndex();
    const entry = rows().find(row => row.id === id);
    if (!entry) return undefined;
    if (!records.has(id)) {
      if (!pending.has(id)) pending.set(id, (async () => {
        const packet = await transport.load(entry.packet);
        if (packet.schema !== 'SDW_CONTRADICTION_RECORD_V1' || packet.revision !== revision || packet.sourceHash !== sourceHash
          || packet.authorityHash !== authorityHash || packet.id !== id || packet.record.id !== id
          || packet.record.title !== entry.title || packet.record.classification !== entry.classification
          || JSON.stringify(packet.record.anchors) !== JSON.stringify(entry.anchors)
          || JSON.stringify(packet.record.evidence.map(row => row.reference)) !== JSON.stringify(entry.references)) throw Error('SDW_CONTRADICTION_RECORD_INTEGRITY');
        records.set(id, freeze(packet.record));
      })());
      try { await pending.get(id); } finally { pending.delete(id); }
    }
    return read(id);
  }
  return Object.freeze({ ensureIndex, ensure, read, rows,
    diagnostics: () => ({ indexAcquired: Boolean(index), hydratedIds: [...records.keys()] }) });
}
