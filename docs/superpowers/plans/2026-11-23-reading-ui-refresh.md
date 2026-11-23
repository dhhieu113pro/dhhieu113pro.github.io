# Reading UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent mini player with title, sentence progress and pause/resume, plus a small editorial UI refresh (serif reading type, uppercase cover metadata).

**Architecture:** The mini-player markup lives in `scripts/sync.js`'s `shell()`, so it is present on every page and survives SPA swaps. The existing audio singleton in `assets/reader.js` owns its state through a `miniPlayer` element-reference object; `createListen` paints it on start/sentence/stop and wires its button to pause/resume without changing the `blog-listen` preference. Only CSS and generated markup change otherwise.

**Tech Stack:** Vanilla JS/CSS, Node built-in `node:test`, pwterm browser checks.

**Spec:** `docs/superpowers/specs/2026-11-23-reading-ui-refresh-design.md`

## Global Constraints

- No dependencies, no external fonts, no new lint/type config. Merge gate: `node --test scripts/*.test.js`.
- The mini player is in the shell, outside `<main>`; app.js's swap must not remove it.
- Pause/resume must NOT write `blog-listen`; the headphone toggle owns that preference.
- All controls keep the existing 44 px target and visible focus ring; respect `prefers-reduced-motion`.
- Generated HTML must keep working with JS disabled (bar is `hidden` until JS shows it).
- **Do not run `node scripts/sync.js` against the live DB here** — it pulls in an unpublished 5th story. Apply the shell markup + new asset hash mechanically to the 6 generated HTML files, then verify with a sync into a temp dir.

## Review Focus

1. Pause/resume must not flip the listen preference — unit test asserts storage unchanged after pause.
2. Progress tracks sentences, not cards — unit test asserts `2 / 4` after one `ended`.
3. Bar survives SPA navigation — browser check opens a story, goes home, and asserts the bar is still present and updated.
4. Bar cannot cover the last sentence on a 360 px phone — browser check bounds the bar inside the viewport and checks the reader card still scrolls.
5. No-JS pages still contain readable content — sync test asserts static markup plus the hidden bar.

---

### Task 1: Mini-player state and controls in the audio singleton

**Files:**
- Modify: `assets/reader.js`
- Test: `scripts/reader.test.js`

**Interfaces:**
- Consumes: existing `createListen` context and singleton.
- Produces: `createListen` accepts `miniPlayer` = `{ root, title, progress, fill, button }` (element references or test stubs) and `title` in `ctx` via `bind()`. New methods `pauseListen()`, `resumeListen()`. Context gains `paused` flag.

- [ ] **Step 1: Extend the harness with a mini-player stub and write failing tests**

In `scripts/reader.test.js`, add a `mini()` helper returning `{ root: {hidden:false,dataset:{}}, title:{textContent:''}, progress:{textContent:''}, fill:{style:{width:''}}, button:{handler:null,setAttribute(k,v){this[k]=v},addEventListener(t,fn){if(t==='click')this.handler=fn}} }`. Pass `miniPlayer: miniObj` and `title: 'Một chuyện'` into the `createListen` call in `harness()` (store it on the returned object). Add tests:
```js
test('listen: mini player shows title and sentence progress', () => {
  const h = harness(); h.api.startListen();
  assert.equal(h.mini.root.hidden, false);
  assert.equal(h.mini.title.textContent, 'Một chuyện');
  assert.equal(h.mini.progress.textContent, '1 / 4');
  assert.equal(h.mini.fill.style.width, '25%');
});
test('listen: progress follows sentences, not cards', () => {
  const h = harness(); h.api.startListen(); h.audio().emit('ended');
  assert.equal(h.mini.progress.textContent, '2 / 4');
});
test('listen: pausing keeps the bar and the preference', () => {
  const h = harness(); h.api.startListen(); h.mini.button.handler();
  assert.equal(h.mini.root.hidden, false);
  assert.equal(h.mini.button['aria-label'], 'Phát tiếp');
  assert.equal(h.audio().paused, true);
  assert.equal(h.store.get('blog-listen'), undefined);
});
test('listen: resuming plays the current sentence again', () => {
  const h = harness(); h.api.startListen(); h.mini.button.handler(); h.mini.button.handler();
  assert.equal(h.mini.button['aria-label'], 'Tạm dừng');
  assert.equal(h.audio().plays, 2);
});
test('listen: stopping hides the mini player', () => {
  const h = harness(); h.api.startListen(); h.api.stopListen();
  assert.equal(h.mini.root.hidden, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/reader.test.js`
Expected: FAIL — mini player stays hidden / `h.mini` undefined.

- [ ] **Step 3: Implement in `assets/reader.js`**

- Add `let paused = false;` and `let mini = miniPlayer || null;`.
- Wire the button once in the constructor: `if (mini && mini.button) mini.button.addEventListener('click', () => paused ? resumeListen() : pauseListen());`.
- Add `paintMini()`: when `!mini` return; set `mini.root.hidden = !playing`; when playing set `title.textContent = ctx.title || ''`, progress = `${current + 1} / ${len}` (or '' when no sentences), `fill.style.width = len ? ((current + 1) / len * 100) + '%' : '0%'`, `button` aria-label `'Tạm dừng'` / `'Phát tiếp'`, and `root.dataset.playing = String(!paused)`; guard `document.body.classList.toggle('has-mini-player', playing)` with `typeof document !== 'undefined'`.
- Call `paintMini()` at the end of `playFrom()` after `current = i`, in `startListen()`, in `stopListen()`, and in `pauseListen()`/`resumeListen()`.
- `pauseListen()`: if `playing && !paused`, `paused = true`, `audio.pause()`, `paintMini()`. `resumeListen()`: if `playing && paused`, `paused = false`, `paintMini()`, then `audio.play()` (reuse the existing rejection catch pattern). Set `paused = false` in `playFrom()` and `startListen()`.
- Include `title` in `ctx` from `bind(next)` (`ctx = { ...next }` already does); call `paintMini()` at the end of `bind()`.
- Export `pauseListen, resumeListen` alongside the existing methods.
- Browser wiring: when creating the singleton, pass `miniPlayer` built from the shell node: `{ root: document.querySelector('.mini-player'), title: document.querySelector('.mini-player-title'), progress: document.querySelector('.mini-player-progress'), fill: document.querySelector('.mini-player-fill'), button: document.querySelector('.mini-player-toggle') }`. In `setup()`, add `title: document.querySelector('.reader-top-title, .story-title')?.textContent || ''` to the `listen.bind({...})` call. Guard against missing nodes (no-JS pages or stale markup).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/reader.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/reader.js scripts/reader.test.js
git commit -m "feat: mini player state, progress and pause/resume"
```

---

### Task 2: Shell markup, CSS refresh and generated HTML

**Files:**
- Modify: `scripts/sync.js` (`shell()` + `sync.test.js`)
- Modify: `assets/style.css`
- Modify: 6 generated HTML files

**Interfaces:**
- Consumes: `.mini-player` markup from `shell()`, singleton wiring in reader.js.
- Produces: every generated page has the hidden bar in the shell; reader.js can find it by class.

- [ ] **Step 1: Write the failing sync test**

In `scripts/sync.test.js`, append:
```js
test('every page carries the persistent mini player in the shell', () => {
  const { outDir } = setup([story()]);
  for (const file of ['index.html', 'tam-su/index.html', 'posts/a-story/index.html']) {
    const html = fs.readFileSync(path.join(outDir, file), 'utf8');
    assert.match(html, /class="mini-player" hidden/);
    assert.match(html, /class="mini-player-toggle"/);
    assert.ok(html.indexOf('class="mini-player"') < html.indexOf('assets/theme.js'));
  }
});
```
Use the existing `setup()` / `story()` helpers.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/sync.test.js`
Expected: FAIL — no mini-player markup.

- [ ] **Step 3: Add markup to `shell()` and CSS to `assets/style.css`**

In `shell()`, insert after `${footer}` (before the script tags):
```html
<div class="mini-player" hidden>
  <div class="mini-player-info">
    <span class="mini-player-title"></span>
    <span class="mini-player-progress"></span>
  </div>
  <div class="mini-player-track"><span class="mini-player-fill"></span></div>
  <button class="mini-player-toggle" type="button" aria-label="Tạm dừng">
    <svg class="mini-icon mini-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    <svg class="mini-icon mini-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>
  </button>
</div>
```
CSS: `.mini-player[hidden] { display: none; }`; fixed bottom, safe-area inset, `background: var(--card)`, `border-top: 1px solid var(--line)`, inner `max-width: 720px; margin: 0 auto; display:flex; align-items:center; gap:12px; padding: 8px 16px calc(8px + env(safe-area-inset-bottom));`; title ellipsis with `min-width:0`; progress small/muted; `.mini-player-track` 3px bar with accent fill; `.mini-player-toggle` 44×44 focus-visible ring; `.mini-play` hidden and `.mini-pause` shown by default, swapped when `.mini-player[data-playing="false"]`; transition disabled under `prefers-reduced-motion`. Refresh `.card-text` with a system serif stack and `.cover-meta` with uppercase + letter-spacing.

- [ ] **Step 4: Run tests, then update generated HTML mechanically**

Run: `node --test scripts/*.test.js` — expect all green.
Compute the new asset hash with the same algorithm as `assetVersion()` (files `style.css`, `reader.js`, `home.js`, `theme.js`, `app.js`, `logo.png`). In each of `index.html`, `tam-su/index.html`, `posts/*/index.html`: replace the old `?v=` hash with the new one and insert the exact `shell()` mini-player block before the first `<script src=...theme.js`. Do **not** run `sync.js` against the live DB.

- [ ] **Step 5: Verify generated HTML against a temp-dir sync**

Run `node scripts/sync.js --out <tmpdir>` and diff; expect differences only for the unrelated unpublished story and missing audio/logo in the empty temp dir. Commit.

```bash
git add scripts/sync.js scripts/sync.test.js assets/style.css index.html tam-su/index.html posts
git commit -m "feat: shell mini player and editorial reading styles"
```

---

### Task 3: Browser check and final verification

**Files:**
- Create: `checks/mini-player.yaml`

- [ ] **Step 1: Write the check**

Mirror `checks/spa.yaml`. Reset `blog-listen`, click `.cover-read`, assert `.mini-player` visible, title non-empty, progress matches `/^\d+ \/ \d+$/`, button aria-label `Tạm dừng`; click the button and assert aria-label `Phát tiếp` and localStorage still on; click again and assert `Tạm dừng`; click `.reader-back`, assert `.mini-player` still in the DOM and visible; stop via the headphone toggle and assert the bar hidden. Check the bar's bounding box stays inside a 360×780 viewport.

- [ ] **Step 2: Run full gate and browser checks**

Run: `node --test scripts/*.test.js` (expect green), then `checks/mini-player.yaml`, `checks/spa.yaml`, `checks/listen.yaml` over HTTP with pwterm.

- [ ] **Step 3: Commit**

```bash
git add checks/mini-player.yaml
git commit -m "test: browser check for mini player"
```
