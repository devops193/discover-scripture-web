import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const root = 'public/product-app';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashObject = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]).sort(); }
const manifestPath = `${root}/build-manifest.json`;
if (process.argv.includes('--write')) {
  const source = process.env.DISCOVERY_SOURCE || '../ScriptureDiscovery';
  const records = Object.fromEntries(files(root).filter(p=>p!==manifestPath).map(p=> {
    const encoded = /\.(db|sqlite)$/.test(p) || p.includes('/_expo/static/js/web/') && p.endsWith('.js');
    const decoded = encoded ? brotliDecompressSync(fs.readFileSync(p)) : fs.readFileSync(p);
    return [p.slice(root.length+1),{sha256:hash(p),bytes:fs.statSync(p).size,contentEncoding:encoded?'br':'identity',decodedBytes:decoded.length,decodedSha256:createHash('sha256').update(decoded).digest('hex')}];
  }));
  const sourceRecords = Object.fromEntries(files(`${source}/src`).map(p=>[p.slice(source.length+1),hash(p)]));
  const sourceInputs = Object.fromEntries(['docs/discover-next/DISCOVER-NEXT-01-GATE-B-ABRAHAM-DATA.json'].map(p=>[p,hash(`${source}/${p}`)]));
  const sourcePackageSha256 = hash(`${source}/package.json`);
  const sourceLockSha256 = hash(`${source}/package-lock.json`);
  const sdw = JSON.parse(fs.readFileSync(`${root}/progressive-manifest.json`));
  assert.equal(sdw.delivery, 'R2_PROGRESSIVE');
  const canonicalHash = sdw.canonicalSourceHash;
  assert.equal(canonicalHash,hash(`${source}/assets/scripture/engwebu.db`));
  const exportScripts = files('scripts').filter(p => /\/(?:export-product|prepare-r2-public-candidate|product-manifest|progressive-[^/]+|build-r2-scene-contexts|solid-state-package)\.mjs$/.test(p));
  const websiteAdapters = Object.fromEntries([...files('product-runtime'), ...exportScripts].map(p => [p, hash(p)]));
  const sourceSnapshotSha256 = hashObject({sourceFiles:sourceRecords,sourceInputs,sourcePackageSha256,sourceLockSha256});
  const provenance = {
    sourceCommit: execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    buildIdentity: sdw.revision,
    sourceSnapshotSha256,
    artifactSha256: hashObject(records),
    destinationPath: root,
    destinationAbsolutePath: path.resolve(root),
  };
  fs.writeFileSync(manifestPath,JSON.stringify({nativeSourceUnmodifiedByExport:true,sourceFiles:sourceRecords,sourceInputs,sourcePackageSha256,sourceLockSha256,canonicalDatabaseSha256:canonicalHash,runtimeSemanticCompilation:false,iframeTemporary:true,composition:'ONE_ENGINE_TWO_ROUTE_SURFACES',acceptance:'SEE_WEB_SDW_01B_RECEIPT',provenance,websiteAdapters,files:records},null,2));
}
const m=JSON.parse(fs.readFileSync(manifestPath));
for(const [name,entry]of Object.entries(m.files)){assert.equal(hash(`${root}/${name}`),entry.sha256);assert.equal(fs.statSync(`${root}/${name}`).size,entry.bytes);}
assert.equal(m.provenance.artifactSha256,hashObject(m.files));
assert.equal(m.provenance.destinationPath,root);
assert.equal(m.provenance.destinationAbsolutePath,path.resolve(root));
assert.equal(m.provenance.buildIdentity,JSON.parse(fs.readFileSync(`${root}/progressive-manifest.json`)).revision);
console.log(JSON.stringify({artifactIntegrity:'PASS',files:Object.keys(m.files).length,canonicalDatabaseSha256:m.canonicalDatabaseSha256,provenance:m.provenance,semanticAcceptance:'NOT_CLAIMED'}));
