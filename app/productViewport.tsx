'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './productViewport.module.css';

type Product = 'discover' | 'commander';
const names: Record<Product, string> = { discover: 'Scripture Discovered', commander: 'Commander CE' };
const products: Product[] = ['discover', 'commander'];
const fromUrl = (): Product => new URLSearchParams(window.location.search).get('product') === 'commander' ? 'commander' : 'discover';

/** One persistent application document; product selection changes its route only. */
export function ProductViewport() {
  const [active, setActive] = useState<Product>('discover');
  const [booted, setBooted] = useState(false);
  const [ready, setReady] = useState<Partial<Record<Product, boolean>>>({});
  const [failed, setFailed] = useState<Partial<Record<Product, boolean>>>({});
  const [attempt, setAttempt] = useState(0);
  const [installation, setInstallation] = useState('');
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const sync = () => {
      const product = fromUrl();
      setActive(product);
    };
    sync();
    window.addEventListener('popstate', sync);
    const header = document.querySelector<HTMLElement>('.site-header');
    const measure = () => root.current?.style.setProperty('--site-header-height', `${header?.getBoundingClientRect().height ?? 64}px`);
    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
    measure();
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow) {
        if (event.data?.type === 'discovery:installation-progress' && typeof event.data.message === 'string') {
          setInstallation(event.data.message); return;
        }
        if (event.data?.type === 'discovery:installation-failed') {
          setFailed({ discover: true, commander: true }); return;
        }
      }
      if (event.origin !== window.location.origin || !['discovery:viewport-ready', 'discovery:viewport-unavailable'].includes(event.data?.type)) return;
      const product = event.source === frame.current?.contentWindow && products.includes(event.data.product) ? event.data.product as Product : null;
      if (product) {
        const available = event.data.type === 'discovery:viewport-ready';
        setBooted(true);
        setReady(r => ({ ...r, [product]: available })); setFailed(f => ({ ...f, [product]: !available }));
      }
    };
    window.addEventListener('message', onMessage);
    return () => { observer.disconnect(); window.removeEventListener('popstate', sync); window.removeEventListener('message', onMessage); };
  }, []);

  useEffect(() => {
    // Two-way readiness handshake: a warm iframe can report before the host
    // hydrates. Send the desired surface on host mount as well as after boot.
    frame.current?.contentWindow?.postMessage({ type: 'discovery:select-surface', product: active }, window.location.origin);
  }, [active, booted]);

  useEffect(() => {
    if (ready[active]) return;
    const timer = window.setTimeout(() => setFailed(f => ({ ...f, [active]: true })), 30000);
    return () => window.clearTimeout(timer);
  }, [active, ready, attempt, installation]);

  const select = (product: Product) => {
    if (product === active) return;
    const url = new URL(window.location.href);
    url.searchParams.set('product', product);
    window.history.pushState({ ...window.history.state, product }, '', url);
    setActive(product);
  };

  return <section ref={root} className={styles.viewport} aria-label="Interactive Scripture products">
    <div className={styles.toolbar}>
      <div className={styles.switcher} role="tablist" aria-label="Choose a product">
        {products.map((product, index) => <button key={product} id={`product-tab-${product}`} role="tab"
          aria-selected={active === product} aria-controls="product-panel" tabIndex={active === product ? 0 : -1}
          onClick={() => select(product)} onKeyDown={event => {
            const next = event.key === 'Home' ? products[0] : event.key === 'End' ? products[1] : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? products[1 - index] : null;
            if (next) { event.preventDefault(); select(next); document.getElementById(`product-tab-${next}`)?.focus(); }
          }}>{names[product]}</button>)}
      </div>
      <a className={styles.siteLink} href="#website-content">About the platform</a>
    </div>
    <div id="product-panel" role="tabpanel"
      aria-labelledby={`product-tab-${active}`} className={styles.panel}>
      <iframe key={attempt} ref={frame}
        className={styles.frame} title="Scripture Discovered shared application" src="/product-app/"
        allow="fullscreen; clipboard-write" />
      {!ready[active] && <div className={styles.status} role="status">
        <p>{failed[active] ? `${names[active]} could not finish opening.` : installation || `Opening ${names[active]}…`}</p>
        {failed[active] && <button onClick={() => { setBooted(false); setReady({}); setFailed({}); setAttempt(a => a + 1); }}>Try again</button>}
      </div>}
    </div>
  </section>;
}
