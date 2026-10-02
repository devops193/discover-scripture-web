import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Preserve the production resolver's algorithms. Only its immutable input seam
// and initialization timing change in the website-owned staging copy.
export function applyProgressivePresenterOverlay(stage) {
  const file = path.join(stage, 'src/scripture-tree/smartPresenterTreeRuntime.ts');
  let source = fs.readFileSync(file, 'utf8');
  const loaders = fs.readFileSync(path.join(stage, 'src/scripture-tree/presenterBundleLoaders.generated.ts'), 'utf8');
  const pin = loaders.match(/PRESENTER_BUNDLE_MANIFEST_HASH\s*=\s*['"]([^'"]+)['"]/);
  if (!pin) throw Error('R2_PRESENTER_MANIFEST_PIN_MISSING');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const removals = ast.statements.filter(node => ts.isImportDeclaration(node)
    && /presenter-v3\/|presenterBundleLoaders.generated/.test(node.moduleSpecifier.text));
  if (removals.length !== 4) throw Error('R2_PRESENTER_IMPORT_DRIFT');
  for (const node of [...removals].reverse()) source = source.slice(0, node.getStart(ast)) + source.slice(node.end);
  function replace(before, after) {
    if (source.split(before).length !== 2) throw Error(`R2_PRESENTER_OVERLAY_DRIFT:${before}`);
    source = source.replace(before, after);
  }
  const functionsAst = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const segment = functionsAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'segment');
  if (!segment) throw Error('R2_PRESENTER_SEGMENT_DRIFT');
  replace(segment.getText(functionsAst), '');
  replace('const manifest = manifestJson as unknown as Manifest;', `function createAcquiredPresenterRuntime() {
const store = getProgressiveTree();
const { manifest: manifestJson, citation: citationJson, dgr: dgrJson } = store.metadata;
const PRESENTER_BUNDLE_MANIFEST_HASH = ${JSON.stringify(pin[1])};
const manifest = manifestJson as unknown as Manifest;`);
  replace('export function presenterRuntimeDiagnostics() { return { ...counters, startupImportBytes: PRESENTER_STARTUP_IMPORT_BYTES }; }',
    'function diagnostics() { return { ...counters, startupImportBytes: 0, ...store.diagnostics() }; }');
  replace('let rows: Map<Family, Map<string, SignedRecord>>;', "let kind: 'book' | 'subject';\n  let owner: string;");
  replace("rows = segment('book', book.id);", "kind = 'book'; owner = book.id;");
  replace("if (!id || !presenterSubjectLoaders[id]) return undefined;\n    rows = segment('subject', id);",
    "if (!id || !descriptions.has(`subject:${id}`)) return undefined;\n    kind = 'subject'; owner = id;");
  replace('const row = rows.get(family)?.get(ref);', 'const row = store.getRecord(kind, owner, family, ref) as SignedRecord | undefined;');
  replace('export const smartPresenterTreeRuntime = Object.freeze({', 'const runtime = Object.freeze({');
  // Expose the original containing-Scene identity calculation before its body
  // lookup. Acquisition uses this exact algorithm, not a competing resolver.
  replace('  resolveContainingScene(reference: string): PresenterRow | undefined {',
    `  resolveContainingScene(reference: string): PresenterRow | undefined {
    const ref = this.resolveContainingSceneRef(reference);
    return ref ? lookup('presenter', ref) as PresenterRow | undefined : undefined;
  },
  resolveContainingSceneRef(reference: string): string | undefined {`);
  replace("return matches.size === 1 ? lookup('presenter', [...matches][0]) as PresenterRow | undefined : undefined;",
    'return matches.size === 1 ? [...matches][0] : undefined;');
  replace('export class TreePresenterContentReader', `return { runtime, diagnostics };
}
let acquired: ReturnType<typeof createAcquiredPresenterRuntime> | undefined;
function accepted() { return acquired ??= createAcquiredPresenterRuntime(); }
export function presenterRuntimeDiagnostics() {
  return acquired?.diagnostics() ?? { startupImportBytes: 0, objectsOpened: 0, segmentOpens: 0,
    sourceGraphReads: 0, topicScans: 0, familyWideSearches: 0, rawCorpusScans: 0, legacyFallbackReads: 0, bytesDecoded: 0 };
}
export const smartPresenterTreeRuntime = new Proxy({} as ReturnType<typeof createAcquiredPresenterRuntime>['runtime'], {
  get(_target, key) { return key === 'revisionId' ? 'bundled-approved' : Reflect.get(accepted().runtime, key); },
});

export class TreePresenterContentReader`);
  source = "import { getProgressiveTree } from '@/website-runtime/progressiveRuntime';\n" + source;
  fs.writeFileSync(file, source);
  return 'scripture-tree/smartPresenterTreeRuntime.ts';
}
