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
      // Audio now lives in the shell and survives navigation, so turning the
      // preference off here must also stop a story that is still playing.
      if (!nextOn && typeof window.ReaderPage !== 'undefined' && window.ReaderPage.listen) {
        window.ReaderPage.listen.stopListen();
      }
    }, opts);
  }

  function init(signal) {
    const opts = { signal };
    setupToggle(opts);

    const feed = document.querySelector('.cover-feed');
    const count = document.querySelector('.feed-count');
    const next = document.querySelector('.feed-next');
    if (!feed || !count) return;

    const slides = [...feed.querySelectorAll('.cover-slide')];
    if (!slides.length) return;
    count.textContent = `${slides.length} truyện`;
    if (next) next.hidden = true;

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

  }

  function destroy() {}

  window.HomePage = { init, destroy };
}
