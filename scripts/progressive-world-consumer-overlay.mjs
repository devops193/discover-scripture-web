import fs from 'node:fs';
import path from 'node:path';
import { applyProgressiveWorldKernelOverlay } from './progressive-world-kernel-overlay.mjs';
export function applyProgressiveWorldConsumerOverlay(stage) {
  const changed = [applyProgressiveWorldKernelOverlay(stage)];
  const edit = (relative, transforms) => {
    const file = path.join(stage, 'src', relative); let source = fs.readFileSync(file, 'utf8');
    for (const [before, after] of transforms) {
      if (source.split(before).length !== 2) throw Error(`R2_WORLD_CONSUMER_OVERLAY_DRIFT:${relative}:${before}`);
      source = source.replace(before, after);
    }
    fs.writeFileSync(file, source); changed.push(relative);
  };
  fs.writeFileSync(path.join(stage, 'src/worlds/characterWorldRuntime.ts'), "export { openCharacterWorld, measureWorld, characterWorldDiagnostics } from '@/website-runtime/progressiveWorldRuntime';\n");
  changed.push('worlds/characterWorldRuntime.ts');
  edit('worlds/worldTreeAdapter.ts', [
    ["import manifest from '../../assets/scripture-tree/presenter-v3/manifest.json';", "import { getProgressiveTree, getProgressiveDgr } from '@/website-runtime/progressiveRuntime';"],
    ["import authority from '../../assets/dgr/runtime-02/production-question-authority.json';", ''],
    ['  const binding = Object.freeze({ revision: tree.revisionId,', '  const manifest = getProgressiveTree().metadata.manifest, authority = getProgressiveDgr().authority;\n  const binding = Object.freeze({ revision: tree.revisionId,'],
  ]);
  edit('worlds/CharacterWorldScreen.tsx', [
    ["import { useMemo, useState, type ReactNode } from 'react';", "import { useMemo, useState, type ReactNode } from 'react';\nimport { ProgressiveWorldBoundary, useWorldDescriptors } from '@/website-runtime/ProgressiveWorldBoundary';\nimport { acquireWorldFocus } from '@/website-runtime/progressiveWorldRuntime';"],
    ['  return <View>{refs.slice(page * 12, page * 12 + 12).map', '  const ready = useWorldDescriptors(root.ref, refs.slice(page * 12, page * 12 + 12));\n  return !ready ? <Text accessibilityRole="progressbar">Loading references…</Text> : <View>{refs.slice(page * 12, page * 12 + 12).map'],
    ['  return <ScrollView>{refs.slice(page * 12, page * 12 + 12).map', '  const ready = useWorldDescriptors(root.ref, refs.slice(page * 12, page * 12 + 12));\n  return !ready ? <Text accessibilityRole="progressbar">Loading branch references…</Text> : <ScrollView>{refs.slice(page * 12, page * 12 + 12).map'],
    ['export function CharacterWorldScreen({ slug }: { slug: string }) {', 'export function CharacterWorldScreen({ slug }: { slug: string }) {\n  return <ProgressiveWorldBoundary slug={slug}><AcquiredCharacterWorldScreen slug={slug} /></ProgressiveWorldBoundary>;\n}\nfunction AcquiredCharacterWorldScreen({ slug }: { slug: string }) {'],
    ['    try { const model = openCharacterWorld(slug); return { model, initial: model.begin() }; }\n    catch { return undefined; }', '    const model = openCharacterWorld(slug); return { model, initial: model.begin() };'],
    ["  const [error, setError] = useState('');", "  const [error, setError] = useState('');\n  const [acquisitionError, setAcquisitionError] = useState<Error>();\n  if (acquisitionError) throw acquisitionError;"],
    ['  const traverse = (ref: string) => {', "  const prepare = async (ref: string, action: () => void) => {\n    try { await acquireWorldFocus(root.ref, ref); action(); }\n    catch (error) { setAcquisitionError(error instanceof Error ? error : Error(String(error))); }\n  };\n  const traverse = (ref: string) => {\n    void prepare(ref, () => {"],
    ["    run(event, () => model.traverse(state, ref));\n  };", "    run(event, () => model.traverse(state, ref));\n    });\n  };"],
    ["      run(event, () => model.openBranchRef(state, ref));", "      void prepare(ref, () => run(event, () => model.openBranchRef(state, ref)));"],
  ]);
  return changed;
}
