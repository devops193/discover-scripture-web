'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './productViewport.module.css';

/** Keep the existing application and readiness bridge; expose only Discover here. */
export function ProductViewport() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [installation, setInstallation] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const selectDiscover = () => frame.current?.contentWindow?.postMessage(
    { type: 'discovery:select-surface', product: 'discover' }, window.location.origin);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'discovery:installation-progress' && typeof event.data.message === 'string') {
        setInstallation(event.data.message);
      } else if (event.data?.type === 'discovery:installation-failed') {
        setFailed(true);
      } else if (event.data?.type === 'discovery:viewport-ready' && event.data.product === 'discover') {
        setReady(true); setFailed(false);
      } else if (event.data?.type === 'discovery:viewport-unavailable' && event.data.product === 'discover') {
        setFailed(true);
      }
    };
    window.addEventListener('message', onMessage);
    selectDiscover();
    return () => window.removeEventListener('message', onMessage);
  }, [attempt]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setFailed(true), 30000);
    return () => window.clearTimeout(timer);
  }, [ready, attempt, installation]);

  return <section className={styles.viewport} aria-labelledby="explore-title">
    <div className={styles.toolbar}>
      <h2 id="explore-title" className={styles.title}>Explore Discover</h2>
      <a className={styles.siteLink} href="/product-app/">Open full screen</a>
    </div>
    <div id="product-panel" className={styles.panel}>
      <iframe key={attempt} ref={frame} onLoad={selectDiscover}
        className={styles.frame} title="Discover Scripture live application" src="/product-app/"
        loading="eager" allow="fullscreen; clipboard-write" />
      {!ready && <div className={styles.status} role="status">
        <p>{failed ? 'Discover Scripture could not finish opening.' : installation || 'Opening Discover Scripture…'}</p>
        {failed && <><button onClick={() => { setReady(false); setFailed(false); setInstallation(''); setAttempt(a => a + 1); }}>Try again</button><a href="/product-app/">Open full screen</a></>}
      </div>}
    </div>
  </section>;
}
