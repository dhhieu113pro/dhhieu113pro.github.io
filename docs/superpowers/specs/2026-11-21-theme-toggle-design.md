# Theme toggle design

## Intent

Add a light / dark / auto theme switch to the site UI, reachable from both the home cover feed and the post reader top bar.

## Goals

- 44px icon button in both top bars, cycling Sáng → Tối → Tự động.
- Sun / moon / half-circle SVG icons, no emoji, with an accessible label.
- Auto follows the device `prefers-color-scheme` (an OS sunset schedule drives it).
- Choice persisted in `localStorage` and applied before CSS loads to avoid a flash.
- No dependencies; no change to story content or navigation.

## Non-goals

- No clock/location-based sunset calculation.
- No per-page theme, no extra settings screen.

## Constraints

- `scripts/sync.js` is the only writer of HTML.
- CSS tokens are keyed on `<html data-theme="light|dark|auto">`.
- `assets/theme.js` owns the click/persistence; a tiny inline head script applies the stored value before CSS.
- Asset URLs keep the content-hash cache buster; `theme.js` joins the hash set.
- Node tests plus pwterm verification.

## Approaches

- **A (chosen): shared theme.js + early inline script + data-theme tokens.** No framework, works offline, no FOUC.
- B: CSS-only checkbox hack. Can't persist or set three states cleanly — rejected.
- C: apply theme after DOMContentLoaded. Causes a flash of the wrong theme — rejected.

## Decisions

- localStorage key: `blog-theme`; values `light`, `dark`, `auto`; default `auto`.
- Inline head script wraps localStorage access in try/catch so privacy modes don't break rendering.
- Auto uses the existing `@media (prefers-color-scheme: dark)` rules scoped to `[data-theme="auto"]`.
- Toggle button is `aria-label="Chế độ: Sáng|Tối|Tự động"` updated by JS.

## What's left to the builder

- Exact icon paths and token tuning within the existing theme palette.
- Verify with pwterm that cycling changes colors, persists across reload, and auto follows emulated color scheme.
