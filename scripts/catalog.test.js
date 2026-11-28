'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('published catalog has four documents with absolute mp3 URLs', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'catalog.json'), 'utf8'),
  );
  assert.equal(catalog.version, 1);
  assert.ok(catalog.documents.length >= 4);
  for (const doc of catalog.documents) {
    assert.ok(doc.id);
    assert.ok(doc.title);
    assert.ok(doc.sections.length > 0);
    for (const section of doc.sections) {
      assert.ok(Array.isArray(section.sentences));
      assert.ok(section.sentences.length > 0);
      for (const sentence of section.sentences) {
        assert.ok(sentence.text);
        assert.match(sentence.audio, /^https:\/\/termux\.io\.vn\/assets\/audio\//);
      }
    }
  }
});
