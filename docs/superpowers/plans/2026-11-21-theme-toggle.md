# Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light/dark/auto theme switch in both top bars, persisted locally and applied before CSS loads.

**Architecture:** `scripts/sync.js` emits an early inline theme script in `<head>` and a `.theme-toggle` button in both top bars. `assets/theme.js` cycles modes and persists them; CSS tokens are keyed on `<html data-theme>`.

**Tech Stack:** Node built-ins (`node:sqlite`, `node:test`), plain HTML/CSS/JS, pwterm verification.

**Spec:** `docs/superpowers/specs/2026-11-21-theme-toggle-design.md`

## Global Constraints

- No dependencies, no framework, no network requests.
- `scripts/sync.js` is the only writer of HTML.
- localStorage key `blog-theme`, values `light|dark|auto`, default `auto`.
- Inline head script wrapped in try/catch; applies `data-theme` before CSS.
- Button is 44px with three inline SVGs and Vietnamese aria-label; no emoji.
- Asset URLs keep content-hash cache busting; `theme.js` joins the hash set.
- Node tests plus pwterm verification.

## Review Focus

- Theme must apply before CSS so there is no flash — pwterm check of `data-theme` at load and computed background.
- Cycling must change light→dark→auto and persist across reload — pwterm check with localStorage.
- Auto must follow emulated `prefers-color-scheme` — pwterm/Chromium check.
- Toggle must not break top bar layout or other controls — geometry check at 390px.
- No-JS pages must still render in a usable theme — Chromium check.

---

### Task 1: Generate theme markup

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: shell head and both top bar templates.
- Produces: inline head script `document.documentElement.dataset.theme = localStorage.getItem('blog-theme') || 'auto'` (try/catch); `<button class="theme-toggle" type="button" aria-label="Chế độ: Tự động">` with three SVG icons (sun/moon/auto) in both `.feed-topbar` and `.reader-topbar`; `<script src="assets/theme.js?v=<hash>" defer>` on home and `../../assets/theme.js?v=<hash>` on posts; `assetVersion()` includes theme.js.

- [ ] **Step 1: Write failing tests**

Add to `scripts/sync.test.js`:
1. `pages apply the stored theme before CSS` — both home and post HTML contain the inline dataset.theme script;
2. `both top bars have a theme toggle` — both HTML files contain `class="theme-toggle"` and three `class="theme-icon"` SVGs;
3. `theme script is cache-busted` — both HTML files contain `theme.js?v=[0-9a-f]{8}` with the same version as the stylesheet.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement in `scripts/sync.js`**

Add the inline head script, toggle button markup in both top bars, theme.js script tags, and include theme.js in `assetVersion()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/sync.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ && git commit -m "feat: theme toggle markup"
```

### Task 2: Theme tokens, JS, verification, publish

**Files:**
- Create: `assets/theme.js`
- Modify: `assets/style.css`, `README.md`
- Generated: `index.html`, `posts/*/index.html`

**Interfaces:**
- Consumes: `.theme-toggle`, `.theme-icon` from Task 1; existing token names.
- Produces: working theme switch, published.

- [ ] **Step 1: Restructure tokens and style the toggle**

Keep light tokens on `:root`; move dark tokens to `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root[data-theme="auto"] { ... } }`; remove the old unconditional dark media block. Style `.theme-toggle` as a 44px circle in both top bars; show exactly one `.theme-icon` per mode via `[data-theme]` selectors.

- [ ] **Step 2: Implement `assets/theme.js`**

Read/apply stored theme, cycle light→dark→auto on click, update aria-label and localStorage in try/catch, and respond to `storage` events.

- [ ] **Step 3: Regenerate and verify with pwterm**

Run `node scripts/sync.js`, then a pwterm flow at 390x844 checking: initial `data-theme`, click cycling and background color changes, persistence after reload, auto under emulated light/dark color scheme, and no top-bar layout break. Chromium no-JS check.

- [ ] **Step 4: Commit and publish**

```bash
git add -A && git commit -m "feat: light dark auto theme toggle" && git push origin main
```

- [ ] **Step 5: Verify live site**

Fetch home and a post; re-run the pwterm flow against the live URL.
