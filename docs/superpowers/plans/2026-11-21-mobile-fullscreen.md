# Mobile Fullscreen Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On phones, make the post detail a full-viewport reader with a compact top bar and bottom controls, with browser zoom and stray touches suppressed.

**Architecture:** `scripts/sync.js` emits a top bar and a non-zoomable viewport meta on post pages. `assets/reader.js` toggles a `reader-fullscreen` body class from `matchMedia`, updates the top counter, moves the source link into the last card, and marks swipe state. `assets/style.css` scopes fullscreen layout and touch guards to that class. Desktop and no-JS behavior unchanged.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS/JS, headless Chromium via pwterm's playwright-core.

**Spec:** `docs/superpowers/specs/2026-11-21-mobile-fullscreen-reader-design.md`

## Global Constraints

- No npm dependencies, no framework, no build step.
- `scripts/sync.js` is the only writer of HTML; home listing markup unchanged.
- Existing reader features (swipe, buttons, dots, keys, aria-live, inert, reduced motion, no-JS stack) must keep working.
- Fullscreen rules apply only under `body.reader-fullscreen` at max-width 719px.
- Post viewport meta: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`; home page keeps zoomable meta.
- Deck `touch-action: pan-y`; controls/top bar `touch-action: manipulation`; `overscroll-behavior: none` on fullscreen body.
- Source link is moved into the last card by JS, never deleted.

## Review Focus

- Fullscreen layout must leave no page scroll or horizontal scroll at 390x844, while card text still scrolls internally — Chromium check of `scrollHeight`/`scrollWidth` and inner card scroll.
- Zoom must be disabled on posts but not on the home page — Chromium check of viewport meta on both pages.
- Stray touches must not select text, show callouts, or bounce — Chromium check of computed `touch-action`, `user-select` during swipe, and `overscroll-behavior`.
- Existing controls must still work after the source link is moved — Chromium check of next/back/source-in-last-card.
- Desktop and no-JS layouts must be unchanged — Chromium check at 1280px and with JS disabled.

---

### Task 1: Generator markup and tests

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: existing story fields (title, parts, source) from the sync pipeline.
- Produces: post HTML with `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`; home HTML keeps the old zoomable meta; post HTML has `<div class="reader-topbar">` inside `article.story` containing `<a class="reader-back" href="../../" aria-label="Trở về">←</a>`, `<span class="reader-top-title">…</span>`, `<span class="reader-top-count">1 / N</span>`.

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `locks zoom on post pages` — post HTML contains `maximum-scale=1, user-scalable=no`;
2. `keeps the home page zoomable` — `index.html` does not contain `user-scalable=no`;
3. `generates a compact top bar` — post HTML contains `class="reader-back"`, `class="reader-top-title"`, `class="reader-top-count">1 / 2`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the three new assertions.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Add an optional `lockZoom` argument to `shell(title, body, prefix, lockZoom)` that swaps the viewport meta; pass `true` only for post pages. Add the top bar markup inside `article.story` before the deck, escaping the title.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: fullscreen reader top bar and zoom lock markup"
```

### Task 2: Fullscreen CSS/JS, browser verification, publish

**Files:**
- Modify: `assets/style.css`, `assets/reader.js`, `README.md`
- Generated: `posts/*/index.html`

**Interfaces:**
- Consumes: exact `reader-topbar`, `reader-back`, `reader-top-title`, `reader-top-count` names from Task 1; existing `.reader-controls`, `.reader-count`, `.story-source`, `.back-link`.
- Produces: full-viewport mobile reader, published.

- [ ] **Step 1: Add CSS**

`.reader-topbar { display: none; }` by default. Under `body.reader-fullscreen`: hide site header/footer, big title/meta, `.story-source`, `.back-link`, and `.reader-count`; zero main padding; make `.story` a full-height flex column; show the top bar; let `.reader-deck.reader-ready` flex to fill; keep controls at the bottom with safe-area padding; add `overscroll-behavior: none`, `touch-action: manipulation` on controls/top bar, `-webkit-touch-callout: none` on images/controls, and `user-select: none` while `.is-swiping`. Outside `body.reader-fullscreen`, existing styles stay unchanged.

- [ ] **Step 2: Update `assets/reader.js`**

Toggle `reader-fullscreen` on `<body>` from `matchMedia('(max-width: 719px)')` with a change listener. Update `.reader-top-count` in `render()`. Move `.story-source` into the last card's `.card-body` once during setup. Add `.is-swiping` on pointerdown and remove it on pointerup/pointercancel/lostpointercapture. Keep all existing control behavior.

- [ ] **Step 3: Regenerate and verify in Chromium**

Run `node scripts/sync.js`, then headless Chromium: at 390x844 check full height, no page/horizontal scroll, viewport meta, top bar visible with correct count, back link href, source inside last card, button/arrow/swipe still work, `touch-action`/`overscroll-behavior`/`user-select` values; at 1280px and with JS disabled check unchanged layout.

- [ ] **Step 4: Commit and publish**

```bash
git add -A && git commit -m "feat: fullscreen mobile reader with touch guards" && git push origin main
```

- [ ] **Step 5: Verify live site**

Fetch a post on the custom domain; confirm HTTP 200 and the new meta/top bar.
