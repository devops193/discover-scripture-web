import { createWorldKernel } from '@/worlds/worldKernel.mjs';
import { createCharacterWorldViewModel } from '@/worlds/characterWorldViewModel.mjs';
import { createWorldTreeAdapter } from '@/worlds/worldTreeAdapter';
import { getScripture, parseScriptureReference, resolveCanonicalBook } from '@/data/scripture/canonical';
import { acquireWorldRoot, acquireWorldDescriptors, getVerifiedWorldRoots, getWorldObject, acquireWorldStoredObject,
  acquireTopicTree, acquireScene, acquireTreeMetadata, getProgressiveTree, acquireReadingMetadata, getProgressiveDgr, acquireScripture, acquireCompare } from './progressiveRuntime';
import { recordIdentity } from './runtimeEvidence';

let kernel: ReturnType<typeof createWorldKernel> | undefined;
let adapter: ReturnType<typeof createWorldTreeAdapter> | undefined;
const samples: Array<{ event: string; milliseconds: number }> = [];
export function measureWorld<T>(event: string, operation: () => T): T {
  const start = performance.now();
  try { return operation(); } finally { samples.push({ event, milliseconds: performance.now() - start }); if (samples.length > 512) samples.shift(); }
}
export function openCharacterWorld(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw Error('WORLD_ROOT_NOT_ACTIVE');
  const { roots, expectedHash } = getVerifiedWorldRoots();
  // Missing compact proof throws. Only the async route boundary acquires it.
  roots.root(`character:${slug}`);
  if (!kernel) {
    adapter = createWorldTreeAdapter(getWorldObject);
    const base = adapter;
    kernel = createWorldKernel({ verifiedRoots: roots, expectedHash, adapter: { ...base,
      read(descriptor: any) { return descriptor.kind === 'ACTIVITY' ? getWorldObject(descriptor.ref) : base.read(descriptor); },
    } });
    recordIdentity('worldKernel', kernel);
  }
  return measureWorld('World route open', () => createCharacterWorldViewModel(kernel!, `character:${slug}`));
}
export async function acquireWorldFocus(rootRef: string, ref: string) {
  const { handle } = await acquireWorldRoot(rootRef);
  const { descriptor: d, links } = await handle.ensureReference(ref);
  const id = ref.slice(ref.indexOf(':') + 1);
  switch (d.kind) {
    case 'CHARACTER': case 'EVENT': case 'CONCEPT': await acquireTopicTree(id); break;
    case 'SCENE': await acquireScene(d.subjectId ?? rootRef.slice(10), id); break;
    case 'TRAIL': await acquireTopicTree(d.subjectId); break;
    case 'SCRIPTURE': if (!await acquireScripture(d.citation)) throw Error('SDW_WORLD_SCRIPTURE_MISSING'); break;
    case 'QUESTION': case 'FINDING': case 'EVIDENCE':
      await Promise.all([acquireReadingMetadata(), getProgressiveDgr().ensureQuestion(d.questionId)]); break;
    case 'RELATIONSHIP': case 'ACTIVITY': await acquireWorldStoredObject(ref, d.targetHash); break;
    case 'COMPARE':
      await acquireCompare(d.subjectId, ref.split(':').slice(2).join(':')); break;
    case 'RELATED_SCRIPTURE': {
      await acquireTreeMetadata();
      if (d.contextRef.startsWith('scripture:')) {
        const parsed = parseScriptureReference(d.contextRef.slice(10));
        const book = parsed && resolveCanonicalBook(parsed.bookAlias);
        if (!book) throw Error('SDW_WORLD_RELATED_SCRIPTURE_CONTEXT');
        await getProgressiveTree().ensureRecord('book', book.id, 'related', d.contextRef);
      } else await getProgressiveTree().ensureRecord('subject', d.subjectId ?? rootRef.slice(10), 'related', d.contextRef);
      break;
    }
    default: throw Error(`SDW_WORLD_UNSUPPORTED_DESCRIPTOR:${d.kind}`);
  }
  // The unchanged adapter/kernel determines meaning and verifies targetHash.
  openCharacterWorld(rootRef.slice(10));
  const focus: any = d.kind === 'ACTIVITY' ? getWorldObject(ref) : adapter!.read(d);
  if (!focus) throw Error('SDW_WORLD_FOCUS_UNAVAILABLE');
  const citation = focus.displayIdentity?.citation ?? focus.citation ?? (d.kind === 'SCRIPTURE' ? focus.reference : undefined);
  const citations = d.kind === 'COMPARE' ? [focus.payload.leftReference, focus.payload.rightReference] : citation ? [citation] : [];
  await Promise.all(citations.map(async (reference: string) => {
    if (!await acquireScripture(reference)) throw Error('SDW_WORLD_FOCUS_SCRIPTURE_MISSING');
    await handle.ensureReference(`scripture:${reference}`);
  }));
  await acquireWorldDescriptors(rootRef, links ?? []);
  return d;
}
export function characterWorldDiagnostics() {
  return { samples: [...samples], kernel: kernel?.diagnostics(), aggregateRootHydration: false,
    accounting: 'Immutable packet bytes are recorded by the shared transport and browser request ledger' };
}
