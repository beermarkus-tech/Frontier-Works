# Frontier Works — Build Log

**What this file is:** an append-only log of what has actually been built, what was decided along the way,
and what the next session should pick up. Newest session at the bottom. Never rewrite old entries;
if something changed, say so in a new entry. Design truth lives in `DESIGN.md`.

---

## Session 1 — 2026-11-10 (claude.ai chat, Claude Opus 5.5)

### What Markus asked for
1. "A clone of Satisfactory as a 2D browser game, equally complex in recipes, machines, energy and raw materials."
2. "Pay attention to nice graphics and a smooth UI."
3. Goals list appeared empty (a bug, see below).
4. Move development to Claude Code with a GitHub repo, and make it installable as a PWA.

### What was built
**v1: playable core (single HTML file, published as a claude.ai artifact)**
- Procedural 128×128 map, 10 resources with purity, start area with guaranteed nodes.
- Data model: 56 items, 56 recipes (10 alternates), 7 machines, 34 building types, 10 milestones.
- Simulation: belts (one item per tile, downstream-first order), splitters, mergers (fair), sorter, crossing, junction,
  storage, tank, incinerator; machines with input/output buffers; drills and pumps; generators with fuel energy and water.
- Power grids with auto-linking poles and a fuse that trips on overload.
- UI: build toolbar, inspect panels (recipe picker, clock slider, buffers), Items with hand crafting, Goals, Stats, Recipe Codex, Menu.
- Save: localStorage autosave plus text Export/Import.

**v2: graphics and UI overhaul**
- Terrain baked once at 16 px/tile: blended grass/sand/rock/water, water depth shading, foam shorelines, tufts, flowers, stones, cloud shadows.
- Building sprites drawn in code and cached per zoom level. Live animation: drill heads, smelter glow, press piston,
  assembler and fabricator arms, fans, reactor pulse, core beacon. Smoke and steam particles. Placement pop-in.
- Belts and pipes drawn as batched curved paths with moving treads and flowing fluid. Items have distinct shapes (ore, ingot, plate, gear, chip…).
- Glass-style UI with drawn tool icons, cost chips, a power meter, a minimap, smooth zoom-to-cursor, swipe momentum and a clamped camera.
- Panels refresh without flicker (they only re-render when their content changes); the toolbar keeps its scroll position.

**v2.1: bug fix**
- The Goals panel crashed on milestones without a recipe list (Tier 3 "Steam Power"), so only the intro text showed.
  Fixed by normalising `MS` entries (`b`/`r` default to `[]`).

**v3: repository and PWA (this repo, commit `02d350d`)**
- Split into `index.html`, `css/style.css`, and `js/{data,sim,render,ui,input,pwa,main}.js`.
- PWA: manifest, icons (own hex logo), service worker (offline-first, versioned cache), an "Update ready" dialog
  (saves the game, then reloads), an install section in ☰ Menu (Android prompt, iOS instructions), safe-area insets for notched phones.
- Self-hosted fonts (OFL) so it works fully offline.
- `tests/serve.js` (static server) and `tests/smoke.js` (Playwright): placements, ingot delivery, goals list,
  service worker active, offline reload, no page errors. All pass.

### Decisions made (and why)
- **Original content only**: own name "Frontier Works", own item and machine names, own recipe tree. The mechanics are
  genre-typical, but no names or assets come from Satisfactory.
- **No fixed building ports**: any belt pointing in or out of a building edge works. Simpler on touch, still deep.
- **All buildings are square**, so rotation only matters for 1×1 logistics pieces.
- **A grid with no capacity doesn't trip** (it just blacks out). This prevents the start deadlock where the coal drill needs power to fuel the burner.
- **Sequential tiers** (one at a time) for a clear path, with alternates sprinkled in.
- **Everything drawn in code** so the game stays tiny, offline-friendly and free of asset licensing.
- **PWA via GitHub Pages**: claude.ai artifacts can't run service workers. The old artifact link still exists
  but is frozen at v2.1. The repo is now the source of truth.

### Verified
- Sim: iron line delivers about 30 ingots/min (matching the recipe); splitter splits evenly; merger alternates;
  steam generator with water; refinery outputs plastic to a belt and heavy residue to a pipe.
- Performance: ~2,100 entities at about 40 fps in headless software rendering (real devices with a GPU should do better).
- Layout checked at 1400×860 desktop and 390×844 phone.

### Known issues / not yet verified
- **GitHub Pages must be switched on by Markus** (Settings → Pages → Deploy from branch → `main` / root). The API was blocked from the chat session. Check that https://beermarkus-tech.github.io/Frontier-Works/ loads.
- Tiers 6–10 have never been played through. Costs and pacing are guesses.
- Faint seams between belt tiles at some zoom levels.
- Splitter/merger throughput is capped at 20 items/s (one per tick). Fine for Mk5 (13/s), but note it.
- Sorting Splitter filter list shows every solid item, which is long on a phone.
- No undo; dismantle refunds 100%.
- Saves don't move between the artifact version and the Pages version automatically (use Export/Import).

### Next up (suggested order — confirm with Markus)
1. **Confirm the Pages deploy and install on the phone.** Fix anything mobile-specific that shows up (standalone mode, safe areas, iOS quirks).
2. **Playtest tiers 1–5 end-to-end** using `window.__fw` scripted factories. Tune costs in `js/data.js` so each tier takes roughly 10–20 minutes.
3. **Onboarding:** a short step-by-step tutorial overlay for the first factory (drill → smelter → press → core → burner).
4. **Quality of life:** undo for the last build/dismantle; copy/paste a building's recipe; blueprint-lite (copy a rectangle).
5. **Clarity:** show input/output arrows on machines when selected; show the item rate on the hovered belt; a ratio calculator in the Codex.
6. **Late game:** playtest tiers 6–10; consider power storage (batteries) and a production "sink" for points.
7. **Polish:** sounds (optional, off by default), belt seam fix, settings (graphics quality, particle count).

### Open questions for Markus
- Target session length per tier and overall (casual vs. long-haul)?
- Should vehicles or trains ever come (currently out of scope)?
- One save or several save slots?
- Should the game be shareable (public link, leaderboard), or is it just for the family?

---

## Session 2 — 2026-11-10 (Claude Code, cloud session)

### What Markus asked for
"Look at the repo, read the relevant documents, and make sure that everything is there that you need."

### What was checked
- Read `CLAUDE.md`, `README.md`, `docs/DESIGN.md`, `docs/BUILD_LOG.md`, `sw.js`, `index.html`, the manifest and the tests.
- Every file the README's project layout lists exists. Fonts (with OFL licences) and all icons are present.
- Data matches the docs: 56 items, 56 recipes, 34 building types, 10 milestones, every milestone has `b` and `r`.
- Every request the page makes on load succeeds (no 404s).
- `npm test` passes all 6 checks without `npm install` (the cloud container has Playwright and Chromium preinstalled).

### What was changed
- `sw.js`: added `icons/icon.svg` to `ASSETS`. `index.html` uses it as the favicon, but it wasn't cached, so it was missing offline.
  `VERSION` bumped to `fw-2026-11-10-2`.

### Known issues / not yet verified
- **GitHub Pages still unconfirmed.** This cloud session can't reach `github.io` (network policy), so whether
  https://beermarkus-tech.github.io/Frontier-Works/ is live has to be checked by Markus in a browser.
- **Claude Code sessions work on a `claude/...` branch, but Pages serves `main`.** Changes reach the phone only after
  that branch is merged into `main` (via a pull request). Decide how Markus wants this to work (see open questions).
- Everything from Session 1's known issues still stands.

### Next up
Unchanged from Session 1 — start with confirming the Pages deploy and installing on the phone.

### Open questions for Markus
- ~~Pull request or direct to main?~~ Answered: Markus wants all work committed and pushed straight to `main`, no side branches (noted in `CLAUDE.md`).
- Session 1's open questions (session length per tier, vehicles/trains, save slots, sharing) are still open.
