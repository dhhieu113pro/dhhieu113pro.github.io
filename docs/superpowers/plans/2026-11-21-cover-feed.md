# Cover Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home tile grid with a full-screen, scroll-snapping feed of story covers with a brand/position strip and non-swipe controls.

**Architecture:** `scripts/sync.js` emits one `.cover-slide` per story inside `.cover-feed`, plus a fixed `.feed-topbar` and `assets/home.js`. CSS handles full-screen slides and snapping; `home.js` updates the counter, wires arrow keys and the next button, and adds `.feed-ready` so the no-JS layout stays a normal vertical stack.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS/JS, headless Chromium verification.

**Spec:** `docs/superpowers/specs/2026-11-21-cover-feed-design.md`

## Global Constraints

- No npm dependencies, no framework, no build step.
- `scripts/sync.js` is the only writer of home HTML; post detail unchanged.
- Home keeps `<body class="home-picker">`, the `.sr-only` h1, and the zoomable viewport.
- No `.site-header` or `.site-footer` on home.
- Exact class names: `.cover-feed`, `.cover-slide`, `.cover-image`, `.cover-shade`, `.cover-content`, `.cover-title`, `.cover-meta`, `.cover-read`, `.feed-topbar`, `.feed-brand`, `.feed-count`, `.feed-next`.
- Counter hidden until `.feed-ready`; no-JS covers stack vertically.
- Node built-in tests plus Chromium at 390x844 and with JS disabled.

## Review Focus

- Without JS, covers must stack as a normal page and the counter must be hidden — Chromium check with JavaScript disabled.
- Snapping must actually land one cover per view and update the counter — Chromium check after scrolling to the second slide.
- Keyboard arrows and the next button must work as swipe alternatives — Chromium check.
- Text must stay readable over light or missing cover images — Chromium check of scrim layers.
- Post pages and the tile-free header/footer state must be unaffected — Node test plus Chromium check.

---

### Task 1: Generate cover feed markup

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: stories from the sync pipeline (`slug`, `title`, `byline`, `date`, `cover`).
- Produces: home HTML with `<div class="feed-topbar"><span class="feed-brand">Termux.io.vn</span><span class="feed-count">1 / N</span></div>`, `<div class="cover-feed">` containing one `<section class="cover-slide">` per story with optional `<img class="cover-image">`, a `.cover-shade`, `.cover-content` containing `<h2 class="cover-title">`, `<p class="cover-meta">` and `<a class="cover-read" href="posts/<slug>/">Đọc ngay</a>`, a `<button class="feed-next" aria-label="Truyện tiếp">↓</button>`, and `<script src="assets/home.js" defer></script>`. Empty state keeps only the `.empty-state` paragraph (no feed/topbar/script).

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `home renders a cover per story with a read link` — two stories produce two `class="cover-slide"`, two `class="cover-title"`, and `class="cover-read" href="posts/newer/"`;
2. `home renders the feed top bar and enhancer` — HTML contains `class="feed-brand"`, `class="feed-count">1 / 2`, `class="feed-next"`, and `src="assets/home.js"`;
3. `home still has no header or footer and keeps the sr-only heading` — existing assertions plus `<h1 class="sr-only">Truyện</h1>`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Replace the `.post-grid` template with the cover feed markup in Interfaces; keep the empty-state branch unchanged apart from its heading. Escape all story text.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: generate full-screen cover feed"
```

### Task 2: Feed styles, enhancer, browser verification, publish

**Files:**
- Modify: `assets/style.css`, `README.md`
- Create: `assets/home.js`
- Generated: `index.html`

**Interfaces:**
- Consumes: exact class names from Task 1.
- Produces: working app-like home, published.

- [ ] **Step 1: Add CSS**

`.cover-feed { height: 100dvh; overflow-y: auto; }`; `.cover-feed.feed-ready { scroll-snap-type: y mandatory; overscroll-behavior-y: contain; }`; `.cover-slide { min-height: 100dvh; position: relative; }`; `.feed-ready .cover-slide { scroll-snap-align: start; }`. `.cover-image` fills with `object-fit: cover`; `.cover-shade` layers a dark gradient plus base tint; `.cover-content` sits bottom-left with white title/meta and a visible `.cover-read` button. `.feed-topbar` is fixed with brand and count; `.feed-count` hidden unless `.feed-ready`; `.feed-next` fixed bottom-right.

- [ ] **Step 2: Implement `assets/home.js`**

Use `IntersectionObserver` with `root: feed`, `threshold: 0.6` to update `.feed-count` and an internal index. Wire ArrowDown/PageDown and ArrowUp/PageUp to scroll to the next/previous slide, `.feed-next` click to the next slide, hide the button on the last slide, then add `.feed-ready`. No dependencies.

- [ ] **Step 3: Regenerate and verify in Chromium**

Run `node scripts/sync.js`, then headless Chromium at 390x844: feed height, snap type, counter starts `1 / 2`, scrolling to slide two updates it, next button/arrow keys work, no horizontal scroll, title contrast, link href. With JS disabled: no `.feed-ready`, counter hidden, covers stacked. Open a post and confirm its reader still works.

- [ ] **Step 4: Commit and publish**

```bash
git add -A && git commit -m "feat: app-like cover feed home" && git push origin main
```

- [ ] **Step 5: Verify live site**

Fetch home and a post on the custom domain; confirm HTTP 200, `cover-feed` markup, and unchanged post reader.
