'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_DB = path.join(os.homedir(), '.pwterm', 'stories', 'stories.sqlite');
const DEFAULT_OUT = path.resolve(__dirname, '..');
const EMPTY_STATE = 'Chưa có câu chuyện nào.';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

function shell(title, body, prefix, lockZoom = false, bare = false) {
  const root = prefix || './';
  const viewport = lockZoom
    ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    : 'width=device-width, initial-scale=1';
  const chrome = bare ? '' : `<header class="site-header">
  <a class="site-title" href="${root}">Termux.io.vn</a>
  <nav class="site-nav">
    <a href="${root}">Truyện</a>
    <a href="https://github.com/dhhieu113pro">GitHub</a>
  </nav>
</header>`;
  const footer = bare ? '' : '<footer class="site-footer">Termux.io.vn · Những câu chuyện đời thường</footer>';
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="${viewport}">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body${bare ? ' class="home-picker"' : ''}>
${chrome}
<main>
${body}
</main>
${footer}
</body>
</html>
`;
}

function syncStories({ dbPath = DEFAULT_DB, outDir = DEFAULT_OUT } = {}) {
  if (!fs.existsSync(dbPath)) throw new Error(`database not found: ${dbPath}`);
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

    const parts = (Array.isArray(record.parts) ? record.parts : [])
      .filter((part) => part && part.kind !== 'begin')
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
      title: String(record.title || ''),
      byline: String(record.byline || ''),
      source: /^https?:\/\//i.test(String(record.source || '')) ? String(record.source) : '',
      date: fmtDate(record.createdAt || row.created_at),
      cover: (parts.find((part) => part.image) || {}).image || '',
      parts,
    });
  }

  for (const story of stories) {
    const dir = path.join(postsDir, story.slug);
    fs.mkdirSync(dir, { recursive: true });
    const cardsHtml = story.parts.map((part) => `      <section class="reader-card">
        <div class="card-media">${part.image ? `<img class="card-image" src="${esc(part.image)}" alt="">` : ''}</div>
        <div class="card-body"><p class="card-text">${esc(part.text)}</p></div>
      </section>`).join('\n');
    const dotsHtml = story.parts.map((part, index) =>
      `        <button class="reader-dot" type="button" aria-label="Phần ${index + 1}"${index === 0 ? ' aria-current="true"' : ''}></button>`
    ).join('\n');
    const body = `  <article class="story">
    <div class="reader-topbar">
      <a class="reader-back" href="../../" aria-label="Trở về">←</a>
      <h1 class="reader-top-title">${esc(story.title)}</h1>
      <span class="reader-top-count">1 / ${story.parts.length}</span>
    </div>
    <h1 class="story-title">${esc(story.title)}</h1>
    <p class="story-meta">${esc(story.byline)}${story.byline && story.date ? ' · ' : ''}${esc(story.date)}</p>
    <div class="reader-deck">
      <div class="reader-track">
${cardsHtml}
      </div>
    </div>
    <div class="reader-controls">
      <button class="reader-prev" aria-label="Phần trước" type="button" disabled>←</button>
      <div class="reader-dots">
${dotsHtml}
      </div>
      <button class="reader-next" aria-label="Phần sau" type="button">→</button>
    </div>
    <p class="reader-count" aria-live="polite">1 / ${story.parts.length}</p>
${story.source ? `    <p class="story-source">Nguồn: <a href="${esc(story.source)}">Bài gốc</a></p>\n` : ''}  </article>
  <nav class="back-link"><a href="../../">← Tất cả truyện</a></nav>
  <script src="../../assets/reader.js" defer></script>`;
    fs.writeFileSync(path.join(dir, 'index.html'), shell(story.title, body, '../../', true));
  }

  const list = stories.length
    ? `  <div class="post-grid">
${stories.map((story) => `    <a class="post-tile" href="posts/${story.slug}/">
${story.cover ? `      <img class="tile-image" src="${esc(story.cover.replace('../../', ''))}" alt="">\n` : ''}      <div class="tile-caption">
        <h2 class="tile-title">${esc(story.title)}</h2>
        <span class="tile-date">${esc(story.date)}</span>
      </div>
    </a>`).join('\n')}
  </div>`
    : `  <p class="empty-state">${EMPTY_STATE}</p>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), shell('Truyện', list, '', false, true));

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

module.exports = { syncStories };
