# WEB-SDW-01A-R2 — Pricing Strip Placement

Date: 2026-10-01

```ini
WEB_SDW_01A_R2 = PASS
pricingStripDirectlyBelowViewport = PASS
freeOnlineClearlyPresented = PASS
offlineOwnershipClearlyPresented = PASS
commanderPricingOrAvailabilityPresented = PASS
unapprovedPriceInvented = NO
productViewportHeightReduced = NO
productionBuild = PASS
discoveryProductionRepoMutated = NO
deploymentPerformed = NO
```

## Implementation

The homepage now renders Header → ProductViewport → PricingStrip → existing website content. The strip is the viewport's immediate DOM sibling, with no intervening content. It uses three compact cards in the existing theme, stacked below 701 CSS pixels and in a row above that breakpoint. It does not reserve screen space above the fold or alter the shared application runtime.

The strip states free online use without an account, free accounts only for remembering work, one-time Personal offline ownership, and Commander CE pilot availability. The Commander link uses the existing Church Edition page. No account workflow, checkout, subscription, invented hardware quote, backend or new product capability was added.

The existing-site skill guided reuse of the site's theme, dependencies and preview/build workflow. No publishing was performed.

## Price authority review

Inspected the root R2 directive, `C3-01_COMMERCIAL_RELEASE_CONTRACT.md`, the native `release/C3-01-release-config.json`, the website's `app/releaseConfig.generated.ts`, and the website Ministry-First Language Lock's Commander availability rules.

There is an existing unresolved discrepancy: the website generated configuration displays $9.99 / $19.99, while the native configuration contains $39.99 / $59.99 with `publicPublicationAuthorized=false` and release gates pending. Accordingly, the new strip uses the R2-authorized **“One-time purchase”** fallback and no numeric amount. Commander uses **“Pilot · Coming through selected deployments”**, with no price or quote.

The older lower-page OwnershipPromise and generated price configuration were preserved, not silently reconciled under this placement patch. Their numeric-price discrepancy remains a publication-review issue. R2 PASS applies to the new strip, not approval of old prices or production publication.

## Verification

- `node scripts/verify-pricing-strip.mjs`: PASS.
- Exact DOM adjacency, zero vertical gap between section bounds, required copy, no numeric prices/subscription copy in the strip: PASS.
- 360×800, 430×930, 768×1024, 1024×768, 1024×1366, 1366×1024, 1440×900: PASS; no horizontal page overflow.
- Phone/tablet dynamic viewport height still equals screen height minus the existing header: PASS.
- Enlarged 200% root text does not overflow the phone strip: PASS.
- Phone and desktop screenshots visually inspected: PASS.
- `npm run build:netlify`: PASS, including TypeScript and static generation.

Evidence: `docs/pricing-strip-evidence/results.json` and seven screenshots in that directory.

R2 changes only the new component/style, its homepage insertion, the focused verifier and receipt/evidence. Existing uncommitted shared-runtime work was preserved. No native source/content, app export, runtime bridge, storage, feature/security gate or Census state was changed. No commit, push or deployment was performed. Stop for review.
