import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [
      { source: '/product-app/:path*', destination: '/product-app/index.html' },
    ] };
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
    ] },
    { source: '/product-app/_expo/static/js/web/:file*', headers: [
      { key: 'Content-Encoding', value: 'br' },
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ] },
    { source: '/product-app/assets/:file*', headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ] },
    { source: '/product-app/assets/__ScriptureDiscovery/assets/scripture/:file*', headers: [
      { key: 'Content-Encoding', value: 'br' },
    ] },
    { source: '/sdw/:revision/:file', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/product-app/progressive-manifest.json', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/product-app/sdw/:file.sqlite', headers: [{ key: 'Content-Encoding', value: 'br' }, { key: 'Content-Type', value: 'application/vnd.sqlite3' }] },
    { source: '/product-app/sdw/manifest.json', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/product-app/boot.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/product-app/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default nextConfig;
