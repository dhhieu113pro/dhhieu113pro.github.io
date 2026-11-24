# Reader font consistency and dots placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution, fixed for this session) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make story-card content use the site's sans-serif font and move the reader navigation dots from the deck bottom to directly under the card image.

**Architecture:** Static site; all behaviour lives in `assets/style.css`. No generator, markup, or JS changes are needed. Regression tests read the stylesheet as text because Node has no CSS layout engine here.

**Tech Stack:** Node built-in test runner (`node:test`, `node:assert`), CSS, pwterm/browser check.

**Spec:** `docs/superpowers/specs/2026-11-24-reader-font-and-dots-design.md`

## Global Constraints

- Touch targets stay 24px with a visible focus ring.
- No web font, no network request, no new dependency.
- No change to generated HTML, sync.js, app.js, or reader.js.
- No-JS fallback keeps dots hidden until `.reader-ready`.

## Review Focus

- Font consistency: post content must use the same stack as `body` — test in Task 1 asserts no serif `font-family` on `.card-text`.
- Dots anchor: dots must sit at the image bottom (46% flex-basis + 12px card padding), not the deck bottom — test in Task 1 asserts `top: calc(46%…)` and no `bottom: 12px`.
- Mini player present: dots must not be nudged by the fixed bar — test in Task 1 asserts no mini-player dots `bottom` override remains.
- No-JS fallback: `.reader-dots { display: none; }` must survive — test in Task 1 asserts the rule.
- Touch affordance: 24px dots and focus ring must survive — test in Task 1 asserts width/height and `:focus-visible`.

---

### Task 1: CSS regression tests (RED)

**Files:**
- Create: `scripts/style.test.js`
- Reference: `assets/style.css`

**Interfaces:**
- Consumes: raw text of `assets/style.css` via `fs.readFileSync` relative to `__dirname`.
- Produces: three failing `node:test` cases that pin the font, dots anchor, and mini-player interaction.

- [ ] **Step 1: Write `scripts/style.test.js` with these cases**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'style.css'), 'utf8');

test('card text uses the inherited sans-serif body font', () => {
  const rule = css.match(/\.card-text\s*\{[^}]*\}/);
  assert.ok(rule, 'expected a .card-text rule');
  assert.ok(!/font-family/.test(rule[0]), 'card text must not override the body font-family');
});

test('reader dots sit under the card image, not at the deck bottom', () => {
  const rule = css.match(/\.reader-deck\.reader-ready \.reader-dots\s*\{[^}]*\}/);
  assert.ok(rule, 'expected an enhanced reader-dots rule');
  assert.match(rule[0], /top:\s*calc\(46%/);
  assert.ok(!/bottom:\s*12px/.test(rule[0]), 'dots must not be pinned to the deck bottom');
});

test('no mini-player override moves the dots, and core affordances survive', () => {
  assert.ok(!/\.reader-dots\s*\{[^}]*bottom:\s*calc\(70px/.test(css));
  assert.match(css, /\.reader-dots\s*\{ display: none; \}/);
  const dot = css.match(/\.reader-dots \.reader-dot\s*\{[^}]*\}/);
  assert.ok(dot && /width:\s*24px/.test(dot[0]) && /height:\s*24px/.test(dot[0]));
  assert.match(css, /\.reader-dots \.reader-dot:focus-visible/);
});
```

- [ ] **Step 2: Run the new tests and verify RED**

Run: `node --test scripts/style.test.js`
Expected: FAIL — first case reports the Georgia `font-family` override; second case finds `bottom: 12px` and no `top: calc(46%…)`; third case finds the mini-player bottom override.

- [ ] **Step 3: Commit the tests**

```bash
git add scripts/style.test.js
git commit -m "test: pin sans-serif card text and dots under image"
```

---

### Task 2: Apply the CSS fix (GREEN)

**Files:**
- Modify: `assets/style.css` (remove `.card-text` serif line ~533; change `.reader-deck.reader-ready .reader-dots` block ~185-199; remove line ~608 mini-player dots override)

**Interfaces:**
- Consumes: the three tests from Task 1.
- Produces: stylesheet where content inherits `body` font and dots sit below the 46%-height media area with the mini player no longer affecting them.

- [ ] **Step 1: Remove the serif override**

Delete the line `.card-text { font-family: Georgia, "Times New Roman", serif; }` and trim the now-stale "system serif body" wording from its nearby comment, leaving `.card-text`'s existing `margin`/`max-width`/`text-align`/`line-height` rule at ~137 untouched.

- [ ] **Step 2: Reposition the dots**

In `.reader-deck.reader-ready .reader-dots`, replace `bottom: 12px;` with `top: calc(46% + 1px); bottom: auto;`, and reduce the bar padding from `8px 12px` to `0 12px` so the 24px dots fit inside `.card-body`'s 24px top padding. Keep `position: absolute`, `left`, `right`, `z-index`, flex layout, background gradient, and `touch-action` unchanged.

- [ ] **Step 3: Remove the mini-player dots nudge**

Delete `:root.has-mini-player .reader-deck.reader-ready .reader-dots { bottom: calc(70px + env(safe-area-inset-bottom)); }`, keeping the `.reader-next-post` line next to it.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test scripts/style.test.js`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Run the full suite**

Run: `node --test scripts/*.test.js`
Expected: PASS — all tests (existing suite plus 3 new), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add assets/style.css
git commit -m "fix: consistent reader font and dots under the card image"
```
