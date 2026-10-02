# Shared chunk composition — R2 checkpoint

The dominant shared chunk contains governed data, not predominantly executable UI. Route splitting alone cannot resolve the architecture.

Source-map attribution for `__common-2a2a83ac31582a00a5e4c9ba202668b0.js`:

| Category | Decoded bytes |
| --- | ---: |
| Tree data | 66,406,876 |
| DGR data | 31,608,218 |
| Generated canonical/search data | 19,527,586 |
| Other JSON | 1,623,216 |
| Code and other modules | 2,324,431 |
| Total | 121,490,327 |

Compression of that exact artifact: gzip 19,261,088 bytes; Brotli 14,011,034 bytes. These are artifact sizes, not measured transfer. Per-module details and hashes are in `01b-evidence/shared-chunk-composition-before.json`. Largest contributors include promoted canonical content (14,961,849), ordinary Compare (7,089,930), generated search index (4,565,737), and frozen Question contracts (3,865,187 decoded bytes). Framework, third-party and UI portions of the remaining code are not separately attributed yet; do not label the entire remainder as framework.

The original 01A custom gzip transport was independently reproduced with DevTools caching enabled and no routing interception. Its 19,934,720-byte body transferred 19,935,101 bytes on cold fetch, warm same-page fetch, and reload. Each response was HTTP 200, diskCache=false, `Cache-Control: public, max-age=0`, `Content-Type: application/gzip`. This is a cache-policy reproduction of the preserved build, not a claim of a new historical full-app measurement. See `01b-evidence/original-cache-reproduction.json`.

The intermediate R1 export reduced its executable entry to 5,873,129 decoded / 930,848 Brotli bytes, but required a 146,575,360-byte full SQLite package (16,253,806 Brotli). It therefore fails R2's no-whole-world-startup gate. R1's extracted 260 payloads are not proof that all World metadata has left every route chunk.

## Final R2 artifacts and integrated transfer

The final public entry is **3,831,885 decoded / 690,151 Brotli bytes**. Its lazy index chunk is 45,532 decoded / 14,126 Brotli bytes; the SQLite worker is 132,818 decoded / 33,214 Brotli bytes. WASM is 621,492 decoded bytes (304,773 gzip body bytes measured locally). These final artifact totals are not a new per-module source-map attribution, and should not be described as pure framework/UI code.

Immutable canonical, Tree, DGR, owner, search and Contradiction payloads are in revision-scoped packets rather than the former aggregate imports. The final public closure contains 72,808 packets; the browser does not download that closure on startup. Fresh startup acquires five compact metadata packets totaling 1,837,997 decoded bytes, zero chapter/topic/Question bodies. Exact accepted canonical and semantic comparisons are retained, not replaced by bundle-size claims.

Actual public-build measurements and per-asset headers/status/cache source are in `01b-evidence/r2a-public-history.json` and `r2a-public-commander.json`. Warm cached-packet requests are zero; hashed application code, worker and WASM transfer zero bytes. No canonical SQLite or full-SDW package transfer occurs. See `WEB-SDW-01B-R2-DUAL-DELIVERY-REPORT.md` for page-versus-worker measurement boundaries and the final cold/warm table. Production live verification remains separately gated by the release receipt.
