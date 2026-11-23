'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createListen } = require('../assets/reader.js');

class FakeAudio {
  constructor() {
    this.handlers = {};
    this.src = '';
    this.plays = 0;
    this.paused = false;
    FakeAudio.instances.push(this);
  }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  emit(type) { this.handlers[type] && this.handlers[type](); }
  play() {
    this.plays++;
    return this.rejectPlay ? Promise.reject(new Error('blocked')) : Promise.resolve();
  }
  pause() { this.paused = true; }
}

function sentence(card, src) {
  const classes = new Set();
  return {
    dataset: { audio: src },
    closest: () => card,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    classes,
  };
}

function harness(n = 3, stored = undefined) {
  FakeAudio.instances = [];
  const scrolls = [];
  const cards = [];
  const sentences = [];
  for (let c = 0; c < 2; c++) {
    const body = { clientHeight: 100, scrollTo: (o) => scrolls.push(o) };
    const card = { querySelector: (sel) => (sel === '.card-body' ? body : null) };
    cards.push(card);
    sentences.push(sentence(card, `audio/${c}-0.mp3`));
    sentences.push(sentence(card, `audio/${c}-1.mp3`));
  }
  const attrs = {};
  const classes = new Set();
  const toggle = {
    attrs,
    classes,
    setAttribute: (key, value) => { attrs[key] = value; },
    classList: { toggle: (name, on) => { if (on) classes.add(name); else classes.delete(name); } },
    addEventListener() {},
  };
  const store = new Map(stored === undefined ? [] : [['blog-listen', stored]]);
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  let index = 0;
  const api = createListen({
    sentences,
    cards,
    getIndex: () => index,
    goTo: (target) => { index = target; },
    toggle,
    storage,
    AudioCtor: FakeAudio,
    reducedMotion: () => true,
  });
  return { api, sentences, cards, toggle, store, scrolls, audio: () => FakeAudio.instances[0], setIndex: (i) => { index = i; }, count: n };
}

test('listen: a stored preference at load never starts playback', () => {
  const h = harness(3, '1');
  assert.equal(h.toggle.attrs['aria-pressed'], 'true');
  assert.equal(FakeAudio.instances.every((a) => a.plays === 0), true);
});

test('listen: no stored preference paints the toggle on', () => {
  const h = harness();
  assert.equal(h.toggle.attrs['aria-pressed'], 'true');
  assert.equal(h.sentences.some((s) => s.classes.has('playing')), false);
});

test('listen: starting highlights the first sentence of the visible card and plays', () => {
  const h = harness();
  h.api.startListen();
  assert.equal(h.sentences[0].classes.has('playing'), true);
  assert.equal(h.audio().plays, 1);
  assert.equal(h.audio().src, 'audio/0-0.mp3');
  assert.equal(h.toggle.attrs['aria-pressed'], 'true');
});

test('listen: ended moves the highlight to the next sentence', () => {
  const h = harness();
  h.api.startListen();
  h.audio().emit('ended');
  assert.equal(h.sentences[0].classes.has('playing'), false);
  assert.equal(h.sentences[1].classes.has('playing'), true);
  assert.equal(h.audio().plays, 2);
});

test('listen: manual navigation restarts from the new card first sentence', () => {
  const h = harness();
  h.api.startListen();
  h.api.onNavigated(1);
  assert.equal(h.sentences[2].classes.has('playing'), true);
  assert.equal(h.audio().src, 'audio/1-0.mp3');
});

test('listen: a rejected play advances without a stuck highlight', async () => {
  const h = harness();
  h.api.startListen();
  h.audio().rejectPlay = true;
  h.audio().emit('ended');
  await Promise.resolve();
  assert.equal(h.sentences[0].classes.has('playing'), false);
  assert.equal(h.sentences[2].classes.has('playing'), true);
});

test('listen: a broken file is skipped and playback continues', () => {
  const h = harness();
  h.api.startListen();
  h.audio().emit('error');
  assert.equal(h.sentences[1].classes.has('playing'), true);
});

test('listen: the end of the queue stops and clears every highlight', () => {
  const h = harness();
  h.api.startListen();
  for (let i = 0; i < h.sentences.length; i++) h.audio().emit('ended');
  assert.equal(h.sentences.some((s) => s.classes.has('playing')), false);
  assert.equal(h.audio().paused, true);
  assert.equal(h.toggle.attrs['aria-pressed'], 'false');
});

test('listen: unbind keeps the same audio element playing', () => {
  const h = harness();
  h.api.startListen();
  const audio = h.audio();
  h.api.unbind();
  assert.equal(h.api.isPlaying(), true);
  assert.equal(h.audio(), audio);
  assert.equal(audio.paused, false);
});

test('listen: bind to a new page reuses the audio element and re-anchors', () => {
  const h = harness(3, '1');
  h.api.startListen();
  const audio = h.audio();
  const fresh = harness(3, '1');
  h.api.bind({
    sentences: fresh.sentences,
    cards: fresh.cards,
    getIndex: () => 0,
    goTo: () => {},
    toggle: fresh.toggle,
  });
  assert.equal(audio.plays, 2);
  assert.equal(audio.paused, false);
  assert.equal(fresh.sentences[0].classes.has('playing'), true);
});

test('listen: unbind keeps the queue so playback continues while browsing', () => {
  const h = harness();
  h.api.startListen();
  h.api.unbind();
  h.audio().emit('ended');
  assert.equal(h.api.isPlaying(), true);
  assert.equal(h.sentences[1].classes.has('playing'), true);
});

test('listen: bind after a gesture starts playback without another tap', () => {
  const h = harness(3, '1');
  const audio = h.audio();
  const fresh = harness(3, '1');
  h.api.noteGesture();
  h.api.bind({
    sentences: fresh.sentences,
    cards: fresh.cards,
    getIndex: () => 0,
    goTo: () => {},
    toggle: fresh.toggle,
  });
  assert.equal(audio.plays, 1);
  assert.equal(fresh.sentences[0].classes.has('playing'), true);
});

test('listen: toggle off clears playback and stores the off preference', () => {
  const h = harness(3, '1');
  h.api.toggleListen();
  assert.equal(h.audio().plays, 1);
  h.api.toggleListen();
  assert.equal(h.store.get('blog-listen'), '0');
  assert.equal(h.audio().paused, true);
  assert.equal(h.sentences.some((s) => s.classes.has('playing')), false);
});
