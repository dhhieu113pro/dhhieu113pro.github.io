# Editorial Cover Grid Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-cover-per-screen swipe feed with a responsive editorial cover grid, without regenerating HTML or touching the reader.

**Architecture:** Generated markup and class names stay identical. `assets/style.css` restyles `.cover-feed`/`.cover-slide`/`.feed-topbar` into a paper grid; `assets/home.js` drops swipe/scroll-snap behavior and the `feed-ready` class, keeps the toggle and skeletons, and shows the story total.

**Tech Stack:** Vanilla CSS/JS, Node built-in `node:test`, pwterm browser checks.

**Spec:** `docs/superpowers/specs/2026-11-23-editorial-home-design.md`

## Global Constraints

- No dependencies, no new assets, no generated-HTML changes, no lint/type config. Merge gate: `node --test scripts/*.test.js`.
- Keep the class names used by sync tests and browser checks: `.cover-feed`, `.cover-slide`, `.cover-read`, `.listen-toggle`, `.feed-count`, `.feed-next`.
- Do not add `feed-ready` in home.js — the old full-screen CSS block must be removed.
- Preserve the headphone toggle, theme toggle, image skeletons, and 44 px CTA target.

## Review Focus

1. The grid is actually multi-column on desktop — browser check asserts computed `display: grid` and >1 column at 1024 px.
2. No stale full-screen behavior — browser check asserts `.cover-feed` has no scroll-snap and `.feed-ready` is absent.
3. Navigation still works — browser check clicks `.cover-read` in the grid and reaches `.reader-deck` via SPA.
4. Mini player no longer overlaps the hidden next button — existing `checks/mini-player.yaml` still passes.
5. Home JS no longer leaks listeners — existing home tests stay green.

---

### Task 1: Home behaviour — grid instead of swipe

**Files:**
- Modify: `assets/home.js`
- Test: `scripts/home.test.js`

**Interfaces:**
- Consumes: existing home markup.
- Produces: `window.HomePage.init(signal)` keeps the toggle + skeletons, sets `.feed-count` to the story total, never adds `feed-ready`, and adds no keydown/observer/next listeners.

- [ ] **Step 1: Write failing tests**

In `scripts/home.test.js`, add a richer DOM stub helper `loadFeed()` that sets `global.document` with a `.listen-toggle`, `.cover-feed` returning `.cover-slide` children with `.cover-image`, plus `.feed-count` and `.feed-next` stubs, and a `global.window` with matchMedia/IntersectionObserver counters. Assert after `HomePage.init()`:
```js
assert.equal(count.textContent, '2 truyện');
assert.equal(feed.classList.contains('feed-ready'), false);
assert.equal(observerCreated, 0);
assert.equal(keydownListeners, 0);
```
(Extend the existing stubs minimally; keep the toggle tests unchanged.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/home.test.js`
Expected: FAIL — count is `1 / 2`, `feed-ready` is added, observer created.

- [ ] **Step 3: Simplify `assets/home.js`**

Keep `setupToggle` and the image-skeleton loop. Replace the feed block with:
```js
const feed = document.querySelector('.cover-feed');
const count = document.querySelector('.feed-count');
const next = document.querySelector('.feed-next');
if (!feed || !count) return;
const slides = [...feed.querySelectorAll('.cover-slide')];
count.textContent = `${slides.length} truyện`;
if (next) next.hidden = true;
```
Remove the IntersectionObserver, reduced-motion scroll, `goTo`, render, next click and document keydown handlers and the `feed-ready` class. Keep `destroy()` (observer no longer needed; keep it as a no-op-safe cleanup).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/home.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/home.js scripts/home.test.js
git commit -m "refactor: home feed drops swipe behaviour for a grid"
```

---

### Task 2: Editorial grid styles

**Files:**
- Modify: `assets/style.css`

**Interfaces:**
- Consumes: unchanged generated markup.
- Produces: responsive paper grid home.

- [ ] **Step 1: Write a browser check first (`checks/editorial-home.yaml`)**

At 1024 px: goto home, waitFor `.cover-slide`, assert `getComputedStyle(document.querySelector('.cover-feed')).display === 'grid'`, grid has >1 column (`getComputedStyle(...).gridTemplateColumns.split(' ').length > 1`), `.cover-feed` has no `scroll-snap-type`, `.feed-ready` class absent, `.feed-next` hidden, and clicking the first `.cover-read` reaches `.reader-deck` via SPA. At 360 px assert one column and no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth + 1`). Screenshot to `artifacts/editorial-home.png`.

- [ ] **Step 2: Run it to verify it fails**

Run the check over HTTP with pwterm. Expected: FAIL — `.cover-feed` is `block`, snap is set.

- [ ] **Step 3: Replace the home CSS block**

Remove the whole `/* Home cover feed */` block including all `.feed-ready`, scroll-snap, full-screen `.cover-image`/`.cover-shade`/`.cover-content` rules. Add:
- `body.home-picker main { max-width: 1120px; padding: 0 20px 64px; margin: 0 auto; }`
- `.feed-topbar` static (not fixed), paper background, dark text, border-bottom, padding `20px 20px 16px`; brand + count + links visible.
- `.cover-feed { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); padding: 28px 0; }`
- `.cover-slide { background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }`
- `.cover-image { position: static; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 0; }`
- `.cover-shade { display: none; }`
- `.cover-content { position: static; padding: 16px; color: var(--fg); }`
- `.cover-title { font-size: 1.15rem; line-height: 1.35; max-width: none; margin: 0 0 8px; }` (keep sans)
- `.cover-meta` keeps the uppercase label styling from the earlier refresh.
- `.cover-read { min-height: 44px; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 0 16px; font-weight: 600; }` with a hover fill and visible focus ring.
- `.feed-count { display: block; opacity: 1; color: var(--muted); }`
- `.feed-next { display: none !important; }`
- Keep `.sr-only` and empty-state rules.

- [ ] **Step 4: Run the check and the full gate**

Run: the browser check (expect pass) and `node --test scripts/*.test.js` (expect green).

- [ ] **Step 5: Commit**

```bash
git add assets/style.css checks/editorial-home.yaml
git commit -m "feat: editorial cover grid on the home page"
```

---

### Task 3: Regression checks and final verification

- [ ] Run `node --test scripts/*.test.js` — expect green.
- [ ] Run `checks/editorial-home.yaml`, `checks/spa.yaml`, `checks/listen.yaml`, `checks/mini-player.yaml` over HTTP — all green.
- [ ] No generated HTML change: `git status --short` must not list `index.html`, `posts/`, or `tam-su/`.
- [ ] Commit any check adjustments, then finish per the standing workflow.
