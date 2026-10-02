/** R2A's accepted compact Root proof replaces aggregate materialization, not
 * authority. No caller can register an arbitrary root or bless a fake hash. */
const issuedStores = new WeakSet();
export const isVerifiedWorldRoots = value => issuedStores.has(value);
export function createVerifiedWorldRoots({ worldProjection, expectedHash, hashValue }) {
  const roots = new Map(), proofs = new WeakMap(), pending = new Map();
  const fail = () => { throw Error('SDW_WORLD_ROOT_PROJECTION_REQUIRED'); };
  async function ensure(ref) {
    if (roots.has(ref)) return roots.get(ref);
    if (pending.has(ref)) return pending.get(ref);
    const operation = (async () => {
      const handle = await worldProjection.open(ref), proof = handle.projection;
      if (proof.acceptedRootIndexHash !== expectedHash) fail();
      const { projectionHash, ...unsigned } = proof;
      if (hashValue(unsigned) !== projectionHash) fail();
      const curatedDiscoveryReferences = await handle.ensureCurated();
      const references = {}, links = {};
      for (const dependency of proof.orderedDependencyRefs) Object.defineProperty(references, dependency, {
        enumerable: true, get: () => handle.readReference(dependency).descriptor,
      });
      for (const dependency of proof.linkedDependencyRefs) {
        if (!Object.hasOwn(proof.dependencies, dependency)) fail();
        Object.defineProperty(links, dependency, { enumerable: true, get: () => handle.readReference(dependency).links });
      }
      const branches = Object.freeze(Object.fromEntries(Object.entries(proof.branches).map(([name, branch]) => {
        const { count, ...original } = branch; return [name, Object.freeze(original)];
      })));
      const root = Object.freeze({ ...proof.identity, references: Object.freeze(references), links: Object.freeze(links), branches, curatedDiscoveryReferences });
      proofs.set(root, proof); roots.set(ref, { root, handle }); return roots.get(ref);
    })();
    pending.set(ref, operation);
    try { return await operation; } finally { pending.delete(ref); }
  }
  const store = Object.freeze({ ensure,
    assertAuthority(hash) { if (hash !== expectedHash) fail(); },
    root(ref) { if (!roots.has(ref)) fail(); return roots.get(ref).root; },
    verifyRoot(root) {
      const proof = proofs.get(root);
      return Boolean(proof && proof.identity.ref === root.ref && proof.identity.semanticHash === root.semanticHash
        && proof.acceptedRootIndexHash === expectedHash && hashValue(root.binding) === hashValue(proof.identity.binding));
    },
  });
  issuedStores.add(store); return store;
}
