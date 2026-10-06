# DISCOVER-GTM-PILOT-01B Current App Export Receipt

Date: 2026-10-05  
Status: `PASS / LOCAL HUMAN REVIEW CANDIDATE`  
Production push: `NO`  
Deployment: `NO`  
Semantic acceptance: `NOT_CLAIMED`

## Export identity

- The embedded web application was rebuilt from the current Scripture Discovery development checkout.
- Source commit: `2cc256186e223297b0c3766653d3b5d6911ba881`
- Selected development-build identity: `52add6f41edc5dd9c21f65f02f933fbd1cec266285bee8bce249607475050398`
- Exact selected-source snapshot SHA-256: `be8a513bd1a34182a4c6c60d89e454109d7593793b00b41f4ede62fa1b07d370`
- Exported artifact SHA-256: `ead9e019c869a6b4a4444ff285163b54f402d16f3d020793d368176e68e010b2`
- Destination path: `/Volumes/DevMode/DiscoverWebsite/public/product-app`
- Progressive packets: `72,808`
- Source files verified: `329`
- Governed source inputs verified: `1`
- Website export/runtime adapters verified: `39`
- Source mismatches: `0`
- Canonical database SHA-256: `f9dfbce6dd2edfe4bb3b4690acd6622f392035be2b0349df98f3607f0a05f6c2`
- Artifact integrity: `PASS`
- Provenance identity, artifact hash, and destination verification: `PASS`

## Build and behavior validation

- Optimized Next.js production build: `PASS`
- TypeScript build validation: `PASS`
- Scoped export/runtime adapter lint: `PASS`
- Existing GTM implementation verifier: `PASS`
- Shared runtime and responsive matrix: `PASS` across 14 product/viewport combinations
- Browser Back, Forward, and Refresh persistence: `PASS`
- Runtime errors: `0`

Focused current-development flows:

- Semantic Lesson Search, including `Disobedience`: `PASS`
- Biblical Lessons list-first results: `PASS` with three governed results
- Character World title and current semantic presentation: `PASS`
- Character World to SceneStory navigation with progressive Scene acquisition: `PASS`

## Browser and accessibility validation

- Phone portrait and landscape: `PASS`
- Tablet portrait and landscape: `PASS`
- Desktop: `PASS`
- Page-level horizontal overflow: `NONE`
- Broken images: `0`
- Unlabeled controls: `0`
- Images without alt text: `0`
- Required-field validation: `PASS`
- Visible keyboard focus: `PASS`
- Console errors: `0`
- Initial marketing-page iframe load: `ABSENT`

The review captures and raw validation record are in `docs/review/DISCOVER-GTM-PILOT-01B/`.

## Approval boundary

This receipt authorizes no release transition. The result is a local preview candidate for human review only. No commit, push, Netlify action, production deployment, content-production lifecycle transition, or semantic acceptance was performed or inferred.
