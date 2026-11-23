'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const HOME = require.resolve('../assets/home.js');

function loadHome(stored) {
  const store = new Map(stored === undefined ? [] : [['blog-listen', stored]]);
  const button = {
    attrs: {},
    classes: new Set(),
    handler: null,
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(type, fn) { if (type === 'click') this.handler = fn; },
    classList: {
      toggle(name, on) { if (on) button.classes.add(name); else button.classes.delete(name); },
    },
  };
  global.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  global.document = { querySelector: (selector) => (selector === '.listen-toggle' ? button : null) };
  global.window = {};
  delete require.cache[HOME];
  require(HOME);
  return { button, store };
}

test('home exposes an init/destroy lifecycle', () => {
  loadHome();
  assert.equal(typeof global.window.HomePage.init, 'function');
  assert.equal(typeof global.window.HomePage.destroy, 'function');
});

test('home listen toggle reflects the stored preference', () => {
  const { button } = loadHome('1');
  assert.equal(button.attrs['aria-pressed'], 'true');
  assert.equal(button.classes.has('listen-on'), true);
});

test('home listen toggle starts on when nothing is stored', () => {
  const { button } = loadHome(undefined);
  assert.equal(button.attrs['aria-pressed'], 'true');
  assert.equal(button.classes.has('listen-on'), true);
});

test('home listen toggle stays off after an explicit off', () => {
  const { button } = loadHome('0');
  assert.equal(button.attrs['aria-pressed'], 'false');
  assert.equal(button.classes.has('listen-on'), false);
});

test('clicking the home toggle flips and persists the preference', () => {
  const { button, store } = loadHome('0');
  button.handler();
  assert.equal(store.get('blog-listen'), '1');
  assert.equal(button.attrs['aria-pressed'], 'true');
  button.handler();
  assert.equal(store.get('blog-listen'), '0');
  assert.equal(button.attrs['aria-pressed'], 'false');
});
