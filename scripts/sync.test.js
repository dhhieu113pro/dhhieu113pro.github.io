'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeFixture } = require('./fixtures/make-db');
const { syncStories, topicOf, storyParts, sentenceTexts, sentenceHash, sentences } = require('./sync');
const { detectGender } = require('./gender');

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
    assert.match(html, /localStorage\.getItem\('blog-theme'\)/);
    assert.match(html, /t === 'light' \|\| t === 'dark' \|\| t === 'auto'\) \? t : 'auto'/);
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

test('classifies a story into a topic by title/lead keywords', () => {
  assert.equal(topicOf('Nghèo nên tôi chẳng dám yêu ai', 'Tôi rất muốn có một mái ấm riêng'), 'Tình yêu');
  assert.equal(topicOf('Bỏ tiền sửa nhà cho mẹ chồng', 'Tôi mới kết hôn'), 'Hôn nhân & gia đình');
  assert.equal(topicOf('Anh trao chìa khóa căn nhà cho tôi', 'nghe anh nói về hoàn cảnh'), 'Đời sống');
  assert.equal(topicOf('Một chủ đề lạ', 'Không có từ khóa nào khớp'), 'Chuyện khác');
});

test('first matching topic wins (tình yêu beats hôn nhân)', () => {
  assert.equal(topicOf('Yêu người sắp cưới', 'rung động với cô gái khác'), 'Tình yêu');
});

test('shell emits description, icons, and og:image', () => {
  const s = story();
  s.record.lead = 'Đây là phần dẫn của truyện.';
  const { outDir } = setup([s]);
  const post = postHtml(outDir, 'a-story');
  assert.match(post, /<meta name="description" content="Đây là phần dẫn của truyện\.">/);
  assert.match(post, /<link rel="icon" href="\.\.\/\.\.\/favicon\.ico">/);
  assert.match(post, /<link rel="icon" href="\.\.\/\.\.\/assets\/logo\.png\?v=[0-9a-f]{8}" type="image\/png">/);
  assert.match(post, /<meta property="og:image" content="https:\/\/termux\.io\.vn\/assets\/logo\.png">/);
});

test('a story without lead falls back to the site description', () => {
  const s = story();
  s.record.lead = '';
  const { outDir } = setup([s]);
  assert.match(postHtml(outDir, 'a-story'), /content="Termux\.io\.vn — những câu chuyện đời thường, đọc dạng thẻ trên điện thoại\."/);
});

test('writes a topic page grouping stories by topic', () => {
  const love = story({ slug: 'love', record: { title: 'Nghèo nên tôi chẳng dám yêu ai', byline: 'A', source: '', lead: 'x', createdAt: '2026-11-21T00:00:00.000Z', parts: [{ kind: 'main', text: 'a', image: '1.webp' }] } });
  const wed = story({ slug: 'wed', record: { title: 'Sửa nhà cho mẹ chồng', byline: 'B', source: '', lead: 'kết hôn', createdAt: '2026-11-20T00:00:00.000Z', parts: [{ kind: 'main', text: 'b', image: '1.webp' }] } });
  const { outDir } = setup([love, wed]);
  const html = fs.readFileSync(path.join(outDir, 'tam-su', 'index.html'), 'utf8');
  assert.match(html, /<h1 class="page-title">Tâm sự<\/h1>/);
  assert.match(html, /<p class="page-intro">Chuyện nhà, chuyện tình, chuyện đời — kể ra cho nhẹ lòng\.<\/p>/);
  assert.match(html, /<h2 class="topic-title">Tình yêu<\/h2>/);
  assert.match(html, /<h2 class="topic-title">Hôn nhân &amp; gia đình<\/h2>/);
  assert.ok(html.indexOf('Nghèo nên tôi') < html.indexOf('Sửa nhà cho mẹ chồng'));
});

test('topic page card links to the post and uses a ../ cover path', () => {
  const { outDir } = setup([story()]);
  const html = fs.readFileSync(path.join(outDir, 'tam-su', 'index.html'), 'utf8');
  assert.match(html, /href="\.\.\/posts\/a-story\/"/);
  assert.match(html, /src="\.\.\/assets\/img\/a-story\/2\.webp"/);
});

test('empty topics are not rendered and a missing cover still renders a card', () => {
  const { outDir } = setup([story({ skipImage: true })]);
  const html = fs.readFileSync(path.join(outDir, 'tam-su', 'index.html'), 'utf8');
  assert.equal((html.match(/class="topic-title"/g) || []).length, 1);
  assert.equal((html.match(/class="story-card"/g) || []).length, 1);
  assert.doesNotMatch(html, /class="story-card"[\s\S]*?<img/);
});

test('topic page shows the empty state when there are no stories', () => {
  const { outDir } = setup([]);
  assert.match(fs.readFileSync(path.join(outDir, 'tam-su', 'index.html'), 'utf8'), /Chưa có câu chuyện nào\./);
});

test('every page links to the topic page', () => {
  const { outDir } = setup([story()]);
  assert.match(postHtml(outDir, 'a-story'), /class="site-nav"[\s\S]*?<a href="\.\.\/\.\.\/tam-su\/">Tâm sự<\/a>/);
  const topic = fs.readFileSync(path.join(outDir, 'tam-su', 'index.html'), 'utf8');
  assert.match(topic, /<a href="\.\.\/tam-su\/">Tâm sự<\/a>/);
});

test('home topbar links to the topic page and keeps the brand text', () => {
  const { outDir } = setup([story()]);
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /class="feed-brand">Termux\.io\.vn</);
  assert.match(html, /class="feed-link" href="tam-su\/">Tâm sự<\/a>/);
});

test('home page carries its own description', () => {
  const { outDir } = setup([story()]);
  assert.match(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), /Đọc truyện tâm sự đời thường của người Việt/);
});

test('a post page has exactly one theme toggle', () => {
  const { outDir } = setup([story()]);
  assert.equal((postHtml(outDir, 'a-story').match(/class="theme-toggle"/g) || []).length, 1);
});

test('the topic page has exactly one theme toggle', () => {
  const { outDir } = setup([story()]);
  const html = fs.readFileSync(path.join(outDir, 'tam-su', 'index.html'), 'utf8');
  assert.equal((html.match(/class="theme-toggle"/g) || []).length, 1);
});

test('storyParts drops the begin part and keeps the rest', () => {
  const parts = storyParts(story().record);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].kind, 'main');
});

test('sentenceTexts flattens sentences across parts in render order', () => {
  const record = {
    parts: [
      { kind: 'begin', text: 'Không đọc.' },
      { kind: 'pre', text: 'Một. Hai.\nBa.' },
      { kind: 'main', text: '\nBốn.\n\n' },
    ],
  };
  assert.deepEqual(sentenceTexts(record), ['Một.', 'Hai.', 'Ba.', 'Bốn.']);
});

test('sentenceHash is stable and changes with the text', () => {
  const a = { parts: [{ kind: 'main', text: 'Một. Hai.' }] };
  const b = { parts: [{ kind: 'main', text: 'Một. Ba.' }] };
  assert.equal(sentenceHash(a), sentenceHash(a));
  assert.notEqual(sentenceHash(a), sentenceHash(b));
});

function textRecord(text, extra = {}) {
  return { slug: 'a-story', parts: [{ kind: 'main', text }], ...extra };
}

test('gender: explicit female self-description picks the female voice', () => {
  const got = detectGender(textRecord('Tôi là người phụ nữ đã trải qua một lần đò.'), {});
  assert.equal(got.gender, 'F');
  assert.equal(got.voice, 'doan_trang');
  assert.equal(got.source, 'rule');
});

test('gender: a husband implies a female narrator', () => {
  assert.equal(detectGender(textRecord('Mỗi ngày về nhà tôi không dám than thở với chồng.'), {}).gender, 'F');
});

test('gender: a wife implies a male narrator', () => {
  const got = detectGender(textRecord('Sau đám cưới, vợ tôi trao cho tôi một khoản tiền.'), {});
  assert.equal(got.gender, 'M');
  assert.equal(got.voice, 'duc_tri');
});

test('gender: partner nouns choose M for bạn gái and F for bạn trai', () => {
  assert.equal(detectGender(textRecord('Tôi có bạn gái.'), {}).gender, 'M');
  assert.equal(detectGender(textRecord('Tôi có bạn trai.'), {}).gender, 'F');
});

test('gender: no marker defaults to M', () => {
  assert.equal(detectGender(textRecord('Tôi làm nhân viên kinh doanh.'), {}).gender, 'M');
});

test('gender: cô gái is the partner, never a narrator marker', () => {
  assert.equal(detectGender(textRecord('Tôi từng yêu một cô gái hơn hai năm.'), {}).gender, 'M');
});

test('gender: equal chồng and vợ counts fall through to the default', () => {
  const text = 'Tôi nghe chồng tôi nói về vợ tôi. Chồng và vợ đều về.';
  assert.equal(detectGender(textRecord(text), {}).gender, 'M');
});

test('gender: override wins over detection', () => {
  const got = detectGender(textRecord('Tôi là con trai duy nhất.'), { 'a-story': { gender: 'F' } });
  assert.equal(got.gender, 'F');
  assert.equal(got.source, 'override');
});

test('gender: voice override wins while gender is still detected', () => {
  const got = detectGender(textRecord('Tôi có bạn trai.'), { 'a-story': { voice: 'kim_thanh' } });
  assert.equal(got.gender, 'F');
  assert.equal(got.voice, 'kim_thanh');
});

test('gender: the four real stories resolve F, M, M, F', () => {
  const cases = [
    ['Tôi là người phụ nữ đã trải qua một lần đò, không có hạnh phúc vì chồng ham chơi lười làm.', 'F'],
    ['Tôi là con trai duy nhất, chị gái đã lấy chồng, kinh tế cũng vất vả.', 'M'],
    ['Tôi 35 tuổi, đã có bạn gái.', 'M'],
    ['Tôi mới kết hôn chưa đầy sáu tháng mà mỗi ngày về nhà là cảm thấy nặng nề trong lòng, không dám than thở với chồng.', 'F'],
  ];
  for (const [text, expected] of cases) {
    assert.equal(detectGender(textRecord(text), {}).gender, expected, text);
  }
});

function setupAudio({ hash, mp3s = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-audio-sync-'));
  const s = story();
  s.record.parts[1].text = 'Một. Hai.';
  const dbPath = makeFixture({ dir, stories: [s] });
  const outDir = path.join(dir, 'site');
  fs.mkdirSync(outDir, { recursive: true });
  if (hash !== false) {
    const audioDir = path.join(outDir, 'assets', 'audio', s.slug);
    fs.mkdirSync(audioDir, { recursive: true });
    fs.writeFileSync(path.join(audioDir, '.text'), hash || sentenceHash(s.record));
    if (mp3s) {
      const count = s.record.parts.reduce((n, part) => n + sentences(part.text).length, 0);
      for (let i = 0; i < count; i++) fs.writeFileSync(path.join(audioDir, `${String(i).padStart(3, '0')}.mp3`), 'fake');
    }
  }
  const messages = [];
  const original = console.error;
  console.error = (message) => messages.push(message);
  try {
    syncStories({ dbPath, outDir });
  } finally {
    console.error = original;
  }
  return { outDir, messages };
}

test('sync links audio with a post-relative data-audio and a listen toggle', () => {
  const { outDir } = setupAudio();
  const html = postHtml(outDir, 'a-story');
  assert.match(html, /class="sentence" data-audio="\.\.\/\.\.\/assets\/audio\/a-story\/000\.mp3">Một\.<\/span>/);
  assert.match(html, /class="sentence" data-audio="\.\.\/\.\.\/assets\/audio\/a-story\/001\.mp3">Hai\.<\/span>/);
  assert.equal((html.match(/class="listen-toggle"/g) || []).length, 1);
});

test('sync refuses stale or missing audio and warns with the slug', () => {
  for (const hash of [false, 'stale']) {
    const { outDir, messages } = setupAudio({ hash });
    const html = postHtml(outDir, 'a-story');
    assert.doesNotMatch(html, /data-audio=/);
    assert.doesNotMatch(html, /class="listen-toggle"/);
    assert.ok(messages.some((m) => /a-story/.test(m) && /audio/.test(m)), messages.join('\n'));
  }
});

test('sync refuses a matching hash when an mp3 is missing', () => {
  const { outDir, messages } = setupAudio({ mp3s: false });
  const html = postHtml(outDir, 'a-story');
  assert.doesNotMatch(html, /data-audio=/);
  assert.doesNotMatch(html, /class="listen-toggle"/);
  assert.ok(messages.some((m) => /a-story/.test(m) && /audio/.test(m)), messages.join('\n'));
});

test('the home top bar always has one listen toggle', () => {
  const { outDir } = setupAudio({ hash: false });
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.equal((html.match(/class="listen-toggle"/g) || []).length, 1);
});
