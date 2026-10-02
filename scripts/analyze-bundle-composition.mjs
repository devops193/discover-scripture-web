import fs from 'node:fs';
import path from 'node:path';
import { TraceMap, originalPositionFor, GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND } from '@jridgewell/trace-mapping';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const directory=process.argv[2] || '/private/tmp/web-sdw-01b-composition/_expo/static/js/web';
const filename=fs.readdirSync(directory).find(name=>name.startsWith('__common-')&&name.endsWith('.js'));
const bytes=fs.readFileSync(path.join(directory,filename));
const rawMap=JSON.parse(fs.readFileSync(path.join(directory,filename+'.map'),'utf8'));
const map=new TraceMap(rawMap);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const jsonSources=new Map(rawMap.sources.flatMap((source,i)=>source.endsWith('.json')?[[hash(JSON.parse(rawMap.sourcesContent[i])),source]]:[]));
const groups={}; const modules=[];
const lines=bytes.toString().split('\n');
for(const [index,line] of lines.entries()) {
  const position=originalPositionFor(map,{line:index+1,column:100,bias:GREATEST_LOWER_BOUND});
  let source=position.source || originalPositionFor(map,{line:index+1,column:0,bias:LEAST_UPPER_BOUND}).source || 'unmapped';
  // Metro JSON factories have source entries but no VLQ mappings. Associate
  // them by exact serialized value, never by guessed module/line ordering.
  if(source==='unmapped' && /^__d\(function\([^)]*\)\{\w+\.exports=/.test(line)) {
    let value;
    vm.runInNewContext(line,{__d(factory,id,deps){assert.equal(deps.length,0);const module={exports:{}};factory(undefined,undefined,undefined,undefined,module,module.exports,[]);value=module.exports;}});
    source=jsonSources.get(hash(value)) || 'unmapped generated value';
  }
  const category=/assets\/scripture-tree/.test(source)?'Tree data':/assets\/dgr/.test(source)?'DGR data':/canonical-promoted|approved|search.*generated|generated.*search/i.test(source)?'Generated canonical/search data':/\.json$/.test(source)?'Other JSON data':'Code and other modules';
  const size=Buffer.byteLength(line)+(index<lines.length-1?1:0);
  groups[category]=(groups[category]||0)+size;
  modules.push({source,category,bytes:size,moduleId:line.match(/\},(\d+),\[/)?.[1]});
}
assert.equal(Object.values(groups).reduce((sum,size)=>sum+size,0),bytes.length);
const result={artifact:filename,decodedBytes:bytes.length,gzipBytes:gzipSync(bytes,{level:9}).length,brotliBytes:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:8}}).length,method:'Source-map attribution of each Metro module line; wrapper/newline bytes included; groups are decoded bytes, not additive compression estimates',groups,modules:modules.sort((a,b)=>b.bytes-a.bytes)};
fs.writeFileSync('docs/01b-evidence/shared-chunk-composition-before.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,modules:result.modules.slice(0,12)},null,2));
