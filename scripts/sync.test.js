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
  assert.doesNotMatch(html, /<script>x<\/script>/);
});

test('copies part images from the database story folder', () => {
  const { outDir } = setup([story()]);
  assert.equal(fs.existsSync(path.join(outDir, 'assets', 'img', 'a-story', '2.webp')), true);
  assert.match(postHtml(outDir, 'a-story'), /src="\.\.\/\.\.\/assets\/img\/a-story\/2\.webp"/);
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

test('refuses to overwrite the site when the database is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-sync-'));
  const outDir = path.join(dir, 'site');
  const postsDir = path.join(outDir, 'posts');
  fs.mkdirSync(postsDir, { recursive: true });
  fs.writeFileSync(path.join(postsDir, 'keep.html'), 'keep');
  assert.throws(
    () => syncStories({ dbPath: path.join(dir, 'missing.sqlite'), outDir }),
    /database not found/
  );
  assert.equal(fs.existsSync(path.join(postsDir, 'keep.html')), true);
});

test('does not duplicate the title-card text or image on a post page', () => {
  const s = story();
  s.record.parts[0].text = `${s.record.title}\n${s.record.byline}`;
  const { outDir } = setup([s]);
  const html = postHtml(outDir, 'a-story');
  assert.equal((html.match(/class="card-image"/g) || []).length, 1);
  assert.doesNotMatch(html, /class="story-cover"/);
  assert.doesNotMatch(html, /class="sentence">Tiêu đề/);
});

test('renders one reader card per part with image above text', () => {
  const s = story();
  s.record.parts.push({ kind: 'main', text: 'Thêm', image: '3.webp' });
  const { outDir } = setup([s]);
  const html = postHtml(outDir, 'a-story');
  assert.equal((html.match(/class="reader-card"/g) || []).length, 2);
  assert.equal((html.match(/class="card-text"/g) || []).length, 2);
  const firstCard = html.slice(html.indexOf('class="reader-card"'), html.indexOf('class="reader-card"', html.indexOf('class="reader-card"') + 1));
  assert.ok(firstCard.indexOf('class="card-image"') < firstCard.indexOf('class="card-text"'));
});

test('post drops button controls and bottom counter', () => {
  const { outDir } = setup([story()]);
  const html = postHtml(outDir, 'a-story');
  assert.doesNotMatch(html, /class="reader-nav"/);
  assert.doesNotMatch(html, /class="reader-prev"/);
  assert.doesNotMatch(html, /class="reader-next"/);
  assert.doesNotMatch(html, /class="reader-home"/);
  assert.doesNotMatch(html, /class="reader-count"/);
  assert.equal((html.match(/class="reader-dot"/g) || []).length, 1);
});

test('dots live inside the deck', () => {
  const { outDir } = setup([story()]);
  const html = postHtml(outDir, 'a-story');
  assert.ok(html.indexOf('class="reader-track"') < html.indexOf('class="reader-dot"'));
  if (html.includes('class="reader-next-post"')) {
    assert.ok(html.indexOf('class="reader-dot"') < html.indexOf('class="reader-next-post"'));
  }
});

test('post links to the next story and wraps', () => {
  const newer = story({ slug: 'newer', record: { title: 'Mới hơn', byline: '', source: '', createdAt: '2026-11-21T00:00:00.000Z', parts: [{ kind: 'main', text: 'a', image: '1.webp' }] } });
  const older = story({ slug: 'older', record: { title: 'Cũ hơn', byline: '', source: '', createdAt: '2026-11-20T00:00:00.000Z', parts: [{ kind: 'main', text: 'b', image: '1.webp' }] } });
  const { outDir } = setup([older, newer]);
  assert.match(postHtml(outDir, 'newer'), /class="reader-next-post" href="\.\.\/older\/"/);
  assert.match(postHtml(outDir, 'newer'), /class="next-post-title">Cũ hơn</);
  assert.match(postHtml(outDir, 'older'), /class="reader-next-post" href="\.\.\/newer\/"/);
  assert.match(postHtml(outDir, 'older'), /class="next-post-title">Mới hơn</);
});

test('a single story has no next-post link', () => {
  const { outDir } = setup([story()]);
  assert.equal(postHtml(outDir, 'a-story').includes('reader-next-post'), false);
});

test('post emits a scroll hint per card', () => {
  const s = story();
  s.record.parts.push({ kind: 'main', text: 'Thêm', image: '3.webp' });
  const { outDir } = setup([s]);
  const html = postHtml(outDir, 'a-story');
  assert.equal((html.match(/class="scroll-hint" aria-hidden="true"/g) || []).length, 2);
});

test('pages apply the stored theme before CSS', () => {
  const { outDir } = setup([story()]);
  const post = postHtml(outDir, 'a-story');
  const home = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  for (const html of [post, home]) {
    assert.match(html, /localStorage\.getItem\('blog-theme'\) \|\| 'auto'/);
    assert.match(html, /dataset\.theme/);
  }
});

test('both top bars have a theme toggle', () => {
  const { outDir } = setup([story()]);
  for (const html of [postHtml(outDir, 'a-story'), fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')]) {
    assert.match(html, /class="theme-toggle" type="button" aria-label="Chế độ: Tự động"/);
    assert.equal((html.match(/class="theme-icon"/g) || []).length, 3);
  }
});

test('theme script is cache-busted', () => {
  const { outDir } = setup([story()]);
  const post = postHtml(outDir, 'a-story');
  const home = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(post, /src="\.\.\/\.\.\/assets\/theme\.js\?v=[0-9a-f]{8}" defer/);
  assert.match(home, /src="assets\/theme\.js\?v=[0-9a-f]{8}" defer/);
  const cssVersion = post.match(/assets\/style\.css\?v=([0-9a-f]{8})/)[1];
  assert.equal(post.match(/assets\/theme\.js\?v=([0-9a-f]{8})/)[1], cssVersion);
});

test('each sentence renders on its own line', () => {
  const s = story();
  s.record.parts[1].text = 'Một. Hai. Ba.';
  const { outDir } = setup([s]);
  const html = postHtml(outDir, 'a-story');
  const sentences = [...html.matchAll(/class="sentence">(.*?)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(sentences, ['Một.', 'Hai.', 'Ba.']);
});

test('locks zoom on post pages', () => {
  const { outDir } = setup([story()]);
  assert.match(postHtml(outDir, 'a-story'), /name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/);
});

test('keeps the home page zoomable', () => {
  const { outDir } = setup([story()]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /user-scalable=no/);
});

test('generates a compact top bar', () => {
  const { outDir } = setup([story()]);
  const html = postHtml(outDir, 'a-story');
  assert.match(html, /class="reader-back" href="\.\.\/\.\.\/" aria-label="Trở về"/);
  assert.match(html, /class="reader-top-title">Tiêu đề</);
  assert.match(html, /class="reader-top-count" aria-live="polite">1 \/ 1</);
});

test('loads the reader enhancer', () => {
  const { outDir } = setup([story()]);
  const html = postHtml(outDir, 'a-story');
  assert.match(html, /src="\.\.\/\.\.\/assets\/reader\.js\?v=[0-9a-f]{8}" defer/);
  const cssVersion = html.match(/assets\/style\.css\?v=([0-9a-f]{8})/)[1];
  assert.equal(html.match(/assets\/reader\.js\?v=([0-9a-f]{8})/)[1], cssVersion);
});

test('does not emit a non-http source link', () => {
  const s = story();
  s.record.source = 'javascript:alert(1)';
  const { outDir } = setup([s]);
  assert.doesNotMatch(postHtml(outDir, 'a-story'), /href="javascript:/);
});

test('escapes a quote inside the source URL attribute', () => {
  const s = story();
  s.record.source = 'https://example.com/?a=" onmouseover="bad';
  const { outDir } = setup([s]);
  assert.match(postHtml(outDir, 'a-story'), /&quot; onmouseover=&quot;bad/);
});

test('skips a database row whose record is null', () => {
  const { outDir } = setup([story({ record: null, skipImage: true })]);
  assert.match(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), /Chưa có câu chuyện nào\./);
});

test('rejects an uppercase slug', () => {
  const { outDir } = setup([story({ slug: 'Bad' })]);
  assert.equal(fs.existsSync(path.join(outDir, 'posts', 'Bad')), false);
});

test('keeps other images when one part image is missing', () => {
  const s = story();
  s.record.parts.push({ kind: 'main', text: 'Thêm', image: '3.webp' });
  const { outDir } = setup([story({ record: s.record, skipImageName: '2.webp' })]);
  const html = postHtml(outDir, 'a-story');
  assert.equal(fs.existsSync(path.join(outDir, 'assets', 'img', 'a-story', '3.webp')), true);
  assert.equal(fs.existsSync(path.join(outDir, 'assets', 'img', 'a-story', '2.webp')), false);
  assert.match(html, /3\.webp/);
  assert.doesNotMatch(html, /2\.webp/);
});

test('home page drops header and footer', () => {
  const { outDir } = setup([story()]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /class="site-header"/);
  assert.doesNotMatch(html, /class="site-footer"/);
  assert.match(html, /<body class="home-picker">/);
});

test('home page keeps a screen-reader-only heading', () => {
  const { outDir } = setup([story()]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /<h1 class="sr-only">Truyện<\/h1>/);
});

test('home renders a cover per story with a read link', () => {
  const newer = story({ slug: 'newer', record: { title: 'Mới hơn', byline: '', source: '', createdAt: '2026-11-21T00:00:00.000Z', parts: [{ kind: 'main', text: 'a', image: '1.webp' }] } });
  const older = story({ slug: 'older', record: { title: 'Cũ hơn', byline: '', source: '', createdAt: '2026-11-20T00:00:00.000Z', parts: [{ kind: 'main', text: 'b', image: '1.webp' }] } });
  const { outDir } = setup([older, newer]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.equal((html.match(/class="cover-slide"/g) || []).length, 2);
  assert.equal((html.match(/class="cover-title"/g) || []).length, 2);
  assert.equal((html.match(/class="cover-image"/g) || []).length, 2);
  assert.match(html, /class="cover-read" aria-label="Đọc: Mới hơn" href="posts\/newer\/"/);
  assert.match(html, /class="cover-title">Mới hơn</);
});

test('home renders the feed top bar and enhancer', () => {
  const newer = story({ slug: 'newer', record: { title: 'Mới', byline: '', source: '', createdAt: '2026-11-21T00:00:00.000Z', parts: [{ kind: 'main', text: 'a', image: '1.webp' }] } });
  const older = story({ slug: 'older', record: { title: 'Cũ', byline: '', source: '', createdAt: '2026-11-20T00:00:00.000Z', parts: [{ kind: 'main', text: 'b', image: '1.webp' }] } });
  const { outDir } = setup([older, newer]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /class="feed-brand">Termux\.io\.vn</);
  assert.match(html, /class="feed-count">1 \/ 2</);
  assert.match(html, /class="feed-next"/);
  assert.match(html, /src="assets\/home\.js\?v=[0-9a-f]{8}" defer/);
  const cssVersion = html.match(/assets\/style\.css\?v=([0-9a-f]{8})/)[1];
  assert.equal(html.match(/assets\/home\.js\?v=([0-9a-f]{8})/)[1], cssVersion);
});

test('post pages keep the site header and footer', () => {
  const { outDir } = setup([story()]);
  const html = postHtml(outDir, 'a-story');
  assert.match(html, /class="site-header"/);
  assert.match(html, /class="site-footer"/);
});

test('a story without an image still gets a cover', () => {
  const { outDir } = setup([story({ skipImage: true })]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.equal((html.match(/class="cover-slide"/g) || []).length, 1);
  assert.match(html, /class="cover-title">Tiêu đề</);
  assert.doesNotMatch(html, /class="cover-image"/);
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
