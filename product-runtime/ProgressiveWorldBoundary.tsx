import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { acquireWorldRoot, acquireWorldDescriptors } from './progressiveRuntime';

export function useWorldDescriptors(rootRef: string, refs: readonly string[]) {
  const key = JSON.stringify([rootRef, refs]);
  const [result, setResult] = useState<{ key: string; error?: Error }>();
  useEffect(() => {
    let active = true;
    void acquireWorldDescriptors(rootRef, refs).then(() => { if (active) setResult({ key }); }, error => {
      if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) });
    });
    return () => { active = false; };
  }, [key]);
  if (result?.key === key && result.error) throw result.error;
  return result?.key === key;
}
export function ProgressiveWorldBoundary({ slug, children }: { slug: string; children: ReactNode }) {
  const [result, setResult] = useState<{ slug: string; error?: Error }>();
  useEffect(() => {
    let active = true;
    void acquireWorldRoot(`character:${slug}`).then(() => { if (active) setResult({ slug }); }, error => {
      if (active) setResult({ slug, error: error instanceof Error ? error : Error(String(error)) });
    });
    return () => { active = false; };
  }, [slug]);
  if (result?.slug === slug) { if (result.error) throw result.error; return children; }
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading Character World"><Text>Loading Character World…</Text></View>;
}
