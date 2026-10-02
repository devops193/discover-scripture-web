import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
export function applyProgressiveContradictionOverlay(stage) {
  const relative = 'data/contradictions/index.ts', file = path.join(stage, 'src', relative);
  let source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const removed = ast.statements.filter(node => ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly
    || ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ['approvalPreview', 'stagedRecord', 'generatedRecords', 'contradictions'].includes(d.name.getText(ast)))
    || ts.isFunctionDeclaration(node) && node.name?.text === 'getContradictionsForPassage');
  if (removed.length !== 8) throw Error('R2_CONTRADICTION_SOURCE_DRIFT');
  for (const node of removed.reverse()) source = source.slice(0, node.getStart(ast)) + source.slice(node.end);
  const before = 'return contradictions.find((contradiction) => contradiction.id === id);';
  if (source.split(before).length !== 2) throw Error('R2_CONTRADICTION_LOOKUP_DRIFT');
  source = source.replace(before, 'return getProgressiveContradictions().read(id);');
  const predicateSignature = 'export function isContradictionAttached(\n  contradiction: ContradictionSpec,';
  if (source.split(predicateSignature).length !== 2) throw Error('R2_CONTRADICTION_PREDICATE_DRIFT');
  source = source.replace(predicateSignature, "export function isContradictionAttached(\n  contradiction: Pick<ContradictionSpec, 'anchors'>,");
  // The sole list consumer migrates to this explicitly metadata-only contract.
  // No bulk record API, record facade, or listing-time record reads remain.
  source = `import { getProgressiveContradictions } from '@/website-runtime/progressiveRuntime';
export type ContradictionAttachment = Pick<ContradictionSpec, 'id' | 'title' | 'classification' | 'anchors'> & { references: string[] };
export function getContradictionAttachmentsForPassage(topicId: string, passageId: string): ContradictionAttachment[] {
  return getProgressiveContradictions().rows().filter((row: ContradictionAttachment) =>
    isContradictionAttached(row, topicId, passageId));
}
` + source;
  fs.writeFileSync(file, source);
  return [relative];
}
