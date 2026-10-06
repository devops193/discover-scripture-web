# WEB-SDW-01B release receipt

Status: LOCAL_INTEGRATION_PASS — LIVE_DEPLOYMENT_VERIFICATION_PENDING. The reviewed website release is committed and pushed to the existing production `main` branch. Live acceptance is not claimed. This section supersedes the historical checkpoints below.

Release commit: `70b58acdd49ca6c940d5cdce366eaee6a378a80a` (`Release R2A progressive shared Scripture runtime`). GitHub confirms this is `main`. At 2026-10-02 04:16 UTC, the live site still serves its previous build and `/product-app/progressive-manifest.json` returns 404. GitHub reports no deployment statuses or check runs; its aggregate `pending` with an empty list is not proof that Netlify started a build. The Netlify dashboard requires sign-in, requested from the operator. No Netlify CLI, manual deployment, or deployment-setting change was attempted. Final live smoke tests must wait for the expected revision to appear.

## Current local acceptance

The actual public R2 build passes fresh Discover startup, Genesis chapter traversal, Commander Program/Current/Next/Tree/Queue/Broadcast/return, Back/Forward and both-surface refresh. Completed responsive evidence is retained rather than rerun. Canonical, search, World, DGR, ordinary Compare/Pivot and separate Contradiction authority proofs are reused as listed in the current dual-delivery report. No native Discovery production source is changed.

```ini
WEB_SDW_01B_R2=RELEASE_PENDING
INTEGRATED_RUNNING_APP=PASS
startupHydratedTopicBodies=NO
fullDgrBundleAtStartup=NO
fullRootIndexHydrationAtWorldEntry=NO
publicR1FullPackageBootstrap=NO
canonicalRecordEquivalence=38058/38058
searchEquivalence=102/102
scriptureEngineInstanceCount=1
packetCacheInstanceCount=1
canonicalReaderInstanceCount=1
wholeCanonTransferOnLanding=NO
wholeCanonTransferOnChapterOpen=NO
warmCachedPacketRequests=0
abrahamCompactRootIntegrity=PASS
sceneProgressiveAcquisition=PASS
dgrProgressiveAcquisition=PASS
commanderProgressiveAcquisition=PASS
secondScriptureBootOnCommanderSwitch=NO
duplicateScripturePacketFetchOnCommanderSwitch=NO
productionBuild=PASS
responsiveMatrix=PASS
dependencyReleaseGate=PASS
canonicalScriptureChanged=NO
discoveryProductionRepoMutated=NO
gitCommit=70b58acdd49ca6c940d5cdce366eaee6a378a80a
gitPush=YES
netlifyAutoBuild=UNCONFIRMED
liveSmokeTest=BLOCKED_EXPECTED_REVISION_NOT_LIVE
liveUrl=https://www.dscripture.com/
```

Revision: `52add6f41edc5dd9c21f65f02f933fbd1cec266285bee8bce249607475050398`. Evidence: `01b-evidence/r2a-public-commander.json`, `r2a-public-history.json`, the 14 completed matrix rows/screenshots in `r2a-public-integrated.json`, `r2a-closure-delta.json`, and the reused evidence linked by the dual-delivery report. The historical matrix file's later refresh failure is superseded only by the focused history PASS; its overall verdict was not rewritten.

Final entry is 690,151 Brotli / 3,831,885 decoded bytes. Warm hashed code, worker and WASM transfer zero bytes; warm cached packets make zero requests. Full cold/warm accounting and its measurement limits are in `WEB-SDW-01B-R2-DUAL-DELIVERY-REPORT.md`.

## Historical checkpoints

Current gate: explicit scope approval is needed after two auto-review rejections of legacy NQL/DGR data extraction through the existing packet transport. No rejected patch was applied. Completed private-app World/Scene/Question/Finding/Evidence traversal, repeat reuse, canonical/search and ordinary Compare regression evidence is preserved at candidate `c13fe8799644bf901a011bed7c9c0d587641dae25d13f5f911c50524fda74446`. Private build succeeds, but remaining data/integration/full-product gates prohibit release. See the current gate in `WEB-SDW-01B-R2-DUAL-DELIVERY-REPORT.md` for exact scope, sizes and remaining work.

Latest scoped integration evidence is summarized in `WEB-SDW-01B-R2-DUAL-DELIVERY-REPORT.md`: selected Tree-record delivery, original Presenter output equivalence, lazy Trail metadata/identity equivalence, Reader/Questions bindings and Scene offline-return checks pass. These are not full-product release evidence. Private export only; public startup is not switched. Continue the remaining bounded integration work under the user's updated autonomous rule.

Latest rule supersedes the per-defect stop entries below: bounded R2A integration defects are to be repaired autonomously. The Scene chapter-before-mount boundary now passes the Chrome component/shared-runtime regression, including selected dependency scope, repeat/offline reuse and fail-closed invalid ownership (`01b-evidence/r2a-scene-boundary.json`). Full integrated-product acceptance remains pending. No architecture, authority, content, capability, native-repo, public bootstrap, or release change is claimed.

Current checkpoint: the authorized Discover metadata repair PASSES its scoped React/runtime regression. Initial Discover and all three lens lists make zero topic-body reads/hydrations/acquisitions. Exact 50 subjects, 55-card projection, capabilities/references and 4,640 build-derived Continue labels are preserved. Concurrent/repeated Abraham opens acquire one verified topic packet; the body accessor remains unchanged/fail-closed. Evidence: `01b-evidence/r2a-discover-metadata-regression.json`. This does not certify a complete browser route.

Resuming R2A reproduced the next specific integration defect: `R2A-SCENE-SCRIPTURE-ACQUISITION-BOUNDARY`. Abraham's first Scene card synchronously resolves `Genesis 11:26–32` before its chapter is acquired and throws `SDW_SCRIPTURE_ACQUISITION_REQUIRED`. One selected-chapter acquisition makes the unchanged card pass in the diagnostic control, but no Scene route boundary repair is installed. Evidence: `01b-evidence/r2a-scene-scripture-boundary-defect.json`. Stop before push under the user's defect limit. Candidate revision `3fd5238fd98c3b22d08db4c3d8eb9dca4231d9bd0a47b89745525d9ea8df44b3`; all canonical/search, shared-runtime, Root, and warm-cache adapter checks rerun PASS. R2A/full product remains NOT PASS; no public activation, commit, push or deployment. Native sources unchanged.

R2A current checkpoint: staged seed/graph and DGR progressive initialization checks PASS, accepted Root Projection integrity checks PASS. These are not integrated-running-app acceptance. `INTEGRATED_RUNNING_APP=NOT_YET_VERIFIED`; public R1 bootstrap remains selected; release remains `STOP_BEFORE_PUSH`. See the current R2A section in the dual-delivery report for exact completed/pending scope and metadata byte sizes.

Current authority: `WEB-SDW-01B-R2-DUAL-DELIVERY-ARCHITECTURE.md`; user authorized continuation. R1 below is historical evidence, not R2 acceptance. See `WEB-SDW-01B-R2-DUAL-DELIVERY-REPORT.md`. Public generated output still auto-installs the full package and is NOT R2 releaseable. STOP BEFORE PUSH until progressive runtime and all R2 gates pass.

R2 checkpoint: canonical reader/search adapter and real-browser cache/reader checks PASS within their explicitly limited scope. Full progressive application integration, A–F measurements, production rebuild, responsive matrix and release gates remain PENDING. No commit, push or deployment. Discovery source remains read-only.

## Historical R1 checkpoint (superseded)

User requested a safe pause pending R2. No further R1 implementation, verification or publication should run until directed. Website-only edits and generated artifacts are preserved. The final successful-update proxy test was interrupted at pause; it is not PASS evidence. Earlier failure/warm-reuse evidence remains available. No commit or push was performed.

Implemented: executable/data separation, one immutable SQLite world, content-addressed manifest, existing VFS reuse, hash/length/authority verification, atomic active pointer, previous-revision retention, honest measured install progress.

Verified so far:

- Exact payload packaging and independent deterministic rebuild: PASS (260 payloads).
- Cold installation and warm local reuse: PASS.
- Warm SDW package request/transfer: 0 requests / 0 bytes.
- Commander switch: same engine identity, zero network transfer.
- Interrupted/truncated/hash-invalid first install: fails closed.
- Corrupt update: previous verified revision remains usable.
- Seven responsive sizes × two interfaces: PASS on preceding transport build; final adapter rerun pending.
- Website production build: PASS; final build rerun pending.
- Native canonical database/source: not edited by this task.

Still required before commit/push: successful revision replacement and retention verification; offline Scene/Dissect/Compare/Pivot/Return and Commander Scripture operations; final artifact/source checks, responsive/pricing tests, usage model and isolated transfer measurements. Live production verification necessarily follows the authorized GitHub → Netlify release path only after local gates pass.

No census work, source-authority changes, Netlify CLI deployment, alternate hosting or second Scripture engine is authorized or used.
