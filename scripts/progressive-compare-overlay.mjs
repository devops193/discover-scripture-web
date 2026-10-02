import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
export function applyProgressiveCompareOverlay(stage) {
  const file = path.join(stage, 'src/scripture-tree/ordinaryCompareRuntime.ts');
  let source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports = ast.statements.filter(node => ts.isImportDeclaration(node) && /assets\/|presenterBundleLoaders.generated/.test(node.moduleSpecifier.text));
  if (imports.length !== 5) throw Error('R2_COMPARE_IMPORT_DRIFT');
  for (const node of imports.reverse()) source = source.slice(0, node.getStart(ast)) + source.slice(node.end);
  function replace(before, after) { if (source.split(before).length !== 2) throw Error(`R2_COMPARE_OVERLAY_DRIFT:${before}`); source = source.replace(before, after); }
  const currentAst = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const reader = currentAst.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(currentAst) === 'reader'));
  if (!reader) throw Error('R2_COMPARE_READER_DRIFT');
  replace(reader.getText(currentAst), `const reader=createCompareAccess(metadataJson,COMPARE_BINDING_HASH,(ref:string)=>{
    counters.recordsOpened++;
    return ref.startsWith('pivot:') ? pivotsJson[ref] : getProgressiveTree().getRecord('subject',ref.split(':')[1],'analysis',ref);
  });`);
  const loaderText = fs.readFileSync(path.join(stage, 'src/scripture-tree/presenterBundleLoaders.generated.ts'), 'utf8');
  const pin = /PRESENTER_BUNDLE_MANIFEST_HASH = "([a-f0-9]{64})"/.exec(loaderText)?.[1];
  if (!pin) throw Error('R2_COMPARE_PRESENTER_PIN');
  replace('const metadata=metadataJson as unknown as', `function createAcquiredCompareRuntime() {
const metadataJson=getProgressiveCompare().metadata, pivotsJson=getProgressiveCompare().pivots;
const bundle=getProgressiveTree().metadata.manifest, authority=getProgressiveDgr().authority;
const PRESENTER_BUNDLE_MANIFEST_HASH=${JSON.stringify(pin)};
const metadata=metadataJson as unknown as`);
  replace("if(hash(pivotsJson)!==metadataJson.pivotsHash)throw new Error('COMPARE_TREE_PIVOTS');", 'getProgressiveCompare().verifyPivots(metadataJson.pivotsHash);');
  replace('const sceneOwners=new Map<string,string>();', 'const sceneOwners=new Map<string,string>(getProgressiveTree().metadata.dgr.sceneOwners.map((row:any)=>[row.contextRef,`${metadata.topics[row.subjectId].axis}:${row.subjectId}`]));');
  replace('bytesDecoded:COMPARE_BINDING_BYTES+COMPARE_PIVOT_BYTES', 'bytesDecoded:0');
  replace('export const ordinaryCompareRuntime=Object.freeze({', 'return Object.freeze({');
  replace('startupImportBytes:COMPARE_BINDING_BYTES+COMPARE_PIVOT_BYTES', 'startupImportBytes:0');
  source = "import { getProgressiveCompare, getProgressiveTree, getProgressiveDgr } from '@/website-runtime/progressiveRuntime';\n" + source + `
}
let accepted: ReturnType<typeof createAcquiredCompareRuntime> | undefined;
export const ordinaryCompareRuntime = new Proxy({} as ReturnType<typeof createAcquiredCompareRuntime>, {
  get(_target,key) {
    if(key==='revisionId') return 'bundled-approved';
    if(key==='diagnostics' && !accepted) return () => ({startupImportBytes:0,bytesDecoded:0,recordsOpened:0,compareSourceGraphReads:0,compareTopicScans:0,compareAnalysisFamilyScans:0,compareRawCorpusScans:0,compareLegacyFallbackReads:0});
    accepted ??= createAcquiredCompareRuntime(); return Reflect.get(accepted,key);
  },
});
`;
  fs.writeFileSync(file, source);
  const accessFile = path.join(stage, 'src/scripture-tree/compareAccess.mjs');
  let access = fs.readFileSync(accessFile, 'utf8');
  const before = "  if(metadata.revisionId!=='bundled-approved' || metadata.schema!=='COMPARE_TREE_V3_BINDINGS_V1'\n    || metadata.semanticHash!==expectedHash || hash(without(metadata,'semanticHash'))!==expectedHash) fail('metadata');";
  if (access.split(before).length !== 2) throw Error('R2_COMPARE_ACCESS_DRIFT');
  access = "import { getProgressiveCompare } from '@/website-runtime/progressiveRuntime';\n" + access.replace(before,
    "  getProgressiveCompare().verifyMetadata(metadata, expectedHash);\n  if(metadata.revisionId!=='bundled-approved' || metadata.schema!=='COMPARE_TREE_V3_BINDINGS_V1' || metadata.semanticHash!==expectedHash) fail('metadata');");
  fs.writeFileSync(accessFile, access);
  return ['scripture-tree/ordinaryCompareRuntime.ts', 'scripture-tree/compareAccess.mjs'];
}
