// Applied only to a website-owned staging copy. The production native files
// remain read-only. Export activation is separately gated on semantic startup.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { applyProgressivePresenterOverlay } from './progressive-presenter-overlay.mjs';
import { applyProgressiveWorldConsumerOverlay } from './progressive-world-consumer-overlay.mjs';
import { applyProgressiveCompareOverlay } from './progressive-compare-overlay.mjs';
import { OWNER_REGISTRIES } from './build-r2-scene-contexts.mjs';
import { applyProgressiveContradictionOverlay } from './progressive-contradiction-overlay.mjs';
export function applyProgressiveConsumerOverlays(stage) {
  const changed = [];
  changed.push(applyProgressivePresenterOverlay(stage));
  changed.push(...applyProgressiveWorldConsumerOverlay(stage));
  changed.push(...applyProgressiveCompareOverlay(stage));
  changed.push(...applyProgressiveContradictionOverlay(stage));
  for (const [family, relative, exportName, manifestName] of OWNER_REGISTRIES) {
    const structured = family.startsWith('question');
    fs.mkdirSync(path.dirname(path.join(stage, relative)), { recursive: true });
    fs.writeFileSync(path.join(stage, relative), `// Website transport overlay; native semantic resolver unchanged.\nimport { governedOwnerLoaders, governedOwnerManifest } from '@/website-runtime/progressiveRuntime';\nexport const ${exportName} = governedOwnerLoaders(${JSON.stringify(family)}, ${structured});\n${manifestName ? `export const ${manifestName} = governedOwnerManifest(${JSON.stringify(family)});` : ''}\n`);
    changed.push(relative.slice(4));
  }
  const toolsFile = path.join(stage, 'src/scripture-tree/discoverToolsTreeRuntime.ts');
  const toolsSource = fs.readFileSync(toolsFile, 'utf8');
  const acquisitionGuard = "catch (error) { if (error instanceof Error && /^SDW_.*ACQUISITION_REQUIRED/.test(error.message)) throw error;";
  if ((toolsSource.match(/catch \{/g) ?? []).length !== 4) throw Error('R2_TOOLS_ACQUISITION_GUARD_DRIFT');
  fs.writeFileSync(toolsFile, toolsSource.replaceAll('catch {', acquisitionGuard));
  changed.push('scripture-tree/discoverToolsTreeRuntime.ts');
  function edit(relative, transforms) {
    const file = path.join(stage, 'src', relative);
    let text = fs.readFileSync(file, 'utf8');
    for (const [before, after] of transforms) {
      if (text.split(before).length !== 2) throw Error(`R2_CONSUMER_OVERLAY_DRIFT:${relative}:${before}`);
      text = text.replace(before, after);
    }
    fs.writeFileSync(file, text); changed.push(relative);
  }
  edit('questions/runtime.ts', [[
    '  } catch {\n    rejected.add(topicId);',
    "  } catch (error) {\n    if (error instanceof Error && /^SDW_.*ACQUISITION_REQUIRED/.test(error.message)) throw error;\n    rejected.add(topicId);",
  ]]);
  const runtime = path.join(stage, 'src/data/scripture/runtime.ts');
  const searchFile = path.join(stage, 'src/data/discover-search-index.generated.ts');
  const searchHash = /DISCOVER_SEARCH_INDEX_HASH = "([a-f0-9]{64})"/.exec(fs.readFileSync(searchFile, 'utf8'))?.[1];
  if (!searchHash) throw Error('R2_SEARCH_INDEX_PIN_DRIFT');
  fs.writeFileSync(searchFile, `import { getDiscoverSearchRecords } from '@/website-runtime/progressiveRuntime';
export const DISCOVER_SEARCH_INDEX_HASH=${JSON.stringify(searchHash)};
export const discoverSearchRecords=new Proxy([], {get(_target,key){
  const rows=getDiscoverSearchRecords(DISCOVER_SEARCH_INDEX_HASH), value=Reflect.get(rows,key);
  return typeof value==='function'?value.bind(rows):value;
}});
`);
  changed.push('data/discover-search-index.generated.ts');
  edit('components/DiscoverSearchSheet.tsx', [
    ['  classification,', '  classification,\n  loading = false,'],
    ['  classification: DiscoverSearchClassification;', '  classification?: DiscoverSearchClassification;\n  loading?: boolean;'],
    ['{query.trim() ? (', '{query.trim() && classification && !loading ? ('],
    ['{query.trim() && results.length ? results.map', '{loading ? <Text accessibilityRole="progressbar" style={[styles.prompt, { color: theme.textSecondary }]}>Loading verified search…</Text> : query.trim() && results.length ? results.map'],
  ]);
  edit('app/discovery/[slug]/dissect.tsx', [
    ["import { router, Stack, useLocalSearchParams } from 'expo-router';", "import { router, Stack, useLocalSearchParams } from 'expo-router';\nimport { ProgressiveDissectBoundary } from '@/website-runtime/ProgressiveDissectBoundary';"],
    ['  getContradictionsForPassage,', '  getContradictionAttachmentsForPassage,'],
    ['  type ContradictionSpec,', '  type ContradictionAttachment,'],
    ['export default function DissectScreen() {', 'export default function ProgressiveDissectScreen() { return <ProgressiveDissectBoundary><DissectScreen /></ProgressiveDissectBoundary>; }\nfunction DissectScreen() {'],
    ['getContradictionsForPassage(topic.id, passage.id)', 'getContradictionAttachmentsForPassage(topic.id, passage.id)'],
    ['openContradiction(contradiction: ContradictionSpec)', 'openContradiction(contradiction: ContradictionAttachment)'],
    ['contradiction.evidence[0].reference', 'contradiction.references[0]'],
    ['contradiction.evidence[1].reference', 'contradiction.references[1]'],
  ]);
  for (const relative of ['components/TrailCapsule.tsx', 'app/(tabs)/saved.tsx']) {
    const file = path.join(stage, 'src', relative);
    fs.writeFileSync(file, "import { acquireContradiction } from '@/website-runtime/progressiveRuntime';\n" + fs.readFileSync(file, 'utf8'));
    edit(relative, [["if (item.surface === 'contradiction') {", "if (item.surface === 'contradiction') {\n      await acquireContradiction(item.targetId);"]]);
  }
  fs.writeFileSync(runtime, "export { initializeCanonicalCorpus, canonicalCorpusIsReady } from '@/website-runtime/progressiveRuntime';\n");
  changed.push('data/scripture/runtime.ts');
  const seed = path.join(stage, 'src/data/seed.ts');
  fs.writeFileSync(seed, `import type { DiscoveryAxis, DiscoveryCard, DiscoveryTopic } from './types';
import { getProgressiveGraphCatalog } from '@/website-runtime/progressiveRuntime';
const catalog = getProgressiveGraphCatalog();
export const topics = catalog.topics as Readonly<Record<string, DiscoveryTopic>>;
export const discoveryCards = catalog.discoveryCards as readonly DiscoveryCard[];
export const generatedDiscoveryCards = catalog.generatedDiscoveryCards as readonly DiscoveryCard[];
export function getDiscoveryCardsByAxis(axis: DiscoveryAxis) { return discoveryCards.filter(card => card.axis === axis); }
export function getTopicsByAxis(axis: DiscoveryAxis) { return catalog.metadataRows().filter(row => row.axis === axis).map(row => catalog.getTopic(row.id) as DiscoveryTopic); }
`);
  changed.push('data/seed.ts');
  edit('discover-graph/activeProvider.ts', [
    ["import type { DiscoveryAxis, DiscoveryCard, DiscoveryTopic, PassageNode } from '../data/types';", "import type { DiscoveryAxis, DiscoveryCard, DiscoveryTopic, PassageNode } from '../data/types';\nimport { getApprovedStartupBaseline } from '@/website-runtime/progressiveRuntime';"],
    ['new GraphRevisionStore(approvedBaseline(catalog, revisionId))', 'new GraphRevisionStore(getApprovedStartupBaseline(revisionId))'],
  ]);
  edit('dgr-runtime-02/runtime.ts', [
    ["import authorityJson from '../../assets/dgr/runtime-02/production-question-authority.json';", "import { getProgressiveDgr } from '@/website-runtime/progressiveRuntime';\nconst authorityJson = getProgressiveDgr().authority;"],
    ["import bundleJson from '../../assets/dgr/runtime-02/production-runtime-bundle.json';", 'const bundleJson = getProgressiveDgr().bundle;'],
    ["import lookupJson from '../../assets/dgr/runtime-02/runtime-question-lookup-manifest.json';", 'const lookupJson = getProgressiveDgr().lookup;'],
    ['const recordByQuestionId = new Map(bundle.questionRecords.map((record) => [record.contract.questionId, record]));', 'const recordByQuestionId = getProgressiveDgr().recordByQuestionId;'],
  ]);
  edit('scripture-tree/questionsTreeRuntime.ts', [
    ["import tree from '../../assets/scripture-tree/reader-v3.json';", "import { getProgressiveQuestionReader, getProgressiveDgr } from '@/website-runtime/progressiveRuntime';"],
    ["import bundle from '../../assets/dgr/runtime-02/production-runtime-bundle.json';", ''],
    ["import lookup from '../../assets/dgr/runtime-02/runtime-question-lookup-manifest.json';", ''],
    ["import coordinates from '../../assets/dgr/runtime-02/reading-investigation-binding.json';", ''],
    ["import authority from '../../assets/dgr/runtime-02/production-question-authority.json';", 'const authority = getProgressiveDgr().authority;'],
    ["import { createQuestionsTreeReader } from './questionsTreeReader.mjs';", ''],
    ['createQuestionsTreeReader({ tree, bundle, lookup, coordinates, authority })', 'getProgressiveQuestionReader()'],
  ]);
  edit('scripture-tree/readerGraphAdapter.ts', [
    ["import projectionJson from '../../assets/scripture-tree/reader-v3.json';", "import { getReadingMetadata } from '@/website-runtime/progressiveRuntime';"],
    ['const projection = projectionJson as typeof projectionJson;', ''],
    ['  const { projectionHash, ...payload } = projection;', '  const projection = getReadingMetadata().tree;\n  const { projectionHash, ...payload } = projection;'],
  ]);
  edit('scripture-tree/characterTrailTreeRuntime.ts', [
    ["import projection from '../../assets/scripture-tree/character-trail-v3.json';", "import { getProgressiveTree } from '@/website-runtime/progressiveRuntime';"],
    ["try { reader=createCharacterTrailProjection(projection,TRAIL_HASH); } catch { /* no legacy fallback */ }", "function acquiredReader() { return reader ??= createCharacterTrailProjection(getProgressiveTree().getTrail(),TRAIL_HASH); }"],
    ['const r=reader?.resolve(id,revision)', 'const r=acquiredReader().resolve(id,revision)'],
    ["const identity=tree.resolveTopic('CHARACTER',id);", "const identity=getProgressiveTree().identity('subject',id,`character:${id}`);"],
    ['const identity=tree.resolveScene(s.id);', "const identity=getProgressiveTree().identity('subject',id,`scene:${s.id}`);"],
    ['Boolean(reader?.resolve(id))', 'Boolean(acquiredReader().resolve(id))'],
    ['startupBytes:TRAIL_BYTES', 'startupBytes:0'],
    ['  if(accepted.has(id))return accepted.get(id);', "  getProgressiveTree().getTrail(); getProgressiveTree().getIndex('subject',id);\n  if(accepted.has(id))return accepted.get(id);"],
  ]);
  edit('app/discovery/[slug]/_layout.tsx', [
    ["import { Stack } from 'expo-router';", "import { Stack } from 'expo-router';\nimport { ProgressiveTopicBoundary } from '@/website-runtime/ProgressiveTopicBoundary';"],
    ['    <Stack\n', '    <ProgressiveTopicBoundary><Stack\n'],
    ['    </Stack>', '    </Stack></ProgressiveTopicBoundary>'],
  ]);
  edit('app/discovery/[slug]/index.tsx', [
    ["import { useEffect, type ReactElement } from 'react';", "import { useEffect, type ReactElement } from 'react';\nimport { ProgressiveTopicBoundary } from '@/website-runtime/ProgressiveTopicBoundary';"],
    ['export default function TopicScreen() {', 'export default function ProgressiveTopicScreen() {\n  return <ProgressiveTopicBoundary firstGlance><TopicScreen /></ProgressiveTopicBoundary>;\n}\nfunction TopicScreen() {'],
  ]);
  edit('app/discovery/[slug]/compare.tsx', [
    ["import { Stack, useLocalSearchParams } from 'expo-router';", "import { Stack, useLocalSearchParams } from 'expo-router';\nimport { ProgressiveCompareBoundary } from '@/website-runtime/ProgressiveCompareBoundary';"],
    ['export default function CompareScreen() {', 'export default function ProgressiveCompareScreen() { return <ProgressiveCompareBoundary><CompareScreen /></ProgressiveCompareBoundary>; }\nfunction CompareScreen() {'],
  ]);
  edit('app/discovery/[slug]/pivot.tsx', [
    ["import { router, Stack, useLocalSearchParams } from 'expo-router';", "import { router, Stack, useLocalSearchParams } from 'expo-router';\nimport { ProgressiveCompareBoundary } from '@/website-runtime/ProgressiveCompareBoundary';\nimport { acquirePivotLens } from '@/website-runtime/progressiveRuntime';"],
    ['export default function PivotScreen() {', 'export default function ProgressivePivotScreen() { return <ProgressiveCompareBoundary pivot><PivotScreen /></ProgressiveCompareBoundary>; }\nfunction PivotScreen() {'],
    ['  function selectLens(id: string) {\n    setLensId(id);', '  async function selectLens(id: string) {\n    await acquirePivotLens(topic.id, compare.id, id);\n    setLensId(id);'],
  ]);
  edit('reading-investigation/runtime.ts', [
    ["import bindingJson from '../../assets/dgr/runtime-02/reading-investigation-binding.json';", "import { getReadingMetadata } from '@/website-runtime/progressiveRuntime';"],
    ['const binding = bindingJson as typeof bindingJson & { coordinates: ReadingSceneCoordinate[] };', "const binding = new Proxy({} as { artifactHash: string; authorityHash: string; coordinates: ReadingSceneCoordinate[] }, { get: (_target, key) => getReadingMetadata().coordinates[key] });"],
    ['const readerTree = createReaderGraphAdapter(binding);', "let acceptedReaderTree: ReturnType<typeof createReaderGraphAdapter> | undefined;\nconst readerTree = new Proxy({} as ReturnType<typeof createReaderGraphAdapter>, { get: (_target, key) => {\n  acceptedReaderTree ??= createReaderGraphAdapter(binding);\n  return Reflect.get(acceptedReaderTree, key);\n} });"],
  ]);
  edit('app/discovery/[slug]/scene.tsx', [
    ["import { useCallback, useEffect, useMemo, useRef, useState } from 'react';", "import { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport { ProgressiveSceneBoundary } from '@/website-runtime/ProgressiveSceneBoundary';"],
    ['export default function SceneScreen() {', 'export default function ProgressiveSceneScreen() {\n  return <ProgressiveSceneBoundary><SceneScreen /></ProgressiveSceneBoundary>;\n}\n\nfunction SceneScreen() {'],
    ["import { getDgrCurrentScenePlace } from '@/dgr-production/runtime';", "import { getDgrCurrentScenePlace } from '@/website-runtime/sceneContextAccess';"],
  ]);
  const anchorPath = path.join(stage, 'src/c3/anchors/sceneMetadata.ts');
  const anchorSource = fs.readFileSync(anchorPath, 'utf8');
  const anchorAst = ts.createSourceFile(anchorPath, anchorSource, ts.ScriptTarget.Latest, true);
  const topicMetadataFunctions = anchorAst.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'topicMetadata');
  if (topicMetadataFunctions.length !== 1) throw Error('R2_SCENE_METADATA_OVERLAY_DRIFT');
  edit('c3/anchors/sceneMetadata.ts', [
    ["import { sceneAnchorMetadataLoaders } from '@/c3/anchors/scene-metadata.generated';", "import { sceneAnchorMetadata as readSceneAnchorMetadata } from '@/website-runtime/sceneContextAccess';"],
    ["import { getDgrReaderSceneContext } from '@/dgr-production/runtime';", "import { getDgrReaderSceneContext } from '@/website-runtime/sceneContextAccess';"],
    [topicMetadataFunctions[0].getText(anchorAst), ''],
    ['return topicMetadata(subjectId)?.scenes[sceneId];', 'return readSceneAnchorMetadata(subjectId, sceneId);'],
  ]);
  edit('components/QuestionUnitView.tsx', [
    ["import type { ReactElement } from 'react';", "import type { ReactElement, ComponentProps } from 'react';\nimport { ProgressiveEvidenceBoundary } from '@/website-runtime/ProgressiveEvidenceBoundary';"],
    ['export function QuestionUnitView({', 'export function QuestionUnitView(props: ComponentProps<typeof AcquiredQuestionUnitView>) {\n  return <ProgressiveEvidenceBoundary references={props.model.evidenceSections.map(item => item.reference)}><AcquiredQuestionUnitView {...props} /></ProgressiveEvidenceBoundary>;\n}\n\nfunction AcquiredQuestionUnitView({'],
  ]);
  edit('app/(tabs)/reading.tsx', [
    ["import { useEffect, useMemo, useRef, useState } from 'react';", "import { useEffect, useMemo, useRef, useState } from 'react';\nimport { useProgressiveReading } from '@/website-runtime/useProgressiveReading';"],
    ['const source = selection ? getScripture(`${selection.book.name} ${selection.chapter}`) : undefined;', 'const source = useProgressiveReading(selection ? `${selection.book.name} ${selection.chapter}` : undefined, originSlug, originSceneId);'],
    ['This chapter is unavailable in the local corpus.', 'Loading chapter…'],
  ]);
  edit('app/(tabs)/index.tsx', [
    ["import { searchDiscover, type DiscoverSearchResult } from '@/lib/discoverSearch';", "import { type DiscoverSearchResult } from '@/lib/discoverSearch';\nimport { useProgressiveDiscoverSearch } from '@/website-runtime/useProgressiveDiscoverSearch';"],
    ['const searchResponse = useMemo(() => searchDiscover(query), [query]);', 'const searchResponse = useProgressiveDiscoverSearch(query);'],
    ['results={searchResponse.results}', 'results={searchResponse?.results ?? []}\n        loading={!searchResponse}'],
    ['classification={searchResponse.classification}', 'classification={searchResponse?.classification}'],
    ["import { getContinuePositionLabel } from '@/lib/discovery';", "import { getProgressiveGraphCatalog, acquireTopicTree } from '@/website-runtime/progressiveRuntime';"],
    ['const { discoveryCards, topics } = graph;', 'const { discoveryCards } = graph;\n  const startupCatalog = getProgressiveGraphCatalog();'],
    ['const pack = topics[card.id]?.pack;', 'const pack = startupCatalog.metadata(card.id)?.pack;'],
    ['}), [live, topics]);', '}), [live, startupCatalog]);'],
    ['getContinuePositionLabel(topics[continueTrail.topicId] ?? topics.water, continueTrail.currentPassageId)', "(startupCatalog.metadata(continueTrail.topicId) ?? startupCatalog.metadata('water'))?.continuePositionLabels[continueTrail.currentPassageId ?? '']"],
    ["async function openTopic(slug: string) {\n    await replaceDiscoveryStack([{ screen: 'space', slug, label: topics[slug]?.title ?? slug }]);", "async function openTopic(slug: string) {\n    await startupCatalog.ensureTopic(slug);\n    await replaceDiscoveryStack([{ screen: 'space', slug, label: startupCatalog.metadata(slug)?.title ?? slug }]);"],
    ["topics[trail.topicId]?.axis === 'character'", "startupCatalog.metadata(trail.topicId)?.axis === 'character'"],
    ['    if (trail.currentPassageId) {', '    await startupCatalog.ensureTopic(trail.topicId);\n    if (trail.currentPassageId) {'],
    ['async function openContinue(trail: OpenTrail) {', 'async function openContinue(trail: OpenTrail) {\n    await acquireTopicTree(trail.topicId);'],
    ['    setSearchOpen(false);\n    if (result.domain', "    setSearchOpen(false);\n    if (result.subjectId && result.destination.route.startsWith('/discovery/')) await startupCatalog.ensureTopic(result.subjectId);\n    if (result.domain"],
    ['Boolean(topics[card.id]?.pack && newPackIds.has(topics[card.id].pack!.id))', "Boolean(startupCatalog.metadata(card.id)?.pack && newPackIds.has(startupCatalog.metadata(card.id)!.pack!.id))"],
  ]);
  edit('app/discover/[axis].tsx', [
    ["import { useActiveGraphSnapshot } from '@/discover-graph/useActiveGraph';", "import { useActiveGraphSnapshot } from '@/discover-graph/useActiveGraph';\nimport { getProgressiveGraphCatalog } from '@/website-runtime/progressiveRuntime';"],
    ['const topics = graph.topics;', 'const startupCatalog = getProgressiveGraphCatalog();'],
    ['const pack = topics[card.id]?.pack;', 'const pack = startupCatalog.metadata(card.id)?.pack;'],
    ['}), [live, topics]);', '}), [live, startupCatalog]);'],
    ["async function openCard(route: string, slug: string) {\n    await replaceDiscoveryStack([{ screen: 'space', slug, label: topics[slug]?.title ?? slug }]);", "async function openCard(route: string, slug: string) {\n    await startupCatalog.ensureTopic(slug);\n    await replaceDiscoveryStack([{ screen: 'space', slug, label: startupCatalog.metadata(slug)?.title ?? slug }]);"],
    ['Boolean(topics[card.id]?.pack && newPackIds.has(topics[card.id].pack!.id))', 'Boolean(startupCatalog.metadata(card.id)?.pack && newPackIds.has(startupCatalog.metadata(card.id)!.pack!.id))'],
  ]);
  edit('digital-altar/commander/GraphNativeLiveWorkspace.tsx', [
    ["import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';", "import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';\nimport { acquireScripture } from '@/website-runtime/progressiveRuntime';\nimport { acquireCommanderObject } from '@/website-runtime/acquireCommander';\nimport { useProgressiveScripture } from '@/website-runtime/useProgressiveScripture';"],
    ["if (nextReadiness.status === 'READY' && nextReadiness.projection?.citation) getScripture(nextReadiness.projection.citation);", "if (nextReadiness.status === 'READY' && nextReadiness.projection?.citation) void acquireScripture(nextReadiness.projection.citation).catch(() => setNotice('Scripture could not be loaded.'));"],
    ['function enter(object: GraphObjectRef, mode?: PresentationMode) {\n    const next = graphViewport(object, mode);', "async function enter(object: GraphObjectRef, mode?: PresentationMode) {\n    await acquireCommanderObject(object);\n    const next = graphViewport(object, mode);\n    if (next?.object) await acquireCommanderObject(next.object);"],
    ['function openContext(object: GraphObjectRef, event?: GestureResponderEvent) { setContextObject(object);', 'async function openContext(object: GraphObjectRef, event?: GestureResponderEvent) { await acquireCommanderObject(object); setContextObject(object);'],
    ['const source = sourceReference ? getScripture(sourceReference) : undefined;', "let source;\n    try { source = sourceReference ? await acquireScripture(sourceReference) : undefined; }\n    catch { setNotice('Scripture could not be loaded.'); return; }"],
    ['const source = getScripture(sourceReference);', 'const source = await acquireScripture(sourceReference);'],
    ['function selectVerse(book: CanonicalBookRecord, chapter: number, verse: number) {\n    const resolved', "async function selectVerse(book: CanonicalBookRecord, chapter: number, verse: number) {\n    const citation = `${book.name} ${chapter}:${verse}`;\n    await acquireCommanderObject({kind: 'SCRIPTURE', id: citation, label: citation, citation});\n    const resolved"],
    ['const source = book ? getScripture(`${book.name} ${chapter}`) : undefined;', 'const source = useProgressiveScripture(visible && book ? `${book.name} ${chapter}` : undefined);'],
  ]);
  edit('digital-altar/presenter/treeGraphResolver.ts', [[
    ".filter((ref) => ref.startsWith('compare:'))",
    ".filter((ref) => ref.startsWith('compare:') && compareIds.has(ref.split(':').slice(2).join(':')))",
  ]]);
  edit('app/digital-altar/commander.tsx', [
    ["type CommanderSurface =", "import { acquireCommanderProgram } from '@/website-runtime/acquireCommander';\ntype CommanderSurface ="],
    ['function startSelectedService(program: Program, confirmed = false) {', 'async function startSelectedService(program: Program, confirmed = false) {'],
    ['    setPreflightProgramId(program.programId);', '    await acquireCommanderProgram(program, state.blocks);\n    setPreflightProgramId(program.programId);'],
    ['function confirmPreflightStart() {', 'async function confirmPreflightStart() {'],
    ['    const result = preflightService(program, state.blocks, preflightResolver);', '    await acquireCommanderProgram(program, state.blocks);\n    const result = preflightService(program, state.blocks, preflightResolver);'],
  ]);
  edit('app/digital-altar/programs.tsx', [
    ["import { searchDiscover, type DiscoverSearchResult } from '@/lib/discoverSearch';", "import { searchDiscover, type DiscoverSearchResult } from '@/lib/discoverSearch';\nimport { acquireDiscoverSearch } from '@/website-runtime/progressiveRuntime';"],
    ['      const discoverRef = expectedDiscoverDomain(blockType)', '      if (expectedDiscoverDomain(blockType)) await acquireDiscoverSearch(referenceQuery);\n      const discoverRef = expectedDiscoverDomain(blockType)'],
    ['  function openDiscover(block: ProgramBlock) {', '  async function openDiscover(block: ProgramBlock) {'],
    ['    const destination = findReferenceDestination(block.discoverRef);', '    await acquireDiscoverSearch(block.discoverRef.canonicalReference ?? block.discoverRef.cachedLabel ?? block.discoverRef.id);\n    const destination = findReferenceDestination(block.discoverRef);'],
  ]);
  return changed;
}
