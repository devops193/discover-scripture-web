# DISCOVER-GTM-PILOT-01B Implementation Receipt

Status: **READY FOR HUMAN REVIEW — NOT PUSHED**  
Date: 2026-10-05

The existing Next.js/vinext website was simplified in place. The live Scripture Discovered app, repository, routes, production branch, Netlify configuration, and GitHub-to-Netlify release path were preserved. No Netlify CLI command was used.

## Verification

```text
npm run verify:gtm-pilot   PASS
scoped implementation lint PASS
npm run build              PASS
npm run build:netlify      PASS
browser responsive suite   PASS
```

The human review package is under `docs/review/DISCOVER-GTM-PILOT-01B/`. Accessibility and performance notes are stored beside this receipt.

The repository-wide `npm run lint` is not a usable gate in the current checkout: it traverses temporary `.product-build-*` trees and the exported `public/product-app` bundle, reporting 31,418 pre-existing generated/runtime findings. The implementation-owned source set is linted separately and passes; both production compilers also pass.

## Machine-readable receipt

```ini
DISCOVER_GTM_PILOT_01B=PASS

currentWebsiteAudit=PASS
navigationUpdated=PASS
networkAndPartnersNaming=PASS

homepageSimplified=PASS
scriptureDiscoveredPublished=PASS
commanderCEPublished=PASS
networkPartnersPublished=PASS
churchPilotPage=PASS
investorPage=PASS

## 2026-10-05 investor-language lock amendment

- Public investor copy, homepage calls to action, the homepage investor section, and the footer investor link were removed.
- The `Investors` primary-navigation item remains visible as requested, carries a visible `Locked` state, exposes `aria-disabled="true"`, and has no link destination.
- Direct requests to `/investors` redirect to `/`; the prior investor page is not publicly presented.
- Optimized production build, TypeScript, focused lint, the GTM verifier, and phone/tablet/desktop browser validation pass. The verifier reports `investorLanguage=REMOVED` and `investorTab=LOCKED`.
- No deployment, commit, or push was performed.

## 2026-10-05 live-app switcher contrast amendment

- Removed the opaque cream fill from the active `Scripture Discovered` / `Commander CE` program control.
- The active background now computes to `rgba(244, 238, 229, 0)` while text remains fully opaque and readable; a bronze border preserves the selected-state cue.
- Both switch positions were checked in the optimized local build. Selected state, text color, transparent background, and border treatment swap correctly.
- No deployment, commit, or push was performed.

## 2026-10-05 header breathing-room amendment

- Reduced the primary header navigation to `Scripture Discovered`, `Commander CE`, and `Network and Partners`.
- `Church Pilot` and `About` remain accessible as normal footer links.
- `Investors` moved to the footer while preserving its requested visible `Locked`, `aria-disabled`, non-navigable state.
- Optimized production build, TypeScript, focused lint, navigation verification, and refreshed phone/tablet/desktop evidence pass. The header reports three of three expected primary items with no horizontal overflow.
- No deployment, commit, or push was performed.

featurePublicationRegistry=PASS
realProductVisuals=PASS
copyReduction=PASS

accessibility=PASS
responsive=PASS
performance=PASS

liveWebAppPreserved=PASS
githubNetlifyPathPreserved=PASS
netlifyCLIUsed=NO

unverifiedProductionClaim=NO
unclearedNetworkBrandInPublicNav=NO

productionPush=NO
humanApprovalBeforePush=NO
```

`humanApprovalBeforePush=NO` records that approval has not yet been given; production remains unchanged as required by the directive stop condition.
