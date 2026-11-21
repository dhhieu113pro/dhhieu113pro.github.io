'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { sentenceTexts, sentenceHash } = require('./sync');
const { detectGender } = require('./gender');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_DB = path.join(os.homedir(), '.pwterm', 'stories', 'stories.sqlite');
const DEFAULT_OUT = path.resolve(__dirname, '..');
const DEFAULT_MODELS = path.join(os.homedir(), 'vieneu-rs', 'models');
const DEFAULT_CLI = path.join(os.homedir(), 'vieneu-rs', 'target', 'release', 'vieneu');

function environment() {
  return {
    ...process.env,
    ORT_DYLIB_PATH: process.env.ORT_DYLIB_PATH || path.join(os.homedir(), 'vieneu-rs', 'third_party', 'onnxruntime-android', 'jni', 'arm64-v8a', 'libonnxruntime.so'),
    SEA_G2P_LIB: process.env.SEA_G2P_LIB || path.join(os.homedir(), 'vieneu-rs', 'third_party', 'sea-g2p', 'target', 'release', 'libsea_g2p_rs.so'),
    // The CLI resolves this dict path relative to CWD, so it must be absolute.
    SEA_G2P_BIN: process.env.SEA_G2P_BIN || path.join(os.homedir(), 'vieneu-rs', 'third_party', 'sea-g2p', 'python', 'sea_g2p', 'sea_g2p.bin'),
  };
}

function speechPieces(text, cap = 100) {
  const pieces = [];
  let current = '';
  const push = () => { if (current) { pieces.push(current); current = ''; } };
  for (const clause of String(text).split(/(?<=[,;:])\s+/)) {
    const parts = clause.length > cap ? splitWords(clause, cap) : [clause];
    for (const part of parts) {
      if (current && current.length + 1 + part.length > cap) push();
      current = current ? `${current} ${part}` : part;
    }
  }
  push();
  return pieces;
}

function splitWords(text, cap) {
  const out = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (current && current.length + 1 + word.length > cap) { out.push(current); current = word; }
    else current = current ? `${current} ${word}` : word;
  }
  if (current) out.push(current);
  // Hard-split any piece still over the cap (e.g. one unbroken token) so no
  // single piece can exceed the CLI's single-chunk ceiling.
  return out.flatMap((piece) =>
    piece.length > cap ? piece.match(new RegExp(`.{1,${cap}}`, 'g')) : [piece]
  );
}

function run({ dbPath = DEFAULT_DB, outDir = DEFAULT_OUT, modelsRoot = DEFAULT_MODELS, cli, ffmpeg, cliPath = DEFAULT_CLI, ffmpegPath = 'ffmpeg', overrides = {}, log = console.log, error = console.error } = {}) {
  const env = environment();
  if (!cli) {
    if (!fs.existsSync(cliPath)) {
      error(`vieneu binary not found: ${cliPath} (build it with cargo build --release -p vieneu-cli)`);
      return { failed: 1, stories: 0 };
    }
    const probe = spawnSync(ffmpegPath, ['-version'], { stdio: 'ignore' });
    if (probe.error) {
      error(`ffmpeg not found: ${ffmpegPath} (install it with pkg install ffmpeg)`);
      return { failed: 1, stories: 0 };
    }
  }
  if (!fs.existsSync(dbPath)) {
    error(`database not found: ${dbPath}`);
    return { failed: 1, stories: 0 };
  }

  const exec = (tool, args) => {
    if (tool) return tool(args);
    const result = spawnSync(cliPath, args, { env, stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || `exit ${result.status}`);
  };
  const execFfmpeg = (tool, args) => {
    if (tool) return tool(args);
    const result = spawnSync(ffmpegPath, args, { stdio: 'ignore' });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || `exit ${result.status}`);
  };

  const db = new DatabaseSync(dbPath, { readOnly: true });
  let rows = [];
  try {
    rows = db.prepare('SELECT slug, record, created_at FROM stories ORDER BY created_at DESC').all();
  } finally {
    db.close();
  }

  let failed = 0;
  let stories = 0;
  for (const row of rows) {
    let record;
    try {
      record = JSON.parse(row.record);
    } catch {
      continue;
    }
    const slug = String(row.slug || '');
    if (!SLUG_RE.test(slug) || !record || typeof record !== 'object' || Array.isArray(record)) continue;

    const texts = sentenceTexts(record);
    if (!texts.length) continue;
    const hash = sentenceHash(record);
    const audioDir = path.join(outDir, 'assets', 'audio', slug);
    const hashFile = path.join(audioDir, '.text');
    const complete = fs.existsSync(hashFile)
      && fs.readFileSync(hashFile, 'utf8') === hash
      && texts.every((_, i) => fs.existsSync(path.join(audioDir, `${String(i).padStart(3, '0')}.mp3`)));
    if (complete) continue;

    fs.rmSync(audioDir, { recursive: true, force: true });
    fs.mkdirSync(audioDir, { recursive: true });
    const { gender, voice } = detectGender({ ...record, slug }, overrides);
    const started = Date.now();
    let storyFailed = false;
    for (let i = 0; i < texts.length; i++) {
      const mp3 = path.join(audioDir, `${String(i).padStart(3, '0')}.mp3`);
      try {
        const pieces = speechPieces(texts[i]);
        const wavs = [];
        for (let p = 0; p < pieces.length; p++) {
          const wav = path.join(audioDir, `.tmp-${String(i).padStart(3, '0')}-${p}.wav`);
          exec(cli, ['--text', pieces[p], '--voice', path.join(modelsRoot, 'voices', voice), '--out', wav, '--models', modelsRoot]);
          wavs.push(wav);
        }
        if (wavs.length === 1) {
          execFfmpeg(ffmpeg, ['-y', '-i', wavs[0], '-ar', '24000', '-ac', '1', '-b:a', '64k', mp3]);
        } else {
          const concatList = path.join(audioDir, `.concat-${String(i).padStart(3, '0')}.txt`);
          fs.writeFileSync(concatList, wavs.map((w) => `file '${w.replace(/'/g, "'\\''")}'`).join('\n'));
          execFfmpeg(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-ar', '24000', '-ac', '1', '-b:a', '64k', mp3]);
          fs.unlinkSync(concatList);
        }
        for (const w of wavs) if (fs.existsSync(w)) fs.unlinkSync(w);
      } catch (err) {
        failed++;
        storyFailed = true;
        error(`story ${slug} sentence ${i + 1} failed: ${err.message}`);
        break;
      }
    }
    if (storyFailed) continue;
    fs.writeFileSync(hashFile, hash);
    stories++;
    log(`${slug}: ${texts.length} sentences, gender=${gender}, voice=${voice}, secs=${((Date.now() - started) / 1000).toFixed(1)}`);
  }
  return { failed, stories };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const overridesFile = path.join(__dirname, 'listen-overrides.json');
  const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
  const result = run({
    dbPath: option('--db', DEFAULT_DB),
    outDir: option('--out', DEFAULT_OUT),
    modelsRoot: option('--models', DEFAULT_MODELS),
    overrides,
  });
  process.exitCode = result.failed ? 1 : 0;
}

module.exports = { run, environment, speechPieces };
