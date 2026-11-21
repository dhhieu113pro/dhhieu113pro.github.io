# Home Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page's header/footer and card list with a full-width grid of image tiles that link to posts.

**Architecture:** `scripts/sync.js` gains a `homePicker` shell mode that omits header/footer and tags `<body class="home-picker">`, and emits one tile per story. CSS owns the responsive grid and overlay. No runtime JS.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS, headless Chromium verification.

**Spec:** `docs/superpowers/specs/2026-11-21-home-picker-design.md`

## Global Constraints

- No npm dependencies, no framework, no build step.
- `scripts/sync.js` is the only writer of HTML; post detail markup unchanged.
- Home page has no `.site-header` or `.site-footer` elements.
- Home body carries `class="home-picker"`; home viewport meta stays zoomable.
- Tiles link to `posts/<slug>/`; all text passes through `esc()`.
- Node built-in tests; Chromium at 390px and 1280px.

## Review Focus

- Home must have no header/footer markup, while post pages keep theirs — Node test plus Chromium check.
- Two columns at 390px and four at 1280px with no horizontal scroll — Chromium check of tile positions.
- Missing cover image must still produce a usable tile with a visible title — Node test with a story that has no images.
- Tile image loading must not break layout — Chromium check of `object-fit` and tile dimensions.
- Post reader must be unaffected — Chromium check of a post page's top bar and controls.

---

### Task 1: Generate home grid markup

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: stories from the sync pipeline (`slug`, `title`, `date`, `cover`).
- Produces: home HTML with `<body class="home-picker">`, no `.site-header`/`.site-footer`, `<div class="post-grid">` containing one `<a class="post-tile" href="posts/<slug>/">` per story with `<img class="tile-image" src="assets/img/<slug>/<n>.webp" alt="">` (when a cover exists), `<h2 class="tile-title">…</h2>`, and `<span class="tile-date">…</span>`. Empty state remains a `.empty-state` paragraph. Post pages keep header/footer.

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `home page drops header and footer` — `index.html` has no `class="site-header"` and no `class="site-footer"`, and has `<body class="home-picker">`;
2. `home page renders one tile per story` — two stories produce two `class="post-tile"` and two `class="tile-image"`, with `href="posts/<slug>/"` and a `tile-title` containing the escaped title;
3. `post pages keep the site header and footer` — post HTML still contains both;
4. `a story without an image still gets a tile` — with a `skipImage` story, `index.html` contains one `class="post-tile"` and a `tile-title`, but no `class="tile-image"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Extend `shell(title, body, prefix, lockZoom, bare)` so `bare` emits `<body class="home-picker">` and omits `<header class="site-header">` and `<footer class="site-footer">`. Replace the `story-list` template with the tile grid described in Interfaces.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: generate home post-picker grid"
```

### Task 2: Grid styles, browser verification, publish

**Files:**
- Modify: `assets/style.css`, `README.md`
- Generated: `index.html`

**Interfaces:**
- Consumes: exact `home-picker`, `post-grid`, `post-tile`, `tile-image`, `tile-title`, `tile-date` names from Task 1.
- Produces: responsive picker grid, published.

- [ ] **Step 1: Add CSS**

`body.home-picker main { max-width: none; padding: 0; }`. `.post-grid` is a grid with 2 columns, 8px gap/padding. `.post-tile` is `position: relative`, `aspect-ratio: 3/4`, `border-radius: 12px`, `overflow: hidden`; `.tile-image` fills it with `object-fit: cover`; `.tile-title` and `.tile-date` sit at the bottom over a bottom-up dark gradient scrim, in white. Add 3-column at 720px and 4-column at 1200px. Keep post-page styles untouched.

- [ ] **Step 2: Regenerate and verify in Chromium**

Run `node scripts/sync.js`, then headless Chromium: at 390px check two columns, no header/footer elements, no horizontal scroll, tile aspect ratio and image `object-fit`; at 1280px check four columns; open a post and check its top bar/controls still work.

- [ ] **Step 3: Commit and publish**

```bash
git add -A && git commit -m "feat: home post picker grid" && git push origin main
```

- [ ] **Step 4: Verify live site**

Fetch the home page on the custom domain; confirm HTTP 200, `post-grid`, and no `site-header`.
