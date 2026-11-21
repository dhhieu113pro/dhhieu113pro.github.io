# Reader Minimal Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the reader's button row with overlay dots and a next-post bar, freeing vertical space for reading.

**Architecture:** `scripts/sync.js` emits dots inside `.reader-deck`, removes prev/next/home/count elements, and adds `.reader-next-post` linking to the following story. CSS positions the overlays and gives the deck the freed height; `assets/reader.js` adapts to dots in the deck and an optional counter.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS/JS, pwterm browser flow for verification.

**Spec:** `docs/superpowers/specs/2026-11-21-reader-minimal-controls-design.md`

## Global Constraints

- No npm dependencies, no framework, no network requests at runtime.
- `scripts/sync.js` is the only writer of post HTML; cover-feed home unchanged.
- Post pages keep zoom lock, top bar back arrow, text spacing, and content-hash asset URLs.
- Next-post href is `../<next-slug>/` and wraps from last story to first.
- Each part text is split on `/(?<=\.)\s+/` and newlines into individual `<span class="sentence">` blocks.
- Dots remain 24x24 targets with Vietnamese aria-labels.
- Node built-in tests plus a pwterm flow at 390x844.

## Review Focus

- Removing the controls row must actually increase deck height without overlapping text — pwterm geometry check.
- Next-post bar must link to the correct following story and wrap on the last one — Node test plus pwterm navigation.
- Dots must be visible over content and still change parts — pwterm check.
- Swipe and arrow keys must still work after JS adaptation — pwterm check.
- No-JS and desktop must remain readable with no dead controls — Chromium check.

---

### Task 1: Generate minimal controls and next-post link

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: ordered `stories` array from sync; existing card/deck markup.
- Produces: post HTML with `.reader-dots` inside `.reader-deck` after `.reader-track`; no `.reader-prev`, `.reader-next`, `.reader-home`, `.reader-count`, or `.reader-nav`; and `<a class="reader-next-post" href="../<nextSlug>/">` containing `.next-post-label` ("Tiếp theo"), `.next-post-title` (next story title), and `.next-post-arrow` ("→").

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `post drops button controls and bottom counter` — post HTML has none of `reader-nav`, `reader-prev`, `reader-next"`, `reader-home`, `reader-count`;
2. `dots live inside the deck` — HTML matches `class="reader-track"` ... `class="reader-dots"` within the same deck block;
3. `post links to the next story` — with two stories, the newer one's HTML has `class="reader-next-post" href="../older/"` and the older's has `href="../newer/"` (wrap);
4. `each sentence renders on its own line` — a part text of `Một. Hai. Ba.` produces three `class="sentence"` spans in order, with all three sentences present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Move the dots markup into the deck; remove the controls block and bottom counter; compute `nextStory` by index with wrap; emit the next-post anchor after the deck. Split each part's text into sentence blocks with `/(?<=\.)\s+/` and newlines, rendered as `<span class="sentence">`, keeping all words.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: minimal reader controls with next-post link"
```

### Task 2: Overlay styles, JS adaptation, pwterm verification, publish

**Files:**
- Modify: `assets/style.css`, `assets/reader.js`, `README.md`
- Generated: `posts/*/index.html`

**Interfaces:**
- Consumes: `.reader-dots` inside deck and `.reader-next-post` from Task 1.
- Produces: overlay reader, published.

- [ ] **Step 1: Add CSS**

`.reader-dots` absolutely positioned near the deck bottom with a soft gradient backing; `.reader-next-post` fixed at bottom with label/title/arrow, 48px minimum height, safe-area padding; increased bottom padding on `.card-body`; deck fills the space previously used by controls. Remove obsolete `.reader-controls` rules.

- [ ] **Step 2: Update `assets/reader.js`**

Find dots with `deck.querySelector('.reader-dots')`; make the bottom counter optional (top bar remains required); drop prev/next button wiring; keep dot clicks, arrow keys, swipe, aria-current, inert/aria-hidden, and `is-swiping`.

- [ ] **Step 3: Regenerate and verify with pwterm**

Run `node scripts/sync.js`, then a pwterm flow at 390x844 checking: deck height increased, dots visible, next-post bar visible with correct href and title, dot click advances the counter, arrow key and swipe still work, no horizontal scroll. Check no-JS/desktop with Chromium.

- [ ] **Step 4: Commit and publish**

```bash
git add -A && git commit -m "feat: overlay reader dots and next-post bar" && git push origin main
```

- [ ] **Step 5: Verify live site**

Fetch a post and confirm the new markup; re-run the pwterm flow against the live URL.
