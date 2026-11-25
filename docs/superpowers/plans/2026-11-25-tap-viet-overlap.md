# Fix overlapping text in /tap-viet/ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Vietnamese diacritics to their base glyphs so the worksheet text no longer collides.

**Architecture:** The static app parses the bundled TrueType font in `tap-viet/src/font.js` and emits SVG paths in `tap-viet/src/worksheet.js`. The defect is in the parser's 8-bit composite-glyph argument handling; fix it there, then prove it with a `node:test` regression over every affected glyph.

**Tech Stack:** plain ES modules, `node:test`, no dependencies or build step.

**Spec:** `docs/superpowers/specs/2026-11-25-tap-viet-overlap-design.md`

## Global Constraints

- Static app; do not add dependencies or a build step.
- Full merge gate: `node --test scripts/*.test.js` (119 tests currently pass). No lint/type-check config exists.
- Work in the `tap-viet-overlap` worktree off `main`; never commit to `main`.
- No renderer-level clamping; fix the parser only.

## Review Focus

- Composites with nonzero dy offsets (e.g. marks above baseline): the fix must not swap dx/dy or lose dy — covered by the same glyph loop in Task 1.
- Signed byte values (e.g. `ơ`, `õ` with negative offsets): loop includes both.
- Word-argument composites (e.g. `ạ`) must keep working: loop includes `ạ`.
- Plain glyphs (`B`, `à`) must not regress: loop includes both.
- Browser rendering: screenshot the live static page after the fix (Task 2, final step).

---

### Task 1: Regression test for composite glyph offsets

**Files:**
- Modify: `scripts/tap-viet.test.js`

**Interfaces:**
- Consumes: `glyphPaths(bytes, text, { size })` → `{ ink, guide }` and `measureText(bytes, text, size)` → number from `tap-viet/src/font.js` (both already exported).
- Produces: a failing test named `tap-viet: composite glyph diacritics stay within their advance`.

- [ ] **Step 1: Append the failing test to `scripts/tap-viet.test.js`**

The file is CommonJS; load the ES module with a dynamic `import()` of its file URL. Assert every listed glyph's `ink` x-range stays within `[-1, advance + 1]` at `size: 5`:

```js
const { pathToFileURL } = require('node:url');

test('tap-viet: composite glyph diacritics stay within their advance', async () => {
  const file = fs.readFileSync(path.join(APP, 'assets/tieuhoc-vn.ttf'));
  const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const { glyphPaths, measureText } = await import(pathToFileURL(path.join(APP, 'src/font.js')).href);
  const bounds = (d) => {
    const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    return { min: Math.min(...xs), max: Math.max(...xs) };
  };
  for (const ch of 'ữẽẹếìđơõạBà') {
    const { ink } = glyphPaths(bytes, ch, { size: 5 });
    const advance = measureText(bytes, ch, 5);
    const { min, max } = bounds(ink);
    assert.ok(min >= -1 && max <= advance + 1,
      `${ch}: ink ${min}..${max} outside advance ${advance}`);
  }
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test --test-name-pattern 'composite glyph diacritics' scripts/tap-viet.test.js`
Expected: FAIL with `ữ: ink ... outside advance 1.31` (and other glyphs).

- [ ] **Step 3: Commit the test**

```bash
git add scripts/tap-viet.test.js
git commit -m "test: pin Vietnamese composite glyph offsets"
```

### Task 2: Parse 8-bit composite offsets as signed bytes

**Files:**
- Modify: `tap-viet/src/font.js` (composite glyph argument branch, near line 161)

**Interfaces:**
- Consumes: the test from Task 1.
- Produces: corrected `contours()` behavior; public exports unchanged.

- [ ] **Step 1: Replace the 16-bit reads in the byte-argument branch**

In `contours()`, where `flags & 1` is false, change the two reads to signed 8-bit values:

```js
dx = (d[p] << 24) >> 24;
dy = (d[p + 1] << 24) >> 24;
```

Keep `p += 2` and all transform/scale handling unchanged.

- [ ] **Step 2: Run the regression test and verify it passes**

Run: `node --test --test-name-pattern 'composite glyph diacritics' scripts/tap-viet.test.js`
Expected: PASS (1 test).

- [ ] **Step 3: Run the full merge gate**

Run: `node --test scripts/*.test.js`
Expected: all tests pass, 0 failures.

- [ ] **Step 4: Visual check in a browser**

Serve the worktree with `python3 -m http.server 8899`, open `/tap-viet/`, wait for the SVG, take a screenshot and read it. Expected: the model line reads `Bài 1: Bảng chữ cái` with each tone mark on its letter and no ink spilling into other rows.

- [ ] **Step 5: Commit the fix**

```bash
git add tap-viet/src/font.js
git commit -m "fix: read 8-bit composite glyph offsets as signed bytes"
```
