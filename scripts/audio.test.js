'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeFixture } = require('./fixtures/make-db');
const { sentenceHash } = require('./sync');
const { run } = require('./audio');

function setup(text = 'Một. Hai.', overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-audio-'));
  const record = {
    title: 'Tiêu đề',
    byline: 'Tác giả',
    parts: [{ kind: 'main', text }],
  };
  const dbPath = makeFixture({ dir, stories: [{ slug: 'a-story', record }] });
  const outDir = path.join(dir, 'site');
  fs.mkdirSync(outDir, { recursive: true });
  return { dir, dbPath, outDir, record, overrides };
}

function tools(failAt = -1) {
  const calls = { cli: [], ffmpeg: [] };
  let n = 0;
  return {
    calls,
    cli(args) {
      calls.cli.push(args);
      if (++n === failAt) throw new Error('synthesis exploded');
      fs.writeFileSync(args[args.indexOf('--out') + 1], 'fake-wav');
    },
    ffmpeg(args) {
      calls.ffmpeg.push(args);
      fs.writeFileSync(args[args.length - 1], 'fake-mp3');
    },
  };
}

function bare(over = {}) {
  return {
    dbPath: over.dbPath,
    outDir: over.outDir,
    modelsRoot: '/models',
    overrides: over.overrides || {},
    log() {},
    error() {},
    ...over,
  };
}

test('audio: a fresh story synthesizes every sentence and writes the hash', () => {
  const s = setup();
  const t = tools();
  const result = run(bare({ ...s, ...t }));
  assert.equal(result.failed, 0);
  assert.equal(t.calls.cli.length, 2);
  assert.deepEqual(t.calls.cli[0].slice(0, 2), ['--text', 'Một.']);
  assert.ok(t.calls.cli[0].includes('/models/voices/duc_tri'));
  assert.equal(fs.readFileSync(path.join(s.outDir, 'assets/audio/a-story/.text'), 'utf8'), sentenceHash(s.record));
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/000.mp3')), true);
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/001.mp3')), true);
});

test('audio: a matching hash skips the whole story', () => {
  const s = setup();
  const first = tools();
  run(bare({ ...s, ...first }));
  const second = tools();
  const result = run(bare({ ...s, ...second }));
  assert.equal(result.failed, 0);
  assert.equal(second.calls.cli.length, 0);
});

test('audio: a matching hash with a missing mp3 regenerates instead of skipping', () => {
  const s = setup();
  const first = tools();
  run(bare({ ...s, ...first }));
  fs.rmSync(path.join(s.outDir, 'assets/audio/a-story/001.mp3'));
  const second = tools();
  const result = run(bare({ ...s, ...second }));
  assert.equal(result.failed, 0);
  assert.equal(second.calls.cli.length, 2, 'both sentences regenerate');
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/001.mp3')), true);
});

test('audio: changed text clears old files and regenerates', () => {
  const s = setup();
  const first = tools();
  run(bare({ ...s, ...first }));
  const changed = { ...s.record, parts: [{ kind: 'main', text: 'Ba.' }] };
  const db = new (require('node:sqlite').DatabaseSync)(s.dbPath);
  db.prepare('UPDATE stories SET record = ? WHERE slug = ?').run(JSON.stringify(changed), 'a-story');
  db.close();
  const second = tools();
  run(bare({ ...s, ...second }));
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/001.mp3')), false);
  assert.equal(second.calls.cli.length, 1);
  assert.equal(fs.readFileSync(path.join(s.outDir, 'assets/audio/a-story/.text'), 'utf8'), sentenceHash(changed));
});

test('audio: one failing sentence leaves no hash and reports slug and index', () => {
  const s = setup();
  const messages = [];
  const t = tools(2);
  const result = run(bare({ ...s, ...t, error: (m) => messages.push(m) }));
  assert.equal(result.failed, 1);
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/.text')), false);
  assert.ok(messages.some((m) => /a-story/.test(m) && /sentence 2/.test(m)), messages.join('\n'));
});

test('audio: a missing binary fails with an actionable message', () => {
  const s = setup();
  const messages = [];
  const result = run(bare({ ...s, cliPath: '/no/such/vieneu', error: (m) => messages.push(m) }));
  assert.ok(result.failed > 0);
  assert.ok(messages.some((m) => /vieneu/.test(m) && /\/no\/such\/vieneu/.test(m)), messages.join('\n'));
});

test('audio: a long sentence is synthesized in pieces and joined into one mp3', () => {
  const long = 'Tôi mới kết hôn chưa đầy sáu tháng mà mỗi ngày về nhà là cảm thấy nặng nề trong lòng, không dám than thở với chồng vì sợ anh khó xử giữa mẹ và vợ.';
  assert.ok(long.length > 110);
  const s = setup(long);
  const t = tools();
  const result = run(bare({ ...s, ...t }));
  assert.equal(result.failed, 0);
  assert.ok(t.calls.cli.length > 1, `cli calls: ${t.calls.cli.length}`);
  assert.equal(t.calls.cli.map((a) => a[a.indexOf('--text') + 1]).join(' '), long);
  assert.equal(t.calls.ffmpeg.length, 1);
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/000.mp3')), true);
  assert.equal(fs.existsSync(path.join(s.outDir, 'assets/audio/a-story/001.mp3')), false);
});

test('audio: speechPieces keeps short text whole and never exceeds the cap', () => {
  const { speechPieces } = require('./audio');
  assert.deepEqual(speechPieces('Một. Hai.'), ['Một. Hai.']);
  const long = 'Aaa, bbb ccc ddd, eee fff ggg hhh iii jjj kkk lll, mmm nnn ooo ppp qqq rrr sss ttt uuu vvv www xxx yyy zzz.';
  const pieces = speechPieces(long, 40);
  assert.ok(pieces.length > 1);
  assert.equal(pieces.join(' '), long);
  for (const piece of pieces) assert.ok(piece.length <= 40, `${piece.length}: ${piece}`);
});

test('audio: a single token longer than the cap is hard-split', () => {
  const { speechPieces } = require('./audio');
  const token = 'a'.repeat(150);
  const pieces = speechPieces(token, 40);
  assert.ok(pieces.length > 1);
  assert.equal(pieces.join(''), token);
  for (const piece of pieces) assert.ok(piece.length <= 40, `${piece.length}: ${piece}`);
});

test('audio: the environment carries absolute g2p dict and library paths', () => {
  const { environment } = require('./audio');
  const env = environment();
  for (const key of ['SEA_G2P_BIN', 'SEA_G2P_LIB', 'ORT_DYLIB_PATH']) {
    assert.equal(path.isAbsolute(env[key]), true, `${key}=${env[key]}`);
  }
});

test('audio: a voice override reaches the CLI', () => {
  const s = setup('Tôi có bạn gái.', { 'a-story': { voice: 'kim_thanh' } });
  const t = tools();
  run(bare({ ...s, ...t }));
  assert.ok(t.calls.cli[0].includes('/models/voices/kim_thanh'));
});
