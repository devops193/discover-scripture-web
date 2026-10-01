'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './productViewport.module.css';

type Product = 'discover' | 'commander';
const names: Record<Product, string> = { discover: 'Scripture Discovered', commander: 'Commander CE' };
const products: Product[] = ['discover', 'commander'];
const fromUrl = (): Product => new URLSearchParams(window.location.search).get('product') === 'commander' ? 'commander' : 'discover';

/** Temporary document isolation for the actual Expo web export, not a mock product. */
export function ProductViewport() {
  const [active, setActive] = useState<Product>('discover');
  const [mountedProduct, setMountedProduct] = useState<Product | null>(null);
  const [ready, setReady] = useState<Partial<Record<Product, boolean>>>({});
  const [failed, setFailed] = useState<Partial<Record<Product, boolean>>>({});
  const [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLElement>(null);
  const frames = useRef<Partial<Record<Product, HTMLIFrameElement | null>>>({});

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
      if (event.origin !== window.location.origin || !['discovery:viewport-ready', 'discovery:viewport-unavailable'].includes(event.data?.type)) return;
      const product = products.find(p => frames.current[p]?.contentWindow === event.source);
      if (product) {
        const available = event.data.type === 'discovery:viewport-ready';
        setReady(r => ({ ...r, [product]: available })); setFailed(f => ({ ...f, [product]: !available }));
      }
    };
    window.addEventListener('message', onMessage);
    return () => { observer.disconnect(); window.removeEventListener('popstate', sync); window.removeEventListener('message', onMessage); };
  }, []);

  useEffect(() => {
    // SQLite OPFS permits one access handle per file. Suspend the old document
    // before mounting another; persisted product data stays in browser storage.
    setMountedProduct(null);
    setReady({});
    setFailed({});
    const timer = window.setTimeout(() => setMountedProduct(active), 150);
    return () => window.clearTimeout(timer);
  }, [active, attempt]);

  useEffect(() => {
    if (ready[active]) return;
    const timer = window.setTimeout(() => setFailed(f => ({ ...f, [active]: true })), 30000);
    return () => window.clearTimeout(timer);
  }, [active, ready, attempt]);

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
          aria-selected={active === product} aria-controls={`product-panel-${product}`} tabIndex={active === product ? 0 : -1}
          onClick={() => select(product)} onKeyDown={event => {
            const next = event.key === 'Home' ? products[0] : event.key === 'End' ? products[1] : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? products[1 - index] : null;
            if (next) { event.preventDefault(); select(next); document.getElementById(`product-tab-${next}`)?.focus(); }
          }}>{names[product]}</button>)}
      </div>
      <a className={styles.siteLink} href="#website-content">About the platform</a>
    </div>
    {products.map(product => <div key={product} id={`product-panel-${product}`} role="tabpanel"
      aria-labelledby={`product-tab-${product}`} hidden={active !== product} className={styles.panel}>
      {mountedProduct === product && <iframe key={`${product}-${attempt}`} ref={frame => { frames.current[product] = frame; }}
        className={styles.frame} title={`${names[product]} application`} src={`/product-app/index.html?product=${product}`}
        allow="fullscreen; clipboard-write" />}
      {!ready[product] && <div className={styles.status} role="status">
        <p>{failed[product] ? product === 'commander' ? 'Commander CE is not available in this web build.' : `${names[product]} could not finish opening.` : `Opening ${names[product]}…`}</p>
        {failed[product] && <button onClick={() => { setReady({}); setFailed({}); setAttempt(a => a + 1); }}>Try again</button>}
      </div>}
    </div>)}
  </section>;
}
