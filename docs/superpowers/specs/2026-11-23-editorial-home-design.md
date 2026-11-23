# Editorial cover grid home — short design

## Intent

The home page is currently a full-screen, one-cover-per-viewport swipe feed.
The reader wants the "editorial grid of covers" alternative discussed: a
browsable magazine-style wall of stories instead of a single full-bleed cover.

## Approach picked

Keep the generated markup and class names (`cover-feed`, `cover-slide`,
`cover-read`, …) unchanged and change the presentation + page behaviour:

1. `assets/style.css`: `.cover-feed` becomes a responsive CSS grid
   (1 column on phones, 2 from ~600 px, 3 from ~1000 px); each `.cover-slide`
   is a paper card with a 4:3 cover image, title, uppercase byline and a pill
   "Đọc ngay" CTA. The dark image shade and full-screen scroll-snap rules are
   removed; `.feed-topbar` becomes a normal paper header instead of white text
   floating over an image.
2. `assets/home.js`: drop the IntersectionObserver/arrow-key/"next" swipe
   machinery; show the story total in `.feed-count`, hide `.feed-next`, keep
   the headphone toggle and image skeletons. Do not add `feed-ready`, so the
   old full-screen CSS never applies.
3. No change to `scripts/sync.js` output or generated HTML files.

## Why this approach

The markup, tests and browser checks already key off those class names, and
the site is generated from a DB whose live copy contains an unpublished story.
Rewriting the generator would risk unrelated content and churn. CSS + a small
home.js simplification gives a visibly different template with a tiny diff.

## Non-goals

- No change to the reader, mini player, theme, audio or SPA router.
- No new dependency, font or framework; no palette rewrite.

## Risks

- Old `.feed-ready` CSS must not linger and fight the grid — remove that block.
- The mini-player browser check probes `.feed-next` position; with the button
  hidden its rectangle is zero, which still satisfies the no-overlap assertion.
