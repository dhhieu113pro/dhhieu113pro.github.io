# Card Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each post detail into a swipeable card deck (image top, text bottom) with button, dot, and keyboard controls, while remaining readable without JavaScript.

**Architecture:** `scripts/sync.js` emits all parts as cards plus controls in every post page. `assets/reader.js` progressively enhances that markup into a deck; without it, the cards stack vertically. `assets/style.css` owns both states. No dependencies or build step.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS, vanilla browser JS, headless Chromium for interaction verification.

**Spec:** `docs/superpowers/specs/2026-11-21-card-reader-design.md`

## Global Constraints

- No npm dependencies, no framework, no network requests.
- `scripts/sync.js` is the only writer of post HTML; home listing unchanged.
- Every part is present in generated HTML; JS only enhances presentation.
- New reader classes are prefixed `reader-`; existing theme tokens/colors are reused.
- Controls: prev/next buttons with Vietnamese accessible labels, clickable dots, arrow keys, swipe; swipe never the only control.
- Swipe threshold: horizontal must exceed vertical and 45px.
- `prefers-reduced-motion` disables transitions.
- Tests: Node built-in test runner only.

## Review Focus

- Without JS the cards must remain a readable vertical stack — verified by reading generated HTML with no reader script execution and checking CSS fallback.
- Long part text (~800 chars) must be reachable inside a fixed-height card — verified in Chromium by scrolling the text region to its bottom.
- Vertical text scrolling must not trigger a card change — verified by a Chromium touch drag that is mostly vertical.
- Buttons, dots, and arrow keys must work at both ends (disabled/edge state) — verified in Chromium by clicking and pressing keys.
- Reduced-motion users must get no slide animation — verified by checking the computed transition with reduced motion emulated.

---

### Task 1: Generate card markup

**Files:**
- Modify: `scripts/sync.js` (post body template)
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: story `parts` from Task 1 of the previous plan (`{text, image}`), already filtered to skip `kind === 'begin'`.
- Produces: post HTML with `<div class="reader-deck">`, one `<section class="reader-card">` per part containing `<img class="card-image">` (when present) and `<p class="card-text">`; a `<div class="reader-controls">` with `<button class="reader-prev" aria-label="Phần trước">`, `<button class="reader-next" aria-label="Phần sau">`, `<div class="reader-dots">` with one `<button class="reader-dot" aria-label="Phần N">` per part, `<span class="reader-count">` showing `1 / N`; and `<script src="../../assets/reader.js" defer></script>`.

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `renders one reader card per part with image above text` — with two parts, assert two `class="reader-card"`, two `class="card-text"`, and that `class="card-image"` appears before its text within the first card;
2. `generates controls and progress for every part` — assert prev/next buttons with the exact Vietnamese aria-labels, count text `1 / 2`, and two `class="reader-dot"` buttons;
3. `loads the reader enhancer` — assert `src="../../assets/reader.js"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the three new assertions.

- [ ] **Step 3: Replace the post body template in `scripts/sync.js`**

Emit the markup described in Interfaces, preserving the existing title/byline/date/source/back-link markup above and below the deck. Keep all values passed through `esc()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: generate card deck markup for posts"
```

### Task 2: Style and enhance the deck, verify in browser, publish

**Files:**
- Modify: `assets/style.css`
- Create: `assets/reader.js`
- Modify: `README.md` (one line about the reader)
- Generated: `posts/*/index.html`

**Interfaces:**
- Consumes: exact class names and structure from Task 1.
- Produces: a working mobile-first deck; published site updated.

- [ ] **Step 1: Add CSS for both states**

Default (no JS): cards stack with margin, image above text, normal page scroll. Enhanced (`.reader-ready` on the deck): deck becomes a flex track with one card per view; mobile card height `100dvh`, desktop `min(80vh, 760px)` capped at 720px wide; text region scrolls internally; controls are 44px minimum touch targets; focus rings and reduced-motion rules included.

- [ ] **Step 2: Implement `assets/reader.js`**

On DOMContentLoaded, for each deck: add `.reader-ready`, track index, render card by translating the track, update count and dot `[aria-current]`, disable prev at index 0 and next at the last card. Wire prev/next clicks, dot clicks, `keydown` ArrowLeft/ArrowRight, and pointer/touch swipe on the card area with the 45px horizontal-dominant threshold. Set `touch-action: pan-y` on the card so vertical scrolling remains native.

- [ ] **Step 3: Regenerate and verify in headless Chromium**

Run: `node scripts/sync.js`
Then use the installed pwterm Chromium + playwright-core from `~/pwterm` to open a generated post via `file://` and check: initial count, next/prev, dot click, arrow key, a horizontal swipe, a vertical drag that does NOT change card, and reduced-motion transition value.

- [ ] **Step 4: Verify the no-JS fallback**

Open the same file with JavaScript disabled and confirm all cards are visible in a vertical stack.

- [ ] **Step 5: Commit and publish**

```bash
git add -A && git commit -m "feat: swipeable card reader for posts" && git push origin main
```

- [ ] **Step 6: Verify live site**

Fetch a post URL and one card image; confirm HTTP 200 and the new markup.
