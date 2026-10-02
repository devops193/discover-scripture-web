// Reverify only projections affected by the final integration delta.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
const source=path.resolve('../ScriptureDiscovery'),build=JSON.parse(fs.readFileSync('docs/01b-evidence/r2-private-export.json'));
const proof=JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const read=d=>{const b=fs.readFileSync(path.join(proof.output,`${d.sha256}.json`));assert.equal(b.length,d.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),d.sha256);return JSON.parse(b);};
const manifest=read(proof.manifest),owners=read(manifest.ownerMetadata),search=read(owners.families.discoverSearch.owners.index.packet);
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(source,'src/data/discover-search-index.generated.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
assert.deepEqual(search.value,JSON.parse(JSON.stringify(module.exports.discoverSearchRecords)));
assert.equal(owners.families.discoverSearch.manifest.indexHash,module.exports.DISCOVER_SEARCH_INDEX_HASH);
assert.equal(fs.readFileSync(path.join(build.stage,'src/lib/discoverSearch.ts'),'utf8'),fs.readFileSync(path.join(source,'src/lib/discoverSearch.ts'),'utf8'));
const nativePresenter=fs.readFileSync(path.join(source,'src/scripture-tree/smartPresenterTreeRuntime.ts'),'utf8');
const stagedPresenter=fs.readFileSync(path.join(build.stage,'src/scripture-tree/smartPresenterTreeRuntime.ts'),'utf8');
const body=(text,start)=>text.slice(text.indexOf(start)+start.length,text.indexOf('\n  ownerForScene',text.indexOf(start))).trim();
const original=body(nativePresenter,'resolveContainingScene(reference: string): PresenterRow | undefined {');
const projected=body(stagedPresenter,'resolveContainingSceneRef(reference: string): string | undefined {');
assert.equal(projected,original.replace("lookup('presenter', [...matches][0]) as PresenterRow | undefined",'[...matches][0]'));
const treeManifest=JSON.parse(fs.readFileSync(path.join(source,'assets/scripture-tree/presenter-v3/manifest.json')));
let sceneCount=0,compareCount=0;
for(const descriptor of treeManifest.packages.filter(p=>p.kind==='subject')){
 const segment=JSON.parse(fs.readFileSync(path.join(source,'assets/scripture-tree/presenter-v3',path.basename(descriptor.file))));
 const analyses=new Map(segment.analysis.map(row=>[row.ref,row]));
 for(const row of segment.analysis.filter(row=>row.ref.startsWith('compare:'))){assert.equal(row.ref.split(':').slice(2).join(':'),row.payload.id);compareCount++;}
 const topic=segment.presenter.find(row=>row.ref===`${segment.presenter.find(r=>r.ownerRef)?.ownerRef}`)??segment.presenter.find(row=>/^(character|event|concept):/.test(row.ref));
 for(const scene of segment.presenter.filter(row=>row.ref.startsWith('scene:'))){
  const ids=new Set((scene.analysisRefs??[]).flatMap(ref=>analyses.get(ref)?.payload.compareIds??[]));
  const refs=(topic?.analysisRefs??[]).filter(ref=>ref.startsWith('compare:'));
  const old=refs.map(ref=>analyses.get(ref)).filter(row=>row&&ids.has(row.payload.id));
  const next=refs.filter(ref=>ids.has(ref.split(':').slice(2).join(':'))).map(ref=>analyses.get(ref)).filter(row=>row&&ids.has(row.payload.id));
  assert.deepEqual(next,old);sceneCount++;
 }
}
assert.equal(compareCount,1510);assert.equal(sceneCount,4640);
for(const relative of ['src/dgr-runtime-02/source-language.ts','src/lib/discoverSearch.ts'])
 assert.deepEqual(fs.readFileSync(path.join(build.stage,relative)),fs.readFileSync(path.join(source,relative)));
const report={status:'PASS',revision:proof.revision,searchRows:search.value.length,searchRowAndOrderEquivalence:'PASS',searchSemanticResolverChanged:false,
 containingSceneIdentityAlgorithm:'EXACT_ORIGINAL',commanderCompareSelectionEquivalence:{scenes:sceneCount,compares:compareCount,mismatches:0},sourceLanguageModuleChanged:false,
 reusedEvidence:['r2-progressive-scripture.json','r2-compare-owner-equivalence.json','r2a-contradiction-attachments.json','r2a-projected-world-kernel.json']};
fs.writeFileSync('docs/01b-evidence/r2a-closure-delta.json',JSON.stringify(report,null,2)+'\n');console.log(report);
