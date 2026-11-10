# Frontier Works — notes for Claude (read first)

2D factory-builder PWA, plain JS, no build step, hosted on GitHub Pages from `main` (root).
Owner is Markus, a non-developer who builds by prompting and checking results: explain changes in plain language,
and keep the game playable after every commit.
**Git: commit and push straight to `main`. No side branches or pull requests (Markus decided this in Session 2).**

## How to work in this repo (every session)
**Start of session**
1. Read `docs/BUILD_LOG.md`, at least the latest session's "Known issues", "Next up" and "Open questions".
2. Skim `docs/DESIGN.md` for the rules of the game before changing mechanics.
3. Run `npm test` to confirm the baseline is green.

**During the session**
- `docs/DESIGN.md` = what the game *is*. Change it only when Markus agrees a design decision, and say so in the log.
- `js/data.js` = the exact numbers. DESIGN.md explains structure and intent, not every value.
- Ask Markus before big design changes (new systems, removing features, breaking saves). Small fixes and polish: just do them.

**End of session**
1. Append a new `## Session N — date` entry to `docs/BUILD_LOG.md`: what was asked, what was built, decisions and why,
   what was verified, known issues, next up, open questions. Never edit old entries.
2. Bump `VERSION` in `sw.js` if any shipped file changed. Run `npm test`. Commit and push.
3. Tell Markus in two or three plain sentences what changed and what to try on his phone.

## Architecture
- Classic `<script>` files sharing one global scope, loaded in order: data → sim → render → ui → plan → view3d → input → pwa → main (Three.js is injected by `view3d.js` on first 3D use). Top-level `const`/`let` are visible across files; don't redeclare names.
- Sim runs at fixed 20 ticks/s (`tick(0.05)` in `js/sim.js`). Belts hold one item per tile; `beltOrder` processes downstream first. Buildings push output only into belts/pipes pointing away from them; input is any belt/pipe pointing into them.
- Power: poles/generators link (max 5 nearest within range), consumers attach to nearest node in supply range. Demand > capacity trips the fuse (`trip` flag on nodes).
- Map: `MW`/`MH` are variables (128 for old saves, `MAP_NEW`=384 for new). `genClassic` must never change (old saves rely on it); biome maps use `genBiome` + `BIOMES` in `data.js`.
- Rendering: terrain painted on demand in 32×32-tile chunks (`getChunk`/`bakeChunk`, LRU cache, ~8 ms paint budget per frame) plus a small overview `terrO`
  (minimap, far zoom, far 3D ground); all random terrain detail is hashed per tile so chunks match, and 3D uses the same chunks near the camera; building sprites cached per zoom bucket (`getSprite`), animated parts drawn live in `drawLive`; belts/pipes stroked as batched Path2D with curves (`e.cin`).
- Planner (`js/plan.js`): pure functions `plFwd(f)` / `plRev(item,rate,pick)` over `RC`/`B`; UI state `PL` in localStorage `frontierworks_plan`.
- 3D view (`js/view3d.js`): world = tile units, tile (x,y) → (x, h, y), north = −z. Models are part lists in `v3Models()` (static parts merged per type,
  animated parts as own InstancedMesh). `v3Layout()` rebuilds instances when `v3Sig()` changes; `v3Anim/v3Items/v3Smoke` run per frame.
  Input reuses `tap()`, `linePath()`, `buildPath()`. **A new building type needs a 3D model in `v3Models()` too**, or it won't show in 3D.
  Three.js is r149 on purpose: the last release with a classic-script build (`THREE` global), matching our no-module setup.
- Debug hook: `window.__fw` (state, placeEnt, tick, entAt, ACT…).

## Rules
- **Build number on every push:** set `BUILD` in `js/pwa.js` to the commit count on `main` after your commit (`git rev-list --count HEAD` + 1 before committing; one push = one commit is simplest), and `VERSION` in `sw.js` to `'fw-build-<BUILD>'` (the test checks they match). Tell Markus the build number; he compares it with ☰ Menu (top right of the panel).
- **Bump `VERSION` in `sw.js` on every change** to shipped files, and add any new file to `ASSETS`, or installed players won't get it / it won't work offline.
- Balance data lives in `js/data.js` (`R(...)` recipes, `D(...)` buildings, `MS` milestones). Every milestone needs `b` and `r` arrays (normalized at load, but keep them explicit).
- Save format: `serialize()`/`load()` in `js/main.js`; keep old saves loading (add fields with defaults in `initEnt`).
- Original content only: own names, art (procedural canvas drawing) and recipes — don't copy assets or names from commercial games.
- Run `npm test` before committing, and **check it printed PASS lines with no FAIL or crash** before you commit (don't chain commit/push after the test with `;`). Each run uses a new random map, so test setups must search for dry land (`canPlace('incin',…)`), not just any free tile.

## Known follow-ups
- Late tiers (6–10) are untested for pacing/balance.
- Faint seams can show between belt tiles at some zoom levels.
- Perf: ~2,000 entities fine; consider chunked rendering beyond that.
