# Space cursive glyphs in /tap-viet/

## Intent

After the composite-offset fix, the model line in `/tap-viet/` is still
illegible at normal zoom: neighbouring cursive letters touch and read as a
jumble. A browser spike rendering `Bài 1: Bảng chữ cái` with 1.3× per-glyph
tracking made the same text readable without changing the font or row layout.

## Root cause

The handwriting font's swash-heavy glyph outlines fill their `hmtx` advances.
`glyphPaths()` and `measureText()` advance the cursor by exactly one font
advance per glyph, so flourishes from one letter touch the next. This is a
text-layout issue, not a font parsing issue: `B` has ink width 4.79 mm against
a 5.03 mm advance, and the isolated render shows its swash reaching the next
letter's edge.

## Approaches

1. **Add tracking in `font.js` (chosen).** Multiply each glyph step by 1.3 in
   both `glyphPaths()` and `measureText()` so rendering and width measurement
   stay in sync. One constant, no new dependencies, centre/right alignment
   keeps working because both functions change together.
2. **Space characters in `worksheet.js`.** Would need a parallel width
   calculation and duplicate cursor logic; more code for the same result.
3. **Swap the font or draw one letter per cell.** Large redesign that changes
   the workbook's layout and lessons; out of scope.

## Goals / non-goals / anti-goals

- Goals: neighbouring glyphs visibly separated at A4 100%; model line readable
  at normal zoom; alignment and row fit unchanged.
- Non-goals: changing the font, lessons, grid geometry or baseline.
- Anti-goal: changing `glyphPaths()` without `measureText()` (or vice versa),
  which would break centred and right-aligned text.

## Constraints

- Static app, no build step or dependencies.
- Merge gate: `node --test scripts/*.test.js`; no lint/type config exists.
- Verify with a screenshot at normal zoom before merging, and again on the
  live site after Pages rebuilds.
