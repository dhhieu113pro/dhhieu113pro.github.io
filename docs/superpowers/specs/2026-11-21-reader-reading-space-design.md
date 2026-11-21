# Reader reading space and home control design

## Intent

Give post-card text more room to read, and add a home icon below the reader's navigation controls.

## Goals

- Card text has ~22px side padding, line-height 1.8, and a ~62-character centered measure; left-aligned.
- A house-icon link to the home feed sits centered below the prev/dots/next row.
- Fullscreen phone reader keeps the deck usable; controls take a little more height.
- No-JS and desktop behavior stay intact.

## Non-goals

- No justified or centered text, no font loading, no new dependencies.
- No change to the cover-feed home page or to story data.

## Constraints

- `scripts/sync.js` is the only writer of post HTML.
- Home control is an inline SVG with an accessible name; no emoji, no external assets.
- Node built-in tests plus headless Chromium verification.

## Approaches

- **A (chosen): generator adds a two-row controls block; CSS handles spacing.** Small, no runtime JS changes.
- B: inject the home button from `reader.js`. Would leave no-JS markup without the control and adds JS work — rejected.
- C: reuse the top-bar back arrow only. Does not meet the request for a bottom home icon — rejected.

## Decisions

- Controls markup becomes `.reader-controls > .reader-nav` (prev/dots/next) plus `.reader-home` link.
- `.reader-home` is hidden until the deck is enhanced (`.reader-ready`), like the other controls.
- Text column: `max-width: 62ch; margin: 0 auto; text-align: left; line-height: 1.8`.
- Home icon SVG uses `currentColor`, 24px, `aria-hidden="true"`; link has `aria-label="Về trang chủ"`.

## What's left to the builder

- Exact SVG path and circle sizing within existing theme tokens.
- Verify at 390x844 that text padding/line-height are applied, home link is visible and below the nav row, swipe/buttons still work, and no-JS is unchanged.
