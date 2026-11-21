(() => {
  'use strict';

  const feed = document.querySelector('.cover-feed');
  const count = document.querySelector('.feed-count');
  const next = document.querySelector('.feed-next');
  if (!feed || !count || !next) return;

  const slides = [...feed.querySelectorAll('.cover-slide')];
  if (!slides.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;

  function render() {
    count.textContent = `${index + 1} / ${slides.length}`;
    next.disabled = index === slides.length - 1;
  }

  function goTo(target) {
    const i = Math.max(0, Math.min(slides.length - 1, target));
    slides[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        index = slides.indexOf(entry.target);
        render();
      }
    }
  }, { root: feed, threshold: [0.6] });
  slides.forEach((slide) => observer.observe(slide));

  next.addEventListener('click', () => goTo(index + 1));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      goTo(index + 1);
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      goTo(index - 1);
    }
  });

  feed.classList.add('feed-ready');
  render();
})();
