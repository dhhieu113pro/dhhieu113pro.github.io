# Listen Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader listen to a story — every sentence gets pre-generated audio (local `vieneu` CLI, voice matching the narrator's gender), the spoken sentence is highlighted, playback walks through the story, one tap starts it.

**Architecture:** A new `scripts/audio.js` synthesizes one MP3 per rendered sentence into `assets/audio/<slug>/` using the offline `vieneu` CLI + ffmpeg. `scripts/sync.js` links each `.sentence` to its MP3 via `data-audio`, but only when the audio hash matches the current sentence text (stale guard), and emits a headphones toggle button in both top bars. `assets/reader.js` drives playback: it already owns deck navigation and the `.sentence` markup. Voice/gender corrections live in `scripts/listen-overrides.json`.

**Tech Stack:** Node (v26, `node:sqlite`), the `vieneu` CLI (`~/vieneu-rs/target/release/vieneu`), `ffmpeg`/`ffprobe`, vanilla JS/CSS (no deps).

**Spec:** `docs/superpowers/specs/2026-11-21-listen-mode-design.md`

## Global Constraints

- `scripts/sync.js` is the only writer of HTML. It wipes `posts/` and `assets/img/` on every run and must **not** wipe `assets/audio/`.
- Sentence splitter is shared: `scripts/sync.js` exports it; `scripts/audio.js` and the tests import it, so the two scripts can never disagree on what a sentence is.
- Asset URLs carry `?v=<8-hex>` from `assetVersion()`; that function already hashes `style.css`, `reader.js`, `home.js`, `theme.js` — no new script tags, so no hash-set change needed.
- Gender rules run in a deterministic, test-pinned order; overrides file always wins over detection.
- `data-audio` is emitted only when the audio exists **and** matches the sentence hash. Stale audio → no `data-audio`, no headphones button, and `sync.js` prints a line naming the story.
- Male voice pack `duc_tri`, female `doan_trang` (gender values are `F`/`M` throughout); env fallbacks `ORT_DYLIB_PATH`/`SEA_G2P_LIB` default to `~/vieneu-rs/...` when unset; a missing binary fails `audio.js` fast with an actionable message.
- Phone number: `command -v ffmpeg` and `~/vieneu-rs/target/release/vieneu` both exist; ~8.7 s cold per sentence (verified), so a full 4-story rebuild is ~10–15 min. Rebuild for one story is fine.

## Review Focus

- **Audio never argues with the screen:** if the reader swipes/dots/keys to another card mid-playback, reading restarts from that card's first sentence — the highlighted sentence must always be on the visible card or the reader scrolls to it. Pinned in Task 6 by the navigation-mid-queue test.
- **Browser blocks sound without a gesture:** opening a story with the pref on must not attempt playback; the headphones tap is the only start, and every `play()` rejection stops cleanly (no stuck `.playing`). Pinned in Task 6 by the rejected-`play()` test.
- **A re-captured story must never highlight the wrong sentence:** `sync.js` refuses to link audio whose hash does not match the current text. Pinned in Task 4 by the mismatch test.
- **A sentence with a broken/missing MP3 must not stall the queue:** skipped, playback continues to the next sentence. Pinned in Task 6 by the bad-`data-audio` test.
- **The overrides file is the escape hatch, not the DB:** a wrong gender guess is fixed in `scripts/listen-overrides.json`, which survives pwterm re-crawls. Pinned in Task 2 by the override tests.

---
## Task 1: Share the sentence pipeline

**Files:**
- Modify: `scripts/sync.js` — export the part filter and sentence splitter, add the sentence-list hash helper.
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `sentences(text) -> string[]` — same split/trim/filter as today.
  - `storyParts(record) -> part[]` — `parts` filtered to `kind !== 'begin'`, kept for both scripts.
  - `sentenceTexts(record) -> string[]` — the rendered sentence strings, in render order, across the filtered parts (empty parts and blank sentences dropped).
  - `sentenceHash(record) -> string` — `crypto.createHash('sha1').update(sentenceTexts(record).join('\u0000')).digest('hex')`.

- [ ] **Step 1: Write the failing tests** in `scripts/sync.test.js` for the new helpers:
  - `storyParts` drops the `begin` part (the existing part filter already drops it — assert one `main` part stays, `begin` gone).
  - `sentenceTexts` splits `'Một. Hai.\nBa.'` across parts into `['Một.', 'Hai.', 'Ba.']` and drops blank lines.
  - `sentenceHash` is stable: same record twice → same hash; changing one sentence's text → different hash.
  - Existing sentence-splitting test still passes unchanged.

- [ ] **Step 2: Run the tests, verify the new ones fail** (not defined yet).

- [ ] **Step 3: Implement** — turn `sentences` into an export, add `storyParts`, `sentenceTexts`, `sentenceHash` as pure functions at module scope in `scripts/sync.js`, and have the `syncStories` body call the shared `storyParts`/`sentences` instead of its inline copies.

- [ ] **Step 4: Run `node --test scripts/sync.test.js`; all pass.**

- [ ] **Step 5: Commit** `feat: share sentence pipeline from sync`.

## Task 2: Gender detector

**Files:**
- Create: `scripts/gender.js` (pure, no DB/shell deps)
- Create: `scripts/listen-overrides.json` (starts as an empty object `{}`)
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: `storyParts`/`sentenceTexts` from Task 1, an overrides object.
- Produces: `detectGender(record, overrides) -> { gender: 'F'|'M', voice: string, source: 'override'|'rule' }` — `F` = female narrator, `M` = male.

**Detection rules (first match wins), over the joined text of `storyParts(record)`:**

> **Boundary trap:** JavaScript's `\b` only knows ASCII word characters, so
> `\bvợ\b`, `\bphụ nữ\b`, `\bđàn ông\b` and `\bbạn trai\b` never match anything
> (verified: they counted `vợ` as 0 in a story that says it 3 times). Every
> pattern below uses a `u`-flagged `\p{L}` lookaround instead of `\b`. Word
> matching helper: `new RegExp('(?:^|[^\\p{L}])' + word + '(?![\\p{L}])', 'giu')`.

```text
1. self — /(?:^|[^\p{L}])(?:tôi|mình)\s+(?:được\s+|đang\s+)?(?:là\s+)?(?:người\s+)?(phụ nữ|đàn ông|con gái|con trai)(?![\p{L}])/iu
   captured noun: 'phụ nữ'|'con gái' -> F, 'đàn ông'|'con trai' -> M
2. spouse count (over the whole text) — count 'chồng' and 'vợ' as whole words;
   higher count wins: chồng -> F, vợ -> M. Tie -> fall through.
3. partner — whole word 'bạn gái' -> M, 'bạn trai' -> F.
4. else -> M.
```

`voice = overrides.<slug>.voice ?? (gender === 'F' ? 'doan_trang' : 'duc_tri')`.

Verified on the four real stories: F, M, M, F.

- [ ] **Step 1: Write the failing tests** in `scripts/sync.test.js`:
  - female self-description: `'Tôi là người phụ nữ đã trải qua một lần đò.'` → `F`, `doan_trang`.
  - husband → F: `'Mỗi ngày về nhà tôi không dám than thở với chồng.'` → `F`.
  - wife → M: `'Sau đám cưới, vợ tôi trao cho tôi một khoản tiền.'` → `M`, `duc_tri`.
  - partner: `'Tôi có bạn gái.'` → `M`; `'Tôi có bạn trai.'` → `F`.
  - default M: `'Tôi làm nhân viên kinh doanh.'` → `M`.
  - **`'Tôi từng yêu một cô gái hơn hai năm.'` → `M` (default).** `cô gái` is the partner, never the narrator — there is deliberately no rule for it, and this case pins that we do not add one.
  - spouse-count tie falls through: a text with equal `chồng`/`vợ` counts and no other marker → `M` (default).
  - override wins over detection: `{ 'a-story': { gender: 'F' } }` forces F even on a male-sounding text.
  - voice override wins: `{ 'a-story': { voice: 'kim_thanh' } }` → voice `kim_thanh`, gender still detected.
  - The four real excerpts: `'Tôi là người phụ nữ đã trải qua một lần đò, không có hạnh phúc vì chồng ham chơi lười làm.'` → `F`; `'Tôi là con trai duy nhất, chị gái đã lấy chồng, kinh tế cũng vất vả.'` → `M`; `'Tôi 35 tuổi, đã có bạn gái.'` → `M`; `'Tôi mới kết hôn chưa đầy sáu tháng mà mỗi ngày về nhà là cảm thấy nặng nề trong lòng, không dám than thở với chồng.'` → `F`.

- [ ] **Step 2: Run, verify the new tests fail** (`scripts/gender.js` not created).

- [ ] **Step 3: Implement** `scripts/gender.js` per the rules above, reading overrides from the parsed `listen-overrides.json`; add `module.exports`.

- [ ] **Step 4: Run `node --test scripts/sync.test.js`; all pass.**

- [ ] **Step 5: Commit** `feat: narrator gender detection with overrides`.

## Task 3: `audio.js` generation script

**Files:**
- Create: `scripts/audio.js`
- Create: `scripts/audio.test.js` (no real synthesis — uses fixtures + a fake CLI/ffmpeg)
- Modify: `scripts/fixtures/make-db.js` only if needed for a shared fixture (prefer reusing the existing `makeFixture`).

**Interfaces:**
- Consumes: `storyParts`, `sentenceTexts`, `sentenceHash` (Task 1), `detectGender` (Task 2), overrides file (Task 2).
- Produces: `assets/audio/<slug>/000.mp3…` + `assets/audio/<slug>/.text` (the sha1). A `main`/`run({ dbPath, outDir, modelsRoot, cli, ffmpeg })` that can be called with injected binaries for tests.

**Behavior:**
- Same DB read + story iteration as `syncStories` (slug/`record`/`parts`/`source` filter).
- For each story, compute `sentenceTexts`, `hash = sentenceHash`. If `assets/audio/<slug>/.text` equals `hash`, skip the story entirely (all MP3s are current).
- Else: clear `assets/audio/<slug>/`, mkdir, and for each sentence `i` run
  `vieneu --text "<s>" --voice <voice> --out <tmp> --models <modelsRoot>` then
  `ffmpeg -y -i <tmp> -ar 24000 -ac 1 -b:a 64k <dest>/<NNN>.mp3`.
  Write `/.text` with the hash only after every sentence succeeded; on any
  failure leave the dir incomplete (no `.text`), print `story <slug> sentence <i> failed: <err>`, and set a non-zero exit at the end.
- `ORT_DYLIB_PATH`/`SEA_G2P_LIB`: use `process.env` if set, else default to `~/vieneu-rs/third_party/...`; exit non-zero with a message if the `vieneu` binary or ffmpeg is missing.
- Print a summary line per story: `slug: N sentences, gender=..., voice=..., secs=...`.

- [ ] **Step 1: Write the failing tests** in `scripts/audio.test.js` using the existing `makeFixture` DB and a fake `cli`/`ffmpeg` (functions that record calls and return success):
  - fresh story → fake CLI called once per sentence with the right `--voice`, and `/.text` written with the hash.
  - re-run when `.text` matches → fake CLI called zero times (incremental skip).
  - changed sentence text → old dir cleared (assert the previous fake-produced file is gone) and regenerated.
  - one failing sentence → `.text` absent, exit non-zero, and a message names the slug and sentence index.
  - missing binary → non-zero exit with an actionable message.
  - override voice → fake CLI receives the overridden pack.

- [ ] **Step 2: Run, verify the new tests fail** (`scripts/audio.js` not created).

- [ ] **Step 3: Implement** `scripts/audio.js` per the behavior above. Use `child_process.execFileSync`/`spawnSync` for the CLI and ffmpeg. Guard every `--text` arg so a `"` or `$` in Vietnamese text cannot break the command line (pass text via a temp file or `execFileSync` with an args array — prefer the args array + a temp text file since a sentence can contain `"`).

- [ ] **Step 4: Run `node --test scripts/audio.test.js` and `node --test scripts/sync.test.js`; all pass.**

- [ ] **Step 5: Commit** `feat: per-sentence TTS generation (audio.js)`.

## Task 4: Stale-audio guard in `sync.js`

**Files:**
- Modify: `scripts/sync.js` — sentence spans gain `data-audio`; headphones toggle markup; story top-bar wiring.
- Test: `scripts/sync.test.js`

**Interfaces:**
- Consumes: `sentenceHash`, `storyParts`, `sentences` (Task 1); `assets/audio/<slug>/` from Task 3.
- Produces: `listenToggle() -> string` (44 px headphones button, class `listen-toggle`, `aria-label="Chế độ: Nghe"`, an inline SVG `aria-hidden`); the story body gains the toggle in the top bar only when the story has at least one `data-audio` sentence; `data-audio` values use the post-relative prefix `../../assets/audio/<slug>/<NNN>.mp3`.

**Behavior:**
- `data-audio` is added to a sentence span only when `assets/audio/<slug>/.text` exists and equals `sentenceHash(record)`.
- When the story has audio, the reader top bar renders `${listenToggle()}\n${toggle}`; when it does not, just `${toggle}`.
- The home top bar always renders `${listenToggle()}\n${toggle}`.
- If a story has stale/no audio, print `sync: <slug> has no current audio — run node scripts/audio.js` (to stderr is fine).

- [ ] **Step 1: Write the failing tests** in `scripts/sync.test.js`:
  - with current audio: a sentence span has `data-audio="../../assets/audio/a-story/000.mp3"`, and the top bar contains a `.listen-toggle`.
  - with stale/no audio (no `.text`, or a mismatched hash): the span has **no** `data-audio`, the top bar has **no** `.listen-toggle`, and a line naming the slug is printed.
  - home page always has one `.listen-toggle`.
  - `data-audio` uses the post-relative `../../` prefix (matches how images are emitted).

- [ ] **Step 2: Run, verify the new tests fail.**

- [ ] **Step 3: Implement** — add `listenToggle()`, compute each story's audio state from `assets/audio/<slug>/.text` vs `sentenceHash`, and thread `hasAudio` into the two top bars. Keep the wipe rules unchanged (`posts/`, `assets/img/` only).

- [ ] **Step 4: Run `node --test scripts/sync.test.js`; all pass.**

- [ ] **Step 5: Commit** `feat: link audio with a stale guard in sync`.

## Task 5: Home-page toggle state

**Files:**
- Modify: `assets/home.js`

**Interfaces:**
- Consumes: the `.listen-toggle` button emitted in Task 4 on the home page.
- Produces: on the home page, clicking `.listen-toggle` flips `localStorage['blog-listen']` between `'1'` and absent. The button's pressed state is reflected via `aria-pressed` and a `listen-on` class. This task has no unit test — `home.js` is DOM-bound with no harness; the browser proof lands in Task 8's pwterm run, where the home assertions are added.

- [ ] **Step 1: Implement** in `assets/home.js`: a small closure that reads `localStorage['blog-listen']`, syncs `aria-pressed`/`listen-on` on load and on click (try/catch around storage), independent of playback (the home page has no sentences to play).

- [ ] **Step 2: Commit** `feat: home listen toggle persists`.

## Task 6: Playback engine in `reader.js`

**Files:**
- Modify: `assets/reader.js`
- Test: `scripts/reader.test.js` (new hand-rolled DOM harness; no new dependency)

**Interfaces:**
- Consumes: `.sentence[data-audio]` spans + `.listen-toggle` (Task 4); the deck's existing `goTo`, `getIndex`, `cards`, `render` internals (already in `setup`).
- Produces: `startListen()`, `stopListen()`, `toggleListen()`; a `.playing` class on the current sentence; the "preference on = ready but paused" state.
- State: `localStorage['blog-listen']` — `'1'` on, absent off (same key as Task 5).

**Behavior:**
- On load, if the preference is `'1'`, set `aria-pressed`/`listen-on` on the toggle but do **not** attempt playback (iOS blocks gesture-less audio).
- Toggle click: if playing → `stopListen`; else → `startListen`.
- `startListen`: build the queue from `[...document.querySelectorAll('.sentence[data-audio]')]`; begin at the first sentence of the card `getIndex()` points at; hide the toggle's pressed state; `playFrom(queueIndex)`.
- `playFrom(i)`: if `i >= queue.length` → `stopListen` and return. Set `.playing` on `queue[i]`; if that sentence is not on the visible card, call `goTo` to its card. Scroll the sentence to the middle of its card body (`behavior: auto` when `prefers-reduced-motion`, else `smooth`). Set `audio.src = queue[i].dataset.audio`, `audio.play()`; `.then(() => on ended advance)`, `.catch(() => skip to next)`.
- `ended` handler: clear `.playing`, advance `i+1`, `playFrom`.
- `stopListen`: pause, clear `audio.src`, remove all `.playing`, clear `aria-pressed` pressed.
- Manual navigation (swipe pointerup, dot click, arrow key — the existing `goTo` call sites): while listening, call `playFrom` targeting the newly-shown card's first sentence.
- Missing/broken file (`error` event or a rejected `play()`): skip that sentence and continue.
- Reuse one `Audio` element; a second hidden one prefetches the next src to cut gaps.

- [ ] **Step 1: Write the failing unit-ish tests** — `reader.js` is DOM-bound and has no current unit harness; instead pin behavior with small tests that exercise `startListen`/`stopListen` against a minimal fake DOM (jsdom not installed — build a hand-rolled minimal harness inside the test file that stubs `document.querySelectorAll`, a fake `Audio`, and the deck's `goTo`). Assert:
  - start → first visible-card sentence gets `.playing`, `Audio.play` called.
  - ended → `.playing` moves to the next sentence.
  - navigation mid-queue → restarts from the new card's first sentence.
  - `play()` rejection → no stuck `.playing`, advances to next.
  - missing file (`error`) → skipped, continues.
  - end of queue → `stopListen`, all `.playing` cleared.
  - toggle with pref on at load → no `play()` call until the user taps.

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** the behavior above inside `reader.js` (it runs `setup` per deck; attach the listen logic in the same closure or a module-level controller keyed on the active deck).
- [ ] **Step 4: Run the reader tests; pass.**
- [ ] **Step 5: Commit** `feat: sentence-by-sentence playback in reader`.

## Task 7: Styling and desktop visibility

**Files:**
- Modify: `assets/style.css`

**Interfaces:**
- Consumes: `.sentence.playing`, `.listen-toggle`, `.listen-on` class names from Tasks 4–6.

**Behavior:**
- `.listen-toggle` mirrors the `.theme-toggle` block (44 px circle, transparent, `touch-action: manipulation`), and `.listen-on`/`[aria-pressed="true"]` shows a filled/accent state.
- `.sentence.playing` gets `background: rgba(127,127,127,.16); border-left: 3px solid var(--accent);` — visible in light and dark themes; `.sentence` keeps `display: block`.
- Desktop: edit the `@media (min-width: 720px)` rule so `.reader-topbar > :not(.theme-toggle)` becomes `.reader-topbar > :not(.theme-toggle):not(.listen-toggle)` — the headphones button stays reachable on desktop. The home top bar needs no media change (it already shows buttons).
- No `@keyframes`, no shimmer reuse.

- [ ] **Step 1: Implement** the CSS additions and the one media-rule change.

- [ ] **Step 2: Run `node --test scripts/sync.test.js scripts/audio.test.js scripts/reader.test.js`; all pass.** (The visual proof lands in Task 8's pwterm run.)

- [ ] **Step 3: Commit** `feat: listen-mode styling + desktop visibility`.

## Task 8: End-to-end and real synthesis

**Files:**
- Create/update: a pwterm browser-check flow file (the project's `reader-check`-style yaml, run from the clean HEAD checkout of `~/pwterm` per the project's convention).

**Behavior:** The last task proves the whole thing on the real phone.

- [ ] **Step 1: Run `node scripts/audio.js`** against the real DB (this is the 10–15 min full rebuild). Verify non-zero sentence counts, `gender=`/`voice=` lines look right, and `assets/audio/<slug>/*.mp3` + `.text` exist with no failures.
- [ ] **Step 2: Run `node scripts/sync.js`** — confirm `data-audio` spans and `.listen-toggle` buttons are in the regenerated HTML mirroring the fixture expectations.
- [ ] **Step 3: Run the full pwterm flow** (theme toggle + listen-mode assertions) against the regenerated `index.html` and a post page — phone and desktop widths — to confirm: the home toggle persists `localStorage['blog-listen']` across reload; on a post page the headphones tap starts playback, the spoken sentence shows `.playing` (gray bg + accent border) and scrolls to view; swiping to another card restarts reading from that card; the button is visible at both widths.
- [ ] **Step 4: Run the full `node --test scripts/sync.test.js` + `scripts/audio.test.js`**; all pass.
- [ ] **Step 5: `git add -A && git commit`** the generated `assets/audio/` + regenerated `posts/`/`index.html` + all source, with a message like `feat: listen mode`. **Do not push** — leave that to the human partner's publish step.