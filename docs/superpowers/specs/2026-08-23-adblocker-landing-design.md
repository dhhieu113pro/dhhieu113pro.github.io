# AI Vision Ad Blocker Landing Page Design

Date: 2026-08-23
Status: Approved design, awaiting written-spec review
Target: https://dhhieu113pro.github.io/adblocker/
Repository: dhhieu113pro/dhhieu113pro.github.io

## Goal

Create a dedicated GitHub Pages landing page for AI Vision Ad Blocker at `/adblocker/`, using the real CI-generated Microsoft Edge Store screenshots as the core product proof. Update the root homepage so the Adblocker project card links to this landing page instead of directly to GitHub.

The page must feel like a product-specific extension of the existing Hieu Dam project site, not a disconnected microsite and not a generic SaaS template.

## Design system

Hallmark route: default design flow
Hallmark macrostructure: Workbench
Design intent: precise, technical, restrained, product-led

The page is screenshot-led. Real product captures are the primary content, with short functional explanations around them. It must not use the conventional `hero -> three feature cards -> CTA` structure.

### Visual language

- Dark default product identity based on the extension's navy/graphite popup UI.
- Light mode uses a cool off-white rather than pure white.
- Electric blue is the main accent and remains restrained.
- Green is reserved for local/protected/active states.
- Red is reserved for destructive/error states.
- All colors are defined through named design tokens.
- No large decorative gradients are required; product screenshots provide the visual richness.
- No fake browser bars, fake Edge chrome, device mockups, or hand-built window frames around screenshots.
- Screenshots may use a hairline border or quiet surface treatment only.

### Typography

- Display: Bricolage Grotesque
- Body: IBM Plex Sans
- Technical labels: IBM Plex Mono
- Headings remain roman; no italic display headings.
- Fonts must be loaded from a free/public source or packaged through a web-safe public delivery mechanism; do not depend on paid fonts.

### Theme behavior

Reuse the root site's theme behavior:

- modes: System -> Light -> Dark
- icon-only theme control
- shared `site-theme` localStorage key
- the selected theme must carry between `/` and `/adblocker/`

## Information architecture

### Header

Content:

- `Hieu Dam / AI Vision Ad Blocker`
- GitHub repository link
- theme toggle

The header remains quiet and utility-like. It should not become a large navigation bar.

### Opening

Primary statement:

> Local visual protection for the web.

Supporting copy should explain that the extension combines network rules, heuristics, and on-device image classification in the browser.

Primary action is a strong typographic link to the GitHub repository. Do not add a Microsoft Edge Store install button until a confirmed public Store listing URL exists.

### Workbench 1: Overview

Asset: `adblocker/assets/01-overview.png`

Purpose:

- show current protection state
- show page context
- show detected/blocked activity

Suggested heading:

> Know what is being blocked.

Supporting copy should remain short and concrete.

### Workbench 2: Settings

Asset: `adblocker/assets/02-settings.png`

Purpose:

- show automatic protection controls
- show model selection
- communicate that MobileNetV4 is the current recommended/default local classifier
- mention CLIP only as an explicit selectable alternative

Suggested heading:

> Control the model.

Do not repeat stale README wording that claims CLIP is still the default.

### Workbench 3: History

Asset: `adblocker/assets/03-history.png`

Purpose:

- show recent blocking history
- explain that history is local
- show that the user can clear it

Suggested heading:

> Review recent activity.

### Protection pipeline

Show the detection flow as a quiet inline sequence, not cards:

`Network rules -> page heuristics -> local image classification`

This section explains architecture without turning into developer documentation.

### Privacy note

State only grounded claims:

- image inference runs in the browser's local/offscreen runtime
- no invented privacy metrics
- no invented benchmarks

### Close / footer

Include:

- GitHub source link
- MIT license reference
- Hieu Dam / project-site relationship

Do not add testimonials, fake logos, invented adoption counts, conversion metrics, or comparison claims.

## Structural rhythm

Desktop sections intentionally vary rather than repeat identical blocks:

1. Opening: restrained text-led introduction.
2. Overview: centered screenshot with caption/annotation copy.
3. Settings: asymmetric two-column layout, screenshot and copy side-by-side.
4. History: reversed asymmetric layout.
5. Pipeline/privacy: quiet text/rule composition.
6. Closing GitHub action and license.

The screenshot itself is always visible without fake browser/device chrome.

## Responsive behavior

Hallmark mobile verification widths are mandatory: 320, 375, 414, and 768 px.

### >= 1000 px

- asymmetric screenshot/copy compositions
- screenshot maximum visual width around 960-1040 px where appropriate
- generous negative space

### 768-999 px

- screenshot blocks become centered/full-width
- supporting copy moves above or below the screenshot
- no side annotations that force narrow text

### 320-767 px

- single-column layout only
- screenshots scale to available viewport width
- no horizontal scrolling
- no tiny side captions
- clickable text/CTAs must stay on one line where possible
- long headings use `overflow-wrap: anywhere`
- grid image tracks use `minmax(0, 1fr)`
- `html, body { overflow-x: clip; }`

### Motion

- restrained, optional single reveal behavior only if it adds clarity
- `prefers-reduced-motion: reduce` disables nonessential motion

## Source assets

Use the already generated and visually verified Edge Store screenshot artifact from the AI Vision Ad Blocker CI.

Required files:

- `01-overview.png` - 1280x800
- `02-settings.png` - 1280x800
- `03-history.png` - 1280x800

These images are derived from the real extension popup UI. Do not redraw or recreate them manually.

## File boundary

No production files are deleted.

Modify:

- `index.html`
- `.github/workflows/pages.yml`

Create:

- `adblocker/index.html`
- `adblocker/assets/01-overview.png`
- `adblocker/assets/02-settings.png`
- `adblocker/assets/03-history.png`
- `docs/superpowers/specs/2026-08-23-adblocker-landing-design.md`

The implementation may add test/support files if required by the implementation plan, but production scope should remain within the files above unless hidden complexity is discovered and explicitly reviewed.

## Homepage integration

Change the existing Adblocker project card link from:

`https://github.com/dhhieu113pro/adblocker-extension`

to:

`./adblocker/`

Update the card copy to accurately describe the current product, for example:

> Local browser protection using rules, heuristics and on-device AI.

Keep a direct GitHub link on the landing page itself.

## GitHub Pages assembly

The existing Pages workflow currently assembles the root homepage and Quay content. Extend it so the published artifact becomes:

```text
site/
├── index.html
├── quay/
└── adblocker/
    ├── index.html
    └── assets/
        ├── 01-overview.png
        ├── 02-settings.png
        └── 03-history.png
```

The Quay deployment path and behavior must remain unchanged.

## Acceptance criteria

The implementation is complete only when all of the following are verified:

- `/adblocker/` exists in the assembled GitHub Pages artifact.
- All three PNG screenshots load from `/adblocker/assets/`.
- All three screenshots remain exactly 1280x800 source assets.
- Root homepage Adblocker card links to `/adblocker/`.
- Landing page GitHub links point to `dhhieu113pro/adblocker-extension`.
- System/Light/Dark theme toggle works.
- `site-theme` preference is shared across root and Adblocker pages.
- No horizontal overflow at 320 px.
- No horizontal overflow at 375 px.
- No horizontal overflow at 414 px.
- Tablet composition is verified at 768 px.
- Desktop composition is verified.
- Keyboard focus is clearly visible.
- Reduced-motion preference is respected.
- No fake browser or device chrome is added around screenshots.
- No fabricated metrics, testimonials, logos, or performance claims are present.
- Current MobileNetV4-default behavior is described accurately.
- Hallmark pre-emit self-critique scores Philosophy, Hierarchy, Execution, Specificity, Restraint, and Variety all at 3/5 or higher.
- GitHub Pages workflow completes successfully after merge/deploy.

## Hallmark pre-emit target

Before implementation is considered ready, the page should meet at least:

- Philosophy: 4/5
- Hierarchy: 4/5
- Execution: 4/5
- Specificity: 4/5
- Restraint: 4/5
- Variety: 4/5

Any axis below 3/5 requires a revision pass before completion.

## Out of scope

- automatic Microsoft Edge Store screenshot upload through Partner Center
- adding a Store install CTA before a public listing URL exists
- redesigning Quay
- redesigning the root homepage beyond the Adblocker card/link update
- changing extension functionality or model routing
- adding analytics, tracking, newsletter forms, pricing, testimonials, or fake social proof
