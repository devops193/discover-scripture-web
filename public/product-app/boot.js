
(() => {
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    originalError(...args);
    if (args.some(value => typeof value === 'string' && value.includes('Canonical WEBU corpus unavailable'))) {
      parent.postMessage({ type: 'discovery:viewport-unavailable' }, location.origin);
    }
  };
  // Keep the current route so direct links and refresh retain their Scripture context.
})();
