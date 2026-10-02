import { useEffect, useState, type ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/theme/tokens';
import { acquireScene } from './progressiveRuntime';

/** A route's children cannot execute synchronous resolvers before acquisition.
 * A changed route never renders the previous route's accepted children. */
export function ProgressiveSceneBoundary({ children }: { children: ReactNode }) {
  const { slug, passageId } = useLocalSearchParams<{ slug?: string; passageId?: string }>();
  const subjectId = slug ?? 'water';
  const key = JSON.stringify([subjectId, passageId]);
  const theme = useTheme();
  const [result, setResult] = useState<{ key: string; error?: Error }>();
  useEffect(() => {
    let active = true;
    void acquireScene(subjectId, passageId).then(
      () => { if (active) setResult({ key }); },
      error => { if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) }); },
    );
    return () => { active = false; };
  }, [key, subjectId, passageId]);
  if (result?.key === key) {
    if (result.error) throw result.error;
    return children;
  }
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading scene" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.background }}>
    <ActivityIndicator color={theme.accent} />
    <Text style={{ color: theme.textPrimary }}>Loading scene…</Text>
  </View>;
}
