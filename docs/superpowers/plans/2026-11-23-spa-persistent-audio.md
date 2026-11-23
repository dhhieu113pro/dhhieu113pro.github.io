# SPA Navigation with Persistent Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Internal navigation swaps the page in place (no document reload) and a single audio player survives every swap, so one touch enables continuous listening from the home feed or a story.

**Architecture:** One new `assets/app.js` intercepts same-origin links, fetches HTML, swaps `<main>`/`<title>`/description/body class, pushes history, and calls the incoming page's `init(signal)`. `reader.js`/`home.js` move into the shell, load once, and expose `init`/`destroy`. The `createListen` player becomes a rebindable singleton created once in `reader.js`; `destroy()` unbinds the page but never pauses audio, so playback is never interrupted by navigation. Generated HTML stays real on disk; only script tags in `shell()` change.

**Tech Stack:** Vanilla JS (no dependencies), Node built-in `node:test`, pwterm browser checks (optional, over HTTP).

**Spec:** `docs/superpowers/specs/2026-11-23-spa-persistent-audio-design.md`

## Global Constraints

- No dependencies added. No lint/type config in the repo; the merge gate is the full Node test suite (`node --test scripts/*.test.js`).
- Generated HTML files must still work with JS disabled (all content stays in the HTML).
- All listeners/observers added during a page init must use the `signal` passed to `init()` so `destroy()` can remove them.
- `app.js` must not intercept links with `target`, `download`, modifiers, non-left button, different origin, or `href` starting with `#`, `mailto:`, `tel:`, `javascript:`.
- The audio player must not be paused by page `destroy()` — persistence across swaps is the whole point.
- `assetVersion()` hashes these asset files: `style.css`, `reader.js`, `home.js`, `theme.js`, `logo.png`; add `app.js` to that list.

## Review Focus

1. Audio survives navigation: a unit test asserts the same `Audio` instance is still playing after `bind()` to a new page, and `unbind()` does not pause it.
2. Listener leak across home → post → back: the browser check walks the cycle and asserts one arrow-key press advances exactly one card; unit test asserts `destroy()` aborts the controller.
3. External `story-source` link is not intercepted: `spa.test.js` unit-checks the classifier skips a different origin.
4. `popstate` must not push a second history entry: the browser check instruments `pushState` and asserts zero new entries on back.
5. First load / no-JS still works: `sync.test.js` asserts every generated page contains static content plus the new script tags.

---

### Task 1: Rebindable persistent audio player + reader lifecycle

**Files:**
- Modify: `assets/reader.js`
- Test: `scripts/reader.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `createListen(options)` now also returns `{ bind, unbind }`. `bind({ sentences, cards, getIndex, goTo, toggle })` re-points the player at a new page, re-wires the toggle click, repaints, and with the preference on either starts playback (idle) or re-anchors it to the new story's first visible sentence (playing). `unbind()` removes the toggle listener and clears the page context but does NOT pause audio. `window.ReaderPage = { init(signal), destroy(), listen }` where `listen` is one singleton created at module load. All existing `createListen` methods keep their signatures.

- [ ] **Step 1: Add failing tests for bind/unbind persistence to `scripts/reader.test.js`**

Add tests using the existing `harness()` helper (which already builds sentences/cards/toggle/store and returns `api`):
```js
test('listen: unbind keeps the same audio element playing', () => {
  const h = harness();
  h.api.startListen();
  const audio = h.audio();
  h.api.unbind();
  assert.equal(h.api.isPlaying(), true);
  assert.equal(h.audio(), audio);        // same Audio instance
  assert.equal(audio.paused, false);
});

test('listen: bind to a new page reuses the audio element and re-anchors', () => {
  const h = harness(3, '1');
  h.api.startListen();
  const audio = h.audio();
  const fresh = harness(3, '1');
  h.api.bind({ sentences: fresh.sentences, cards: fresh.cards,
    getIndex: fresh.getIndex || (() => 0), goTo: (i) => {}, toggle: fresh.toggle });
  assert.equal(h.audio(), audio);
  assert.equal(fresh.sentences[0].classes.has('playing'), true);
});
```
(Adjust `getIndex` to a local `() => 0` when the helper does not expose it.)

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/reader.test.js`
Expected: FAIL — `api.bind`/`api.unbind` are not functions.

- [ ] **Step 3: Refactor `createListen` and the reader IIFE in `assets/reader.js`**

- Change `createListen` to hold its context in a mutable `ctx` object initialized from the constructor args. Extract the toggle `addEventListener('click', toggleListen)` and `paint(prefOn())` into a `wire(toggle)` helper that both the constructor and `bind()` call; guard `paint` and `wire` against a missing toggle.
- Add `bind(next)`: unwire the old toggle, set `ctx = { ...next }`, wire the new toggle, then with the preference on: if `playing`, re-anchor by calling `playFrom(first sentence of visible card)` so a new story's audio matches what is on screen; if idle, call `startListen()` (one-touch continuation). With the preference off while playing, call `stopListen()`.
- Add `unbind()`: unwire the toggle and set `ctx = { ...ctx, sentences: [], cards: [] }` — do not touch `playing`, `audio`, or `prefetch`.
- Keep `audio`/`prefetch` created once in the constructor; never recreate them in `bind()`.
- Replace the auto-run IIFE with `init(signal)`/`destroy()`:
  - `init(signal)` creates one `AbortController`, passes `{ signal }` to every `addEventListener` (deck pointer events, focusin, document keydown, phone matchMedia change, image load/error, body scroll, window resize), sets up each `.reader-deck`, and calls `singleton.bind({ sentences, cards, getIndex, goTo, toggle })` when a deck with audio is found.
  - Create the singleton once at module scope: `let listen = createListen({ sentences: [], cards: [], getIndex: () => 0, goTo: () => {}, toggle: null, storage: window.localStorage, AudioCtor: window.Audio, reducedMotion: ... })` guarded by the browser check. Remove the old "arm on first pointerdown/keydown" block from `setup()` — `bind()` now starts playback.
  - `destroy()` aborts the controller, calls `listen.unbind()`, removes `reader-fullscreen` from body, and clears deck state.
  - Export `window.ReaderPage = { init, destroy, listen }`. Remove the old auto-init-on-DOMContentLoaded; `app.js` will call `init()` on first load.
  - Keep `module.exports = { createListen }` at the bottom.

- [ ] **Step 4: Run reader tests**

Run: `node --test scripts/reader.test.js scripts/home.test.js`
Expected: all pass (existing tests plus the new persistence tests).

- [ ] **Step 5: Commit**

```bash
git add assets/reader.js scripts/reader.test.js
git commit -m "refactor: persistent rebindable audio player and reader lifecycle"
```

---

### Task 2: Home page lifecycle

**Files:**
- Modify: `assets/home.js`
- Test: `scripts/home.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `window.HomePage = { init(signal), destroy() }`. The existing home toggle preference logic and cover feed behavior are unchanged; all listeners/observer use the init signal.

- [ ] **Step 1: Refactor the IIFE in `assets/home.js` into `init(signal)`/`destroy()`**

Wrap the current IIFE body in `init(signal)`; create one `AbortController`, pass `{ signal }` to the toggle click, image load/error, `next` click, and document keydown listeners, and pass `{ signal }` to `observer.observe` where supported (otherwise disconnect in `destroy()`). `destroy()` aborts the controller and disconnects the `IntersectionObserver`. Export `window.HomePage = { init, destroy }`. Keep the `typeof window !== 'undefined'` guard so Node tests that import helper functions still load.

- [ ] **Step 2: Run tests**

Run: `node --test scripts/home.test.js scripts/reader.test.js`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add assets/home.js
git commit -m "refactor: home page init/destroy lifecycle"
```

---

### Task 3: SPA router

**Files:**
- Create: `assets/app.js`
- Test: `scripts/spa.test.js`

**Interfaces:**
- Consumes: `window.ReaderPage`, `window.HomePage` from Tasks 1–2.
- Produces: pure helpers exported via `module.exports`: `shouldIntercept(anchor, location)`, `pageFor(rootEl)` → `'reader' | 'home' | null`, `swapDocument(currentDoc, nextDoc)`. Browser-only code calls them.

- [ ] **Step 1: Write failing tests for the pure helpers in `scripts/spa.test.js`**

```js
const { shouldIntercept, pageFor, swapDocument } = require('../assets/app.js');
```
Assertions:
- `shouldIntercept({ href: 'https://termux.io.vn/posts/x/', target: '', download: undefined, origin: 'https://termux.io.vn' }, new URL('https://termux.io.vn/')) === true`
- same-origin href with `target='_blank'` → false; with `download` → false; `'#section'` → false; `'mailto:x@y.z'` → false; different origin → false.
- `pageFor({ querySelector: (s) => s === '.reader-deck' ? {} : null }) === 'reader'`; same for `.cover-feed` → `'home'`; none → `null`.
- `swapDocument` copies `<main>` innerHTML, `<title>` text, `meta[name=description]` content, and `body.className` from `nextDoc` to `currentDoc`. Use a tiny hand-rolled doc stub with `querySelector`/`innerHTML`/`textContent`/`className` (no DOMParser dependency).
- `shouldIntercept` skips `javascript:` and `tel:` hrefs as well.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/spa.test.js`
Expected: FAIL — `Cannot find module '../assets/app.js'`.

- [ ] **Step 3: Implement `assets/app.js`**

Structure:
```js
'use strict';
function shouldIntercept(anchor, location) { /* exact Global Constraints rules */ }
function pageFor(root) { /* .reader-deck -> reader, .cover-feed -> home */ }
function swapDocument(currentDoc, nextDoc) { /* main.innerHTML, title, description meta, body.className */ }
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let active = null, controller = null;
  function deactivate() { if (active === 'reader') window.ReaderPage.destroy(); if (active === 'home') window.HomePage.destroy(); controller && controller.abort(); active = null; }
  function activate() { deactivate(); controller = new AbortController(); const type = pageFor(document.querySelector('main')); if (type === 'reader') window.ReaderPage.init(controller.signal); if (type === 'home') window.HomePage.init(controller.signal); active = type; window.scrollTo(0, 0); }
  function navigate(href, push) { fetch(href).then(r => r.text()).then(html => { swapDocument(document, new DOMParser().parseFromString(html, 'text/html')); if (push) history.pushState({}, '', href); activate(); }); }
  document.addEventListener('click', (e) => { const a = e.target.closest('a[href]'); if (!a || !shouldIntercept(a, location)) return; e.preventDefault(); navigate(a.href, true); });
  window.addEventListener('popstate', () => navigate(location.href, false));
  if (document.readyState !== 'loading') activate(); else document.addEventListener('DOMContentLoaded', activate, { once: true });
}
if (typeof module !== 'undefined' && module.exports) module.exports = { shouldIntercept, pageFor, swapDocument };
```
`activate()` must call the outgoing page's `destroy()` before init; guard missing globals with `typeof window.X !== 'undefined'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/spa.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/app.js scripts/spa.test.js
git commit -m "feat: SPA fetch-and-swap router"
```

---

### Task 4: Wire the shell and regenerate

**Files:**
- Modify: `scripts/sync.js` (`assetVersion` list + `shell()` line 128)
- Modify: `scripts/sync.test.js`
- Regenerate: `index.html`, `tam-su/index.html`, `posts/**/index.html`

**Interfaces:**
- Consumes: `assets/app.js`, `assets/reader.js`, `assets/home.js` from earlier tasks.
- Produces: every generated page loads the three scripts once from the shell; per-page script tags are gone.

- [ ] **Step 1: Write the failing test in `scripts/sync.test.js`**

```js
test('all generated pages load the SPA scripts from the shell', () => {
  const outDir = makeOutDir();
  syncStories({ dbPath: DB, outDir });
  for (const file of ['index.html', 'tam-su/index.html', 'posts/a-story/index.html']) {
    const html = fs.readFileSync(path.join(outDir, file), 'utf8');
    for (const script of ['app.js', 'reader.js', 'home.js']) {
      assert.match(html, new RegExp(`assets/${script}\\?v=[0-9a-f]{8}`));
    }
  }
});
```
Use the existing fixture helpers/`DB` from that file.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/sync.test.js`
Expected: FAIL — no `app.js` script tag.

- [ ] **Step 3: Change `shell()` and `assetVersion()` in `scripts/sync.js`**

- Add `'app.js'` to the file list in `assetVersion()`.
- In `shell()`, after the `theme.js` defer line, add defer script tags for `reader.js`, `home.js`, and `app.js` using `${prefix}assets/...` and `assetVersion()`.
- Remove the per-page `<script src="../../assets/reader.js...defer></script>` from the post body and `<script src="assets/home.js...defer></script>` from the home body (they now load from the shell). Leave the inline theme head script untouched.

- [ ] **Step 4: Run tests and regenerate**

Run: `node --test scripts/*.test.js && node scripts/sync.js`
Expected: all tests pass; generated HTML updated with the new hash and script tags.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync.js scripts/sync.test.js index.html tam-su/index.html posts
git commit -m "feat: load SPA scripts from the shell on every page"
```

---

### Task 5: Browser check + final verification

**Files:**
- Create: `checks/spa.yaml`

**Interfaces:**
- Consumes: all of the above, served over HTTP.

- [ ] **Step 1: Write `checks/spa.yaml`**

Mirror `checks/listen.yaml` syntax. Cover: goto home → `.cover-feed` visible; instrument `history.pushState`; click `.cover-read`; assert `.reader-deck` and URL changed and `pushState` called once; click `.reader-back`; assert `.cover-feed` restored; `history.back()`; assert `.reader-deck` back and `pushState` count unchanged; dispatch one ArrowRight and assert `.reader-top-count` changed. No screenshot dependency is required.

- [ ] **Step 2: Run the full gate and the check**

Run merge gate: `node --test scripts/*.test.js` — expect all green.
Run the browser check over HTTP using the pwterm binary and a static server as in `checks/listen.yaml`. If pwterm or a server is unavailable, record that in the report; the Node gate is the shipping gate.

- [ ] **Step 3: Commit**

```bash
git add checks/spa.yaml
git commit -m "test: browser check for SPA navigation"
```
