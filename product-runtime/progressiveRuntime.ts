import { createPacketCache } from './packetCache.mjs';
import { createProgressiveScriptureReader } from './progressiveScripture.mjs';
import { createProgressiveGraphCatalog } from './progressiveGraphCatalog.mjs';
import { createProgressiveDgr } from './progressiveDgr.mjs';
import { createProgressiveQuestions } from './progressiveQuestions.mjs';
import { createProgressiveSceneContexts } from './progressiveSceneContexts.mjs';
import { createProgressiveTree } from './progressiveTree.mjs';
import { createProgressiveCompare } from './progressiveCompare.mjs';
import { createProgressiveContradictions } from './progressiveContradictions.mjs';
import { createProgressiveWorldProjection } from './progressiveWorldProjection.mjs';
import { createVerifiedWorldRoots } from './verifiedWorldRoots.mjs';
import { portableHashValue } from '@/scripture-tree/portableRuntimeServices.mjs';
import { CANONICAL_SOURCE_CHECKSUM, CANONICAL_TRANSLATION_ID, getCanonicalCorpusReader, getScripture, installCanonicalCorpusReader, parseScriptureReference, resolveCanonicalBook } from '@/data/scripture/canonical';
import { recordBoot, recordIdentity } from './runtimeEvidence';

type Descriptor = { revision: string; sha256: string; bytes: number; url: string };
type Binding = { revision: string; canonicalSourceHash: string; manifest: Descriptor };
let bound: Binding | undefined;
let initialization: Promise<boolean> | undefined;
let scripture: ReturnType<typeof createProgressiveScriptureReader> | undefined;
let transport: ReturnType<typeof createPacketCache> | undefined;
let graphCatalog: ReturnType<typeof createProgressiveGraphCatalog> | undefined;
let dgr: ReturnType<typeof createProgressiveDgr> | undefined;
let readingDescriptor: Descriptor | undefined, readingSourceHash: string | undefined;
let readingMetadata: any, readingInitialization: Promise<void> | undefined;
let questionReader: ReturnType<typeof createProgressiveQuestions> | undefined;
let sceneContexts: ReturnType<typeof createProgressiveSceneContexts> | undefined;
let treeDescriptor: Descriptor | undefined, treeSourceHash: string | undefined;
let tree: ReturnType<typeof createProgressiveTree> | undefined, treeInitialization: Promise<void> | undefined;
let worldRoots: ReturnType<typeof createVerifiedWorldRoots> | undefined;
let worldIndexHash: string, worldSourceHash: string, worldObjectLocations: Record<string, Descriptor>;
const worldObjects = new Map<string, unknown>();
let compareDescriptor: Descriptor, compareSourceHash: string;
let compare: ReturnType<typeof createProgressiveCompare> | undefined, compareInitialization: Promise<void> | undefined;
let contradictions: ReturnType<typeof createProgressiveContradictions> | undefined;
let ownerDescriptor: Descriptor, ownerSourceHash: string;
let ownerMetadata: any, ownerInitialization: Promise<void> | undefined;
const ownerValues = new Map<string, any>();
const ownerPending = new Map<string, Promise<void>>();

/** Called once by the website bootstrap, before either UI surface is mounted. */
export function bindProgressiveRevision(binding: Binding) {
  if (bound && JSON.stringify(bound) !== JSON.stringify(binding)) throw Error('SDW_REVISION_REBIND_FORBIDDEN');
  bound ??= Object.freeze({ ...binding, manifest: Object.freeze({ ...binding.manifest }) });
}
export function initializeCanonicalCorpus(): Promise<boolean> {
  if (initialization) return initialization;
  if (!bound) return Promise.reject(Error('SDW_REVISION_NOT_BOUND'));
  initialization = (async () => {
    if (getCanonicalCorpusReader()) throw Error('SDW_COMPETING_SCRIPTURE_READER');
    recordBoot('canonicalBoot');
    const binding = bound!;
    transport = createPacketCache({ revision: binding.revision, baseUrl: `${location.origin}/sdw/` });
    recordIdentity('packetCache', transport);
    const manifest = await transport.load(binding.manifest);
    if (manifest.revision !== binding.revision || manifest.canonicalSourceHash !== binding.canonicalSourceHash) throw Error('SDW_MANIFEST_AUTHORITY');
    const [catalog, locator, startup, dgrIndex] = await Promise.all([transport.load(manifest.scriptureCatalog), transport.load(manifest.locator), transport.load(manifest.startup), transport.load(manifest.dgr)]);
    if (dgrIndex.dgrSourceHash !== manifest.dgrSourceHash) throw Error('SDW_DGR_SOURCE_BINDING');
    const nextDgr = createProgressiveDgr({ revision: binding.revision, index: dgrIndex, transport });
    if (startup.startupSourceHash !== manifest.startupSourceHash) throw Error('SDW_GRAPH_SOURCE_BINDING');
    const nextGraph = createProgressiveGraphCatalog({ revision: binding.revision, startup, locator, transport });
    if (catalog.metadata.translation_id !== CANONICAL_TRANSLATION_ID || catalog.metadata.source_checksum_sha256 !== CANONICAL_SOURCE_CHECKSUM || catalog.metadata.book_count !== '81' || catalog.metadata.verse_record_count !== '38058') throw Error('SDW_CANONICAL_AUTHORITY');
    const next = createProgressiveScriptureReader({ revision: binding.revision, canonicalSourceHash: binding.canonicalSourceHash, catalog, locator, transport });
    // No native SQLite Scripture reader, whole-world import, or second authority.
    if (getCanonicalCorpusReader()) throw Error('SDW_COMPETING_SCRIPTURE_READER');
    installCanonicalCorpusReader(next.reader);
    recordIdentity('canonicalReader', next.reader);
    scripture = next;
    graphCatalog = nextGraph;
    dgr = nextDgr;
    sceneContexts = createProgressiveSceneContexts({ revision: binding.revision, sourceHash: manifest.sceneContextSourceHash, locator, transport });
    readingDescriptor = manifest.readingMetadata;
    readingSourceHash = manifest.readingSourceHash;
    treeDescriptor = manifest.treeMetadata; treeSourceHash = manifest.treeSourceHash;
    compareDescriptor = manifest.compareMetadata; compareSourceHash = manifest.compareSourceHash;
    contradictions = createProgressiveContradictions({ revision: binding.revision, sourceHash: manifest.contradictionSourceHash,
      authorityHash: manifest.contradictionAuthorityHash, descriptor: manifest.contradictionIndex, transport });
    ownerDescriptor = manifest.ownerMetadata; ownerSourceHash = manifest.ownerSourceHash;
    worldIndexHash = manifest.acceptedRootIndexHash; worldSourceHash = manifest.governedWorldHash;
    worldObjectLocations = locator.worldObjects;
    worldRoots = createVerifiedWorldRoots({ expectedHash: worldIndexHash, hashValue: portableHashValue,
      worldProjection: createProgressiveWorldProjection({ revision: binding.revision, governedWorldHash: worldSourceHash,
        acceptedRootIndexHash: worldIndexHash, locator, transport, hashValue: portableHashValue }) });
    recordIdentity('worldRoots', worldRoots);
    return true;
  })();
  return initialization;
}
export function canonicalCorpusIsReady() { return scripture !== undefined; }
export function getProgressiveContradictions() {
  if (!contradictions) throw Error('SDW_CONTRADICTION_STARTUP_NOT_READY');
  return contradictions;
}
export async function acquireContradictionIndex() {
  await initializeCanonicalCorpus(); await getProgressiveContradictions().ensureIndex();
}
export async function acquireContradiction(id: string) {
  await initializeCanonicalCorpus(); return getProgressiveContradictions().ensure(id);
}
export async function acquireContradictionRoute(subjectId: string, id: string, passageId?: string) {
  const record = await acquireContradiction(id);
  if (!record) return;
  const topic = await getProgressiveGraphCatalog().ensureTopic(subjectId);
  const anchorId = record.anchors.find((anchor: any) => !anchor.topicIds?.length || anchor.topicIds.includes(subjectId))?.passageIds[0];
  const selectedId = passageId ?? anchorId;
  if (topic.passages.some((row: any) => row.id === selectedId)) await acquireScene(subjectId, selectedId);
  await Promise.all(record.evidence.map(async (row: any) => {
    if (!await acquireScripture(row.reference)) throw Error('SDW_CONTRADICTION_SCRIPTURE_MISSING');
  }));
}
function freezeOwnerValue(value: any): any {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeOwnerValue); Object.freeze(value);
  }
  return value;
}
export function acquireOwnerMetadata(): Promise<void> {
  return ownerInitialization ??= (async () => {
    await initializeCanonicalCorpus();
    const index = await transport!.load(ownerDescriptor);
    if (index.schema !== 'SDW_GOVERNED_OWNER_INDEX_V1' || index.revision !== bound!.revision || index.sourceHash !== ownerSourceHash) throw Error('SDW_OWNER_INDEX_INTEGRITY');
    ownerMetadata = freezeOwnerValue(index);
  })();
}
function ownerFamily(family: string) {
  if (!ownerMetadata) throw Error('SDW_OWNER_METADATA_ACQUISITION_REQUIRED');
  const value = ownerMetadata.families[family];
  if (!value) throw Error('SDW_OWNER_FAMILY_UNKNOWN');
  return value;
}
export function getGovernedOwner(family: string, owner: string) {
  if (!Object.hasOwn(ownerFamily(family).owners, owner)) return undefined;
  const key = `${family}:${owner}`;
  if (!ownerValues.has(key)) throw Error(`SDW_OWNER_ACQUISITION_REQUIRED:${key}`);
  return ownerValues.get(key);
}
export async function acquireGovernedOwner(family: string, owner: string) {
  await acquireOwnerMetadata();
  const entry = ownerFamily(family).owners[owner];
  if (!entry) return;
  const key = `${family}:${owner}`;
  if (ownerValues.has(key)) return;
  let work = ownerPending.get(key);
  if (!work) {
    work = (async () => {
      const packet = await transport!.load(entry.packet);
      if (packet.schema !== 'SDW_GOVERNED_OWNER_V1' || packet.revision !== bound!.revision || packet.sourceHash !== ownerSourceHash
        || packet.family !== family || packet.owner !== owner) throw Error('SDW_OWNER_PACKET_INTEGRITY');
      ownerValues.set(key, freezeOwnerValue(packet.value));
    })();
    ownerPending.set(key, work);
  }
  try { await work; } finally { if (ownerPending.get(key) === work) ownerPending.delete(key); }
}
// Stable, inert facades at import time. Only acquired metadata may reveal known
// loaders; a known loader never returns an empty substitute for a missing body.
export function governedOwnerLoaders(family: string, structured = false): any {
  const loaders = new Map<string, any>();
  return new Proxy({}, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      const entry = ownerFamily(family).owners[key];
      if (!entry) return undefined;
      if (!loaders.has(key)) {
        const load = () => getGovernedOwner(family, key);
        loaders.set(key, structured ? Object.freeze({ ...entry.identity, load }) : load);
      }
      return loaders.get(key);
    },
    ownKeys: () => Object.keys(ownerFamily(family).owners),
    getOwnPropertyDescriptor: (_target, key) => typeof key === 'string' && Object.hasOwn(ownerFamily(family).owners, key) ? { enumerable: true, configurable: true } : undefined,
  });
}
export function governedOwnerManifest(family: string): any {
  return new Proxy({}, { get: (_target, key) => Reflect.get(ownerFamily(family).manifest, key) });
}
export function getDiscoverSearchRecords(expectedHash: string) {
  if (ownerFamily('discoverSearch').manifest.indexHash !== expectedHash) throw Error('SDW_DISCOVER_SEARCH_AUTHORITY');
  return getGovernedOwner('discoverSearch', 'index');
}
export async function acquireDiscoverSearch(query: string) {
  if (!query.trim()) return;
  await acquireGovernedOwner('discoverSearch', 'index');
  const parsed = parseScriptureReference(query), book = parsed && resolveCanonicalBook(parsed.bookAlias);
  if (book) await acquireScripture(query);
  else if (!resolveCanonicalBook(query)) await acquireScriptureSearch(query, 12);
}
export function getProgressiveCompare() {
  if (!compare) throw Error('SDW_COMPARE_METADATA_ACQUISITION_REQUIRED');
  return compare;
}
export function acquireCompareMetadata(): Promise<void> {
  return compareInitialization ??= (async () => {
    await initializeCanonicalCorpus();
    const index = await transport!.load(compareDescriptor);
    compare = createProgressiveCompare({ revision: bound!.revision, sourceHash: compareSourceHash, index, transport });
    recordIdentity('compareMetadata', compare);
  })();
}
export async function acquireCompare(subjectId: string, compareId?: string) {
  await Promise.all([acquireCompareMetadata(), acquireTreeMetadata()]);
  const store = getProgressiveCompare();
  await store.ensureOwner(subjectId);
  const id = compareId ?? store.metadata.defaults[subjectId];
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) return;
  const row = await getProgressiveTree().ensureRecord('subject', subjectId, 'analysis', `compare:${subjectId}:${id}`);
  if (!row) return;
  const navigation = store.metadata.navigation[row.ref];
  if (navigation?.anchor?.id) await acquireScene(subjectId, navigation.anchor.id);
  await Promise.all([row.payload.leftReference, row.payload.rightReference].map(async (reference: string) => {
    if (!await acquireScripture(reference)) throw Error('SDW_COMPARE_SCRIPTURE_MISSING');
  }));
}
export async function acquirePivotLens(subjectId: string, compareId?: string, lensId?: string) {
  await acquireCompare(subjectId, compareId);
  const topic = await getProgressiveGraphCatalog().ensureTopic(subjectId);
  const id = compareId ?? getProgressiveCompare().metadata.defaults[subjectId];
  const compare = getProgressiveTree().getRecord('subject', subjectId, 'analysis', `compare:${subjectId}:${id}`);
  if (!compare) return;
  const available = compare.payload.pivotIds.map((id: string) => topic.pivots.find((pivot: { id: string }) => pivot.id === id)).filter(Boolean);
  const selected = available.find((row: { id: string }) => row.id === lensId) ?? available[0] ?? topic.pivots[0];
  if (!selected) return;
  await Promise.all(selected.nodes.map(async (node: { reference: string }) => {
    if (!await acquireScripture(node.reference)) throw Error('SDW_PIVOT_SCRIPTURE_MISSING');
  }));
}
export function getVerifiedWorldRoots() {
  if (!worldRoots) throw Error('SDW_WORLD_STARTUP_NOT_READY');
  return { roots: worldRoots, expectedHash: worldIndexHash };
}
export async function acquireWorldRoot(rootRef: string) {
  await initializeCanonicalCorpus();
  const value = await worldRoots!.ensure(rootRef);
  await Promise.all([value.handle.ensureReference(rootRef), acquireTopicTree(rootRef.slice(rootRef.indexOf(':') + 1))]);
  return value;
}
export async function acquireWorldDescriptors(rootRef: string, refs: readonly string[]) {
  const { handle } = await worldRoots!.ensure(rootRef);
  await Promise.all([...new Set(refs)].map(ref => handle.ensureReference(ref)));
}
export function getWorldObject(ref: string) {
  if (!worldObjectLocations[ref]) return undefined;
  if (!worldObjects.has(ref)) throw Error(`SDW_WORLD_OBJECT_ACQUISITION_REQUIRED:${ref}`);
  return worldObjects.get(ref);
}
export async function acquireWorldStoredObject(ref: string, expectedHash: string) {
  if (!worldObjectLocations[ref]) throw Error('SDW_WORLD_OBJECT_UNKNOWN');
  if (!worldObjects.has(ref)) {
    const packet = await transport!.load(worldObjectLocations[ref]);
    if (packet.schema !== 'SDW_WORLD_OBJECT_V1' || packet.revision !== bound!.revision || packet.governedWorldHash !== worldSourceHash
      || packet.ref !== ref || portableHashValue(packet.object) !== expectedHash) throw Error('SDW_WORLD_OBJECT_INTEGRITY');
    worldObjects.set(ref, packet.object);
  }
  if (portableHashValue(worldObjects.get(ref)) !== expectedHash) throw Error('SDW_WORLD_OBJECT_CHANGED');
  return worldObjects.get(ref);
}
export function getProgressiveGraphCatalog() {
  if (!graphCatalog) throw Error('SDW_GRAPH_STARTUP_NOT_READY');
  return graphCatalog;
}
export function getApprovedStartupBaseline(revisionId: string) { return getProgressiveGraphCatalog().baseline(revisionId); }
export function getProgressiveDgr() {
  if (!dgr) throw Error('SDW_DGR_STARTUP_NOT_READY');
  return dgr;
}
export function getReadingMetadata() {
  if (!readingMetadata) throw Error('SDW_READING_METADATA_ACQUISITION_REQUIRED');
  return readingMetadata;
}
export function getProgressiveSceneContexts() {
  if (!sceneContexts) throw Error('SDW_SCENE_CONTEXT_STARTUP_NOT_READY');
  return sceneContexts;
}
export function getProgressiveTree() {
  if (!tree) throw Error('SDW_TREE_METADATA_ACQUISITION_REQUIRED');
  return tree;
}
export function acquireTreeMetadata(): Promise<void> {
  return treeInitialization ??= (async () => {
    await initializeCanonicalCorpus();
    if (!treeDescriptor) throw Error('SDW_TREE_LOCATOR_MISSING');
    const metadata = await transport!.load(treeDescriptor);
    tree = createProgressiveTree({ revision: bound!.revision, sourceHash: treeSourceHash, metadata, transport });
    recordIdentity('treePacketStore', tree);
    recordIdentity('treeCache', tree);
  })();
}
export async function acquireTopicTree(subjectId: string) {
  await acquireTreeMetadata();
  const metadata = getProgressiveGraphCatalog().metadata(subjectId);
  if (!metadata) throw Error('SDW_TREE_SUBJECT_UNKNOWN');
  const ref = `${metadata.axis}:${subjectId}`;
  if (metadata.axis === 'character') await getProgressiveTree().ensureTrail();
  await Promise.all(['presenter', 'capability'].map(family => getProgressiveTree().ensureRecord('subject', subjectId, family, ref)));
}
export async function acquireSceneTree(subjectId: string, sceneId: string) {
  await acquireTopicTree(subjectId);
  const ref = `scene:${sceneId}`;
  const [scene] = await Promise.all(['presenter', 'capability', 'related'].map(family => getProgressiveTree().ensureRecord('subject', subjectId, family, ref)));
  if (!scene || scene.ownerRef !== `${getProgressiveGraphCatalog().metadata(subjectId).axis}:${subjectId}`) throw Error('SDW_TREE_SCENE_OWNER_MISMATCH');
  await Promise.all((scene.analysisRefs ?? []).map((ref: string) => getProgressiveTree().ensureRecord('subject', subjectId, 'analysis', ref)));
}
function requireQuestionReader() {
  if (!questionReader) throw Error('SDW_QUESTIONS_METADATA_ACQUISITION_REQUIRED');
  return questionReader;
}
// Stable facade may be imported during app initialization without reading bodies.
const questionsFacade = Object.freeze({
  get valid() { return requireQuestionReader().valid; }, revisionId: 'bundled-approved',
  get: (...args: any[]) => requireQuestionReader().get(...args),
  list: (input: any) => requireQuestionReader().list(input),
  diagnostics: () => requireQuestionReader().diagnostics(),
});
export function getProgressiveQuestionReader() { return questionsFacade; }
export function acquireReadingMetadata(): Promise<void> {
  return readingInitialization ??= (async () => {
    await initializeCanonicalCorpus();
    if (!readingDescriptor) throw Error('SDW_READING_METADATA_LOCATOR_MISSING');
    const metadata = await transport!.load(readingDescriptor);
    if (metadata.readingSourceHash !== readingSourceHash) throw Error('SDW_READING_SOURCE_BINDING');
    const reader = createProgressiveQuestions({ revision: bound!.revision, metadata, dgr: getProgressiveDgr() });
    readingMetadata = metadata; questionReader = reader;
  })();
}
export async function acquireReadingScripture(reference: string, pinnedSubjectId?: string, pinnedSceneId?: string) {
  const [source] = await Promise.all([acquireScripture(reference), acquireReadingMetadata()]);
  if (!source) throw Error('SDW_READING_SOURCE_MISSING');
  const parsed = parseScriptureReference(reference), book = parsed && resolveCanonicalBook(parsed.bookAlias);
  if (!parsed || !book) throw Error('SDW_READING_ADDRESS_INVALID');
  const scenes = new Map<string, string>();
  for (const range of parsed.ranges) for (let chapter = range.startChapter; chapter <= range.endChapter; chapter++) {
    const indices = getReadingMetadata().tree.chapterRows[`${book.id}:${chapter}`];
    if (!indices) throw Error('SDW_READING_CHAPTER_MISSING');
    for (const index of indices) {
      const row = getReadingMetadata().coordinates.coordinates[index];
      if (!row) throw Error('SDW_READING_COORDINATE_MISSING');
      scenes.set(row.sceneId, row.subjectId);
    }
  }
  if (pinnedSceneId && pinnedSubjectId) scenes.set(pinnedSceneId, pinnedSubjectId);
  await Promise.all([...scenes].map(([sceneId, subjectId]) => getProgressiveDgr().ensureScene(sceneId, subjectId)));
  return source;
}
export async function acquireScripture(reference: string) {
  await initializeCanonicalCorpus();
  const parsed = parseScriptureReference(reference);
  const book = parsed ? resolveCanonicalBook(parsed.bookAlias) : undefined;
  if (!parsed || !book) return undefined;
  await scripture!.ensureRanges(book.id, parsed.ranges);
  return getScripture(reference);
}
export async function acquireScriptureSearch(query: string, limit = 12) {
  await initializeCanonicalCorpus();
  const trimmed = query.trim();
  if (trimmed.length < 3) return;
  await scripture!.ensureSearch(trimmed, Math.max(1, Math.min(limit, 24)));
}
/** Route intent, never startup prefetch. Existing resolvers still own semantics. */
export async function acquireScene(subjectId: string, sceneId?: string) {
  await initializeCanonicalCorpus();
  const topic = await getProgressiveGraphCatalog().ensureTopic(subjectId);
  const passage = sceneId === undefined ? topic.passages[0] : topic.passages.find((row: { id: string }) => row.id === sceneId);
  if (!passage) throw Error('SDW_SCENE_OWNER_MISMATCH');
  await Promise.all([
    acquireScripture(passage.reference).then(source => { if (!source) throw Error('SDW_SCENE_SCRIPTURE_MISSING'); }),
    getProgressiveDgr().ensureScene(passage.id, subjectId),
    acquireReadingMetadata(),
    getProgressiveSceneContexts().ensure(subjectId, passage.id),
    acquireSceneTree(subjectId, passage.id),
  ]);
  return passage;
}
export function progressiveRuntimeDiagnostics() {
  return { ready: canonicalCorpusIsReady(), revision: bound?.revision, cache: transport?.diagnostics(), scripture: scripture?.diagnostics(), graph: graphCatalog?.diagnostics(), dgr: dgr?.diagnostics(), contradictions: contradictions?.diagnostics(), governedOwners: { metadataAcquired: Boolean(ownerMetadata), hydrated: [...ownerValues.keys()] } };
}
// Read-only browser evidence; it cannot acquire data or mutate runtime state.
Object.defineProperty(globalThis, '__scriptureProgressiveEvidence', { value: progressiveRuntimeDiagnostics });
