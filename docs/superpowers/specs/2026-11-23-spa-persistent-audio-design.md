# SPA navigation with persistent one-touch audio — short design

## Intent

The site is a static, generated blog. Today every internal navigation is a full
document load, which kills "Listen mode" audio. The request: make the pages a
SPA so audio survives navigation, and make listening a one-touch experience
whether the reader starts from the home feed or from a story.

## Why

- A full page reload destroys the `Audio` element, so playback stops at every
  link. The site cannot offer continuous listening until navigation happens in
  place.
- Listen mode already starts from one tap on a story, but the tap that opened
  the story is a different document from the one that plays audio, so the user
  must tap twice (once to open, once to start). SPA navigation keeps the same
  document, so the opening gesture can also start audio.

## Approach picked

**A — SPA fetch-and-swap + a persistent shell-level audio player.**

- One new `assets/app.js` intercepts same-origin link clicks, fetches the
  target HTML, swaps `<main>` / `<title>` / description / body class, pushes
  history, and drives the incoming page's init. `popstate` re-runs the swap
  without another history entry. Generated HTML is unchanged apart from script
  tags: real pages still exist on disk.
- `assets/reader.js` and `assets/home.js` move from per-page `<script>` tags
  into the shell and load once. Each exposes `init(signal)` / `destroy()`.
  All listeners/observers use one `AbortController` per init; `destroy()`
  aborts it.
- The audio player becomes a singleton created once in `reader.js` (its `Audio`
  and prefetch elements live for the whole session). `createListen` gains a
  `bind({ sentences, cards, getIndex, goTo, toggle })` seam and `destroy()`
  that only tears down page listeners — it never pauses audio. Because the
  player is not recreated on navigation, playback is never interrupted.
- One touch: the headphones toggle flips the `blog-listen` preference anywhere
  (home or reader). When a story page binds with the preference on and the
  player is idle, it starts from the first sentence of the visible card inside
  the same gesture that opened the story — no second tap. Moving to another
  story re-anchors a playing queue to the new story; going home leaves the
  current story playing (no highlight, since the sentences are gone).
- Theme stays global in the shell and is untouched.

Files touched: `assets/app.js` (new), `assets/reader.js`, `assets/home.js`,
`scripts/sync.js` (script tags in `shell()`), `scripts/sync.test.js`,
`scripts/spa.test.js` (new), `scripts/reader.test.js` (persistence tests).

## Details

- `app.js` intercepts plain left-clicks on same-origin `a[href]` with no
  `target`/`download`/modifiers, excluding `#...`, `mailto:`, `tel:`,
  `javascript:` and different origins. External `story-source` links are
  skipped by origin check.
- Body class is swapped from the fetched document, then the incoming page init
  re-adds any transient class (e.g. `reader-fullscreen` on phones).
- `pageFor(main)` chooses the init: `.reader-deck` → reader, `.cover-feed` →
  home, otherwise none (e.g. the `tam-su` index).
- First load runs the init once from `app.js` on DOM ready.

## Non-goals

- No hash routing, no client-side templates from data, no service worker or
  offline mode, no change to the DB/audio generation pipeline.
- No audio for covers or titles; one touch means "arm/start listening", not
  "play a cover sound".

## Risks

- A page script that forgets the abort signal leaks listeners across swaps;
  the browser check navigates home → post → back and asserts one card advances
  per key press.
- The singleton player must not pause on `destroy()`; a unit test asserts the
  same `Audio` instance keeps playing after rebind.
- `fetch`/`DOMParser` need HTTP; the browser check serves over HTTP like
  `checks/listen.yaml`.
