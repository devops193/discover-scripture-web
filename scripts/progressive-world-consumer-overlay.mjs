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
    ["import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';", "import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';\nimport { ProgressiveWorldBoundary } from '@/website-runtime/ProgressiveWorldBoundary';\nimport { acquireScene } from '@/website-runtime/progressiveRuntime';"],
    ["  const [menuVisible, setMenuVisible] = useState(false);", "  const [menuVisible, setMenuVisible] = useState(false);\n  const [acquisitionError, setAcquisitionError] = useState<Error>();\n  if (acquisitionError) throw acquisitionError;"],
    ["  const openScene = (item: PassageNode) => open({ kind: 'SCENE', id: item.id });", "  const openScene = (item: PassageNode) => {\n    void acquireScene(topic.id, item.id).then(\n      () => open({ kind: 'SCENE', id: item.id }),\n      (error) => setAcquisitionError(error instanceof Error ? error : Error(String(error))),\n    );\n  };"],
    ["    if (item.destinationType === 'SCENE') open({ kind: 'SCENE', id: item.destinationRef.id });", "    if (item.destinationType === 'SCENE') {\n      const target = projection.scenes.find((scene) => scene.id === item.destinationRef.id);\n      if (target) openScene(target);\n    }"],
  ]);
  return changed;
}
