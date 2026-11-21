# Card reader design

## Intent

Replace the long-scroll post detail with a swipeable card deck: one story part per card, illustration on top, text below. The reader must feel native on a phone while staying readable and operable without a swipe gesture.

## Goals

- One card per part, in order, with image above text.
- Swipe left/right (within the card area only) to move between parts.
- Visible prev/next buttons, clickable progress dots, and arrow-key support.
- Long part text scrolls inside the card; no content is lost.
- Mobile: full-viewport deck. Desktop: centered card, fixed comfortable height.
- Works without JavaScript as a vertical stack of cards.

## Non-goals / anti-goals

- No library, framework, build step, or network request.
- No changes to pwterm or the stories database.
- No change to the home listing.
- No full-page horizontal scroll hijacking; no gesture-only controls.

## Constraints

- Generator (`scripts/sync.js`) is the only writer of post HTML; it stays the source of post markup.
- Existing card CSS class names are reused where possible; new reader classes are prefixed `reader-`.
- Generated HTML must remain fully readable when `assets/reader.js` does not run.
- UX data used: WCAG Dragging Movements (alternative control required), Gesture Conflicts (avoid horizontal swipe on main content), Touch Target Size, Mobile First, Reduced Motion.
- Tests remain Node's built-in test runner, no npm dependencies.

## Approaches

- **A (chosen): generated deck + small vanilla enhancer.** sync.js emits all parts as cards plus controls; `assets/reader.js` progressively enhances into a deck. Accessible, no deps, works offline on GitHub Pages. Cost: two files touched plus CSS and tests.
- B: CSS-only scroll-snap deck. No JS, but no working dots/disabled states/keyboard and weak swipe control — rejected.
- C: render only the active part and fetch the rest. Loses no-JS readability and SEO — rejected.

## Decisions

- Counter and dots are generated from the part count; JS only updates their state.
- Buttons have Vietnamese accessible labels ("Phần trước", "Phần sau") and are disabled at the ends.
- Swipe threshold: horizontal movement must exceed vertical movement and 45px before a swipe is accepted, so in-card text scrolling is not hijacked.
- `prefers-reduced-motion` disables the slide transition.
- Desktop card is capped at ~720px wide and ~80vh tall; mobile card fills the viewport using `100dvh`.

## What's left to the builder

- Exact colors, radii, and motion timing are the builder's call within the existing theme tokens.
- Verify in headless Chromium that swipe, buttons, keys, and fallback stack behave as described.
