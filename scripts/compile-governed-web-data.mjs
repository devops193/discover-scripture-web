// Transport-only prototype. Never writes native authorities or publishes assets.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { brotliCompressSync, constants } from 'node:zlib';
import ts from 'typescript';
import vm from 'node:vm';
const source=path.resolve('../ScriptureDiscovery');
const output=path.resolve('.product-build-transport');
fs.mkdirSync(output,{recursive:true});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=new Map();
function asset(value) {
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
  const sha256=digest(bytes), file=`${sha256}.json`;
  const descriptor={file,sha256,bytes:bytes.length,brotliBytes:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:8}}).length};
  if(!assets.has(sha256))fs.writeFileSync(path.join(output,file),bytes);
  assets.set(sha256,descriptor);
  return descriptor;
}
const databaseFile=path.join(source,'assets/scripture/engwebu.db');
const authoritySha256=digest(fs.readFileSync(databaseFile));
const db=new DatabaseSync(databaseFile,{readOnly:true});
const books=db.prepare('SELECT * FROM books ORDER BY canonical_order').all();
const aliases=db.prepare('SELECT * FROM aliases ORDER BY normalized_alias').all();
const metadata=db.prepare('SELECT * FROM corpus_metadata ORDER BY key').all();
const chapterQuery=db.prepare('SELECT * FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse_ordinal');
const roots=[]; let verseCount=0,chapterCount=0;
for(const book of books) {
  const chapters=[];
  for(const {chapter} of db.prepare('SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter').all(book.id)) {
    const verses=chapterQuery.all(book.id,chapter);
    const payload={schema:'WEBU_CHAPTER_TRANSPORT_V1',authoritySha256,bookId:book.id,chapter,verses};
    const descriptor=asset(payload);
    // Exhaustive exact value/order proof, including omitted rows and source_line.
    assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(path.join(output,descriptor.file))).verses),JSON.stringify(verses));
    chapters.push({chapter,verseRecordCount:verses.length,...descriptor});
    verseCount+=verses.length;chapterCount++;
  }
  roots.push({book,chapterCount:chapters.length,...asset({schema:'WEBU_BOOK_TRANSPORT_V1',authoritySha256,book,chapters})});
}
const root=asset({schema:'WEBU_TRANSPORT_ROOT_V1',authoritySha256,metadata,aliases,books:roots});
assert.equal(books.length,81);assert.equal(verseCount,38058);
db.close();
assert.equal(digest(fs.readFileSync(databaseFile)),authoritySha256);

// Existing approved JSON packages retain their exact bytes and embedded hashes.
// This is packaging, not recompilation of DGR/Tree content or new approval.
const composition=JSON.parse(fs.readFileSync('docs/01b-evidence/shared-chunk-composition-before.json'));
const graph=[];
for(const row of composition.modules) {
  const relative=row.source.replace(/^\/\.\.\/\.\.\/ScriptureDiscovery\//,'');
  if(!relative.startsWith('assets/')||!relative.endsWith('.json'))continue;
  const bytes=fs.readFileSync(path.join(source,relative));
  const descriptor=asset(bytes);
  assert.equal(digest(fs.readFileSync(path.join(output,descriptor.file))),digest(bytes));
  graph.push({source:relative,...descriptor});
}
function generatedData(relative) {
  const exports={};
  const input=fs.readFileSync(path.join(source,relative),'utf8');
  const javascript=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  // No require, filesystem, network, or application runtime is exposed.
  vm.runInNewContext(javascript,{exports},{timeout:10000});
  return exports;
}
const promoted=generatedData('src/data/canonical-promoted.generated.ts').approvedCanonicalContent;
const subjects=promoted.map(record=>({subjectId:record.subjectId,semanticHash:record.semanticHash,card:record.card,...asset(record)}));
assert.equal(JSON.stringify(subjects.map(row=>JSON.parse(fs.readFileSync(path.join(output,row.file))))),JSON.stringify(promoted));
const search=generatedData('src/data/discover-search-index.generated.ts');
const searchIndex=asset({indexHash:search.DISCOVER_SEARCH_INDEX_HASH,records:search.discoverSearchRecords});
const manifest={schema:'WEBSITE_GOVERNED_TRANSPORT_CANDIDATE_V1',productionActive:false,authoritySha256,root,graph,subjects,searchIndex};
const manifestAsset=asset(manifest);
const genesis=roots.find(r=>r.book.usfm_code==='GEN');
const chapter12=JSON.parse(fs.readFileSync(path.join(output,genesis.file))).chapters.find(c=>c.chapter===12);
const receipt={status:'TRANSPORT_ARTIFACT_EQUIVALENCE_PASS_RUNTIME_BINDING_PENDING',productionActive:false,output,manifest:manifestAsset,canonicalDatabaseSha256:authoritySha256,bookCount:books.length,chapterCount,verseCount,exactVerseValueAndOrderEquivalence:'PASS',graphPackageCount:graph.length,graphExactByteEquivalence:'PASS',subjectCount:subjects.length,subjectValueAndOrderEquivalence:'PASS',searchRecordCount:search.discoverSearchRecords.length,searchIndex,deduplicatedAssetCount:assets.size,rootBytes:root.bytes,rootBrotliBytes:root.brotliBytes,genesis12:{root,book:genesis,chapter:chapter12},coldRootBookChapterBrotliBytes:root.brotliBytes+genesis.brotliBytes+chapter12.brotliBytes,networkMeasurements:'NOT_RUNTIME_MEASUREMENTS',nativeSourceMutated:false};
fs.writeFileSync('docs/01b-evidence/transport-candidate.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({...receipt,genesis12:undefined},null,2));
