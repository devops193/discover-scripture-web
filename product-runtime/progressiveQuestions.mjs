import { portableHashValue as hash } from '@/scripture-tree/portableRuntimeServices.mjs';
import { QUESTIONS_SOURCE_PINS } from '@/scripture-tree/questionsTreeReader.mjs';

const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && new Set(a).size === a.length
  && new Set(b).size === b.length && a.length === b.length && a.every(id => b.includes(id));
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

/** Transport projection of the five exact native source pins. The compiler
 * executes the complete native validator before emission. Metadata keeps its
 * original pins; selected DGR bodies additionally match their full-record hash.
 * No semantic body is fabricated to satisfy a synchronous consumer. */
export function createProgressiveQuestions({ revision, metadata, dgr }) {
  const fail = () => { throw Error('SDW_QUESTIONS_TREE_INTEGRITY'); };
  if (metadata.schema !== 'SDW_READING_METADATA_V1' || metadata.revision !== revision
    || hash(metadata.sourcePins) !== hash(QUESTIONS_SOURCE_PINS)) fail();
  const { tree, coordinates, questionRecordHashes } = metadata;
  for (const [key, source] of Object.entries({ tree, coordinates, lookup: dgr.lookup, authority: dgr.authority }))
    if (hash(source) !== QUESTIONS_SOURCE_PINS[key]) fail();
  if (tree.revisionId !== 'bundled-approved' || tree.source.dgrAuthorityHash !== dgr.authority.authorityHash
    || dgr.bundle.authorityHash !== dgr.authority.authorityHash || tree.source.readingBindingHash !== coordinates.artifactHash
    || Object.keys(questionRecordHashes).length !== 184) fail();
  freeze(metadata);
  const byScene = new Map(dgr.lookup.records.map(row => [row.sceneId, row]));
  for (const row of byScene.values()) if (!sameSet(tree.sceneQuestionRefs[`scene:${row.sceneId}`], row.questionIds)
    || row.questionIds.some(id => !Object.hasOwn(questionRecordHashes, id))) fail();
  const validated = new WeakSet();
  const counters = { lookups: 0, recordsOpened: 0, segmentsOpened: 0, sourceGraphReads: 0,
    topicScans: 0, familyWideSearches: 0, rawCorpusScans: 0, legacyFallbackReads: 0 };
  function get(id, subjectId, sceneId, requestedRevision = 'bundled-approved') {
    counters.lookups++;
    if (requestedRevision !== 'bundled-approved') return undefined;
    // Known-but-unacquired records throw; they must never become an empty result.
    const record = dgr.recordByQuestionId.get(id);
    if (!record || record.contract.subjectId !== subjectId || record.contract.sceneId !== sceneId) return undefined;
    if (!validated.has(record)) {
      const { contract, findings } = record;
      const ref = `scene:${contract.sceneId}`, coordinate = coordinates.coordinates[tree.sceneFirstCoordinateIndex[ref]];
      if (hash(record) !== questionRecordHashes[id] || coordinate?.sceneId !== sceneId || coordinate?.subjectId !== subjectId
        || !tree.sceneQuestionRefs[ref]?.includes(id) || !sameSet(tree.questionFindingRefs[id], findings.map(f => f.findingId))
        || !findings.every(f => f.parentQuestionId === id && f.originatingSceneId === sceneId
          && sameSet(tree.findingEvidenceRefs[f.findingId], f.evidenceRefIds)
          && sameSet(f.evidenceRefIds, f.evidence.map(e => e.refId)))) fail();
      validated.add(record);
    }
    counters.recordsOpened++; return record;
  }
  return Object.freeze({ valid: true, revisionId: 'bundled-approved', get,
    list({ sceneId, subjectId, mode, revision = 'bundled-approved' }) {
      counters.lookups++;
      if (revision !== 'bundled-approved' || !['TOPIC', 'READING_DISCOVER', 'PINNED'].includes(mode)) return [];
      const row = byScene.get(sceneId);
      if (!row || mode === 'TOPIC' && row.subjectId !== subjectId) return [];
      return row.questionIds.map(id => get(id, row.subjectId, sceneId, revision));
    }, diagnostics: () => ({ ...counters, startupImportBytes: 0, duplicatedArtifactBytes: 0 }),
  });
}
