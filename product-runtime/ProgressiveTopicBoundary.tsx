import { useEffect, useState, type ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/theme/tokens';
import { acquireTopicTree, acquireScripture, getProgressiveGraphCatalog } from './progressiveRuntime';

/** Includes direct links, restored history entries, and refresh, not just cards. */
export function ProgressiveTopicBoundary({ children, firstGlance = false }: { children: ReactNode; firstGlance?: boolean }) {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const subjectId = slug ?? 'water';
  const key = JSON.stringify([subjectId, firstGlance]);
  const theme = useTheme();
  const [result, setResult] = useState<{ key: string; error?: Error }>();
  useEffect(() => {
    let active = true;
    const acquire = async () => {
      const [topic] = await Promise.all([getProgressiveGraphCatalog().ensureTopic(subjectId), acquireTopicTree(subjectId)]);
      if (firstGlance && topic.axis !== 'character') {
        const passages = topic.firstGlancePassageIds?.length
          ? topic.firstGlancePassageIds.map((id: string) => topic.passages.find((row: { id: string }) => row.id === id)).filter(Boolean).slice(0, 6)
          : topic.passages.slice(0, 6);
        await Promise.all(passages.map(async (row: { reference: string }) => {
          if (!await acquireScripture(row.reference)) throw Error('SDW_FIRST_GLANCE_SCRIPTURE_MISSING');
        }));
      }
    };
    void acquire().then(() => { if (active) setResult({ key }); }, error => {
      if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) });
    });
    return () => { active = false; };
  }, [key, subjectId, firstGlance]);
  if (result?.key === key) {
    if (result.error) throw result.error;
    return children;
  }
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading discovery" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.background }}>
    <ActivityIndicator color={theme.accent} /><Text style={{ color: theme.textPrimary }}>Loading discovery…</Text>
  </View>;
}
