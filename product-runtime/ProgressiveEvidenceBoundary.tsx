import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/theme/tokens';
import { acquireScripture } from './progressiveRuntime';

/** Used only when an existing evidence view is mounted (not for collapsed rows). */
export function ProgressiveEvidenceBoundary({ references, children }: { references: readonly string[]; children: ReactNode }) {
  const key = JSON.stringify(references);
  const theme = useTheme();
  const [result, setResult] = useState<{ key: string; error?: Error }>();
  useEffect(() => {
    let active = true;
    const requested = JSON.parse(key) as string[];
    void Promise.all([...new Set(requested)].map(async reference => {
      if (!await acquireScripture(reference)) throw Error('SDW_EVIDENCE_SCRIPTURE_MISSING');
    })).then(
      () => { if (active) setResult({ key }); },
      error => { if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) }); },
    );
    return () => { active = false; };
  }, [key]);
  if (result?.key === key) {
    if (result.error) throw result.error;
    return children;
  }
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading evidence" style={{ padding: 16, gap: 8 }}>
    <ActivityIndicator color={theme.accent} /><Text style={{ color: theme.textPrimary }}>Loading evidence…</Text>
  </View>;
}
