# Space cursive glyphs in /tap-viet/ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the worksheet's model line readable by spacing cursive glyphs apart.

**Architecture:** `tap-viet/src/font.js` owns both glyph placement (`glyphPaths`) and width measurement (`measureText`). Apply the same 1.3× tracking factor to the per-glyph cursor step in both functions, then verify the rendered text visually and with the full test suite.

**Tech Stack:** plain ES modules, `node:test`, no dependencies or build step.

**Spec:** `docs/superpowers/specs/2026-11-25-tap-viet-letter-spacing-design.md`

## Global Constraints

- Static app; no dependencies or build step.
- Merge gate: `node --test scripts/*.test.js`. No lint/type check defined.
- Work in the `tap-viet-spacing` worktree off `main`.
- `glyphPaths()` and `measureText()` must use the same tracking factor.

## Review Focus

- Centre/right alignment: both width and placement change together — covered by editing both functions in Task 1.
- Spaces between words: must also be tracked so word gaps stay proportional.
- Longest lesson sentence must still fit the 200 mm writing area — checked by a width sweep after the fix.
- Browser rendering at normal zoom — screenshot in Task 1.

---

### Task 1: Track glyph advances by 1.3×

**Files:**
- Modify: `tap-viet/src/font.js` (`glyphPaths`, `measureText`)
- Modify: `scripts/tap-viet.test.js`

**Interfaces:**
- Consumes: `glyphPaths(bytes, text, { size })` → `{ ink, guide }` and `measureText(bytes, text, size)` → number.
- Produces: tracked cursor positions in both functions; exports unchanged.

- [ ] **Step 1: Write the failing test in `scripts/tap-viet.test.js`**

Append, reusing the existing `pathToFileURL` import, `fs`, `path` and `APP` constants:

```js
test('tap-viet: cursive glyphs are spaced apart', async () => {
  const file = fs.readFileSync(path.join(APP, 'assets/tieuhoc-vn.ttf'));
  const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const { glyphPaths, measureText } = await import(pathToFileURL(path.join(APP, 'src/font.js')).href);
  const single = measureText(bytes, 'i', 5);
  const pair = measureText(bytes, 'ii', 5);
  assert.ok(pair > single * 2.4, `advance ${pair} still too tight for ${single}`);
  const { ink } = glyphPaths(bytes, 'ii', { size: 5 });
  const xs = [...ink.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 0);
  const width = Math.max(...xs) - Math.min(...xs);
  assert.ok(width > single * 2.2, `rendered ${width} still too tight for ${single}`);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test --test-name-pattern 'cursive glyphs are spaced' scripts/tap-viet.test.js`
Expected: FAIL (`advance ... still too tight`).

- [ ] **Step 3: Implement tracking**

In `tap-viet/src/font.js`, define `const TRACKING = 1.3;`. In both `glyphPaths()` and `measureText()`, multiply the per-character cursor/width step by `TRACKING` in both the whitespace branch and the glyph branch. Leave all other logic unchanged.

- [ ] **Step 4: Verify GREEN and the merge gate**

Run the pattern test (expect PASS), then `node --test scripts/*.test.js` (expect all pass, 0 failures).

- [ ] **Step 5: Visual check**

Serve the worktree on port 8899, open `/tap-viet/`, take a screenshot at normal zoom and read it. Expect the model line to be readable, with letters visibly separated.

- [ ] **Step 6: Commit**

```bash
git add tap-viet/src/font.js scripts/tap-viet.test.js docs/superpowers/specs/2026-11-25-tap-viet-letter-spacing-design.md docs/superpowers/plans/2026-11-25-tap-viet-letter-spacing.md
git commit -m "fix: space cursive worksheet glyphs apart"
```
