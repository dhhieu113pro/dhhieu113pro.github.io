'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeFixture } = require('./fixtures/make-db');
const { syncStories } = require('./sync');

function setup(stories) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-sync-'));
  const dbPath = makeFixture({ dir, stories });
  const outDir = path.join(dir, 'site');
  fs.mkdirSync(outDir, { recursive: true });
  syncStories({ dbPath, outDir });
  return { dir, outDir };
}

function story(overrides = {}) {
  return {
    slug: 'a-story',
    record: {
      title: 'Tiêu đề',
      byline: 'Tác giả',
      source: 'https://example.com/a',
      createdAt: '2026-11-20T10:00:00.000Z',
      parts: [
        { kind: 'begin', text: 'Mở đầu', image: '1.webp' },
        { kind: 'main', text: 'Nội dung', image: '2.webp' },
      ],
    },
    ...overrides,
  };
}

function postHtml(outDir, slug) {
  return fs.readFileSync(path.join(outDir, 'posts', slug, 'index.html'), 'utf8');
}

test('escapes story text and titles in generated HTML', () => {
  const s = story();
  s.record.title = '<script>x</script>';
  s.record.parts[1].text = 'a & b';
  const { outDir } = setup([s]);
  const html = postHtml(outDir, 'a-story');
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /a &amp; b/);
  assert.doesNotMatch(html, /<script>/);
});

test('rejects a slug containing path traversal', () => {
  const { dir, outDir } = setup([story({ slug: '../bad' })]);
  assert.equal(fs.existsSync(path.join(dir, 'bad')), false);
  assert.equal(fs.existsSync(path.join(outDir, 'posts', '..', 'bad')), false);
});

test('writes a post without an img tag when an image file is missing', () => {
  const { outDir } = setup([story({ skipImage: true })]);
  const html = postHtml(outDir, 'a-story');
  assert.match(html, /Nội dung/);
  assert.doesNotMatch(html, /<img/);
});

test('renders a Vietnamese empty state when the database has no stories', () => {
  const { outDir } = setup([]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /Chưa có câu chuyện nào\./);
});

test('lists newer stories before older ones', () => {
  const newer = story({
    slug: 'newer',
    record: {
      title: 'Mới hơn', byline: '', source: '', createdAt: '2026-11-21T10:00:00.000Z',
      parts: [{ kind: 'begin', text: 'a', image: '1.webp' }],
    },
  });
  const older = story({
    slug: 'older',
    record: {
      title: 'Cũ hơn', byline: '', source: '', createdAt: '2026-11-20T10:00:00.000Z',
      parts: [{ kind: 'begin', text: 'b', image: '1.webp' }],
    },
  });
  const { outDir } = setup([older, newer]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.ok(html.indexOf('Mới hơn') < html.indexOf('Cũ hơn'));
});
