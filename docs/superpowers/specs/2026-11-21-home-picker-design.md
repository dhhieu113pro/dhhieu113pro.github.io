# Home picker design

## Intent

Turn the home page into a visual picker for posts: a grid of image tiles you tap to open a story. Remove the site header and footer from the home page only.

## Goals

- Home page is just a grid of post tiles; no `.site-header` or `.site-footer` markup.
- Two columns on phones, three to four on desktop.
- Each tile: cover image fills the tile, title overlaid at the bottom on a dark scrim, date shown small.
- Tapping a tile opens that post's card reader.
- Post pages and their reader UI are unchanged.

## Non-goals / anti-goals

- No multi-select, filtering, search, or pagination.
- No change to post detail markup or reader behavior.
- No frameworks, build step, or network requests.

## Constraints

- `scripts/sync.js` remains the only writer of HTML.
- Existing generated assets and the pwterm sync flow stay intact.
- Node built-in tests plus headless Chromium verification; no npm dependencies.

## Approaches

- **A (chosen): generator emits a grid + CSS tiles.** Add a `homePicker` mode to the shell that omits header/footer and tags `<body class="home-picker">`; emit one tile per story. One code path, no runtime JS.
- B: hide the header/footer with CSS only. Leaves dead markup in the DOM and keeps the old list structure — rejected.
- C: separate hand-written home page. Would drift from generated post data — rejected.

## Decisions

- Tiles use a 3:4 aspect ratio with `object-fit: cover`; the scrim is a bottom-up gradient so long titles stay readable.
- Tile links point to `posts/<slug>/` relative to the repo root.
- A story without a cover image still gets a tile with a visible title on a neutral background.
- Desktop grid: 3 columns from 720px, 4 columns from 1200px.

## What's left to the builder

- Exact gap/radius/typography within the existing theme tokens.
- Verify in Chromium at 390px (2 columns, no header/footer, no horizontal scroll) and 1280px (4 columns), plus a post page to confirm no regression.
