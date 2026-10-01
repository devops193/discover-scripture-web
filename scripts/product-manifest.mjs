import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = 'public/product-app';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]).sort(); }
const manifestPath = `${root}/build-manifest.json`;
if (process.argv.includes('--write')) {
  const source = process.env.DISCOVERY_SOURCE || '../ScriptureDiscovery';
  const records = Object.fromEntries(files(root).filter(p=>p!==manifestPath).map(p=>[p.slice(root.length+1),{sha256:hash(p),bytes:fs.statSync(p).size}]));
  const sourceRecords = Object.fromEntries(files(`${source}/src`).map(p=>[p.slice(source.length+1),hash(p)]));
  const db = files(root).find(p=>p.endsWith('.db'));
  assert(db); assert.equal(hash(db),hash(`${source}/assets/scripture/engwebu.db`));
  fs.writeFileSync(manifestPath,JSON.stringify({nativeSourceUnmodifiedByExport:true,sourceFiles:sourceRecords,sourcePackageSha256:hash(`${source}/package.json`),sourceLockSha256:hash(`${source}/package-lock.json`),canonicalDatabaseSha256:hash(db),runtimeSemanticCompilation:false,iframeTemporary:true,acceptance:'NOT_ACCEPTED_COMMANDER_RELEASE_GATE',files:records},null,2));
}
const m=JSON.parse(fs.readFileSync(manifestPath));
for(const [name,entry]of Object.entries(m.files)){assert.equal(hash(`${root}/${name}`),entry.sha256);assert.equal(fs.statSync(`${root}/${name}`).size,entry.bytes);}
console.log(JSON.stringify({artifactIntegrity:'PASS',files:Object.keys(m.files).length,canonicalDatabaseSha256:m.canonicalDatabaseSha256,semanticAcceptance:'NOT_CLAIMED'}));
