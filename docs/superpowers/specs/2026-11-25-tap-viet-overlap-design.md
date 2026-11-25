# Fix overlapping text in /tap-viet/ worksheet

## Intent

The Vietnamese handwriting worksheet at `https://termux.io.vn/tap-viet/`
renders model text with letters and tone marks colliding. A screenshot of the
live page shows `Bài 1: Bảng chữ cái` as a jumble. Fix it so each sample sits
inside its writing row and is legible when printed at A4 100%.

## Root cause

`tap-viet/src/font.js` parses TrueType composite glyphs. Components whose
arguments are 8-bit (`ARG_1_AND_2_ARE_WORDS` clear) are read with `i16()`,
which consumes two bytes as one signed 16-bit number instead of two signed
8-bit numbers. For `ẽ` the bytes `0x78 0x00` (dx = 120, dy = 0 font units)
become dx = 30720 units — about 75 mm at the worksheet's scale. The tone mark
is therefore drawn far to the right, on top of later letters. The same defect
affects `ẹ`, `ế`, `ì`, `đ`, `ữ`, `ơ`, `õ` and others.

Evidence: `glyphPaths()` for `ữ` puts an ink contour at x = 19.79 mm although
the glyph advance is 1.31 mm; `ẽ` reaches 76 mm. Working glyphs such as `B`
and `à` stay within their advance.

## Approaches

1. **Fix the parser (chosen).** Read the two arguments as signed bytes with
   `(d[p] << 24) >> 24`. Two-line change, fixes every affected glyph at the
   source, keeps the custom SVG renderer and the existing font.
2. **Clamp stray contours in `worksheet.js`.** Discard paths outside the
   glyph's advance. Hides the collision but deletes legitimate tone marks and
   leaves the font parser broken.
3. **Replace the font / render with canvas text.** Large rewrite of the SVG
   pipeline, loses per-glyph guide dots and A4 print geometry. Disproportionate
   to the bug.

## Goals / non-goals / anti-goals

- Goals: diacritics land on their base letter; no ink spills into a wider
  area than the glyph's advance; rows stay on the existing ten-line grid.
- Non-goals: redesigning the worksheet, changing lessons or fonts.
- Anti-goal: a renderer-level clamp that masks the parser bug.

## Constraints

- Static app: HTML/CSS/ES modules, no build step, no dependencies.
- Tests are plain `node:test` files under `scripts/`; merge gate is the full
  suite (`node --test scripts/*.test.js`). No lint or type-check config exists.
- Live site is GitHub Pages from `main`; the fix reaches the user only after
  a squash merge and a Pages rebuild.

## Implementation

- In `font.js`, parse 8-bit composite arguments as signed bytes.
- Add a `node:test` regression asserting that every Vietnamese glyph used in
  the lessons keeps its ink inside its advance (plus a small tolerance for
  handwriting overshoot), and that a known broken glyph (`ữ`) is fixed.
- Verify in a browser at `file://` or a local static server with a screenshot
  before merging.
