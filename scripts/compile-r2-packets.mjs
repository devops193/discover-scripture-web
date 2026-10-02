// Inactive build target until the shared runtime passes R2 integration gates.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { buildSceneContexts, readOwnerSources, writeOwnerPackets } from './build-r2-scene-contexts.mjs';
import { readTreeSources, writeTreePackets } from './build-r2-tree-packets.mjs';
import { readCompareSources, writeComparePackets } from './build-r2-compare-packets.mjs';
import { readContradictionSources, writeContradictionPackets } from './build-r2-contradiction-packets.mjs';
import { catalog as approvedCatalog, payload as startupCatalog } from './build-r2-startup-catalog.mjs';
import { enrichCharacterRoot } from '../../ScriptureDiscovery/src/worlds/characterActivityProjection.mjs';
import { portableHashValue } from '../../ScriptureDiscovery/src/scripture-tree/portableRuntimeServices.mjs';
const source = path.resolve('../ScriptureDiscovery');
const output = path.resolve('.product-build-r2-packets');
fs.mkdirSync(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalFile = path.join(source, 'assets/scripture/engwebu.db');
const canonicalSourceHash = hash(fs.readFileSync(canonicalFile));
const worldFiles = ['character-roots', 'binding', 'enrichment-index'];
const worldSources = Object.fromEntries(worldFiles.map(name => [name, fs.readFileSync(path.join(source, `assets/worlds/${name}.json`))]));
const governedWorldHash = hash(JSON.stringify(Object.entries(worldSources).map(([name, bytes]) => [name, hash(bytes)])));
const startupSourceHash = hash(JSON.stringify(startupCatalog.sourceHashes));
const dgrFiles = ['production-question-authority', 'production-runtime-bundle', 'runtime-question-lookup-manifest'];
const dgrSources = dgrFiles.map(name => fs.readFileSync(path.join(source, `assets/dgr/runtime-02/${name}.json`)));
const dgrSourceHash = hash(JSON.stringify(dgrSources.map(hash)));
const [dgrAuthority, dgrBundle, dgrLookup] = dgrSources.map(bytes => JSON.parse(bytes));
const readingTree = JSON.parse(fs.readFileSync(path.join(source, 'assets/scripture-tree/reader-v3.json')));
const readingCoordinates = JSON.parse(fs.readFileSync(path.join(source, 'assets/dgr/runtime-02/reading-investigation-binding.json')));
const { createQuestionsTreeReader, QUESTIONS_SOURCE_PINS } = await import('../../ScriptureDiscovery/src/scripture-tree/questionsTreeReader.mjs');
const questionSources = { tree: readingTree, bundle: dgrBundle, lookup: dgrLookup, coordinates: readingCoordinates, authority: dgrAuthority };
const acceptedQuestions = createQuestionsTreeReader(questionSources);
assert.equal(acceptedQuestions.valid, true, 'Existing pinned Questions/Tree authority validation');
for (const record of dgrBundle.questionRecords) assert.equal(acceptedQuestions.get(record.contract.questionId, record.contract.subjectId, record.contract.sceneId), record);
const readingSourceHash = hash(JSON.stringify(QUESTIONS_SOURCE_PINS));
const sceneContexts = buildSceneContexts(source, approvedCatalog.topics, readingCoordinates);
const treeSources = readTreeSources(source);
const compareSources = readCompareSources(source, treeSources);
const ownerSources = readOwnerSources(source);
const contradictionSources = readContradictionSources(source);
assert.equal(compareSources.metadata.dgrAuthority, dgrAuthority.authorityHash);
const revision = hash(JSON.stringify({ schema: 'SDW_R2_SPINE_CANDIDATE_V1', canonicalSourceHash, governedWorldHash, startupSourceHash, dgrSourceHash, readingSourceHash, sceneContextSourceHash: sceneContexts.sourceHash, treeSourceHash: treeSources.sourceHash, compareSourceHash: compareSources.sourceHash, ownerSourceHash: ownerSources.sourceHash, contradictionSourceHash: contradictionSources.sourceHash }));
const write = value => {
  const bytes = Buffer.from(JSON.stringify(value)); const sha256 = hash(bytes);
  fs.writeFileSync(path.join(output, `${sha256}.json`), bytes);
  return { revision, sha256, bytes: bytes.length, url: `/sdw/${revision}/${sha256}.json` };
};
const db = new DatabaseSync(canonicalFile, { readOnly: true });
const treePackets = writeTreePackets(treeSources, revision, write);
const compareMetadata = writeComparePackets(compareSources, treeSources, revision, write);
const ownerPackets = writeOwnerPackets(ownerSources, revision, write);
const contradictionIndex = writeContradictionPackets(contradictionSources, revision, write);
const books = db.prepare('SELECT * FROM books ORDER BY canonical_order').all();
const locator = { schema: 'SDW_LOCATOR_CANDIDATE_V1', revision, scripture: {}, roots: {}, rootProjections: {}, topics: {} };
// Partition Scene context locators by their existing subject; each Scene has one
// canonical chapter owner and one packet, even when its references span books.
locator.sceneContexts = {};
for (const subjectId of Object.keys(approvedCatalog.topics)) {
  const scenes = {};
  for (const row of sceneContexts.rows.filter(row => row.subjectId === subjectId)) scenes[row.sceneId] = {
    owner: row.owner, packet: write({ schema: 'SDW_SCENE_CONTEXT_V1', revision, sourceHash: sceneContexts.sourceHash, ...row }),
  };
  locator.sceneContexts[subjectId] = write({ schema: 'SDW_SCENE_CONTEXT_INDEX_V1', revision, sourceHash: sceneContexts.sourceHash, subjectId, scenes });
}
// These are exact existing legacy topic bodies, never startup placeholders.
// World/Tree Scene acquisition uses its own governed ownership projection.
for (const [subjectId, topic] of Object.entries(approvedCatalog.topics)) {
  locator.topics[subjectId] = write({ schema: 'SDW_APPROVED_TOPIC_V1', revision, subjectId, topic });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, `${locator.topics[subjectId].sha256}.json`))).topic, JSON.parse(JSON.stringify(topic)));
}
const startup = write({ schema: 'SDW_APPROVED_STARTUP_V1', revision, startupSourceHash, catalog: startupCatalog });
const { questionRecords, ...dgrBundleMetadata } = dgrBundle;
assert.equal(questionRecords.length, 184);
assert.equal(dgrBundle.authorityHash, dgrAuthority.authorityHash);
assert.equal(dgrLookup.authorityHash, dgrAuthority.authorityHash);
const questionLocations = {};
for (const record of questionRecords) {
  const id = record.contract.questionId;
  assert.ok(!Object.hasOwn(questionLocations, id));
  const packet = write({ schema: 'SDW_DGR_QUESTION_V1', revision, dgrSourceHash, authorityHash: dgrAuthority.authorityHash, record });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, `${packet.sha256}.json`))).record, record);
  questionLocations[id] = { runtimeRecordHash: record.runtimeRecordHash, packet };
}
const dgr = write({ schema: 'SDW_DGR_LOCATOR_V1', revision, dgrSourceHash, authority: dgrAuthority, bundle: dgrBundleMetadata, lookup: dgrLookup, questions: questionLocations });
// Exact navigation/membership metadata; Question/Finding/Evidence bodies remain
// solely in their individually verified owner packets. Validate the complete
// native five-source pin contract above before deriving this delivery binding.
const readingMetadata = write({ schema: 'SDW_READING_METADATA_V1', revision, readingSourceHash,
  sourcePins: QUESTIONS_SOURCE_PINS, tree: readingTree, coordinates: readingCoordinates,
  questionRecordHashes: Object.fromEntries(dgrBundle.questionRecords.map(record => [record.contract.questionId, portableHashValue(record)])),
});
const bookManifests = []; let verses = 0, chapters = 0;
for (const book of books) {
  const entries = [];
  for (const { chapter } of db.prepare('SELECT DISTINCT chapter FROM verses WHERE book_id=? ORDER BY chapter').all(book.id)) {
    const rows = db.prepare('SELECT * FROM verses WHERE book_id=? AND chapter=? ORDER BY verse_ordinal').all(book.id, chapter);
    const packet = write({ schema: 'SDW_SCRIPTURE_CHAPTER_V1', revision, canonicalSourceHash, bookId: book.id, chapter, verses: rows });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, `${packet.sha256}.json`))).verses, JSON.parse(JSON.stringify(rows)));
    locator.scripture[`${book.id}:${chapter}`] = packet;
    entries.push({ chapter, verseRecordCount: rows.length, packet }); verses += rows.length; chapters++;
  }
  bookManifests.push({ bookId: book.id, manifest: write({ schema: 'SDW_BOOK_MANIFEST_V1', revision, book, chapters: entries }) });
}
const roots = JSON.parse(worldSources['character-roots']);
const enrichment = JSON.parse(worldSources['enrichment-index']);
const worldBinding = JSON.parse(worldSources.binding);
const relationships = JSON.parse(fs.readFileSync(path.join(source, 'assets/worlds/scene-edge-records.json')));
const activities = JSON.parse(fs.readFileSync(path.join(source, 'assets/worlds/activity-records.json')));
assert.equal(portableHashValue(relationships), worldBinding.relationshipHash);
assert.equal(portableHashValue(activities), enrichment.payloadHash);
locator.worldObjects = {};
for (const [ref, object] of [...Object.entries(relationships), ...Object.entries(activities)]) {
  assert.ok(!Object.hasOwn(locator.worldObjects, ref));
  locator.worldObjects[ref] = write({ schema: 'SDW_WORLD_OBJECT_V1', revision, governedWorldHash, ref, object });
}
assert.equal(portableHashValue(roots), enrichment.baseIndexHash);
assert.equal(enrichment.baseIndexHash, worldBinding.rootIndexHash);
const acceptedRoots = Object.fromEntries(Object.entries(roots).map(([ref, root]) => {
  const entry = enrichment.roots[ref];
  assert.equal(root.semanticHash, entry.baseHash);
  const accepted = enrichCharacterRoot(root, entry.descriptors);
  assert.equal(accepted.semanticHash, entry.rootHash);
  return [ref, accepted];
}));
assert.equal(portableHashValue(acceptedRoots), enrichment.rootIndexHash);
const rootProjectionProof = [];
for (const [ref, root] of Object.entries(roots)) {
  const { references, links, curatedDiscoveryReferences, branches, ...identity } = root;
  const objectLocations = {};
  // Descriptor and outgoing links have exactly one transport record per ref.
  // Neither canonical ownership nor the descriptor's target hash is changed.
  for (const [objectRef, descriptor] of Object.entries(references)) {
    objectLocations[objectRef] = write({ schema: 'SDW_WORLD_REFERENCE_V1', revision, rootRef: ref, descriptor, links: links[objectRef] ?? null });
  }
  const referenceLocator = write({ schema: 'SDW_WORLD_REFERENCE_LOCATOR_V1', revision, rootRef: ref, locations: objectLocations });
  const branchLocations = {};
  for (const [family, branch] of Object.entries(branches)) branchLocations[family] = { count: branch.refs.length, packet: write({ schema: 'SDW_WORLD_BRANCH_V1', revision, rootRef: ref, branch }) };
  const curated = write({ schema: 'SDW_WORLD_CURATED_REFS_V1', revision, rootRef: ref, refs: curatedDiscoveryReferences });
  locator.roots[ref] = write({ schema: 'SDW_CHARACTER_ROOT_TRANSPORT_V2', revision, governedWorldHash, identity, branches: branchLocations, referenceLocator, curated, enrichment: write({ schema: 'SDW_WORLD_ENRICHMENT_V1', revision, rootRef: ref, entry: enrichment.roots[ref] }) });
  const read = d => JSON.parse(fs.readFileSync(path.join(output, `${d.sha256}.json`)));
  const reconstructedReferences = {}, reconstructedLinks = {};
  for (const [objectRef, location] of Object.entries(objectLocations)) {
    const row = read(location); reconstructedReferences[objectRef] = row.descriptor;
    if (Object.hasOwn(links, objectRef)) reconstructedLinks[objectRef] = row.links;
  }
  // Unexpected unowned links are a build failure, never silently dropped.
  assert.deepEqual(reconstructedLinks, links);
  assert.deepEqual(reconstructedReferences, references);
  assert.deepEqual(Object.fromEntries(Object.entries(branchLocations).map(([family, d]) => [family, read(d.packet).branch])), branches);
  assert.deepEqual(read(curated).refs, curatedDiscoveryReferences);
  // Bind the compact entry to the exact accepted, enriched Root. This manifest
  // contains ordered identities and hashes, not descendant semantic bodies.
  const accepted = acceptedRoots[ref];
  const { references: acceptedReferences, links: acceptedLinks, branches: acceptedBranches, curatedDiscoveryReferences: acceptedCurated, ...acceptedIdentity } = accepted;
  const dependencyPackets = {};
  for (const [objectRef, descriptor] of Object.entries(acceptedReferences)) {
    const original = objectLocations[objectRef];
    const value = { schema: 'SDW_WORLD_REFERENCE_V1', revision, rootRef: ref, descriptor, links: acceptedLinks[objectRef] ?? null };
    const location = original && JSON.stringify(read(original)) === JSON.stringify(value) ? original : write(value);
    dependencyPackets[objectRef] = { semanticHash: descriptor.targetHash, packet: location };
  }
  const projectionBody = {
    schema: 'SDW_ROOT_PROJECTION_V1', revision, rootRef: ref,
    governedWorldHash, acceptedRootIndexHash: enrichment.rootIndexHash,
    baseRootIndexHash: enrichment.baseIndexHash, baseRootSemanticHash: root.semanticHash,
    rootEntry: locator.roots[ref], identity: acceptedIdentity,
    branches: Object.fromEntries(Object.entries(acceptedBranches).map(([family, branch]) => [family, { ...branch, count: branch.refs.length }])),
    orderedDependencyRefs: Object.keys(acceptedReferences), linkedDependencyRefs: Object.keys(acceptedLinks), dependencies: dependencyPackets,
    curated: write({ schema: 'SDW_WORLD_CURATED_REFS_V1', revision, rootRef: ref, refs: acceptedCurated }),
  };
  locator.rootProjections[ref] = write({ ...projectionBody, projectionHash: portableHashValue(projectionBody) });
  const rebound = read(locator.rootProjections[ref]);
  const rebuiltReferences = {}, rebuiltLinks = {};
  for (const objectRef of rebound.orderedDependencyRefs) {
    const packet = read(rebound.dependencies[objectRef].packet);
    assert.equal(packet.descriptor.targetHash, rebound.dependencies[objectRef].semanticHash);
    rebuiltReferences[objectRef] = packet.descriptor;
    if (Object.hasOwn(acceptedLinks, objectRef)) rebuiltLinks[objectRef] = packet.links;
  }
  const rebuilt = { ...rebound.identity, references: rebuiltReferences, links: rebuiltLinks, branches: Object.fromEntries(Object.entries(rebound.branches).map(([family, { count, ...branch }]) => [family, branch])), curatedDiscoveryReferences: read(rebound.curated).refs };
  assert.deepEqual(rebuilt, accepted);
  assert.equal(portableHashValue({ ...rebuilt, semanticHash: undefined }), accepted.semanticHash);
  rootProjectionProof.push({ ref, references: Object.keys(references).length, exactDescriptorAndLinkEquivalence: 'PASS', exactBranchOrderEquivalence: 'PASS', rootBytes: locator.roots[ref].bytes, referenceLocatorBytes: referenceLocator.bytes });
  Object.assign(rootProjectionProof.at(-1), { acceptedEnrichedRootEquivalence: 'PASS', acceptedRootSemanticHash: accepted.semanticHash, acceptedRootIndexHash: enrichment.rootIndexHash, projectionManifest: locator.rootProjections[ref], acceptedDependencies: rebound.orderedDependencyRefs.length });
}
// Search is an on-demand transport index, not a second text authority. SQLite's
// built-in lower() folds ASCII only; preserve that rule rather than JS Unicode
// lowercasing. Postings locate candidate chapters; exact text matching remains
// against the same chapter records used by the canonical reader.
const searchBuckets = Array.from({ length: 256 }, () => new Map());
const foldAscii = value => value.replace(/[A-Z]/g, letter => letter.toLowerCase());
const bucketFor = gram => {
  let bucket = 0;
  for (let i = 0; i < gram.length; i++) bucket = (bucket * 31 + gram.charCodeAt(i)) & 255;
  return bucket;
};
const searchChapters = [];
for (const book of books) for (const { chapter } of db.prepare('SELECT DISTINCT chapter FROM verses WHERE book_id=? ORDER BY chapter').all(book.id)) {
  const key = `${book.id}:${chapter}`; searchChapters.push(key);
  const grams = new Set();
  for (const row of db.prepare('SELECT text FROM verses WHERE book_id=? AND chapter=? AND is_omitted=0').all(book.id, chapter)) {
    const text = foldAscii(row.text);
    for (let i = 0; i <= text.length - 3; i++) grams.add(text.slice(i, i + 3));
  }
  for (const gram of grams) {
    const bucket = searchBuckets[bucketFor(gram)];
    if (!bucket.has(gram)) bucket.set(gram, []);
    bucket.get(gram).push(searchChapters.length - 1);
  }
}
const searchShards = searchBuckets.map((bucket, bucketId) => write({ schema: 'SDW_SCRIPTURE_SEARCH_SHARD_V1', revision, canonicalSourceHash, bucketId, postings: Object.fromEntries([...bucket].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) }));
const searchIndex = write({ schema: 'SDW_SCRIPTURE_SEARCH_INDEX_V1', revision, canonicalSourceHash, chapters: searchChapters, shards: searchShards });
const scriptureCatalog = write({
  schema: 'SDW_SCRIPTURE_CATALOG_V1', revision, canonicalSourceHash, books,
  searchIndex,
  aliases: db.prepare('SELECT * FROM aliases ORDER BY book_id, normalized_alias, alias').all(),
  metadata: Object.fromEntries(db.prepare('SELECT key, value FROM corpus_metadata ORDER BY key').all().map(row => [row.key, row.value])),
  chapterCounts: Object.fromEntries(db.prepare('SELECT book_id, MAX(chapter) AS count FROM verses GROUP BY book_id ORDER BY book_id').all().map(row => [row.book_id, row.count])),
});
const index = write(locator);
const manifest = { schema: 'SDW_R2_SPINE_CANDIDATE_V1', revision, canonicalSourceHash, governedWorldHash, acceptedRootIndexHash: enrichment.rootIndexHash, startupSourceHash, startup, dgrSourceHash, dgr, readingSourceHash, readingMetadata, sceneContextSourceHash: sceneContexts.sourceHash, treeSourceHash: treeSources.sourceHash, treeMetadata: treePackets.descriptor, scriptureCatalog, locator: index, books: bookManifests, offlinePackage: { available: false }, productionActive: false };
Object.assign(manifest, { compareSourceHash: compareSources.sourceHash, compareMetadata });
Object.assign(manifest, { ownerSourceHash: ownerSources.sourceHash, ownerMetadata: ownerPackets.descriptor });
Object.assign(manifest, { contradictionSourceHash: contradictionSources.sourceHash, contradictionAuthorityHash: contradictionSources.authorityHash, contradictionIndex });
const manifestPacket = write(manifest);
assert.equal(books.length, 81); assert.equal(verses, 38058);
assert.equal(hash(fs.readFileSync(canonicalFile)), canonicalSourceHash); db.close();
const report = { status: 'SPINE_AND_EXISTING_WORLD_PROJECTION_PASS_INTEGRATION_PENDING', productionActive: false, output, revision, manifest: manifestPacket, scriptureCatalog, locator: index, books: books.length, chapters, verses, characterRoots: Object.keys(locator.roots).length, rootProjectionProof, genesis22: locator.scripture['engwebu:gen:22'], genesis23: locator.scripture['engwebu:gen:23'], abraham: locator.roots['character:abraham'], canonicalSourceHash, governedWorldHash, exactCanonicalRecordEquivalence: 'PASS', missingFamilies: ['Scene owner packets', 'Question/Finding/Evidence locators', 'remaining Tree governed object projections'], runtimeBound: false, nativeSourceMutated: false };
fs.writeFileSync('docs/01b-evidence/r2-projection-candidate.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('docs/01b-evidence/r2-governed-owner-projection.json', JSON.stringify({ revision, sourceHash: ownerSources.sourceHash, sources: ownerSources.sources, counts: ownerPackets.counts, exactOwnerPayloadEquivalence: 'PASS', runtimeIntegration: 'PENDING' }, null, 2) + '\n');
console.log(report);
