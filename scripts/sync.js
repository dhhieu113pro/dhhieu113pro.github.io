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

function shell(title, body, prefix) {
  const root = prefix || './';
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
<header class="site-header">
  <a class="site-title" href="${root}">Termux.io.vn</a>
  <nav class="site-nav">
    <a href="${root}">Truyện</a>
    <a href="https://github.com/dhhieu113pro">GitHub</a>
  </nav>
</header>
<main>
${body}
</main>
<footer class="site-footer">Termux.io.vn · Những câu chuyện đời thường</footer>
</body>
</html>
`;
}

function syncStories({ dbPath = DEFAULT_DB, outDir = DEFAULT_OUT } = {}) {
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

    const srcDir = path.join(path.dirname(dbPath), slug);
    const destDir = path.join(imgRoot, slug);
    fs.mkdirSync(destDir, { recursive: true });

    const parts = (Array.isArray(record.parts) ? record.parts : []).map((part) => {
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
      source: String(record.source || ''),
      date: fmtDate(record.createdAt || row.created_at),
      cover: (parts.find((part) => part.image) || {}).image || '',
      parts,
    });
  }

  for (const story of stories) {
    const dir = path.join(postsDir, story.slug);
    fs.mkdirSync(dir, { recursive: true });
    const partsHtml = story.parts.map((part) => `    <section class="part">
${part.image ? `      <img class="part-image" src="${esc(part.image)}" alt="">\n` : ''}      <p class="part-text">${esc(part.text)}</p>
    </section>`).join('\n');
    const body = `  <article class="story">
    <h1 class="story-title">${esc(story.title)}</h1>
    <p class="story-meta">${esc(story.byline)}${story.byline && story.date ? ' · ' : ''}${esc(story.date)}</p>
${story.cover ? `    <img class="story-cover" src="${esc(story.cover)}" alt="">\n` : ''}${partsHtml}
${story.source ? `    <p class="story-source">Nguồn: <a href="${esc(story.source)}">Bài gốc</a></p>\n` : ''}  </article>
  <nav class="back-link"><a href="../../">← Tất cả truyện</a></nav>`;
    fs.writeFileSync(path.join(dir, 'index.html'), shell(story.title, body, '../../'));
  }

  const list = stories.length
    ? `  <h1 class="page-title">Truyện</h1>
  <div class="story-list">
${stories.map((story) => `    <article class="story-card">
${story.cover ? `      <a class="story-cover-link" href="posts/${story.slug}/"><img class="story-cover" src="${esc(story.cover.replace('../../', ''))}" alt=""></a>\n` : ''}      <h2 class="story-title"><a href="posts/${story.slug}/">${esc(story.title)}</a></h2>
      <p class="story-meta">${esc(story.byline)}${story.byline && story.date ? ' · ' : ''}${esc(story.date)}</p>
    </article>`).join('\n')}
  </div>`
    : `  <h1 class="page-title">Truyện</h1>
  <p class="empty-state">${EMPTY_STATE}</p>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), shell('Truyện', list, ''));

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
