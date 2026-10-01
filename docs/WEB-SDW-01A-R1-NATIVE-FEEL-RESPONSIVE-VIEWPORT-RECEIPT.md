# WEB-SDW-01A / R1 — website integration receipt

## Verdict

`WEB_SDW_01A_R1 = FAIL` — implementation checkpoint, **not production-ready**.
Stop for scoped review. Do not deploy this branch or claim the two-product acceptance gate passes.

## Repository and scope

The live site was inspected at https://www.dscripture.com/. Its ministry-first header, page sections, images and published prices match the separate `devops193/discover-scripture-web` repository at baseline `854f2cd85a312d15298b5b98b494ab120316e8f0`. GitHub main was checked directly. The older nested `ScriptureDiscovery/website` checkout was not used or modified.

All implementation changes are website-owned. Existing unrelated untracked website files are excluded from this commit. No Discovery production source, authority, content, registry, gate, or Census artifact was edited. Census R1 remains paused. GitHub commit/push is authorized; production deployment is not performed.

## Implemented

- Reusable ProductViewport directly below the preserved site header, with existing lower content retained.
- Full-width dynamic phone/tablet height, measured header height, safe-area treatment, stable loading/error states, keyboard-accessible product tabs and a compact mobile header retaining every original link.
- Product query state supports direct links, browser navigation and refresh. Runtime release failures display an unavailable state instead of mislabeling Discover as Commander.
- Actual Expo application exported in isolated website staging, not a replacement UI. Source files are copied for correct router contexts; source assets/contracts are read-only build inputs.
- Website-only React DOM isolation and a bounded ten-second SQLite worker deadline adapter. The upstream iteration-count deadline was timing out on modern Chromium. Canonical database validation remains intact.
- Losslessly compressed 125 MB generated entry bundle (approximately 38 MB total exported artifacts). No semantic content was dropped. The startup loader uses browser gzip decompression; this is temporary proof infrastructure, not the preferred permanent native mount.
- One mounted product document at a time: simultaneous iframes provably collided on SQLite OPFS exclusive access handles. In-memory inactive navigation is not preserved. The sequential-mount attempt still failed repeated database reopen tests; storage continuity is **not accepted**. A website error overlay suppresses the known canonical-unavailable fallback instead of presenting it as successful canonical operation.
- Corrected pre-existing invalid paragraph/dialog nesting without changing lower-page text.

## Evidence and remaining gates

`npm run build:netlify` passes compilation, TypeScript, and production page generation. `npm run verify:product-artifacts` verifies all exported files and byte-identical canonical WEBU database SHA-256 `f9dfbce6dd2edfe4bb3b4690acd6622f392035be2b0349df98f3607f0a05f6c2`. `public/product-app/build-manifest.json` records source and artifact hashes; it is not semantic acceptance evidence.

Browser evidence is in `docs/viewport-evidence/`: seven required geometries, two product selections each, screenshots and machine results. Testing uses local desktop Chromium, not physical iOS/Android hardware. Browser chrome, physical safe areas, complete screen-reader behavior, all deep Scene/World/Trail interactions and all Presenter sheets are not certified.

Confirmed blockers:

0. The final repeated-switch matrix reports SQLite `sqlite3_open_v2`, finalization and canonical-import failures even after sequential mounting. The canonical database file is byte-identical; browser storage lifecycle is not reliable. Fixing this needs a proper web storage/runtime boundary, not a longer delay or weaker canonical checks. First isolated Discover startup was observed, but repeated-use acceptance fails.

1. `getDigitalAltarFeatureGates()` in existing native `src/digital-altar/featureFlags.ts` disables Digital Altar outside development. Commander’s existing `status === 'HIDDEN'` route handling redirects to `/`. Exporting a release build therefore cannot mount Commander. That gate has **not** been bypassed. A scoped website CE release/development-channel decision is required.
2. Existing Commander source deliberately exposes a planner guidance surface below 768 px instead of its tablet console. No phone console implementation or capability removal was invented.
3. Visual review found native bottom-tab labels clipped at the smallest phone geometry. Zero horizontal overflow is not proof of zero clipped controls.
4. Some native icon circles are blank on web. Native web icon parity and complete interaction/a11y review remain open.
5. The temporary iframe document boundary, repeated product startup, large initial bundle, and inactive in-memory state loss require further work before native-feel acceptance. The existing repository has dependency audit findings (15 reported during install); no broad dependency upgrade or security-clean claim is made.

## Required fields

```ini
websiteRepositoryConfirmed = PASS
existingHeaderPreserved = PASS
viewportDirectlyBelowHeader = PASS
scriptureDiscoveredMounted = PASS
commanderCEMounted = FAIL
productSwitch = FAIL
mobileFeelsLikeProduct = FAIL
tabletFeelsLikeProduct = FAIL
desktopIntegrated = PASS
dynamicViewportUnits = PASS
safeAreaHandling = FAIL
touchTargets = FAIL
hoverOnlyCriticalActions = NOT_FULLY_VERIFIED
horizontalOverflowDefects = 0
clippedCriticalControls = NONZERO_PHONE_TAB_LABELS
browserBack = PASS (website product selection only)
refreshState = PASS (website product selection only)
runtimeSemanticCompilation = NO
runtimeModelDependencyIntroduced = NO
iframeTemporary = YES
permanentNativeMountBlockedBy = DOCUMENT_OWNING_EXPO_ROUTER_AND_SEPARATE_REACT_RUNTIME
phoneSmall = FAIL
phoneLarge = FAIL
tabletPortrait = FAIL
tabletLandscape = FAIL
largeTabletPortrait = FAIL
largeTabletLandscape = FAIL
desktop1440 = FAIL
accessibilityBaseline = FAIL
productionBuild = PASS
discoveryProductionRepoMutated = NO
pwaReady = FOLLOW_UP_REQUIRED
deploymentReady = NO
deploymentPerformed = NO
liveUrl = https://www.dscripture.com/ (unchanged baseline)
```

FAIL for a combined viewport/acceptance field means the required whole-product proof is incomplete, not that every underlying layout check failed. Safe-area CSS and 48 px switch controls exist; physical and in-app accessibility acceptance remains unproven. Future PWA work includes manifest/standalone display, icons/theme and a cache strategy; no service worker was introduced.

## Reproduction

Use `DISCOVERY_SOURCE=/absolute/path/to/ScriptureDiscovery npm run export:product` with the matching source/dependency snapshot. The build is isolated and may leave ignored `.product-build-*` staging folders for diagnosis. Never repoint those folders at production output. Run the website locally on port 3095, then `npm run verify:viewport`; results intentionally do not turn a blocked Commander into a PASS. Run `npm run build:netlify` and `npm run verify:product-artifacts` before any review.
