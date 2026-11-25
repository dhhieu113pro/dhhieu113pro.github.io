# Deploy tapviet as a static app at /tap-viet/ — design

**Date:** 2026-11-25

**Problem:** The user asked whether the worksheet generator needs a server and whether it can be deployed at `https://termux.io.vn/tap-viet`. `termux.io.vn` is served by GitHub Pages from `dhhieu113pro.github.io` (CNAME confirmed); `/tap-viet/` currently 404s.

**Findings:** `tapviet` is pure static HTML/CSS/ES modules. No `fetch`, XHR, storage, backend, external URLs or build step; `app.js` imports only `./src/lessons.js` and `./src/worksheet.js`. It already runs from any static file server (verified at `127.0.0.1:8000`). The pages repo's `scripts/sync.js` only deletes `posts/` and `assets/img/`, so a top-level `tap-viet/` folder survives story syncs. The blog's SPA link interception is loaded only by the blog HTML shell, not by the app, so it cannot hijack the app.

**Approach chosen (smallest complete change):** copy the five runtime files (`index.html`, `app.js`, `styles.css`, `src/lessons.js`, `src/worksheet.js`) into `tap-viet/` in the pages repo, unchanged. No server, no build, no redirect, no changes to the app or blog. Add one small `node:test` file that keeps the deployed bundle self-contained (all referenced files present, local relative paths, no blog SPA scripts). Document the deploy path in the pages README.

**Alternatives rejected:** GitHub Actions auto-sync between the two repos (extra machinery for a five-file app); a CNAME/subdomain (not requested); adding the app to `assets/` (sync script would not manage it and paths would be confusing).

**Verification:** `node --test scripts/*.test.js` in the pages repo; `npm test` in tapviet unchanged; after merge, `curl -I https://termux.io.vn/tap-viet/` and a browser load to confirm the app renders and module imports resolve.

**Risks:** copies can drift if the app changes later — the test only pins self-containment, not byte-for-byte parity with the source repo. GitHub Pages must serve `.js` with a JS MIME type for ES modules (standard behaviour, confirmed after deploy).
