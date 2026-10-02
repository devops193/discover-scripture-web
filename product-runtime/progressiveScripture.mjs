/** Progressive implementation of the existing CanonicalCorpusReader contract.
 * Acquisition is explicit and asynchronous. Synchronous reads NEVER substitute
 * an empty/partial answer for missing packets (which would poison sourceCache).
 * This candidate is not selected by the public bootstrap until all consumers
 * have acquisition boundaries and the complete runtime passes cutover checks.
 */
export function createProgressiveScriptureReader({ revision, canonicalSourceHash, catalog, locator, transport }) {
  if (catalog.schema !== 'SDW_SCRIPTURE_CATALOG_V1' || catalog.revision !== revision || catalog.canonicalSourceHash !== canonicalSourceHash || locator.revision !== revision) throw Error('SDW_SCRIPTURE_BINDING');
  const books = catalog.books.map(row => Object.freeze({ id: row.id, usfmCode: row.usfm_code, osisCode: row.osis_code, name: row.name, shortName: row.short_name, canonicalOrder: row.canonical_order, section: row.section }));
  const byId = new Map(books.map(book => [book.id, book]));
  const aliases = new Map();
  for (const alias of catalog.aliases) {
    if (!byId.has(alias.book_id)) throw Error('SDW_SCRIPTURE_ALIAS');
    if (aliases.has(alias.normalized_alias) && aliases.get(alias.normalized_alias) !== alias.book_id) throw Error('SDW_SCRIPTURE_AMBIGUOUS_ALIAS');
    aliases.set(alias.normalized_alias, alias.book_id);
  }
  const chapters = new Map(), pending = new Map(), searches = new Map(), searchPending = new Map();
  let searchIndexPromise;
  function keysFor(bookId, ranges) {
    if (!byId.has(bookId) || !ranges.length) throw Error('SDW_SCRIPTURE_COORDINATES');
    for (const range of ranges) if (!Number.isSafeInteger(range.startChapter) || !Number.isSafeInteger(range.endChapter) || range.startChapter < 1 || range.endChapter < range.startChapter || range.endChapter > catalog.chapterCounts[bookId]) throw Error('SDW_SCRIPTURE_COORDINATES');
    // Preserve the existing SQL reader's bounding-chapter behavior. Verse
    // filtering/coverage/bridged and omitted records remain in canonical.ts.
    const start = Math.min(...ranges.map(r => r.startChapter)), end = Math.max(...ranges.map(r => r.endChapter));
    return Array.from({ length: end - start + 1 }, (_, i) => `${bookId}:${start + i}`);
  }
  async function ensureKey(key) {
    if (chapters.has(key)) return;
    if (pending.has(key)) return pending.get(key);
    const descriptor = locator.scripture[key];
    if (!descriptor) throw Error('SDW_SCRIPTURE_ADDRESS_UNAVAILABLE');
    const operation = (async () => {
      const packet = await transport.load(descriptor);
      if (packet.schema !== 'SDW_SCRIPTURE_CHAPTER_V1' || packet.revision !== revision || packet.canonicalSourceHash !== canonicalSourceHash || `${packet.bookId}:${packet.chapter}` !== key || !Array.isArray(packet.verses) || !packet.verses.length) throw Error('SDW_SCRIPTURE_PACKET_BINDING');
      let ordinal = 0;
      const rows = packet.verses.map(row => {
        if (row.book_id !== packet.bookId || row.chapter !== packet.chapter || row.translation_id !== 'engwebu' || !Number.isSafeInteger(row.verse_ordinal) || row.verse_ordinal <= ordinal || typeof row.text !== 'string') throw Error('SDW_SCRIPTURE_RECORD_BINDING');
        ordinal = row.verse_ordinal;
        return Object.freeze({ chapter: row.chapter, verseOrdinal: row.verse_ordinal, verseStart: row.verse_start, verseEnd: row.verse_end, verseLabel: row.verse_label, text: row.text, isOmitted: row.is_omitted === 1 });
      });
      chapters.set(key, Object.freeze(rows));
    })();
    pending.set(key, operation);
    try { await operation; } finally { pending.delete(key); }
  }
  const foldAscii = value => value.replace(/[A-Z]/g, letter => letter.toLowerCase());
  const searchKey = (query, limit) => JSON.stringify([query, limit]);
  async function ensureSearch(query, limit) {
    if (typeof query !== 'string' || query.length < 3 || !Number.isSafeInteger(limit) || limit < 1 || limit > 24) throw Error('SDW_SCRIPTURE_SEARCH_ARGUMENTS');
    const key = searchKey(query, limit);
    if (searches.has(key)) return;
    if (searchPending.has(key)) return searchPending.get(key);
    const operation = (async () => {
      if (!searchIndexPromise) searchIndexPromise = transport.load(catalog.searchIndex).then(index => {
        if (index.schema !== 'SDW_SCRIPTURE_SEARCH_INDEX_V1' || index.revision !== revision || index.canonicalSourceHash !== canonicalSourceHash || index.shards.length !== 256) throw Error('SDW_SEARCH_INDEX_BINDING');
        return index;
      }).catch(error => { searchIndexPromise = undefined; throw error; });
      const index = await searchIndexPromise;
      const text = foldAscii(query), grams = new Set(), buckets = new Map();
      for (let i = 0; i <= text.length - 3; i++) grams.add(text.slice(i, i + 3));
      for (const gram of grams) {
        let bucketId = 0;
        for (let i = 0; i < gram.length; i++) bucketId = (bucketId * 31 + gram.charCodeAt(i)) & 255;
        if (!buckets.has(bucketId)) buckets.set(bucketId, []);
        buckets.get(bucketId).push(gram);
      }
      let candidates;
      for (const [bucketId, terms] of buckets) {
        const shard = await transport.load(index.shards[bucketId]);
        if (shard.schema !== 'SDW_SCRIPTURE_SEARCH_SHARD_V1' || shard.revision !== revision || shard.canonicalSourceHash !== canonicalSourceHash || shard.bucketId !== bucketId) throw Error('SDW_SEARCH_SHARD_BINDING');
        for (const gram of terms) {
          const postings = new Set(shard.postings[gram] ?? []);
          candidates = candidates === undefined ? postings : new Set([...candidates].filter(id => postings.has(id)));
        }
        if (!candidates.size) break;
      }
      const hits = [];
      for (const id of [...candidates].sort((a, b) => a - b)) {
        const chapterKey = index.chapters[id];
        if (!chapterKey || !locator.scripture[chapterKey]) throw Error('SDW_SEARCH_CHAPTER_BINDING');
        await ensureKey(chapterKey);
        const book = byId.get(chapterKey.slice(0, chapterKey.lastIndexOf(':')));
        for (const verse of chapters.get(chapterKey)) {
          if (verse.isOmitted || !foldAscii(verse.text).includes(text)) continue;
          hits.push(Object.freeze({ bookId: book.id, bookName: book.name, usfmCode: book.usfmCode, canonicalOrder: book.canonicalOrder, ...verse }));
          if (hits.length === limit) break;
        }
        if (hits.length === limit) break;
      }
      searches.set(key, Object.freeze(hits));
    })();
    searchPending.set(key, operation);
    try { await operation; } finally { searchPending.delete(key); }
  }
  const reader = Object.freeze({
    findBook: alias => byId.get(aliases.get(alias)),
    listBooks: () => [...books],
    chapterCount: id => catalog.chapterCounts[id] ?? 0,
    metadata: key => catalog.metadata[key],
    readVerses(bookId, ranges) {
      const keys = keysFor(bookId, ranges);
      if (keys.some(key => !chapters.has(key))) throw Error('SDW_SCRIPTURE_ACQUISITION_REQUIRED');
      return keys.flatMap(key => chapters.get(key));
    },
    searchVerses(query, limit) {
      const hits = searches.get(searchKey(query, limit));
      if (!hits) throw Error('SDW_SEARCH_ACQUISITION_REQUIRED');
      return [...hits];
    },
  });
  return Object.freeze({ reader, ensureSearch, ensureRanges: (bookId, ranges) => Promise.all(keysFor(bookId, ranges).map(ensureKey)).then(() => undefined), diagnostics: () => ({ revision, hydratedChapters: [...chapters.keys()], inFlight: pending.size, completedSearches: searches.size }) });
}
