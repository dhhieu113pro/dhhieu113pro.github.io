# Reader Reading Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give post-card text a comfortable reading measure and add a home-icon link below the reader controls.

**Architecture:** `scripts/sync.js` wraps prev/dots/next in `.reader-nav` and adds `.reader-home` with an inline SVG. CSS owns the text spacing and the two-row controls; no JS changes.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS, headless Chromium verification.

**Spec:** `docs/superpowers/specs/2026-11-21-reader-reading-space-design.md`

## Global Constraints

- No npm dependencies, no framework, no network requests.
- `scripts/sync.js` is the only writer of post HTML; home/cover-feed unchanged.
- Home control is an inline SVG with `aria-hidden="true"` and link `aria-label="Về trang chủ"`, `href="../../"`.
- Text: left-aligned, `line-height: 1.8`, `max-width: 62ch`, side padding ~22px.
- `.reader-home` hidden unless the deck is enhanced (`.reader-ready`).
- Node built-in tests plus Chromium at 390x844.

## Review Focus

- Text must actually get the new padding/measure/line-height while remaining scrollable — Chromium computed-style check.
- Home link must sit below the nav row, be visible, and point home — Chromium position/href check.
- Existing swipe/buttons/dots/keys must still work after the controls are restructured — Chromium interaction check.
- No-JS and desktop layout must not gain a dead home button — Chromium check with JS disabled and at 1280px.
- Long titles/text must not overflow horizontally — Chromium check at 390px.

---

### Task 1: Generate home control markup

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: existing story fields; existing controls block in the post body.
- Produces: `<div class="reader-controls"><div class="reader-nav">` containing `.reader-prev`, `.reader-dots`, `.reader-next`, then `</div><a class="reader-home" href="../../" aria-label="Về trang chủ">` containing an inline `<svg aria-hidden="true" ...>` house icon, then `</a></div>`.

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `controls wrap navigation in a reader-nav row` — post HTML contains `class="reader-nav"` and the prev button appears after it;
2. `post pages have a home icon link below navigation` — HTML contains `class="reader-home" href="../../" aria-label="Về trang chủ"` and `<svg` with `aria-hidden="true"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on both assertions.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Replace the controls template with the nested structure in Interfaces. Keep button labels and dot markup unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: add reader home control markup"
```

### Task 2: Text spacing, control layout, browser verification, publish

**Files:**
- Modify: `assets/style.css`, `README.md`
- Generated: `posts/*/index.html`

**Interfaces:**
- Consumes: `.reader-nav`, `.reader-home` from Task 1; existing reader classes.
- Produces: comfortable text column and two-row controls, published.

- [ ] **Step 1: Add CSS**

`.card-body { padding: 24px 22px 12px; }` and `.card-text { margin: 0 auto; max-width: 62ch; text-align: left; line-height: 1.8; }` in both base and enhanced states. Make `.reader-controls` a centered column with `gap: 8px`; move the horizontal row layout to `.reader-nav`; add `.reader-home` as a 44px circle with 24px SVG icon, hidden unless `.reader-ready`. Keep fullscreen rules working.

- [ ] **Step 2: Regenerate and verify in Chromium**

Run `node scripts/sync.js`, then headless Chromium at 390x844: computed padding/line-height/max-width, home link visible below nav, href correct, no horizontal scroll, next/dot/arrow/swipe still work, long text still scrolls. With JS disabled and at 1280px, confirm no dead home button and unchanged layout.

- [ ] **Step 3: Commit and publish**

```bash
git add -A && git commit -m "feat: roomier reader text and home control" && git push origin main
```

- [ ] **Step 4: Verify live site**

Fetch a post on the custom domain; confirm HTTP 200 and the new home-control markup.
