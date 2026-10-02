/** Startup identities are metadata, not fabricated DiscoveryTopic bodies. */
export function createProgressiveGraphCatalog({ revision, startup, locator, transport }) {
  if (startup.schema !== 'SDW_APPROVED_STARTUP_V1' || startup.revision !== revision || locator.revision !== revision) throw Error('SDW_GRAPH_STARTUP_BINDING');
  const catalog = startup.catalog;
  if (catalog.subjects.length !== 50 || catalog.cards.length !== 55 || Object.keys(catalog.baseline.entities).length !== 50) throw Error('SDW_GRAPH_STARTUP_COUNTS');
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  freeze(catalog);
  const metadata = new Map(catalog.subjects.map(row => [row.id, row]));
  const bodies = new Map(), pending = new Map();
  function getTopic(id) {
    if (!metadata.has(id)) return undefined;
    if (!bodies.has(id)) throw Error(`SDW_TOPIC_ACQUISITION_REQUIRED:${id}`);
    return bodies.get(id);
  }
  const topics = {};
  for (const id of metadata.keys()) Object.defineProperty(topics, id, { enumerable: true, get: () => getTopic(id) });
  Object.freeze(topics);
  async function ensureTopic(id) {
    if (!metadata.has(id)) throw Error('SDW_TOPIC_UNKNOWN');
    if (bodies.has(id)) return getTopic(id);
    if (pending.has(id)) return pending.get(id);
    const operation = (async () => {
      const descriptor = locator.topics[id];
      if (!descriptor) throw Error('SDW_TOPIC_LOCATOR_MISSING');
      const packet = await transport.load(descriptor), expected = metadata.get(id);
      if (packet.schema !== 'SDW_APPROVED_TOPIC_V1' || packet.revision !== revision || packet.subjectId !== id || packet.topic?.id !== id || packet.topic.axis !== expected.axis || packet.topic.title !== expected.title) throw Error('SDW_TOPIC_BINDING');
      bodies.set(id, freeze(packet.topic));
      return getTopic(id);
    })();
    pending.set(id, operation);
    try { return await operation; } finally { pending.delete(id); }
  }
  return Object.freeze({
    topics, discoveryCards: catalog.cards, generatedDiscoveryCards: catalog.generatedCards,
    baseline(revisionId) { if (catalog.baseline.id !== revisionId) throw Error('SDW_GRAPH_REVISION_MISMATCH'); return catalog.baseline; },
    metadata: id => metadata.get(id), metadataRows: () => [...metadata.values()],
    getTopic, ensureTopic, diagnostics: () => ({ hydratedTopicIds: [...bodies.keys()], inFlight: pending.size }),
  });
}
