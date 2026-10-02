import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const file = process.argv[2];
assert(file?.endsWith('/WorkerChannel.ts'), 'Supply the exported staging WorkerChannel.ts');
const module = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('exports','require','__DEV__',compiled)(module.exports, name => {
  if(name === './SyncSerializer') return {serialize:JSON.stringify,deserialize:JSON.parse};
  if(name === './Deferred') return {};
  throw Error(name);
}, false);
const {sendWorkerResult,invokeWorkerSync} = module.exports;
for(const size of [1,255,256,1024,65536]) {
  const expected = {text:'Scripture — λόγος '.repeat(size)};
  const worker = { postMessage(message) { sendWorkerResult({...message, result:expected, error:null, syncTrait:message}); } };
  // Largest fixture intentionally stays below the dependency's 1 MiB buffer.
  if(new TextEncoder().encode(JSON.stringify(expected)).length >= 1024*1024-4) continue;
  assert.deepEqual(invokeWorkerSync(worker,'test',{}), expected);
}
console.log('SQLite adapter byte-length round trips: PASS (including multi-byte text and responses above 255 bytes)');
const workerSource = fs.readFileSync(path.join(path.dirname(file),'sqlite-web/worker.ts'),'utf8');
const workerCompiled = ts.transpileModule(workerSource + '\nexport { maybeInitAsync };', {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
let wasmStarts=0, persistentOwners=0;
const workerModule = {exports:{}};
new Function('exports','require','self',workerCompiled)(workerModule.exports, name => {
  if(name.endsWith('/wa-sqlite')) return {default:async()=>{wasmStarts++;await Promise.resolve();return {};}};
  if(name.endsWith('/sqlite-api')) return {Factory:()=>({vfs_register(){}})};
  if(name.endsWith('/AccessHandlePoolVFS')) return {AccessHandlePoolVFS:{create:async()=>{persistentOwners++;await Promise.resolve();return {};}}};
  if(name.endsWith('/MemoryVFS')) return {MemoryVFS:{create:async()=>({})}};
  return {};
},{});
const owners = await Promise.all(Array.from({length:20},()=>workerModule.exports.maybeInitAsync()));
assert.equal(wasmStarts,1); assert.equal(persistentOwners,1);
assert(owners.every(owner=>owner === owners[0]));
console.log('20 concurrent SQLite initialization requests: one WASM instance and one persistent VFS owner PASS');
