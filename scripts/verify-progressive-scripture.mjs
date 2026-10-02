import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createProgressiveScriptureReader } from '../product-runtime/progressiveScripture.mjs';
const projection = JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
const read = descriptor => {
  const bytes = fs.readFileSync(path.join(projection.output, `${descriptor.sha256}.json`));
  assert.equal(bytes.length, descriptor.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
  return JSON.parse(bytes);
};
const catalog = read(projection.scriptureCatalog), locator = read(projection.locator), requested = [];
const config = { revision: projection.revision, canonicalSourceHash: projection.canonicalSourceHash, catalog, locator };
const progressive = createProgressiveScriptureReader({ ...config, transport: { load: async d => { requested.push(d.sha256); return read(d); } } });
const db = new DatabaseSync('../ScriptureDiscovery/assets/scripture/engwebu.db', { readOnly: true });
const sqlReader = {
  ...progressive.reader,
  readVerses(bookId, ranges) {
    return db.prepare('SELECT * FROM verses WHERE book_id=? AND chapter BETWEEN ? AND ? ORDER BY chapter,verse_ordinal').all(bookId, Math.min(...ranges.map(r => r.startChapter)), Math.max(...ranges.map(r => r.endChapter))).map(row => ({ chapter: row.chapter, verseOrdinal: row.verse_ordinal, verseStart: row.verse_start, verseEnd: row.verse_end, verseLabel: row.verse_label, text: row.text, isOmitted: row.is_omitted === 1 }));
  },
};
// Execute the actual canonical resolver, including its reference parser, coverage,
// omitted/bridged record handling, Source Reveal identity and source cache.
const source = fs.readFileSync('../ScriptureDiscovery/src/data/scripture/canonical.ts', 'utf8');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
  module, exports: module.exports,
  require: name => { assert.equal(name, '../../discover-graph/phase0Trace'); return { phase0Measure: (_s, _e, fn) => fn(), phase0HasActiveTrace: () => false, phase0TouchScripture: () => {}, phase0Count: () => {} }; },
});
const canonical = module.exports;
const plain = value => JSON.parse(JSON.stringify(value));
assert.equal(progressive.reader.listBooks().length, 81);
for (const alias of catalog.aliases) assert.equal(progressive.reader.findBook(alias.normalized_alias).id, alias.book_id);
for (const book of catalog.books) assert.equal(progressive.reader.chapterCount(book.id), db.prepare('SELECT MAX(chapter) AS n FROM verses WHERE book_id=?').get(book.id).n);
for (const row of db.prepare('SELECT * FROM corpus_metadata').all()) assert.equal(progressive.reader.metadata(row.key), row.value);
const range22 = [{ startChapter: 22, endChapter: 22 }];
assert.throws(() => progressive.reader.readVerses('engwebu:gen', range22), /ACQUISITION_REQUIRED/);
assert.equal(requested.length, 0);
await Promise.all(Array.from({ length: 12 }, () => progressive.ensureRanges('engwebu:gen', range22)));
assert.deepEqual(requested, [projection.genesis22.sha256]);
assert.deepEqual(progressive.diagnostics().hydratedChapters, ['engwebu:gen:22']);
canonical.installCanonicalCorpusReader(progressive.reader);
assert.throws(() => canonical.getScripture('Genesis 23'), /ACQUISITION_REQUIRED/);
await progressive.ensureRanges('engwebu:gen', [{ startChapter: 23, endChapter: 23 }]);
assert.ok(canonical.getScripture('Genesis 23')); // Missing read did not cache null.
const references = ['Genesis 22', 'Genesis 22:1-4', 'Genesis 22:1,3-5', 'Genesis 22:20-23:4', 'Genesis 21;23', '1 Maccabees 2:50-52', '1 Peter 3:1-6'];
for (const row of db.prepare('SELECT book_id,chapter,verse_label FROM verses WHERE is_omitted=1 OR verse_end>verse_start').all()) {
  const book = progressive.reader.listBooks().find(b => b.id === row.book_id);
  references.push(`${book.name} ${row.chapter}:${row.verse_label}`);
}
for (const reference of references) {
  canonical.installCanonicalCorpusReader(sqlReader);
  const expected = canonical.getScripture(reference);
  assert.ok(expected, `Expected canonical source: ${reference}`);
  const parsed = canonical.parseScriptureReference(reference);
  const book = canonical.resolveCanonicalBook(parsed.bookAlias);
  await progressive.ensureRanges(book.id, plain(parsed.ranges));
  canonical.installCanonicalCorpusReader(progressive.reader);
  assert.deepEqual(plain(canonical.getScripture(reference)), plain(expected), reference);
}
// Exhaustive row comparison is test-only: the application never loops the canon.
let rows = 0;
for (const [bookId, count] of Object.entries(catalog.chapterCounts)) for (let chapter = 1; chapter <= count; chapter++) {
  const ranges = [{ startChapter: chapter, endChapter: chapter }];
  await progressive.ensureRanges(bookId, ranges);
  const actual = progressive.reader.readVerses(bookId, ranges);
  assert.deepEqual(actual, sqlReader.readVerses(bookId, ranges)); rows += actual.length;
}
assert.equal(rows, 38058); assert.equal(new Set(requested).size, 1402); assert.equal(requested.length, 1402);
const wrong = createProgressiveScriptureReader({ ...config, transport: { load: async () => read(projection.genesis23) } });
await assert.rejects(wrong.ensureRanges('engwebu:gen', range22), /PACKET_BINDING/);
assert.equal(wrong.diagnostics().hydratedChapters.length, 0);
await assert.rejects(async () => progressive.ensureRanges('engwebu:gen', [{ startChapter: 0, endChapter: 1 }]), /COORDINATES/);
assert.throws(() => progressive.reader.searchVerses('Abraham', 12), /SEARCH_ACQUISITION_REQUIRED/);
const searchCases = ['Abraham', 'ABRAHAM', 'the', 'God created', 'JESUS', 'Holy Spirit', "don't", 'Melchizedek', 'Peter', 'Maccabe', 'heaven and earth', 'AéZ', '\u2019', 'unlikely-no-matching-scripture'];
// Include real non-ASCII substrings without changing SQLite's ASCII-only fold.
for (const row of db.prepare('SELECT text FROM verses WHERE is_omitted=0').all()) {
  const match = row.text.match(/.{1}[^\x00-\x7F].{1}/);
  if (match && !searchCases.includes(match[0])) searchCases.push(match[0]);
  if (searchCases.length >= 35) break;
}
const searched = createProgressiveScriptureReader({ ...config, transport: { load: async d => read(d) } });
for (const query of searchCases.filter(query => query.length >= 3)) for (const limit of [1, 12, 24]) {
  await searched.ensureSearch(query, limit);
  const expected = db.prepare('SELECT v.*, b.name AS book_name, b.usfm_code, b.canonical_order FROM verses v JOIN books b ON b.id=v.book_id WHERE v.is_omitted=0 AND instr(lower(v.text),lower(?))>0 ORDER BY b.canonical_order,v.chapter,v.verse_ordinal LIMIT ?').all(query, limit).map(row => ({ bookId: row.book_id, bookName: row.book_name, usfmCode: row.usfm_code, canonicalOrder: row.canonical_order, chapter: row.chapter, verseOrdinal: row.verse_ordinal, verseStart: row.verse_start, verseEnd: row.verse_end, verseLabel: row.verse_label, text: row.text, isOmitted: false }));
  assert.deepEqual(searched.reader.searchVerses(query, limit), expected, `${query}:${limit}`);
}
db.close();
const report = { status: 'PASS', scope: 'CANONICAL_READER_ADAPTER_NOT_PRODUCT_ACCEPTANCE', revision: projection.revision, books: 81, chapters: 1402, verseRecords: rows, actualCanonicalResolverExecuted: true, canonicalSourceEquivalence: 'PASS', referenceCases: references.length, omittedAndBridgedRecords: 'PASS', coldGenesis22ChapterRequests: 1, chapter22OnlyAtFirstRead: true, concurrentAcquisitionSingleFlight: 'PASS', missingReadDoesNotPoisonSourceCache: 'PASS', wrongAddressRejected: true, exactSearchEquivalence: 'PASS', searchCases: searched.diagnostics().completedSearches, searchUsesExistingCanonicalOrderAndAsciiFold: true, asyncConsumerBoundaries: 'PENDING_PUBLIC_CUTOVER_BLOCKER', productionActive: false };
fs.writeFileSync('docs/01b-evidence/r2-progressive-scripture.json', JSON.stringify(report, null, 2)+'\n'); console.log(report);
