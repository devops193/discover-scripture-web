const identities = new Map<string, object>();
const counts: Record<string, number> = {};
const engineId = globalThis.crypto.randomUUID();
export function recordIdentity(name: string, value: object) {
  if (identities.get(name) !== value) {
    identities.set(name, value);
    counts[name] = (counts[name] ?? 0) + 1;
  }
}
export function recordBoot(name: string) { counts[name] = (counts[name] ?? 0) + 1; }
export function runtimeEvidence() { return { engineId, counts: { ...counts } }; }
// Read-only diagnostics: no storage, routing, authentication or content mutation.
Object.defineProperty(globalThis, '__scriptureRuntimeEvidence', { value: runtimeEvidence });
