import fs from 'node:fs';
import path from 'node:path';

/** Website-only input seam authorized by R2A §5. Movement, ownership, target
 * hashes, issued-state checks, canonical reveal and Return stay unmodified. */
export function applyProgressiveWorldKernelOverlay(stage) {
  const file = path.join(stage, 'src/worlds/worldKernel.mjs');
  let source = fs.readFileSync(file, 'utf8');
  for (const [before, after] of [
    ['export function createWorldKernel({ roots, expectedHash, adapter }) {', 'export function createWorldKernel({ roots, expectedHash, adapter, verifiedRoots }) {'],
    ["  if (hash(roots) !== expectedHash) fail('ROOT_INDEX_HASH');\n  freezeWorld(roots);", "  if (verifiedRoots) { if (!isVerifiedWorldRoots(verifiedRoots)) fail('ROOT_PROJECTION_PROVENANCE'); verifiedRoots.assertAuthority(expectedHash); }\n  else { if (hash(roots) !== expectedHash) fail('ROOT_INDEX_HASH'); freezeWorld(roots); }"],
    ['const r = Object.hasOwn(roots, ref) ? roots[ref] : undefined;', 'const r = verifiedRoots ? verifiedRoots.root(ref) : Object.hasOwn(roots, ref) ? roots[ref] : undefined;'],
    ['(!validatedRoots.has(r) && hash(unsigned(r)) !== r.semanticHash)', '(!validatedRoots.has(r) && (verifiedRoots ? !verifiedRoots.verifyRoot(r) : hash(unsigned(r)) !== r.semanticHash))'],
  ]) {
    if (source.split(before).length !== 2) throw Error(`R2_WORLD_KERNEL_OVERLAY_DRIFT:${before}`);
    source = source.replace(before, after);
  }
  fs.writeFileSync(file, "import { isVerifiedWorldRoots } from '@/website-runtime/verifiedWorldRoots.mjs';\n" + source); return 'worlds/worldKernel.mjs';
}
