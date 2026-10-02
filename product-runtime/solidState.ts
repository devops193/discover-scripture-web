import { openDatabaseAsync, deleteDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import ExpoSQLite from 'expo-sqlite/build/ExpoSQLite';
import { createDatabasePath } from 'expo-sqlite/build/pathUtils';
import expected from './sdwExpected.json';

type Manifest = typeof expected & { revision: string; sha256: string; bytes: number; contentUrl: string; format: string; createdAt: string };
let active: SQLiteDatabase | undefined;
let boot: Promise<void> | undefined;
const evidence = { installs: 0, packageRequests: 0, localReads: 0, payloadBytesRead: 0, activeRevision: '', status: 'NOT_STARTED', persistentStorageGranted: false, lastUpdateError: '', elapsedMs: 0 };
(globalThis as any).__sdwInstallationEvidence = () => ({ ...evidence });
function progress(message: string) { parent.postMessage({ type: 'discovery:installation-progress', message }, location.origin); }
function validateManifest(m: Manifest) {
  if (!m || m.schema !== expected.schema || m.engineCompatibility !== expected.engineCompatibility || m.authoritySha256 !== expected.authoritySha256 || m.canonicalSha256 !== expected.canonicalSha256 || m.payloadCount !== expected.payloadCount || m.format !== 'sqlite' || !/^[a-f0-9]{64}$/.test(m.sha256) || m.revision !== m.sha256 || m.contentUrl !== `/product-app/sdw/${m.sha256}.sqlite` || !Number.isSafeInteger(m.bytes) || m.bytes <= 0) throw Error('Incompatible SDW manifest');
}
async function openVerified(m: Manifest) {
  validateManifest(m);
  const db = await openDatabaseAsync(`sdw-${m.sha256}.sqlite`);
  try {
    if ((await db.getFirstAsync<any>('PRAGMA quick_check'))?.quick_check !== 'ok') throw Error('SDW integrity check failed');
    const metadata = Object.fromEntries((await db.getAllAsync<any>('SELECT key,value FROM sdw_metadata')).map(row => [row.key, row.value]));
    for (const [key, value] of Object.entries(expected)) if (metadata[key] !== String(value)) throw Error(`SDW authority mismatch: ${key}`);
    if ((await db.getFirstAsync<any>('SELECT count(*) AS n FROM sdw_payloads'))?.n !== expected.payloadCount) throw Error('SDW payload count mismatch');
    await db.execAsync('PRAGMA query_only=ON');
    return db;
  } catch (error) { await db.closeAsync(); throw error; }
}
async function install(m: Manifest) {
  validateManifest(m); progress('Downloading the Scripture world for this browser…');
  evidence.packageRequests++;
  const response = await fetch(m.contentUrl);
  if (!response.ok || !response.body) throw Error(`World download failed (${response.status})`);
  const chunks: Uint8Array[] = []; let received = 0; let lastProgress = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    received += value.byteLength;
    if (received > m.bytes) { await reader.cancel(); throw Error('World length exceeds manifest'); }
    chunks.push(value);
    if (performance.now() - lastProgress > 150 || received === m.bytes) {
      progress(`Downloading Scripture world: ${(received / 1048576).toFixed(1)} of ${(m.bytes / 1048576).toFixed(1)} MB`); lastProgress = performance.now();
    }
  }
  if (received !== m.bytes) throw Error('Incomplete world download');
  const bytes = new Uint8Array(received); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; } chunks.length = 0;
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (digest !== m.sha256) throw Error('World hash mismatch');
  progress('Verifying and installing the Scripture world…');
  const url = URL.createObjectURL(new Blob([bytes]));
  try {
    await ExpoSQLite.importAssetDatabaseAsync(createDatabasePath(`sdw-${m.sha256}.sqlite`), url, true);
    const db = await openVerified(m); evidence.installs++; return db;
  } catch (error) {
    await deleteDatabaseAsync(`sdw-${m.sha256}.sqlite`).catch(() => {}); throw error;
  } finally { URL.revokeObjectURL(url); }
}
async function initialize() {
  const started = performance.now(); evidence.status = 'OPENING'; progress('Opening the local Scripture world…');
  const registry = await openDatabaseAsync('sdw-installation-registry.sqlite');
  await registry.execAsync('CREATE TABLE IF NOT EXISTS installation (id INTEGER PRIMARY KEY CHECK(id=1), active TEXT NOT NULL, previous TEXT)');
  const row = await registry.getFirstAsync<{ active: string; previous: string | null }>('SELECT active,previous FROM installation WHERE id=1');
  let installed: Manifest | undefined;
  if (row) { try { installed = JSON.parse(row.active); active = await openVerified(installed!); } catch { installed = undefined; } }
  try {
    const response = await fetch('/product-app/sdw/manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw Error('World manifest unavailable');
    const current: Manifest = await response.json(); validateManifest(current);
    if (!installed || installed.sha256 !== current.sha256) {
      const candidate = await install(current);
      try {
        await registry.runAsync('INSERT INTO installation(id,active,previous) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET active=excluded.active,previous=excluded.previous', JSON.stringify({ ...current, verified: true, storageKind: 'EXISTING_SQLITE_VFS', installedAt: new Date().toISOString() }), installed ? JSON.stringify(installed) : null);
      } catch (error) { await candidate.closeAsync(); throw error; }
      await active?.closeAsync(); active = candidate;
      if (row?.previous) { const old = JSON.parse(row.previous); if (old.sha256 !== current.sha256 && old.sha256 !== installed?.sha256) await deleteDatabaseAsync(`sdw-${old.sha256}.sqlite`).catch(() => {}); }
      installed = current;
    }
  } catch (error) {
    evidence.lastUpdateError = String(error);
    if (!active || !installed) { await registry.closeAsync(); evidence.status = 'FAILED'; throw error; }
  }
  await registry.closeAsync();
  evidence.activeRevision = installed!.revision; evidence.status = 'READY'; evidence.elapsedMs = performance.now() - started;
  navigator.storage?.persist?.().then(granted => { evidence.persistentStorageGranted = granted; }).catch(() => {});
  progress('Opening Scripture Discovered…');
}
export function initializeSolidState() { return boot ??= initialize(); }
export function getSolidStateDatabase() { if (!active || evidence.status !== 'READY') throw Error('Verified SDW is not installed'); return active; }
export function readSdwJson(key: string) {
  const db = getSolidStateDatabase();
  // Bounded worker responses avoid the dependency's 1 MB synchronous channel limit.
  const length = db.getFirstSync<{ n: number }>('SELECT bytes AS n FROM sdw_payloads WHERE key=?', key)?.n;
  if (length === undefined) throw Error(`Missing governed SDW payload: ${key}`);
  const parts: string[] = [];
  for (const row of db.getEachSync<{ chunk: string }>('SELECT chunk FROM sdw_chunks WHERE key=? ORDER BY ordinal', key)) parts.push(row.chunk);
  const text = parts.join('');
  if (new TextEncoder().encode(text).length !== length) throw Error(`Incomplete local SDW payload: ${key}`);
  evidence.localReads++; evidence.payloadBytesRead += length;
  return JSON.parse(text);
}
