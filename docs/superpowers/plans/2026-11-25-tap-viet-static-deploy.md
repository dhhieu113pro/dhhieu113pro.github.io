# Deploy tapviet as a static app at /tap-viet/ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the unchanged static worksheet app at `https://termux.io.vn/tap-viet/` from the GitHub Pages repo.

**Architecture:** The app is already static (relative HTML/CSS/ES-module imports, no backend or build). Copy its five runtime files into a top-level `tap-viet/` folder in the pages repo; a small `node:test` file keeps that folder self-contained and independent of the blog's SPA shell. The blog sync script only wipes `posts/` and `assets/img/`, so the folder is durable.

**Tech Stack:** GitHub Pages, static HTML/CSS/ES modules, `node:test`. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-tap-viet-static-deploy-design.md`

## Global Constraints

- Deploy path is exactly `/tap-viet/`; files land in `tap-viet/` at the pages repo root.
- Copy exactly these five runtime files, unchanged: `index.html`, `app.js`, `styles.css`, `src/lessons.js`, `src/worksheet.js`.
- All asset references stay relative and local; no absolute URLs, no CDN, no blog SPA scripts.
- No server, backend, build step, or new dependency.
- Blog behaviour and `scripts/sync.js` are untouched.

## Review Focus

- Stale or partial copy → test asserts all five files exist and are non-empty.
- Accidental blog SPA hijack of the app → test asserts `assets/app.js` is not referenced from `tap-viet/index.html`.
- Broken module path after deploy → test asserts every `src=` / `href=` in deployed HTML resolves to a file in the folder and every `import` target exists.
- Sync script wiping the folder on the next story publish → test asserts `scripts/sync.js` only removes `posts` and `assets/img`, not `tap-viet`.
- MIME/module loading on GitHub Pages → post-merge browser check of the live URL; local static server check before PR.

---

### Task 1: Deployed bundle test (RED)

**Files:** Create `scripts/tap-viet.test.js`

**Interfaces:** Consumes files in `tap-viet/` (created in Task 2); produces a green check that runs with `node --test scripts/*.test.js`.

- [ ] **Step 1: Write the failing test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'tap-viet');
const RUNTIME = ['index.html', 'app.js', 'styles.css', 'src/lessons.js', 'src/worksheet.js'];

test('tap-viet: all runtime files are deployed and non-empty', () => {
  for (const file of RUNTIME) {
    const target = path.join(APP, file);
    assert.ok(fs.existsSync(target), `missing ${file}`);
    assert.ok(fs.statSync(target).size > 0, `empty ${file}`);
  }
});

test('tap-viet: html references only local relative assets that exist', () => {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(!/^([a-z]+:|\/\/)/i.test(ref), `external ref ${ref}`);
    assert.ok(fs.existsSync(path.join(APP, ref)), `missing ref ${ref}`);
  }
  assert.ok(!html.includes('assets/app.js'), 'blog SPA must not be loaded in the app');
});

test('tap-viet: module imports resolve inside the folder', () => {
  for (const file of ['app.js', 'src/worksheet.js']) {
    const code = fs.readFileSync(path.join(APP, file), 'utf8');
    for (const match of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      assert.ok(fs.existsSync(path.resolve(APP, path.dirname(file), match[1])), `${file} -> ${match[1]}`);
    }
  }
});

test('tap-viet: story sync never deletes the deployed app', () => {
  const sync = fs.readFileSync(path.join(ROOT, 'scripts/sync.js'), 'utf8');
  const removals = [...sync.matchAll(/rmSync\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(removals.length > 0);
  for (const removal of removals) assert.ok(!removal.includes('tap-viet'), removal);
});
```

- [ ] **Step 2: Run `node --test scripts/tap-viet.test.js`; expect FAIL** (missing folder/files).

### Task 2: Copy the static app and document the path (GREEN)

**Files:** Create `tap-viet/index.html`, `tap-viet/app.js`, `tap-viet/styles.css`, `tap-viet/src/lessons.js`, `tap-viet/src/worksheet.js`; Modify `README.md`.

**Interfaces:** Consumes the five runtime files from the `tapviet` repo at commit `9393edf`; produces the deployed folder tested in Task 1.

- [ ] **Step 1: Copy the five runtime files verbatim**

Run from the pages worktree:

```bash
SRC=/data/data/com.termux/files/home/GitHub/tapviet
mkdir -p tap-viet/src
cp "$SRC/index.html" "$SRC/app.js" "$SRC/styles.css" tap-viet/
cp "$SRC/src/lessons.js" "$SRC/src/worksheet.js" tap-viet/src/
```

Keep the bytes identical; do not add wrappers, redirects or blog chrome.

- [ ] **Step 2: Document the deploy path in `README.md`**

Add a short `## Tập viết` section stating the app is a pure static site served at `/tap-viet/` from the `tap-viet/` folder, copied from the `tapviet` repo, with no server or build; note that story sync does not touch it.

- [ ] **Step 3: Run `node --test scripts/tap-viet.test.js`; expect PASS (4 tests).**

- [ ] **Step 4: Browser check**

Serve the pages worktree on a free local port (`python3 -m http.server 8012 --bind 127.0.0.1`), open `http://127.0.0.1:8012/tap-viet/`, confirm the six option controls render and the worksheet appears with three traces. Then stop the temporary server.

- [ ] **Step 5: Commit**

```bash
git add tap-viet README.md scripts/tap-viet.test.js
git commit -m "feat: deploy static tap-viet app at /tap-viet/"
```
