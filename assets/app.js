'use strict';

function shouldIntercept(anchor, location) {
  if (!anchor || !anchor.href || !location) return false;
  if (anchor.target || anchor.download) return false;
  const href = anchor.href;
  if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return false;
  if (anchor.origin && anchor.origin !== location.origin) return false;
  return true;
}

function pageFor(root) {
  if (!root) return null;
  if (root.querySelector('.reader-deck')) return 'reader';
  if (root.querySelector('.cover-feed')) return 'home';
  return null;
}

function swapDocument(currentDoc, nextDoc) {
  const main = currentDoc.querySelector('main');
  const nextMain = nextDoc.querySelector('main');
  if (main && nextMain) main.innerHTML = nextMain.innerHTML;
  const title = currentDoc.querySelector('title');
  const nextTitle = nextDoc.querySelector('title');
  if (title && nextTitle) title.textContent = nextTitle.textContent;
  const meta = currentDoc.querySelector('meta[name="description"]');
  const nextMeta = nextDoc.querySelector('meta[name="description"]');
  if (meta && nextMeta) meta.content = nextMeta.content;
  if (currentDoc.body && nextDoc.body) currentDoc.body.className = nextDoc.body.className;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let active = null;
  let controller = null;

  function deactivate() {
    if (active === 'reader' && typeof window.ReaderPage !== 'undefined') window.ReaderPage.destroy();
    if (active === 'home' && typeof window.HomePage !== 'undefined') window.HomePage.destroy();
    if (controller) controller.abort();
    controller = null;
    active = null;
  }

  function activate() {
    deactivate();
    controller = new AbortController();
    const type = pageFor(document.querySelector('main'));
    if (type === 'reader' && typeof window.ReaderPage !== 'undefined') window.ReaderPage.init(controller.signal);
    if (type === 'home' && typeof window.HomePage !== 'undefined') window.HomePage.init(controller.signal);
    active = type;
    window.scrollTo(0, 0);
  }

  function navigate(href, push) {
    fetch(href)
      .then((response) => response.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        swapDocument(document, doc);
        if (push) history.pushState({}, '', href);
        activate();
      })
      .catch(() => { window.location.href = href; });
  }

  document.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const link = target.closest('a[href]');
    if (!link || !shouldIntercept(link, location)) return;
    event.preventDefault();
    navigate(link.href, true);
  });

  window.addEventListener('popstate', () => navigate(location.href, false));

  if (document.readyState !== 'loading') activate();
  else document.addEventListener('DOMContentLoaded', activate, { once: true });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { shouldIntercept, pageFor, swapDocument };
}
