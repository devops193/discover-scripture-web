// Local public-build preparation only. This does not publish or waive release gates.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const build=JSON.parse(fs.readFileSync('docs/01b-evidence/r2-private-export.json'));
const proof=JSON.parse(fs.readFileSync('docs/01b-evidence/r2-projection-candidate.json'));
assert.equal(build.revision,proof.revision);
const revision=proof.revision, seen=new Map();
function visit(value) {
  if (!value || typeof value!=='object') return;
  if (value.revision===revision && typeof value.sha256==='string' && typeof value.bytes==='number' && typeof value.url==='string') {
    assert.match(value.sha256,/^[a-f0-9]{64}$/);
    assert.equal(value.url,`/sdw/${revision}/${value.sha256}.json`);
    if (seen.has(value.sha256)) return;
    const file=path.join(build.packetRoot,`${value.sha256}.json`),bytes=fs.readFileSync(file);
    assert.equal(bytes.length,value.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'),value.sha256);
    seen.set(value.sha256,file); visit(JSON.parse(bytes)); return;
  }
  for (const child of Object.values(value)) visit(child);
}
visit(proof.manifest);
assert.ok(seen.size>64000,'Complete reachable packet closure required');
const backup=fs.mkdtempSync(path.resolve('.product-build-public-backup-'));
if(fs.existsSync('public/product-app'))fs.renameSync('public/product-app',path.join(backup,'product-app'));
fs.cpSync(build.output,'public/product-app',{recursive:true});
const destination=path.resolve('public/sdw',revision); fs.mkdirSync(destination,{recursive:true});
for(const [hash,file] of seen)fs.copyFileSync(file,path.join(destination,`${hash}.json`));
fs.writeFileSync('public/product-app/progressive-manifest.json',JSON.stringify({delivery:'R2_PROGRESSIVE',revision,
  canonicalSourceHash:proof.canonicalSourceHash,manifest:proof.manifest,packetCount:seen.size}));
fs.writeFileSync('docs/01b-evidence/r2-public-candidate.json',JSON.stringify({status:'LOCAL_CANDIDATE_NOT_RELEASED',revision,
  packetCount:seen.size,privateBuild:build.output,backup,publicR1FullPackageBootstrap:false,pushed:false},null,2)+'\n');
console.log({revision,packets:seen.size,backup,release:'NOT_AUTHORIZED_BY_THIS_SCRIPT'});
