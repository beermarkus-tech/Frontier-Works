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
- **Markus's standing preference (Session 31): when Claude offers options with a recommendation, use the recommendation** unless he says otherwise.
  Still describe big changes briefly first, then build with the suggested defaults.

**End of session**
1. Append a new `## Session N — date` entry to `docs/BUILD_LOG.md`: what was asked, what was built, decisions and why,
   what was verified, known issues, next up, open questions. Never edit old entries.
2. Bump `VERSION` in `sw.js` if any shipped file changed. Run `npm test`. Commit and push.
3. Tell Markus in two or three plain sentences what changed and what to try on his phone.

## Architecture
- Classic `<script>` files sharing one global scope, loaded in order: data → sim → render → ui → plan → zones → blueprint → view3d → input → pwa → audio → sync → main (Three.js is injected by `view3d.js` on first 3D use). Top-level `const`/`let` are visible across files; don't redeclare names.
- Sim runs at fixed 20 ticks/s (`tick(0.05)` in `js/sim.js`). Belts hold one item per tile; `beltOrder` processes downstream first. Buildings push output only into belts/pipes pointing away from them; input is any belt/pipe pointing into them.
- Power: wires are saved per node (`e.pl` = corners of linked poles/generators/switches, both ends). A new node wires itself to the nearest node in range
  (`pnAuto`); removing/moving one rewires orphans and bridges splits (`pnHeal`). Old saves without `S.pw2` are reduced once to a spanning tree (`pnMigrate`).
  Power Switch (`pswitch`, k 'pole', sup 0): `e.off` cuts its wires, `e.tx` = name. Consumers attach to the nearest node with supply range (`e.pnode`).
  Demand > capacity trips the fuse (`trip` flag on nodes).
- Map: `MW`/`MH` are variables (128 for old saves, `MAP_NEW`=384 for new). `genClassic` must never change (old saves rely on it); biome maps use `genBiome` + `BIOMES` in `data.js`.
- Rendering: terrain painted on demand in 32×32-tile chunks (`getChunk`/`bakeChunk`, LRU cache, ~8 ms paint budget per frame) plus a small overview `terrO`
  (minimap, far zoom, far 3D ground); all random terrain detail is hashed per tile so chunks match, and 3D uses the same chunks near the camera; building sprites cached per zoom bucket (`getSprite`), animated parts drawn live in `drawLive`; belts/pipes stroked as batched Path2D with curves (`e.cin`).
- Planner (`js/plan.js`): pure functions `plFwd(f)` / `plRev(item,rate,pick)` over `RC`/`B`; UI state `PL` in localStorage `frontierworks_plan`.
- 3D view (`js/view3d.js`): world = tile units, tile (x,y) → (x, h, y), north = −z. Models are part lists in `v3Models()` (static parts merged per type,
  animated parts as own InstancedMesh). `v3Layout()` rebuilds instances when `v3Sig()` changes; `v3Anim/v3Items/v3Smoke` run per frame.
  Input reuses `tap()`, `linePath()`, `buildPath()`. **A new building type needs a 3D model in `v3Models()` too**, or it won't show in 3D.
  Three.js is r149 on purpose: the last release with a classic-script build (`THREE` global), matching our no-module setup.
- Fluids: pipes have no direction; buildings attach only through Pipe Junction tiles. `buildNets()` (end of `rebuildTopo`) makes networks (`nets`, `e.net`, connection bitmask `e.pc`); `updNets(dt)` moves fluid
  between attached buildings and the network. Contents live on the network and are copied to tiles (`item`, `lv`) by `syncPipes()` for saves/rebuilds.
- Drone Pads (`k:'dpad'`): `updPad` in `js/sim.js`, state `e.dr` + route `e.lx/e.ly` (saved), list `pads` from `rebuildTopo`; drawn by `drawDrones` (2D) and `v3Drones` (3D). Numbers in `DRONE` (`js/data.js`).
- Cloud save (`js/sync.js`): private GitHub Gist (files fw-save.txt, fw-meta.json, fw-live.json, fw-backup.txt), state `SC` in localStorage `frontierworks_sync`
  (token, gist, dev, base). Upload only if cloud meta.ver/dev equals this device's base; otherwise auto-load or ask (rules in the file header).
  Tested against a fake GitHub (`page.route`) in `tests/smoke.js`.
- Factory zones (`js/zones.js`): per-tile `zoneMap` (Uint16, 0 = none), saved as run-length text `S.zmap`, zone list `S.zones` [{id,name,c}];
  `zoneDrop(a,b,cut)` adds/extends/cuts; `zoneRebuild()` makes outline edges, row runs and labels (`zoneVer` bumps). 2D `drawZoneTint/drawZoneFence`,
  3D `v3Zones`. Tool id `'zone'` (pseudo-building in the Signs tab).
- Sound (`js/audio.js`): Web Audio synthesis only (no files). `sfx(name)` plays an effect from `SFX` (gap throttling in `SFX_GAP`); buses
  music/sfx/mach under `AU.master`; volumes `OPT.vol`, `OPT.mute`. Context starts on the first tap/key (`auStart`).
- Blueprints (`js/blueprint.js`): Blueprint Station (`bpstation`, k 'bpst', 12×12, pw 2, Blueprints tab `bp` with the `bplist` button → panel 'bplib') holds free design pieces `e.dsg` [{d,x,y,dir,s}] (relative, saved, `e.dn` = name); building tools / `buildPath` inside a station call `dsgPlace`, Dismantle `dsgDelAt`, tapping a piece opens panel 'dsg'. Library `BPS` in localStorage `frontierworks_bp` (per device): `stSave`/`stLoad` (need power); building one = tool `'bppaste'` (`UI.bp`, outline at `UI.bpAt` starting mid-view, tap moves, `bpArm`/`bpGrab`/`bpDrag` long-press drag, bar `#bpbar` Rotate/Build here/Cancel via `bpBar`), `bpLayout`, `bpPaste` (pays, reports missing). Drawn by `drawStation` (live, not a sprite), `drawBpGhost`; 3D `stGhost3D`/`bpGhost3D` ghost boxes.
- Worlds (`WORLDS`, `WKEYS` in `data.js`; `switchWorld`/`packWorld` in `main.js`): the active world is the normal state; inactive ones are packed into `S.worlds[id]={WS,es}` (WKEYS = per-world parts of S: seed, gen, mw, ext, zones, zmap, cam, inv). `S.w` = current id. Moon = `S.gen===3` → `genMoon`, biomes after the first `EARTH_NB` in `BIOMES` (genBiome only uses the first `EARTH_NB`, never change that). Buildings can be world-locked with `only:'moon'`.
- Launch Pad (`k:'lpad'`, Home only): loads `rocketNeed()` (= `ROCKET.parts` + `ROCKET.kit` in `data.js`) into `e.store`; `lpadLaunch` starts `e.lt` (s); `updLpad` → `rocketArrive()` adds the kit to the Moon's packed stock (creates `S.worlds.moon` on the first launch) → `rocketLanded` (ui). Drawn by `drawRockets` (2D) and staged animated parts in the `lpad` 3D model.
- Background production (`js/sim.js`): `CORE` counts Base Core deliveries in 10 s buckets (5 min, reset by `load`); `switchWorld` calls `bgLeave()` (stores `S.bg={r per s,t,m}`, a WKEY) and `bgArrive()` (pays out `r*(S.t-t)`, result in `bgLast`). Moon-only resources are in `MOON_RES` (genBiome skips them; helium is placed in its own pass at the end of `genMoon`).
- Moon look: `moonTint(r,g,b)` (render.js) whitens plain colours and keeps strong ones; 2D sprites get a pixel pass when `moonLook()` (own cache key `|m`), 3D `v3WorldTint()` recolours model vertex colours in place (originals in `geo.userData.c0`), checked every frame.
- Debug hook: `window.__fw` (state, placeEnt, tick, entAt, ACT…).

## Rules
- **Build number on every push:** set `BUILD` in `js/pwa.js` to the commit count on `main` after your commit (`git rev-list --count HEAD` + 1 before committing; one push = one commit is simplest), and `VERSION` in `sw.js` to `'fw-build-<BUILD>'` (the test checks they match). Tell Markus the build number; he compares it with ☰ Menu (top right of the panel).
- **Bump `VERSION` in `sw.js` on every change** to shipped files, and add any new file to `ASSETS`, or installed players won't get it / it won't work offline.
- Balance data lives in `js/data.js` (`R(...)` recipes, `D(...)` buildings, `MS` milestones). Every milestone needs `b` and `r` arrays (normalized at load, but keep them explicit).
- Save format: `serialize()`/`load()` in `js/main.js` (v2: entities as `[d,x,y,dir,{non-default fields}]`; `load` also reads v1). `save()` is async
  (gzip → IndexedDB, localStorage fallback, warning on failure); `await save()` before any reload. Keep old saves loading (add fields with defaults in `initEnt`).
- Original content only: own names, art (procedural canvas drawing) and recipes — don't copy assets or names from commercial games.
- Run `npm test` before committing, and **check it printed PASS lines with no FAIL or crash** before you commit (don't chain commit/push after the test with `;`). Each run uses a new random map, so test setups must search for dry land (`canPlace('incin',…)`), not just any free tile.

## Balance checks
- `npm run playthrough` (`tests/playthrough.js`) writes `docs/PLAYTEST.md`: dead-end audit for all tiers, every recipe up to tier 5 run in the real sim
  (measured vs. expected output), drill rates, belt limits, and pacing per tier. Re-run it after changing recipes, costs or goals. `npm test` includes the dead-end audit.

## Known follow-ups
- Late tiers (6–10) are untested for pacing/balance.
- Faint seams can show between belt tiles at some zoom levels.
- Perf: ~2,000 entities fine; consider chunked rendering beyond that.
