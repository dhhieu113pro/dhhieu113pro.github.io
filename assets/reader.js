(() => {
  'use strict';

  const SWIPE_MIN = 45;
  const controllers = [];
  let activeDeck = null;

  const phone = window.matchMedia('(max-width: 719px)');
  const syncFullscreen = () => document.body.classList.toggle('reader-fullscreen', phone.matches);
  phone.addEventListener('change', syncFullscreen);
  syncFullscreen();

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const entry = controllers.find((item) => item.deck === activeDeck)
      || (controllers.length === 1 ? controllers[0] : null);
    if (!entry) return;
    event.preventDefault();
    entry.goTo(entry.getIndex() + (event.key === 'ArrowRight' ? 1 : -1));
  });

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

    controllers.push({ deck, goTo, getIndex: () => index });
    deck.addEventListener('focusin', () => { activeDeck = deck; });

    dots.forEach((dot, i) => dot.addEventListener('click', () => {
      activeDeck = deck;
      goTo(i);
    }));

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
    });
    deck.addEventListener('pointerup', (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      deck.classList.remove('is-swiping');
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
      goTo(index + (dx < 0 ? 1 : -1));
    });
    const endSwipe = () => { pointerId = null; deck.classList.remove('is-swiping'); };
    deck.addEventListener('pointercancel', endSwipe);
    deck.addEventListener('lostpointercapture', endSwipe);

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
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    }
    const body = card.querySelector('.card-body');
    if (!body) return;
    const updateHint = () => {
      const more = body.scrollTop + body.clientHeight < body.scrollHeight - 4;
      card.classList.toggle('hint-visible', more);
    };
    body.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);
    updateHint();
  });
})();
