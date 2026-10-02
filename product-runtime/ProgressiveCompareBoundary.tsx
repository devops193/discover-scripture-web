import { useEffect, useState, type ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { compareRouteMode } from '@/scripture-tree/compareAccess.mjs';
import { acquireCompare, acquirePivotLens, acquireContradictionRoute } from './progressiveRuntime';
export function ProgressiveCompareBoundary({ children, pivot = false }: { children: ReactNode; pivot?: boolean }) {
  const params = useLocalSearchParams<{ slug: string; compare?: string; contradiction?: string; lens?: string; passage?: string }>();
  const mode = compareRouteMode(params);
  const key = JSON.stringify([mode, params.slug, params.compare, params.contradiction, params.passage, params.lens, pivot]);
  const [result, setResult] = useState<{ key: string; error?: Error }>();
  useEffect(() => {
    if (mode === 'INVALID') return;
    let active = true;
    const pending = mode === 'CONTRADICTION' ? acquireContradictionRoute(params.slug, params.contradiction!, params.passage)
      : pivot ? acquirePivotLens(params.slug, params.compare, params.lens) : acquireCompare(params.slug, params.compare);
    void pending.then(() => { if (active) setResult({ key }); }, error => {
      if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) });
    });
    return () => { active = false; };
  }, [key]);
  // Dispatch remains governed by the original object-type discriminator.
  if (mode === 'INVALID') return children;
  if (result?.key === key) { if (result.error) throw result.error; return children; }
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading comparison"><Text>Loading comparison…</Text></View>;
}
