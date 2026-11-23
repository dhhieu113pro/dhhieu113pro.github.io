'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { shouldIntercept, pageFor, swapDocument } = require('../assets/app.js');

const HERE = new URL('https://termux.io.vn/');
const anchor = (overrides = {}) => ({
  href: 'https://termux.io.vn/posts/x/',
  target: '',
  download: undefined,
  origin: 'https://termux.io.vn',
  ...overrides,
});

test('spa: a plain same-origin link is intercepted', () => {
  assert.equal(shouldIntercept(anchor(), HERE), true);
});

test('spa: target, download and non-left modifiers are skipped', () => {
  assert.equal(shouldIntercept(anchor({ target: '_blank' }), HERE), false);
  assert.equal(shouldIntercept(anchor({ download: 'file' }), HERE), false);
  assert.equal(shouldIntercept(anchor({ download: '' }), HERE), true);
});

test('spa: hash, mailto, tel and javascript links are skipped', () => {
  for (const href of ['#section', 'mailto:a@b.co', 'tel:+123', 'javascript:void(0)']) {
    assert.equal(shouldIntercept(anchor({ href }), HERE), false, href);
  }
});

test('spa: a different origin is skipped', () => {
  assert.equal(shouldIntercept(anchor({ origin: 'https://example.com', href: 'https://example.com/x' }), HERE), false);
});

test('spa: pageFor picks the page type from the swapped main', () => {
  assert.equal(pageFor({ querySelector: (s) => (s === '.reader-deck' ? {} : null) }), 'reader');
  assert.equal(pageFor({ querySelector: (s) => (s === '.cover-feed' ? {} : null) }), 'home');
  assert.equal(pageFor({ querySelector: () => null }), null);
});

function makeDoc(mainHtml, title, description, bodyClass) {
  const main = { innerHTML: mainHtml };
  const titleEl = { textContent: title };
  const meta = { content: description };
  return {
    body: { className: bodyClass },
    querySelector(selector) {
      if (selector === 'main') return main;
      if (selector === 'title') return titleEl;
      if (selector === 'meta[name="description"]') return meta;
      return null;
    },
  };
}

test('spa: swapDocument copies main, title, description and body class', () => {
  const current = makeDoc('old main', 'Old', 'old desc', 'home-picker');
  const next = makeDoc('<div>new</div>', 'New', 'new desc', '');
  swapDocument(current, next);
  assert.equal(current.querySelector('main').innerHTML, '<div>new</div>');
  assert.equal(current.querySelector('title').textContent, 'New');
  assert.equal(current.querySelector('meta[name="description"]').content, 'new desc');
  assert.equal(current.body.className, '');
});
