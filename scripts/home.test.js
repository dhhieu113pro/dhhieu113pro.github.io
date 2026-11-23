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
    listenerCount: 0,
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(type, fn) { if (type === 'click') { this.handler = fn; this.listenerCount++; } },
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
  global.window.HomePage.init(new AbortController().signal);
  return { button, store };
}

function loadFeed() {
  const store = new Map();
  const listen = {
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener() {},
    classList: { toggle() {} },
  };
  const slides = [0, 1].map(() => ({
    classList: { add() {}, remove() {} },
    querySelector: (s) => (s === '.cover-image' ? { complete: true } : null),
  }));
  const feed = {
    classes: new Set(),
    classList: {
      add: (name) => feed.classes.add(name),
      contains: (name) => feed.classes.has(name),
    },
    querySelectorAll: (s) => (s === '.cover-slide' ? slides : []),
  };
  const count = { textContent: '' };
  const next = { hidden: false };
  let keydownListeners = 0;
  let observers = 0;
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  global.document = {
    querySelector: (selector) => ({
      '.listen-toggle': listen,
      '.cover-feed': feed,
      '.feed-count': count,
      '.feed-next': next,
    })[selector] || null,
    addEventListener: (type) => { if (type === 'keydown') keydownListeners++; },
  };
  global.window = {
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: class { constructor() { observers++; } observe() {} disconnect() {} },
  };
  delete require.cache[HOME];
  require(HOME);
  global.window.HomePage.init(new AbortController().signal);
  return { feed, count, next, get keydownListeners() { return keydownListeners; }, get observers() { return observers; } };
}

test('home shows a story total and no swipe machinery', () => {
  const h = loadFeed();
  assert.equal(h.count.textContent, '2 truyện');
  assert.equal(h.feed.classList.contains('feed-ready'), false);
  assert.equal(h.next.hidden, true);
  assert.equal(h.observers, 0);
  assert.equal(h.keydownListeners, 0);
});

test('home toggle is wired once, so one click is one toggle', () => {
  const { button } = loadHome('1');
  assert.equal(button.listenerCount, 1);
});

test('turning listening off on home stops the persistent player', () => {
  const { button } = loadHome('1');
  let stopped = 0;
  global.window.ReaderPage = { listen: { stopListen: () => { stopped++; } } };
  button.handler();
  assert.equal(stopped, 1);
});

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
