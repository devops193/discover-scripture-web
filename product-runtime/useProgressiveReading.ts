import { useEffect, useState } from 'react';
import type { ScriptureSource } from '@/data/types';
import { acquireReadingScripture } from './progressiveRuntime';

export function useProgressiveReading(reference?: string, subjectId?: string, sceneId?: string) {
  const key = JSON.stringify([reference, subjectId, sceneId]);
  const [result, setResult] = useState<{ key: string; source?: ScriptureSource; error?: Error }>();
  useEffect(() => {
    let active = true;
    if (reference) void acquireReadingScripture(reference, subjectId, sceneId).then(
      source => { if (active) setResult({ key, source }); },
      error => { if (active) setResult({ key, error: error instanceof Error ? error : Error(String(error)) }); },
    );
    return () => { active = false; };
  }, [key, reference, subjectId, sceneId]);
  if (result?.key === key && result.error) throw result.error;
  return result?.key === key ? result.source : undefined;
}
