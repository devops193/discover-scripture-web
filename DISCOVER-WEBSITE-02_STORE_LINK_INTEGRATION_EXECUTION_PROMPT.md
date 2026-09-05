# EXECUTE NOW — DISCOVER-WEBSITE-02 APP STORE / GOOGLE PLAY LINK INTEGRATION

Implement the final store-link integration for the Discover Scripture website.

This is a **presentation-preserving website update**.

Do not redesign the site.
Do not change section order.
Do not change typography, spacing system, colors, card structure, or overall visual language.

## Product / website state to preserve

The homepage structure and final copy are already approved.

Current site identity:

```text
Discover Scripture
Professional Scripture research environment for ordinary readers
```

Pricing:

```text
Launch price: $39.99 one-time
Standard price: $59.99 one-time
Subscription: none
```

Coverage disclosure:

```text
The full Scripture + Apocrypha text is included.

Discover’s investigative library is still growing across the canon,
with new governed Scenes, questions, relationships, and research content
added over time.

Existing owners receive that expanding content and future Discover
enhancements at no additional charge.
```

Do not alter these product claims unless required only for exact placement.

---

# 1. Add platform store destinations

The website should support direct links to:

```text
Apple App Store
Google Play
```

Use official platform badges / approved platform artwork when real store URLs are available.

Do not create custom imitation badges.

Do not modify official badge artwork.

---

# 2. Prelaunch behavior

If either store listing URL is not yet live:

```text
DO NOT render a clickable dead store badge.
```

Instead render restrained non-clickable availability copy in the same location:

```text
Coming to the App Store
Coming to Google Play
```

or the existing site’s equivalent understated text treatment.

Do not link to:

```text
App Store Connect
Google Play Console
placeholder URLs
search result pages
developer dashboards
```

Only public customer-facing product URLs are legal store destinations.

---

# 3. Live behavior

When a real public listing URL exists:

```text
App Store badge
→ exact public Apple App Store product page

Google Play badge
→ exact public Google Play product page
```

Open using the website’s normal external-link behavior.

Do not introduce an intermediate account, checkout, pricing, or signup page.

Discover has:

```text
no website account
no web checkout
no subscription
no direct website billing
```

Purchases remain platform-store transactions.

---

# 4. Placement

Preserve the current site structure.

Do not add a new large homepage section solely for store buttons.

Use the two existing logical CTA areas:

```text
A. Hero / primary product CTA area
B. Ownership / pricing area
```

Preferred behavior:

```text
Hero:
  App Store
  Google Play

Ownership / pricing:
  App Store
  Google Play
```

If the current design has only one existing CTA slot, integrate both badges into that existing slot rather than changing the layout architecture.

Do not scatter store badges throughout the page.

---

# 5. Responsive behavior

Badges must:

```text
- remain visually balanced on mobile and desktop
- preserve current content width
- stack cleanly on narrow screens if required
- keep official badge proportions
- maintain accessible tap targets
- not distort or crop official artwork
```

Do not let badges dominate the editorial tone of the page.

Discover should still read first as a serious Scripture research environment, not an app-store landing template.

---

# 6. Accessibility

Each live badge/link must have an accessible label:

```text
Download Discover Scripture on the App Store
Get Discover Scripture on Google Play
```

If displaying non-clickable prelaunch text, it must not masquerade as an interactive control.

Keyboard focus must follow normal link semantics.

---

# 7. Legal / support relationship

Preserve or verify these public website routes:

```text
/privacy
/terms
/support
```

The public site should remain the canonical destination for:

```text
Privacy Policy
Terms and Conditions
Support
```

Do not create:

```text
account
billing
subscription-management
cloud-data
user-profile
```

pages.

The store listings may later point back to:

```text
https://dscripture.com/privacy
https://dscripture.com/support
https://dscripture.com/
```

Do not hardcode those into app-store metadata in this operation unless that metadata is explicitly in the same repository and already authorized for editing.

---

# 8. Developer terminology

Where the website/legal copy identifies the party behind Discover, use:

```text
Developer
```

not:

```text
Operator
```

Launch identity remains the individual legal developer identity until the Apple developer account is formally amended to AfroGenesis LLC.

Do not identify AfroGenesis LLC as the current App Store publisher/developer until that transition is complete.

Do not alter Scripture / WEBU ownership language.

---

# 9. Data / billing claims

Store-link integration must remain consistent with the actual product:

```text
No Discover account
No direct website billing
No subscription
Apple / Google handle platform purchases
Local reader data remains local
Entitlement service is limited to ownership/update verification
```

Do not add marketing language implying:

```text
cloud sync
cloud account
cross-platform Discover identity
direct credit-card billing
```

---

# 10. Implementation configuration

Prefer explicit environment/config values for public listing URLs:

```text
APP_STORE_URL
GOOGLE_PLAY_URL
```

or the repository’s existing equivalent.

Behavior:

```text
valid public URL present
→ render official linked badge

URL absent
→ render prelaunch availability copy

invalid / placeholder URL
→ fail validation
```

Do not bury store URLs in multiple components.

Keep one canonical configuration source.

---

# 11. Verification

Verify:

```text
Homepage structure unchanged
Section order unchanged
Approved homepage copy unchanged
Pricing unchanged
Coverage disclosure unchanged
Privacy / Terms / Support links unchanged

No dead store links
No placeholder links
No dashboard links

Official badge proportions preserved
Mobile layout PASS
Desktop layout PASS
Keyboard accessibility PASS
Screen-reader labels PASS
```

If public store URLs are currently unavailable, the build must still pass in prelaunch mode.

---

# 12. Required screenshots

Capture:

```text
Homepage hero — mobile
Homepage ownership/pricing — mobile
Homepage hero — desktop
Homepage ownership/pricing — desktop
```

Show either:

```text
official live badges
```

or:

```text
restrained Coming to App Store / Google Play state
```

depending on actual public URL availability.

---

# 13. Completion report

Produce:

```text
DISCOVER-WEBSITE-02-STORE-LINK-INTEGRATION.md
```

Report:

```text
appStoreUrlState: LIVE | PRELAUNCH
googlePlayUrlState: LIVE | PRELAUNCH

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

Terminal:

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
