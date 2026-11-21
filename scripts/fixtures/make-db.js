'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function makeFixture({ dir, stories }) {
  fs.mkdirSync(path.join(dir, 'stories'), { recursive: true });
  const dbPath = path.join(dir, 'stories.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE stories (slug TEXT PRIMARY KEY, record TEXT NOT NULL, created_at TEXT NOT NULL);');
  const insert = db.prepare('INSERT INTO stories (slug, record, created_at) VALUES (?, ?, ?)');
  for (const s of stories) {
    insert.run(s.slug, JSON.stringify(s.record), s.record.createdAt || '');
    if (s.skipImage || !SLUG_RE.test(s.slug)) continue;
    const imgDir = path.join(dir, s.slug);
    fs.mkdirSync(imgDir, { recursive: true });
    for (const part of s.record.parts || []) {
      if (part.image) fs.writeFileSync(path.join(imgDir, part.image), 'fake-webp');
    }
  }
  db.close();
  return dbPath;
}

module.exports = { makeFixture };
