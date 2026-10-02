/** One persistent verified packet cache; no semantic inference or network answers. */
export function createPacketCache({ revision, baseUrl, cacheStorage = globalThis.caches, fetchResource = fetch }) {
  if (!/^[a-f0-9]{64}$/.test(revision)) throw Error('SDW_INVALID_REVISION');
  const base = new URL(baseUrl);
  if (!['https:', 'http:'].includes(base.protocol)) throw Error('SDW_INVALID_ORIGIN');
  const pending = new Map();
  const counts = { cacheHits: 0, networkMisses: 0, networkBytesDecoded: 0, integrityFailures: 0 };
  const cache = cacheStorage.open(`sdw-packets-v1-${revision}`);
  function descriptorUrl(d) {
    if (!d || d.revision !== revision || !/^[a-f0-9]{64}$/.test(d.sha256) || !Number.isSafeInteger(d.bytes) || d.bytes < 1) throw Error('SDW_INVALID_PACKET_DESCRIPTOR');
    const url = new URL(d.url, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash || !url.pathname.endsWith(`/${d.sha256}.json`)) throw Error('SDW_INVALID_PACKET_URL');
    return url.href;
  }
  async function verify(response, descriptor) {
    if (!response.ok) throw Error(`SDW_PACKET_HTTP_${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== descriptor.bytes || digest !== descriptor.sha256) {
      counts.integrityFailures++; throw Error('SDW_PACKET_INTEGRITY');
    }
    return { bytes, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  }
  async function load(descriptor) {
    const url = descriptorUrl(descriptor);
    // Include size as well as revision/hash: inconsistent descriptors must not
    // borrow an in-flight success validated against different expectations.
    const key = `${url}|${descriptor.bytes}`;
    if (pending.has(key)) return pending.get(key);
    const operation = (async () => {
      const store = await cache;
      const existing = await store.match(url);
      if (existing) {
        try { const result = await verify(existing, descriptor); counts.cacheHits++; return result.value; }
        catch (error) { await store.delete(url); throw error; }
      }
      counts.networkMisses++;
      const result = await verify(await fetchResource(url, { cache: 'default', credentials: 'same-origin' }), descriptor);
      // Persist only verified bytes, without inherited Content-Encoding headers:
      // fetch has already decoded HTTP compression.
      await store.put(url, new Response(result.bytes, { headers: { 'Content-Type': 'application/json' } }));
      counts.networkBytesDecoded += result.bytes.byteLength;
      return result.value;
    })();
    pending.set(key, operation);
    try { return await operation; } finally { pending.delete(key); }
  }
  return Object.freeze({ load, diagnostics: () => ({ revision, ...counts, inFlight: pending.size }) });
}
