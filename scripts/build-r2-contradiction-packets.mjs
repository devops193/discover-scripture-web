import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Read the canonical registry unchanged. Attachments discover records; they
// never transfer ownership to a subject, ordinary Compare, NQL or DGR.
export function readContradictionSources(source) {
  const sources = {}, modules = new Map();
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  function load(file) {
    if (!fs.existsSync(file)) file += '.ts';
    assert.ok(file.startsWith(path.join(source, 'src/data') + path.sep));
    if (modules.has(file)) return modules.get(file);
    const bytes = fs.readFileSync(file); sources[path.relative(source, file)] = hash(bytes);
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(bytes.toString(), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
    } }).outputText, { module, exports: module.exports, process: { env: { EXPO_PUBLIC_CONTENT_CHANNEL: 'live' } }, require: name => {
      assert.ok(name.startsWith('.')); return load(path.resolve(path.dirname(file), name));
    } });
    modules.set(file, module.exports); return module.exports;
  }
  const native = load(path.join(source, 'src/data/contradictions/index.ts'));
  const records = JSON.parse(JSON.stringify(native.contradictions));
  assert.equal(new Set(records.map(row => row.id)).size, records.length);
  return { records, native, sources, authorityHash: hash(JSON.stringify(records)), sourceHash: hash(JSON.stringify(sources)) };
}
export function writeContradictionPackets(input, revision, write) {
  const rows = input.records.map(record => ({
    id: record.id, title: record.title, classification: record.classification,
    anchors: record.anchors, references: record.evidence.map(item => item.reference),
    packet: write({ schema: 'SDW_CONTRADICTION_RECORD_V1', revision,
      sourceHash: input.sourceHash, authorityHash: input.authorityHash, id: record.id, record }),
  }));
  return write({ schema: 'SDW_CONTRADICTION_ATTACHMENT_INDEX_V1', revision,
    sourceHash: input.sourceHash, authorityHash: input.authorityHash, rows });
}
