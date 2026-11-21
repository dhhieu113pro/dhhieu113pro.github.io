# Cover feed home design

## Intent

Make the home page feel like a mobile app: a full-screen, swipeable feed of story covers instead of a grid. Each story gets one full-viewport cover with its image, title, byline/date, and a "Đọc ngay" button that opens the existing reader.

## Goals

- Home is a vertical scroll-snap feed of full-screen covers; swipe up/down or scroll to browse.
- A fixed top strip shows the brand and current position (`1 / 2`), updated by JS.
- Each cover: edge-to-edge image, dark scrim, title, byline/date, "Đọc ngay" link.
- Keyboard arrows and a next button work as non-swipe alternatives.
- Without JS the covers stack vertically as a normal page.
- Post pages and their reader are unchanged.

## Non-goals / anti-goals

- No fake tab bar, no search/filter, no pagination.
- No new image processing or changes to pwterm.
- No framework or build step.

## Constraints

- `scripts/sync.js` is the only writer of home HTML.
- No npm dependencies; Node built-in tests and headless Chromium verification.
- Home viewport stays zoomable (post pages keep their zoom lock).
- Existing `.sr-only` heading and empty state remain.

## Approaches

- **A (chosen): native CSS scroll-snap + small enhancer.** CSS handles full-screen slides and snapping; `assets/home.js` updates the counter, wires arrows/next button, and adds `feed-ready`. Native scrolling means touch feels right with no custom gesture code.
- B: custom touch-drag carousel with transform. More code, fights native scrolling, weaker accessibility — rejected.
- C: horizontal swipe feed. Conflicts with the reader's horizontal swipe language and the existing gesture guidance — rejected.

## Decisions

- Feed container is `100dvh` with `overflow-y: auto` and `scroll-snap-type: y mandatory`; each cover is `100dvh` with `scroll-snap-align: start`.
- `overscroll-behavior-y: contain` on the feed; `touch-action: pan-y`.
- Counter is hidden until JS adds `feed-ready`, so no-JS users don't see a stuck `1 / 2`.
- Covers with no image get a neutral background and still show title/scrim/read link.
- Desktop uses the same full-screen feed — the app feel is the point.

## What's left to the builder

- Exact scrim/radius/type scale within existing theme tokens.
- Verify at 390x844: snapping, counter update, keyboard/next button, no horizontal scroll, readable title, no-JS stack, post page unaffected.
