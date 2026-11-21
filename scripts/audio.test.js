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
  assert.ok(t.calls.cli[0].includes('duc_tri'));
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

test('audio: a voice override reaches the CLI', () => {
  const s = setup('Tôi có bạn gái.', { 'a-story': { voice: 'kim_thanh' } });
  const t = tools();
  run(bare({ ...s, ...t }));
  assert.ok(t.calls.cli[0].includes('kim_thanh'));
});
