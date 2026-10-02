import { useEffect, useState } from 'react';
import type { ScriptureSource } from '@/data/types';
import { acquireScripture } from './progressiveRuntime';

/** Acquisition belongs to the shared reader, not to a surface-owned provider. */
export function useProgressiveScripture(reference: string | undefined) {
  const [result, setResult] = useState<{ reference?: string; source?: ScriptureSource; error?: Error }>({});
  useEffect(() => {
    let active = true;
    if (reference) void acquireScripture(reference).then(
      source => { if (active) setResult({ reference, source }); },
      error => { if (active) setResult({ reference, error: error instanceof Error ? error : Error(String(error)) }); },
    );
    return () => { active = false; };
  }, [reference]);
  if (result.reference === reference && result.error) throw result.error;
  // Never show the previous chapter while a new address is being acquired.
  return result.reference === reference ? result.source : undefined;
}
