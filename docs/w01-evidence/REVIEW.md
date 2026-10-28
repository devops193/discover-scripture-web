# W01 — Discover Scripture website reset

Status: local implementation and scoped functional verification PASS; not deployed. Owner review required. Two boundaries below remain explicit; this is not a claim that all Commander functionality has disappeared from the preserved application.

## Changes

The homepage now presents the approved headline and subheadline, immediately followed by the actual existing Discover application. Static hero/product galleries, the website product switcher, CE promotions, partner promotions, church-pilot calls to action, and investor navigation are removed. The two approved short sections follow the app. Research capabilities are explicitly labeled Future direction and developing, not complete.

The existing dark palette, brand asset, web export, framework, legal/support content, APIs, and GitHub-to-Netlify build path are retained. Footer navigation is Privacy · Terms · Support with the verified App Store distribution link. No price is advertised. No app-store or corporate identity was invented.

The Product Design audit informed the application-first order and responsive checks; it did not introduce a new visual system or hosting platform.

## Observed before / verified after

1. Homepage: previously a static phone hero and gallery before the app; now a compact introduction followed by the working app. Healthy on tested sizes.
2. Character navigation: Abraham introduction → Open Character World → Abraham World → Back controls. PASS.
3. Reading: Reading → Genesis → chapter 1; rendered opening text verified: “In the beginning, God created the heavens and the earth.” PASS.
4. Standalone Reading: a fresh visit opens Choose a book, matching production. PASS. Earlier test assumptions about automatic chapter selection and bypassing the Character introduction were corrected, not application behavior.
5. Legal/support and retired routes: all active routes return 200; eight retired routes return 308 to `/`. PASS.

Screenshots were captured with owner-authorized local Playwright/Chrome. Before images show the deployed site; after images show the local production build. Images have been visually inspected. Blank distant image panels in the full-page before capture were lazy-loaded assets; no claim is made that those assets are broken.

| View | Before | After |
|---|---|---|
| Desktop | [Deployed homepage](before-desktop.png) | [Local homepage](after-desktop.png) |
| Phone | [Deployed homepage](before-phone.png) | [Local homepage](after-phone.png) |
| Tablet | Not captured before | [Local homepage](after-tablet.png) |
| Character World | Not part of before comparison | [Abraham World](after-character-world.png) |
| Reading | Existing implementation preserved | [Genesis 1 rendered](after-reading.png) |

## Route inventory

| Route / surface | Deployed audit | Local reset |
|---|---|---|
| `/` | 200; CE/pilot/partner promotions | 200; approved minimal Discover copy + actual app |
| `/church-edition` | 200 promotional page | 308 `/`; original source retained off-route |
| `/church-pilot` | 200 promotional page | 308 `/`; original source retained off-route |
| `/about` | 200; partner link and lengthy copy | 308 `/`; original source retained off-route |
| `/investors` | Redirect to homepage | 308 `/`; no public investor link |
| `/commander-ce`, `/digital-altar`, `/network-and-partners`, `/partners` | Legacy/potential promotional aliases; not claimed as previously deployed pages | Explicit 308 `/` |
| `/privacy`, `/terms`, `/support` | 200; old shared navigation promoted CE | 200; original document bodies preserved, clean shared navigation |
| `/sitemap.xml` | 404 | 200; only `/`, `/privacy`, `/terms`, `/support` |
| `/robots.txt` | 404 | 200; API/portal and CE application route crawling disallowed |
| `/product-app/` and app client routes | Existing live app | Existing live app, unchanged export |
| `/api/health`, `/api/entitlement/verify` | Existing operational endpoints | Code untouched; no mutation calls made |
| `/product-app/digital-altar/*`, `/product-app/c3/*` | Existing application capabilities | Infrastructure and routes preserved, not marketed |
| `/platform/*` | Existing static visual assets | Preserved files, no homepage promotion or sitemap entries |

The `?product=commander` website query no longer selects Commander. Old `#commander-ce`, `#network-and-partners`, and `#church-pilot` anchors no longer have promotional sections. There is no new redirect or authorization layer for operational endpoints.

## Verification

- `npm run build:netlify`: PASS, including Next TypeScript checking.
- Scoped ESLint on changed components/config: PASS.
- `git diff --check`: PASS.
- `node scripts/verify-website-reset-w01.mjs`: PASS. Exact results: [verification.json](verification.json).
- Five viewports: 1440×1000, 768×1024, 390×844, 320×740, 844×390. No outer or inner horizontal overflow; the app starts within the initial viewport in each.
- Website text at 200%: no horizontal overflow at the tested desktop width. Main entry link keyboard-focusable. No full WCAG or assistive-technology certification claimed.
- Existing secondary text `#b9afa2` against `#13110e`: 8.72:1 calculated contrast. No palette alteration.
- Zero uncaught page errors in the tested embedded flow.
- `node scripts/product-manifest.mjs`: PASS for all 33 manifest-bound files. Export bytes were not rebuilt or changed.
- Original promotional component files compare byte-for-byte with Git HEAD after relocation to `app/deferredMarketing/`. CE underlying application source, APIs, private records, and infrastructure were not altered.
- `netlify.toml`, package manifests, `public/`, and generated legal/release configuration have no task diff. Existing API/runtime rewrites and headers remain intact. Production deployment itself has not been run.

## Exact provenance

- Website base commit: `bb9b940438204833e0f0ae3b571b8696d97aaae0`.
- App source commit: `e6c0175ed6797e76f0075db3936714efbbd1d01e`.
- Preserved app build: `52add6f41edc5dd9c21f65f02f933fbd1cec266285bee8bce249607475050398`.
- App artifact hash: `08c7653cbaf7f4e5fdf9ee5a646380a1bd4af14646caa9b25f57e5b2f4a56d99`.
- Manifest byte hash: `a51cad3938e8933365482e2b5a90e082308b2784ef39b93cbb19362d3c031502`.
- Destination: `/Volumes/DevMode/DiscoverWebsite/public/product-app`.
- This verifies the preserved selected export, not freshness against today's native development checkout.

## Remaining boundaries / review notes

1. The app itself still exposes its existing desktop Commander tab (visible in the desktop and Reading screenshots). Website marketing and host navigation are cleaned, but a claim of zero CE access across every app surface would be false. Removing that internal navigation needs a narrowly scoped web-app change and export verification; it has not been hidden with CSS or disabled by destroying CE routes. Resolve that scope before treating the entire public experience as exclusively Discover.
2. Existing release configuration has `developerLegalName: null` and launch date unset. Those legal placeholders predate this task and were not replaced with an assumed corporate entity. Apple's verified seller is Erik Brown, the listing is Scripture Discovery, and the US price is $9.99 with “One purchase” stated. Seller identity alone is not proof of a corporate legal entity. Existing legal attribution remains unchanged; confirm the intended legal name before public release if required.
3. Chromium responsive testing is not a physical iOS/Safari/device test. No new native-app build or simulator QA was performed because no native code was changed.
4. Historical GTM verification scripts still intentionally describe the superseded two-product marketing requirements. W01 uses its own explicit verifier; these old historical tests were not rewritten to erase evidence.

## Review / release

Open `http://localhost:4101` for the local candidate. Review the homepage, screenshots, route inventory, and the two scope notes above. Nothing was committed, pushed, staged to Netlify, or deployed. Existing unrelated dirty evidence files were preserved. Owner approval is required before any production push through the existing GitHub → Netlify path.
