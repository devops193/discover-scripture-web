# Discover-Website-02 Store Link Integration

Presentation-preserving store destinations for the Discover Scripture website. Homepage identity, section order, prices, coverage copy, and legal routes are unchanged. Store destinations are decided in one module: `app/storeLinks.tsx`.

## Store URL state

```text
appStoreUrlState: PRELAUNCH
googlePlayUrlState: PRELAUNCH
```

`APP_STORE_URL` and `GOOGLE_PLAY_URL` are unset. `publicReleaseConfig.appStoreUrl` and `publicReleaseConfig.playStoreUrl` are `null`. Empty values resolve to restrained non-clickable copy. Invalid, placeholder, dashboard, search, or `http:` values throw at module evaluation so the build fails.

## Required PASS fields

```text
heroIntegration: PASS
ownershipIntegration: PASS
structureChanged: false
presentationSystemChanged: false

privacyRoute: PASS
termsRoute: PASS
supportRoute: PASS

deadLinks: 0
placeholderLinks: 0
accessibilityFailures: 0
```

Hero receives `StoreLinks` after the lead in `.hero-copy`. Ownership always shows the same slot (live official badges or prelaunch text). The Look again card has no store destinations. Official Apple/Google badge artwork is used only when a public listing URL is present.

Current public HTML contains no App Store, Google Play, App Store Connect, Play Console, or placeholder `href`s. Prelaunch lines are `<p class="store-availability">`, not buttons or fake links. Live accessible names (when URLs exist) are `Download Discover Scripture on the App Store` and `Get Discover Scripture on Google Play`.

## Developer wording

Pending `{{OPERATOR_LEGAL_NAME}}` fallback is `Developer legal name pending release configuration`. Terms liability copy uses “its developer”. WEBU / Scripture ownership language is unchanged. AfroGenesis LLC is not identified as the publisher.

## Routes

Local production server (`http://127.0.0.1:3000`):

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/privacy` | 200 |
| `/terms` | 200 |
| `/support` | 200 |

No account, billing, profile, or website-checkout pages were added. `dscripture.com` was not hardcoded into store metadata.

## Screenshots

Prelaunch availability copy (not live badges):

- `DISCOVER-WEBSITE-02-screenshots/hero-desktop.png` (1280×800)
- `DISCOVER-WEBSITE-02-screenshots/hero-mobile.png` (390×844)
- `DISCOVER-WEBSITE-02-screenshots/ownership-desktop.png`
- `DISCOVER-WEBSITE-02-screenshots/ownership-mobile.png`

## Verification

- `npm run lint` — pass
- `npm run build` — pass in PRELAUNCH
- Browser: homepage hero + ownership at ~1280 and ~390; `/privacy` loaded in browser; `/terms` and `/support` confirmed 200 with HTML inspection after the browser tool dropped mid-pass
- Keyboard: only real nav/legal links are interactive; Coming to… text is not focusable as a control

```text
DISCOVER_WEBSITE_02_STORE_LINK_INTEGRATION_COMPLETE

SITE STRUCTURE:
  UNCHANGED

APP STORE:
  LIVE OR GOVERNED PRELAUNCH STATE

GOOGLE PLAY:
  LIVE OR GOVERNED PRELAUNCH STATE

WEB BILLING:
  NONE

ACCOUNT:
  NONE

PRIVACY / TERMS / SUPPORT:
  PRESERVED
```
