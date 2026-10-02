# WEB-SDW-01B — investigation checkpoint, not release acceptance

Status: **IN_PROGRESS — GOVERNED_DATA_RUNTIME_BINDING_PENDING**. Updated 2026-10-01.

The user's latest instruction supersedes the earlier permission to defer chapter transport: initial application startup must not require the complete Scripture corpus, and one chapter must not trigger a whole-canon transfer. No commit, push, or deployment has occurred. The existing production site is unchanged.

## Cache investigation

Browser cache was explicitly enabled with `Network.setCacheDisabled({cacheDisabled:false})`. There was no request interception, cache-busting query string, service worker, artificial throttling, or disabled-cache DevTools setting. `measure-transfer.mjs` now records the Network domain in the page **and dedicated SQLite workers**, including encoded wire bytes, status, cache source, and response headers. A cached HTTP 200 is distinguished from a network HTTP 200.

The original application baseline measured 32,151,391 cold bytes / 30 requests, 19,952,114 warm bytes / 28 requests, and zero new requests on surface switching. See `01b-evidence/baseline.json`. That first full measurement combined page CDP events with Playwright sizes for worker requests absent from the page session; the later instrument observes worker Network events directly. The earlier `transfer.json` omitted worker traffic and is superseded, not a complete baseline.

The preserved 01A export was separately reproduced and fetched under Next's original public-file policy. This was a **cache-policy reproduction**, not a second historical application measurement. All three reads (cold, same-page warm, after-reload warm) returned network HTTP 200, `fromDiskCache=false`, no cache-hit event, `Cache-Control: public, max-age=0`, and 19,935,101 transferred bytes for a 19,934,720-byte gzip file. Therefore the approximately 20 MB repeat transfer is real, not decoded-size reporting or disabled caching. See `01b-evidence/original-cache-reproduction.json`.

After website-only Brotli transport and immutable headers, with the original stable single-bundle runtime restored:

| Measured phase | Requests observed | Wire bytes |
| --- | ---: | ---: |
| Cold application load | 24 | 18,140,687 |
| Normal same-context warm reload | 21 | 13,287 |
| Switch to Commander | 0 | 0 |
| Explicit warm fetch of seven major hashed assets | 7 | 14,511,847 |

The last row is deliberately separate from app loading. Six assets hit cache; the large entry file did **not**. Normal reload reused the script resource, but a fetch of the same immutable URL retransferred its entire body. This disproves a broad claim that immutable headers alone fix every warm path. Oversized fetch/resource behavior must be addressed through data separation and smaller resources; no browser-wide size threshold is claimed from this one environment.

Major assets, from `01b-evidence/architecture-before.json` (the filename means *before governed-data runtime migration*, after compression/cache work):

| Asset | Cold encoded wire bytes | Normal warm result | Policy |
| --- | ---: | --- | --- |
| Application entry | 14,511,847 | HTTP 200, cache event, zero bytes | one year, immutable |
| SQLite worker JS | 33,648 | no Network event observed; explicit fetch probe cache hit | one year, immutable |
| SQLite WASM | 305,450 | HTTP 200, cache event, zero bytes | one year, immutable |
| Complete WEBU database | 2,183,365 | not requested (already persisted); explicit fetch probe cache hit | one year, immutable |
| Three fonts | 646,719 combined | HTTP 200, cache events, zero bytes | one year, immutable |

The complete database is still 10,420,224 decoded bytes. Compression does not satisfy the no-whole-corpus startup requirement. The bootstrap/index revalidate; cache policies for the unchanged lower-page content were not altered. These are local Chromium production-preview measurements, not live-site or cross-browser acceptance. A Chrome DevTools MCP connector was unavailable; the web-performance skill's dedicated trace audit was not claimed.

## Dominant shared-chunk import composition

Source-map analysis of the route-splitting experiment's common chunk, with exact-value matching for Metro JSON modules that lack VLQ mappings:

| Category | Decoded bytes |
| --- | ---: |
| Scripture Tree data | 66,406,876 |
| DGR data | 31,608,218 |
| Generated canonical content / search index | 19,527,586 |
| Other JSON | 1,623,216 |
| Code, wrappers and remaining modules | 2,324,431 |
| Total | 121,490,327 |

Approximately **98.1% is data**. The full per-module/source accounting is `01b-evidence/shared-chunk-composition-before.json`. Largest sources include `canonical-promoted.generated.ts` (14,961,849 bytes), `compare-v3.json` (7,089,930), `discover-search-index.generated.ts` (4,565,737), and the Tree/DGR subject, book, question-contract, and scene packages. Merely deferring screens cannot remove this payload from the common chunk.

Route splitting produced `Requiring unknown module "962"` in the SQLite worker: the experiment hoisted worker dependencies into a page-only common chunk. It is **disabled**. The restored product export is the verified single-root composition. No screen/function removal is part of this work.

Before versus current deployed-candidate composition: the entry remains **125,001,033 decoded bytes**. Its transport changed from approximately 19.93 MB gzip to 14.51 MB Brotli; governed data has **not yet been removed from the active JavaScript**. There is no post-migration application-byte result to report yet.

## Inactive transport prototype — exact evidence, not runtime acceptance

`scripts/compile-governed-web-data.mjs` reads native authorities read-only and writes hash-addressed candidates into ignored `.product-build-transport`, outside the publish directory:

- 81 Book roots, 1,402 chapters, all 38,058 verse records. Exact values and order are checked, including omitted verses and `source_line`.
- 258 existing governed JSON packages retain their exact source bytes and embedded authority/hash fields.
- All 50 approved canonical subject records preserve exact values and order.
- The existing 4,775-record search index is packaged separately; no search records are authored or reinterpreted.
- The WEBU database authority remains `f9dfbce6dd2edfe4bb3b4690acd6622f392035be2b0349df98f3607f0a05f6c2`.

The candidate's root + Genesis book index + Genesis 12 total **85,192 decoded bytes / 14,136 Brotli bytes**. These are artifact sizes, **not app transfer measurements**. Chapter is exclusively a transport/cache unit, not a new semantic boundary.

`product-runtime/immutableTransport.mjs` is an inactive asynchronous adapter. Its tests prove three scoped reads (root/book/chapter), zero extra reads across twenty concurrent repeats, stable returned identity, no request for unknown/malformed addresses, rejection of corruption and wrong authority, and no whole-canon asset request. There is no second database/storage provider. The adapter is not installed into the app. See `transport-candidate.json` and `transport-adapter-tests.json`.

## Required continuation

Do not repeat accepted source compilation or reconstruct canonical evidence. Reuse this candidate and the active governed source hashes.

1. Introduce explicit asynchronous scope hydration **before** the existing synchronous selectors/reader execute. Do not implement main-thread synchronous network requests, return partial/empty data as a loading fallback, or make a second engine/provider.
2. Replace eager approved-content catalog construction with a hash-bound metadata catalog plus scoped subject hydration. `content-channel.ts` and `ActiveGraphProvider.approvedBaseline()` currently eagerly enumerate full topics; preserve their capability results and revision identity.
3. Bind existing Tree/DGR JSON import seams to the scoped immutable transport while retaining every accepted internal hash, identity, membership, order, citation, and capability gate. Existing generated loader functions are lazy in *evaluation*, but currently eager in *network delivery* because their payloads are bundled.
4. Bind the canonical reader to root/book/chapter hydration. Its current `initializeCanonicalCorpus()` imports the full database and its consumers are synchronous. Changing a URL without addressing that contract is not a valid migration. Preserve cross-chapter citations and full search capability with explicitly scoped loading.
5. Remove the large data literals and complete-database boot from the active export only after the consuming paths are integrated. Test failures, cold/warm loading, integrity rejection, chapter scope, repeat chapter, another book, multi-chapter citation, World, Commander/program, Back/Forward/refresh, and all seven viewport sizes.
6. Record actual post-migration byte composition and wire traffic using the same instrumentation. Do not substitute prototype sizes for measurements. Only then reconsider release through the authorized existing GitHub → Netlify path.

## Current verification and release verdict

- Existing shared engine/storage identity, one canonical boot, World + chapter, mode/context retention, Back/Forward/refresh: PASS.
- Existing fourteen interface/viewport checks and seven pricing-strip sizes: PASS.
- SQLite response lengths and twenty concurrent WASM/VFS initializations: PASS.
- Export artifact integrity: PASS. All 320 native source files match their export pins; this task did not mutate native Discovery or Census.
- Next production build: PASS after the website-only same-major Next 16.3.8 security update. Production dependency audit: zero findings. No full development-dependency security clearance is claimed.
- Normal warm reload improvement: demonstrated. All-warm-path cache acceptance: **NOT COMPLETE**.
- No whole-corpus initial load: **FAIL in the active candidate**.
- Chapter-scoped application transport: **NOT IMPLEMENTED**; isolated prototype passes only.
- Post-migration equivalence / byte matrix: **PENDING**.
- Commit / push / Netlify deploy / live smoke: **NOT ATTEMPTED**.

The original R2 receipt's lower-page pricing-source discrepancy remains a separate release-review item; lower-page pricing content was not changed here. No native physical-security or production security acceptance is claimed.
