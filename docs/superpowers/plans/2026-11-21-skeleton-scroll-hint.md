# Skeleton and Scroll Hint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image-loading skeletons to home and detail pages, and a down-arrow hint on story parts whose text scrolls.

**Architecture:** `scripts/sync.js` emits one `.scroll-hint` per reader card. CSS provides the shimmer and hint styles; `assets/home.js` and `assets/reader.js` toggle `.skeleton` based on real image load events and `.hint-visible` based on per-card overflow/scroll position.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS/JS, pwterm browser verification.

**Spec:** `docs/superpowers/specs/2026-11-21-skeleton-scroll-hint-design.md`

## Global Constraints

- No npm dependencies, no framework, no build step.
- `scripts/sync.js` is the only writer of HTML; narrative/navigation unchanged.
- `.scroll-hint` is `aria-hidden="true"` and `pointer-events: none`.
- Skeleton class is JS-only; images remain visible without JS.
- Shimmer animation disabled under `prefers-reduced-motion`.
- Node built-in tests plus pwterm verification at 390x844.

## Review Focus

- Cached images must skip the skeleton immediately — pwterm check that `.skeleton` clears on a loaded page.
- Hint must appear only on overflowing parts and clear at the bottom — pwterm check on a long part and a short part.
- No-JS must still show images and no hint — Chromium check.
- Reduced motion must disable shimmer — Chromium computed-style check.
- Existing navigation and overlays must not regress — pwterm interaction check.

---

### Task 1: Emit scroll-hint markup

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: story parts from the sync pipeline.
- Produces: each `<section class="reader-card">` contains `<span class="scroll-hint" aria-hidden="true">↓</span>` as a direct child, after `.card-body`.

- [ ] **Step 1: Write failing test**

Add to `scripts/sync.test.js`: `post emits a scroll hint per card` — a story with two rendered parts produces two `class="scroll-hint" aria-hidden="true"` occurrences.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the new assertion.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Add the hint element to the card template.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: emit scroll hint markup in reader cards"
```

### Task 2: Shimmer, hint logic, pwterm verification, publish

**Files:**
- Modify: `assets/style.css`, `assets/home.js`, `assets/reader.js`, `README.md`
- Generated: `index.html`, `posts/*/index.html`

**Interfaces:**
- Consumes: `.scroll-hint` from Task 1; existing `.cover-image`, `.card-image`, `.card-body`.
- Produces: working skeletons and hints, published.

- [ ] **Step 1: Add CSS**

Shimmer keyframes and `.skeleton` background on `.cover-slide`/`.reader-card`; images fade in on load. `.scroll-hint` hidden by default, shown with `.hint-visible`, positioned above the dots, non-interactive. Reduced-motion disables the shimmer animation.

- [ ] **Step 2: Update JS**

`home.js`: add `.skeleton` to slides with images, clear on load/error or when already complete. `reader.js`: same for cards with images; for each `.card-body`, toggle `.hint-visible` on its card based on `scrollTop + clientHeight < scrollHeight - 4`, on setup, scroll, and resize.

- [ ] **Step 3: Regenerate and verify with pwterm**

Run `node scripts/sync.js`, then a pwterm flow at 390x844 checking: no stale `.skeleton` after load; hint visible on the long part and absent on a short part; hint clears after scrolling to bottom; navigation overlays still work. Chromium checks for no-JS and reduced motion.

- [ ] **Step 4: Commit and publish**

```bash
git add -A && git commit -m "feat: image skeletons and scroll hint" && git push origin main
```

- [ ] **Step 5: Verify live site**

Fetch home and a post; re-run the pwterm flow against the live URL.
