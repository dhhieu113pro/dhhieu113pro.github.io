# AI Vision Ad Blocker Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Hallmark-designed AI Vision Ad Blocker landing page at `https://dhhieu113pro.github.io/adblocker/`, using the three real CI-generated 1280x800 product screenshots, and route the root homepage Adblocker card to it.

**Architecture:** Keep the site static: one self-contained `adblocker/index.html` plus three local PNG assets. Use Playwright for browser-level source-page verification and a small shell assembler plus Node test for the GitHub Pages artifact. The existing Pages workflow becomes a verify/build job plus a deploy job, so pull requests can prove responsive behavior and artifact assembly without deploying.

**Tech Stack:** Static HTML/CSS/vanilla JS, GitHub Pages, GitHub Actions, Node.js 22, Playwright 1.55.0, Node built-in test runner, Bash.

**Spec:** `docs/superpowers/specs/2026-08-23-adblocker-landing-design.md`

## Global Constraints

- Public route: `/adblocker/`.
- Hallmark macrostructure: `Workbench`; use screenshot-led sections, not `hero -> three feature cards -> CTA`.
- Preserve the approved visual system: Bricolage Grotesque display, IBM Plex Sans body, IBM Plex Mono technical labels.
- Theme behavior is `System -> Light -> Dark`, sharing the existing `site-theme` localStorage key with `/`.
- Use only the three PNGs from Ad Blocker CI run `32648744945`, artifact `9495598136`: `01-overview.png`, `02-settings.png`, `03-history.png`.
- Each source PNG must remain exactly `1280x800`.
- Current product copy must state MobileNetV4 is the recommended/default classifier; CLIP is an explicit alternative.
- No Microsoft Edge Store CTA until a confirmed public listing URL exists.
- No fabricated metrics, testimonials, logos, benchmarks, adoption claims, or performance claims.
- No fake browser chrome, device mockups, fake title bars, or redrawn Edge UI around screenshots.
- All page colors and font-family declarations consume named tokens; no mid-render color/font improvisation.
- `html, body { overflow-x: clip; }` and no horizontal overflow at 320, 375, 414, or 768 px.
- Visible `:focus-visible` states and `prefers-reduced-motion: reduce` handling are mandatory.
- No production files are deleted.
- Quay publishing behavior under `/quay/` must remain unchanged.
- Hallmark pre-emit scores for Philosophy, Hierarchy, Execution, Specificity, Restraint, and Variety must all be >= 3/5; target 4/5 each.

---

## File Structure

**Create**
- `adblocker/index.html` — complete landing page, theme behavior, responsive layout, and restrained interaction.
- `adblocker/assets/01-overview.png` — pinned CI screenshot asset.
- `adblocker/assets/02-settings.png` — pinned CI screenshot asset.
- `adblocker/assets/03-history.png` — pinned CI screenshot asset.
- `playwright.config.mjs` — static-source browser test configuration.
- `tests/adblocker-page.spec.mjs` — route/content/theme/responsive/accessibility browser contract.
- `tests/homepage.spec.mjs` — root Adblocker-card routing contract.
- `scripts/assemble-site.sh` — one source of truth for building `site/` from Pages source plus Quay docs.
- `tests/assemble-site.test.mjs` — artifact assembly regression test, including preservation of Quay content.

**Modify**
- `index.html` — point the Adblocker card to `./adblocker/` and replace its stale experiment copy with exact approved product copy.
- `.github/workflows/pages.yml` — run source/browser tests on PRs, assemble/upload the Pages artifact once, and deploy only for non-PR events.

**Existing design artifacts (do not rewrite during implementation unless requirements change)**
- `docs/superpowers/specs/2026-08-23-adblocker-landing-design.md`
- `docs/superpowers/plans/2026-08-24-adblocker-landing.md`

---

### Task 1: Add a Browser Contract and Prove the Landing Page Is Missing

**Files:**
- Create: `playwright.config.mjs`
- Create: `tests/adblocker-page.spec.mjs`

**Interfaces:**
- Consumes: repository root served over HTTP.
- Produces: browser contract for `/adblocker/`, exact screenshot paths/dimensions, product copy, shared theme state, responsive overflow, and focus visibility.

- [ ] **Step 1: Create the Playwright configuration**

Create `playwright.config.mjs`:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4173 --directory .',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
```

- [ ] **Step 2: Write the failing landing-page tests**

Create `tests/adblocker-page.spec.mjs` with these helpers and assertions:

```js
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const widths = [320, 375, 414, 768, 1280];
const screenshots = [
  ['01-overview.png', 1280, 800],
  ['02-settings.png', 1280, 800],
  ['03-history.png', 1280, 800],
];

function pngSize(buffer) {
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test('publishes a grounded Workbench landing page', async ({ page }) => {
  const response = await page.goto('/adblocker/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Local visual protection for the web.' })).toBeVisible();
  await expect(page.getByText('Network rules')).toBeVisible();
  await expect(page.getByText('page heuristics')).toBeVisible();
  await expect(page.getByText('local image classification')).toBeVisible();
  await expect(page.getByText(/MobileNetV4/)).toBeVisible();
  await expect(page.getByRole('link', { name: /GitHub/i }).first()).toHaveAttribute(
    'href',
    'https://github.com/dhhieu113pro/adblocker-extension'
  );
  await expect(page.getByText(/trusted by|10×|10x|best ad blocker/i)).toHaveCount(0);
});

test('uses the three pinned 1280x800 screenshots', async ({ page }) => {
  await page.goto('/adblocker/');
  for (const [name, width, height] of screenshots) {
    await expect(page.locator(`img[src="./assets/${name}"]`)).toBeVisible();
    const data = await readFile(`adblocker/assets/${name}`);
    expect(pngSize(data)).toEqual({ width, height });
  }
});

test('shares the root site theme preference', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('site-theme', 'dark'));
  await page.goto('/adblocker/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const toggle = page.getByRole('button', { name: /Theme:/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  expect(await page.evaluate(() => localStorage.getItem('site-theme'))).toBe(null);
});

test('has no horizontal overflow at Hallmark verification widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/adblocker/');
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth, `overflow at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test('shows a visible keyboard focus indicator', async ({ page }) => {
  await page.goto('/adblocker/');
  const github = page.getByRole('link', { name: /GitHub/i }).first();
  await github.focus();
  const outline = await github.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Install the pinned test runner without changing project dependencies**

Run:

```bash
npm install --no-save --package-lock=false @playwright/test@1.55.0
npx playwright install chromium
```

Expected: Playwright 1.55.0 and Chromium install successfully.

- [ ] **Step 4: Run the contract to verify RED**

Run:

```bash
npx playwright test tests/adblocker-page.spec.mjs
```

Expected: FAIL because `/adblocker/` and/or its assets do not exist yet. Existing `/` serving successfully confirms the test harness itself works.

- [ ] **Step 5: Commit the RED contract**

```bash
git add playwright.config.mjs tests/adblocker-page.spec.mjs
git commit -m "test(pages): define adblocker landing contract"
```

---

### Task 2: Add the Pinned Screenshots and Build the Hallmark Workbench Page

**Files:**
- Create: `adblocker/assets/01-overview.png`
- Create: `adblocker/assets/02-settings.png`
- Create: `adblocker/assets/03-history.png`
- Create: `adblocker/index.html`
- Test: `tests/adblocker-page.spec.mjs`

**Interfaces:**
- Consumes: CI run `32648744945`, artifact `9495598136`, and the browser contract from Task 1.
- Produces: `/adblocker/` source page with stable image paths and shared `site-theme` behavior.

- [ ] **Step 1: Retrieve exactly the pinned screenshot artifact**

Download artifact `9495598136` from repository `dhhieu113pro/adblocker-extension` and extract only:

```text
01-overview.png
02-settings.png
03-history.png
```

Copy them unchanged to:

```text
adblocker/assets/01-overview.png
adblocker/assets/02-settings.png
adblocker/assets/03-history.png
```

Do not resize, recompress, redraw, or add chrome.

- [ ] **Step 2: Verify the copied assets before page work**

Run:

```bash
node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
for (const name of ['01-overview.png', '02-settings.png', '03-history.png']) {
  const b = await readFile(`adblocker/assets/${name}`);
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  if (width !== 1280 || height !== 800) throw new Error(`${name}: ${width}x${height}`);
  console.log(`${name}: ${width}x${height}`);
}
NODE
```

Expected:

```text
01-overview.png: 1280x800
02-settings.png: 1280x800
03-history.png: 1280x800
```

- [ ] **Step 3: Create the Workbench HTML structure**

Create `adblocker/index.html` with this semantic skeleton and exact product claims:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>AI Vision Ad Blocker — Local visual protection</title>
  <meta name="description" content="Local browser protection using network rules, heuristics, and on-device image classification.">
  <script>
    (() => {
      const theme = localStorage.getItem('site-theme');
      if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    })();
  </script>
  <!-- Free public fonts only. -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="../">Hieu Dam / AI Vision Ad Blocker</a>
    <nav aria-label="Product">
      <a href="https://github.com/dhhieu113pro/adblocker-extension">GitHub ↗</a>
      <button id="theme-toggle" type="button" aria-label="Theme: System. Click to switch to Light." title="Theme: System">…</button>
    </nav>
  </header>

  <main>
    <section class="opening">
      <p class="machine-label">AI VISION AD BLOCKER</p>
      <h1>Local visual protection for the web.</h1>
      <p>Network rules, page heuristics, and on-device image classification work together in your browser.</p>
      <a class="source-link" href="https://github.com/dhhieu113pro/adblocker-extension">View source on GitHub ↗</a>
    </section>

    <section class="workbench workbench--overview" aria-labelledby="overview-title">
      <div class="workbench-copy">
        <p class="machine-label">OVERVIEW</p>
        <h2 id="overview-title">Know what is being blocked.</h2>
        <p>See protection state, page context, and detected activity in one place.</p>
      </div>
      <figure><img src="./assets/01-overview.png" alt="AI Vision Ad Blocker Overview tab showing protection status and detected activity"></figure>
    </section>

    <section class="workbench workbench--settings" aria-labelledby="settings-title">
      <figure><img src="./assets/02-settings.png" alt="AI Vision Ad Blocker Settings tab with automatic protection and MobileNetV4 selected"></figure>
      <div class="workbench-copy">
        <p class="machine-label">SETTINGS</p>
        <h2 id="settings-title">Control the model.</h2>
        <p>MobileNetV4 is the recommended default for local image classification. CLIP remains available as an explicit alternative.</p>
      </div>
    </section>

    <section class="workbench workbench--history" aria-labelledby="history-title">
      <div class="workbench-copy">
        <p class="machine-label">HISTORY</p>
        <h2 id="history-title">Review recent activity.</h2>
        <p>Inspect recent blocking activity and clear local history whenever you want.</p>
      </div>
      <figure><img src="./assets/03-history.png" alt="AI Vision Ad Blocker History tab showing recent local blocking activity"></figure>
    </section>

    <section class="pipeline" aria-labelledby="pipeline-title">
      <h2 id="pipeline-title">Protection without sending the page away.</h2>
      <ol aria-label="Protection pipeline">
        <li>Network rules</li><li>page heuristics</li><li>local image classification</li>
      </ol>
      <p>Image inference runs in the browser's local offscreen runtime.</p>
    </section>
  </main>

  <footer>
    <a href="https://github.com/dhhieu113pro/adblocker-extension">Source on GitHub ↗</a>
    <span>MIT licensed · Hieu Dam</span>
  </footer>
</body>
</html>
```

- [ ] **Step 4: Add the locked token system and Workbench layout**

Inside `adblocker/index.html`, place all light/dark color values and all font stacks in `:root`, `@media(prefers-color-scheme:dark)`, and the explicit theme overrides. Component selectors must use only variables.

Start the CSS with the Hallmark stamp and invariant tokens:

```css
/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * visual-system: product-locked · gates: pending-final-review · studied: no
 */
:root {
  --color-paper: oklch(97% 0.008 250);
  --color-surface: oklch(94% 0.012 250);
  --color-ink: oklch(22% 0.018 252);
  --color-muted: oklch(49% 0.018 252);
  --color-rule: oklch(82% 0.014 250);
  --color-accent: oklch(62% 0.19 247);
  --color-focus: oklch(67% 0.20 247);
  --color-success: oklch(64% 0.13 158);
  --font-display: "Bricolage Grotesque", sans-serif;
  --font-body: "IBM Plex Sans", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
  --max: 1180px;
}
html, body { margin: 0; overflow-x: clip; }
body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-body); }
h1, h2 { font-family: var(--font-display); font-style: normal; overflow-wrap: anywhere; min-width: 0; }
.machine-label { font-family: var(--font-mono); }
:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
```

Dark/system/explicit theme variants must define the same token names rather than changing component colors directly.

Use these structural rules:

```css
.workbench { width: min(var(--max), calc(100% - 40px)); margin-inline: auto; }
.workbench--settings,
.workbench--history { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, .65fr); align-items: center; }
.workbench--history { grid-template-columns: minmax(0, .65fr) minmax(0, 1.35fr); }
figure { margin: 0; min-width: 0; }
figure img { display: block; width: 100%; height: auto; }
@media (max-width: 999px) {
  .workbench--settings,
  .workbench--history { grid-template-columns: minmax(0, 1fr); }
  .workbench--settings figure { order: 2; }
}
@media (max-width: 767px) {
  .workbench { width: min(var(--max), calc(100% - 28px)); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
```

Do not add nested feature cards, dashboard tiles, gradients, fake window frames, or device mockups.

- [ ] **Step 5: Implement the exact shared theme cycle**

Use the same storage contract as the root page:

```js
const STORAGE_KEY = 'site-theme';
const toggle = document.getElementById('theme-toggle');
const modes = ['auto', 'light', 'dark'];
let mode = localStorage.getItem(STORAGE_KEY);
mode = mode === 'light' || mode === 'dark' ? mode : 'auto';

function applyTheme(next) {
  mode = next;
  if (mode === 'auto') {
    localStorage.removeItem(STORAGE_KEY);
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
  }
  const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length];
  toggle.dataset.mode = mode;
  toggle.title = `Theme: ${mode === 'auto' ? 'System' : mode[0].toUpperCase() + mode.slice(1)}`;
  toggle.setAttribute('aria-label', `${toggle.title}. Click to switch to ${nextMode === 'auto' ? 'System' : nextMode[0].toUpperCase() + nextMode.slice(1)}.`);
}

toggle.addEventListener('click', () => {
  applyTheme(modes[(modes.indexOf(mode) + 1) % modes.length]);
});
applyTheme(mode);
```

Use the same three icon states already present on the root page; do not use emoji.

- [ ] **Step 6: Run the landing-page contract to verify GREEN**

Run:

```bash
npx playwright test tests/adblocker-page.spec.mjs
```

Expected: all landing-page tests PASS at all required widths.

- [ ] **Step 7: Commit the product page**

```bash
git add adblocker tests/adblocker-page.spec.mjs
git commit -m "feat(pages): add adblocker Workbench landing"
```

---

### Task 3: Route the Root Homepage Card to the Product Page

**Files:**
- Create: `tests/homepage.spec.mjs`
- Modify: `index.html` at the existing Adblocker project anchor whose current href is `https://github.com/dhhieu113pro/adblocker-extension`

**Interfaces:**
- Consumes: `/adblocker/` from Task 2.
- Produces: discoverable root-site navigation to the landing page without removing the landing page's direct GitHub link.

- [ ] **Step 1: Write the failing homepage test**

Create `tests/homepage.spec.mjs`:

```js
import { test, expect } from '@playwright/test';

test('routes the Adblocker project card to the product landing page', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('link', { name: /Adblocker/i });
  await expect(card).toHaveAttribute('href', './adblocker/');
  await expect(card).toContainText('Local browser protection using rules, heuristics and on-device AI.');
  await expect(card).toContainText('Explore →');
});
```

- [ ] **Step 2: Run it to verify RED**

Run:

```bash
npx playwright test tests/homepage.spec.mjs
```

Expected: FAIL because the current card still points directly to GitHub and uses the old experiment copy.

- [ ] **Step 3: Make the minimal homepage edit**

Replace only the existing Adblocker card with:

```html
<a class="project" href="./adblocker/">
  <div>
    <h3>Adblocker</h3>
    <p>Local browser protection using rules, heuristics and on-device AI.</p>
  </div>
  <div class="project-meta"><span>Browser · Local AI</span><span>Explore →</span></div>
</a>
```

Do not redesign Quay, Butchi, the root hero, or any other project card.

- [ ] **Step 4: Run homepage plus landing tests**

Run:

```bash
npx playwright test tests/homepage.spec.mjs tests/adblocker-page.spec.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the homepage integration**

```bash
git add index.html tests/homepage.spec.mjs
git commit -m "feat(pages): link adblocker project landing"
```

---

### Task 4: Make Pages Assembly Testable and Preserve Quay

**Files:**
- Create: `scripts/assemble-site.sh`
- Create: `tests/assemble-site.test.mjs`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: root `index.html`, `adblocker/`, and an external Quay checkout containing `docs/`.
- Produces: a deterministic `site/` tree with `/`, `/quay/`, `/adblocker/`, and `.nojekyll`.
- Script environment contract:
  - `PAGES_SOURCE` default `.`
  - `QUAY_SOURCE` default `../quay-source`
  - `SITE_DIR` default `site`

- [ ] **Step 1: Write the failing assembly regression test**

Create `tests/assemble-site.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

test('assembles root, Quay, and Adblocker without changing source files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pages-assembly-'));
  const quay = path.join(root, 'quay-source');
  const site = path.join(root, 'site');
  await mkdir(path.join(quay, 'docs'), { recursive: true });
  await writeFile(path.join(quay, 'docs', 'sentinel.txt'), 'quay-preserved');

  await exec('bash', ['scripts/assemble-site.sh'], {
    env: { ...process.env, PAGES_SOURCE: process.cwd(), QUAY_SOURCE: quay, SITE_DIR: site },
  });

  await access(path.join(site, 'index.html'));
  await access(path.join(site, 'adblocker', 'index.html'));
  await access(path.join(site, 'adblocker', 'assets', '01-overview.png'));
  await access(path.join(site, 'adblocker', 'assets', '02-settings.png'));
  await access(path.join(site, 'adblocker', 'assets', '03-history.png'));
  await access(path.join(site, '.nojekyll'));
  assert.equal(await readFile(path.join(site, 'quay', 'sentinel.txt'), 'utf8'), 'quay-preserved');
});
```

- [ ] **Step 2: Run it to verify RED**

Run:

```bash
node --test tests/assemble-site.test.mjs
```

Expected: FAIL because `scripts/assemble-site.sh` does not exist yet.

- [ ] **Step 3: Implement one assembly script**

Create `scripts/assemble-site.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PAGES_SOURCE="${PAGES_SOURCE:-.}"
QUAY_SOURCE="${QUAY_SOURCE:-../quay-source}"
SITE_DIR="${SITE_DIR:-site}"

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR/quay" "$SITE_DIR/adblocker"
cp "$PAGES_SOURCE/index.html" "$SITE_DIR/index.html"
cp -R "$PAGES_SOURCE/adblocker/." "$SITE_DIR/adblocker/"
cp -R "$QUAY_SOURCE/docs/." "$SITE_DIR/quay/"
touch "$SITE_DIR/.nojekyll"
```

- [ ] **Step 4: Run the assembly test to verify GREEN**

Run:

```bash
node --test tests/assemble-site.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Refactor the Pages workflow into verify/build plus deploy**

Update `.github/workflows/pages.yml` so `pull_request` runs verification but never deploys:

```yaml
name: Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
  schedule:
    - cron: "17 3 * * *"

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify-and-build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout Pages
        uses: actions/checkout@v4
        with:
          path: pages

      - name: Checkout Quay
        uses: actions/checkout@v4
        with:
          repository: dhhieu113pro/quay
          ref: main
          path: quay-source

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Playwright
        working-directory: pages
        run: npm install --no-save --package-lock=false @playwright/test@1.55.0

      - name: Install Chromium
        working-directory: pages
        run: npx playwright install --with-deps chromium

      - name: Test site assembly
        working-directory: pages
        run: node --test tests/assemble-site.test.mjs

      - name: Test source pages
        working-directory: pages
        run: npx playwright test

      - name: Assemble site
        working-directory: pages
        env:
          QUAY_SOURCE: ../quay-source
          SITE_DIR: site
        run: bash scripts/assemble-site.sh

      - name: Upload Pages artifact
        if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v3
        with:
          path: pages/site

  deploy:
    if: github.event_name != 'pull_request'
    needs: verify-and-build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Keep the existing schedule and manual dispatch. Do not alter the Quay repository/ref/path.

- [ ] **Step 6: Run all tests locally**

Run:

```bash
node --test tests/assemble-site.test.mjs
npx playwright test
```

Expected: assembly test PASS and all Playwright tests PASS.

- [ ] **Step 7: Commit assembly and CI changes**

```bash
git add scripts/assemble-site.sh tests/assemble-site.test.mjs .github/workflows/pages.yml
git commit -m "ci(pages): verify and assemble product pages"
```

---

### Task 5: Hallmark Visual Gate, PR Verification, and Completion Evidence

**Files:**
- Modify if needed after visual review: `adblocker/index.html`
- No new production files required.

**Interfaces:**
- Consumes: fully working page from Tasks 1-4.
- Produces: visual/a11y evidence and a green PR-ready branch.

- [ ] **Step 1: Capture fresh desktop and mobile review images**

With the local server running through Playwright, capture the real page at 1280 and 375 widths:

```bash
npx playwright screenshot --viewport-size="1280,900" http://127.0.0.1:4173/adblocker/ /tmp/adblocker-desktop.png
npx playwright screenshot --viewport-size="375,812" http://127.0.0.1:4173/adblocker/ /tmp/adblocker-mobile.png
```

If the Playwright CLI cannot reuse the configured web server, start it explicitly first:

```bash
python3 -m http.server 4173 --directory .
```

- [ ] **Step 2: Run the Hallmark pre-emit critique**

Score the rendered page 1-5 on:

```text
Philosophy
Hierarchy
Execution
Specificity
Restraint
Variety
```

Check all mandatory gates from the approved spec, especially:

```text
no nested card-in-card composition
no generic three-feature row
no emoji icon voice
no fake browser/device chrome
no invented metrics/social proof
all colors/font-family declarations use tokens
focus visible
normal text contrast >= WCAG 4.5:1
reduced motion respected
320/375/414/768 widths have no horizontal scroll
heading/copy hierarchy remains legible on mobile
```

Expected: every axis >= 3/5; target 4/5 each.

- [ ] **Step 3: Revise before claiming completion if any Hallmark axis or gate fails**

Only change `adblocker/index.html` as needed for the observed problem. After every revision rerun:

```bash
npx playwright test
node --test tests/assemble-site.test.mjs
```

Expected: PASS after the final visual revision.

- [ ] **Step 4: Stamp the final Hallmark score in the page CSS**

Replace the pending stamp with the observed final scores, for example only if actually earned:

```css
/* Hallmark · macrostructure: Workbench · genre: modern-minimal · visual-system: product-locked
 * pre-emit critique: P4 H4 E4 S4 R4 V4 · gates: all-pass · studied: no
 */
```

Do not copy example scores without the visual review evidence.

- [ ] **Step 5: Run final local verification from a clean source state**

Run:

```bash
node --test tests/assemble-site.test.mjs
npx playwright test
```

Expected: zero failures.

- [ ] **Step 6: Open/update the PR and verify GitHub Actions**

Create a PR from `feature/adblocker-landing` to `main` with a concise summary of:

```text
- new /adblocker/ Workbench landing page
- pinned Edge Store screenshot assets
- homepage routing update
- PR-safe Pages verification and deploy split
- responsive/theme/accessibility tests
```

Wait for the `Pages` PR workflow. Inspect the workflow jobs/logs; do not infer success from queued/running state.

Expected: `verify-and-build` completes successfully on the PR.

- [ ] **Step 7: Commit any final Hallmark-only correction**

If Step 3 changed the page after the previous commit:

```bash
git add adblocker/index.html
git commit -m "style(pages): finish Hallmark landing review"
```

Rerun the PR workflow and require a fresh green result.

- [ ] **Step 8: Hand off using finishing-a-development-branch**

Invoke `superpowers:finishing-a-development-branch`, report the verified test/CI evidence, and let the user choose integration. Do not merge without the user's explicit merge choice.
