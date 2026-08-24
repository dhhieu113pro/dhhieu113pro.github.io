# AI Vision Ad Blocker Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Hallmark-designed AI Vision Ad Blocker landing page at `https://dhhieu113pro.github.io/adblocker/`, using the three real CI-generated 1280x800 product screenshots, and route the root homepage Adblocker card to it.

**Architecture:** Keep the site static: one self-contained `adblocker/index.html` plus three local PNG assets. Use Playwright for source-page behavior/responsive verification and a small shell assembler plus Node built-in test for the deploy artifact. Refactor the existing Pages workflow into a PR-safe verify/build job and a deploy-only job so the exact artifact can be tested before publication.

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
- All page colors and every `font-family` declaration consume named tokens; no mid-render color/font improvisation.
- `html, body { overflow-x: clip; }` and no horizontal overflow at 320, 375, 414, or 768 px.
- Visible `:focus-visible` states and `prefers-reduced-motion: reduce` handling are mandatory.
- No production files are deleted.
- Quay publishing behavior under `/quay/` must remain unchanged.
- Hallmark pre-emit scores for Philosophy, Hierarchy, Execution, Specificity, Restraint, and Variety must all be >= 3/5; target 4/5 each.

---

## File Structure

**Create**
- `adblocker/index.html` — landing page, theme behavior, responsive Workbench layout, and restrained interaction.
- `adblocker/assets/01-overview.png` — pinned CI screenshot asset.
- `adblocker/assets/02-settings.png` — pinned CI screenshot asset.
- `adblocker/assets/03-history.png` — pinned CI screenshot asset.
- `playwright.config.mjs` — source-page browser test configuration; it matches only `*.spec.mjs`.
- `tests/adblocker-page.spec.mjs` — route/content/theme/responsive/focus contract.
- `tests/homepage.spec.mjs` — root Adblocker-card routing contract.
- `scripts/assemble-site.sh` — one source of truth for building `site/` from Pages source plus Quay docs.
- `tests/assemble-site.node.mjs` — Node-only artifact assembly regression test; intentionally excluded from Playwright.

**Modify**
- `index.html` — point the Adblocker card to `./adblocker/` and replace stale experiment copy with the exact approved product copy.
- `.github/workflows/pages.yml` — run browser/assembly verification on PRs, assemble/upload once, and deploy only for non-PR events.

**Existing design artifacts**
- `docs/superpowers/specs/2026-08-23-adblocker-landing-design.md`
- `docs/superpowers/plans/2026-08-24-adblocker-landing.md`

---

### Task 1: Add a Browser Contract and Prove the Landing Page Is Missing

**Files:**
- Create: `playwright.config.mjs`
- Create: `tests/adblocker-page.spec.mjs`

**Interfaces:**
- Consumes: repository root served over HTTP.
- Produces: browser contract for `/adblocker/`, exact screenshot paths/dimensions, product copy, shared theme state, Hallmark responsive widths, and keyboard focus visibility.

- [ ] **Step 1: Create the Playwright configuration**

Create `playwright.config.mjs`:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
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

Create `tests/adblocker-page.spec.mjs`:

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
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('publishes a grounded Workbench landing page', async ({ page }) => {
  const response = await page.goto('/adblocker/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Local visual protection for the web.' })).toBeVisible();
  await expect(page.getByText('Network rules', { exact: true })).toBeVisible();
  await expect(page.getByText('page heuristics', { exact: true })).toBeVisible();
  await expect(page.getByText('local image classification', { exact: true })).toBeVisible();
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
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
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
  const github = page.getByRole('link', { name: 'GitHub ↗', exact: true });
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    if (await github.evaluate((el) => el === document.activeElement)) break;
  }
  expect(await github.evaluate((el) => el === document.activeElement)).toBe(true);
  const outline = await github.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Install the pinned test runner**

Run:

```bash
npm install --no-save --package-lock=false @playwright/test@1.55.0
npx playwright install chromium
```

Expected: Playwright 1.55.0 and Chromium install successfully without committing dependency files.

- [ ] **Step 4: Run the contract to verify RED**

Run:

```bash
npx playwright test tests/adblocker-page.spec.mjs
```

Expected: FAIL because `/adblocker/` and its screenshot assets do not exist yet. The root page must still return 200, proving the web-server harness itself is functional.

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
- Consumes: Ad Blocker CI run `32648744945`, artifact `9495598136`, and Task 1's browser contract.
- Produces: `/adblocker/` source page with stable local image paths and shared `site-theme` behavior.

- [ ] **Step 1: Retrieve exactly the pinned screenshot artifact**

Download artifact `9495598136` from `dhhieu113pro/adblocker-extension`, then copy these files unchanged:

```text
01-overview.png -> adblocker/assets/01-overview.png
02-settings.png -> adblocker/assets/02-settings.png
03-history.png  -> adblocker/assets/03-history.png
```

Do not resize, recompress, redraw, annotate, or add browser/device chrome.

- [ ] **Step 2: Verify the copied assets before page work**

Run:

```bash
node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
for (const name of ['01-overview.png', '02-settings.png', '03-history.png']) {
  const b = await readFile(`adblocker/assets/${name}`);
  if (b.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error(`${name}: not PNG`);
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

- [ ] **Step 3: Create the semantic Workbench page**

Create `adblocker/index.html` with the following content structure. The theme icon markup is production markup, not a design placeholder:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>AI Vision Ad Blocker — Local visual protection</title>
  <meta name="description" content="Local browser protection using network rules, heuristics, and on-device image classification.">
  <script>(()=>{const t=localStorage.getItem('site-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t})();</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="shell header-row">
      <a class="brand" href="../">Hieu Dam / AI Vision Ad Blocker</a>
      <nav class="header-actions" aria-label="Product">
        <a href="https://github.com/dhhieu113pro/adblocker-extension">GitHub ↗</a>
        <button class="theme-toggle" id="theme-toggle" type="button" data-mode="auto" aria-label="Theme: System. Click to switch to Light." title="Theme: System">
          <span class="theme-icon" data-theme-icon="auto" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg></span>
          <span class="theme-icon" data-theme-icon="light" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg></span>
          <span class="theme-icon" data-theme-icon="dark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z"/></svg></span>
        </button>
      </nav>
    </div>
  </header>

  <main>
    <section class="shell opening">
      <p class="machine-label">AI VISION AD BLOCKER</p>
      <h1>Local visual protection for the web.</h1>
      <p class="lede">Network rules, page heuristics, and on-device image classification work together in your browser.</p>
      <a class="source-link" href="https://github.com/dhhieu113pro/adblocker-extension">View source on GitHub ↗</a>
    </section>

    <section class="workbench workbench--overview" aria-labelledby="overview-title">
      <div class="workbench-copy"><p class="machine-label">OVERVIEW</p><h2 id="overview-title">Know what is being blocked.</h2><p>See protection state, page context, and detected activity in one place.</p></div>
      <figure><img src="./assets/01-overview.png" alt="AI Vision Ad Blocker Overview tab showing protection status and detected activity"></figure>
    </section>

    <section class="workbench workbench--settings" aria-labelledby="settings-title">
      <figure><img src="./assets/02-settings.png" alt="AI Vision Ad Blocker Settings tab with automatic protection and MobileNetV4 selected"></figure>
      <div class="workbench-copy"><p class="machine-label">SETTINGS</p><h2 id="settings-title">Control the model.</h2><p>MobileNetV4 is the recommended default for local image classification. CLIP remains available as an explicit alternative.</p></div>
    </section>

    <section class="workbench workbench--history" aria-labelledby="history-title">
      <div class="workbench-copy"><p class="machine-label">HISTORY</p><h2 id="history-title">Review recent activity.</h2><p>Inspect recent blocking activity and clear local history whenever you want.</p></div>
      <figure><img src="./assets/03-history.png" alt="AI Vision Ad Blocker History tab showing recent local blocking activity"></figure>
    </section>

    <section class="shell pipeline" aria-labelledby="pipeline-title">
      <h2 id="pipeline-title">Protection without sending the page away.</h2>
      <ol aria-label="Protection pipeline"><li>Network rules</li><li>page heuristics</li><li>local image classification</li></ol>
      <p>Image inference runs in the browser's local offscreen runtime.</p>
    </section>
  </main>

  <footer class="site-footer"><div class="shell footer-row"><a href="https://github.com/dhhieu113pro/adblocker-extension">Source on GitHub ↗</a><span>MIT licensed · Hieu Dam</span></div></footer>
</body>
</html>
```

- [ ] **Step 4: Add the locked token system and concrete Workbench layout**

Put this token block before component CSS. Use these same token names for system, explicit light, and explicit dark modes:

```css
/* Hallmark · macrostructure: Workbench · genre: modern-minimal · visual-system: product-locked */
:root {
  --color-paper: oklch(97% 0.008 250);
  --color-surface: oklch(94% 0.012 250);
  --color-surface-strong: oklch(99% 0.004 250);
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
@media (prefers-color-scheme: dark) {
  :root {
    --color-paper: oklch(15% 0.014 250);
    --color-surface: oklch(19% 0.016 250);
    --color-surface-strong: oklch(23% 0.018 250);
    --color-ink: oklch(94% 0.008 250);
    --color-muted: oklch(70% 0.015 250);
    --color-rule: oklch(30% 0.018 250);
    --color-accent: oklch(72% 0.16 247);
    --color-focus: oklch(77% 0.18 247);
    --color-success: oklch(72% 0.13 158);
  }
}
html[data-theme="light"] {
  --color-paper: oklch(97% 0.008 250); --color-surface: oklch(94% 0.012 250); --color-surface-strong: oklch(99% 0.004 250);
  --color-ink: oklch(22% 0.018 252); --color-muted: oklch(49% 0.018 252); --color-rule: oklch(82% 0.014 250);
  --color-accent: oklch(62% 0.19 247); --color-focus: oklch(67% 0.20 247); --color-success: oklch(64% 0.13 158);
  color-scheme: light;
}
html[data-theme="dark"] {
  --color-paper: oklch(15% 0.014 250); --color-surface: oklch(19% 0.016 250); --color-surface-strong: oklch(23% 0.018 250);
  --color-ink: oklch(94% 0.008 250); --color-muted: oklch(70% 0.015 250); --color-rule: oklch(30% 0.018 250);
  --color-accent: oklch(72% 0.16 247); --color-focus: oklch(77% 0.18 247); --color-success: oklch(72% 0.13 158);
  color-scheme: dark;
}
```

Then implement the page with these concrete geometry rules:

```css
* { box-sizing: border-box; }
html, body { margin: 0; overflow-x: clip; }
body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-body); line-height: 1.55; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; }
.shell { width: min(var(--max), calc(100% - 40px)); margin-inline: auto; }
h1, h2 { margin: 0; font-family: var(--font-display); font-style: normal; overflow-wrap: anywhere; min-width: 0; }
.machine-label { margin: 0; color: var(--color-muted); font: 500 12px/1.2 var(--font-mono); letter-spacing: .09em; }
.site-header { border-bottom: 1px solid var(--color-rule); }
.header-row { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.brand { font-weight: 600; white-space: nowrap; }
.header-actions { display: flex; align-items: center; gap: 18px; font-size: 14px; }
.opening { padding-block: 96px 84px; }
.opening h1 { max-width: 900px; margin-top: 18px; font-size: clamp(52px, 7vw, 88px); line-height: .96; letter-spacing: -.055em; }
.lede { max-width: 660px; margin: 26px 0 0; color: var(--color-muted); font-size: clamp(18px, 2vw, 22px); }
.source-link { display: inline-flex; margin-top: 30px; border-bottom: 1px solid var(--color-accent); font-weight: 600; white-space: nowrap; }
.workbench { width: min(var(--max), calc(100% - 40px)); margin-inline: auto; padding-block: 72px; border-top: 1px solid var(--color-rule); }
.workbench-copy { max-width: 560px; }
.workbench-copy h2, .pipeline h2 { margin-top: 12px; font-size: clamp(34px, 4vw, 54px); line-height: 1; letter-spacing: -.04em; }
.workbench-copy p:last-child, .pipeline p { color: var(--color-muted); font-size: 17px; }
.workbench--overview { display: grid; gap: 42px; }
.workbench--overview figure { width: 100%; }
.workbench--settings, .workbench--history { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, .65fr); gap: 56px; align-items: center; }
.workbench--history { grid-template-columns: minmax(0, .65fr) minmax(0, 1.35fr); }
figure { margin: 0; min-width: 0; border: 1px solid var(--color-rule); border-radius: 14px; overflow: clip; background: var(--color-surface); }
figure img { display: block; width: 100%; height: auto; }
.pipeline { padding-block: 82px; border-top: 1px solid var(--color-rule); }
.pipeline ol { display: flex; flex-wrap: wrap; gap: 10px 34px; margin: 34px 0 0; padding: 0; list-style: none; font: 500 14px/1.3 var(--font-mono); }
.pipeline li:not(:last-child)::after { content: "→"; margin-left: 34px; color: var(--color-accent); }
.site-footer { border-top: 1px solid var(--color-rule); }
.footer-row { min-height: 86px; display: flex; align-items: center; justify-content: space-between; gap: 20px; color: var(--color-muted); font-size: 13px; }
.theme-toggle { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--color-rule); border-radius: 999px; background: var(--color-surface); color: var(--color-ink); cursor: pointer; }
.theme-icon { display: none; width: 18px; height: 18px; }
.theme-toggle[data-mode="auto"] [data-theme-icon="auto"], .theme-toggle[data-mode="light"] [data-theme-icon="light"], .theme-toggle[data-mode="dark"] [data-theme-icon="dark"] { display: block; }
.theme-icon svg { display: block; width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
a:focus-visible, button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
@media (max-width: 999px) {
  .opening { padding-block: 72px 62px; }
  .workbench--settings, .workbench--history { grid-template-columns: minmax(0, 1fr); gap: 34px; }
  .workbench--settings figure { order: 2; }
}
@media (max-width: 767px) {
  .shell, .workbench { width: min(var(--max), calc(100% - 28px)); }
  .header-row { min-height: 62px; gap: 12px; }
  .brand { max-width: 190px; overflow: hidden; text-overflow: ellipsis; }
  .header-actions > a { display: none; }
  .opening { padding-block: 58px 50px; }
  .opening h1 { font-size: clamp(44px, 14vw, 62px); }
  .workbench { padding-block: 54px; }
  .workbench-copy h2, .pipeline h2 { font-size: clamp(32px, 10vw, 44px); }
  .pipeline { padding-block: 58px; }
  .pipeline ol { display: grid; gap: 12px; }
  .pipeline li:not(:last-child)::after { margin-left: 12px; }
  .footer-row { min-height: 92px; align-items: flex-start; justify-content: center; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
```

Do not introduce component-specific literal colors or component-specific `font-family` values outside the token block.

- [ ] **Step 5: Implement the exact shared theme cycle**

Use this script after the page markup:

```js
const STORAGE_KEY = 'site-theme';
const toggle = document.getElementById('theme-toggle');
const modes = ['auto', 'light', 'dark'];
let mode = localStorage.getItem(STORAGE_KEY);
mode = mode === 'light' || mode === 'dark' ? mode : 'auto';

function label(value) {
  return value === 'auto' ? 'System' : value[0].toUpperCase() + value.slice(1);
}
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
  toggle.title = `Theme: ${label(mode)}`;
  toggle.setAttribute('aria-label', `${toggle.title}. Click to switch to ${label(nextMode)}.`);
}

toggle.addEventListener('click', () => applyTheme(modes[(modes.indexOf(mode) + 1) % modes.length]));
applyTheme(mode);
```

- [ ] **Step 6: Run the landing-page contract to verify GREEN**

Run:

```bash
npx playwright test tests/adblocker-page.spec.mjs
```

Expected: all tests PASS, including exact 1280x800 asset checks and the 320/375/414/768/1280 overflow loop.

- [ ] **Step 7: Commit the product page**

```bash
git add adblocker
git commit -m "feat(pages): add adblocker Workbench landing"
```

---

### Task 3: Route the Root Homepage Card to the Product Page

**Files:**
- Create: `tests/homepage.spec.mjs`
- Modify: `index.html` at the existing Adblocker project anchor whose current href is `https://github.com/dhhieu113pro/adblocker-extension`

**Interfaces:**
- Consumes: `/adblocker/` from Task 2.
- Produces: discoverable root-site navigation to the landing page while keeping a direct GitHub link on the landing page itself.

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
  <div><h3>Adblocker</h3><p>Local browser protection using rules, heuristics and on-device AI.</p></div>
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
- Create: `tests/assemble-site.node.mjs`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: root `index.html`, `adblocker/`, and an external Quay checkout containing `docs/`.
- Produces: deterministic `site/` with `/`, `/quay/`, `/adblocker/`, and `.nojekyll`.
- Script environment contract: `PAGES_SOURCE` defaults to `.`, `QUAY_SOURCE` defaults to `../quay-source`, `SITE_DIR` defaults to `site`.

- [ ] **Step 1: Write the failing assembly regression test**

Create `tests/assemble-site.node.mjs`:

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
node --test tests/assemble-site.node.mjs
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
node --test tests/assemble-site.node.mjs
```

Expected: PASS.

- [ ] **Step 5: Refactor the Pages workflow into verify/build plus deploy**

Replace `.github/workflows/pages.yml` with:

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
        run: node --test tests/assemble-site.node.mjs

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

Keep Quay at `dhhieu113pro/quay`, ref `main`, path `quay-source`.

- [ ] **Step 6: Run all tests locally**

Run:

```bash
node --test tests/assemble-site.node.mjs
npx playwright test
```

Expected: Node assembly test PASS; Playwright runs only `*.spec.mjs` and all browser tests PASS.

- [ ] **Step 7: Commit assembly and CI changes**

```bash
git add scripts/assemble-site.sh tests/assemble-site.node.mjs .github/workflows/pages.yml
git commit -m "ci(pages): verify and assemble product pages"
```

---

### Task 5: Hallmark Visual Gate, PR Verification, and Completion Evidence

**Files:**
- Modify if required by observed visual issues: `adblocker/index.html`

**Interfaces:**
- Consumes: fully working source page and assembly from Tasks 1-4.
- Produces: visual/a11y evidence, final Hallmark score stamp, and a green PR-ready branch.

- [ ] **Step 1: Capture fresh desktop and mobile review images**

Start the source server:

```bash
python3 -m http.server 4173 --directory .
```

In another shell capture:

```bash
npx playwright screenshot --viewport-size="1280,900" http://127.0.0.1:4173/adblocker/ /tmp/adblocker-desktop.png
npx playwright screenshot --viewport-size="375,812" http://127.0.0.1:4173/adblocker/ /tmp/adblocker-mobile.png
```

- [ ] **Step 2: Run the Hallmark pre-emit critique on those actual renders**

Score 1-5:

```text
Philosophy
Hierarchy
Execution
Specificity
Restraint
Variety
```

Explicitly check:

```text
no nested card-in-card composition
no generic three-feature row
no emoji icon voice
no fake browser/device chrome
no invented metrics/social proof
all colors and font-family declarations use tokens
focus visible
normal text contrast >= WCAG 4.5:1
reduced motion respected
320/375/414/768 widths have no horizontal scroll
heading/copy hierarchy remains legible on mobile
```

Expected: every axis >= 3/5; target 4/5 each.

- [ ] **Step 3: Revise before claiming completion if any Hallmark axis or gate fails**

Change only the specific failed visual/state rule in `adblocker/index.html`, then rerun:

```bash
node --test tests/assemble-site.node.mjs
npx playwright test
```

Expected: zero failures after the final revision.

- [ ] **Step 4: Stamp the observed final Hallmark scores**

Change the opening CSS comment to this format using the scores actually observed in Step 2:

```css
/* Hallmark · macrostructure: Workbench · genre: modern-minimal · visual-system: product-locked
 * pre-emit critique: P<score> H<score> E<score> S<score> R<score> V<score> · gates: all-pass · studied: no
 */
```

Replace each `<score>` with the corresponding integer from the actual review. Never copy an unverified score.

- [ ] **Step 5: Run final local verification**

Run:

```bash
node --test tests/assemble-site.node.mjs
npx playwright test
```

Expected: zero failures.

- [ ] **Step 6: Open the PR and require fresh GitHub Actions evidence**

Create a PR from `feature/adblocker-landing` to `main` with this scope summary:

```text
- add /adblocker/ Workbench landing page
- add pinned Edge Store screenshot assets
- route homepage Adblocker card to the landing page
- make Pages verification PR-safe while preserving Quay
- verify responsive/theme/focus behavior
```

Wait for the `Pages` PR workflow and inspect `verify-and-build` job status/logs. Do not treat queued or running as success.

Expected: `verify-and-build` completes with conclusion `success`.

- [ ] **Step 7: Commit and re-verify any visual correction made after the prior commit**

If Task 5 changed `adblocker/index.html`:

```bash
git add adblocker/index.html
git commit -m "style(pages): finish Hallmark landing review"
```

Require a fresh green PR workflow after that commit.

- [ ] **Step 8: Hand off using finishing-a-development-branch**

Invoke `superpowers:finishing-a-development-branch`, report the exact local test counts and PR workflow result, and let the user choose integration. Do not merge without explicit user choice.
