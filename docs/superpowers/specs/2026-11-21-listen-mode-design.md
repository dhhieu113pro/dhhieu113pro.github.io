# Listen mode design

## Intent

Let a reader listen to a story instead of reading it: every sentence gets its
own pre-generated audio, the sentence being spoken is visually highlighted,
and playback walks through the whole story on its own. The voice matches the
narrator's gender, detected when the audio is generated.

## Goals

- `node scripts/audio.js` writes `assets/audio/<slug>/<NNN>.mp3` — one file
  per rendered sentence — using the local `vieneu` CLI (offline, no cloud).
- Narrator gender is detected from the story text and picks a male or female
  voice pack; a record field overrides the detection.
- `scripts/sync.js` puts `data-audio` on each `.sentence` and a headphones
  toggle button in both top bars (home feed and reader).
- The reader plays the queue in order, highlights the current sentence
  (border + gray background), switches card and scrolls to it, and stops at
  the last sentence.
- The toggle is remembered in `localStorage` and works on home and detail.
- Tests cover the markup and the gender detector.

## Non-goals

- No synthesis in the browser, no local HTTP server needed at read time.
- No word-level karaoke timing — sentence level only.
- No audio for titles, covers or the home feed.
- No UI for choosing a voice; no settings screen.
- No changes to `~/pwterm` (it holds unrelated uncommitted WIP).

## Constraints

- `scripts/sync.js` is the only writer of HTML. It wipes `posts/` and
  `assets/img/` on every run — it must **not** wipe `assets/audio/`.
- Each story page shows one card at a time; the card body scrolls inside
  itself and non-active cards are `inert`. The player has to drive the
  existing deck navigation, not fight it.
- Top-bar buttons follow the existing 44 px `.theme-toggle` pattern, and
  `assets/theme.js` shows how localStorage access is wrapped in try/catch.
- Asset URLs carry the content-hash `?v=` bust; any JS/CSS file the change
  touches joins the `assetVersion()` hash set.
- Build machine is this phone: `~/vieneu-rs/target/release/vieneu` (exists),
  voice packs in `~/vieneu-rs/models/voices/`, `ffmpeg` on PATH,
  `ORT_DYLIB_PATH` and `SEA_G2P_LIB` env vars per the vieneu README.
- ~40 sentences per story; a wrong `data-audio` alignment would highlight the
  wrong sentence, so audio must be regenerated whenever sentence text changes.

## Approaches

**Where the audio comes from** (the decision the partner made):

- **A (chosen): pre-generate MP3 files at build time.** Works on GitHub
  Pages, on any device, offline, no server running. Cost: ~1–2 MB per story
  in the repo and a few minutes of phone CPU per crawl.
- B: generate on demand from a local `vieneu-http` server. Tiny repo, but
  audio only works while the server runs and first play waits on synthesis —
  rejected.
- C: browser built-in `speechSynthesis`. No files, but it ignores vieneu
  voices and gives no gender control — rejected.

**How gender is detected**:

- **A (chosen): ordered rules over the story text, with an override field.**
  Tests pin it against known stories; a wrong guess is a one-field fix.
- B: byline name list only. Vietnamese names are ambiguous without a
  database — rejected as the sole signal, kept out entirely for now.
- C: ask the human to pick per story. No detection, which is what the
  request asked for — rejected.

**Where the player lives**:

- **A (chosen): inside `assets/reader.js`.** It already owns deck navigation
  (`goTo`) and the sentence markup; a separate file would need that API
  exposed for no gain. `assets/home.js` handles only the home toggle.
- B: new `assets/listen.js` on both pages — extra script tag, extra hash
  wiring, and a cross-file API for navigation — rejected.

## Decisions

**Generation (`scripts/audio.js`, new)**

- Reads the same database and uses the same part filter and sentence
  splitter as `sync.js`; those helpers are exported from `sync.js` so the
  two can never disagree about what a sentence is.
- Flat 3-digit index across the story's rendered sentences, in render order:
  `assets/audio/<slug>/000.mp3`, `001`, …
- Per story, a `assets/audio/<slug>/.text` file holds a sha1 of the joined
  sentence texts. Missing or mismatched → the directory is cleared and the
  story is regenerated. Existing matching MP3s are skipped, so the command is
  incremental and safe to re-run.
- One sentence = one `vieneu --text … --voice <pack> --models … --out tmp.wav`
  call, then `ffmpeg -i tmp.wav -ar 24000 -ac 1 -b:a 64k out.mp3`.
  Synthesis failures are reported with the sentence index and do not silently
  produce a hole in the queue.
- `ORT_DYLIB_PATH` / `SEA_G2P_LIB` come from the environment, falling back to
  the README's default paths under `~/vieneu-rs/`; missing values fail fast
  with an actionable message.
- Exit code is non-zero if any sentence failed, so a bad run is visible.

**Voice and gender**

- Male narrator → voice pack `duc_tri`, female → `doan_trang` (both are
  "story reading" style packs that exist in `models/voices/`).
- `record.voice` (a pack directory name) overrides everything;
  `record.gender` (`male`/`female`) overrides the detection.
- Detection, first match wins:
  1. explicit self-description — `tôi|mình … là (người )?(phụ nữ|đàn ông|con gái|con trai)`;
  2. narrator's spouse — `chồng tôi` / `vợ tôi` / `có vợ|chồng` /
     `đi lấy chồng|vợ` / `vợ chồng tôi` (husband → female, wife → male);
  3. partner nouns — `bạn gái` → male, `bạn trai` → female;
  4. otherwise male (the catalog default), and the guess is printed so it
     can be corrected.
- A golden test holds four real excerpts with their expected gender
  (female, male, male, female) so detector edits cannot silently regress.

**Markup (`scripts/sync.js`)**

- Each rendered `<span class="sentence">` gets
  `data-audio="<prefix>assets/audio/<slug>/<NNN>.mp3">` only when that file
  exists, so an un-generated story simply has nothing to play.
- A `listenToggle()` helper (mirroring `themeToggle()`) emits a 44 px
  headphones button: on the reader top bar only when the story has at least
  one sentence with audio, on the home top bar always.
- `reader.js` and `home.js` already join the `assetVersion()` hash set; no
  new script tag is added.

**Playback (`assets/reader.js`)**

- Queue = every `.sentence[data-audio]` in DOM order.
- Toggle on → play from the first sentence of the card currently shown.
  Toggle off → stop, clear the highlight, keep the preference.
- One reusable `Audio` element (src swapped between sentences) so the
  browser's user-gesture allowance carries through; a hidden second element
  prefetches the next file to avoid a gap.
- On `ended`: clear the old highlight, and for the next sentence — call the
  deck's `goTo` if it lives on another card, scroll it to the middle of its
  card body (`behavior: auto` under `prefers-reduced-motion`), add
  `.playing`, play.
- Manual navigation while playing (swipe, dot, arrow key) re-anchors: reading
  restarts from the first sentence of the card the reader just moved to, so
  the audio never argues with what is on screen.
- End of queue → stop and clear the highlight; the mode stays on for the
  next story.
- Missing/broken file → skip that sentence rather than stall the queue.

**Highlight style (`assets/style.css`)**

- `.sentence.playing` gets a translucent gray background plus a left accent
  border (`rgba(127,127,127,.16)` + `var(--accent)`), which reads in both
  light and dark themes. `.sentence` stays `display: block`.

**State**

- `localStorage['blog-listen'] = '1'` when on, absent when off, read inside
  try/catch. Each page reads it on load; home only flips the preference,
  detail flips it and starts/stops playback. Default: off.

## What's left to the builder

- Exact headphone SVG and final `.playing` colors/offsets.
- Tuning the gender rule list if a future story is guessed wrong (the
  override field is the escape hatch).
- Prefetch and scroll-centering details, and whether the prefetch element is
  worth keeping once real playback shows the gap.
- Bitrate/size tuning if the repo growth is objectionable.
- Real-device verification with pwterm's browser check after the change.
