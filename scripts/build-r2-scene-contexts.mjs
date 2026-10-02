import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Website-only transport projection of existing generated owner loaders. The
// generated native modules and their semantic consumers remain authoritative.
export const OWNER_REGISTRIES = [
  ['nql', 'src/c3/nql/snapshot.generated.ts', 'nqlTopicLoaders', 'activeNqlSnapshotManifest'],
  ['crosswalk', 'src/c3/nql/crosswalk.generated.ts', 'nqlCrosswalkSubjectLoaders', 'activeNqlCrosswalkManifest'],
  ['questionActive', 'src/data/questions/active.generated.ts', 'activeQuestionPackLoaders'],
  ['questionCanary', 'src/data/questions/canary.generated.ts', 'canaryQuestionPackLoaders'],
  ['dgrOwned', 'src/dgr/registry.generated.ts', 'dgrBundleLoaders'],
];
export function readOwnerSources(source) {
  const sources = {}, families = {};
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  function read(file) { const bytes = fs.readFileSync(file); sources[path.relative(source, file)] = digest(bytes); return bytes; }
  for (const [family, relative, exportName, manifestName] of OWNER_REGISTRIES) {
    const file = path.join(source, relative), module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(read(file).toString(), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
    } }).outputText, { module, exports: module.exports, require: name => {
      const target = path.resolve(path.dirname(file), name);
      assert.ok(target.startsWith(path.join(source, 'assets') + path.sep) && target.endsWith('.json'));
      return JSON.parse(read(target));
    } });
    const owners = {};
    for (const [owner, loader] of Object.entries(module.exports[exportName])) {
      const value = typeof loader === 'function' ? loader() : loader.load();
      const { load, ...identity } = typeof loader === 'function' ? {} : loader;
      if (family === 'nql' || family === 'crosswalk') {
        assert.equal(value.subjectId, owner);
        assert.equal(value.snapshotId, module.exports[manifestName].snapshotId);
      }
      if (family.startsWith('question')) { assert.equal(value.topicId, owner); assert.equal(value.packId, identity.packId); }
      if (family === 'dgrOwned') assert.equal(value.manifest.subjectId, owner);
      owners[owner] = { identity, value };
    }
    families[family] = { manifest: manifestName ? module.exports[manifestName] : null, owners };
  }
  // The existing Discover search index is a derived navigation/search artifact,
  // not Scripture authority. Keep its exact rows/hash; load it only on search.
  const searchFile = path.join(source, 'src/data/discover-search-index.generated.ts');
  const searchModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read(searchFile).toString(), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, { module: searchModule, exports: searchModule.exports, require: name => { throw Error(`Unexpected search index dependency:${name}`); } });
  families.discoverSearch = { manifest: { indexHash: searchModule.exports.DISCOVER_SEARCH_INDEX_HASH },
    owners: { index: { identity: {}, value: searchModule.exports.discoverSearchRecords } } };
  return { families, sources, sourceHash: digest(JSON.stringify(sources)) };
}
export function writeOwnerPackets(input, revision, write) {
  const families = {}, counts = {};
  for (const [family, data] of Object.entries(input.families)) {
    const owners = {};
    for (const [owner, { identity, value }] of Object.entries(data.owners)) {
      const packet = { schema: 'SDW_GOVERNED_OWNER_V1', revision, sourceHash: input.sourceHash, family, owner, value };
      // JSON is the transport, never a substitute semantic representation.
      assert.deepEqual(JSON.parse(JSON.stringify(packet)).value, JSON.parse(JSON.stringify(value)));
      owners[owner] = { identity, packet: write(packet) };
    }
    families[family] = { manifest: data.manifest, owners }; counts[family] = Object.keys(owners).length;
  }
  return { descriptor: write({ schema: 'SDW_GOVERNED_OWNER_INDEX_V1', revision, sourceHash: input.sourceHash, families }), counts };
}

/** Execute the two existing Scene context selectors at build time. The retired
 * beta answer bundles are not needed to draw a Scene or identify its place. */
export function buildSceneContexts(source, topics, coordinates) {
  const file = path.join(source, 'src/dgr-production/runtime.ts');
  const sources = {}, digest = bytes => createHash('sha256').update(bytes).digest('hex');
  function read(file) { const bytes = fs.readFileSync(file); sources[path.relative(source, file)] = digest(bytes); return bytes; }
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read(file).toString(), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText, { module, exports: module.exports, process: { env: {} }, require: name => {
    assert.ok(name.startsWith('../../assets/dgr/') && name.endsWith('.json'), `Unexpected Scene context import ${name}`);
    return JSON.parse(read(path.resolve(path.dirname(file), name)));
  } });
  const { getDgrReaderSceneContext, getDgrCurrentScenePlace } = module.exports;
  const ownerCoordinates = new Map();
  for (const coordinate of coordinates.coordinates) if (!ownerCoordinates.has(`${coordinate.subjectId}:${coordinate.sceneId}`))
    ownerCoordinates.set(`${coordinate.subjectId}:${coordinate.sceneId}`, coordinate);
  const rows = [];
  for (const topic of Object.values(topics)) {
    const anchors = JSON.parse(read(path.join(source, `assets/c3/scene-anchors/${topic.id}.json`)));
    for (const passage of topic.passages) {
      const coordinate = ownerCoordinates.get(`${topic.id}:${passage.id}`);
      assert.ok(coordinate, `Missing accepted Scene owner ${topic.id}/${passage.id}`);
      const anchorMetadata = anchors.scenes[passage.id]; assert.ok(anchorMetadata);
      const readerContext = getDgrReaderSceneContext(topic.id, passage.id);
      const currentPlace = readerContext ? getDgrCurrentScenePlace({ subjectId: topic.id, sceneId: passage.id,
        dgrAnchorId: readerContext.context.anchorId, dgrReaderSceneContext: readerContext.context,
        dgrSceneLineage: readerContext.lineage }) : undefined;
      rows.push({ subjectId: topic.id, sceneId: passage.id,
        owner: { bookId: coordinate.bookId, chapter: coordinate.chapter, sceneHash: coordinate.sceneHash },
        anchorMetadata, readerContext: readerContext ?? null, currentPlace: currentPlace ?? null });
    }
  }
  assert.equal(rows.length, 4640); assert.equal(new Set(rows.map(r => r.sceneId)).size, rows.length);
  return { rows, sources, sourceHash: digest(JSON.stringify(sources)) };
}
