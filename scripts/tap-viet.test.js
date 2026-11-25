'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'tap-viet');
const RUNTIME = [
  'index.html',
  'app.js',
  'styles.css',
  'src/lessons.js',
  'src/worksheet.js',
  'src/font.js',
  'assets/tieuhoc-vn.ttf',
];

test('tap-viet: all runtime files are deployed and non-empty', () => {
  for (const file of RUNTIME) {
    const target = path.join(APP, file);
    assert.ok(fs.existsSync(target), `missing ${file}`);
    assert.ok(fs.statSync(target).size > 0, `empty ${file}`);
  }
});

test('tap-viet: html references only local relative assets that exist', () => {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(!/^([a-z]+:|\/\/)/i.test(ref), `external ref ${ref}`);
    assert.ok(fs.existsSync(path.join(APP, ref)), `missing ref ${ref}`);
  }
  assert.ok(!html.includes('assets/app.js'), 'blog SPA must not be loaded in the app');
});

test('tap-viet: module imports resolve inside the folder', () => {
  for (const file of ['app.js', 'src/worksheet.js']) {
    const code = fs.readFileSync(path.join(APP, file), 'utf8');
    for (const match of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      assert.ok(fs.existsSync(path.resolve(APP, path.dirname(file), match[1])), `${file} -> ${match[1]}`);
    }
  }
});

test('tap-viet: story sync never deletes the deployed app', () => {
  const sync = fs.readFileSync(path.join(ROOT, 'scripts/sync.js'), 'utf8');
  const removals = [...sync.matchAll(/rmSync\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(removals.length > 0);
  for (const removal of removals) assert.ok(!removal.includes('tap-viet'), removal);
});

test('tap-viet: deployed page has the grouped settings sidebar', () => {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  assert.match(html, /<aside class="settings">/);
  assert.match(html, /id="style" class="segmented"/);
  const app = fs.readFileSync(path.join(APP, 'app.js'), 'utf8');
  assert.match(app, /button\.active/);
});

test('tap-viet: typographic baseline is on the guideline and declared', () => {
  const js = fs.readFileSync(path.join(APP, 'src/worksheet.js'), 'utf8');
  assert.match(js, /7\.38 \+ rowHeight;/);
  assert.match(js, /data-baseline=/);
});

test('tap-viet: font guide dashes are separated from letter ink', () => {
  const font = fs.readFileSync(path.join(APP, 'src/font.js'), 'utf8');
  const js = fs.readFileSync(path.join(APP, 'src/worksheet.js'), 'utf8');
  const lessons = fs.readFileSync(path.join(APP, 'src/lessons.js'), 'utf8');
  assert.match(font, /guideDots/);
  assert.match(js, /class="ink"/);
  assert.match(js, /stroke-width="0\.34"/);
  assert.match(lessons, /VIETNAMESE_LESSONS/);
});
