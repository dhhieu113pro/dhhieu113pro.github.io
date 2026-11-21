(() => {
  'use strict';

  const SWIPE_MIN = 45;

  function setup(deck) {
    const track = deck.querySelector('.reader-track');
    const cards = [...deck.querySelectorAll('.reader-card')];
    const controls = deck.parentElement.querySelector('.reader-controls');
    const count = deck.parentElement.querySelector('.reader-count');
    if (!track || !cards.length || !controls || !count) return;

    const prev = controls.querySelector('.reader-prev');
    const next = controls.querySelector('.reader-next');
    const dots = [...controls.querySelectorAll('.reader-dot')];
    let index = 0;

    function render() {
      track.style.transform = `translateX(-${index * 100}%)`;
      count.textContent = `${index + 1} / ${cards.length}`;
      prev.disabled = index === 0;
      next.disabled = index === cards.length - 1;
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }

    function goTo(target) {
      index = Math.max(0, Math.min(cards.length - 1, target));
      render();
    }

    prev.addEventListener('click', () => goTo(index - 1));
    next.addEventListener('click', () => goTo(index + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') goTo(index - 1);
      if (event.key === 'ArrowRight') goTo(index + 1);
    });

    let startX = 0;
    let startY = 0;
    let pointerId = null;
    deck.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      deck.setPointerCapture(event.pointerId);
    });
    deck.addEventListener('pointerup', (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
      goTo(index + (dx < 0 ? 1 : -1));
    });
    deck.addEventListener('pointercancel', () => { pointerId = null; });

    deck.classList.add('reader-ready');
    render();
  }

  document.querySelectorAll('.reader-deck').forEach(setup);
})();
