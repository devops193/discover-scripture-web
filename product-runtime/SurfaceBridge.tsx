import { useEffect, useState } from 'react';
import { router, usePathname, useGlobalSearchParams, useRootNavigationState, type Href } from 'expo-router';
import { canonicalCorpusIsReady } from '@/data/scripture/runtime';
import { activeGraphProvider } from '@/discover-graph/productionGraph';
import Storage from 'expo-sqlite/kv-store';
import { recordIdentity, runtimeEvidence } from './runtimeEvidence';

type Surface = 'discover' | 'commander';
let selected: Surface = 'discover';
let switching = false;
let pendingRoute: string | undefined;
const positions: Record<Surface, string> = { discover: '/', commander: '/digital-altar/commander' };
const POSITION_KEY = 'website:surface-positions:v1';
const route = () => (location.pathname.replace(/^\/product-app/, '').replace(/^\/index\.html$/, '/') || '/') + location.search;
const report = () => parent.postMessage({
  type: canonicalCorpusIsReady() ? 'discovery:viewport-ready' : 'discovery:viewport-unavailable',
  product: selected, evidence: runtimeEvidence(),
}, location.origin);

/** Mounted once inside the existing provider tree, alongside the existing Router. */
export function SurfaceBridge() {
  const navigation = useRootNavigationState();
  const pathname = usePathname();
  const query = JSON.stringify(useGlobalSearchParams());
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!navigation?.key) return;
    let active = true;
    void Storage.getItem(POSITION_KEY).then(value => {
      if (!active) return;
      if (value) {
        const saved = JSON.parse(value);
        for (const surface of ['discover', 'commander'] as const)
          if (typeof saved[surface] === 'string' && /^\/(?!\/)/.test(saved[surface])) positions[surface] = saved[surface];
      }
      // Explicit deep links take precedence over the saved surface position.
      if (route() === '/' && positions.discover !== '/') {
        switching = true; pendingRoute = positions.discover;
        router.replace(positions.discover as Href);
      }
      setRestored(true);
    }).catch(error => {
      console.error('Surface route restoration failed', error);
      parent.postMessage({ type: 'discovery:installation-failed', message: 'Saved route could not be restored.' }, location.origin);
    });
    return () => { active = false; };
  }, [navigation?.key]);
  useEffect(() => {
    if (!navigation?.key || !restored) return;
    recordIdentity('graph', activeGraphProvider);
    recordIdentity('storage', Storage);
    const select = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'discovery:select-surface') return;
      const next = event.data.product;
      if (next !== 'discover' && next !== 'commander') return;
      if (next === selected) { report(); return; }
      if (!switching) positions[selected] = route();
      selected = next;
      switching = true;
      pendingRoute = positions[selected];
      // Replace prevents an invisible iframe entry competing with the host's
      // mode history. The same Expo root, providers and module cache stay alive.
      router.replace(positions[selected] as Href);
    };
    window.addEventListener('message', select);
    report();
    return () => window.removeEventListener('message', select);
  }, [navigation?.key, restored]);
  useEffect(() => {
    if (!navigation?.key || !restored) return;
    if (pendingRoute && pathname !== new URL(pendingRoute, location.origin).pathname) return;
    // Expo publishes its React route before updating browser history. Read the
    // committed URL on the next frame, not the previous surface's location.
    const expectedSurface = selected;
    const frame = requestAnimationFrame(() => {
      if (selected !== expectedSurface) return;
      pendingRoute = undefined;
      switching = false;
      positions[selected] = route();
      void Storage.setItem(POSITION_KEY, JSON.stringify(positions)).catch(error => console.error('Surface route persistence failed', error));
      report();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, query, navigation?.key, restored]);
  return null;
}
