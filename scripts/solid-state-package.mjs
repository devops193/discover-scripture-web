// Website-only packaging of existing, governed values. No semantic compilation.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';

const hash = value => createHash('sha256').update(value).digest('hex');
export function buildSolidStatePackage(site, source, stage) {
  const composition = JSON.parse(fs.readFileSync(path.join(site, 'docs/01b-evidence/shared-chunk-composition-before.json')));
  const rows = new Map();
  for (const module of composition.modules) {
    const relative = module.source.replace(/^\/\.\.\/\.\.\/ScriptureDiscovery\//, '').replace(/^\//, '');
    if (!relative.startsWith('assets/') || !relative.endsWith('.json')) continue;
    const original = fs.readFileSync(path.join(source, relative), 'utf8');
    rows.set(relative, { text: original, sourceHash: hash(original) });
  }
  for (const relative of ['src/data/canonical-promoted.generated.ts', 'src/data/discover-search-index.generated.ts']) {
    const original = fs.readFileSync(path.join(source, relative), 'utf8');
    const exports = {};
    const js = ts.transpileModule(original, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(js, { exports }, { timeout: 10000 });
    rows.set(relative, { text: JSON.stringify(exports), sourceHash: hash(original) });
  }
  const ordered = [...rows].sort(([a], [b]) => a.localeCompare(b, 'en'));
  const canonical = path.join(source, 'assets/scripture/engwebu.db');
  const canonicalSha256 = hash(fs.readFileSync(canonical));
  const authoritySha256 = hash(JSON.stringify({ canonicalSha256, sources: ordered.map(([key, row]) => [key, row.sourceHash]) }));
  const metadata = { schema: 'SDW_SQLITE_V1', engineCompatibility: 'SDW_WEB_ENGINE_V1', canonicalSha256, authoritySha256, payloadCount: ordered.length };
  const candidate = path.join(stage, 'sdw.sqlite');
  fs.copyFileSync(canonical, candidate);
  const db = new DatabaseSync(candidate);
  db.exec('CREATE TABLE sdw_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID; CREATE TABLE sdw_payloads (key TEXT PRIMARY KEY, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL) WITHOUT ROWID; CREATE TABLE sdw_chunks (key TEXT NOT NULL, ordinal INTEGER NOT NULL, chunk TEXT NOT NULL, PRIMARY KEY(key,ordinal)) WITHOUT ROWID; BEGIN');
  const insert = db.prepare('INSERT INTO sdw_payloads VALUES (?, ?, ?)');
  const insertChunk = db.prepare('INSERT INTO sdw_chunks VALUES (?, ?, ?)');
  for (const [key, row] of ordered) {
    const bytes = Buffer.from(row.text); insert.run(key, hash(row.text), bytes.length);
    let ordinal = 0;
    for (let start = 0; start < row.text.length;) {
      let end = Math.min(start + 128000, row.text.length);
      const code = row.text.charCodeAt(end - 1);
      if (end < row.text.length && code >= 0xd800 && code <= 0xdbff) end--;
      insertChunk.run(key, ordinal++, row.text.slice(start, end)); start = end;
    }
  }
  const meta = db.prepare('INSERT INTO sdw_metadata VALUES (?, ?)');
  for (const [key, value] of Object.entries(metadata)) meta.run(key, String(value));
  db.exec('COMMIT; VACUUM');
  for (const [key, row] of ordered) assert.equal(db.prepare('SELECT chunk FROM sdw_chunks WHERE key=? ORDER BY ordinal').all(key).map(row => row.chunk).join(''), row.text);
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check, 'ok');
  db.close();
  assert.equal(hash(fs.readFileSync(canonical)), canonicalSha256);
  const bytes = fs.readFileSync(candidate), sha256 = hash(bytes);
  const manifest = { ...metadata, revision: sha256, format: 'sqlite', contentUrl: `/product-app/sdw/${sha256}.sqlite`, bytes: bytes.length, sha256, createdAt: '2026-10-01T00:00:00.000Z' };
  const shims = path.join(stage, 'sdw-shims'); fs.mkdirSync(shims);
  const redirects = {};
  for (const [key, row] of ordered) {
    const shim = path.join(shims, `${hash(key)}.js`);
    fs.writeFileSync(shim, `module.exports = require('../src/website-runtime/solidState').readSdwJson(${JSON.stringify(key)});\n`);
    redirects[path.join(source, key)] = shim;
    redirects[path.join(stage, key)] = shim;
  }
  fs.writeFileSync(path.join(stage, 'sdw-redirects.json'), JSON.stringify(redirects));
  fs.writeFileSync(path.join(stage, 'src/website-runtime/sdwExpected.json'), JSON.stringify(metadata));
  return { candidate, manifest, rows: ordered.map(([key, row]) => ({ key, bytes: Buffer.byteLength(row.text), sha256: hash(row.text), sourceSha256: row.sourceHash })) };
}
