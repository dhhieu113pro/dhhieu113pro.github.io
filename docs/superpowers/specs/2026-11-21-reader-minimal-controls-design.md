# Reader minimal controls design

## Intent

Maximize reading space in the post reader: remove the prev/next buttons and centered home icon, keep only dots overlaid on the content, and add a tappable next-post bar at the bottom.

## Goals

- No prev/next buttons, no bottom home icon, no bottom counter.
- Dots float over the card near the bottom with a soft gradient for legibility.
- A bottom bar shows the next story's title and opens it when tapped; wraps from last to first.
- The top-bar back arrow remains the home control.
- Deck grows to fill the freed space; card text can scroll clear of the overlays.
- Swipe, dots, and arrow keys still change parts.
- Each sentence ending in `.` renders on its own line in the card for easier reading; no words are lost.

## Non-goals

- No change to the cover-feed home page or story data.
- No new dependencies or runtime images.

## Constraints

- `scripts/sync.js` is the only writer of post HTML.
- `assets/reader.js` must be updated for the new dot location and optional counter.
- Next-post href must be a relative path valid on GitHub Pages.
- Node built-in tests and pwterm browser flow for verification.

## Approaches

- **A (chosen): generator emits overlay dots + next-post bar; CSS positions them; JS adapts.** Small, no new runtime dependencies.
- B: keep buttons but hide them with CSS. Leaves dead markup and inaccessible controls — rejected.
- C: add a JS router for next post. Static links are simpler and work without JS — rejected.

## Decisions

- Dots move inside `.reader-deck` as a sibling of `.reader-track`, absolutely positioned near the bottom.
- Next-post bar is a fixed `<a class="reader-next-post">` with label, title and arrow; href `../<next-slug>/`; wraps to the first story on the last one.
- Bottom `.reader-count` element is removed; the top bar keeps the `1 / N` indicator.
- Card body gets extra bottom padding so text scrolls past the dots and next-post bar.
- Part text is split on `/(?<=\.)\s+/` plus existing newlines; each piece becomes a `<span class="sentence">` block, escaped as before. The full text remains in the DOM.

## What's left to the builder

- Exact overlay gradients/heights within existing theme tokens.
- Verify with pwterm at 390x844: overlay geometry, next-post navigation, part navigation, and increased deck height.
