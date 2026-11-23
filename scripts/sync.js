'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_DB = path.join(os.homedir(), '.pwterm', 'stories', 'stories.sqlite');
const DEFAULT_OUT = path.resolve(__dirname, '..');
const EMPTY_STATE = 'Chưa có câu chuyện nào.';

// Keyword topic classification for the Tâm sự index page. Order matters:
// the first topic whose word appears in title+lead wins.
const TOPICS = [
  { name: 'Tình yêu',          words: ['yêu', 'rung động', 'người yêu', 'hẹn hò', 'crush', 'tình yêu'] },
  { name: 'Hôn nhân & gia đình', words: ['cưới', 'kết hôn', 'chồng', 'vợ', 'mẹ chồng', 'con dâu', 'gia đình', 'đám cưới', 'lấy nhau'] },
  { name: 'Đời sống',          words: ['nghèo', 'tiền', 'công việc', 'cuộc sống', 'hoàn cảnh', 'đời'] },
];
const OTHER_TOPIC = 'Chuyện khác';

const SITE_URL = 'https://termux.io.vn';
const SITE_DESC = 'Termux.io.vn — những câu chuyện đời thường, đọc dạng thẻ trên điện thoại.';
const HOME_DESC = 'Đọc truyện tâm sự đời thường của người Việt — tình yêu, hôn nhân, gia đình — dưới dạng thẻ dễ đọc trên điện thoại.';
const TAM_SU_DESC = 'Tâm sự trên Termux.io.vn — những câu chuyện đời thường về tình yêu, hôn nhân và gia đình người Việt, đọc dạng thẻ dễ chịu trên điện thoại.';

function topicOf(title, lead) {
  const haystack = `${String(title || '')} ${String(lead || '')}`.toLowerCase();
  for (const topic of TOPICS) {
    if (topic.words.some((word) => haystack.includes(word))) return topic.name;
  }
  return OTHER_TOPIC;
}

function themeToggle() {
  return `<button class="theme-toggle" type="button" aria-label="Chế độ: Tự động">
  <svg class="theme-icon" data-mode="light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
  <svg class="theme-icon" data-mode="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5z"/></svg>
  <svg class="theme-icon" data-mode="auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>
</button>`;
}

function listenToggle() {
  return `<button class="listen-toggle" type="button" aria-label="Chế độ: Nghe" aria-pressed="false">
  <svg class="listen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>
</button>`;
}

function assetVersion() {
  const dir = path.join(__dirname, '..', 'assets');
  const hash = crypto.createHash('sha1');
  for (const file of ['style.css', 'reader.js', 'home.js', 'theme.js', 'app.js', 'logo.png']) {
    const file_path = path.join(dir, file);
    if (fs.existsSync(file_path)) hash.update(fs.readFileSync(file_path));
  }
  return hash.digest('hex').slice(0, 8);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sentences(text) {
  return String(text || '')
    .split(/(?<=\.)\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function storyParts(record) {
  return (Array.isArray(record?.parts) ? record.parts : [])
    .filter((part) => part && part.kind !== 'begin');
}

function sentenceTexts(record) {
  return storyParts(record).flatMap((part) => sentences(part.text));
}

function sentenceHash(record) {
  return crypto.createHash('sha1').update(sentenceTexts(record).join('\u0000')).digest('hex');
}

function fmtDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

function shell(title, body, prefix, lockZoom = false, bare = false, description = '', showToggle = false, logo = false) {
  const root = prefix || './';
  const viewport = lockZoom
    ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    : 'width=device-width, initial-scale=1';
  const chrome = bare ? '' : `<header class="site-header">
  <a class="site-title" href="${root}">${logo ? `<img class="brand-mark" src="${prefix}assets/logo.png?v=${assetVersion()}" alt="">` : ''}Termux.io.vn</a>
  <nav class="site-nav">
    <a href="${root}tam-su/">Tâm sự</a>
${showToggle ? themeToggle() : ''}  </nav>
</header>`;
  const footer = bare ? '' : '<footer class="site-footer">Termux.io.vn · Những câu chuyện đời thường</footer>';
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<script>
try { var t = localStorage.getItem('blog-theme'); document.documentElement.dataset.theme = (t === 'light' || t === 'dark' || t === 'auto') ? t : 'auto'; }
catch (error) { document.documentElement.dataset.theme = 'auto'; }
</script>
<meta name="viewport" content="${viewport}">
<meta name="description" content="${esc(description || SITE_DESC)}">
<link rel="icon" href="${prefix}favicon.ico">
<link rel="icon" href="${prefix}assets/logo.png?v=${assetVersion()}" type="image/png">
<meta property="og:image" content="${SITE_URL}/assets/logo.png">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${prefix}assets/style.css?v=${assetVersion()}">
</head>
<body${bare ? ' class="home-picker"' : ''}>
${chrome}
<main>
${body}
</main>
${footer}
<script src="${prefix}assets/theme.js?v=${assetVersion()}" defer></script>
<script src="${prefix}assets/reader.js?v=${assetVersion()}" defer></script>
<script src="${prefix}assets/home.js?v=${assetVersion()}" defer></script>
<script src="${prefix}assets/app.js?v=${assetVersion()}" defer></script>
</body>
</html>
`;
}

function syncStories({ dbPath = DEFAULT_DB, outDir = DEFAULT_OUT } = {}) {
  if (!fs.existsSync(dbPath)) throw new Error(`database not found: ${dbPath}`);
  const hasLogo = fs.existsSync(path.join(outDir, 'assets', 'logo.png'));
  const toggle = themeToggle();
  const postsDir = path.join(outDir, 'posts');
  const imgRoot = path.join(outDir, 'assets', 'img');
  fs.rmSync(postsDir, { recursive: true, force: true });
  fs.rmSync(imgRoot, { recursive: true, force: true });
  fs.mkdirSync(postsDir, { recursive: true });
  fs.mkdirSync(imgRoot, { recursive: true });

  let rows = [];
  if (fs.existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      rows = db.prepare('SELECT slug, record, created_at FROM stories ORDER BY created_at DESC').all();
    } finally {
      db.close();
    }
  }

  const stories = [];
  for (const row of rows) {
    let record;
    try {
      record = JSON.parse(row.record);
    } catch {
      continue;
    }
    const slug = String(row.slug || '');
    if (!SLUG_RE.test(slug)) continue;
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue;

    const srcDir = path.join(path.dirname(dbPath), slug);
    const destDir = path.join(imgRoot, slug);
    fs.mkdirSync(destDir, { recursive: true });

    const parts = storyParts(record)
      .map((part) => {
      const name = String(part.image || '');
      let image = '';
      if (name && !name.includes('/') && !name.includes('..')) {
        const src = path.join(srcDir, name);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(destDir, name));
          image = `../../assets/img/${slug}/${encodeURIComponent(name)}`;
        }
      }
      return { text: String(part.text || ''), image };
    });

    stories.push({
      slug,
      hash: sentenceHash(record),
      title: String(record.title || ''),
      byline: String(record.byline || ''),
      lead: String(record.lead || ''),
      source: /^https?:\/\//i.test(String(record.source || '')) ? String(record.source) : '',
      date: fmtDate(record.createdAt || row.created_at),
      cover: (parts.find((part) => part.image) || {}).image || '',
      parts,
    });
  }

  for (let storyIndex = 0; storyIndex < stories.length; storyIndex++) {
    const story = stories[storyIndex];
    const nextStory = stories.length > 1 ? stories[(storyIndex + 1) % stories.length] : null;
    const dir = path.join(postsDir, story.slug);
    fs.mkdirSync(dir, { recursive: true });
    const audioDir = path.join(outDir, 'assets', 'audio', story.slug);
    const hashFile = path.join(audioDir, '.text');
    const sentenceCount = story.parts.reduce((n, part) => n + sentences(part.text).length, 0);
    const hasAudio = fs.existsSync(hashFile)
      && fs.readFileSync(hashFile, 'utf8') === story.hash
      && Array.from({ length: sentenceCount }, (_, i) => path.join(audioDir, `${String(i).padStart(3, '0')}.mp3`))
        .every((file) => fs.existsSync(file));
    if (!hasAudio) console.error(`sync: ${story.slug} has no current audio — run node scripts/audio.js`);
    let sentenceIndex = 0;
    const cardsHtml = story.parts.map((part) => {
      const lines = sentences(part.text)
        .map((line) => {
          const at = String(sentenceIndex++).padStart(3, '0');
          const audio = hasAudio ? ` data-audio="../../assets/audio/${story.slug}/${at}.mp3"` : '';
          return `          <span class="sentence"${audio}>${esc(line)}</span>`;
        })
        .join('\n');
      return `      <section class="reader-card">
        <div class="card-media">${part.image ? `<img class="card-image" src="${esc(part.image)}" alt="">` : ''}</div>
        <div class="card-body"><div class="card-text">
${lines}
        </div></div>
        <span class="scroll-hint" aria-hidden="true">↓</span>
      </section>`;
    }).join('\n');
    const dotsHtml = story.parts.map((part, index) =>
      `        <button class="reader-dot" type="button" aria-label="Phần ${index + 1}"${index === 0 ? ' aria-current="true"' : ''}></button>`
    ).join('\n');
    const body = `  <article class="story">
    <div class="reader-topbar">
      <a class="reader-back" href="../../" aria-label="Trở về">←</a>
      <h1 class="reader-top-title">${esc(story.title)}</h1>
      <span class="reader-top-count" aria-live="polite">1 / ${story.parts.length}</span>
${hasAudio ? `${listenToggle()}\n` : ''}${toggle}
    </div>
    <h1 class="story-title">${esc(story.title)}</h1>
    <p class="story-meta">${esc(story.byline)}${story.byline && story.date ? ' · ' : ''}${esc(story.date)}</p>
    <div class="reader-deck">
      <div class="reader-track">
${cardsHtml}
      </div>
      <div class="reader-dots">
${dotsHtml}
      </div>
    </div>
${nextStory ? `    <a class="reader-next-post" href="../${nextStory.slug}/">
      <span class="next-post-label">Tiếp theo</span>
      <span class="next-post-title">${esc(nextStory.title)}</span>
      <span class="next-post-arrow" aria-hidden="true">→</span>
    </a>` : ''}
${story.source ? `    <p class="story-source">Nguồn: <a href="${esc(story.source)}">Bài gốc</a></p>\n` : ''}  </article>
  <nav class="back-link"><a href="../../">← Tất cả truyện</a></nav>`;
    fs.writeFileSync(path.join(dir, 'index.html'), shell(story.title, body, '../../', true, false, story.lead, false, hasLogo));
  }

  // Topic index page: group stories by keyword topic.
  const groups = new Map(TOPICS.map((t) => [t.name, []]));
  groups.set(OTHER_TOPIC, []);
  for (const story of stories) groups.get(topicOf(story.title, story.lead)).push(story);
  const topicHtml = stories.length
    ? TOPICS.concat([{ name: OTHER_TOPIC }])
        .filter((t) => groups.get(t.name).length)
        .map((t) => {
          const cards = groups.get(t.name).map((story) => {
            const cover = story.cover
              ? `\n          <a class="story-cover-link" href="../posts/${story.slug}/"><img class="story-cover" src="${esc(story.cover.replace('../../', '../'))}" alt=""></a>`
              : '';
            return `        <article class="story-card">${cover}
          <h3 class="story-title"><a href="../posts/${story.slug}/">${esc(story.title)}</a></h3>
          <p class="story-meta">${esc(story.byline)}${story.byline && story.date ? ' · ' : ''}${esc(story.date)}</p>
        </article>`;
          }).join('\n');
          return `    <section class="topic">
      <h2 class="topic-title">${esc(t.name)}</h2>
      <div class="story-list">
${cards}
      </div>
    </section>`;
        }).join('\n')
    : `    <p class="empty-state">${EMPTY_STATE}</p>`;
  const topicBody = `  <h1 class="page-title">Tâm sự</h1>
  <p class="page-intro">Chuyện nhà, chuyện tình, chuyện đời — kể ra cho nhẹ lòng.</p>
${topicHtml}`;
  fs.mkdirSync(path.join(outDir, 'tam-su'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tam-su', 'index.html'), shell('Tâm sự — Termux.io.vn', topicBody, '../', false, false, TAM_SU_DESC, true, hasLogo));

  const heading = '  <h1 class="sr-only">Truyện</h1>\n';
  const list = stories.length
    ? `${heading}  <div class="feed-topbar">
    <div class="feed-left">${hasLogo ? `<img class="brand-mark" src="assets/logo.png?v=${assetVersion()}" alt="">` : ''}<span class="feed-brand">Termux.io.vn</span></div>
    <div class="feed-right"><span class="feed-count">1 / ${stories.length}</span><a class="feed-link" href="tam-su/">Tâm sự</a>
${listenToggle()}
${toggle}
    </div>
  </div>
  <div class="cover-feed">
${stories.map((story) => `    <section class="cover-slide">
${story.cover ? `      <img class="cover-image" src="${esc(story.cover.replace('../../', ''))}" alt="">\n` : ''}      <div class="cover-shade"></div>
      <div class="cover-content">
        <h2 class="cover-title">${esc(story.title)}</h2>
        <p class="cover-meta">${esc(story.byline)}${story.byline && story.date ? ' · ' : ''}${esc(story.date)}</p>
        <a class="cover-read" aria-label="Đọc: ${esc(story.title)}" href="posts/${story.slug}/">Đọc ngay</a>
      </div>
    </section>`).join('\n')}
  </div>
  <button class="feed-next" aria-label="Truyện tiếp" type="button">↓</button>`
    : `${heading}  <p class="empty-state">${EMPTY_STATE}</p>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), shell('Truyện', list, '', false, true, HOME_DESC, false, hasLogo));

  console.log(`Synced ${stories.length} story(ies) into ${outDir}`);
  return stories;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };
  syncStories({ dbPath: option('--db', DEFAULT_DB), outDir: option('--out', DEFAULT_OUT) });
}

module.exports = { syncStories, topicOf, sentences, storyParts, sentenceTexts, sentenceHash };
