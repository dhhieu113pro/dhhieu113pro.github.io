'use strict';

function createListen({ sentences, cards, getIndex, goTo, toggle, storage, AudioCtor, reducedMotion = () => false }) {
  const audio = new AudioCtor();
  const prefetch = new AudioCtor();
  let ctx = { sentences, cards, getIndex, goTo, toggle };
  let playing = false;
  let current = -1;
  let token = 0;
  let wiredToggle = null;
  let gestureSeen = false;
  let disarm = null;

  const prefOn = () => {
    try { return storage.getItem('blog-listen') !== '0'; } catch (error) { return true; }
  };
  const paint = (on) => {
    const t = ctx.toggle;
    if (!t) return;
    t.setAttribute('aria-pressed', String(on));
    t.classList.toggle('listen-on', on);
  };
  const clearHighlights = () => ctx.sentences.forEach((s) => s.classList.remove('playing'));
  const cardOf = (el) => ctx.cards.indexOf(el.closest('.reader-card'));

  function playFrom(i) {
    if (!playing) return;
    if (i >= ctx.sentences.length) { stopListen(); return; }
    current = i;
    clearHighlights();
    const el = ctx.sentences[i];
    el.classList.add('playing');
    const cardIndex = cardOf(el);
    if (cardIndex >= 0 && cardIndex !== ctx.getIndex()) ctx.goTo(cardIndex);
    const card = cardIndex >= 0 ? ctx.cards[cardIndex] : null;
    const body = card && card.querySelector('.card-body');
    if (body && typeof body.scrollTo === 'function') {
      // offsetTop is relative to the nearest positioned ancestor, so measure
      // against the body itself when the real DOM is available.
      const top = typeof el.getBoundingClientRect === 'function' && typeof body.getBoundingClientRect === 'function'
        ? el.getBoundingClientRect().top - body.getBoundingClientRect().top + (body.scrollTop || 0)
        : (el.offsetTop || 0);
      body.scrollTo({
        top: Math.max(0, top - (body.clientHeight || 0) / 2),
        behavior: reducedMotion() ? 'auto' : 'smooth',
      });
    }
    audio.src = el.dataset.audio || '';
    const next = ctx.sentences[i + 1];
    prefetch.src = next ? next.dataset.audio || '' : '';
    const attempt = ++token;
    const result = audio.play();
    if (result && typeof result.catch === 'function') {
      result.catch(() => { if (playing && token === attempt) playFrom(i + 1); });
    }
  }

  audio.addEventListener('ended', () => { if (playing) playFrom(current + 1); });
  audio.addEventListener('error', () => { if (playing) playFrom(current + 1); });

  function noteGesture() {
    gestureSeen = true;
  }

  function arm() {
    if (disarm || playing || !prefOn()) return;
    if (typeof document === 'undefined') return;
    const handler = () => {
      disarm();
      noteGesture();
      if (prefOn()) startListen();
    };
    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('keydown', handler, true);
    disarm = () => {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('keydown', handler, true);
      disarm = null;
    };
  }

  function startListen() {
    if (playing) return;
    gestureSeen = true;
    playing = true;
    paint(true);
    let start = ctx.sentences.findIndex((s) => cardOf(s) === ctx.getIndex());
    if (start < 0) start = 0;
    playFrom(start);
  }

  function stopListen() {
    playing = false;
    token++;
    audio.pause();
    audio.src = '';
    prefetch.src = '';
    clearHighlights();
    paint(false);
  }

  function toggleListen() {
    if (playing) {
      stopListen();
      try { storage.setItem('blog-listen', '0'); } catch (error) { /* storage unavailable */ }
    } else {
      try { storage.setItem('blog-listen', '1'); } catch (error) { /* storage unavailable */ }
      startListen();
    }
  }

  function onNavigated(target) {
    if (!playing) return;
    let i = ctx.sentences.findIndex((s) => cardOf(s) === target);
    if (i < 0) i = 0;
    playFrom(i);
  }

  function wire(t) {
    if (!t || typeof t.addEventListener !== 'function') return;
    t.addEventListener('click', toggleListen);
    wiredToggle = t;
    paint(prefOn());
  }
  function unwire() {
    if (wiredToggle && typeof wiredToggle.removeEventListener === 'function') {
      wiredToggle.removeEventListener('click', toggleListen);
    }
    wiredToggle = null;
  }

  // A new page reuses this player's Audio elements. A playing queue re-anchors
  // to the new story; an idle one waits for a gesture unless this navigation
  // already carried one (SPA clicks call noteGesture).
  function bind(next) {
    unwire();
    ctx = { ...next };
    wire(ctx.toggle);
    if (prefOn()) {
      if (playing) {
        let start = ctx.sentences.findIndex((s) => cardOf(s) === ctx.getIndex());
        if (start < 0) start = 0;
        playFrom(start);
      } else if (gestureSeen) {
        startListen();
      } else {
        arm();
      }
    } else if (playing) {
      stopListen();
    }
  }

  function unbind() {
    // Keep the queue: the Audio element lives in the shell, so the current
    // story keeps playing while the reader browses other pages.
    unwire();
  }

  wire(ctx.toggle);

  return { startListen, stopListen, toggleListen, onNavigated, isPlaying: () => playing, bind, unbind, noteGesture, arm };
}

let listen = null;

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  listen = createListen({
    sentences: [], cards: [], getIndex: () => 0, goTo: () => {}, toggle: null,
    storage: window.localStorage,
    AudioCtor: window.Audio,
    reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  const SWIPE_MIN = 45;
  const controllers = [];
  let activeDeck = null;
  const phone = window.matchMedia('(max-width: 719px)');

  function init(signal) {
    controllers.length = 0;
    activeDeck = null;
    const opts = { signal };

    const syncFullscreen = () => document.body.classList.toggle('reader-fullscreen', phone.matches);
    phone.addEventListener('change', syncFullscreen, opts);
    syncFullscreen();

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const entry = controllers.find((item) => item.deck === activeDeck)
        || (controllers.length === 1 ? controllers[0] : null);
      if (!entry) return;
      event.preventDefault();
      entry.navigate(entry.getIndex() + (event.key === 'ArrowRight' ? 1 : -1));
    }, opts);

    let bound = false;

    function setup(deck) {
      const track = deck.querySelector('.reader-track');
      const cards = [...deck.querySelectorAll('.reader-card')];
      const dotsContainer = deck.querySelector('.reader-dots');
      const count = deck.parentElement.querySelector('.reader-count');
      const topCount = deck.parentElement.querySelector('.reader-top-count');
      const source = deck.parentElement.querySelector('.story-source');
      if (!track || !cards.length || !dotsContainer) return;

      const lastBody = cards[cards.length - 1].querySelector('.card-body');
      if (source && lastBody) lastBody.appendChild(source);

      const dots = [...dotsContainer.querySelectorAll('.reader-dot')];
      let index = 0;

      function render() {
        track.style.transform = `translateX(-${index * 100}%)`;
        if (count) count.textContent = `${index + 1} / ${cards.length}`;
        if (topCount) topCount.textContent = `${index + 1} / ${cards.length}`;
        dots.forEach((dot, i) => {
          if (i === index) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
        cards.forEach((card, i) => {
          if (i === index) {
            card.removeAttribute('inert');
            card.removeAttribute('aria-hidden');
          } else {
            card.setAttribute('inert', '');
            card.setAttribute('aria-hidden', 'true');
          }
        });
      }

      function goTo(target) {
        index = Math.max(0, Math.min(cards.length - 1, target));
        render();
      }

      function navigate(target) {
        goTo(target);
        if (listen) listen.onNavigated(target);
      }

      controllers.push({ deck, goTo, navigate, getIndex: () => index });
      deck.addEventListener('focusin', () => { activeDeck = deck; }, opts);

      if (!bound) {
        const toggle = document.querySelector('.listen-toggle');
        const sentences = [...document.querySelectorAll('.sentence[data-audio]')];
        if (toggle && sentences.length) {
          listen.bind({ sentences, cards, getIndex: () => index, goTo, toggle });
          bound = true;
        }
      }

      dots.forEach((dot, i) => dot.addEventListener('click', () => {
        activeDeck = deck;
        navigate(i);
      }, opts));

      let startX = 0;
      let startY = 0;
      let pointerId = null;
      deck.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        if (event.target.closest('a, button')) return;
        activeDeck = deck;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        deck.setPointerCapture(event.pointerId);
        deck.classList.add('is-swiping');
      }, opts);
      deck.addEventListener('pointerup', (event) => {
        if (event.pointerId !== pointerId) return;
        pointerId = null;
        deck.classList.remove('is-swiping');
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
        navigate(index + (dx < 0 ? 1 : -1));
      }, opts);
      const endSwipe = () => { pointerId = null; deck.classList.remove('is-swiping'); };
      deck.addEventListener('pointercancel', endSwipe, opts);
      deck.addEventListener('lostpointercapture', endSwipe, opts);

      deck.classList.add('reader-ready');
      render();
    }

    document.querySelectorAll('.reader-deck').forEach(setup);

    document.querySelectorAll('.reader-card').forEach((card) => {
      const img = card.querySelector('.card-image');
      if (img) {
        card.classList.add('skeleton');
        const done = () => card.classList.remove('skeleton');
        if (img.complete) done();
        else {
          img.addEventListener('load', done, { once: true, signal });
          img.addEventListener('error', done, { once: true, signal });
        }
      }
      const body = card.querySelector('.card-body');
      if (!body) return;
      const updateHint = () => {
        const more = body.scrollTop + body.clientHeight < body.scrollHeight - 4;
        card.classList.toggle('hint-visible', more);
      };
      body.addEventListener('scroll', updateHint, { passive: true, signal });
      window.addEventListener('resize', updateHint, opts);
      updateHint();
    });
  }

  function destroy() {
    if (listen) listen.unbind();
    controllers.length = 0;
    activeDeck = null;
    document.body.classList.remove('reader-fullscreen');
  }

  window.ReaderPage = { init, destroy, listen };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createListen };
