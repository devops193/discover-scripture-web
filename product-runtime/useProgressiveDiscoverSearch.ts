import { useEffect, useState } from 'react';
import { searchDiscover, type DiscoverSearchResponse } from '@/lib/discoverSearch';
import { acquireDiscoverSearch } from './progressiveRuntime';
export function useProgressiveDiscoverSearch(query: string): DiscoverSearchResponse | undefined {
  const [result, setResult] = useState<{ query: string; value?: DiscoverSearchResponse; error?: Error }>();
  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    // Avoid speculative acquisition for each keystroke, never stale results.
    const timer = setTimeout(() => {
      void acquireDiscoverSearch(query).then(() => {
        const value = searchDiscover(query);
        if (active) setResult({ query, value });
      }).catch(error => { if (active) setResult({ query, error: error instanceof Error ? error : Error(String(error)) }); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  if (!query.trim()) return searchDiscover(query);
  if (result?.query !== query) return undefined;
  if (result.error) throw result.error;
  return result.value;
}
