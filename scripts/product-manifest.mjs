import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { brotliDecompressSync } from 'node:zlib';
const root = 'public/product-app';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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
  const sdw = JSON.parse(fs.readFileSync(`${root}/progressive-manifest.json`));
  assert.equal(sdw.delivery, 'R2_PROGRESSIVE');
  const canonicalHash = sdw.canonicalSourceHash;
  assert.equal(canonicalHash,hash(`${source}/assets/scripture/engwebu.db`));
  const websiteAdapters = Object.fromEntries([...files('product-runtime'), 'scripts/export-product.mjs'].map(p => [p, hash(p)]));
  fs.writeFileSync(manifestPath,JSON.stringify({nativeSourceUnmodifiedByExport:true,sourceFiles:sourceRecords,sourcePackageSha256:hash(`${source}/package.json`),sourceLockSha256:hash(`${source}/package-lock.json`),canonicalDatabaseSha256:canonicalHash,runtimeSemanticCompilation:false,iframeTemporary:true,composition:'ONE_ENGINE_TWO_ROUTE_SURFACES',acceptance:'SEE_WEB_SDW_01B_RECEIPT',websiteAdapters,files:records},null,2));
}
const m=JSON.parse(fs.readFileSync(manifestPath));
for(const [name,entry]of Object.entries(m.files)){assert.equal(hash(`${root}/${name}`),entry.sha256);assert.equal(fs.statSync(`${root}/${name}`).size,entry.bytes);}
console.log(JSON.stringify({artifactIntegrity:'PASS',files:Object.keys(m.files).length,canonicalDatabaseSha256:m.canonicalDatabaseSha256,semanticAcceptance:'NOT_CLAIMED'}));
