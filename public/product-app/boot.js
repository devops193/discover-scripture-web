
(async () => {
  let runtimeFailed = false;
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    originalError(...args);
    if (args.some(value => typeof value === 'string' && value.includes('Canonical WEBU corpus unavailable'))) {
      runtimeFailed = true;
      parent.postMessage({ type: 'discovery:viewport-unavailable' }, location.origin);
    }
  };
  const commander = new URLSearchParams(location.search).get('product') === 'commander';
  history.replaceState(null, '', '/product-app/' + (commander ? 'digital-altar/commander' : ''));
  try {
    const response = await fetch("/product-app/_expo/static/js/web/entry-41d9f90f22546ab48df19a9a7472c4d3.js.gz");
    if (!response.ok || !response.body) throw Error('Product download failed');
    const body = response.body.pipeThrough(new DecompressionStream('gzip'));
    const source = await new Response(body).blob();
    const element = document.createElement('script');
    element.src = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    document.body.appendChild(element);
    const observer = new MutationObserver(() => {
      if (document.querySelector('#root button, #root a, #root [role="button"]') && !document.getElementById('root').textContent.includes('Unmatched Route')) {
        const available = !runtimeFailed && (!commander || location.pathname.includes('/digital-altar/commander'));
        parent.postMessage({ type: available ? 'discovery:viewport-ready' : 'discovery:viewport-unavailable' }, location.origin);
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
  } catch (error) { console.error('Product startup failed', error); }
})();
