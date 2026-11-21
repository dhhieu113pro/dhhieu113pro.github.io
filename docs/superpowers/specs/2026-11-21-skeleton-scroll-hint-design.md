# Skeleton loading and scroll hint design

## Intent

Show a shimmer placeholder while cover/card images load, and signal when a story part has more text below the fold.

## Goals

- Home covers and detail card images show a shimmer skeleton until their image loads, then fade in.
- A small ↓ badge appears on detail parts whose text overflows, and disappears once scrolled to the bottom.
- Reduced-motion users get a static placeholder; no-JS users still see images and no badge.
- No new dependencies or build step.

## Non-goals

- No artificial loading delay and no full-page fake skeleton.
- No change to story data, navigation, or text layout.

## Constraints

- `scripts/sync.js` is the only writer of HTML; emits `.scroll-hint` per card.
- `assets/reader.js` and `assets/home.js` own the runtime state.
- All image URLs already carry the content-hash cache buster.
- Node built-in tests plus pwterm verification.

## Approaches

- **A (chosen): CSS shimmer + small JS state toggles.** Real image load events drive the skeleton; scroll position drives the hint. No dependencies.
- B: pure CSS skeleton with `img:not([complete])`. Cannot react reliably to cached images — rejected.
- C: always-visible scroll arrow. Would mislead on short parts — rejected.

## Decisions

- Skeleton class is added by JS only; images default visible so no-JS is unaffected.
- `img.complete && naturalWidth > 0` completes the skeleton immediately for cached images.
- Scroll hint is `aria-hidden`, `pointer-events: none`, and toggled by `.hint-visible` on the card.
- Shimmer animation is disabled under `prefers-reduced-motion`.

## What's left to the builder

- Exact shimmer colors, hint size, and fade timing within theme tokens.
- Verify with pwterm that skeletons clear, the hint appears only on overflowing parts, and no interactions regress.
