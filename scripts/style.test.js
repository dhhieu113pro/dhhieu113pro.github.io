'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'style.css'), 'utf8');

test('card text uses the inherited sans-serif body font', () => {
  const rules = [...css.matchAll(/\.card-text\s*\{[^}]*\}/g)].map((m) => m[0]);
  assert.ok(rules.length, 'expected a .card-text rule');
  assert.ok(rules.every((r) => !/font-family/.test(r)), 'card text must not override the body font-family');
});

test('reader dots sit under the card image, not at the deck bottom', () => {
  const rule = css.match(/\.reader-deck\.reader-ready \.reader-dots\s*\{[^}]*\}/);
  assert.ok(rule, 'expected an enhanced reader-dots rule');
  assert.match(rule[0], /top:\s*calc\(46%/);
  assert.ok(!/bottom:\s*12px/.test(rule[0]), 'dots must not be pinned to the deck bottom');
});

test('no mini-player override moves the dots, and core affordances survive', () => {
  assert.ok(!/\.reader-dots\s*\{[^}]*bottom:\s*calc\(70px/.test(css));
  assert.match(css, /\.reader-dots\s*\{ display: none; \}/);
  const dot = css.match(/\.reader-dots \.reader-dot\s*\{[^}]*\}/);
  assert.ok(dot && /width:\s*24px/.test(dot[0]) && /height:\s*24px/.test(dot[0]));
  assert.match(css, /\.reader-dots \.reader-dot:focus-visible/);
});
