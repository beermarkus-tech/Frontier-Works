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
- Classic `<script>` files sharing one global scope, loaded in order: data → sim → render → ui → plan → input → pwa → main. Top-level `const`/`let` are visible across files; don't redeclare names.
- Sim runs at fixed 20 ticks/s (`tick(0.05)` in `js/sim.js`). Belts hold one item per tile; `beltOrder` processes downstream first. Buildings push output only into belts/pipes pointing away from them; input is any belt/pipe pointing into them.
- Power: poles/generators link (max 5 nearest within range), consumers attach to nearest node in supply range. Demand > capacity trips the fuse (`trip` flag on nodes).
- Rendering: terrain baked once to a 2048² canvas; building sprites cached per zoom bucket (`getSprite`), animated parts drawn live in `drawLive`; belts/pipes stroked as batched Path2D with curves (`e.cin`).
- Planner (`js/plan.js`): pure functions `plFwd(f)` / `plRev(item,rate,pick)` over `RC`/`B`; UI state `PL` in localStorage `frontierworks_plan`.
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
