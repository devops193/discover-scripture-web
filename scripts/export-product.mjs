// Website-owned build staging. Never writes into the native application checkout.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import assert from 'node:assert/strict';
import { buildSolidStatePackage } from './solid-state-package.mjs';
import { applyProgressiveConsumerOverlays } from './progressive-consumer-overlays.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.env.DISCOVERY_SOURCE || '../ScriptureDiscovery');
// Integration builds are deliberately private. This flag cannot publish R2 or
// overwrite the generated public application before its acceptance gates pass.
const progressiveCandidate = !process.argv.includes('--offline-reference');
const progressiveProof = progressiveCandidate ? JSON.parse(fs.readFileSync(path.join(site, 'docs/01b-evidence/r2-projection-candidate.json'))) : undefined;
if (source === site || !fs.existsSync(path.join(source, 'src/app/_layout.tsx'))) throw Error('Set DISCOVERY_SOURCE to the real Discovery checkout');
const stage = fs.mkdtempSync(path.join(site, '.product-build-'));
const sourcePackage = JSON.parse(fs.readFileSync(path.join(source, 'package.json')));
const config = JSON.parse(fs.readFileSync(path.join(source, 'app.json')));
config.expo.web = { bundler: 'metro', output: 'single' };
config.expo.experiments = { ...config.expo.experiments, baseUrl: '/product-app' };
// Website-only route splitting: one module registry/root; Commander route code
// is fetched on demand, while shared providers retain their existing lifetime.
// Route-splitting experiment is not enabled: this Expo version hoists worker
// dependencies into the page-only common chunk. Keep the verified composition
// while the governed-data transport investigation proceeds.
fs.writeFileSync(path.join(stage, 'app.json'), JSON.stringify(config, null, 2));
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ ...sourcePackage, dependencies: { ...sourcePackage.dependencies, 'react-native-web': '~0.21.0' } }, null, 2));
fs.copyFileSync(path.join(source, 'tsconfig.json'), path.join(stage, 'tsconfig.json'));
// Router contexts require real paths beneath the staging root, not source symlinks.
fs.cpSync(path.join(source, 'src'), path.join(stage, 'src'), { recursive: true });
fs.cpSync(path.join(site, 'product-runtime'), path.join(stage, 'src/website-runtime'), { recursive: true });
const solidState = progressiveCandidate ? undefined : buildSolidStatePackage(site, source, stage);
if (progressiveCandidate) fs.writeFileSync(path.join(stage, 'sdw-redirects.json'), '{}');
fs.writeFileSync(path.join(stage, 'entry.js'), progressiveCandidate ? `import '@expo/metro-runtime';
import { bindProgressiveRevision, initializeCanonicalCorpus } from './src/website-runtime/progressiveRuntime';
bindProgressiveRevision(${JSON.stringify(progressiveProof && { revision: progressiveProof.revision, canonicalSourceHash: progressiveProof.canonicalSourceHash, manifest: progressiveProof.manifest })});
initializeCanonicalCorpus().then(() => require('expo-router/entry-classic')).catch(error => {
  console.error('Progressive startup failed', error);
  parent.postMessage({type:'discovery:installation-failed', message:String(error)}, location.origin);
});\n` : `import '@expo/metro-runtime';
import { initializeSolidState } from './src/website-runtime/solidState';
initializeSolidState().then(() => require('expo-router/entry-classic')).catch(error => {
  console.error('SDW installation failed', error);
  parent.postMessage({type:'discovery:installation-failed', message:String(error)}, location.origin);
});\n`);
const stagePackage = JSON.parse(fs.readFileSync(path.join(stage, 'package.json')));
stagePackage.main = './entry.js';
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(stagePackage));
// Explicit website-only overlays. Fail closed if the source contract changes.
function overlay(file, before, after) {
  const target = path.join(stage, 'src', file);
  const text = fs.readFileSync(target, 'utf8');
  if (!text.includes(before)) throw Error(`Website overlay drift: ${file}`);
  fs.writeFileSync(target, text.replace(before, after));
}
overlay('app/_layout.tsx', "import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { SurfaceBridge } from '@/website-runtime/SurfaceBridge';\nimport { recordBoot, recordIdentity } from '@/website-runtime/runtimeEvidence';");
overlay('app/_layout.tsx', 'const corpusInitialization = initializeCanonicalCorpus();', "recordBoot('root');\nrecordIdentity('storage', Storage);\nrecordIdentity('graph', activeGraphProvider);\nconst corpusInitialization = initializeCanonicalCorpus();");
overlay('app/_layout.tsx', '<ActivityCaptureBridge />', '<ActivityCaptureBridge /><SurfaceBridge />');
if (!progressiveCandidate) {
overlay('data/scripture/runtime.ts', "const DATABASE_NAME = 'engwebu.db';", "import { recordBoot, recordIdentity } from '@/website-runtime/runtimeEvidence';\nconst DATABASE_NAME = 'engwebu.db';");
overlay('data/scripture/runtime.ts', 'if (initialization) return initialization;', "if (initialization) return initialization;\n  recordBoot('canonicalBoot');");
overlay('data/scripture/runtime.ts', 'installCanonicalCorpusReader(createReader(database));', "const reader = createReader(database);\n    recordIdentity('canonicalDatabase', database);\n    recordIdentity('canonicalReader', reader);\n    installCanonicalCorpusReader(reader);");
overlay('data/scripture/runtime.ts', "const DATABASE_ASSET = require('../../../assets/scripture/engwebu.db');", "import { getSolidStateDatabase } from '@/website-runtime/solidState';");
overlay('data/scripture/runtime.ts', 'openDatabaseSync(DATABASE_NAME, { useNewConnection: true })', 'getSolidStateDatabase()');
// Installation is already verified before the application factories run. Never
// reimport/delete the canonical package from a consumer's initialization path.
const canonicalRuntimePath = path.join(stage, 'src/data/scripture/runtime.ts');
let canonicalRuntime = fs.readFileSync(canonicalRuntimePath, 'utf8');
const initializeStart = canonicalRuntime.indexOf('      await importDatabaseFromAssetAsync');
const initializeEnd = canonicalRuntime.indexOf('      return true;', initializeStart);
assert(initializeStart > 0 && initializeEnd > initializeStart);
canonicalRuntime = canonicalRuntime.slice(0, initializeStart) + '      runtimeDatabase = openAndInstall();\n' + canonicalRuntime.slice(initializeEnd);
canonicalRuntime = canonicalRuntime.replace('continuing with legacy Scripture sources.', 'verified local world unavailable.');
fs.writeFileSync(canonicalRuntimePath, canonicalRuntime);
}
if (progressiveCandidate) applyProgressiveConsumerOverlays(stage);
if (!progressiveCandidate) {
  overlay('scripture-tree/smartPresenterTreeRuntime.ts', 'const cached = new Map', "import { recordIdentity } from '@/website-runtime/runtimeEvidence';\nconst cached = new Map");
  overlay('scripture-tree/smartPresenterTreeRuntime.ts', 'export function presenterRuntimeDiagnostics()', "recordIdentity('treeCache', cached);\nexport function presenterRuntimeDiagnostics()");
}
if (!progressiveCandidate) {
  overlay('worlds/characterWorldRuntime.ts', "import { createWorldKernel,", "import { recordIdentity } from '@/website-runtime/runtimeEvidence';\nimport { createWorldKernel,");
  overlay('worlds/characterWorldRuntime.ts', 'return createCharacterWorldViewModel(kernel!,', "recordIdentity('worldKernel', kernel!);\n    return createCharacterWorldViewModel(kernel!,");
}
// Product-surface authorization is separate from protected-data/pilot security.
overlay('digital-altar/featureFlags.ts', "const developmentBuild = typeof __DEV__ !== 'undefined' && __DEV__;", "return Object.freeze({ namespaceEnabled: true, ministryModeEnabled: true });\n  const developmentBuild = typeof __DEV__ !== 'undefined' && __DEV__;");
overlay('app/(tabs)/_layout.tsx', 'paddingTop: 5,', 'paddingTop: 5, height: 68, paddingBottom: 8,');
overlay('components/AppIcon.tsx', "import type { ColorValue, StyleProp, ViewStyle } from 'react-native';", "import { Text, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';");
overlay('components/AppIcon.tsx', `<SymbolView
      name={icons[name]}
      size={size}
      tintColor={color}
      type="monochrome"
      resizeMode="scaleAspectFit"
      style={style}
    />`, `<Text accessible={false} style={[style, { color, fontFamily: 'MaterialSymbols_400Regular', fontSize: size, lineHeight: size + 2 }]}>{icons[name].android}</Text>`);
overlay('app/digital-altar/commander.tsx', 'ActivityIndicator, Alert, Pressable,', 'ActivityIndicator, Alert, Platform, Pressable,');
overlay('app/digital-altar/commander.tsx', 'if (!isTablet) return (', "if (!isTablet && Platform.OS !== 'web') return (");
overlay('app/digital-altar/commander.tsx', 'style={[styles.commandBar, { borderBottomColor: theme.border }]}', "style={[styles.commandBar, { borderBottomColor: theme.border }, !isTablet && { flexDirection: 'column', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, minHeight: 0 }]}");
overlay('app/digital-altar/commander.tsx', 'style={styles.contextBar}', "style={[styles.contextBar, !isTablet && { flexWrap: 'wrap', gap: 8 }]}");
overlay('app/digital-altar/commander.tsx', '<View style={styles.commandBody}>', "<View style={[styles.commandBody, !isTablet && { flexDirection: 'column' }]}>");
overlay('app/digital-altar/commander.tsx', '<View style={[styles.sidebar, { borderRightColor: theme.border }]}>', "<ScrollView horizontal={!isTablet} style={{ flexGrow: 0, flexShrink: 0, width: isTablet ? 230 : '100%', maxHeight: isTablet ? undefined : 138 }} contentContainerStyle={[styles.sidebar, { borderRightColor: theme.border, width: isTablet ? 230 : undefined }, !isTablet && { alignItems: 'center' }]}>");
overlay('app/digital-altar/commander.tsx', '</View>\n              <ScrollView contentContainerStyle={styles.workspaceScroll}', '</ScrollView>\n              <ScrollView contentContainerStyle={styles.workspaceScroll}');
for (const key of ['todayCard', 'upcomingCard']) overlay('app/digital-altar/commander.tsx', `${key}: { width: '58%',`, `${key}: { flexBasis: 300, flexGrow: 1, minWidth: 0,`);
for (const key of ['selectedCard', 'actionsCard']) overlay('app/digital-altar/commander.tsx', `${key}: { flex: 1, minWidth: 300,`, `${key}: { flexGrow: 1, flexBasis: 300, minWidth: 0,`);
overlay('app/digital-altar/commander.tsx', "smartCard: { width: '48%', minWidth: 320 }", "smartCard: { flexGrow: 1, flexBasis: 300, minWidth: 0 }");
fs.symlinkSync(path.join(source, 'assets'), path.join(stage, 'assets'), 'dir');
for (const folder of ['release', 'contracts', 'tests']) fs.symlinkSync(path.join(source, folder), path.join(stage, folder), 'dir');
const channelPath = path.join(source, 'node_modules/expo-sqlite/web/WorkerChannel.ts');
const channel = fs.readFileSync(channelPath, 'utf8');
// Native root starts corpus import and graph storage restoration concurrently.
// The dependency's WASM/VFS initialization must also be single-flight; otherwise
// one worker can construct competing SQLite/VFS owners on a warm reload.
fs.cpSync(path.join(source, 'node_modules/expo-sqlite/web'), path.join(stage, 'sqlite-web'), { recursive: true });
const vfsPath = path.join(stage, 'sqlite-web/wa-sqlite/VFS.js');
const vfsSource = fs.readFileSync(vfsPath, 'utf8');
assert(vfsSource.includes('mxPathname = 64;'));
// The OPFS header supports 512 bytes; leave room for journal suffixes while
// preserving the complete SHA-256 in immutable database filenames.
fs.writeFileSync(vfsPath, vfsSource.replace('mxPathname = 64;', 'mxPathname = 480;'));
const workerPath = path.join(stage, 'sqlite-web/worker.ts');
const workerSource = fs.readFileSync(workerPath, 'utf8');
if (!workerSource.includes('async function maybeInitAsync(): Promise<{')) throw Error('SQLite worker initialization requires review');
let patchedWorker = workerSource.replace('async function maybeInitAsync(): Promise<{', `let initializationPromise: ReturnType<typeof initializeSQLiteAsync> | undefined;
function maybeInitAsync() { return initializationPromise ??= initializeSQLiteAsync(); }
async function initializeSQLiteAsync(): Promise<{`);
patchedWorker = patchedWorker.replace('_sqlite3.vfs_register(_vfs, true);', `if (_vfs.getCapacity() < 14) await _vfs.addCapacity(14 - _vfs.getCapacity());
    _sqlite3.vfs_register(_vfs, true);`);
const importTail = `  await sqlite3.deserialize(srcDb, 'main', serializedData);
  const destDb = await sqlite3.open_v2(databasePath);
  await sqlite3.backup(destDb, 'main', srcDb, 'main');
  await sqlite3.close(srcDb);
  await sqlite3.close(destDb);`;
assert(patchedWorker.includes(importTail));
patchedWorker = patchedWorker.replace(importTail, `  let destDb: number | undefined;
  try {
    await sqlite3.deserialize(srcDb, 'main', serializedData);
    destDb = await sqlite3.open_v2(databasePath);
    await sqlite3.backup(destDb, 'main', srcDb, 'main');
  } finally {
    if (destDb !== undefined) await sqlite3.close(destDb);
    await sqlite3.close(srcDb);
  }`);
fs.writeFileSync(workerPath, patchedWorker);
if (!channel.includes('if (i > 1_000_000)') || !channel.includes('if (i > 1000_000_000)') || !channel.includes('resultArray.set(new Uint32Array([length]), 0);')) throw Error('SQLite worker adapter requires review for this dependency version');
fs.writeFileSync(path.join(stage, 'WorkerChannel.ts'), channel
  // Uint8Array.set(Uint32Array) converts each element to one byte; it does not
  // copy the four-byte length header. Preserve lengths above 255 on both ends.
  .replace('resultArray.set(new Uint32Array([length]), 0);', 'new Uint32Array(resultBuffer, 0, 1)[0] = length;')
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
const sdwRedirects = require('./sdw-redirects.json');
const config = getDefaultConfig(__dirname);
config.watchFolders = [${JSON.stringify(source)}, ${JSON.stringify(site)}];
config.resolver.nodeModulesPaths = [__dirname + '/node_modules', ${JSON.stringify(path.join(site, 'node_modules'))}, ${JSON.stringify(path.join(source, 'node_modules'))}];
config.resolver.assetExts.push('db', 'wasm');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-runtime') return { type:'sourceFile', filePath: require.resolve(moduleName, { paths:[${JSON.stringify(path.join(source, 'node_modules/expo-router'))}] }) };
  if (platform === 'web' && moduleName === './worker' && context.originModulePath.includes('expo-sqlite/web/')) {
    return { type: 'sourceFile', filePath: __dirname + '/sqlite-web/worker.ts' };
  }
  if (platform === 'web' && moduleName === './WorkerChannel' && (context.originModulePath.includes('expo-sqlite/web/') || context.originModulePath.includes('/sqlite-web/'))) {
    return { type: 'sourceFile', filePath: __dirname + '/WorkerChannel.ts' };
  }
  if (/^react-dom(\\/|$)/.test(moduleName)) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName.replace('react-dom', 'react-dom-product'), { paths: [${JSON.stringify(site)}] }) };
  }
  if (/^(react|react-dom|scheduler)(\\/|$)/.test(moduleName)) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName, { paths: [${JSON.stringify(source)}] }) };
  }
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (platform === 'web' && resolved.type === 'sourceFile' && sdwRedirects[resolved.filePath]) return { type:'sourceFile', filePath:sdwRedirects[resolved.filePath] };
  return resolved;
};
module.exports = config;
`);
const output = fs.mkdtempSync(path.join(site, progressiveCandidate ? '.product-build-r2-export-' : '.product-build-offline-reference-'));
const result = spawnSync(process.execPath, [path.join(source, 'node_modules/expo/bin/cli'), 'export', '--clear', '--platform', 'web', '--output-dir', output, '--max-workers', '2'], {
  cwd: stage, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
});
console.log(`Preserved build staging: ${stage}`);
if (result.status === 0) {
  if (progressiveCandidate) {
    fs.writeFileSync(path.join(site, 'docs/01b-evidence/r2-private-export.json'), JSON.stringify({ status: 'BUILT_NOT_ACCEPTED', revision: progressiveProof.revision, stage, output, packetRoot: progressiveProof.output, publicExportChanged: false, publicActivation: false }, null, 2)+'\n');
  } else {
  const sdwOutput = path.join(output, 'sdw'); fs.mkdirSync(sdwOutput, { recursive: true });
  fs.copyFileSync(solidState.candidate, path.join(sdwOutput, `${solidState.manifest.sha256}.sqlite`));
  fs.writeFileSync(path.join(sdwOutput, 'manifest.json'), JSON.stringify(solidState.manifest));
  fs.writeFileSync(path.join(site, 'docs/01b-evidence/solid-state-package.json'), JSON.stringify({ ...solidState.manifest, rows: solidState.rows, exactPayloadEquivalence: 'PASS', nativeSourceMutated: false }, null, 2));
  }
  const htmlPath = path.join(output, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const script = html.match(/<script src="([^"]*entry-[^"]+\.js)"[^>]*><\/script>/);
  if (!script) throw Error('Missing Expo entry script');
  // Standard HTTP content encoding, not a second bundle/module loader. Keeping
  // Metro's script order and URLs preserves its single registry and lazy chunks.
  // Both Next (local) and Netlify static serving declare the same encoding.
  function encodeDirectory(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) encodeDirectory(file);
      else if (/\.(js|db|sqlite)$/.test(entry.name)) {
        const original = fs.readFileSync(file);
        const packed = brotliCompressSync(original, {params:{[constants.BROTLI_PARAM_QUALITY]:8}});
        assert.deepEqual(brotliDecompressSync(packed), original);
        fs.writeFileSync(file, packed);
      }
    }
  }
  encodeDirectory(output);
  html = html.replace('<head>', '<head><script src="/product-app/boot.js"></script>');
  html = html.replace('</head>', '<style>html,body,#root{height:100%;width:100%;margin:0;overflow:hidden}body{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box}*{box-sizing:border-box}</style></head>');
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(path.join(output, 'boot.js'), `
(() => {
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    originalError(...args);
    if (args.some(value => typeof value === 'string' && value.includes('Canonical WEBU corpus unavailable'))) {
      parent.postMessage({ type: 'discovery:viewport-unavailable' }, location.origin);
    }
  };
  ${progressiveCandidate ? '// Keep the current route so direct links and refresh retain their Scripture context.' : "history.replaceState(null, '', '/product-app/');"}
})();
`);
}
process.exitCode = result.status ?? 1;
