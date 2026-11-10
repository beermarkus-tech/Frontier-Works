# Frontier Works — notes for Claude

2D factory-builder PWA, plain JS, no build step, hosted on GitHub Pages from `main` (root).
Owner is a non-developer who builds by prompting and checking results: explain changes in plain language, keep the game playable after every commit.

## Architecture
- Classic `<script>` files sharing one global scope, loaded in order: data → sim → render → ui → input → pwa → main. Top-level `const`/`let` are visible across files; don't redeclare names.
- Sim runs at fixed 20 ticks/s (`tick(0.05)` in `js/sim.js`). Belts hold one item per tile; `beltOrder` processes downstream first. Buildings push output only into belts/pipes pointing away from them; input is any belt/pipe pointing into them.
- Power: poles/generators link (max 5 nearest within range), consumers attach to nearest node in supply range. Demand > capacity trips the fuse (`trip` flag on nodes).
- Rendering: terrain baked once to a 2048² canvas; building sprites cached per zoom bucket (`getSprite`), animated parts drawn live in `drawLive`; belts/pipes stroked as batched Path2D with curves (`e.cin`).
- Debug hook: `window.__fw` (state, placeEnt, tick, entAt, ACT…).

## Rules
- **Bump `VERSION` in `sw.js` on every change** to shipped files, and add any new file to `ASSETS`, or installed players won't get it / it won't work offline.
- Balance data lives in `js/data.js` (`R(...)` recipes, `D(...)` buildings, `MS` milestones). Every milestone needs `b` and `r` arrays (normalized at load, but keep them explicit).
- Save format: `serialize()`/`load()` in `js/main.js`; keep old saves loading (add fields with defaults in `initEnt`).
- Original content only: own names, art (procedural canvas drawing) and recipes — don't copy assets or names from commercial games.
- Run `npm test` before committing.

## Known follow-ups
- Late tiers (6–10) are untested for pacing/balance.
- Faint seams can show between belt tiles at some zoom levels.
- Perf: ~2,000 entities fine; consider chunked rendering beyond that.
