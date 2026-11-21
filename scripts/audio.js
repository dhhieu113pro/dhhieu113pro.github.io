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
  };
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
    if (fs.existsSync(hashFile) && fs.readFileSync(hashFile, 'utf8') === hash) continue;

    fs.rmSync(audioDir, { recursive: true, force: true });
    fs.mkdirSync(audioDir, { recursive: true });
    const { gender, voice } = detectGender({ ...record, slug }, overrides);
    const started = Date.now();
    let storyFailed = false;
    for (let i = 0; i < texts.length; i++) {
      const wav = path.join(audioDir, `.tmp-${String(i).padStart(3, '0')}.wav`);
      const mp3 = path.join(audioDir, `${String(i).padStart(3, '0')}.mp3`);
      try {
        exec(cli, ['--text', texts[i], '--voice', voice, '--out', wav, '--models', modelsRoot]);
        execFfmpeg(ffmpeg, ['-y', '-i', wav, '-ar', '24000', '-ac', '1', '-b:a', '64k', mp3]);
        if (fs.existsSync(wav)) fs.unlinkSync(wav);
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

module.exports = { run };
