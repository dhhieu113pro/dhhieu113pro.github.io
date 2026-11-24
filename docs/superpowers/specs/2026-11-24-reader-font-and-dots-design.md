# Reader font consistency and dots under the image — short design

## Intent

On termux.io.vn the story-card body text renders in Georgia serif while every
other surface (body, home feed, topic index) uses the system sans-serif stack.
The user reports that as an inconsistent content font. Separately, the card
navigation dots float at the bottom of the reader deck, over the text; the
user wants them directly under the card image.

## What is already right (do not change)

Warm paper tokens, 62ch measure, one sentence per block, swipe deck, theme
toggle, no-JS stack fallback, mini player, SPA shell. Only `assets/style.css`
needs to change.

## Approaches

- **Font — A (chosen):** remove the `.card-text { font-family: Georgia… }`
  override so content inherits `body`'s system sans-serif. One line; consistent
  with every other page. B (serif everywhere) would churn unrelated pages. C
  (web font) adds a network request and breaks local-first.
- **Dots — A (chosen):** keep the single shared `.reader-dots` overlay and
  move it from `bottom: 12px` to `top: calc(46% + …)`, i.e. the bottom edge of
  `.card-media` (flex-basis 46% of the card's inner height + 12px card padding).
  Drop the mini-player `bottom` override since the new position is independent
  of the fixed bar. B (per-card dots in flow) needs sync.js and reader.js
  changes and costs 24px of reading space per card. C (below deck) is not under
  the image.

## Details

- Dots keep their 24px targets, flex row, current-item colour and focus ring.
- Reduce the dots bar's vertical padding so it sits within the 24px top padding
  of `.card-body`, leaving the sentences themselves clear.
- No markup, generator, JS, or regenerated HTML changes; `assetVersion()` does
  not need a bump because only the stylesheet content changes and its `?v=`
  hash is computed from file contents at sync time — but if any generated HTML
  is regenerated it will pick up the new hash naturally.

## Non-goals

- No new font, no web font, no layout rewrite, no audio/SPA changes.

## Risks

- The 46% flex-basis is shared by all enhanced cards, so every card's image
  ends at the same y. Cards with no image use `.card-media:empty { display:
  none }`; the dots would then sit at 46% of an image-less card. All current
  stories have images; note as a minor limitation.
