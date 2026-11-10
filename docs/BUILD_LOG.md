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
