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

---

## Session 3 — 2026-11-10 (Claude Code, cloud session)

### What Markus asked for
A planning tool to work out in advance how many machines fully use a node's output, e.g. a drill on a node →
N smelters → N presses, so a production line runs at 100%. It can live in a side menu.
Choices he made: **inside ☰ Menu**, **a "Show locked" switch** to plan with undiscovered recipes, and **both directions at once**.

### What was built
- New `js/plan.js`, opened via ☰ Menu → Tools → 📐 Production planner (a Recipe codex button sits beside it).
- **From a node:** resource, purity, extractor (Drill Mk1–3, Oil Pump, Water Pump), how many, clock %. Then
  "+ Add step" picks a recipe for the biggest leftover; each step has a recipe dropdown (grouped by machine) and a
  "Use % of the X left" box for splitting a stream (e.g. 50% of ingots to plates, the rest to rods).
  Each step shows the machine count rounded up, plus the split ("2 at 100% + 1 at 67%, or all 3 at 89%") and the exact number,
  in/out rates with the belt/pipe tier needed (🔒 if not unlocked yet), missing inputs in red, and power.
  Summary: "Node output used: N%", building list, total power, leftovers, things to bring in from elsewhere.
- **For a target:** item + rate/min → every machine across the whole tree (amounts summed when two parts share an
  ingredient), a recipe picker per item where alternates exist, raw resources with "≈ N × best drill on normal nodes",
  byproducts, and total power.
- **Show locked** toggle, off by default.
- Plans persist in their own localStorage key (`frontierworks_plan`). The game save format is unchanged.
- Small fix: keyboard shortcuts (WASD etc.) no longer fire while a dropdown has focus.
- `sw.js` VERSION → `fw-2026-11-10-3`, `js/plan.js` added to `ASSETS`. DESIGN.md §8, README and CLAUDE.md updated.

### Decisions (and why)
- Maths only, no link to the real factory. It can't break saves or the sim. Design agreed with Markus this session (recorded in DESIGN.md §8).
- The forward mode is a list of steps, not a node graph. Easier to use on a phone. Branching works through the share % per step.
- Reverse mode doesn't net byproducts back into inputs (e.g. water from Battery). It lists them separately. Simple and predictable.
- Machine counts assume 100% clock per machine. Underclocking the last one is shown as a suggestion.

### Verified
- `npm test`: 12/12 pass, including new checks. Normal iron node + Mk1 → 2 smelters → 2 presses → 40 plates/min, node 100% used.
  Copper → 2 smelters → 4 wire presses → 2 cable presses → 60 cable/min. 10 motors/min → 2 motor, 5 rotor, 4 stator assemblers.
  The UI opens from Menu, adds steps, reacts to a purity change, and reverse mode with locked recipes works (Quantum Core chain).
- Screenshots at phone size (390×844): dropdowns and number boxes readable after widening them.

### Known issues
- Reverse mode doesn't handle loops between recipes (none exist with the current data). If one appears, the looping item
  is listed under "Bring in from elsewhere" rather than computed.
- Planner text and options are plain names (dropdowns can't show item icons).
- Everything from Session 1's known issues still stands.

### Next up
- Markus to try the planner on his phone and say what's missing (e.g. "send plan to build", node-picking from the map).
- Then continue Session 1's list: playtest tiers 1–5, onboarding, undo.

### Open questions for Markus
- Should tapping a resource node on the map offer "Plan this node", opening the planner already filled in?
- Session 1's open questions (session length per tier, vehicles/trains, save slots, sharing) are still open.

---

## Session 4 — 2026-11-10 (Claude Code, cloud session)

### What Markus asked for
A 3D view with a 2D/3D toggle: an airplane-eye view of the factory like Google Maps, with zoom, rotate and tilt.
He chose the real-3D option (B), approved adding the Three.js library (~0.6 MB), and asked for the biggest safe step
("all if you can"): view, inspect and build in 3D, and nice graphics.

### What was built
- `js/view3d.js` (new) and `js/lib/three.min.js` (Three.js r149, MIT, licence in `js/lib/THREE-LICENSE.txt`).
  Three.js is loaded only the first time 3D is switched on, so the 2D start-up isn't slower; it's precached for offline use.
- **Toggle:** a "3D"/"2D" button above ⌖ on the right, key V, and ☰ Menu → View. The camera position carries over both ways,
  and the choice is remembered between visits.
- **Camera:** one-finger pan with momentum; pinch zoom; two-finger twist rotates; two-finger slide up/down tilts
  (about 17° to 87°); a compass button (shown in 3D) eases back to north and the default tilt; ⌖ / H flies to the Core.
  Mouse: left-drag pan, right-drag rotate+tilt, wheel zoom to cursor, Ctrl+wheel tilt. Keys: WASD (relative to view), E/Z rotate.
- **Everything playable in 3D:** tap to inspect (opens the same panels), tap to place, drag belts/pipes (green/red ghost
  tiles plus a "N × Conveyor" label), dismantle by tap or drag. Ghost box under the mouse, selection and hover frames,
  power-range rings while placing power buildings, grid while a tool is selected.
- **World:** the existing painted terrain on a 3D ground with sunken lakes, an animated transparent water surface,
  the map as an island in the sea with a sky gradient and soft distance fog. Trees, bushes and boulders as decoration
  (hidden under buildings). Resource nodes as coloured rocks with purity dots; oil wells as glossy pools.
- **Buildings:** a model for every building type (34) built from simple shapes in the 2D colours, with animations while working:
  drill bits spin, presses stamp, assembler arms swing, fabricator gantry slides, blender drum turns, pump wheels and
  pumpjack beams move, turbine fans spin, furnaces and incinerators glow, refinery flare flickers, reactor ring glows,
  Core beacon rotates. Smoke and steam rise from chimneys and cooling towers. Status lights in the same colours as 2D.
  Tanks show their fill level and fluid colour.
- **Logistics:** belts with tier-coloured rails and moving treads (curves are real curves), items riding on belts with
  15 different 3D shapes in their item colours, routers and crossings carrying items, pipes as tubes with a coloured
  ring showing the fluid inside, sagging power wires (red when a fuse trips).
- **Performance:** one draw call per building type, belt shape and item shape (InstancedMesh). The showcase factory
  draws in about 30–60 calls. ☰ Menu → 3D quality High/Low (Low: no shadows, 1× resolution, no antialiasing until reload).
  If High stays under 24 fps for 6 s, a toast suggests Low. If the browser drops the 3D context, the game returns to 2D.
- `sw.js` VERSION → `fw-2026-11-10-4`, `view3d.js` + `three.min.js` added to `ASSETS`. DESIGN.md (§8a, §9, §10), README, CLAUDE.md updated.

### Decisions (and why)
- **Three.js r149**, not the newest: it's the last release that ships a plain-script build (global `THREE`). That fits the
  no-build, classic-script setup and keeps offline caching simple.
- **Same sim, same input actions:** 3D only converts a touch into a tile and calls the 2D `tap()`/`linePath()`/`buildPath()`.
  So the rules can't drift between 2D and 3D. Saves are unchanged.
- **Lazy loading:** players who stay in 2D never pay the parse cost. The file is still precached so 3D works offline.
- Machines don't rotate in 3D (they're square and have no ports, as in 2D). Only 1×1 logistics pieces turn with their direction.
- Trees are decoration only: they don't block building and vanish when you build on their tile.

### Verified
- `npm test`: 17/17 pass. New 3D checks: switch to 3D, tap the Core → its panel opens, tap with a Smelter selected → it's
  placed on the right tile, drag with a belt selected → 7 belts in the right direction, it renders, switching back to 2D keeps the position.
- Simulated phone touch (390×844, CDP touch events): pinch out zooms in, a clockwise twist rotates the map clockwise,
  two fingers up tilts toward the horizon, one finger pans the right way.
- Screenshots (desktop and phone) of a showcase with every building: close-up, oblique, top-down and low airplane views.
  Low quality and Menu toggles checked, no page errors.

### Known issues / not yet verified
- **Not yet tried on a real phone.** Performance with big factories on older phones is unknown. Low quality is the fallback.
- Terrain looks soft when zoomed very close (it's the 16 px/tile 2D painting stretched onto the ground).
- Buildings next to a lake edge can overhang the sloped bank slightly. Buildings on the outermost map tiles overhang the island edge.
- The 2D power-range circles and the build grid have simpler 3D equivalents. There's no "output item badge" on buildings in 3D yet.
- No two-finger pan in 3D (two fingers zoom/rotate/tilt; one finger pans). This matches common map apps.

### Next up
- Markus: try 3D on the phone (button "3D" on the right), especially speed with a bigger factory, and the feel of rotate/tilt.
- Possible polish: day/night lighting, item badges over machines, nicer power-tower lattice, a sharper close-up ground texture.
- Then Session 1's list (playtest tiers 1–5, onboarding, undo) and "Plan this node" from the map.

### Open questions for Markus
- Does 3D feel smooth on your phone with High quality, or should Low be the default on phones?
- Should 3D become the default view for new players, or stay opt-in?
- Session 1's open questions are still open.

---

## Session 5 — 2026-11-10 (Claude Code, cloud session)

### What Markus asked for
"The map needs to be a lot bigger, and how about different biomes with specific resource probabilities."
He went with my recommendations: **384×384** (9× the area), **seven biomes affecting look and resources only**,
**old saves keep their map**, and a **planner hint** for where to find resources.

### What was built
- **Map size per save:** `MW`/`MH` are now variables. New games are 384×384 (`S.gen=2`, `S.mw=384`). Old saves
  (no `gen`) load as 128×128 through the unchanged classic generator (`genClassic`), so buildings stay on their nodes.
- **Biome generator** (`genBiome`): biome seed points on a jittered 48-tile grid get a biome by distance from the start
  (Greenvale near the middle, Emberfield/Frostmark toward the edge). Each tile takes the nearest point, with warped
  coordinates for organic borders. Every biome is guaranteed to appear. Terrain thresholds (water, sand, rock) are
  per biome and blended across borders. About 1 node per 105 land tiles (~1,300 on a 384 map), chosen by the biome's resource weights,
  distance gates and purity bias. Each resource is topped up to at least 8 nodes in its favourite biomes. The start area,
  guaranteed starter nodes and pond are the same as before.
- **`BIOMES` table in `js/data.js`:** names, descriptions, terrain thresholds, ground palette (8 colours), 2D detail
  (tufts, flowers, stones, snow/ember specks), 3D decoration odds, resource weights, purity bias, density.
- **Chunked terrain painter** (`js/render.js`): the whole-map 2048² canvas is replaced by 32×32-tile chunks painted on demand
  (512² px each, ~20 ms, an 8 ms budget per frame, nearest first, LRU of 48) plus one overview picture (3 px/tile on big maps)
  for the minimap, far zoom and as a stand-in while a chunk paints. Biome colours blend smoothly between tiles. All
  random detail is hashed per tile, so chunk edges match. Old maps use the Greenvale palette, which is the original one.
- **3D** (`js/view3d.js`): the ground is one coarse piece per chunk (overview texture) plus up to 28 detailed chunks
  (16 on Low) near the camera. Biome decoration (pines, snowy pines, cacti, reeds, dead trees, bushes, biome-coloured
  rocks, glowing lava cracks) is drawn only near the camera and thinned out when zoomed out. Zoom-out goes up to the whole island.
  The depth range follows the zoom (fixes stripes when very high). Cheaper shapes for decoration, node rocks and purity dots.
- **UI:** the node panel shows the biome; an "Entering Pinewood: …" message when the view moves into another biome;
  the planner's raw-resource rows say "found mostly in Frostmark and Emberfield"; the New-map dialog mentions the size.
- `sw.js` VERSION → `fw-2026-11-10-5`. DESIGN.md §3 (World), README, CLAUDE.md updated.

### Decisions (and why)
- **Old saves untouched:** regenerating an old seed with biomes would move resources under existing buildings.
  A check compares the classic generator's output with the previous release: identical.
- **Biomes don't change rules** (Markus's choice): everything stays buildable everywhere. Dustreach simply has few lakes.
- **Chunks instead of one picture:** a 384-tile map at full detail would be a 6144² canvas, beyond what phones allow.
  Painting on demand also makes startup lighter. A new map paints about 1.3 M overview pixels vs 4.2 M before.
- Biome borders blend over ~7 tiles in colour and terrain, so there are no hard seams.

### Verified
- `npm test`: 21/21 pass. New checks: new map is 384×384 with all 7 biomes (each > 2,000 tiles) and Greenvale at the start;
  all 9 resources exist and uranium is mostly in Frostmark/Emberfield (84 of 96 in the test seed); a chunk paints;
  save → load keeps the big map; an old-format save loads as the 128 classic map (core and nodes where they were).
- Separately, the classic map from this version was compared with the previous release for the same seed: terrain and nodes are identical.
- Generation of a 384 map ≈ 0.5 s on the test machine (likely 1–2 s on a phone). One chunk ≈ 22 ms to paint.
- 3D on the big map: 20–160 draw calls, ~0.2–0.5 M triangles (it was 1–2.5 M before slimming the decoration).
- Screenshots of 2D (far, biome border) and 3D (whole island from above, low airplane view, each biome close up).

### Known issues / not yet verified
- **Not tried on a real phone yet:** generation time on load, chunk painting while panning fast, and 3D speed on the big map.
- When panning fast, chunks show the softer overview for a moment until they're painted.
- Loading a save regenerates the map from its seed each time (as before, just a bigger map now). If loading feels slow on the phone, cache it.
- Snowy pines read a bit grey under the 3D lighting. Dead trees are simple poles.
- Biome borders near the map edge can be thin slivers.

### Next up
- Markus: start a **new map** (☰ Menu → New game) to get the big biome island. Your current factory stays on the old map until you do.
  Then explore (2D or 3D) and check loading time and smoothness on the phone.
- Ideas: show biome names on the minimap; biome-specific building rules later (e.g. no water pumps on ice) if wanted;
  vehicles/trains become more interesting with distances this big (open question from Session 1).

### Open questions for Markus
- Is 384×384 the right size once you've explored a bit, or bigger/smaller?
- Should starting a new map ask before replacing the current one with an option to keep both (save slots)? This ties in with Session 1's save-slots question.
- With this much distance, do you want faster transport (trains/vehicles) on the roadmap?

---

## Session 6 — 2026-11-10 (Claude Code, cloud session)

### What Markus asked for
"Not seeing the larger map." And: a build number that counts up with every push, shown in the Menu panel's top right
next to the ✕, so he can compare it with the number Claude reports.

### Findings
- The live site was already serving the Session 5 release (`sw.js` VERSION `fw-2026-11-10-5`), so the update was there.
  The most likely reason: **his saved game keeps its 128×128 map by design**, and the 384×384 biome island only comes with ☰ Menu → New game.
  (A phone that hadn't accepted "Update ready" yet would also still show the old version.)

### What was built
- **Build number:** `BUILD` in `js/pwa.js` (= commit count on `main`; this release is **Build 8**), shown as "Build 8" in the Menu
  panel header, left of ✕. `sw.js` VERSION is now `fw-build-8`, so the cache version and the visible number always match.
  A new test checks both. CLAUDE.md now has the rule: bump both on every push and tell Markus the number.
- **Menu → "This map"** at the top says what you're playing: either "384×384 tiles with seven biomes", or "128×128, made before
  biomes … start a new map for the big biome island".

### Verified
- `npm test` passes, including the new build-number check.

### Known issues
- Unchanged from Session 5.

### Next up
- Markus: open ☰ Menu and check that it says **Build 8** (if not, reopen the app or accept "Update ready"). Then read "This map";
  for the big island use New game at the bottom of the Menu (it replaces the current factory).

### Open questions for Markus
- Should New game keep the old factory as a second save slot instead of replacing it? (Ties to save slots, Session 1.)

---

## Session 7 — 2026-11-10 (Claude Code, cloud session) · Build 9

### What Markus asked for
"Can you include power generation into the planner please."

### What was built
- **New planner tab "⚡ Power"** (`plPow`, `plPowHtml` in `js/plan.js`). Input: MW needed, generator (Coal Burner,
  Steam Generator, Fuel Turbine, Fission Reactor; unlocked only unless "Show locked"), fuel where there's a choice (coal/petroleum coke),
  and whether to add the fuel chain's own power. Output:
  - generators needed with load split ("2 at full load + 1 at 14% load, or all 3 at 71%")
  - fuel, water and nuclear waste per minute, with the pipe/belt tier needed (waste is flagged red: it must be belted away)
  - the fuel chain (via the reverse planner, e.g. Fuel → Refinery, Fuel Rods → Blender/Fabricator chain) with byproducts
  - drills & pumps for the raw inputs, with "found mostly in …" biome hints
  - the chain's own power (machines + drills/pumps) added to the demand and repeated until it settles (optional).
- Maths matches the sim: fuel/min = MW × 60 ÷ item energy (coal 150, coke 180, fuel 750, fuel rod 750,000), water from the
  generator's rate, reactor waste 10 per rod. Fuel burns in proportion to load, as in `burn()` in `sim.js`.
- **"From a node" and "For a target"** now show a "Power plant" line (≈ N × generator and fuel/min) under their power total,
  with **⚡ Plan the power for this**, which opens the Power tab pre-filled. "For a target" now also estimates drill & pump power
  and shows a combined total.
- Build number **9** (`BUILD` in `js/pwa.js`, `sw.js` VERSION `fw-build-9`). DESIGN.md §8 (planner) updated.

### Verified
- `npm test`: 28/28 pass. New checks: 60 MW → 2 Coal Burners, 24 coal/min; Steam 75 MW → 30 coal + 45 water/min;
  Turbine 150 MW → 12 fuel/min from 0.3 Refinery and 18 crude/min; Reactor 2,500 MW → 0.2 rods, 2 waste, 240 water/min;
  with own use on, the coal drill's power is added (61.2 MW total); the "Plan the power" button opens the Power tab.
- Phone-size screenshots of the Power tab (300 MW of Fuel Turbines with the refinery chain).

### Known issues
- The reverse planner doesn't net byproducts (e.g. a coke chain shows plastic as a byproduct rather than offsetting it).
- Generators are assumed to run at even load. Startup (hand-feeding coal) isn't modelled.

### Next up
- Markus: ☰ Menu → Production planner → ⚡ Power; or plan a line and tap "Plan the power for this". Check Menu shows **Build 9**.

### Open questions for Markus
- Should the planner also show power storage/backup once batteries exist (not in the game yet)?

---

## Session 8 — 2026-11-10 (Claude Code, cloud session) · Build 10

### What Markus asked for
A reload button next to the build number, to force the app onto the newest version after a push.

### What was built
- **↻ button** in the Menu panel header, between "Build N" and ✕ (Menu only). It saves the game, asks the server for a newer
  `sw.js`, and if there is one, installs it, activates it and reloads (the "Update ready" dialog is skipped). If nothing is newer,
  it just reloads. Offline it reloads from the cache.
- **Fix for late updates:** the service worker now installs files with `cache: 'reload'`. Before, it could copy stale files
  from the browser's HTTP cache (GitHub Pages sends a ~10-minute cache time), so a new build could arrive partly old.
- Build number **10**. DESIGN.md §10 notes the update button.

### Verified
- `npm test`: 29/29 pass, including "↻ reloads the game and the save is kept".
- A separate simulation of a real push: the app ran Build 10 from a server sending 10-minute cache headers, the server was switched
  to Build 11, and one tap on ↻ brought it to Build 11 (Menu label and cache both updated, old cache removed).

### Known issues
- GitHub Pages itself takes about 1–2 minutes after a push to publish. Tapping ↻ before that still shows the old build: wait a moment and tap again.

### Next up
- Markus: after each push, open ☰ Menu, tap ↻, and check the build number matches what Claude reported.

---

## Session 9 — 2026-11-10 (Claude Code, cloud session) · Build 11

### What Markus asked for
1. Put the Production Planner button in the top bar with Goals, Items, Stats.
2. In the Recipe Codex, show how much coal a Coal Burner uses, and the same for the other generators.
(Also: he confirmed the in-app "Install app" button works for installing the PWA.)

### What was built
- **Top bar:** new "Planner" button (calculator icon) between Stats and ☰. On phones it's icon-only like the others.
  The Menu → Tools button stays too.
- **Recipe Codex → "Generators (fuel at full load)":** every generator (locked ones marked 🔒) with fuel per minute and
  how long one item lasts, water per minute, and reactor waste:
  Coal Burner 12 coal or 10 coke/min; Steam Generator 30 coal or 25 coke + 45 water/min; Fuel Turbine 12 fuel/min;
  Fission Reactor 0.2 rods + 240 water/min, 2 waste/min out. It also says fuel use follows the load, and which fuel is used first.
- **Codex extras:** each machine heading shows its power ("Smelter · 4 MW"). A new "Extraction" section lists drills and pumps
  with power and output per minute on impure / normal / pure nodes.
- Build number **11**.

### Verified
- `npm test`: 31/31 pass, including codex fuel numbers and the top-bar Planner button. Phone screenshot of the codex checked.

### Next up
- Markus: tap ↻ in ☰ Menu, check **Build 11**, then try the new calculator icon in the top bar and the codex generator list.

---

## Session 10 — 2026-11-10 (Claude Code, cloud session) · Build 12

### What Markus asked for
Let a Splitter feed a machine directly (no belt), and let a Merger take a machine's output directly.

### Findings
- **The simulation already allowed both.** Routers hand items to any touching building on their output sides (`updRouter` → `accept`),
  and buildings push output into touching routers/crossings (`pushOut`). A test with a storage → belt → splitter → two touching smelters
  → touching merger → belt → storage line delivered ingots, and both smelters were fed. Nothing in the game said so: the machine panel
  and the splitter/merger descriptions only mentioned belts.

### What was changed
- Splitter, Merger, Sorting Splitter and Pipe Junction descriptions (shown when picking them) now say they work with touching buildings.
- The machine panel hint explains it, including the orientation rule (a merger's front must not face the machine; a splitter feeds from its output sides).
- DESIGN.md §5 records the rule (confirmed with Markus). A new smoke test locks it in.
- Build number **12**.

### Verified
- `npm test` passes, including the new direct splitter → machine → merger check.

### Next up
- Markus: try placing a Splitter right next to a Smelter (an output side facing it) and a Merger against the Smelter's other side.

---

## Session 11 — 2026-11-10 (Claude Code, cloud session) · Build 13

### What Markus asked for
An efficiency indicator for each machine, shown in its panel.

### What was built
- **Sim** (`effTrack`, `machState` in `js/sim.js`): every machine, drill and pump keeps a running average over the last
  30 s (`e._ef` = share of time working) plus the share of each loss reason (`e._efw`: `in:<item>` waiting for that input, `out`
  output full, `power`, `recipe`, `none`). It's transient (not saved) and re-measures after loading. Cost: a few multiplications per building per tick.
- **Panel** (`effHtml` in `js/ui.js`), right under Status/Power: "Working NN%" with a coloured bar (green ≥ 90, yellow ≥ 60,
  orange ≥ 30, red below), "Output 19.5 of 30 Iron Ingot/min" (actual vs. max at the current clock), the loss breakdown
  ("Waiting for Iron Ore 35%", "Output full …", "No power …"), and a 💡 tip for the biggest loss. Shows "Measuring…" for the first 3 s.
- DESIGN.md §8 records it. Build number **13**.

### Verified
- `npm test` 33/33: a well-fed smelter reads 98%; one with no output belt reads 24% with "Output full" as the main reason, and its panel shows both.
- Phone screenshot of a smelter that runs short of ore: 65% working, 19.5/30 per min, 35% waiting for Iron Ore, tip shown.

### Ideas (not built)
- A small coloured efficiency ring on the buildings themselves (2D/3D), or an overlay toggle to spot bottlenecks across the factory.

---

## Session 12 — 2026-11-10 (Claude Code, cloud session) · Build 14

### What Markus asked for
Show the efficiency percentage in the machine panel's header too.

### What was built
- A live, coloured efficiency badge ("64%", same colours as the bar) in the panel header, left of ✕, for machines with a recipe,
  drills and pumps (`effChip` in `js/ui.js`, refreshed with the panel). It shows "…" while measuring. The header slot is the one used for
  "Build N" in the Menu.
- Build number **14**.

### Verified
- `npm test` 33/33: the efficiency check now also confirms the header badge matches the measured value. Phone screenshot checked.

---

## Session 13 — 2026-11-10 (Claude Code, cloud session) · Build 15

### What Markus asked for
Two earlier offers he picked: (1) efficiency shown on the buildings themselves, (3) "Plan this node" from the map.

### What was built
- **Efficiency on buildings:**
  - 2D (`effRing` in `js/render.js`): a small ring in the top-left corner of every machine (with a recipe), drill and pump. It fills
    clockwise with the working share and uses the same colours as the panel (green/yellow/orange/red). The number appears inside when zoomed in.
    The status light stays top-right.
  - 3D: a small bar above each of those buildings (dark track + coloured fill), hidden when zoomed far out.
  - ☰ Menu → View → "Efficiency rings on buildings: On/Off" (per device, `OPT` in `js/data.js`, localStorage `frontierworks_opts`). Default on.
- **Plan this node:** a resource node's panel has "📐 Plan this node". A drill's or pump's panel has "📐 Plan this drill/pump"
  (the node is hidden under the drill once built). It opens the planner's "From a node" with that resource and purity, the given
  extractor (or the best unlocked one) and its clock, and adds the first step (e.g. Smelter) automatically (`planFrom` in `js/plan.js`).
- DESIGN.md §8 updated. Build number **15**.

### Verified
- `npm test` 35/35, new: "Plan this node" on a copper node opens the planner with copper, its purity and a Copper Ingot step (2 × Smelter
  on a normal node); the efficiency-ring option is on by default and toggles.
- Phone screenshots of a test factory: 2D rings showing 96 (fed), 45 (output blocked) and 65 (starved) in the right colours; matching bars in 3D.

---

## Session 14 — 2026-11-10 (Claude Code, cloud session) · Build 16

### What Markus reported
Tapping a belt to upgrade it flips the belt's direction.

### Cause and fix
- A tap with a belt/pipe tool laid a one-tile line in the Rotate button's direction (`UI.rot`), replacing the old belt, so the upgrade
  took the tool's direction instead of the belt's own. Now a tap on an existing belt/pipe of the same kind keeps its direction
  (`tap()` in `js/input.js`, used by 2D and 3D). The hover preview shows the kept direction. Dragging still lays belts in the drag
  direction; to turn a belt, use ↻ Rotate in its panel or R.
- Build number **16**.

### Verified
- `npm test` passes, including a new check: a south-facing Mk1 belt tapped with Mk2 selected (Rotate set to east) becomes a south-facing Mk2.

---

## Session 15 — 2026-11-10 (Claude Code, cloud session) · Build 17

### What Markus asked for
Remove the efficiency bars above machines in 3D ("they look weird, 2D is enough").

### What was changed
- The 3D efficiency bars (added in Build 15) are removed. The 2D rings, the panel badge and the panel's Efficiency section stay.
  The Menu toggle now only affects the 2D rings. DESIGN.md §8 updated. Build number **17**.

### Verified
- `npm test` passes (3D checks included).
- **Follow-up (Build 18):** the Build 17 push went out while the test run had crashed. It wasn't the 3D change: the splitter/merger test
  looked for free space with a check that allows water, and on that run's random map its coal burner landed in a lake.
  The test now looks for dry land. Three full runs on three random maps: 36/36 each. Lesson recorded: run the tests and read the result before committing.

---

## Session 16 — 2026-11-10 (Claude Code, cloud session) · Build 19

### What Markus asked for
In the planner's "For a target" tab, show both inputs and outputs of the machines.

### What was built
- Every machine card in "For a target" (and in the Power tab's fuel chain) now has **In** and **Out** lists: each item's rate per minute
  for all machines of that card together, plus the belt/pipe tier the line needs. Byproducts appear under Out (e.g. a Refinery's Polymer Resin).
  Helper `plIO` in `js/plan.js`. Build number **19**.

### Verified
- `npm test` 37/37, new check: a reverse-planner card lists In and Out with per-minute rates. Phone screenshot: 10 Motors/min →
  2 × Assembler, in 20 Rotors + 20 Stators, out 10 Motors.

---

## Session 17 — 2026-11-10 (Claude Code, cloud session) · Build 20

### What Markus reported
He couldn't hand-craft Braced Plates or Rotors ("gears"), but needs them to build Assemblers.

### Cause
- A real progression dead end: the Assembler costs 8 Braced Plates + 4 Rotors + 10 Cable, but both parts are Assembler recipes,
  and hand crafting only offered Smelter and Press recipes. Nobody could build the first Assembler after Tier 1.
  Checked the later machines: Foundry, Fabricator, Refinery, Blender, Steam Generator and Drill Mk2 are all buildable from parts
  that existing machines can make, so this was the only such dead end.

### Fix
- Hand crafting (Items panel) now also lists unlocked **Assembler** recipes (Braced Plate, Rotor, Truss Frame, …). DESIGN.md §7 records the change.
- Build number **20**.

### Verified
- `npm test` 38/38, new check: with the start stock and Tier 1 recipes, hand-crafting 8 Braced Plates and 4 Rotors works and the Assembler becomes affordable.

### Next up
- Playtesting tiers 1–5 end to end (Session 1's list) would catch more dead ends like this one.

---

## Session 18 — 2026-11-10 (Claude Code, cloud session) · Builds 21–22

### What Markus asked for
1. Clock speed in 1 % steps instead of 5 %. 2. Then a play-through of tiers 1–5.

### Build 21: clock in 1 % steps
- The clock slider in machine/drill/pump panels now moves in 1 % steps, with −10 / −1 / +1 / +10 buttons under it (fiddly sliders
  on phones). The limits stay 10 % to 100 % (250 % after Steelworks). Test: 100 % −1 −10 → 89 %, and back.

### Build 22: play-through of tiers 1–5
- New dev tool `tests/playthrough.js` (`npm run playthrough`), report in **`docs/PLAYTEST.md`**. It is not a bot that lays out a whole
  factory on the map. It checks what matters for "can you get through, and how long does it take":
  1. **Dead-end audit, tiers 1–10:** per tier, every unlocked building must be buildable from items you can already make
     (with built machines, hand crafting, or the start stock), and every goal item must be makeable. Result: **no dead ends.**
     Self-test: with the old hand-crafting rule (Smelter/Press only), the audit flags the Assembler at tier 2, and from then on
     nearly every later building. So it does catch the Build 20 bug. The same audit now runs in `npm test`.
  2. **Every recipe unlocked by tier 5 (25) built and run in the real sim:** real belts/pipes from supply crates/tanks into the machine,
     outputs into incinerators, coal burners for power, 40 s warm-up + 4 min measured. **All 25 make exactly their recipe rate.**
     (The first run used Mk1 belts and a 60 s window. Rotor/Heavy Truss starved and slow batch recipes read low. Those were test artefacts, fixed in the tool.)
     All 3 drills × 3 purities on real nodes deliver their stated rate.
  3. **Belt limits:** every recipe's input and output fits on the best belt available when the recipe unlocks
     (e.g. Rotor needs 100 bolts/min, and Conveyor Mk2 at 120/min unlocks with it).
  4. **Pacing** (seed 20261110, start-area nodes): with all nearby nodes drilled a goal needs only 0.5–2.5 min of raw supply. A
     one-machine-per-step factory takes 8 / 34 / 55 / 80 / 75 min for tiers 1–5, and a ~15-minute pace needs about 6 / 16 / 22 / 31 / 39 machines.
     That's within the 10–20 min per tier target, with a steady growth curve. **No balance changes made.**
- Build number **22**. CLAUDE.md and README mention the tool.

### Known issues / not covered
- The play-through doesn't simulate a whole player factory (layout, belt routing over distance, building costs, power growth). Building
  costs aren't in the pacing numbers. Tiers 6–10 recipes aren't bench-tested yet (the dead-end audit does cover them).
- Generators were only exercised as coal burners powering the benches. Steam/turbine/reactor benches are a follow-up.

### Next up
- Run the same bench for tiers 6–10 (refinery byproducts, blender, fabricator chains, reactor waste) when Markus gets there.

---

## Session 19 — 2026-11-10 (Claude Code, cloud session) · Build 23

### What Markus asked
How large can a factory get? (Answer measured: the sim costs ~1 ms per tick at 20,000 objects, which is not the limit. Far-zoom drawing and the
save size were the limits: ~95 bytes per object in a ~5 MB browser slot meant a ceiling around 50,000 objects, and a save that got too big **failed silently**.)
Then: "do all three improvements".

### What was built
1. **Saves** (`js/main.js`): format v2, entities as `[type,x,y,dir,{only non-default fields}]`, gzip-compressed (`CompressionStream`), stored
   in **IndexedDB** (database `frontierworks`, store `saves`, key `main`), falling back to localStorage (as `FW2:` text). If both fail, a warning toast
   appears (at most once a minute) and the Menu shows it. The old localStorage save migrates automatically on the first save. A save that can't be
   read at startup is kept aside (`broken-…`) instead of being overwritten. Export text is `FW2:` + base64 gzip. Import accepts that, v1 base64 and plain JSON.
   `save()` is now async; the ↻ reload and "Update now" wait for it before reloading.
2. **Far-zoom / huge-factory drawing** (`drawLOD` in `js/render.js`): below 12 px per tile, or with more than 6,000 objects on screen,
   belts and pipes become thin strips in their tier colour and buildings coloured blocks with a dark rim and a status dot, drawn as a handful of
   batched paths. Wires and detailed sprites are skipped.
3. **Factory size** in Stats: objects, buildings (machines), belts & pipes, poles, items moving, save size. The Menu's Save section shows the last
   save time, size and where it's stored.
- DESIGN.md §8/§10 and CLAUDE.md updated. Build number **23**.

### Measured (desktop, headless; phones ~3–5× slower)
| Objects | Sim per tick | Far-zoom draw before → after | Save before → after |
|---|---|---|---|
| 2,000 | 0.1 ms | 18 → 14 ms | 179 KB → 8 KB |
| 10,000 | 0.5 ms | 28 → 18 ms | 937 KB → 37 KB |
| 20,000 | 0.9 ms | 51 → 20 ms | 1,890 KB → 73 KB |
At far zoom most of the remaining time is the terrain itself. The save limit is effectively gone (IndexedDB allows hundreds of MB; 20k objects ≈ 73 KB).

### Verified
- `npm test` 44/44, new checks: save lands in the browser database (~27 bytes/object even for a tiny test factory); FW2 export → import and an old v1
  export both restore every object; reloading the page restores the factory from the database (offline); Stats shows factory size; far zoom draws.
- Screenshot of a 2,100-object test factory at far zoom in the simplified view.

### Known issues
- Very old browsers without `CompressionStream` store the save uncompressed (still in IndexedDB, so still fine).
- The far-zoom ground on desktop still costs ~14 ms (many terrain chunks scaled down). On phones the minimum zoom shows fewer chunks.

---

## Session 20 — 2026-11-11 (Claude Code, cloud session) · Build 24

### What Markus asked
1. Is an overflow splitter planned? → Not yet; proposed it (front first, overflow to the sides; Tier 2 with the Sorting Splitter). Waiting for his go-ahead.
2. Rename all buildings to another commercial game's names. → Declined: that would turn this into a copy of that specific game. Offered our own clearer names instead. The original-content rule stays.
3. "There's a moving vertical line or shadow, is this day and night?"

### Cause and fix (3)
- No day/night exists. The line was the **drifting cloud-shadow layer** in 2D: one 128 px cloud picture drawn as repeated tiles, but generated from
  non-repeating noise, so its edges didn't match. Where copies meet, the shade jumped 7–14× more than between normal neighbours, a straight
  seam sliding across the map with the clouds. The cloud picture is now made from wrap-around noise (`tn` in `prepTerrain`, `js/render.js`), so the edges match.
- Build number **24**.

### Verified
- Edge mismatch before: 16.7 / 33 (left-right / top-bottom) vs. 2.4 between normal neighbours; after: 0.1 / 0.4 vs. 1.1.
  New smoke check guards it. `npm test` 45/45.

### Open questions for Markus
- Go ahead with the overflow splitter as proposed? Any building names he'd like changed to other names of our own?

---

## Session 21 — 2026-11-11 (Claude Code, cloud session) · Build 25

### What Markus reported
A belt doesn't curve directly out of a crossing the way it seems to with splitters/mergers. It should.

### Findings and fix
- Belt/pipe curves (`e.cin`, set in `rebuildTopo`) were only made when the side neighbour was another belt/pipe pointing in. In fact
  **no** router or crossing made a belt curve (screenshots: splitter, merger and crossing cases all drew straight pieces). Splitters and mergers just
  looked more connected thanks to their arrow markings.
- New `feedsInto(sd,e,o)` in `js/sim.js`: a side neighbour feeds a line if it is a belt/pipe pointing in (as before), a splitter/sorting splitter
  with an output side facing it, a merger whose front faces it, a pipe junction (pipes), or a crossing fed from its far side in the same direction.
  If nothing feeds the line from behind and exactly one side feeds it, it curves. Items follow the curve (`itemPos`), 2D and 3D alike.
- Build number **25**.

### Verified
- `npm test` 46/46, new check: a belt after a splitter side, after two crossings (east and south) and after a merger turn all curve; a plain
  straight belt doesn't; an ore item passes through the crossing and round the curve. Before/after screenshots.

---

## Session 22 — 2026-11-11 (Claude Code, cloud session) · Build 26

### What Markus asked
How do machines decide where output goes, and how is a crossing attached directly to a machine handled, since a crossing has no direction?

### Answer and bug found
- Machines never pull input. Belts/routers/crossings push items in, and a machine accepts what its recipe needs. For output, the machine
  goes round its edge tiles in turn: belts/pipes only if they point away, splitters only from their back, mergers from back/sides, and
  **crossings whenever the lane was free, with no look at what lies behind**.
- Reproduced a permanent jam: ore crate → belt → crossing → smelter. While the ore ran out, the smelter pushed an ingot into the crossing toward the
  incoming belt (which points the other way). The ingot never moved, the lane stayed blocked, and after refilling the ore the smelter stayed at **0 / min**.

### Fix
- `passOK(t,item,d)` + `pushOut` in `js/sim.js`: a building treats a touching crossing as see-through and only pushes into it if the
  entity on the far side would accept that item from that direction.
- `updCross`: an item heading into a belt/pipe that points back at the crossing (can never move, e.g. jams in existing saves) is returned to the item stock.
- DESIGN.md §5 records the rule. Build number **26**.

### Verified
- Same scenario after the fix: the ore runs out, is refilled, and the smelter is back to 30 ingots/min (96 % working). Output through a crossing onto an outgoing
  belt still works (100 %). New smoke check covers both. `npm test` 47/47.
- Follow-up (Build 27): the DESIGN.md §5 note for this rule (and the Session 21 curve rule) didn't apply in Build 26 because of a wording mismatch; added in Build 27. No code change.

---

## Session 23 — 2026-11-11 (Claude Code, cloud session) · Build 28

### What Markus asked
1. Pipes flicker on and off all the time when not fully loaded. Find another way.
2. A button in the Items panel that pulls everything from all storage containers into the main stock.

### What was built
- **Steady pipes:** a pipe tile holds one fluid unit at a time, and the fluid used to be drawn only in the instant it held one, so partly loaded pipes
  blinked. Now each pipe keeps a smoothed fill level (`e._fl`, ~1 s, updated in `updBelt`) and its last fluid (`e._ft`). 2D draws the fluid in that
  colour at a steady strength (4 levels, faint when nearly empty, fading out when it stops). The 3D fluid rings blend the same way.
  Transient fields, not saved.
- **Items → "Move everything from all crates into the stock":** a card at the top of the Items panel shows how many Storage Crates exist and how
  many items they hold, with one button that empties them all into the stock (toast with the total). It notes that crates used as buffers end up empty.
  The per-crate button stays.
- Build number **28**.

### Verified
- `npm test` 49/49. New checks: a pipe fed at ~40 % of capacity flips its raw contents 60× in 15 s while the drawn fill level stays between 0.34 and 0.46;
  the collect-all button moves exactly the 15 test items from two crates and leaves them empty.

---

## Session 24 — 2026-11-11 (Claude Code, cloud session) · Build 29

### What Markus asked for
1. Planner "For a target" with several end products (e.g. Steel Beam and Steel Pipe), each with its own target, combined into one plan.
2. Pin the planner so it stays open while clicking elsewhere, moving the tool buttons (hand, dismantle, …) out of the way.
3. Show the clock on machines in 2D when it isn't 100 %.

### What was built
- **Multi-product reverse planner:** `plRevMulti(targets,pick)` in `js/plan.js` (`plRev` is now a one-target wrapper, so the Power tab, tests and
  play-through tool are unchanged). Demands from all targets are summed and items processed consumers-first, so shared parts are counted once.
  UI: an "End products" card with one picker + rate per product, ✕ to remove, "+ Add product". Cards mark end products with 🎯 and split
  "N as end product + M used by other steps". Old saved planner state (single item/rate) converts automatically.
- **Pinned planner:** 📌 in the planner's header moves it into its own panel `#ppin` (top-left on desktop, replacing the minimap there; top 40 % on phones,
  where other panels then open shorter at the bottom). It stays open on map taps, building and inspecting. It re-renders when the plan changes. 📌 unpins,
  ✕ closes. The pinned state is remembered. All planner styles apply to both panels (CSS rules for `#pbody` duplicated for `#ppbody`).
- **Tool buttons moved** from the right edge into a row at the top of the bottom dock (`#fabs` inside `#dock`), so no panel covers them. Panel heights follow the dock automatically.
- **Clock badge** (`clockBadge` in `js/render.js`): bottom-right "73 %" pill on machines/drills/pumps when the clock isn't 100 %: amber when overclocked, blue when slowed.
- DESIGN.md §8 updated. Build number **29**.

### Verified
- `npm test` 54/54. New checks: Steel Beam 10/min + Steel Pipe 20/min share 70 Steel Ingot/min; add/remove products; pinned planner survives a map tap and
  an entity panel, updates when edited, unpins back to a normal panel; tool row is inside the dock; a 73 % smelter draws its badge.
- Phone screenshot: pinned planner with two products at the top, tool row in the dock, clock badge on a smelter.

### Known issues
- On phones the pinned planner (40 % height) plus an open machine panel leave little map visible. Close the machine panel to see more.

---

## Session 25 — 2026-11-11 (Claude Code, cloud session) · Build 30

### What Markus asked for
1. The clock badge should use the same font size and zoom behaviour as the efficiency indicator.
2. Pin the whole panel on the right (whatever it shows: planner, Stats, …) instead of moving the planner to the left.

### What changed
- **Clock badge:** appears from the same zoom level as the efficiency ring's number (≥ 46 px per tile) with the same font size (`r·0.78`, `r = max(3, s·0.17)`).
- **Pin:** the separate left-side pinned planner (Build 29) is removed. Every panel header now has 📌 (`ACT.pinPanel`, `OPT.pin`, remembered
  per device). While pinned, automatic closes are skipped (`autoClose()`: tapping the empty map, picking a building, Esc). Tapping a machine
  still switches the panel to it, and ✕ closes it. The tool buttons stay in the dock row (Build 29).
- DESIGN.md §8 updated. Build number **30**.

### Verified
- `npm test` 54/54: pinned planner stays open on a map tap and when picking a building; pinned Stats too; unpinned, a map tap closes the panel;
  a 73 % smelter draws its clock badge at close zoom. Phone screenshot of the pinned planner in its normal place.

---

## Session 26 — 2026-11-11 (Claude Code, cloud session) · Build 31

### What Markus reported
Steel Beam and Steel Pipe look too much alike.

### What changed
- Both used the same "rod" item shape with close greys. Now each has its own shape (`SHAPE` / `paintItem` in `js/render.js`):
  - **Steel Beam** (`beam`): a chunky dark graphite bar with a recessed groove and a bold "I" profile at its end. Colour `#5a6270`.
  - **Steel Pipe** (`pipe`): a round, light blue-steel tube with a hollow open end. Colour `#8eb0cf`.
  - Iron Rod keeps the thin grey rod.
- 3D belt items match: a flanged I-beam (3 boxes) and an open tube with a rim ring (`v3ItemsInit`).
- Build number **31**.

### Verified
- Side-by-side render of Iron Rod / Steel Beam / Steel Pipe at icon and belt size: clearly different. `npm test` 54/54 (3D view starts with the new shapes).

---

## Session 27 — 2026-11-11 (Claude Code, cloud session) · Build 32

### What Markus reported
The Coal Burner panel doesn't show how much coal it consumes, unlike the machines.

### Finding and fix
- Confirmed: generator panels showed only capacity, current load and the fuel inside.
- New **Consumption** section (`genUseHtml` in `js/ui.js`) for all generators: **Burns now** (fuel/min at the current load, averaged over
  ~4 s via `_ls` in the power update, so it doesn't jump), **At full load** (max/min and how long one item lasts), water/min (Steam Generator,
  Reactor), nuclear waste/min (Reactor), and **Fuel inside lasts** at the current load. Formula as in `burn()`: fuel/min = MW × 60 ÷ item energy.
- The panel header shows a load badge "⚡ 40%" (green, yellow from 80 %, red from 95 %).
- Build number **32**.

### Verified
- `npm test` 55/55, new check: the test factory's burner at 18 % load shows 2.2 coal/min (= 12 × 0.18), "At full load … 12 Coal/min", and the ⚡ badge.
- Phone screenshot: burner at 40 % load → 4.8 coal/min, 12/min at full, one coal lasts 5 s, the coal inside lasts 8 min.

---

## Session 28 — 2026-11-11 (Claude Code, cloud session) · Build 33

### What Markus asked for
Vehicles. After options were discussed (drones, freight rail, trucks), he chose the recommendation: **Cargo Drones first**, Tier 5,
powered at the pad, solid items only.

### What was built
- **Drone Pad** (`dpad`, 3×3, Logistics, unlocked by Tier 5 "Heavy Industry"; cost 4 Motor, 4 Stator, 6 Cased Girder, 30 Cable; 25 MW while busy;
  holds 400 items). `DRONE` in `js/data.js`: 40 items per trip, 10 tiles/s, 1.5 s load, 1.5 s unload, waits up to 8 s for a full load.
- **Sim** (`updPad` in `js/sim.js`): sender pads (route set) load, fly straight to the target pad, unload what fits, fly back, and return leftovers.
  Unlinked pads pass items on to outgoing belts like crates. If the target is removed mid-flight, the drone turns back. Dismantling a pad refunds its
  store and cargo. Route (`lx`,`ly`), drone state (`dr`) and delivered count (`del`) are saved. Old saves are unaffected.
- **Panel:** route text and distance, "📍 Send to…" (then tap the destination pad; the hint line explains), "✕ Unlink", "Move all into item stock",
  stored items, drone state (on the pad / waiting for a full load / flying out % / returning %), cargo, throughput (≈ items/min and round-trip time), delivered so far.
  Status light: waiting for items / flying / destination full / no power.
- **2D:** pad sprite (landing ring, cross-hair, corner lights); drones with spinning rotors, a cargo box in the item colour, a shadow that
  shrinks with height, take-off and landing; the selected pad's route as an animated dashed line (also while choosing a destination). Simple blocks at far zoom.
- **3D:** pad model (ring, corner lights that glow while busy); drones as instanced models flying at cruise height with cargo box and ground shadow.
- DESIGN.md (§5 logistics, §7 tier 5, §11), CLAUDE.md updated. Build number **33**.

### Verified
- `npm test` 56/56, new check: Tier 5 unlocks the pad; tap-to-link works; two pads 56 tiles apart move exactly 400 items in 150 s (10 full trips),
  the receiver passes them on, and the route plus delivered count survive save/load. The dead-end audit covers the pad's cost.
- A first run showed only 131 items: a Mk1 input belt (60/min) made the drone leave nearly empty each time. That led to the
  "wait for a full load (max 8 s)" rule. The test now feeds a fast belt so it measures the drone.
- Screenshots: drone mid-route in 2D with cargo and dashed route; in 3D flying over the landscape with its cargo box.

### Known issues / next
- One drone per pad (build more pads for more throughput). No fluids yet.
- Possible next steps: planner support for drone routes, fluid tank drones, freight rail for bulk.

---

## Session 29 — 2026-11-11 (Claude Code, cloud session) · Build 34

### What Markus reported
The app gets slightly slow when zoomed far out, despite the simplified graphics.

### Measured first (phone-sized screen at 2× pixels, fully zoomed out, ~2,000 objects)
Frame cost 19.2 ms. Switching parts off one at a time: drifting cloud shadows ≈ 10 ms (one 128 px picture stretched to thousands of pixels and
redrawn every frame), water sparkle ≈ 4.5 ms, background fill + vignette ≈ 4 ms, simplified buildings/belts ≈ 4 ms, ground ≈ 2 ms.
Desktop at minimum zoom: 43.8 ms, mostly ground chunks being shrunk every frame.

### What changed
1. **Cloud shadows and vignette** are now CSS layers above the 2D canvas (`#clouds`, `#vig`). The browser composites them, and `syncClouds` only
   updates the cloud layer's position/size to follow the camera (same drift as before). The canvas background is CSS + `clearRect` instead of a full-screen fill.
2. **Water sparkle** is only drawn from 22 px per tile (it's invisible further out).
3. **Cached simplified view** (`drawLODCached`): at far zoom the block layer is drawn once into a canvas covering the screen plus 25 % margin
   and just shifted while panning. It's redrawn when the zoom changes (during pinch it draws directly), when something is built or removed (`topoVer`,
   bumped in `rebuildTopo`), or once a second for the status dots.
4. **Pre-shrunk ground** (`chunkMip`): when a chunk is drawn at under 60 % / 30 % of its size, a half / quarter-size copy is used (made once).
- Build number **34**.

### Measured after
Phone far zoom standing still 19.2 → **0.8 ms**; panning **6.3 ms** (including newly visible ground being painted); normal zoom 0.7 ms.
Desktop far zoom 43.8 → **2.2 ms**. `npm test` 56/56. Screenshots before/after panning at far zoom: blocks stay aligned with the ground; clouds and vignette still show.

### Known issues
- The first time an area comes into view its ground is still painted (about 20 ms per 32×32 chunk, one per frame), so a fast fling over
  new ground can still hitch briefly. Already painted areas are smooth.

---

## Session 30 — 2026-11-11 (Claude Code, cloud session) · Build 35

### What Markus asked for
1. Check performance on a **tablet** (that's where he'll play).
2. A way to highlight certain ore nodes visually and temporarily, to find them more easily.

### Tablet check and fix
- Measured at iPad 1024×1366 / 1366×1024 and Android 800×1280, all at 2× pixels: medium/close zoom 1–5 ms, but **fully zoomed out 26–47 ms**
  (about 35 ground chunks at full sharpness on a 5.6-megapixel canvas).
- Fix: **lower canvas resolution when zoomed far out** (`wantLow`/`resize` in `js/render.js`): 1× instead of 2× below ~11–13 px per tile (with hysteresis),
  back to full sharpness when zooming in. Far zoom on tablets is now **2.0–2.6 ms** (panning 2.4–9.7 ms). Tablet layout (panel right, dock centred, minimap) checked in screenshots.

### Find / highlight resource nodes
- 🔍 button in the dock's tool row → **Find resources** panel (`findHtml`): a chip per resource with node counts, "Free nodes only" / "All nodes",
  nearest highlighted node with distance, **✈ Fly to nearest**, **✕ Clear**.
- A resource node's panel: **"🔦 Highlight all X nodes"**.
- On the map: a pulsing amber ring per highlighted node (minimum size, so it shows at far zoom); if none of a type is on screen, an **edge arrow**
  pointing to the nearest one with its distance; blinking dots on the minimap; slim light beams in 3D.
- Temporary: state `UI.hl` is not saved. A chip above the dock ("🔦 Raw Quartz, Sulfur · 251 ✕") shows what's highlighted and clears it.
- DESIGN.md §8 updated. Build number **35**.

### Verified
- `npm test` 57/57, new check: highlight uranium (113 nodes), chip shown, edge arrow with distance drawn, fly-to-nearest moves the camera, node-panel
  button highlights iron, clear removes everything.
- Tablet screenshots: Find panel with two resources highlighted at far zoom; 3D beams (made slimmer and more transparent after the first look).

---

## Session 31 — 2026-11-11 (Claude Code, cloud session) · Build 36

### What Markus asked for
"Pipes have a direction. I think they shouldn't." After the proposal: go with the suggestions, but **keep the Pipe Junction**
(easier to feed machines) while plain pipes also connect without it. He also said to always use the suggestions (recorded in CLAUDE.md).

### What was built
- **Fluid networks** (`buildNets`/`updNets`/`syncPipes` in `js/sim.js`): pipe tiles and Pipe Junctions that touch (or line up through a Crossing)
  form one network. A network has one fluid (sticky until emptied), 10 m³ per tile (`PIPE_CAP`), and moves at most the slowest pipe's rate in and out
  (Mk1 300, Mk2 600 m³/min). Touching buildings take part automatically: pumps, machine fluid outputs and tanks (when the network is < 50 %) fill it;
  machines/generators needing that fluid, tanks (> 80 %) and incinerators draw from it. A second fluid is refused and recorded as a conflict.
  Pipes no longer accept single items (`accept`); routing via the old per-tile movement is gone for pipes.
- **Pipe Junction kept** as a 4-way network piece (same as a pipe, can't be rotated). Plain pipes connect just as well.
- **2D:** pipes are drawn by their connections (straight, corner, T, cross, end) with round joints; fluid colour and fill come from the network (no moving
  direction dashes any more). A red "!" marks where a building's second fluid is refused. Far view draws pipe crosses too.
- **3D:** pipes are arms from each tile centre to every connected side (tier colour) with a joint ball tinted by the network's fluid and fill.
- **Pipe panel:** network fluid, filled m³ / capacity, in/out per minute, max flow (slowest pipe), number of pipes and connected buildings, the mixing
  warning, and "Empty this network". No Rotate button for pipes or junctions.
- **Saves:** each pipe tile stores the network's fluid (`item`) and fill (`lv`). Old saves load (one unit per tile that held fluid), direction ignored.
- Descriptions, DESIGN.md §5, CLAUDE.md updated. Build number **36**.

### Verified
- `npm test` 59/59, twice on different maps. New checks: tank → three pipes laid "backwards" → junction → corner → incinerator form **one network
  flowing 300 m³/min**; a crude-oil tank on a water network is refused and flagged (no mixing); fluid and amount survive save/load.
- Fixed two shaky tests found on the way (highlight test now zooms in so no uranium node is on screen and measures from the camera's final position).
- Screenshots: 2D T-junction network with the network panel (water, 297 / 297 m³/min in/out); 3D connected tubes with joints, junction, Mk2 section.

### Known issues
- "First fluid wins": an empty network takes whatever fluid arrives first. If the wrong one got in, use "Empty this network".
- Fluid recipes above tier 5 (refinery chains, blender) aren't bench-tested with the new pipes yet. Worth running when Markus reaches Petrochemistry.

---

## Session 32 — 2026-11-11 (Claude Code, cloud session) · Build 37

### What Markus asked for
1. Signs of different sizes to label factories (suggest how; footprint like a building, several sizes). Built with the suggested defaults (his standing preference).
2. Switching to 3D should start from a standard airplane angle and slowly circle the spot that was in the middle of the screen, like an online globe view.

### What was built
- **Signs:** `sign1`–`sign4` (`k:'sign'`, 1×1 to 4×4, cost 1/2/4/6 Iron Plate, start unlocked, Logistics tab, can stand on water). Placing one opens its
  panel with the text field focused; 6 colours (`SIGN_COL`). Text `tx` and colour `tc` are saved. 2D: board in its colour, text wrapped to ≤ 3 lines and
  sized to fill (`signLayout`/`drawSign`), dark or white text by board brightness, also drawn in the far-zoom view. 3D: base and two posts, plus a
  camera-facing label sprite (canvas texture, redrawn when text/colour change).
- **3D fly-in** (`v3Intro`/`v3Stop` in `js/view3d.js`): on entering 3D, pitch eases from straight down (1.5) to 0.62 rad (~35°) over 2.4 s, distance
  to 80 %, and the camera then orbits the centre spot at one turn per 90 s. Any touch/drag/pinch, the wheel, keys or the compass button stop it.
- DESIGN.md §8 updated. Build number **37**.

### Verified
- `npm test` 61/61. New checks: four sign sizes; placing opens the text box; typed text "Iron Works" + colour is drawn and survives save/load. Fly-in starts top-down,
  ends at 0.62, keeps circling, and a click stops it (the test waits for the fly-in to finish because the headless 3D runs only a few frames per second).
- Tablet screenshots: signs in six sizes and colours close up and fully zoomed out; 3D labels on posts (made slightly smaller after the first look).

---

## Session 33 — 2026-11-11 (Claude Code, cloud session) · Build 38

### What Markus asked for
1. Cased Girder and Concrete look identical: give one a different icon.
2. Pipes should connect to buildings **only through Pipe Junctions**. A pipe running right next to a machine shouldn't connect everywhere; the junction
   is the dedicated entry point. (Pipes still have no direction and connect to each other.)

### What changed
- **Cased Girder** has its own item shape `girder` (2D `paintItem`, 3D belt item): a long sand-coloured concrete beam with dark steel end caps,
  a steel band and an "I" profile on the end. Colour `#a39a86`. Concrete stays the plain grey block.
- **Junction-only entry points** (`buildNets` in `js/sim.js`): network attachments and the building-side connection arms come only from Pipe Junction tiles.
  Plain pipes connect to pipes, junctions and crossings, never to buildings. Descriptions, pipe panel text, DESIGN.md §5 and CLAUDE.md updated.
- **Fix found on the way:** `rebuildTopo` still cleared a junction's stored item (from Build 36) on every layout change, which threw away the junctions'
  share of the network contents on reload. Removed.
- Build number **38**.

### Note for Markus
- Pipe setups built since Build 36 where a plain pipe touches a machine directly now need a Pipe Junction at that entry point.

### Verified
- `npm test` 62/62, twice. The pipe test now uses junctions as entry points (300 m³/min). New check: plain pipes running past an incinerator stay unconnected.
  The save/load check for network contents passes again.
- Icon comparison: Concrete / Cased Girder / Steel Beam clearly different at icon and belt size.

---

## Session 34 — 2026-11-11 (Claude Code, cloud session) · Build 39

### What Markus reported
Signs don't appear in the Logistics menu. And they shouldn't be there anyway (it's already large); give them their own menu.

### Cause and fix
- Saves store the unlock lists from when the game started. Signs were added to the start set in Build 37, so existing games never got them.
  The same gap would hit any building added to an already completed tier (e.g. the Drone Pad for games past Tier 5).
- `grantUnlocks()` in `js/main.js` runs on every load: adds the start buildings/recipes plus everything from completed tiers that's missing
  (and overclocking after Steelworks).
- New build-menu tab **Signs** (`CATS` gets `['sign','Signs']`, its own icon). The four signs moved out of Logistics.
- Build number **39**.

### Verified
- `npm test` 63/63. New check: a save with signs and Drone Pad removed from its unlock list (and 5 tiers done) gets both back on load, and the Signs tab lists exactly the four signs.
- Tablet screenshot of the dock with the Signs tab.

---

## Session 35 — 2026-11-11 (Claude Code, cloud session) · Build 40

### What Markus asked
Move a building with a long press and drag, if that works on a tablet; otherwise think of another way.

### What was built
- **Long press + drag** (2D and 3D): with no build tool selected, hold a building ~0.45 s without moving (short vibration where supported, toast
  "Moving …"). Drag: a see-through copy follows the finger, outlined green (fits) or red (blocked). Let go to place; on a red spot it stays where it was
  and a toast says why. A second finger (pinch) cancels the move. Moving the finger before the 0.45 s is a normal pan, so panning is unchanged.
- **✥ Move button** in every building panel (next to Rotate/Dismantle), for long distances: tap it, pan anywhere, tap the new spot. Esc cancels.
- `canMove(e,x,y)` / `moveEnt(e,x,y)` in `js/sim.js`: same entity object, so recipe, buffers, clock, fuel, sign text and drone route all stay.
  Pads whose route pointed at a moved pad follow it. Drills/pumps re-check their node via `initEnt`. The Core can't be moved. Moving is free.
- Canvas gets `-webkit-touch-callout:none` so iPad/Android don't show their own long-press menu.
- Build number **40**.

### Decisions
- Long press only in inspect mode (no tool), so it never clashes with placing or belt dragging.
- The new spot must be fully empty (even belts can't be overlaid by a moved belt), plus the usual placement rules (water, ore node, …).

### Verified
- `npm test` 64/64. New check: moving keeps recipe/buffer/clock, a blocked spot is refused, a real mouse long-press + drag moves a smelter
  (preview green during drag), and the ✥ Move button + tap moves it back.

### Next up / open questions
- Overflow splitter (proposed earlier, not yet confirmed).
- Maybe: moving a whole selection of buildings at once.

---

## Session 35b — 2026-11-11 (Claude Code, cloud session) · Build 41

### What Markus asked
Put the Drone Pads into their own transport menu.

### What was built
- New build-menu tab **Transport** (`CATS` gets `['trans','Transport']`, drone icon), between Power and Signs. The Drone Pad moved there from Logistics.
  It's the home for future vehicles too. Before Tier 5 the tab shows "Nothing unlocked here yet".
- Build number **41**.

### Verified
- `npm test` 64/64; the unlock/tabs check now also confirms the Drone Pad is listed under Transport. Tablet screenshot of the dock (six tabs fit in one row).

---

## Session 35c — 2026-11-11 (Claude Code, cloud session) · Build 42

### What Markus asked
Change the size of a sign after it is placed.

### What was built
- Sign panel: new **Size** row (S / M / L / XL, finger-sized buttons) between Text and Colour.
- `resizeSign(e,id)` in `js/sim.js`: same entity (text, colour kept), tries the same top-left corner, then the same centre. Bigger costs the extra
  iron plates, smaller refunds them. No room → toast "No room for that size here", nothing changes.
- Build number **42**.

### Verified
- `npm test` 64/64. The signs check now also shrinks L→S (3 plates back, text kept) and grows S→L again (covers 3×3, plates paid). Tablet screenshot of the panel.

---

## Session 35d — 2026-11-11 (Claude Code, cloud session) · Build 43

### What Markus asked
An XXL sign as well.

### What was built
- **Sign XXL** (`sign5`): 6×6, 9 iron plates, in the Signs tab and as a fifth Size button in every sign's panel; 2D, 3D and toolbar icon.
- New list `SIGNS` in `js/data.js`; the start set, size buttons, 3D models and tests use it, so another size later is a one-line change.
  Existing games get it on load (`grantUnlocks`).
- Build number **43**.

### Verified
- `npm test` 64/64 (sign sizes 1,2,3,4,6; five size buttons; five signs in the tab; older saves get all five).

---

## Session 35e — 2026-11-11 (Claude Code, cloud session) · Build 44

### What Markus asked
Logistics is too big: split it into fluids and non-fluids. Incinerator to the end of Production, and make it 2×2 like a Press.

### What was built
- New tab **Fluids** (droplet icon) right after Logistics: Pipeline Mk1/Mk2, Pipe Junction, Fluid Tank. Logistics keeps belts, splitters, sorter, crossing, crate.
- **Incinerator** is now **2×2** and the last card in Production. New 2D icon (grate, chimney) and a bigger 3D model.
- **Old saves:** `growIncin()` in `js/main.js` runs on load. It rebuilds the grid, then each incinerator takes a free 2×2 that contains its old tile
  (own corner first, then the three other ways). Belts that fed it still touch it. If it's boxed in, it goes back to stock (cost refunded) and a toast
  says how many. It's harmless for 2×2 ones (they keep their corner).
- Tests/play-through layouts moved where the bigger incinerator overlapped neighbours.
- Build number **44**.

### Verified
- `npm test` 65/65. New check: Fluids tab contents, incinerator 2×2 and last in Production, nothing fluid left in Logistics; an old-style save with a
  boxed-in 1×1 incinerator (refunded, belts intact) and a free one (grows from its corner, stays put on a second load).
- `npm run playthrough`: all recipes and drill rates as expected. Tablet screenshot: seven tabs fit in one row.

---

## Session 35f — 2026-11-11 (Claude Code, cloud session) · Build 45

### What Markus asked
Make the 3D graphics nicer (2D stays as it is), keeping the current look as a switchable fallback for speed. Session nearly out of tokens,
so only the first half of the plan.

### What was built
- ☰ Menu → **3D look: Enhanced / Classic (faster)**, saved per device in `frontierworks_view` (`V3.look`). Enhanced is the default.
- Enhanced (`v3Look()` / `v3Env()` in `js/view3d.js`):
  1. Filmic (ACES) colour grading, sun 1.15 / sky fill 0.3.
  2. Sky reflections: a small sky-gradient-plus-sun scene turned into an environment map (PMREM) once. Metal parts reflect it strongly (0.85),
     other parts lightly (0.3) and the ground barely (0.12). Strengths are set in `v3Layout` when the look changes.
  3. Soft contact shadows: one instanced pool of radial-gradient decals under every building (not lines or signs), one extra draw call.
- Classic = exactly the previous setup (no grading, no environment, no decals).
- Build number **45**.

### Verified
- `npm test` 66/66. New check: Classic turns off grading, reflections and contact shadows and is saved; Enhanced turns them back on.
- Screenshots of both looks. First try was washed-out (exposure 1.32), so it was toned down.
- Timing here uses software rendering (no GPU): Enhanced took about 1.7× longer per frame than Classic, mostly the reflection maths per pixel.
  On a real GPU this should be small, but **needs checking on Markus's tablet**. If it's slow, Classic is the switch.

### Next up
- Part 2 of the 3D pass: more model detail (rounded edges, rivets, vents, lit windows), moving water shimmer, warmer horizon.
- Overflow splitter (proposed, not confirmed). Late-tier (6–10) balance check.

---

## Session 35g — 2026-11-11 (Claude Code, cloud session) · Build 46

### What Markus said
Build 45 Enhanced mostly looked brighter; only the shadow under poles was visible. He wants the looks fixed now (more fun than balance):
do part 2, more model detail and rounded edges.

### What was built
- **Rounded edges** (Enhanced only): every static box part of every building model is built as a bevelled box at its real size
  (`v3RBox`, cached by size; edge radius ≤ 0.075 tiles, smaller for small parts; parts thinner than 0.08 stay sharp). Same draw calls, more vertices.
- **Corner bolts** on every building plinth (`base()` in `v3Models`).
- Brightness back near Classic (exposure 0.9, sun 0.95); contact shadows and metal reflections kept.
- Models are built when 3D starts, so switching Enhanced/Classic changes the shapes after ↻ reload (toast says so); lighting switches at once.
- Build number **46**.

### Verified
- `npm test` 66/66 (3D renders, 53 draw calls). Screenshot: rounded smelter/press/burner/core edges catch the light, bolts visible, no washed-out look.

### Next up
- More per-model detail (vents, rivets rows, lit windows, pipes on machines), moving water shimmer, warmer horizon. Check tablet speed of Enhanced.

---

## Session 35h — 2026-11-11 (Claude Code, cloud session) · Build 47

- Markus likes the rounder 3D look. Removed the "Model shapes change after ↻ reload" part of the 3D-look toast (he kept seeing it).
- `npm test` 66/66. Build number **47**.
- Next for 3D, as discussed: canvas-drawn surface textures (metal panels, concrete, rust/wear, painted stripes) on the models,
  then per-model detail (vents, rivet rows, lit windows), moving water shimmer, warmer horizon.

---

## Session 35i — 2026-11-11 (Claude Code, cloud session) · Build 48

### What Markus asked
Go ahead with step 1 of the next 3D plan: surface textures.

### What was built
- `v3Merge` now writes UVs by box projection (one texture repeat per tile, from the dominant normal axis), so any shared texture tiles evenly over every part.
- `v3Detail()`: one 256 px canvas texture drawn in code (light grey, so it only shades the vertex colours): speckle, faint panel tones, one seam
  per tile with a row of rivets, fine scratches, grime spots. Used as `V3.mat.map` in Enhanced; Classic switches it off at once.
  Same draw calls, one small texture.
- First version had seams every half tile and looked like floor tiles, so it was toned down to one subtle seam per tile.
- Build number **48**.

### Verified
- `npm test` 66/66 (3D renders, 52 draw calls). The look check now also confirms the texture is on in Enhanced and off in Classic, and that models have UVs.
- Close-up screenshots: press, burner, core show worn panels and rivets, and colours stay as before.

### Next up
- Step 2: per-model detail on the most-seen buildings (smelter, press, assembler, drills): vents, lit windows, pipes, fans.
- Then water shimmer, warmer horizon, optional time of day.
