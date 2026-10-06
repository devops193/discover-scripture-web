# DISCOVER-GTM-PILOT-01B current website audit

Date: 2026-10-05

## Current structure

- **Top navigation:** `Scripture Discovery CE`, `Commander CE`, `Scripture Discovery PE`, and `Request a Pilot`. It does not match the locked public navigation and does not expose About, Investors, or a stable Network entry.
- **Homepage:** the live embedded product viewport, pricing strip, ministry hero, ministry flow, Church Edition, Commander CE, Smart Presenter, Discovery Ministry Network, SupportLives, and a long personal-edition section containing lenses, library statistics, positioning, included features, ownership, and store links.
- **Product pages:** the homepage owns the live Scripture Discovered and Commander viewport; `/church-edition` owns Church Edition, Commander, Smart Presenter, network, foundation, and the existing pilot form. Supporting pages are `/about`, `/privacy`, `/terms`, and `/support`.
- **Live application entry:** the shared Scripture Discovered web application is served at `/product-app/` inside the homepage product viewport. It is visible before the marketing content and remains the central product surface.
- **Network naming:** public copy currently uses `Discovery Ministry Network` and `DiscoveryMinistryNetworkCE Foundation`; these names must not remain in the new public navigation or newly authored public Network copy.
- **Church and Commander:** both are strongly represented, but Church Pilot is only an anchor and form near the bottom of `/church-edition`; there is no dedicated short Pilot page.
- **Investors:** there is no Investor page, navigation entry, brief link, progress summary, or fundraising-contact entry.

## Current actions and forms

- Church Edition exploration and pilot-request links occur repeatedly on the homepage and Church Edition page.
- The Pilot form asks for name, role, church/ministry, email, and an optional note, then opens a prefilled email. It stores no form data.
- Personal edition actions lead to the App Store. The homepage product viewport is the live web application rather than a marketing mockup.
- There is no investor contact action.

## Current media

The current workspace contains six real product captures, each already compressed to approximately 84–116 KB:

- Scripture Discovered on iPhone, 900 × 2004.
- Commander CE service control, 1600 × 1110.
- Church Edition verse focus, 1600 × 1200.
- Service program editor, 1600 × 1200.
- Commander beside public presentation controls, 1600 × 1200.
- Public Presenter, 1600 × 1200 (present in the current workspace but not yet tracked).

The captures are real product surfaces and contain no debug overlays or raw engineering IDs. Several Commander/Church images are visually related, so the revised page should avoid showing them consecutively without a distinct product purpose.

## Accessibility baseline

Strengths retained:

- Semantic sections and heading labels are already common.
- The product switcher uses tabs, keyboard arrow handling, and focus styles.
- Buttons and form controls meet a 48 px minimum target in the principal responsive rules.
- Images have useful alt text; decorative brand artwork has an empty alt.
- Reduced-motion handling exists for product-switch feedback.

Issues to address:

- The locked destinations are absent from the primary navigation and therefore from its keyboard/focus sequence.
- The mobile menu exposes only a generic `Menu` label and does not communicate the expanded action as `Close menu`.
- Repeated CTA copy and duplicated long sections make landmark and heading navigation unnecessarily dense.
- The dedicated Church Pilot and Investor pages need unique titles, clear heading hierarchy, accessible form labels, and explicit link purposes.
- Focus visibility, text contrast, text enlargement, responsive wrapping, and mailto-form behavior require browser verification after implementation.

## Duplication and copy weight

- The ministry hero, Church Edition summary, Commander description, Smart Presenter statement, Network statement, and pilot invitation are repeated between the homepage and `/church-edition`.
- Commander has two explanatory paragraphs where the locked four-line message and one supporting line are sufficient.
- The personal edition section contains several long supporting blocks below an already functional live app.
- Network and SupportLives copy mix current capability, future direction, foundation naming, and public claims in one flow.

## Performance baseline

- Marketing images are reasonably compressed and use lazy loading except for priority hero media.
- The homepage immediately mounts the full embedded Scripture application before the marketing content. That preserves the live app but carries the heaviest runtime at initial load.
- The revised homepage should keep the app one clear action away, move the public Hero first, and lazy-load the embedded live application in the Scripture Discovered section without changing `/product-app/`, the shared runtime, caching headers, Netlify configuration, or production wiring.

## Implementation boundary

Retain the existing Next.js/Vinext application, routes, live `/product-app/` runtime, GitHub remote, Netlify configuration, and production domain. Refactor the public information architecture and copy in place; add only the dedicated Church Pilot and Investor routes plus one lightweight feature-publication source. Do not push or deploy before human review.
