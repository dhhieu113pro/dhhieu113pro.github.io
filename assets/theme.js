(function () {
  const KEY = 'blog-theme';
  const MODES = ['light', 'dark', 'auto'];
  const LABELS = { light: 'Sáng', dark: 'Tối', auto: 'Tự động' };

  function read() {
    try {
      const stored = localStorage.getItem(KEY);
      return MODES.includes(stored) ? stored : 'auto';
    } catch (error) {
      return 'auto';
    }
  }

  function apply(mode) {
    document.documentElement.dataset.theme = mode;
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-label', `Chế độ: ${LABELS[mode]}`);
    });
  }

  apply(read());

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.theme-toggle');
    if (!button) return;
    const next = MODES[(MODES.indexOf(read()) + 1) % MODES.length];
    try {
      localStorage.setItem(KEY, next);
    } catch (error) {
      /* storage unavailable: still switch for this page */
    }
    apply(next);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === KEY) apply(read());
  });
})();
