/** Transport integrity bridge to the accepted World Root, not a new resolver. */
export function createProgressiveWorldProjection({ revision, governedWorldHash, acceptedRootIndexHash, locator, transport, hashValue }) {
  const opened = new Map(), pending = new Map();
  function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  async function open(rootRef) {
    if (opened.has(rootRef)) return opened.get(rootRef);
    if (pending.has(rootRef)) return pending.get(rootRef);
    if (!Object.hasOwn(locator.roots, rootRef) || !Object.hasOwn(locator.rootProjections, rootRef)) throw Error('SDW_WORLD_ROOT_UNKNOWN');
    const operation = (async () => {
      const [entry, projection] = await Promise.all([transport.load(locator.roots[rootRef]), transport.load(locator.rootProjections[rootRef])]);
      const { projectionHash, ...unsigned } = projection;
      if (projection.schema !== 'SDW_ROOT_PROJECTION_V1' || projection.revision !== revision || projection.rootRef !== rootRef || projection.governedWorldHash !== governedWorldHash || projection.acceptedRootIndexHash !== acceptedRootIndexHash || hashValue(unsigned) !== projectionHash) throw Error('SDW_WORLD_PROJECTION_BINDING');
      if (entry.schema !== 'SDW_CHARACTER_ROOT_TRANSPORT_V2' || entry.revision !== revision || entry.governedWorldHash !== governedWorldHash || entry.identity.ref !== rootRef || entry.identity.semanticHash !== projection.baseRootSemanticHash || projection.rootEntry.sha256 !== locator.roots[rootRef].sha256 || projection.identity.ref !== rootRef || projection.identity.binding.revision !== entry.identity.binding.revision) throw Error('SDW_WORLD_ENTRY_BINDING');
      const refs = projection.orderedDependencyRefs;
      if (new Set(refs).size !== refs.length || refs.length !== Object.keys(projection.dependencies).length || refs.some(ref => !Object.hasOwn(projection.dependencies, ref))) throw Error('SDW_WORLD_DEPENDENCY_IDENTITY');
      for (const [family, branch] of Object.entries(projection.branches)) {
        if (branch.family !== family || branch.ownerRef !== rootRef || branch.count !== branch.refs.length || branch.refs.some(ref => !Object.hasOwn(projection.dependencies, ref))) throw Error('SDW_WORLD_BRANCH_BINDING');
      }
      freeze(entry); freeze(projection);
      const installed = new Map(), acquiring = new Map();
      let curated;
      async function ensureCurated() {
        if (curated) return curated;
        const packet = await transport.load(projection.curated);
        if (packet.schema !== 'SDW_WORLD_CURATED_REFS_V1' || packet.revision !== revision || packet.rootRef !== rootRef
          || packet.refs.some(ref => !Object.hasOwn(projection.dependencies, ref))) throw Error('SDW_WORLD_CURATED_BINDING');
        curated = freeze(packet.refs); return curated;
      }
      async function ensureReference(ref) {
        if (!Object.hasOwn(projection.dependencies, ref)) throw Error('SDW_WORLD_REF_NOT_OWNED');
        if (installed.has(ref)) return installed.get(ref);
        if (acquiring.has(ref)) return acquiring.get(ref);
        const load = (async () => {
          const dependency = projection.dependencies[ref], packet = await transport.load(dependency.packet);
          if (packet.schema !== 'SDW_WORLD_REFERENCE_V1' || packet.revision !== revision || packet.rootRef !== rootRef || packet.descriptor.ref !== ref || packet.descriptor.targetHash !== dependency.semanticHash || packet.links?.some(target => !Object.hasOwn(projection.dependencies, target))) throw Error('SDW_WORLD_REFERENCE_BINDING');
          installed.set(ref, freeze(packet)); return packet;
        })();
        acquiring.set(ref, load);
        try { return await load; } finally { acquiring.delete(ref); }
      }
      function readReference(ref) {
        if (!Object.hasOwn(projection.dependencies, ref)) throw Error('SDW_WORLD_REF_NOT_OWNED');
        if (!installed.has(ref)) throw Error('SDW_WORLD_REFERENCE_ACQUISITION_REQUIRED');
        return installed.get(ref);
      }
      const result = Object.freeze({ entry, projection, ensureReference, readReference, ensureCurated, diagnostics: () => ({ rootRef, installedReferences: installed.size }) });
      opened.set(rootRef, result); return result;
    })();
    pending.set(rootRef, operation);
    try { return await operation; } finally { pending.delete(rootRef); }
  }
  return Object.freeze({ open });
}
