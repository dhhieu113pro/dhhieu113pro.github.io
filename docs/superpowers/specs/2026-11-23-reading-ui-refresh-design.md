# Reading UI refresh — short design

## Intent

The SPA + persistent audio work made listening continuous, but the player has
no visible home: the only feedback is a highlighted sentence and a headphone
button. The request is a visible, real-app-style reading UI — a mini player
plus a UI refresh — using the editorial/paper references already researched.

## What is already right (do not change)

Warm paper tokens (`--bg: #fbfaf7`, `--fg: #24211d`, `--accent: #8a5a3b`),
full-screen swipe cover feed, swipeable card reader, 62ch measure, one sentence
per line, theme toggle, no-JS fallback. Replacing these would be churn and
would risk the things that make the site work on a phone.

## Approach picked

Three additive changes, one PR:

1. **Persistent mini player in the shell.** `scripts/sync.js` emits one
   `.mini-player` bar after `</main>` on every page. It shows the story title,
   sentence progress (`3 / 25`) with a thin fill, and a pause/play button
   (44 px, accessible label). Because it lives in the shell it survives SPA
   swaps. `assets/reader.js` owns it through the existing audio singleton:
   show on start, update on each sentence, hide on stop, keep visible in a
   paused state. Pausing keeps the `blog-listen` preference intact; stopping
   from the bar behaves like the headphone toggle.
2. **Serif reading type.** `.card-text` uses a system serif stack (Georgia /
   Times New Roman), no web font, no network request, so the reader reads like
   the E-Ink/editorial references while staying local-first.
3. **Editorial metadata label.** `.cover-meta` becomes a small uppercase,
   letter-spaced label above the cover title, matching the magazine pattern.

Files touched: `assets/reader.js`, `assets/style.css`, `scripts/sync.js`,
`scripts/sync.test.js`, `scripts/reader.test.js`, `checks/mini-player.yaml`
(new), regenerated HTML.

## Details

- `createListen` gains `miniPlayer` in its context, a `paused` flag, and
  `paintMini()`. `bind()` accepts `title` and re-points at the shell bar.
- The bar is `hidden` when idle. Its button toggles pause/resume without
  writing `blog-listen`; the headphone toggle still owns the preference.
- All new controls meet the existing 44 px target and have visible focus
  rings. Motion stays within the site's `prefers-reduced-motion` rules.
- No external fonts or dependencies.

## Non-goals

- No new palette, no new typography service, no redesigned cover feed layout.
- No rewrite of the swipe deck, theme system, or audio generation pipeline.

## Risks

- A fixed bottom bar can cover the last sentence or the next-story bar; the
  reader card body already carries 120 px of bottom padding, so verify on a
  360 px viewport before shipping.
- Progress must track sentence index, not card index; the unit tests pin it.
