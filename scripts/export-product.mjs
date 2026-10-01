// Website-owned build staging. Never writes into the native application checkout.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.env.DISCOVERY_SOURCE || '../ScriptureDiscovery');
if (source === site || !fs.existsSync(path.join(source, 'src/app/_layout.tsx'))) throw Error('Set DISCOVERY_SOURCE to the real Discovery checkout');
const stage = fs.mkdtempSync(path.join(site, '.product-build-'));
const sourcePackage = JSON.parse(fs.readFileSync(path.join(source, 'package.json')));
const config = JSON.parse(fs.readFileSync(path.join(source, 'app.json')));
config.expo.web = { bundler: 'metro', output: 'single' };
config.expo.experiments = { ...config.expo.experiments, baseUrl: '/product-app' };
fs.writeFileSync(path.join(stage, 'app.json'), JSON.stringify(config, null, 2));
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ ...sourcePackage, dependencies: { ...sourcePackage.dependencies, 'react-native-web': '~0.21.0' } }, null, 2));
fs.copyFileSync(path.join(source, 'tsconfig.json'), path.join(stage, 'tsconfig.json'));
// Router contexts require real paths beneath the staging root, not source symlinks.
fs.cpSync(path.join(source, 'src'), path.join(stage, 'src'), { recursive: true });
fs.symlinkSync(path.join(source, 'assets'), path.join(stage, 'assets'), 'dir');
for (const folder of ['release', 'contracts', 'tests']) fs.symlinkSync(path.join(source, folder), path.join(stage, folder), 'dir');
const channelPath = path.join(source, 'node_modules/expo-sqlite/web/WorkerChannel.ts');
const channel = fs.readFileSync(channelPath, 'utf8');
if (!channel.includes('if (i > 1_000_000)') || !channel.includes('if (i > 1000_000_000)')) throw Error('SQLite worker adapter requires review for this dependency version');
fs.writeFileSync(path.join(stage, 'WorkerChannel.ts'), channel
  .replace('let i = 0;', 'let i = 0; const operationStart = performance.now();')
  .replace('i > 1_000_000', 'performance.now() - operationStart > 10000')
  .replace('i > 1000_000_000', 'performance.now() - operationStart > 10000'));
// Relative imports of the copied dependency stay bound to the original module.
for (const file of ['Deferred.ts', 'SyncSerializer.ts', 'web.types.ts']) fs.symlinkSync(path.join(source, 'node_modules/expo-sqlite/web', file), path.join(stage, file));
fs.mkdirSync(path.join(stage, 'node_modules'));
for (const entry of fs.readdirSync(path.join(source, 'node_modules'))) {
  if (entry === '.bin' || entry === 'react-native-web') continue;
  fs.symlinkSync(path.join(source, 'node_modules', entry), path.join(stage, 'node_modules', entry));
}
fs.symlinkSync(path.join(site, 'node_modules/react-native-web'), path.join(stage, 'node_modules/react-native-web'), 'dir');
fs.writeFileSync(path.join(stage, 'metro.config.cjs'), `
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [${JSON.stringify(source)}, ${JSON.stringify(site)}];
config.resolver.nodeModulesPaths = [__dirname + '/node_modules', ${JSON.stringify(path.join(site, 'node_modules'))}, ${JSON.stringify(path.join(source, 'node_modules'))}];
config.resolver.assetExts.push('db', 'wasm');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === './WorkerChannel' && context.originModulePath.includes('expo-sqlite/web/')) {
    return { type: 'sourceFile', filePath: __dirname + '/WorkerChannel.ts' };
  }
  if (/^react-dom(\\/|$)/.test(moduleName)) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName.replace('react-dom', 'react-dom-product'), { paths: [${JSON.stringify(site)}] }) };
  }
  if (/^(react|react-dom|scheduler)(\\/|$)/.test(moduleName)) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName, { paths: [${JSON.stringify(source)}] }) };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
`);
const output = path.join(site, 'public/product-app');
const result = spawnSync(process.execPath, [path.join(source, 'node_modules/expo/bin/cli'), 'export', '--clear', '--platform', 'web', '--output-dir', output, '--max-workers', '2'], {
  cwd: stage, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
});
console.log(`Preserved build staging: ${stage}`);
if (result.status === 0) {
  const htmlPath = path.join(output, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const script = html.match(/<script src="([^"]*entry-[^"]+\.js)"[^>]*><\/script>/);
  if (!script) throw Error('Missing Expo entry script');
  const assetPath = path.join(output, script[1].replace(/^\/product-app\//, ''));
  const packed = gzipSync(fs.readFileSync(assetPath), { level: 9 });
  fs.writeFileSync(assetPath + '.gz', packed);
  // The generated raw bundle exceeds GitHub’s single-file limit. Keep a lossless
  // compressed artifact; no product code/data is removed or semantically rebuilt.
  fs.unlinkSync(assetPath);
  html = html.replace(script[0], `<script src="/product-app/boot.js" defer></script>`);
  html = html.replace('</head>', '<style>html,body,#root{height:100%;width:100%;margin:0;overflow:hidden}body{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box}*{box-sizing:border-box}</style></head>');
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(path.join(output, 'boot.js'), `
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
    const response = await fetch(${JSON.stringify(script[1] + '.gz')});
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
`);
}
process.exitCode = result.status ?? 1;
