# Online document catalog for termux.io.vn

Date: 2026-11-28

## Intent

The VieNeu Flutter app has an "Online" tab that currently shows local search
history. The user wants that tab to list the shared documents already published
on termux.io.vn (four stories, each with read-ready text split into sections and
one pre-generated mp3 per sentence), play them by streaming from the site, and
download them into the on-device library like ordinary offline documents.

The site needs a machine-readable catalog for the app to fetch. The site is a
GitHub Pages repo whose `scripts/sync.js` already reads every story from the
pwterm SQLite DB and knows each sentence's generated audio path.

## Goals

- Publish `https://termux.io.vn/catalog.json` with one entry per story.
- Each entry carries: stable id (slug), title, byline, date, cover image URL,
  source URL, and ordered sections. Each section carries its image URL and an
  ordered list of sentences; each sentence carries its text and a fully
  qualified audio URL.
- Only stories whose audio set is current are included (same `hasAudio` rule
  the post generator already uses).
- Generate the catalog from the same in-memory story list used for the HTML
  pages so it never drifts from what is published.

## Non-goals

- No new runtime dependency, API server, or authentication.
- No changes to the HTML reader, theme, or existing pages.
- No deletion or reordering of existing stories.

## Constraints

- Plain Node.js on Termux: `node --test scripts/*.test.js` must pass.
- Generated file is committed at the repo root; Pages serves it directly.
- Absolute URLs use the existing `SITE_URL` constant (`https://termux.io.vn`).
- Keep the existing `hasAudio` check single-sourced so a story missing audio is
  omitted from both the reader cards and the catalog.

## Approaches

1. **Hand-written static JSON.** Smallest one-off diff; drifts the moment a
   fifth story is published or a sentence is corrected. Rejected.
2. **Generate from `sync.js`.** The story list, sentence splitting and audio
   completeness check already exist there. One small builder function plus a
   `writeFileSync`, with unit tests against a temporary output dir. Chosen: no
   duplicated source of truth.
3. **Scrape the generated HTML from Flutter.** No site change, but couples the
   app to markup and breaks on any layout edit. Rejected.

## Design

- In `scripts/sync.js`, while iterating `stories`, produce a parallel catalog
  entry. Reuse `sentences(part.text)` and the same sentence index used for
  `data-audio` in the reader cards, so sentence `i` in the catalog matches
  sentence `i` in the HTML and mp3 `String(i).padStart(3, '0')`.
- Audio URL: `${SITE_URL}/assets/audio/${slug}/${index}.mp3`; image URL:
  existing `part.image` with its `../../` prefix stripped and `SITE_URL`
  prepended; cover likewise.
- Include a story only when `hasAudio` is true (same check as the post page).
- Write `catalog.json` with stable key order and two-space indentation.
- Tests: catalog exists, has four entries from the fixture DB, every sentence
  has a text and an absolute mp3 URL, section images are absolute, and a story
  without current audio is excluded.

## Builder's latitude

- Exact field names are the app contract and are fixed below; formatting and
  helper placement are the implementer's call.
- Catalog shape:

```json
{
  "version": 1,
  "documents": [
    {
      "id": "slug",
      "title": "...",
      "author": "...",
      "date": "21/11/2026",
      "cover": "https://termux.io.vn/assets/img/slug/2.jpeg",
      "source": "",
      "sections": [
        {
          "image": "https://termux.io.vn/assets/img/slug/3.jpeg",
          "sentences": [
            { "text": "...", "audio": "https://termux.io.vn/assets/audio/slug/000.mp3" }
          ]
        }
      ]
    }
  ]
}
```
