'use strict';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const readListen = () => {
    try { return localStorage.getItem('blog-listen') !== '0'; } catch (error) { return true; }
  };

  function setupToggle(opts) {
    const listenButton = document.querySelector('.listen-toggle');
    if (!listenButton) return;
    const paint = (on) => {
      listenButton.setAttribute('aria-pressed', String(on));
      listenButton.classList.toggle('listen-on', on);
    };
    paint(readListen());
    listenButton.addEventListener('click', () => {
      const nextOn = !readListen();
      try {
        localStorage.setItem('blog-listen', nextOn ? '1' : '0');
      } catch (error) {
        /* storage unavailable: still switch for this page */
      }
      paint(nextOn);
    }, opts);
  }

  let observer = null;

  function init(signal) {
    const opts = { signal };
    setupToggle(opts);

    const feed = document.querySelector('.cover-feed');
    const count = document.querySelector('.feed-count');
    const next = document.querySelector('.feed-next');
    if (!feed || !count || !next) return;

    const slides = [...feed.querySelectorAll('.cover-slide')];
    if (!slides.length) return;

    slides.forEach((slide) => {
      const img = slide.querySelector('.cover-image');
      if (!img) return;
      slide.classList.add('skeleton');
      const done = () => slide.classList.remove('skeleton');
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true, signal });
        img.addEventListener('error', done, { once: true, signal });
      }
    });

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

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          index = slides.indexOf(entry.target);
          render();
        }
      }
    }, { root: feed, threshold: [0.6] });
    slides.forEach((slide) => observer.observe(slide));

    next.addEventListener('click', () => goTo(index + 1), opts);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        goTo(index + 1);
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goTo(index - 1);
      }
    }, opts);

    feed.classList.add('feed-ready');
    render();
  }

  function destroy() {
    if (observer) observer.disconnect();
    observer = null;
  }

  window.HomePage = { init, destroy };
}
