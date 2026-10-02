import { parseScriptureReference, resolveCanonicalBook } from '@/data/scripture/canonical';
import { smartPresenterTreeRuntime as runtime } from '@/scripture-tree/smartPresenterTreeRuntime';
import { getDgrRuntimeChannel } from '@/dgr/runtime';
import type { GraphObjectRef } from '@/digital-altar/commander/liveGraph';
import type { Program, ProgramBlock } from '@/digital-altar/programs';
import { acquireTreeMetadata, acquireReadingMetadata, acquireGovernedOwner, acquireScripture, getProgressiveTree, getProgressiveDgr } from './progressiveRuntime';

/** Acquire the existing Commander's selected context before synchronous projection.
 * No alternate semantic resolver, topic scan, or full bundle is installed. */
export async function acquireCommanderObject(object: GraphObjectRef) {
  await Promise.all([acquireTreeMetadata(), acquireReadingMetadata()]);
  const tree = getProgressiveTree(), manifest = tree.metadata.manifest;
  const owner = (ref: string) => ref.startsWith('scene:')
    ? runtime.ownerForScene(ref.slice(6)) : /^(compare|dissect):/.test(ref) ? ref.split(':')[1] : manifest.contextOwners[ref]
      ?? (ref.match(/^(character|event|concept):/) ? ref.split(':').slice(1).join(':') : undefined);
  async function record(ref: string, family = 'presenter'): Promise<any> {
    const subject = owner(ref);
    return subject ? tree.ensureRecord('subject', subject, family, ref) : undefined;
  }
  async function scriptureDisplay(citation: string) {
    const source = await acquireScripture(citation);
    const parsed = parseScriptureReference(citation), book = parsed && resolveCanonicalBook(parsed.bookAlias);
    if (book && parsed) await Promise.all([...new Set([citation, source?.reference,
      `${book.name} ${parsed.ranges[0].startChapter}`].filter(Boolean))].map(reference =>
      tree.ensureRecord('book', book.id, 'related', `scripture:${reference}`)));
  }
  async function sceneDisplay(ref: string) {
    const row = await record(ref);
    if (row?.displayIdentity.citation) await scriptureDisplay(row.displayIdentity.citation);
    return row;
  }
  let sceneRef: string | undefined;
  const objectRef = `${object.kind.toLowerCase()}:${object.id}`;
  if (object.kind === 'SCRIPTURE') {
    const citation = object.citation ?? object.label;
    await scriptureDisplay(citation);
    sceneRef = runtime.resolveContainingSceneRef(citation);
  } else {
    await Promise.all(['presenter', 'capability', 'related'].map(family => record(objectRef, family)));
    sceneRef = object.kind === 'SCENE' ? objectRef : object.sceneId ? `scene:${object.sceneId}` : undefined;
  }
  if (!sceneRef) {
    if (['CHARACTER', 'EVENT', 'CONCEPT'].includes(object.kind)) {
      const topic = await record(objectRef);
      // The existing context presents this selected topic's Scene cards.
      await Promise.all((topic?.sceneRefs ?? []).map(sceneDisplay));
    }
    return;
  }
  const scene = await sceneDisplay(sceneRef);
  if (!scene) return;
  const subject = owner(sceneRef)!;
  const topic = await record(scene.ownerRef);
  await Promise.all([
    record(sceneRef, 'capability'), record(sceneRef, 'related'),
    record(scene.ownerRef, 'capability'),
    getProgressiveDgr().ensureScene(sceneRef.slice(6), subject),
    ...[...new Set([...runtime.resolveContextEdgeRefs(sceneRef.slice(6)),
      ...Object.values(scene.adjacentSceneRefs ?? {})] as string[])].map(sceneDisplay),
  ]);
  const analyses = await Promise.all((scene.analysisRefs ?? []).map((ref: string) => record(ref, 'analysis')));
  const compareIds = new Set(analyses.flatMap(row => row?.payload?.compareIds ?? []));
  await Promise.all((topic?.analysisRefs ?? []).filter((ref: string) => ref.startsWith('compare:')
    && compareIds.has(ref.split(':').slice(2).join(':'))).map((ref: string) => record(ref, 'analysis')));
  if (getDgrRuntimeChannel() !== 'shadow') await acquireGovernedOwner('dgrOwned', subject);
  const dgr = runtime.resolveDgrContext(sceneRef.slice(6));
  if (dgr.status === 'OK') {
    const context = dgr.context as any;
    const people = [...context?.participants ?? [], context?.speech?.speaker, context?.speech?.audience].filter(Boolean);
    await Promise.all(people.map(person => record(`${person.kind.toLowerCase()}:${person.id}`)));
  }
  for (const question of runtime.questionForScene(subject, sceneRef.slice(6))) {
    await Promise.all([`question:${question.contract.questionId}`, ...question.findings.map(f => `finding:${f.findingId}`)]
      .flatMap(ref => ['presenter', 'capability', 'related'].map(family => record(ref, family))));
  }
}

export async function acquireCommanderProgram(program: Program | undefined, blocks: readonly ProgramBlock[]) {
  if (!program) return;
  for (const id of program.blockIds) {
    const ref = blocks.find(block => block.blockId === id)?.discoverRef;
    if (ref && ['SCRIPTURE', 'CHARACTER', 'SCENE', 'EVENT', 'CONCEPT'].includes(ref.kind))
      await acquireCommanderObject({ kind: ref.kind as GraphObjectRef['kind'], id: ref.id,
        label: ref.cachedLabel ?? ref.id, citation: ref.canonicalReference });
  }
}
