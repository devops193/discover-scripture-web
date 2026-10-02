/** Transport only. Not installed into the production Scripture reader yet. */
export function createImmutableTransport({ root, authoritySha256, baseUrl, fetchResource = fetch }) {
  const pending = new Map();
  const counters = { requests:0, decodedBytes:0, chapterLoads:0 };
  const fail = message => { throw Error(`GOVERNED_TRANSPORT_INTEGRITY: ${message}`); };
  async function load(descriptor) {
    if (!descriptor || !/^[a-f0-9]{64}$/.test(descriptor.sha256)
      || descriptor.file !== `${descriptor.sha256}.json`
      || !Number.isSafeInteger(descriptor.bytes) || descriptor.bytes < 1) fail('invalid descriptor');
    const key = descriptor.sha256;
    if (pending.has(key)) return pending.get(key);
    const request = (async () => {
      counters.requests++;
      const response = await fetchResource(new URL(descriptor.file, baseUrl).href, {cache:'default'});
      if (!response.ok) fail(`HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== descriptor.bytes) fail('byte length mismatch');
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n=>n.toString(16).padStart(2,'0')).join('');
      if (digest !== key) fail('hash mismatch');
      const value = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      counters.decodedBytes += bytes.byteLength;
      return value;
    })();
    pending.set(key,request);
    try { return await request; } catch(error) { pending.delete(key); throw error; }
  }
  function bound(value,schema) {
    if (value.schema !== schema || value.authoritySha256 !== authoritySha256) fail('schema/authority mismatch');
    return value;
  }
  const getRoot = async () => bound(await load(root),'WEBU_TRANSPORT_ROOT_V1');
  async function getBook(bookId) {
    const catalog = await getRoot();
    const descriptor = catalog.books.find(row=>row.book.id===bookId);
    if (!descriptor) fail('unknown Book root');
    const book = bound(await load(descriptor),'WEBU_BOOK_TRANSPORT_V1');
    if (book.book.id !== bookId) fail('Book identity mismatch');
    return book;
  }
  async function getChapter(bookId,chapter) {
    if (!Number.isSafeInteger(chapter)||chapter<1) fail('invalid Chapter identity');
    const book = await getBook(bookId);
    const descriptor = book.chapters.find(row=>row.chapter===chapter);
    if (!descriptor) fail('unknown Chapter');
    const value = bound(await load(descriptor),'WEBU_CHAPTER_TRANSPORT_V1');
    if (value.bookId !== bookId || value.chapter !== chapter
      || value.verses.length !== descriptor.verseRecordCount
      || value.verses.some(row=>row.book_id!==bookId||row.chapter!==chapter)) fail('Chapter identity/count mismatch');
    counters.chapterLoads++;
    return value;
  }
  return Object.freeze({load,getRoot,getBook,getChapter,diagnostics:()=>({...counters,cachedResources:pending.size})});
}
