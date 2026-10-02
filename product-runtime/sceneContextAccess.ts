import type { AskAnchor } from '@/c3/contracts';
import { getProgressiveSceneContexts } from './progressiveRuntime';

export function sceneAnchorMetadata(subjectId: string, sceneId: string) {
  return getProgressiveSceneContexts().read(subjectId, sceneId)?.anchorMetadata;
}
export function getDgrReaderSceneContext(subjectId: string, sceneId: string) {
  return getProgressiveSceneContexts().read(subjectId, sceneId)?.readerContext ?? undefined;
}
export function getDgrCurrentScenePlace(anchor: AskAnchor) {
  const context = anchor.dgrReaderSceneContext, lineage = anchor.dgrSceneLineage;
  if (!context || !lineage || !anchor.subjectId || !anchor.sceneId) return undefined;
  if (context.anchorId !== anchor.dgrAnchorId || context.currentSceneId !== anchor.sceneId || lineage.currentSceneId !== anchor.sceneId) return undefined;
  const packet = getProgressiveSceneContexts().read(anchor.subjectId, anchor.sceneId);
  const accepted = packet?.readerContext;
  if (!accepted || accepted.context.anchorId !== context.anchorId || accepted.context.contextHash !== context.contextHash
    || accepted.lineage.lineageHash !== lineage.lineageHash) return undefined;
  // The original relation/evidence selector produced this exact immutable label
  // at build time; its complete inputs are bound by the revision's source hash.
  return packet.currentPlace ?? undefined;
}
