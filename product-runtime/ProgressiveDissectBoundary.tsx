import { useEffect, useState, type ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { getDissect, getPassage } from '@/lib/discovery';
import { acquireScene, acquireContradictionIndex, getProgressiveGraphCatalog, getProgressiveTree } from './progressiveRuntime';
export function ProgressiveDissectBoundary({ children }: { children: ReactNode }) {
  const params = useLocalSearchParams<{ slug?: string; dissect?: string; passage?: string }>();
  const key = JSON.stringify(params);
  const [result, setResult] = useState<{ key: string; error?: Error }>();
  useEffect(() => {
    let active = true;
    void (async () => {
      const topic = await getProgressiveGraphCatalog().ensureTopic(params.slug ?? 'water');
      const dissect = getDissect(topic, params.dissect, params.passage);
      const passage = getPassage(topic, dissect.passageId) ?? topic.passages[0];
      await Promise.all([acquireScene(topic.id, passage.id), acquireContradictionIndex()]);
      // Existing Tools reads these exact launch records while drawing Dissect.
      // Acquire only its governed compareIds, not other comparisons or chapters.
      const row = getProgressiveTree().getRecord('subject', topic.id, 'analysis', `dissect:${topic.id}:${dissect.id}`);
      await Promise.all((row?.payload.compareIds ?? []).map((id: string) =>
        getProgressiveTree().ensureRecord('subject', topic.id, 'analysis', `compare:${topic.id}:${id}`)));
    })().then(() => { if (active) setResult({ key }); }, error => {
      if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) });
    });
    return () => { active = false; };
  }, [key]);
  if (result?.key === key) { if (result.error) throw result.error; return children; }
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading Dissect"><Text>Loading Dissect…</Text></View>;
}
