# Online Document Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution per session rules). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `/catalog.json` on termux.io.vn describing the shared stories, their sections, sentence text and per-sentence audio URLs.

**Architecture:** Extend the existing `sync.js` generation pass. While it already builds each story and checks audio completeness, emit a parallel catalog entry using the same sentence index, then write a static JSON file served directly by Pages. No new runtime code.

**Tech Stack:** Node.js built-ins (`node:sqlite`, `node:test`), existing `scripts/sync.js`.

**Spec:** `docs/superpowers/specs/2026-11-28-online-catalog-design.md`

## Global Constraints

- Tests: `node --test scripts/*.test.js` — all tests must pass.
- No new dependency. No lint/type-check script exists in this repo.
- `SITE_URL` is `https://termux.io.vn`; all emitted URLs are absolute.
- A story is included only when its audio set is current (same `hasAudio` rule as the post page).
- Sentence `i` in the catalog must match mp3 `${String(i).padStart(3, '0')}.mp3` and the `i`th `.sentence` in the HTML.

## Review Focus

- A story missing or stale audio must not appear in the catalog (it must not advertise a 404). Test: `setupAudio({ mp3s: false })` + assert the story is absent from catalog documents.
- A sentence with characters needing escaping (`&`, quotes, Vietnamese diacritics) must be valid JSON text, not HTML entities. Test: catalog JSON parsed with `JSON.parse` equals the raw sentence text.
- Image URL prefixes in the DB (`../../assets/img/...`) must not leak into the catalog. Test: every `cover`/`image` starts with `https://termux.io.vn/`.
- A slug rejected by `SLUG_RE` must not produce a catalog entry. Test: existing traversal fixture + catalog assertion.
- Real catalog must have four documents with absolute mp3 URLs. Test: a committed-file test in `scripts/catalog.test.js`.

---

### Task 1: Catalog generation in `sync.js`

**Files:**
- Modify: `scripts/sync.js`
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: `stories` list built in `syncStories` (each `{slug, hash, title, byline, lead, source, date, cover, parts}`), `sentences()`, `hasAudio`, `SITE_URL`.
- Produces: `catalog.json` at `outDir` with `{version: 1, documents: [...]}`; each document `{id, title, author, date, cover, source, sections}`; each section `{image, sentences}`; each sentence `{text, audio}`.

- [ ] **Step 1: Write failing tests** in `scripts/sync.test.js`:

```js
const { setupAudio } = /* existing helper at line ~518 */;
test('sync writes a catalog with absolute audio and image URLs', () => {
  const { outDir } = setupAudio(); // audio fixture: first part text 'Mở đầu', second 'Một. Hai.'
  const catalog = JSON.parse(fs.readFileSync(path.join(outDir, 'catalog.json'), 'utf8'));
  assert.equal(catalog.version, 1);
  assert.equal(catalog.documents.length, 1);
  const doc = catalog.documents[0];
  assert.equal(doc.id, 'a-story');
  assert.match(doc.cover, /^https:\/\/termux\.io\.vn\/assets\/img\//);
  assert.equal(doc.sections.length, 2);
  assert.deepEqual(doc.sections[0].sentences.map((s) => s.text), ['Mở đầu']);
  assert.match(doc.sections[0].sentences[0].audio, /^https:\/\/termux\.io\.vn\/assets\/audio\/a-story\/000\.mp3$/);
  assert.deepEqual(doc.sections[1].sentences.map((s) => s.text), ['Một.', 'Hai.']);
  assert.match(doc.sections[1].sentences[1].audio, /^https:\/\/termux\.io\.vn\/assets\/audio\/a-story\/001\.mp3$/);
});
```

Also add: `sync omits stories without current audio from the catalog` using `setupAudio({ mp3s: false })`; and `catalog sentences keep raw text` using `story()` with `parts[1].text = 'a & b'` then asserting `JSON.parse(...).documents[0].sections[1].sentences[0].text === 'a & b'`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test scripts/sync.test.js`
Expected: FAIL — `catalog.json` missing.

- [ ] **Step 3: Implement the catalog writer**

In `scripts/sync.js`, inside the story loop, build a `catalogDocuments` array in the same order as `stories`. For a story with `hasAudio`, map its `parts` to sections; for each part, map `sentences(part.text)` to `{text: line, audio: ${SITE_URL}/assets/audio/${slug}/${String(idx++).padStart(3, '0')}.mp3}` where `idx` continues across parts exactly as the HTML loop's `sentenceIndex`. Strip `../../` from `part.image`/`cover` before prefixing `SITE_URL`. After the loop, write `path.join(outDir, 'catalog.json')` with `JSON.stringify({version: 1, documents: catalogDocuments}, null, 2) + '\n'`.

- [ ] **Step 4: Run tests**

Run: `node --test scripts/sync.test.js`
Expected: PASS (all sync tests including the new ones).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync.js scripts/sync.test.js
git commit -m "feat(sync): generate online document catalog JSON"
```

---

### Task 2: Publish the generated catalog

**Files:**
- Create: `catalog.json` (generated)
- Test: `scripts/catalog.test.js`

**Interfaces:**
- Consumes: the real DB at `~/.pwterm/stories/stories.sqlite`.
- Produces: committed `catalog.json` served at `https://termux.io.vn/catalog.json`.

- [ ] **Step 1: Write the failing committed-file test**

```js
test('published catalog has four documents with absolute mp3 URLs', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog.json'), 'utf8'));
  assert.equal(catalog.version, 1);
  assert.equal(catalog.documents.length, 4);
  for (const doc of catalog.documents) {
    assert.ok(doc.id);
    for (const section of doc.sections) {
      for (const sentence of section.sentences) {
        assert.ok(sentence.text);
        assert.match(sentence.audio, /^https:\/\/termux\.io\.vn\/assets\/audio\//);
      }
    }
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/catalog.test.js`
Expected: FAIL — file missing.

- [ ] **Step 3: Generate the catalog**

Run: `node scripts/sync.js` from the repo root (uses the real DB and rewrites generated pages; verify `git status` shows only `catalog.json` plus intended generated-file changes — if generated HTML churns, revert those HTML edits and keep only `catalog.json`).

- [ ] **Step 4: Run all tests**

Run: `node --test scripts/*.test.js`
Expected: PASS, including the new committed-catalog test.

- [ ] **Step 5: Commit**

```bash
git add catalog.json scripts/catalog.test.js
git commit -m "feat: publish catalog.json with four shared documents"
```
