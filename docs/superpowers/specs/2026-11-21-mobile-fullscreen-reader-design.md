# Mobile fullscreen reader design

## Intent

Make the post detail a true full-page screen on mobile — easier to read on a phone — and stop the browser's zoom and stray-touch behaviour from interrupting reading.

## Goals

- On phones (max-width 719px) with JS: the post fills the viewport; site header/footer, big title, and standalone back/source lines are replaced by a compact top bar (back arrow, truncated title, part counter) and bottom controls.
- The card deck occupies all remaining height; the text area still scrolls internally.
- Pinch zoom and double-tap zoom are blocked on post pages only.
- Stray touches do not highlight/callout images or controls, select text during a swipe, bounce the page, or cause horizontal scroll.
- Desktop layout and the no-JS vertical stack stay as they are.

## Non-goals / anti-goals

- No separate mobile page or second generator.
- No change to the home listing.
- No removal of the source link — it moves into the last card when enhanced.
- No library, build step, or network request.

## Constraints

- `scripts/sync.js` remains the only writer of HTML.
- No npm dependencies; Node built-in tests plus headless Chromium verification.
- Existing reader controls (swipe, buttons, dots, keys, reduced motion, aria-live, inert) must keep working.
- Custom domain is live at termux.io.vn; GitHub Pages serves the repo root.

## Approaches

- **A (chosen): body class from a media query + small generator/JS changes.** JS toggles `reader-fullscreen` on `<body>` from `matchMedia('(max-width: 719px)')`; CSS scopes the fullscreen rules to that class. One code path, no duplicated markup.
- B: a separate mobile template generated alongside the desktop one. Doubles the generator and risks drift — rejected.
- C: CSS-only with `:has()`. Less JS but weaker control over zoom/body state — rejected.

## Decisions

- Post-page viewport meta becomes `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`; the home page keeps a zoomable viewport. Accessibility tradeoff is explicit and accepted at the user's request.
- `touch-action: pan-y` on the deck keeps vertical scrolling native while reserving horizontal movement for swipe; buttons/top bar use `touch-action: manipulation`.
- `-webkit-touch-callout: none` on images and controls; `user-select: none` applied only while a swipe is in progress (`.is-swiping`), so normal text selection still works.
- `overscroll-behavior: none` on the fullscreen body prevents rubber-band bounce.
- Top bar back arrow links to the home page; the source link is appended to the last card's text area by JS when enhancing.

## What's left to the builder

- Exact spacing/colors of the top bar within the existing theme tokens.
- Verify in Chromium at 390x844: full viewport height, no page scroll or horizontal scroll, zoom disabled, swipe/buttons/keys intact, source reachable on the last card.
