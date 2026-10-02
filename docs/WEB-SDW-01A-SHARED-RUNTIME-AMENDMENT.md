# WEB-SDW-01A — shared Scripture runtime amendment

Date: 2026-10-01

`WEB_SDW_01A_SHARED_RUNTIME_CORRECTION = PASS`

This amends the failed dual-instance/sequential-remount composition recorded in the original R1 receipt. It is a bounded web-runtime acceptance, not a production release or physical-device security certification.

## Architecture corrected

- ProductViewport owns **one stable iframe and one Expo application root**. Neither its source nor its key changes when selecting a surface.
- The switch sends a same-origin, source-checked message to a bridge inside the existing root/provider tree. The bridge changes the existing router location, not the application instance.
- WEBU reader/database, graph provider, Tree cache, World kernel and browser key-value storage retain their identities across switches. Commander reuses them; it does not import or initialize a second Scripture application.
- Existing Account, Church, Program, Operations and Live Service providers remain above both route surfaces. No second storage provider or replacement Scripture store was introduced.
- Each surface remembers its last route during this document session. Reader's existing persisted chapter position remains authoritative. Screen-local ephemeral UI state follows the existing route lifecycle; this receipt does not claim every open sheet or unsaved form survives route replacement.
- Host history owns mode changes. Inner route replacement avoids adding a competing mode-history entry. Refresh creates exactly one new engine, as expected for a new document.

## Website-only adapters

All adapters are applied to copied sources in ignored website build staging. No Discovery production file is edited.

1. A root bridge and read-only identity diagnostics record actual initialization and object identity changes.
2. The authorized web Commander surface is exposed without setting global development mode or enabling protected-data/pilot security bypasses. Existing local profile/workspace forms and membership rules remain in use.
3. Commander home navigation can scroll horizontally on narrow screens; its header wraps and workspace cards reflow. Existing tools remain present. Bottom-tab height accommodates labels, and AppIcon uses the existing Material Symbols font on web.
4. SQLite's dependency adapter corrects a four-byte response-length header previously written through an eight-bit array (responses above 255 bytes were truncated). It retains the previously documented elapsed-time deadline correction.
5. SQLite WASM/VFS initialization is single-flight. The source dependency allowed concurrent startup requests to enter initialization before its first awaited operation completed; warm refresh revealed competing owners even inside one worker. A concurrency test verifies 20 callers receive one initialization result, one WASM instance and one persistent VFS owner.

Canonical validation, source checksum, authority hashes, read-only Scripture database behavior and all content remain intact. No fallback or source reconstruction was added.

## Verification

Reproducible browser check: `VIEWPORT_URL=http://localhost:3096 npm run verify:viewport` against the production server (`next start`). The same matrix also passed against the development server.

Evidence: `docs/viewport-evidence/shared-runtime.json` and the fourteen geometry/surface screenshots in that directory. The earlier `results.json` is historical failed-composition evidence, not the current verdict.

| Check | Result |
| --- | --- |
| One app document / root | PASS |
| One canonical Scripture boot, database and reader per document | PASS |
| One shared graph and storage object identity | PASS |
| Tree cache and lazy World kernel identities retained | PASS |
| Engine identity unchanged through repeated mode switches | PASS |
| One engine bundle download before explicit refresh | PASS |
| Commander switch performs no second Scripture boot | PASS |
| Abraham World route retained on return | PASS |
| Genesis 12 remains readable after switch and return | PASS |
| Browser Back and Forward restore matching mode and route | PASS |
| Refresh restores Commander and its local workspace | PASS |
| No runtime / canonical / SQLite errors in final matrix | PASS |
| 360×800, 430×930, 768×1024, 1024×768 | PASS — both surfaces |
| 1024×1366, 1366×1024, 1440×900 | PASS — both surfaces |
| Horizontal document overflow | 0 in all fourteen views |
| Mode-switch touch targets and keyboard Home/End | PASS |
| Production build (`npm run build:netlify`) | PASS |
| Generated artifact integrity | PASS — 33 files |
| SQLite response-length and single-flight regression tests | PASS |

The matrix uses the actual local profile and Church forms with clearly labeled `WEBSITE TEST OPERATOR` / `WEBSITE TEST MINISTRY` data in an isolated browser profile. It opens the actual Abraham World and WEBU reader, not substitute test screens. Temporary test identity is not shipped as production ministry data. Timing is one local sample, not a performance SLA; the measured switch is recorded in the JSON receipt and includes a deliberate 250 ms settle interval.

## Preservation and boundaries

The existing website header, lower-page sections, pricing/ownership strip, deployment configuration and application authority content are preserved. Source comparison against the prior website build confirms unchanged hashes for all 320 native source files, native package/lock files, and canonical database.

Canonical database SHA-256: `f9dfbce6dd2edfe4bb3b4690acd6622f392035be2b0349df98f3607f0a05f6c2`.

```ini
discoveryProductionRepoMutated = NO
runtimeSemanticCompilation = NO
runtimeModelDependencyIntroduced = NO
secondScriptureBootOnModeSwitch = NO
competingSurfaceStorageProviders = NO
iframeTemporary = YES
deploymentReady = NO
deploymentPerformed = NO
physicalSecurityAcceptance = NOT_CLAIMED
pwaReady = FOLLOW_UP_REQUIRED
```

Temporary iframe isolation remains because the existing Expo/React DOM runtime and router have a different version/root contract from the website's Next runtime. There is now only one such document, not one per product. Direct mounting, bundle size reduction, the previously reported dependency audit findings, full offline/PWA behavior and exhaustive assistive-technology/device testing remain separate release work. Browser geometry checks cover the Reader and Commander workspace plus World navigation; they are not an exhaustive retest of every Presenter, Media Director, security form or live-output path.

No commit, push or deployment was performed in this amendment. Census R1 remains paused. Stop for human review.
