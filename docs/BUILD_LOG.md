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

---

## Session 35j — 2026-11-11 (Claude Code, cloud session) · Build 49

### What Markus said
He likes the textures, but the changed lighting makes the whole landscape look pale.

### What changed
- Enhanced now uses exactly the Classic light (no filmic grading, same sun/sky strengths). The grading and the sky reflections on the ground
  were what made the landscape pale.
- Kept in Enhanced: rounded edges, plinth bolts, panel texture, contact shadows, and sky reflections only on metal parts (rails, pipes; strength 0.5).
  Every non-metal surface, including the ground, gets no sky reflection.
- Build number **49**.

### Decision
- No colour grading for now. Markus prefers the original colours; detail comes from shapes and textures, not light.

### Verified
- `npm test` 66/66. Screenshot: landscape colours as in Classic, buildings textured and rounded.

---

## Plan agreed with Markus — 2026-11-12 (next steps, in this order)

1. **3D brightness (ask Markus first, change nothing until he answers).** He saw a brighter, nicer glimpse when 3D opened: materials start
   with full sky light (`envMapIntensity` 1) until `v3Layout` turns it to 0 for non-metal. Idea: keep the sky light on for everything at a
   strength tuned with him, compared against a screenshot from his tablet. He is adjusting his screen brightness first.
2. **Cloud save sync via a private GitHub Gist** (being built now, see the next entry). Rules agreed:
   - A device uploads only if the cloud still holds the version it started from (its *base*).
   - Cloud newer and this device not played since its base → load automatically; both played → ask, keep the loser as backup.
   - First connection of a device to a non-empty cloud always asks. Downgrade guard: never auto-load a cloud save with a lower tier
     or far fewer buildings; ask instead.
   - Import asks "all devices" or "only this device" (pauses sync there). "Undo last sync" restores the local copy made before a cloud load.
   - "Playing now" marker warns when another device played in the last few minutes. Automatic, plus Sync now and status in ☰ Menu.
3. **Code audit session** after the sync: report first (dead code, leftovers of removed features, duplicates, slow spots), then cleanup in small
   commits that change no behaviour, tests after each. No big rewrite. Repeat every 10–15 builds or after a big feature.

---

## Session 35k — 2026-11-12 (Claude Code, cloud session) · Builds 50–51

### What Markus asked
Note the agreed plan in the devlog (Build 50), then build the cloud save sync across devices.

### What was built (Build 51)
- New file `js/sync.js` (added to `index.html` and the offline list in `sw.js`):
  - **Private GitHub Gist** `Frontier Works save (managed by the game, do not edit)`, found by its description, so a second device only needs the key.
    Files: `fw-save.txt` (FW2 export text), `fw-meta.json` {ver, dev, name, time, tier, n, t}, `fw-live.json` (playing-now marker, `closed` when the app is left),
    `fw-backup.txt` (the cloud game replaced by a forced upload).
  - State `SC` in localStorage `frontierworks_sync`: token, gist id, device id/name, base (meta ver + writer), game time at the base, paused.
  - "Played since base" = more than 20 s of game time (`S.t`) since the last sync.
  - Decision table in `syncNow()`: cloud empty → upload; cloud = base → upload if played, else a heartbeat every 2 min; no base yet → ask;
    cloud newer and not played → auto-load, but ask if it looks older (lower tier or under 70 % of the buildings); both played → ask.
    Another device's live marker under 3 min old and not closed → ask before taking over.
  - Conflict dialog shows both sides (tier, buildings, play time, when saved): Keep this device's game / Use the cloud game / Decide later.
    The loser is kept: a forced upload stores the old cloud game in `fw-backup.txt`; a cloud load first stores the local game in IndexedDB `presync`.
  - Undo last sync restores `presync` and pauses sync. Resume forgets the base, so it asks which game to keep. Import asks "All devices" (forced
    upload) or "Only this device" (pause).
  - Automatic: on start (`syncBoot` from main's boot), when coming back to the app, every 3 min while visible, when going online; on leaving it uploads
    if changed and marks the live marker closed.
  - ☰ Menu → Cloud save (GitHub): setup text (classic token, only the "gist" box), key + device name fields, Connect; then status, Sync now,
    Pause/Resume, Undo last sync, Disconnect.
- Build number **51**.

### Verified
- `npm test` 67/67. New check against a fake GitHub (Playwright `page.route`), with two simulated devices: tablet uploads first; phone with a fresh map
  is asked and takes the cloud game; phone plays and uploads v2; tablet gets the playing-now warning, then auto-loads v2; Undo pauses; Resume asks;
  an injected tiny lower-tier v3 triggers the "looks older" question (kept the local game, old cloud game in the backup file); both played → asked,
  Decide later holds; import asks and "only this device" pauses; Menu section shows; Disconnect clears the key.
- Found by the test and fixed: after answering a question the sync wasn't marked busy while loading/uploading.
- **Not tested against real GitHub** (needs Markus's key). First real check is his.

### How Markus sets it up
1. On the tablet (the real game): github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token,
   tick only **gist**, copy it. ☰ Menu → Cloud save → paste key, name "Tablet", Connect.
2. On the phone: same key, name "Phone", Connect. It asks which game to keep: choose the cloud game (from Tablet).

### Next up
- Markus tries the sync on two devices. Then the 3D brightness question, then the code audit session.

---

## Session 36 — 2026-11-12 (Claude Code, cloud session) · Build 52

### What Markus reported
On his phone, opening a machine's panel switched its recipe (to "the first one"). He then noticed it is the recipe button that appears under
his finger after the tap.

### Cause
A ghost tap. On phones the panel opens as a bottom sheet. A finger tap on the map opens it on pointer-up; the browser then sends the same tap as a
`click` to whatever is now under the finger, which can be a recipe button (`setRec`). Reproduced in a phone-sized touch browser (412×915 and 390×844):
taps at 42 % and 53 % of the screen height changed Wire to Iron Rod / Bolts. The tablet (side panel) and landscape phones weren't affected.
Not introduced by a recent build: the bottom-sheet layout and tap-on-release have worked this way for a long time.

### Fix
- `mapTap` (`js/input.js`) records time and position of every map tap (2D `endPtr` and the 3D end handler).
- The global click handler in `js/ui.js` ignores a click that comes less than 0.6 s after, and within 40 px of, a map tap
  (except in the bottom dock). Real taps on the panel are unaffected.
- Build number **52**.

### Verified
- Phone-size reproduction before/after: recipe stays at all tested positions (portrait 412×915, 390×844, landscape 915×412).
- `npm test` 68/68. New check: phone portrait + touch, tapping a machine at three heights opens its panel and the recipe stays.

---

## Session 36b — 2026-11-12 (Claude Code, cloud session) · Build 53

### What Markus asked
1. After Build 52 the ghost tap no longer selects a recipe, but the button under the finger still visibly "presses".
2. Once a machine has a recipe, show only that one (declutter); tapping it shows the others to change. A new machine shows the full list.

### What was built
- `calmPanel()` (`js/input.js`): after a finger tap on the map (2D and 3D), the panel ignores touches for 0.45 s (`pointer-events:none`), so the
  ghost tap neither selects nor highlights anything. Mouse taps are unaffected. The Build 52 click filter stays as a second guard.
- Recipe list (`entStatic` in `js/ui.js`): with a recipe set, only the active recipe shows, with a "Change ▾" tag. Tapping it opens the full list
  (`UI.recOpen` = that machine). Tapping the active one again folds it, and picking another recipe folds it too. With no recipe set (or a recipe no
  longer in the list), all recipes show.
- Build number **53**.

### Verified
- `npm test` 69/69. New check: a new machine shows all 6 press recipes; after picking, 1 plus "Change"; tapping shows 6; a new pick folds to 1.
- Phone screenshot: the folded panel is much shorter; "Change ▾" is readable on the orange active button (dark text on a light chip).

---

## Session 36c — 2026-11-12 (Claude Code, cloud session) · Build 54

### What Markus asked
1. Keep the planner on screen while clicking around: a button next to the pin that pins only the planner to the left side. Other panels keep
   opening/closing on the right and follow today's pin.
2. Tick boxes on planner steps that grey them out ("built already"). Temporary: a new plan clears them.

### What was built
- New window `#lpanel` (left; on phones ≤700 px a sheet at the top) with its own header: ⇥ back to the right, ✕ close.
  `plRenderLeft()` draws `planHtml()` into `#lbody`; `plRefresh` updates whichever planner is visible; `plOpen()` decides left/right.
  All ways of opening the planner (top bar, Menu, "Plan this node", "Plan the power") go through it.
- ⇤ button (`#plLeftBtn`) in the right panel's header, shown only for the planner. `OPT.plLeft` / `OPT.plOpen` (per device) remember the choice and
  reopen it after a reload. The minimap hides while the planner is pinned on the left (same spot).
- Planner CSS reused for the left window (rules for `#pbody/#phead/#ptitle` extended to `#lbody/#lhead/#ltitle`).
- Tick boxes: "From a node" steps (key = step + recipe) and "For a target" machine cards (key = item). Ticked cards get 45 % opacity and grey.
  Stored in `PL.done` with the plan signature `PL.doneSig` (node: resource/purity/extractor; target: the set of end products). A different signature
  clears all ticks. Rate or clock tweaks keep them. Saved with the planner settings, so they survive a reload.
- Build number **54**.

### Verified
- `npm test` 70/70. New check: ⇤ shows on the planner; pinning moves it left; a building panel opens on the right beside it and closes without
  affecting it; reopening the planner uses the left window; tick greys a card, survives a rate change, clears for other end products; ✕ closes
  and reopens; ⇥ moves it back to the right.
- Screenshots: tablet landscape (planner left, Base Core right, ticked card grey) and phone (planner top, panel bottom).

---

## Session 36d — 2026-11-12 (Claude Code, cloud session) · Build 55

### What Markus asked
A "rubber" next to the trash can: swipe over belts, crossings, splitters and mergers to remove only the items on/in them (e.g. a wrong item
clogging a line) without rebuilding, and maybe tap a machine to empty it.

### What was built (with my suggested defaults, per his standing preference)
- Dock button **Eraser** (`#fClr`, tool `'clr'`, key C) next to Dismantle; hint text in the dock; blue hover outline in 2D.
- `eraseEnt(e)` in `js/sim.js` (kinds in `ERASE_K`): belts/routers (item), crossings (both lanes), machines (input/output buffers + the inputs of
  a running cycle; recipe stays), drills/pumps (buffer), generators (output, e.g. waste). Pipes and Pipe Junctions empty their whole fluid network.
  Items go back to the item stock (`give`); fluids just drain. Storage (crate, tank, Drone Pad, Core) is left alone, with a toast saying so.
- Swipe (2D and 3D) erases lines, routers and crossings it passes over; one toast at the end with the count. Tap erases any erasable building.
- Build number **55**.

### Verified
- `npm test` 72/72. New checks: belts/splitter/crossing emptied with exact stock refunds, machine buffers emptied with the recipe kept, crate
  untouched, pipe network drained, no building removed; a real mouse swipe over a 6-belt line leaves 0 items and all 6 belts.
- Phone screenshot: the eraser fits in the dock row.

---

## Session 36e — 2026-11-12 (Claude Code, cloud session) · Build 56

### What Markus asked
Remove the help texts from ☰ Menu: how to play, how to rotate in 3D, and the "app is installed" note.

### What changed
- Removed the 3D controls line and the "How to play" block (incl. key list) from `menuHtml`.
- The Install app section disappears when the game runs as an installed app. On a device where it isn't installed yet it still shows the
  install button, since that's the only way to install it there.
- Build number **56**.

### Verified
- `npm test` 72/72.

---

## Session 36f — 2026-11-12 (Claude Code, cloud session) · Build 57

### What Markus asked
A throughput meter for belts and pipes, in the same font style as the efficiency indicator; proposal plus tier. He agreed to the proposal.

### What was built
- **Flow Meter** (`fmeter` in `js/data.js`, Logistics tab, unlocks with Tier 1 "Field Assembly", 2 Iron Plate + 4 Wire). Not its own entity: a
  marker `e.fm` on a belt/pipe tile (added to `SKEYS`, so saved). `toggleMeter(e)` puts it on/takes it off (pay/refund).
- Measuring (`js/sim.js`): `accept()` counts items arriving on a metered belt (`e.fc`); once per second the counts go into a 30-entry window
  (`e.fh`). `fmRate(e)` → [per minute, max per minute]; pipes use their network's `max(inR,outR)` and the network's speed limit.
  List `meters` built in `rebuildTopo`.
- 2D (`drawMeters`): small dial with a needle on the tile + a pill badge above it in the clock/efficiency style (Inter 700, dark pill,
  white/amber/grey rim). 3D (`v3Meters`): dial disc + floating label sprite. Panel: Flow, Maximum here, Used %.
- Belt upgrade keeps the meter; dismantling refunds it; tapping a non-line tile says to use a belt or pipe.
- Build number **57**.

### Verified
- `npm test` 73/73. New check: unlocked in Tier 1, costs paid; a full Mk1 line measures 60/min of 60; pipe meter max 300; badge drawn; panel rows;
  kept through save/load and a belt upgrade; taking it off refunds; crates can't take one.
- Screenshots in 2D and 3D (amber badge at the belt limit).

### Next up
- Power: Markus wants cleaner pole connections (no spider web) and a way to switch off single factories when the grid trips. Proposal pending.

---

## Session 36g — 2026-11-12 (Claude Code, cloud session) · Build 58

### What Markus asked
The efficiency badge feels smaller than before. Make its circle as large as the item icon's circle on the machine, and size the Flow Meter badge
to match.

### What changed
- `badgeR(s,P)` / `badgeFs(s,P)` in `js/render.js`: the item icon's dark circle (`min(s·0.32, P·0.16)·1.25`) is now the reference.
  The efficiency ring's background circle has that radius (was ≈ 0.23 tiles, now ≈ 0.4 on a 2×2 machine), with its number scaled along; it sits at
  the top-left, mirrored to the item icon at the bottom-left. Clock badge and Flow Meter pill use the same text size; the meter's dial is a bit bigger.
- Numbers show from a slightly farther zoom (tile ≥ 34 px instead of 46), since they're bigger now.
- Build number **58**.

### Verified
- `npm test` 73/73. Screenshot: ring, item icon, clock badge and meter badges at matching sizes.

---

## Session 36h — 2026-11-12 (Claude Code, cloud session) · Build 59

### What Markus asked
Power lines connect to whatever is in range (spider web), and when a grid trips it's nearly impossible to switch off single factories. He agreed
to my proposal: tidy wires + a Power Switch per factory.

### What was built
- **Saved wires** (`e.pl`, in `SKEYS`): `pnLink/pnUnlink/pnPeers` in `js/sim.js`. `rebuildTopo` builds grids from saved wires instead of
  "up to 5 nearest". New nodes get one wire to the nearest node in range (`pnAuto`, in `placeEnt`).
- **Removing/moving** a node: neighbours left without wires rewire to the nearest; `pnHeal` also bridges a split (a neighbour cut off from the
  others gets one wire to the nearest node in range outside its part). Found while testing: without this, removing a pole in the middle of a line
  split the grid.
- **Migration**: saves without `S.pw2` rebuild the old web once, then keep a minimum spanning tree (Kruskal by length), so exactly the same
  buildings stay connected with far fewer wires. New games set `S.pw2`.
- **Power Switch** (`pswitch`, Power tab, Tier 1 Field Assembly, 4 Iron Plate + 6 Wire): k 'pole', link 10, supply 0 (powers nothing itself).
  `e.off` cuts its wires (`pwLinks` entries carry a `cut` flag; no union), `e.tx` name. 2D: box with a green/red lever + name tag; 3D: post with a
  coloured lever; cut wires dashed grey (2D) / grey (3D).
- **Panels**: switch name field + Turn off/on; every node lists its wires (✕) with "＋ Connect to…" (tap mode `UI.wireFrom`, range-checked);
  the grid section lists the grid's switches with the load behind each (`swLoad` over `swSide`, the side with fewer generators) and on/off buttons.
- Selected grid's wires drawn thick yellow; placing a pole previews its one wire.
- Build number **59**.

### Verified
- `npm test` 74/74. New check: a 6-pole cluster + burner gets exactly 6 wires (tree) in one grid; an old-style save (wires and `pw2` removed)
  migrates to a tree with the same single grid; burner—pole—switch—pole—smelter powers the smelter, switch load = smelter's 4 MW; off → smelter
  unpowered in its own grid, main grid not tripped; off state, name and wires survive save/load; back on → powered; panel lists "Iron Works";
  removing the middle pole keeps the smelter on the burner's grid; manual wire add + cut.
- `npm run playthrough`: recipes and pacing unchanged (measurement noise only).
- Screenshot: switch with name tag, yellow highlighted grid, clean single wires, panel controls.

---

## Session 37 — 2026-11-13 (Claude Code, cloud session) · Build 60

### What Markus asked
The power planner (Power tab) needs the same tick boxes as the other planner tabs.

### What was built
- Tick boxes on the Power tab's "Power plant" card (`w:plant`), each fuel-chain card (`wc:<item>`) and the "Drills & pumps" card (`w:ex`).
- Plan signature for the Power tab is now generator + fuel: picking another generator or fuel clears the ticks; changing the MW keeps them.
- Build number **60**.

### Verified
- `npm test` 74/74; the planner check now also ticks the power plant card and confirms it stays greyed after a MW change.

---

## Session 37b — 2026-11-13 (Claude Code, cloud session) · Build 61

### What Markus asked
Plan several production chains at the same time. (Also asked how to cross pipes over belts/pipes: answered, the Crossing already does both;
verified in the game that a belt and a pipe pass through one Crossing and that two crossing pipes stay separate networks.)

### What was built (my suggested defaults)
- `PLS = {list, cur}` in `js/plan.js`; `PL` is the active plan (same object), so all planner code works unchanged. Storage `{v:2, list, cur}`;
  old single-plan storage becomes the first plan (`plNorm`).
- Plan tabs at the top of the planner (blue when active, divider below): names from content (`plName`: "Iron Rod", "Copper node",
  "Power 90 MW") unless renamed. ＋ New plan, ✎ Rename (prompt), ✕ Delete this plan (confirm), max 12.
- "Plan this node" and "Plan the power for this" open a new tab (`plNewTab`, reuses an untouched plan); the power one is named "Power for …".
- Ticks are per plan (they live in each plan).
- Build number **61**.

### Verified
- `npm test` 75/75. New check: two new plans (target Iron Rod with a tick, Power 90 MW) show as tabs; switching restores each plan's mode,
  numbers and ticks; "Plan this node" adds a tab for copper; storage holds the list; delete removes one; old format converts.
- Tablet screenshot of the tabs in the left-pinned planner.

---

## Session 37c — 2026-11-13 (Claude Code, cloud session) · Build 62

### What Markus asked
The planner should use byproducts of production steps in the same factory as resources.

### What was built
- `plRevMulti` (used by "For a target" and the Power tab's fuel chain) now runs `plRevOnce` repeatedly with a byproduct "credit": demand for an
  item (as input, raw resource, "bring in", or end product) is covered first by byproducts made elsewhere in the plan; then machines/mining
  for the rest. Since that changes machine counts and byproduct amounts, it repeats until the numbers settle (≤ 40 rounds, stops at < 1e-7).
- Results: `out.used` (byproducts used inside), `out.by` (left over). UI: "♻ x/min more comes from byproducts of this factory" on machine cards,
  a "Byproducts used here" card, and "Byproducts left over" (renamed).
- Real cases in the data: Aluminum Scrap's water back into Alumina; Uranium Cell's acid back into the cells; Battery's water.
- Build number **62**.

### Verified
- `npm test` all PASS. New check: 60 Aluminum Scrap/min needs 40 instead of 60 water/min (20 reused, 0 left over); 10 Uranium Cells/min need
  fewer acid machines (0.32 → 0.24) with 4 acid/min reused. All older planner checks unchanged.

---

## Session 37d — 2026-11-13 (Claude Code, cloud session) · Build 63

### What Markus reported
Plan "100 Plastic + 100 Rubber + 450 Petroleum Coke" should need 300 crude and leave no residue, but the planner dropped the plastic
refineries and showed a wrong loop with Heavy Oil Residue left over.

### Cause
Heavy Oil Residue has no recipe of its own (only a byproduct of Plastic and Rubber). For the coke's residue the planner picked the Plastic
recipe "to make residue"; with byproduct reuse (Build 62) that step's plastic then replaced the real plastic machines.

### Fix
- `plRevOnce` only uses a recipe for an item if the item is its main output (or the player picked it explicitly). Byproduct-only items are
  covered from the plan's byproducts; `plRevMulti` adds a fallback step for them only if byproducts don't cover the need (up to 3 rounds),
  choosing the recipe that makes the most of that item per second (Rubber for residue).
- Build number **63**.

### Verified
- Markus's plan: 5 plastic + 5 rubber + 3.75 coke refineries, 300 crude/min, 150 residue reused, nothing left over (new check).
- Coke alone (120/min): 2 rubber refineries for residue, 60 crude (was 120 via plastic).
- `npm test` all PASS, older planner checks unchanged.

---

## Session 37e — 2026-11-13 (Claude Code, cloud session) · Build 64

### What Markus asked
An on/off switch inside each machine's panel.

### What was built
- ⏻ Turn off / ▶ Turn on in the panel of machines, drills, pumps and generators (`machOff`; state `e.off`, already in `SKEYS`).
- Off: a machine starts no new cycle (a running one pauses), draws no power, still pushes out finished items; drills/pumps stop extracting;
  generators give no capacity and burn nothing (`genCan`). Efficiency tracking pauses. Status "Switched off" (grey).
- 2D: switched-off buildings are dimmed with a power symbol.
- Build number **64**.

### Verified
- `npm test` 78/78. New check: a fed, powered smelter runs; Turn off stops it (no progress, no demand, status), stays off through save/load,
  Turn on resumes; a generator switched off gives 0 MW.

---

## Session 37f — 2026-11-13 (Claude Code, cloud session) · Build 65

### What Markus asked
How do Pipe Junctions share fluid between several refineries: in turn like splitters, or one output first? It looked like the upper one
always came first.

### Cause
`updNets` filled each attached building in turn as far as it could take before the next one, and its rotating start moved by the number of
buildings visited, so with some numbers of attachments the start landed on the same building every tick. With short supply that building
got almost everything (test: 78 vs 5 crude).

### Fix
- Fair share: each tick the network hands out one unit at a time, in turn, to every building that can take it (pumps excluded, tanks only
  above 80 %, machines only if their recipe uses that fluid); the start moves by one each tick.
- Build number **65**.

### Verified
- New check: two refineries on one network with short supply get 39 vs 44 crude (old code: 5 vs 78).
- `npm test` 79/79 (pipe throughput still 300 m³/min on Mk1); `npm run playthrough` unchanged apart from measurement noise.

---

## Session 37g — 2026-11-13 (Claude Code, cloud session) · Build 66

### What Markus asked
1. Fluid-mixing warnings appear although the refinery has a separate pipe for the other fluid.
2. The Flow Meter should average over a longer time, especially for belts with only 1–2 items per minute.

### Cause and fix (1)
- Each pipe network attached to a building checked that building's fluid outputs on its own: a refinery's crude input network saw the heavy
  residue output and flagged "mixing", although the residue had its own pipe (the fluids never actually mixed; only the warning was wrong).
- `fluidHome(b,k,net)`: a mismatch only raises the warning if none of the building's other networks holds that fluid or is empty.
  Same for pumps and tanks.

### Fix (2)
- Belts with a meter remember the arrival times of the last 30 items, at most 5 minutes back (`e.fa`). Rate = items ÷ time between first and
  last arrival; the wait since the last item only counts once it's longer than the usual gap, so a belt that stops drops gradually.
  Busy belts react within ~30 s; 1–2 items/min settle over a few minutes. Pipes unchanged (network flow).
- Build number **66**.

### Verified
- `npm test` 81 PASS, 0 FAIL. New checks: refinery with crude in and residue out on separate pipes: no warning, residue flows; with only the
  crude pipe the warning still shows. Slow belt (1 item every 30 s) reads 2.00/min, 0.67/min three minutes after items stop. Full Mk1 still 60/min.

---

## Session 37h — 2026-11-13 (Claude Code, cloud session) · Build 67

### What Markus asked
1. The output line in a machine's panel misses the secondary product.
2. Hide the bottom toolbar, leaving a small button to bring it back.

### What was built
- Efficiency section (`effHtml`): one line per product: "Output" for the main one, "Byproduct" for the others (fluids in m³).
- ▾ button at the end of the tool row hides the toolbar (`OPT.dockHid`, per device); a small "▴ Tools" pill at the bottom brings it back.
  `layoutVars` uses the pill's height for `--dockH` while hidden, so panels use the freed space.
- Build number **67**.

### Verified
- `npm test` 82 PASS / 0 FAIL. New check: hide → toolbar gone, pill shown, saved; show → back; a plastic refinery's panel lists Plastic and
  Heavy Residue (Byproduct). Phone screenshots of both states.

---

## Session 37i — 2026-11-13 (Claude Code, cloud session) · Build 68

### What Markus reported (with screenshot)
Two Drill Mk2 at 225 % on normal nodes should give 270/min onto Mk3 belts (270/min), but the Flow Meters show 240. The drill panel says
"No power 11 %, not enough power", although the drills are inside the pole circles and the grid has plenty of capacity (1962 of 4920 MW).

### Causes
1. **Belt throughput from buildings:** the sim runs 20 ticks/s. Belt-to-belt handoffs keep the leftover progress, but `pushOut` (buildings →
   belt) started every item at 0, so each item waited for a whole tick: a Mk3 tile (4.44 ticks per item) took 5 ticks → 240/min.
   Measured from a crate: Mk2 109/120, Mk3 240/270, Mk4 400/480, Mk5 600/780 (Mk1 exact by luck: 20 ticks per item).
2. **False "No power":** a drill whose buffer was full (want = false) was counted as "power" when `pushOut` had just made room in the same tick.
   Power was never missing (0 ticks without power in the reproduction).

### Fixes
- `updBelt` notes `e.freeAt` (exact moment the tile became free); `pushOut` gives the next item the progress it would have made since then
  (only if freed within 0.1 s, max 0.95), so building-fed belts run at their full rate. Now: Mk2 120, Mk3 270, Mk4 477, Mk5 773 (meter averaging).
- Drill/pump status: not wanting (buffer full) is "Output full", never "No power".
- Build number **68**.

### Verified
- Reproduction of Markus's setup: meter 270/min, drill buffer empty, no "No power".
- `npm test` 83 PASS / 0 FAIL. New check: crate-fed Mk2/Mk3/Mk5 reach ≥ 97 % of their rate; a belt-blocked drill shows "Output full", no power warning.
- `npm run playthrough`: unchanged (measurement noise only).

---

## Session 37j — 2026-11-13 (Claude Code, cloud session) · Build 69

### What Markus reported (with screenshot)
A plain belt from a drill to a crate now carries 270/min, but a Mk3 line along a row of machines (feeding them through splitters) carries only
223–240/min, and the last machines starve.

### Causes
1. Splitters and crossings handed items to the next belt starting at progress 0 (same mistake as buildings before Build 68), losing part of a
   tick at every splitter.
2. Splitters/crossings were updated before the belts each tick, so a splitter often found the tile in front still occupied (it moves on later in
   the same tick) and waited a whole tick. Visible at Mk5: 684 of 780 through splitters.

### Fixes
- `accT` / `beltCarry()` in `js/sim.js`: the moment an item reached a tile edge travels with it through splitters (`e.inT`) and crossings
  (`e.hT/e.vT`), which act like a belt piece of zero length; the receiving belt tile starts the item with the progress it would have made since
  max(that moment, the moment the tile became free). Buildings (`pushOut`) use the same helper.
- Tick order: belts first, then splitters and crossings.
- Build number **69**.

### Verified
- Counted items per minute (not just the meter) on a line with 5 splitters + a crossing: Mk3 270 of 270, Mk4 480, Mk5 780 (old code: 240, 400, 600).
- `npm test` 84 PASS / 0 FAIL (splitter feeding, curves, crossing, merger checks unchanged). New check: the 5-splitter line at 100 % for Mk3 and Mk5.
- `npm run playthrough`: unchanged (measurement noise only).

---

## Session 37k — 2026-11-13 (Claude Code, cloud session) · Build 70

### What Markus asked
The Flow Meter still jumps up and down quickly.

### Cause and fix
- Build 66 averaged over the last 30 items (max 5 min). Good for slow belts, but on a 270/min belt that's under 7 s.
- Now the meter keeps at least the last 60 s of arrivals, and on slow belts reaches back to the last 30 items (max 5 min). Busy belts average
  over a minute; 1–2 items/min still settle correctly.
- Build number **70**.

### Tests made robust
- Two checks could fail depending on where the random map placed them: the on/off check read the whole grid's demand/capacity (its burner
  could wire into the main test factory) → now checks the switched-off building itself; the power-wire check could pick a spot near an earlier
  pole that took the first wire → now only uses spots with no pole/generator in wire range.

### Verified
- `npm test` 85 PASS / 0 FAIL, twice. New check: on a full Mk3 line, read every second for a minute, the meter stays at 270.0–270.1/min.

---

## Session 37l — 2026-11-13 (Claude Code, cloud session) · Build 71

### What Markus asked
The Flow Meter still jumps on belts carrying few items (2–24/min).

### Cause
At low rates a 60 s window holds only a handful of items: each item entering or leaving the window moves the value in a visible step, and
irregular gaps (machines waiting, splitters sending elsewhere) swing it further. Simulated with random gaps: 12/min read 10.8–15.5,
24/min 19.9–26.6 (same before and after Build 70; a first attempt using the longest recent gap for the "stopping" decay didn't help).

### Fix
- Window: at least 60 s, and on slow belts back to the last 60 items (max 10 min).
- The shown value (`e.fr`) glides towards the measurement once per second (12 %/s, ~8 s), so it no longer steps.
- The "belt stopping" decay only starts once the wait exceeds the longest gap seen recently (bunched items don't make it dip).
- Build number **71**.

### Verified
- Random gaps: 12/min now 11.3–11.9, 24/min 23.4–25.7; regular/bunched flows steady (12.1–12.2, 2.00, 24.2–24.4); busy Mk3 270.0.
- `npm test` 86 PASS / 0 FAIL (new check: bunched slow belts steady).
- Trade-off: a slow belt that stops falls more slowly (2/min reads ~1.3 three minutes after stopping).

---

## Session 38 — 2026-11-13 (Claude Code, cloud session) · Build 72

### What Markus asked
A dashboard per factory: what each produces and what's left over for other factories. Discussed first: power switches can't define factories
reliably (pole circles reach into neighbours), so he chose drawn boundaries; items entering/leaving are counted where belts, pipes and drones
cross the boundary. Part 1 (this build): the zone tool. Part 2 (next): the dashboard.

### What was built
- New file `js/zones.js` (in `index.html` after plan.js and in `sw.js` ASSETS).
- Data: per-tile `zoneMap`, saved as run-length text in `S.zmap`; `S.zones` = [{id, name, c}]. Old saves: no zones.
- Tool "Factory Zone" (`D('zone')`, Signs tab, free, start unlocked). Drag a rectangle (2D and 3D): touching one zone extends it, none starts
  "Factory N" (panel opens with the name field focused), two is refused with a toast naming them. Tap a zone: panel with name, colour (8),
  area, buildings inside, ✂ Cut area (drag to remove tiles), Delete (asks). A zone cut to nothing disappears.
- Look: 2D faint tint (row runs under everything), fence line with posts on outline edges, name tag at the top-left; drag preview dashed
  (green new, zone colour extend, red refused, orange cut). 3D: low coloured fence (instanced rails + posts, rebuilt when `zoneVer` changes).
- Build number **72**.

### Tests
- New check: real mouse drag draws a 6×5 zone and opens its panel; rename + colour; extending by touching; a second zone; a rectangle touching
  both is refused; cut mode removes tiles; name tag drawn; save/load keeps everything; an old save without zones loads with none; delete.
- Adjusted: the Signs tab now holds 6 cards; the biome check now requires > 500 tiles per biome (a random map once had a 1,658-tile biome).
- `npm test` 87 PASS / 0 FAIL. Screenshots of an L-shaped zone and a second zone in 2D and 3D.

### Known issues / next up
- Zone names only show in 2D (3D shows the fence).
- Next: Factories dashboard (Stats tab): per zone imports/exports counted at the fence (belts, pipes, drones), made/used inside, spare capacity
  (machines blocked by output), shortages; overall per-item table (produced, moved between factories, left over: core, crates, incinerators,
  backing up); tap a card to highlight the zone.

---

## Session 38b — 2026-11-13 (Claude Code, cloud session) · Build 73

### What Markus asked
Part 2: the Factories dashboard on top of the zones.

### What was built
- Counting (`js/zones.js`, per-second buckets over 60 s in `ZS`): made/used per zone at the existing `stat.p/stat.c` points (machines, drills,
  pumps, generator fuel), delivered to the Base Core, put into crates, burned. Crossings: `zMove` at every item handoff (belts, splitters,
  crossings per lane, building outputs); items remember their last zone (`oz`, `hoz/voz`) so a no-man's-land strip between fences still counts
  as zone → zone; counted when an item enters another zone or is used/stored outside all zones. Drones: pad zone → pad zone per delivery.
  Pipes: per network and second, each zone's input and output is netted and the difference split between zones.
- Stats panel: tabs Items | 🏭 Factories. One card per zone (+ "Outside zones" when used): buildings, power, Makes, Uses, Sends to / Gets from
  other factories, Into stock, Into crates, Burned, Could make more (output-blocked share of machines × their rate), Short of (input-waiting
  share × input rate). Table "All factories together": made, used, left (made − used), spare. Zone name button flies the map there and pulses its fence.
- Build number **73**.

### Verified
- `npm test` 88 PASS / 0 FAIL. New check: zone "Smelting" (crate → smelter) belts ingots across a gap to zone "Pressing": made/used per zone,
  counted as Smelting → Pressing (not via "outside"), plates burned in Pressing, cards and table shown, zone highlight.
- Screenshot of the dashboard ("→ Pressing: Iron Ingot 35/min").

### Known issues
- Numbers need about a minute to settle after changes (60 s window), like the Items view.
- Zone names show in 2D only.

---

## Session 38c — 2026-11-13 (Claude Code, cloud session) · Build 74

### What Markus asked
Remove Makes and Uses from the factory cards; replace "Could make more" with what the factory is designed to produce.

### What was built
- "Designed to make": per item, every machine's full rate at its clock (and drills/pumps), minus what the zone's own machines consume at full
  speed; only positive items (the factory's real products). Switched-off buildings don't count. Next to each: "(now x)" = made − used inside
  over the last minute, green ≥ 95 %, yellow ≥ 60 %, red below.
- Makes, Uses and Could make more removed from the cards (the overall table keeps its Spare column).
- Phone ghost-tap check: waits for the start-up screen to disappear (it caught the first tap on a slow run).
- Build number **74**.

### Verified
- `npm test` 88 PASS / 0 FAIL. Dashboard check: "Designed to make" shown, old sections gone, a smelter zone designs 30 ingots/min and no ore.
- Screenshot: Smelting "Iron Ingot 45/min (now 45)", Pressing "Iron Plate 20/min (now 18)".

---

## Session 38d — 2026-11-13 (Claude Code, cloud session) · Build 75

- Markus: hide "Sends to other factories" and "Gets from other factories" on a factory card when they're empty. Done (`flows` returns ''
  when nothing crossed; the heading is only added when there's content).
- Dashboard check extended: in the two-zone test, Smelting only shows "Sends", Pressing only "Gets".
- `npm test` 88 PASS / 0 FAIL. Build number **75**.

---

## Session 38e — 2026-11-13 (Claude Code, cloud session) · Build 76

- Markus: an overall efficiency indicator per factory in the dashboard.
- Built: a badge in each factory card's header (same colours as the rings): average of the machines' (with a recipe), drills' and pumps'
  efficiency (`_ef`, measured ≥ 3 s, switched-off ones left out), weighted by nominal power (power × clock^1.6, min 1) so big machines count more.
- Verified: `npm test` 88 PASS / 0 FAIL; dashboard check also confirms the badges and that a one-smelter zone's value equals the smelter's
  efficiency. Screenshot: Smelting 99 %, Pressing 91 %. Build number **76**.

---

## Session 38f — 2026-11-13 (Claude Code, cloud session) · Build 77

- Markus: Stats should show only the factories (no Items view); Factory size and Power at the bottom; remove "All factories together" and its
  helper text.
- Done: `statsHtml` = factory cards, then Factory size, then Power. The Items/Factories tabs, the per-item table and the overall table (with its
  totals calculation) are removed. The global item rates (`stat`/`rates()`) stay; the planner, machines and tests still use them.
- `npm test` 88 PASS / 0 FAIL (dashboard check confirms the old sections are gone and Factory size shows). Build number **77**.

---

## Session 38g — 2026-11-13 (Claude Code, cloud session) · Build 78

- Markus: factory cards should collapse to their header; headers overflowed the card when name + info were too wide.
- Built: ▾/▸ button at the start of each card header (`zoneFold`, remembered per device in `OPT.zCol`); a collapsed card shows only its header
  (name, efficiency badge, buildings, MW). The header is now a wrapping flex row (`.zhead`): name and info move to a second line when needed.
- Verified: `npm test` 88 PASS / 0 FAIL (dashboard check folds and unfolds a card). Phone screenshot with a long factory name and a collapsed card.
  Build number **78**.

---

## Session 38h — 2026-11-13 (Claude Code, cloud session) · Build 79

- Markus: move buildings count and power use from the card header into the card body, right below the header, collapsing with the card.
- Done: header = ▾/▸, name, efficiency badge; first body row = "N buildings … X MW" with a thin divider. Collapsed cards show only the header.
- `npm test` 88 PASS / 0 FAIL (fold check also confirms the buildings line disappears). Phone screenshot. Build number **79**.

---

## Session 38i — 2026-11-13 (Claude Code, cloud session) · Build 80

- Markus: remove the explanation at the top of the dashboard; check that the collapse state of the cards is saved.
- Done: the "Last 60 s. Counted where…" text is gone. The collapse state lives in `OPT.zCol` (per-device settings, `frontierworks_opts`, like the
  panel pin); new check reloads the page and confirms a collapsed card stays collapsed. Note: it's per device, not part of the game save/cloud sync.
- `npm test` 89 PASS / 0 FAIL. Build number **80**.

---

## Session 38j — 2026-11-13 (Claude Code, cloud session) · Build 81

- Markus: show zone names in 3D too; remove the "Phones stay smooth to about 10,000 objects…" note in Factory size.
- Built: `v3ZoneLabels()` in `js/view3d.js`: one name sprite per zone above its top-left corner, in the zone colour, redrawn on rename/recolour,
  drawn on top (no depth test) so buildings never hide it. The note is removed from `factoryHtml`.
- Verified: `npm test` 90 PASS / 0 FAIL (new check: every zone has a 3D tag and a rename updates it). 3D screenshot (first try: a chimney cut
  through a tag, so tags now draw on top). Build number **81**.
- Closes the known issue "zone names only in 2D".

---

## Session 38k — 2026-11-13 (Claude Code, cloud session) · Build 82

- Markus: add the factory's overall efficiency to its fence label in 2D and 3D.
- Built: `zEffAll()` (once per second, one pass over all buildings) stores `z.eff` per zone with the same rule as the dashboard badge
  (power-weighted average of machines with a recipe, drills and pumps; switched-off ones and those measured < 3 s left out). 2D and 3D name tags
  show "Name 87%" with the percentage in the ring colours; zones without measured machines show just the name.
- Verified: `npm test` 90 PASS / 0 FAIL (dashboard check: the 2D label draws the zone's percentage). Screenshots in 2D and 3D. Build number **82**.

---

## Session 39 — 2026-11-13 (Claude Code, cloud session) · Build 83

### What Markus asked
Background music and sound effects (machines, placing, deleting), industrial, oriented at big factory games but original. Agreed plan in three
steps (effects + mixer, machine sounds, music). This is step 1.

### What was built
- New file `js/audio.js` (in `index.html` after pwa.js and in `sw.js` ASSETS). Web Audio only: oscillators and filtered noise, no audio files.
  Mixer: master → compressor → speakers; buses music / sfx / mach. Starts on the first tap or key press.
- Effects (`SFX`): place (low thump + metal ping + ratchet clicks), belt (tick per tile while dragging a line; single belt), del (falling
  noise + low thump + whoosh), erase (scrape), rotate (4-click ratchet), move (servo whine + set-down), click (buttons), deny (refused
  action), goal (rising chime), trip (warning buzz). Throttled per effect (`SFX_GAP`).
- Hooked into: tap placing, line building, dismantle (tap and drag, 2D and 3D), eraser, rotate (tool and selected building), move (long
  press, drag drop, Move button), every panel/dock button, goal submit, fuse trip.
- ☰ Menu → Sound: 🔊 On / 🔇 Muted, sliders Effects, Machines (coming), Music (coming). Saved per device (`OPT.vol`, `OPT.mute`).
- Build number **83**.

### Verified
- `npm test` 91 PASS / 0 FAIL. New check: audio engine starts after a tap; every effect plays without error; tap place → del → rotate → line
  build trigger place, del, rotate, place; mute and volume are saved; the Menu shows the Sound section with three sliders.
- Found by the test: effects with a filter (rotate, move, deny, trip) passed their settings in the wrong order and would have failed silently.
- A demo WAV of all effects was rendered offline (OfflineAudioContext) and sent to Markus to listen to.

### Next up
- Step 2: machine sounds by distance and zoom. Step 3: generative music. Tune effect volumes/character after Markus listens.

---

## Session 39b — 2026-11-13 (Claude Code, cloud session) · Build 84

- Markus: sort the factories in the dashboard by colour, then by name.
- Done: cards sorted by colour (palette order: orange, light blue, green, pink, purple, yellow, teal, coral), then by name (case-insensitive,
  numbers in natural order: "Factory 2" before "Factory 10"); "Outside zones" stays last.
- `npm test` 91 PASS / 0 FAIL (dashboard check builds zones in two colours with mixed names and checks the order). Build number **84**.

---

## Session 39c — 2026-11-13 (Claude Code, cloud session) · Build 85

### What Markus asked
Next sound step: machine sounds.

### What was built (`js/audio.js`)
- Seven continuous voices on the Machines bus, built once: furnace (smelter, foundry: low rumble + crackle), press (rhythmic thump ~1.2 s),
  assembler (assembler, fabricator: servo whir + ticks), refinery (refinery, blender, pumps: low bubbling), drill (grinding tremolo), generator
  (mains hum), belts (light rattle; only belts carrying items).
- `mvUpdate()` every 150 ms: working buildings within the visible area are summed per kind with a falloff from the screen centre; level =
  1 − e^(−0.9·sum), times the zoom (2D: cam.z/1.6, 3D: 14/camera distance; 0.12–1) as an overall volume. Idle, blocked and switched-off
  buildings count as silent. Rhythmic parts are scheduled 0.3 s ahead while a kind is audible. Silent when muted, at Machines 0 % or in the background.
- Voice volumes (`MV_BASE`) balanced from an offline render (first render: assembler and drill much too quiet).
- Menu slider "Machines" no longer says "coming". Build number **85**.

### Verified
- `npm test` 92 PASS / 0 FAIL. New check: a working smelter at the centre → furnace level 0.61; zoomed out 0.21; our smelter switched off
  → its share gone; muted → 0; 7 voices.
- Found while testing: at far zoom many visible machines added up almost as loud as one close one → zoom is now an overall volume factor.
- Demo WAV of the seven voices (3.2 s each) sent to Markus.

### Next up
- Step 3: generative background music. Tune machine sounds after Markus listens.

---

## Session 39d — 2026-11-13 (Claude Code, cloud session) · Build 86

- Markus: Resonator and Quartz Crystal look almost identical.
- Done (`js/render.js` item shapes): new shape `reson` for the Resonator: silver capsule on two legs with a small crystal window (an electronic
  part). Also fixed the same problem one step earlier: Raw Quartz now uses the rough ore-lump shape, so Raw Quartz / Quartz Crystal /
  Resonator are three different shapes. In 3D, Resonators on belts use the generic block (no own 3D shape).
- Verified: icon comparison at 96 px and 32 px; `npm test` 92 PASS / 0 FAIL. Build number **86**.

---

## Session 39e — 2026-11-13 (Claude Code, cloud session) · Build 87

- Markus: assemblers and fabricators sound very annoying.
- Cause: their voice was a band-passed sawtooth with pitch wobble plus high 4.2 kHz ticks (buzzy and shrill over time).
- Done: calm voice: low triangle hum (92 Hz) + faint octave, soft muffled whir (band-passed noise at 420 Hz with slow breathing), and an
  occasional soft low "set-down clunk" every 1.6–3 s instead of the ticks. Base level 1.4 → 0.9 (similar loudness to the other kinds in an
  offline render). New demo WAV sent.
- `npm test` 92 PASS / 0 FAIL. Build number **87**.

---

## Session 39f — 2026-11-13 (Claude Code, cloud session) · Build 88

### What Markus asked
Belts: keep the rattle but remove the whoosh, and let them rattle even without items. Then the music (step 3).

### What was built (`js/audio.js`)
- Belts: the steady high-passed noise bed (the "whoosh") is gone; the rattle is now only short random clicks (2.2–4 kHz, every 50–120 ms)
  with an occasional low clack. Every belt near the centre counts, loaded or not.
- Music: generative and original. Eighth-note scheduler (~80 BPM, 0.6 s look-ahead every 100 ms) on the Music bus, through a generated
  3.2 s reverb and a dotted-eighth echo. Layers: detuned sawtooth pad chords (lowpass 900 Hz, slow attack/release), triangle bass on beats 1 and 3,
  plucked triangle arpeggio (from bar 2 of a section, with echo), and sometimes a low filtered-noise swell with a bell (1 : 2.76 partials).
  Four chord progressions in the D-minor family; each section (32/48/64 beats) picks a progression, arpeggio pattern, octave and whether arpeggio and
  bass play. After 3–5 minutes of music a 25–60 s silence. Stops when muted, at Music 0 % or in the background.
- Music slider no longer says "coming". Levels doubled after the first render (it was ~5× quieter than the effects).
- Build number **88**.

### Verified
- `npm test` 93 PASS / 0 FAIL. New check: music schedules steps after a tap; muted / 0 % stop it; 80 steps of every layer play without error.
- One-minute offline render (stereo, steady level) sent to Markus as a WAV (volume-normalised for listening).

### Next up
- Tune music/sounds after Markus listens (tempo, darker/brighter, more or less melody).

---

## Session 39g — 2026-11-13 (Claude Code, cloud session) · Build 89

### What Markus asked
1. The assembler/fabricator hum sounds like the wrong frequency and is intrusive; make it deeper / less intrusive.
2. In the planner summary some lines are wider than the panel.

### What changed
- Assembler voice: the 92 Hz triangle (+184 Hz) became a pure 58 Hz sine at lower level, whir band moved 420 → 300 Hz. Reason: small speakers
  can't play 92 Hz, so mostly the triangle's overtones (276, 460 Hz…) were heard, which made it sound like the "wrong" note.
- Planner summaries (node, target and power tabs): "Buildings" is now a list, one type per line, largest first (`plMachBlock`), instead of one
  comma line; the old `plMachList` is removed. CSS: text-only values in panel rows may shrink and wrap; rows with inputs/selects keep their size.
- Build number **89**.

### Verified
- Phone-size check found the overflowing row ("Buildings 9 × Fabricator, 1 × Blender, 22 × Assembler…"); after the fix no row in any planner tab
  is wider than the panel (new permanent check). Screenshot of the target summary on a phone.
- `npm test` 94 PASS / 0 FAIL.

---

## Session 39h — 2026-11-13 (Claude Code, cloud session) · Build 90

### What Markus asked
He likes the music; a second track with a slight beat, switching every couple of minutes.

### What was built (`js/audio.js`)
- Track 2 "Pulse" (`muSection2` / `muPlay2`): 96 BPM; three A-minor-family progressions; from bar 2 a soft sine kick (110 → 42 Hz) on beats 1 and 3,
  a soft band-passed clap on 2 and 4, high-passed hats on the off-beats (optional per section), a pulsing low-passed sawtooth bass line (three
  patterns), lighter pads, the plucked arpeggio in some sections, and now and then a short metallic clank (bell partials) late in the bar.
- Alternation: after 3–5 minutes of a track a 25–60 s break, then `muSwitch()` flips to the other track (resets the section, sets the echo
  time to the new tempo). Track 1 = the first track unchanged ("Drift").
- Levels balanced from offline renders (Pulse first came out at about half the loudness of Drift).
- Build number **90**.

### Verified
- `npm test` 94 PASS / 0 FAIL. Music check extended: a finished run rests and then switches to Pulse, Pulse plays 200 steps without error,
  the next run switches back.
- One-minute render of Pulse sent to Markus.

---

## Session 39i — 2026-11-13 (Claude Code, cloud session) · Build 91

### What Markus asked
1. Remove a Flow Meter from a belt or pipe without deleting the belt/pipe.
2. Recipes with many inputs miss line breaks.

### What changed
- Flow Meter (it could already be taken off by tapping the tile again with the Flow Meter tool; made easier to find): "✕ Remove Flow Meter"
  button in the belt/pipe panel's Flow Meter section; tapping a metered tile with Dismantle first removes only the meter (toast says tap again
  for the belt/pipe). Drag-dismantle still clears whole lines (meters refunded).
- Recipe buttons in machine panels wrap: `.rec` may break lines, each ingredient (`.ing`: icon, amount, name, rate) stays together, so lines
  break between ingredients. Phone check found the overflow in Fabricator and Blender panels (Codex, Items and Planner were fine).
- Build number **91**.

### Verified
- `npm test` 95 PASS / 0 FAIL. Flow Meter check extended (panel button keeps the belt; first Dismantle tap removes only the meter, second the
  belt); new phone check: no recipe button in Fabricator/Blender panels is wider than the panel. Phone screenshot of the Blender recipes.

---

## Session 39j — 2026-11-13 (Claude Code, cloud session) · Build 92

### What Markus reported (with screenshot)
A grid of input columns with splitters and crossings feeding two fabricators clogs after a while: the first fabricator starves for bolts
although the Mk3 bolt belt is full. Clearing the crossings with the eraser helps until it clogs again.

### Cause
`passOK` treated any crossing as a fine destination. The fabricator touches the crossing grid, so `pushOut` pushed finished Heavy Truss
sideways into the crossings (they only checked one tile ahead). The trusses ran left through the chain to a dead end and stayed there; a
crossing has one sideways lane for both directions, so the lane the bolts needed towards the machine was blocked.

### Fix (`js/sim.js`)
- `passOK` follows crossing chains to the first non-crossing tile (max 32) and only says yes if that can take the item. Drone Pads now count
  as destinations too.
- Splitters only send into a crossing whose chain leads somewhere (`updRouter`).
- A crossing item whose way ahead leads nowhere goes back to the stock, so jams in existing saves clear themselves.
- Build number **92**.

### Verified
- Rebuilt Markus's layout (four input columns, splitter per row, fabricator on the right, Heavy Truss): old code 1 truss in 4 min, 2 %
  efficiency, trusses seen in the input crossings 109 times; new code 4 trusses, 56 %, no leaks (limited by bolts: each splitter sends about
  half its items sideways, ~135 of the 200 bolts/min the recipe needs). New permanent check.
- `npm test` 96 PASS / 0 FAIL; `npm run playthrough` unchanged (noise only).

### Open question
- Markus's earlier message about the second music track ("a slight beat … so a bass drum,") was cut off; proposed a clear four-on-the-floor
  bass drum, waiting for his answer.

---

## Session 39k — 2026-11-13 (Claude Code, cloud session) · Build 93

### What Markus said
On track 2 he hears no claps or hi-hats; it sounds like track 1. He wants a bass drum four on the floor.

### Cause
The drums were mixed far too low (hats 0.022–0.035, clap 0.1) and the kick sat at 110 → 42 Hz, which tablet speakers can't reproduce; the pads
covered everything.

### What changed (`js/audio.js`, track "Pulse")
- Kick on every beat (four on the floor): sine 150 → 48 Hz + short triangle body + a 1.8 kHz click for small speakers.
- Hats on every off-beat (high-passed noise at 7.5 kHz + a 10 kHz layer), louder; an open hat at the end of every other bar.
- Clap on beats 2 and 4: three quick band-passed noise bursts plus a short tail.
- Pads and arpeggio quieter, bass line a bit louder, so the beat leads.
- Build number **93**.

### Verified
- Offline render, compared with the old track 2: high-frequency share 0.028 → 0.161 (≈ 6×), beat regularity (envelope autocorrelation at one
  beat) 0.36 → 0.85. New one-minute WAV sent.
- `npm test` 96 PASS / 0 FAIL.

---

## Session 39l — 2026-11-13 (Claude Code, cloud session) · Build 94

### What Markus said
Track 2's bass drum could be more distinct, hats and clap still not audible; and play it a bit more upbeat, not only spherical, not too intrusive.

### What changed (`js/audio.js`, "Pulse")
- Tempo 96 → 110 BPM; three major-key (C) progressions instead of A minor.
- Kick louder with a stronger click (170 → 50 Hz body, 2.2 kHz click, 5 kHz tick); clap 0.22 → 0.95; hats 0.16 → 0.75 (all dry).
- Pads much quieter (0.03 → 0.012), arpeggio always on from bar 2 (brighter, 3.6 kHz), busier bass line patterns at a lower level.
- Build number **94**.

### Verified
- Measured with an A-weighted spectrum (how loud each band sounds to the ear), previous → now: kick 9 % → 54 %, bass/pads 83 % → 18 %,
  clap 6 % → 10 %, hats 1 % → 13 %. New one-minute WAV sent.
- `npm test` 96 PASS / 0 FAIL.

---

## Session 39m — 2026-11-13 (Claude Code, cloud session) · Build 95

### What Markus asked
Bigger machine input buffers (4 is too small); then: give items stack sizes and let each machine hold one stack of each input; list the
stack sizes in chat.

### What changed
- New `STACK` table + `stackOf(id)` in `js/data.js` (the game had no stack sizes before): 200 bolts, wire; 100 ores, ingots, Iron Plate/Rod,
  Cable, Concrete, Copper Sheet, Silica, Petroleum Coke, Polymer Resin, Aluminum Scrap, Plastic, Rubber and all fluids (m³); 50 Steel Beam/Pipe,
  Quartz Crystal, Aluminum Casing, Braced Plate, Truss Frame, Rotor, Cased Girder, Stator, Circuit Board, Alloy Panel, Heat Sink, Battery,
  Uranium Cell, Nuclear Waste; 20 Motor, Resonator, Heavy Truss, Compute Module, Data Bus, Coolant Block, Control Chip, Turbine Core, Fuel Rod;
  10 Quantum Core.
- `capIn(need,item)` = max(one cycle, one stack) (was max(2 cycles, 4)). Output buffers unchanged.
- Machine panel: input buffer lists every input as "x / stack".
- Build number **95**.

### Verified
- `npm test` 97 PASS / 0 FAIL. New check: a smelter takes 100 iron ore; Heavy Truss bolts buffer 200; every item has a stack size and no recipe
  needs more than one stack per cycle.
- `npm run playthrough`: unchanged.

---

## Session 39n — 2026-11-13 (Claude Code, cloud session) · Build 96

### What Markus asked
The music seems to stop after a while; it should loop forever through the tracks. (He also asked that recipes stay unchanged: confirmed,
Build 95 only changed input buffer sizes, no recipe.)

### Findings
- A 40-minute fast-forward simulation showed the composer itself never stops; but after each 3–5 min run there was a 25–60 s silence, and
  after locking the screen or switching apps the browser suspends audio, which the game only resumed on the next tap.

### What changed (`js/audio.js`)
- Each track plays 2–3 minutes, then a ~3 s pause and the other track, endlessly (no long silences).
- Audio resumes by itself when the game becomes visible again, and retries every 2 s while it isn't running (unless muted).
- Build number **96**.

### Verified
- Simulation: notes in every one of 40 minutes, alternating tracks. New permanent check: 20 simulated minutes, music in every minute, both tracks.
- `npm test` 97 PASS / 0 FAIL.

---

## Session 39o — 2026-11-13 (Claude Code, cloud session) · Build 97

- Markus: tick boxes before the three sound options to turn music, machine sounds and interface sounds on/off individually.
- Built: ☑/☐ button before Effects, Machines and Music in ☰ Menu → Sound (`OPT.son`, per device). Off = that bus silent (`auApply`), and
  effects/machine levels/music scheduling check `auOn(k)`; the slider keeps its volume for when it's ticked again. On/Muted stays as master switch.
- Verified: `npm test` 97 PASS / 0 FAIL (music check: three boxes; music off stops it and is saved; effects off plays no click; machines off →
  all machine levels 0). Phone screenshot. Build number **97**.

---

## Session 39p — 2026-11-13 (Claude Code, cloud session) · Build 98

- Markus: fill a machine's input buffers from the inventory.
- Built: "⬆ Fill from stock" under the input buffer in the machine panel (`fillInb`): tops every solid input up to its stack (`capIn`) from
  `S.inv`, toast lists what moved. Shown only when at least one input has room and some stock; fluids skipped (the stock holds no fluids).
  Items go back to the stock as before on recipe change / dismantle / eraser.
- Verified: `npm test` 97 PASS / 0 FAIL (buffer check: 30 → 100 iron ore, stock 500 → 430; button hidden with empty stock). Build number **98**.

---

## Session 39q — 2026-11-13 (Claude Code, cloud session) · Build 99

- Markus: Turn off, Move and Dismantle in one row in the machine panel; remove the informational sentence at the bottom; average efficiency
  over 5 minutes.
- Done: buttons share one wrapping row (`.btnrow`, Rotate joins where it applies); the "Belts/pipes pointing into the machine feed it…"
  paragraph is gone; `EFF_T` 30 → 300 s (labels show "last x min" via `fmtSec`). Rings, dashboard badge and zone labels use the same value,
  so they all react more slowly to changes now.
- Test adjusted: "crossing in front of a machine" resets the efficiency after its deliberate pause (the 5-min window still contained it).
- Verified: `npm test` 97 PASS / 0 FAIL; phone screenshot of the panel. Build number **99**.

---

## Session 39r — 2026-11-13 (Claude Code, cloud session) · Build 100

### What Markus asked
A programmable splitter like the one in a well-known factory game: overflow per direction, specific items per direction, blocking a direction.

### What was built (own name and design: "Logic Splitter")
- `D('lsplit')`: router `sub:'logic'`, Logistics tab, unlocks with "Structural Works" (same goal as the Sorting Splitter), 2 Braced Plate + 10 Cable.
- Rules `e.lr = {l,f,r}` (saved via `SKEYS`): item ids, `any`, `rest` (= "Any other": items no output names), `over` (overflow). Empty = blocked.
  Default: Any on all three. `lsOuts(e,item)` → normal outputs (any / named / rest) and overflow outputs; `updRouter` offers the item round-robin to
  the normal ones, then to the overflow ones; otherwise it waits. Accepts only from the back, like a splitter.
- Panel: per output removable rule chips, + Any / + Any other / + Overflow / Block, and an item picker (select). Adding an item removes "Any".
- 2D: arrows for open outputs, amber arrow for overflow-only, red square for blocked, ring in the centre. 3D: splitter model in its colour.
- Build number **100**.

### Verified
- New check: front = Iron Plate, left = Any other, right = Overflow with alternating plates/copper: plates only front, copper only left, nothing
  right; front backs up → plates overflow right; left blocked → copper goes to the overflow; panel shows the rules; adding works; rules survive
  save/load; unlock listed.
- `npm test` 98 PASS / 0 FAIL. Tablet screenshot of the panel.

## Session 39s — 2026-11-13 (Claude Code, cloud session) · Build 101

**Asked:** "belts connect to pipe junctions, I think they shouldn't."

**Found:** in the game they don't. A belt beside a junction is never linked: it gets no input from the junction and isn't part of a pipe network, and the 2D view drew it correctly. The 3D model was the problem. It always had four fixed pipe stubs, so in 3D a belt next to a junction looked plugged in.

**Built:** the 3D junction is now just its base and sphere. Its stubs come from the same instanced pipe arms that regular pipes use, read from the junction's connection mask `e.pc` (`v3Layout` in `js/view3d.js`). So stubs appear only towards pipes and buildings that really connect, as in 2D.

**Verified:** 3D screenshot showing pipe–junction–pipe with belts on the other sides, where the stubs point only to the pipes. New smoke check: a belt beside a junction doesn't connect (the junction keeps 2 links, and the belt has no input and no network). `npm test` all PASS.

**Known issues / next up / open questions:** unchanged from 39r.

## Session 39t — 2026-11-13 (Claude Code, cloud session) · Build 102

**Asked:** Markus sent screenshots of rotating a belt next to a pipe junction: the belt could point into the pipe and into the junction, and both looked like "allowed connections".

**Found:** nothing was ever transferred, because a belt pointing at a pipe, junction, tank or pump is a dead end. But Rotate offered those directions, and in 2D the belt ran flush against the pipe piece, so it looked connected.

**Built:**
- `fluidOnly(t)` / `beltBlocked(e)` in `js/sim.js`.
- Rotate in the building panel (`rotSel`) skips directions where a belt would point into a pipe, junction, tank or pump. If every direction is blocked it rotates normally.
- In 2D, a belt that still points into one (old saves, or one drawn that way) gets a light end-stop bar at its front edge, so it visibly isn't connected.
- No change to placement or the simulation.

**Verified:** screenshot of the end stop. New smoke check: four Rotate taps never point the belt at the junction. `npm test` all PASS.

**Known issues:** the 3D view has no end stop yet; only 2D shows it.

## Session 39u — 2026-11-13 (Claude Code, cloud session) · Build 103

**Asked:** the incinerator animation should play only while it is burning something.

**Built:** `accept()` stamps `e.burnT` when an incinerator takes an item or a unit of fluid. `isActive()` counts an incinerator as active for 1.5 s after its last burn, so occasional items still give a steady fire that fades out smoothly. The 2D fire glow now scales with activity; before, it pulsed all the time. The 3D glow and the smoke in 2D and 3D already followed `isActive`, so all of them now stop when it is idle. `burnT` is not saved (a freshly loaded incinerator starts dark).

**Verified:** new smoke check (lit while fed, dark 5 s after the last item). `npm test` all PASS.

## Session 39v — 2026-11-13 (Claude Code, cloud session) · Build 104

**Asked:** a belt line couldn't bend when the corner tile sat next to a machine and turned away from it (screenshot). Should belts need a junction-like piece to connect to buildings, as pipes do, or is there another way?

**Found:** when choosing a belt's curve, any building directly behind the belt counted as "fed from behind". That forced the tile straight, even when a belt was clearly coming in from the side, so the corner was drawn straight. The machine could also dump output onto the turning line. Poles and signs behind a belt had the same effect.

**Decision (recommended, not mandating junctions):** keep buildings' direct belt output, which avoids breaking saves and keeps it simple.
- Only a same-direction line, a splitter/merger/router or a crossing behind a belt keeps it straight.
- A building, pole or sign behind it no longer does, so the belt bends towards a single side feeder.
- A bent belt takes items only from its bend: `pushOut` skips a belt whose `cin` differs from the push direction, so the machine doesn't output into it.
- Trade-off: a layout where a machine output into the first belt tile *and* a side belt merged into that same tile now becomes a bend. The machine's output there is blocked; use a Merger for that. DESIGN.md updated.

**Verified:** new smoke check covering a bend next to a crate (no output into it) and the straight case (output into it). `npm test` all PASS. `npm run playthrough`: all recipes ✓, only noise-level changes.

**Next up:** watch for old factories that relied on the machine + side merge on the same tile.

## Session 39w — 2026-11-13 (Claude Code, cloud session) · Build 105

**Asked:** (screenshot) still couldn't bend a belt next to a pipe junction and a crossing. The tile takes items from a merger below and should turn left, with a junction behind it.

**Found:** the 39v rule kept a belt straight whenever *any* router or crossing sat behind it. A pipe junction is a router, but it never feeds belts.

**Built:** a router or crossing behind a belt now keeps it straight only if it really pushes items into that belt (`feedsInto(bk,e,back)`, the same test used for side feeders). So pipe junctions behind a belt, and crossings whose line doesn't run into it, no longer block the bend.

**Verified:** new smoke check reproducing the screenshot (junction behind, merger feeding from the side, so the belt bends). `npm test` all PASS.

## Session 39x — 2026-11-13 (Claude Code, cloud session) · Build 106

**Asked:** (screenshot) a working Press showed "No recipe 8% · Check the setup" in its efficiency card.

**Found:** the 5-minute efficiency average still contained the seconds before a recipe was picked. That history was real but irrelevant once the recipe was set.

**Built:** picking or changing a recipe (`setRec` in `js/ui.js`) resets the machine's efficiency history (`_efT`, `_ef`, `_efw`). The average then starts fresh for the new setup. Machines already showing the message clear on their own within 5 game minutes.

**Verified:** added a check to the recipe-fold smoke test. `npm test` all PASS.

## Session 39y — 2026-11-13 (Claude Code, cloud session) · Build 107

**Asked:** (screenshot) layout: line → Splitter → Crossing → belt that turns north. It didn't work: the belt didn't bend and nothing flowed.

**Found:** two gaps.
1. `feedsInto` only counted a crossing as a side feeder when a *belt* sat on its far side, not a splitter or merger, so the belt never got its bend.
2. `passOK` only let items pass through a crossing into a belt pointing straight on. The splitter therefore refused to send anything into the crossing.

**Built:**
- `feedsInto` follows crossing chains recursively (depth ≤ 32) to whatever feeds them: a belt, splitter or merger.
- `passOK` also accepts a belt whose bend (`cin`) comes from that direction. Plain perpendicular belts are still refused, so machine output can't leak sideways onto input lines (the Session 39j protection).

**Verified:** new smoke check reproducing the layout: the belt bends and items arrive in a crate. `npm test` all PASS. `npm run playthrough`: all recipes ✓, no errors.

## Session 39z — 2026-11-13 (Claude Code, cloud session) · Build 108

**Asked:** a merger doesn't merge its three sides equally: with one slow belt, it prefers the fast belts on the other sides.

**Found:** the old rule only stopped the *same* side from going twice in a row. With two fast sides, they alternated with each other, and the slow side only got in when the processing order happened to favour it.
- Measured with an Mk3 output, two Mk3 inputs and one Mk1 input (max 60/min), over 1 minute.
- The slow side got 44, 53 or **0** items depending on which side it was on.

**Built:** strict turn-taking in the merger's `accept`. Among the sides that are waiting (asked within the last tick), the next one after the last side served, going round, goes first. A side out of turn is refused and marked waiting.

**Result (same test):** slow side 53 on every side, fast sides 107–108 each, total 268 (no throughput lost). 53 rather than 60 is the cost of waiting for a turn.

**Verified:** new smoke check (slow side ≥ 24 per 30 s, fast sides within 3 of each other, total ≥ 130). `npm test` all PASS.

## Session 39aa — 2026-11-13 (Claude Code, cloud session) · Build 109

**Asked:** Data Bus and Compute Module look almost identical.

**Built:** Data Bus gets its own item shape, `'bus'`: a long, tilted plug-in strip with trace lines and seven gold contact fingers (`itemSprite` in `js/render.js`). Before, it used the square `'chip'` shape in a slightly lighter green. In 3D it is a long, thin slab (`bus` in the 3D item pool) instead of the square chip slab. Colour unchanged.

**Verified:** rendered icons side by side at 96 px and 24 px. `npm test` all PASS.

**Open:** Compute Module and Circuit Board are also both green square chips (dark vs. mid green). Offered to change one if Markus finds them confusing.

## Session 39ab — 2026-11-13 (Claude Code, cloud session) · Build 110

**Asked:** (screenshot) a Logic Splitter with Left = Circuit Board, Front = Any other, Right = Circuit Board sends circuit boards only left. One set up the same way on the cable line works both sides.

**Found:** the routing code takes turns between left and right correctly, so the right output's neighbour must be refusing. The usual cause: the right belt was drawn towards the splitter, so it points into it. An empty belt shows no motion, so its direction can't be seen. Reproduced: with the right belt pointing back, left gets everything and right gets nothing, exactly as in the screenshot. I can't see Markus's save, so this is the likely cause rather than a proven one.

**Built:** output diagnostics in the panel (`outNote` in `js/ui.js`).
- **Logic Splitter:** under each output that has rules, the panel names the problem: belt points into the splitter, pipe piece attached, splitter not facing the right way, merger output side, or nothing attached.
- **Splitter / Sorting Splitter:** an "Outputs" section appears only when there's a problem.

**Verified:** new smoke check (backwards belt refuses items, panel warns, warning goes once the belt is turned). `npm test` all PASS.

## Session 39ac — 2026-11-13 (Claude Code, cloud session) · Build 111

**Asked:**
1. Circuit Board and Compute Module now look almost identical.
2. The Logic Splitter (Circuit Board left + right, Any other front) sends circuit boards only left. If another item is added to left and right, circuit boards split again. Any other single item splits evenly.

**Found (splitter):** the Logic Splitter had one turn counter (`e.rr`) for all items. An item with only one output (the "Any other" items going front) reset it to 0. On a mixed belt, every circuit board therefore started at the first output, which is left. Reproduced: 119 left / 0 right. The 39ab "belt points the wrong way" guess was wrong for this case; the panel warning stays as a general diagnostic.

**Built:**
- **Splitter:** turn counters per item (`e.rrI[item].rr/.ro`, not saved; they just restart after a load). Same test now gives 60 / 59, with wire 120 out the front.
- **Icons:** Compute Module gets its own shape, `'module'`: a boxy dark-green unit with a grey cooling-fin block on top and gold pins along the bottom. In 3D it's a thicker block.

**Verified:** icons rendered side by side. New smoke check (mixed belt, circuit board left/right within 2, front gets the rest). `npm test` all PASS.

## Session 39ad — 2026-11-13 (Claude Code, cloud session) · Build 112

**Asked:** a crossing at the end of a line, with nothing behind it to take the items, doesn't clog. It should.

**Found:** `updCross` sent an item back to the stock when the tile ahead could never take it (`dead`), or when a belt pointed back at the crossing (`stuck`). That came from Session 39j, when machine output leaked into input crossings. The leak is prevented at the entry since then: machines (`pushOut`) and splitters (`updRouter`) check `passOK` before using a crossing. So the stock return only hid real dead ends.

**Built:** removed the stock return. An item that can't move on waits in the crossing (drawn there), and the belt behind backs up. A crossing in an old save that was jammed this way now visibly holds its item. DESIGN.md updated.

**Verified:** new smoke check (belt → crossing → nothing: crossing holds the item, belt is full, 3 items fed, 0 sent to stock). Session 39j crossing-grid test still passes (no leak, no clog). `npm test` all PASS. `npm run playthrough`: all ✓, no errors.

## Session 39ae — 2026-11-13 (Claude Code, cloud session) · Build 113

**Asked:**
1. Remove the Sorting Splitter, since the Logic (programmable) Splitter covers it.
2. Rename 11 buildings and items: Press → Constructor, Fabricator → Manufacturer, Coal Burner → Coal Generator, Fuel Turbine → Fuel Generator, Braced Plate → Reinforced Iron Plate, Cased Girder → Encased Beam, Compute Module → Computer, Data Bus → High-Speed Connector, Heavy Truss → Heavy Modular Frame, Resonator → Crystal Oscillator, Truss Frame → Modular Frame.

**Built (1):**
- Removed `D('sorter')`, its unlock in Tier 2 "Structural Works", the sort routing in `updRouter`/`accept`, the filter panel and `filter` action, its 2D arrows/filter icon and 3D model, and `filter` from `SKEYS`.
- `load()` turns old saves' sorters into Logic Splitters with the same behaviour: filter item → front, Any other → left/right; with no filter, Any on all three.
- `load()` drops unknown ids from `S.ub`.
- DESIGN.md updated.

**Not done (2), asked Markus first:** together, the list is the item and building naming of one specific commercial factory game. CLAUDE.md's rule is "Original content only: own names … don't copy assets or names from commercial games." I proposed original alternatives instead and am waiting for Markus's choice.

**Verified:** new smoke check (old save with a filtered and an unfiltered sorter, both converted correctly, gone from menus and goals). `npm test` all PASS. `npm run playthrough`: all ✓, no dead ends.

## Session 39af — 2026-11-13 (Claude Code, cloud session) · Build 114

**Asked:** Markus kept all item and building names as they are, so no renames. Then: add an alternative recipe for Alumina Solution with no byproduct, 10 Bauxite + 10 Water → 12 Alumina Solution.

**Built:** `r_wet_alumina` "Wet Alumina (alt)" in the Refinery, 6 s (120/min alumina, same speed as the normal recipe), unlocked with the normal one in "Lightweight Alloys". Own name instead of the requested "Sloppy Alumina" (a commercial game's recipe name; CLAUDE.md original-names rule). Markus can choose another original name.

**Verified:** `npm test` all PASS (includes the dead-end audit).

## Session 39ag — 2026-11-13 (Claude Code, cloud session) · Build 115

**Asked:** (screenshot) a belt fed from the left by a blue belt couldn't bend that way. It "snapped to the crossing" on its right side instead, which has a splitter beyond it.

**Found:** since 39y, a crossing with a splitter or merger behind it counts as a side feeder. The tile therefore had two side feeders (the belt and the crossing), and with two feeders a belt stays straight.

**Built:** with two side feeders, if exactly one of them is a real belt, the belt bends towards it. Items from the other side are then refused (`passOK` only lets crossings pass into the bend), so the splitter beyond the crossing doesn't push into this belt.

**Verified:** new smoke check (belt on one side, crossing + splitter on the other, so the belt bends towards the belt). `npm test` all PASS.

## Session 40 — 2026-11-14 (Claude Code, cloud session) · Build 116

**Asked:** the save has ~3,500 objects and ~1,500 buildings and is starting to feel slower in 2D and 3D. What can be optimized from the ground up? Make a proposal. After the proposal, "yes" to Steps 0 and 1.

**Measured** (scratch profiler: 3,300-object test factory with 770 working smelters and 2,500 Mk3 belts, on the cloud machine; a tablet is perhaps 4–6× slower):
- Sim 0.3 ms per tick; topology rebuild 1.3 ms.
- 2D: near 1.5 ms, middle zoom ~5 ms (drawLive ~3 ms, items ~1.2 ms). Zoomed out it is steady at 0.2 ms; a first reading of 24 ms was the one-off chunk painting after a zoom, capped at 8 ms per frame.
- 3D: JS 2–5 ms, but **1.3–1.5 million triangles** per frame (whole factory drawn every frame, plus a shadow pass).

**Proposal agreed** (steps):
- 0 — performance meter
- 1 — 2D quick wins
- 2 — layered 2D: belts and buildings baked into cached 32×32 chunk pictures, only items and animations drawn live; current renderer kept as fallback
- 3 — 3D culling per chunk, low-detail far models, near-only shadows, adaptive resolution
- 4 — sim tidy-up only if the meter shows a need

**Built (Steps 0 + 1):**
- **☰ Menu → Performance meter:** fps, sim ms, draw ms, object and building counts, shown below the top bar (`PF`, `perfShow` in `js/main.js`, `#perf`).
- **☰ Menu → Frame rate: Full / 30 fps (saves battery):** draws at most ~30 times a second (`OPT.fps30`, `rAcc`). The sim is unaffected.
- **Glows:** one cached radial sprite per colour, drawn with globalAlpha, instead of a new gradient per glow per frame. Skipped when invisible (alpha ≈ 0, e.g. idle smelters). Checked side by side: identical.
- **Ore nodes:** at ≤ 48 px per tile, painted once per zoom step into a per-node cached picture (`paintNode`, `nodeSprite`). Drawn live when close.
- **Small details:** fan blades skipped when under ~2.5 px; smelter mouth skipped when idle.
- **Result (same profiler):** middle zoom 4.9 → 3.5 ms, near 1.5 → 0.85 ms.

**Verified:** visual check of ore nodes and glow. New smoke check for the meter and 30 fps option. `npm test` all PASS.

**Next up:** Markus turns the meter on, on his tablet, and reports fps and draw ms in 2D and 3D. Then Step 2 or 3, whichever view is slower there.

## Session 40b — 2026-11-14 (Claude Code, cloud session) · Build 117

**Reported:** (1) the performance meter isn't visible; (2) zooming through the middle range, where detailed buildings switch to the simplified far view, now feels very slow.

**Found / reasoning:**
- (2) The only Build 116 change that acts in that range is the per-node ore picture cache (one small canvas per node per zoom step). While zooming, the step changes constantly, so hundreds of canvases are created and thrown away. On a desktop this measured slightly *faster* (zoom sweep over the 3,300-object factory: avg 2.4–2.7 ms vs 2.9–3.0 ms), but on mobile GPUs creating and drawing from many separate small canvases is expensive.
- (1) Unclear. The likeliest cause is an index.html without the `#perf` element (stale cached page) while the JS was already new.

**Built:**
- Ore nodes are drawn directly again (the `paintNode` refactor stays).
- The glow sprite cache stays: a handful of canvases, one per colour.
- `perfShow` creates `#perf` itself if it's missing; z-index raised to 12.

**Verified:** zoom sweep avg 2.6–2.9 ms. `npm test` all PASS.

**Lesson:** desktop and headless measurements don't show mobile canvas or texture costs. Avoid many small canvases; prefer few large ones (atlases or chunk pictures) — relevant for Step 2.

## Session 41 — 2026-11-14 (Claude Code, cloud session) · Build 118

**Context:** Markus's tablet numbers with the meter (Build 117, 3,694 objects / 1,801 buildings, 4× speed): 2D 60 fps, sim 1.7 ms, draw 3.7 ms; 3D 61 fps, sim 3.5 ms, draw 8.1 ms. Zooming through the middle range felt better after Build 117. Decision: stay with what we have; Steps 2 and 3 only if fps drops below about 45.

**Asked:** a valve to limit flow through pipes. Use case: machines produce water that is fed back into the same production, plus some outside water. The outside supply must be limited so the recycled water gets used first.

**Built:** **Flow Valve** (`valve`, k 'router', sub 'valve', fl) in the Fluids menu after the Pipe Junction, unlocked in Tier 2 "Structural Works"; costs 6 Copper Sheet + 1 Rotor.
- **Networks:** not pipe-like, so it splits networks. `rebuildTopo` stores the networks behind (`va`) and in front (`vb`) along its axis. Pipes get a connection arm towards it (`pc` in `buildNets`).
- **Flow:** at the end of `updNets`, moves whole units from `va` to `vb` at most `e.vr` m³/min (accumulator `vacc`). Never mixes fluids; stops when the front network is full.
- **Readouts:** smoothed actual flow in `vf`; reason in `vwhy` (no pipe, same network, empty, other fluid, full).
- **Panel:** limit with −60/−10/−1/+1/+10/+60 and Shut buttons (0–600); flow now and which fluid; plain-language warnings. Rotate turns it round.
- **2D look:** hand wheel, flow arrow, limit shown when zoomed in (red wheel when shut). **3D look:** short pipe, red hand wheel on a stem, arrow fin.
- **Save:** `vr` in `SKEYS`; a limit of 0 is saved too (`serialize` exception). Items never enter it (`accept`), and it never counts as a belt feeder.
- DESIGN.md updated.

**Verified:** 2D and 3D screenshots. New smoke check: tank → valve at 30 → incinerator gives 30/30 m³/min; reversed it passes 0; a shut valve survives save/load. Fluids-menu test updated. `npm test` all PASS.

## Session 41b — 2026-11-14 (Claude Code, cloud session) · Build 119

**Asked:** (screenshot) why does a Refinery on Wet Alumina say "Output full" (0%)? Its output buffer held 24 Alumina Solution.

**Found:** working as designed. A Refinery can't start a batch while 24 of its 12-unit output wait (`capOut`). The alumina can only leave into a pipe network with room. In that row the first refineries run at 100% and fill the shared alumina pipe; the later ones find it full, because downstream use is lower than the row's production. The hint was misleading: it talked about output belts.

**Built:** `outHint(e)` in `js/ui.js`. When a fluid output backs up, the hint names the cause:
- "The Alumina Solution pipe is full: everything connected to it uses less than gets made. Connect more users, a tank or an incinerator, or lower the clock speed." (all networks that could take it are ≥ 90% full)
- "No pipe takes the Alumina Solution: connect a Pipe Junction…" (no attached network can take it)

Solid outputs keep the belt hint.

**Verified:** new smoke check (one refinery with a dead-end pipe, one with no pipe; both hints correct). `npm test` all PASS.

## Session 41c — 2026-11-14 (Claude Code, cloud session) · Build 120

**Asked:** do Pipe Junctions connect directly into Crossings? Markus felt it wasn't working.

**Found:** the simulation was fine. Junction → crossing → junction forms one network, also with a belt crossing the other way, at the full Mk1 rate (300 m³/min, same as a plain pipe). But in 2D nothing showed the link: junctions draw no arms (plain pipes draw their own arm into a junction), and the crossing always showed its dark plus. So a junction next to a crossing looked unconnected. In 3D it already looked right (junction arms from `pc` since Build 101).

**Built (2D, `drawRouter`):**
- A crossing axis with pipe pieces on both sides is drawn as a blue pipe right through the crossing.
- A junction gets its own pipe stub towards a linked crossing or valve.

**Verified:** 2D screenshot. New smoke check (junction → crossing → junction with a belt across delivers 100 m³ in 20 s). `npm test` all PASS.

## Session 41d — 2026-11-14 (Claude Code, cloud session) · Build 121

**Reported:** (screenshot) "It's not the 2D picture." Markus's layout:
- a yellow acid pipe runs horizontally along a row of junctions and crossings
- a blue water pipe runs along the row below
- water goes up from a junction through a crossing (across the acid row) into green machines
- belts cross through the same crossings
The belts worked, the pipes didn't.

**Found:** two real gaps in `buildNets` (my 41c test only had one crossing between two junctions):
1. A pipe looked through one crossing only. Junction → crossing → crossing → junction (both rows) never joined.
2. A junction attached only to buildings it touched, never through a crossing to a building.

**Built:**
- `pastCross(t,d)` follows a chain of up to 32 crossings.
- `buildNets` joins pipe pieces through chains, and a junction attaches to (and draws a stub towards) a building at the end of a chain (`att`, `pc`).
- Each crossing axis stays separate, so two fluids can cross on one tile.
- 2D crossing pipe bars follow chains too.
- DESIGN.md updated.

**Verified:** new smoke check reproducing the layout (refinery above a crossing row; acid junction-crossing-crossing-junction plus a junction left of the first crossing; water junction under the crossing). Acid forms one network, the refinery gets water through the crossing, and the fluids stay apart. `npm test` all PASS.

## Session 41e — 2026-11-14 (Claude Code, cloud session) · Build 122

**Asked:** don't connect parallel pipes directly any more; pipes should connect only through junctions.

**Decision (Markus's rule, DESIGN.md updated):** a pipe tile links only at its two ends along the drawn line.
- Front = its direction; back = straight behind, or on a bend, the side it bends from (`pipeEnds`, `pipeFace` in `js/sim.js`).
- Junctions link on all four sides.
- So pipes side by side stay apart, and a pipe ending at the side of another pipe (a T) doesn't join. A Pipe Junction joins or branches them.
- Applies to pipe↔pipe, through crossing chains, and to Flow Valves.
- 2D crossing pipe bars follow the same rule.

**Also:**
- A single tapped pipe piece turns to face its neighbours if its current axis has none (`pipeAxisOK` in `buildPath`). Dragged lines follow the finger as before.
- Pipe descriptions updated.

**Note for old saves:** factories that relied on side-by-side or T contacts between pipes will split there. A junction fixes it.

**Verified:** new smoke check (parallel rows apart, straight row joins, T apart, T with a junction joins). Two older tests had single vertical pipe pieces placed pointing sideways; corrected to point along the line. `npm test` all PASS. `npm run playthrough`: all ✓, no errors.

## Session 41f — 2026-11-14 (Claude Code, cloud session) · Build 123

**Asked:** balancing a water loop is very hard. 8 machines give back 28.8 water each (230.4/min); the consumers need 384/min; the difference (153.6) is set on a Flow Valve fed from a water pump. Only whole numbers can be set. Is rounding the reason it stalls after a while? Tanks fill visibly to the top.

**Answer:** not mainly rounding. With a fixed feed:
- slightly too little (153) only means ~99.8% running, which is harmless
- any surplus (154, or consumers running a little under 100%) piles up for ever, fills pipes and tanks, then blocks the returned water, and the loop jams

Tanks only delay that. Visibly filling tanks mean the real surplus is larger than rounding: consumers not quite at 100%. A fixed rate can't follow demand.

**Built:** Flow Valve mode **Top up** (`e.vm=1`, saved via `SKEYS` 'vm').
- Passes fluid only while the network ahead is under half full, still capped by the limit; reason 'topped' shown in the panel.
- The returned fluid always has room, and the outside feed follows actual use.
- Panel: Mode chips "Fixed limit / Top up" with a one-line explanation each.
- DESIGN.md updated.

**Verified:** new smoke check (simulated loop returning 60 of 100/min: valve adds ~36–40/min, returned water never blocked, no shortage, pipe ahead ≤ 53% full). `npm test` all PASS.

## Session 41g — 2026-11-14 (Claude Code, cloud session) · Build 124

**Reported:** (screenshot) pipe flow meters are wrong: three meters near a Flow Valve all read 307.6 m³/min while the valve passes 133.

**Found:** a pipe meter showed its whole network's total (`max(inR,outR)`), so every meter on one network read the same. Valve transfers weren't counted in any totals either.

**Built:**
- Pipe meters show the flow through their own tile. `pipeSide(e)` finds everything connected on one side of the metered tile (through crossings; junction-attached buildings and valves). The meter shows the net in/out of that side.
- Per-building flows per network are exact counts over the last 30 s in 1 s steps (`n.fw`, `flowOf`). A 3–15 s running average read several % off because tanks and valves deliver in bursts, and the meter subtracts big numbers.
- In a pipe loop (both sides joined) the network total is shown.
- Valve transfers count on both networks. The valve panel's "Flowing now" uses the same exact count.

**Verified:** tank (via valve at 60) + tank → incinerator. The meter near the valve reads 60 and the one near the second tank 240 (real: 60 / 240). New smoke check. `npm test` all PASS (one run hit a known flaky belt-rate check; it passed on rerun).

## Session 41h — 2026-11-14 (Claude Code, cloud session) · Build 125

**Reported:** (screenshot) 12 Smelters at 85% clock (25.5 Copper Ingot/min each, 306 together; planner target 305) all show 100% efficiency and "25.5 of 25.5". The meter on their shared output line shows only 300.2/min.

**Found:** a real machine timing bug in `updBuilding`. When a batch finished partway through a 0.05 s step, the leftover progress was dropped (`e.prog=0`) and the next batch started from zero. At 85% a 2 s recipe needs 47.06 steps but took 48, so 25.0/min instead of 25.5 (12 × 25.0 = 300). Efficiency still read 100% because the machine was never idle. Recipes whose time didn't divide evenly into steps were all slightly slow; floating-point sums also cost the odd step at 100% (the playthrough's 99% readings).

**Built:** on finishing, the leftover is kept (`e.ov`, `e.ovT`). A batch that starts in the same step (or the next) begins with that leftover. A stalled machine starts fresh.

**Verified:**
- Smelter output per minute (4 min run): 85% 25.00 → 25.25–25.5 (one ingot still in progress at the end of the count); 100% 30; 250% 75.
- New smoke check: 85% gives 254 in 10 min (expected 255).
- `npm test` all PASS. `npm run playthrough`: all ✓; measured rates now exact (Wire 29.5 → 30, Concrete 14.8 → 15).

## Session 41i — 2026-11-14 (Claude Code, cloud session) · Build 126

**Asked:** (screenshot) why is the downstream pipe flow capped at 300 m³/min when the machines need about 380?

**Answer:** a network's max flow is set by its slowest pipe piece (DESIGN.md since Session 31). One Pipeline Mk1 piece (300) anywhere in a Mk2 network (600) caps the whole network at 300. In the screenshot, the short vertical connectors between the machine rows look like Mk1.

**Built:** the pipe panel names the limiting pieces when a network mixes pipe types, e.g. "6 pieces of Pipeline Mk1 limit this network (outlined in orange). Draw Pipeline Mk2 over them to allow 600 m³/min." (`slowNote`). While the panel is open those pieces are outlined in orange on the 2D map. The panel's explanation text now matches the end-to-end pipe rule (41e).

**Verified:** new smoke check (one Mk1 among Mk2: rate 300 and the note shown). `npm test` all PASS.

## Session 41j — 2026-11-14 (Claude Code, cloud session) · Build 127

**Asked:** in the planner, mark items (fully or partly) as already produced in another factory and used for this plan. E.g. the plan needs 10 Circuit Boards and 5 come from elsewhere: enter 5 as an external input, and the chain for those 5 must drop out.

**Built:** "From other factories" section in "For a target" mode.
- **Data:** `PL.rev.sup = {item: per minute}`, saved with the plan and cleaned in `plFix`.
- **Calculation:** `plRevMulti/plRevOnce(…, sup)` take supplied amounts first (before byproducts) wherever an item is needed: intermediates, end products, raw resources. So machines, power and mining behind them shrink or disappear. `out.sup` holds the amount actually used; extra supply is capped and shown as "only X/min of it is needed here".
- **UI:**
  - each machine card that isn't an end product gets "⇢ I make this elsewhere", which adds the item with its current need, rounded up to 0.1 (`plSupAdd`)
  - the section lists supplied items with an editable rate and ✕, plus "+ Bring in an item…" for any item or raw resource in the plan
  - a card partly covered says "⇢ X/min more comes from another factory"
- DESIGN.md updated.

**Verified:** planner screenshot. New smoke check (Compute Module 5/min: half the Circuit Boards supplied halves that step; all supplied removes it and shrinks Copper Sheet; oversupply capped; button adds the need; section shown). `npm test` all PASS.

## Session 42 — 2026-11-14 (Claude Code, cloud session) · Build 128

**Asked:** a more fitting logo and splash screen, a nicer font and a better icon; proposals first. Three concepts were rendered as a sheet (A "Stencil Works" industrial, B "Horizon" dawn skyline, C "Hex Circuit" tech). Markus chose A, which was the recommendation.

**Built (design A):**
- **Fonts:** Big Shoulders Stencil Display 800 for the wordmark and Big Shoulders Display 700 for the tagline. Both SIL OFL 1.1, stored in `fonts/` with licence files (`OFL-BigShouldersStencil.txt`, `OFL-BigShoulders.txt`), added to `ASSETS` in `sw.js`; the stencil font is preloaded.
- **Icon:** an orange gear on dark slate, with an "F" built from conveyor segments (`icons/icon.svg`). PNGs regenerated: icon-192/512, maskable-512 (full bleed, safe zone), apple-touch-icon 180, and favicon-32 (a simplified version without the belt slits, also used in the top bar).
- **Top bar:** gear icon plus FRONTIER (white) WORKS (orange) in the stencil font.
- **Loading screen:** blueprint grid on dark navy; icon beside the stacked wordmark (stacked vertically on narrow screens); tagline "MINE · BUILD · CONNECT · LAUNCH"; a moving conveyor loading bar; a hazard-stripe band along the bottom.

**Verified:** screenshots of the loading screen on tablet and phone, and of the top bar. `npm test` all PASS.

## Session 43 — 2026-11-14 (Claude Code, cloud session) · Build 129

**Asked:** a third soundtrack in the loop. Markus likes the beat track (Pulse) and wants a different variant, maybe slightly slower but still with a beat. "Be creative."

**Built:** track 3 "Night Shift" (`muSection3`, `muPlay3`, `muSnare` in `js/audio.js`).
- **Tempo and key:** 92 BPM, E minor, three progressions of seventh chords (Em7–Am7–Cmaj7–B7, Em7–Cmaj7–G6–D/F#, Am7–D9–Gmaj7–Bm7).
- **Beat:** laid-back boom-bap with one of three kick patterns; a snappy snare (noise + falling tone) on 2 and 4; swung shaker sixteenths (58 %); a small snare fill into each phrase; an anvil ring at phrase ends.
- **Bass:** round sine sub with a soft octave layer so phone speakers can hear it. Pattern: root, octave, fifth, then an approach note into the next chord.
- **Keys and melody:** electric-piano stabs (sine chord plus a quiet bell octave) with off-beats slightly late; in about 60 % of sections a soft whistled hook from the E minor pentatonic that answers itself every second time.
- **Texture and arrangement:** faint vinyl crackle throughout; keys first, bass after half a bar, drums after the first two bars.

**Rotation:** `muSwitch` cycles Drift → Pulse → Night Shift (`muBpm` per track). Loudness matched to Pulse (offline 60 s render: RMS 0.090 vs 0.092, same peak). DESIGN.md updated.

**Verified:** music smoke test extended (switch to track 3, back to Drift; all 3 tracks in a 20-min loop). `npm test` all PASS. A 60 s preview WAV was sent to Markus.

## Session 43b — 2026-11-14 (Claude Code, cloud session) · Build 130

**Feedback:** the Night Shift beat is fine, but the melody sounds random, "like a kid playing anything on the piano".

**Cause:** the whistled hook drew random notes from the E minor pentatonic each section, unrelated to the chords; the piano rhythm also changed each section.

**Built:**
- Composed tunes (`MU3_MEL`): one per chord progression, one phrase per chord as [step, note, length]. Strong beats sit on chord tones (checked for all 12 phrases). A motif repeats, and the last phrase resolves back towards the first chord.
- The whistle is now a soft triangle with a quiet square edge, playing proper note lengths.
- Tune sections and instrumental sections mostly alternate.
- The piano comping keeps one rhythm for the whole track (`MU.k3`).

**Verified:** offline render (RMS unchanged at 0.090); new 60 s preview with the tune sent to Markus. `npm test` all PASS.

## Session 43c — 2026-11-14 (Claude Code, cloud session) · Build 131

**Feedback:** the melody still sounds random and goes up and down; the beat sounds like it misses a beat every other bar.

**Causes:**
- Each section picked one of three progressions, each with a different tune, so no tune was heard twice in a row; the phrases leapt.
- Every new section restarted with two drumless bars (the intro rule applied per section, not per track).
- The kick pattern had no beat 3, and the swung hat ghosts sounded uneven.

**Built:**
- **One tune for the whole track**, over Em7 · Am7 · Cmaj7 · B7: mostly stepwise, with the same "da-da-daaa" rhythm. It rises G–A–B, answers falling C–B–A, climbs to the high E, and comes home on B.
- **Sections:** always whole 4-chord rounds (64 steps); the first is instrumental, then tune and instrumental alternate.
- **Count-in:** drums and bass count in only when the track starts.
- **Beat:** kick on 1 and 3 every bar plus a push on the "and" of 3 in every second bar; snare on 2 and 4; even eighth hats; a short snare fill only at the end of each 8-bar round.

**Verified:** 90 s offline render (RMS 0.094) sent as a preview. `npm test` all PASS.

## Session 43d — 2026-11-15 (Claude Code, cloud session) · Build 132

**Asked:** pull the "game-audio" skill from github.com/davila7/claude-code-templates (cli-tool/components/skills/creative-design/game-development/game-audio).

**Done:**
- Fetched only that folder (sparse clone) and read it first: a single `SKILL.md` of general game-audio guidance (audio categories, layering, music states and transitions, adaptive audio, 3D audio, mix levels, anti-patterns). No scripts; its allowed tools are read-only.
- Installed as a project skill: `.claude/skills/game-audio/SKILL.md`, unchanged, plus `SOURCE.md` with the origin, commit and MIT licence notice (MIT, © 2025 Daniel Ávila).
- It loads in sessions started after this one.
- No game files changed. BUILD/VERSION bumped only to keep the build number equal to the commit count.

**Note:** the skill is about mixing and sound categories in general. It has little on composing melodies, which was the recent music issue.

## Session 44 — 2026-11-15 (Claude Code, cloud session) · Build 133

**Asked:** (after the skill turned out not to help with melodies; I should have said so before installing it) try a completely new third tune, not based on Night Shift, that fits the game.

**Built:** track 3 "Assembly Line" replaces Night Shift (`muSection3`, `muPlay3`, `muStamp`, `MU3_MEL`, `MU3_FORM` in `js/audio.js`).
- **Tempo and chords:** 100 BPM, D major, I–V–vi–IV (D · A · Bm · G), two bars per chord, the same throughout.
- **Machine groove:** kick on 1 and 3, snare on 2 and 4, even eighth hats, sequencer bass in steady eighths (root/octave/fifth pattern). A metallic press stamp on the last off-beat of every bar, and a soft pneumatic hiss every two bars.
- **Tune:** one composed melody with the same "da-da-daaa, da-da-daaa" rhythm in every phrase: F#-A-D C#-D-A / E-A-C# B-C#-A / F#-B-D E-D-B / G-B-D B-A-G. A bright square lead with a bell octave.
- **Fixed form:** intro (bass + hats, kick counts in) → groove (+ conveyor-tick arpeggio) → tune → tune + harmony (a third below, kept in D major) → breakdown (kick, hiss, tune an octave lower) → tune, then from groove again.

**Level:** the master compressor levels it at RMS ~0.065–0.08 against Pulse's 0.095. Pulse has a kick on every beat, so this is ~2–3 dB quieter. Raising parts further only drove the compressor, so the bass was pulled back slightly for clarity instead.

**Verified:** 2-minute offline render sent as a preview. `npm test` all PASS (music test: 3 tracks rotate).

## Session 45 — 2026-11-15 (Claude Code, cloud session) · Build 134

**Asked:**
1. Be able to pull the map beyond its boundaries: at the coast the edge stays locked to the screen edge and is covered by panels.
2. Have ocean all around the island, with a natural coastline instead of one straight line, without destroying today's map.

**Built:**
- **Camera (`clampCam`):** the centre may go from −6 to MW+6 (and MH), so any edge or corner can be brought to the middle of the screen. 3D already allowed this.
- **Coast ring (`prepMargin`, `mgH`, `MG=32` in `js/render.js`):** scenery outside the map only, so every tile inside is unchanged and old saves are identical.
  - Height field `MGH` per tile corner: where the edge is land, the land carries on 2.5–10.5 tiles with a wavy outline (smoothed edge-land fraction × value noise); lakes touching the edge open into the sea.
  - Painted as four strips (only the ring) at 6 px per tile: mirrored overview colours for the land (darkened 10 % to show it isn't buildable), beach, surf line, shallow and deep sea, with soft transitions.
  - 2D: deep-sea fill plus the strips, drawn before the map chunks; a faint dashed line along the map edge marks the build limit.
- **3D:** `v3H` follows the coast at the edge (`v3MgH`) instead of dropping into a straight cliff, and four coast strip meshes use the same heights with the strips as textures.
- `canPlace` already refuses out-of-bounds tiles. DESIGN.md updated.

**Verified:** screenshots (corner, edge, far zoom, 3D shore). New smoke check (edge can be centred, limit −6, 4 strips, open sea outside, map tiles unchanged, no building outside). `npm test` all PASS.

**Known:** the land in the ring uses the low-res overview colours, so it looks a little softer than the map when zoomed in close.

## Session 46 — 2026-11-15 (Claude Code, cloud session) · Build 135

**Asked:** the coast should be accessible (buildable), not only scenery. Markus agreed to the plan (the map grows by the coast ring and old saves are converted once) and made his own text export as a backup.

**Built:**
- **Map growth:** `genMap` now generates the original map exactly as before, at seed and `S.mw`; `prepTerrain` is deferred via `GEN_DEFER`. Then `expandMap(S.ext)` places it in the middle of a map 2×32 tiles bigger. The ring is filled from a deterministic coast field (smoothed edge-land fraction × value noise, mirrored terrain types and biomes, lakes at the edge open into the sea). Ore patches move with it. Chunk sizes stay whole (448 = 14×32, 192 = 6×32).
- **New games:** `S.ext=MAP_EXT` (448×448); the core stays centred.
- **Old saves** (no `S.ext`), converted once in `load()`:
  - the original save text is stored as `frontierworks_preexpand`
  - entities, power-wire ends (`e.pl`), drone routes (`lx`/`ly`), drones in flight (`dr.tx`/`ty`), the zone map (RLE re-laid into the bigger map) and the camera move +32
  - a toast says the map grew
- **Seams:** the scenery water outside starts with the colour of the map's edge water and fades to open sea over ~10 tiles. In 3D the sea floor starts at lake depth and stays flat for 2 tiles.
- DESIGN.md updated.

**Verified:**
- Large old-format factory (1,938 entities: 452 smelters, 1,452 belts, pipes + valve, poles with wires, drone pads with a route, a sign, a flow meter, a zone) converted. Every entity sits at +32 with the same type and direction. Pipe networks 2 → 2, grids 1 → 1, wire ends 4 → 4, belt bends 16 → 16, zone tiles 4,675 → 4,675. Production over 60 s 5,190 → 5,193. Drone route and sign kept, backup stored, no page errors.
- Smoke tests updated: new maps are 448; the old v1 save test moves the core 62 → 94 and checks wires and a zone tile.
- `npm test` all PASS.

**Known issues:**
- In 3D a faint dark line remains along the old outer edge (now out at sea). It isn't from slope, skirts or the coast strips; to look into later.
- Devices still on an old build must update before loading a converted save from cloud sync; an old build would place everything 32 tiles off.

## Session 47 — 2026-11-15 (Claude Code, cloud session) · Build 136

**Discussed (no game code):** long-term motivation after tier 10. Markus has built all tiers, and nuclear power is never needed.

**Agreed (DESIGN.md section 12, "Long-term plan: the solar project"):**
- Goal: a **Dyson Sphere** around the sun, built in stages.
- **Worlds:** Home, Moon, an ice planet and a fire planet, each with a material found nowhere else, production conditions (low gravity/vacuum, cold, heat/radiation), a special machine and its own power source.
- **Orbital Freighters** between Launch Pads, routed like drone pads, needing fuel for the round trip.
- **Starting a world:** a small, tight starter kit, with all unlocks kept.
- Free travel back and forth between worlds; worlds you aren't on keep producing in the background.
- **Blueprints** first, max 24×24.
- **Rejected by Markus:** endless upgrade scaling, and supply contracts with rewards.
- **Order:** Blueprints → Tier 11 "Spaceflight" + Moon → Orbital Freighters → ice and fire planets → Dyson Sphere.

**Next up:** Blueprints (step 1), when Markus says go.

Docs only. BUILD/VERSION bumped only to keep the build number equal to the commit count.

## Session 48 — 2026-11-15 (Claude Code, cloud session) · Build 137

**Asked:** "go": step 1 of the solar-project plan, Blueprints.

**Built (`js/blueprint.js`, new file in `ASSETS` and the script order):**
- **Blueprint panel:** toolbar button (clipboard icon, key B) opens the list: name (editable), size, piece count, affordable or not, "Build this", "Delete" (asks first). "＋ Copy an area" starts copying.
- **Copy (`'bpcopy'`):** drag a rectangle, max 24×24. The preview turns red when too big, using the zone preview in 2D and 3D. Takes every piece fully inside except the Base Core, with recipe, clock, logic-splitter rules, valve limit and mode, sign text and colour, and on/off.
- **Build (`'bppaste'`):**
  - first tap shows the outline at that spot; a tap inside it builds, a tap elsewhere moves it; with a mouse it follows the pointer
  - ⟳ turns it in quarter turns (positions, directions and splitter sides turn with it)
  - 2D preview: pieces see-through, blocked tiles red; 3D: ghost boxes
  - buildings are placed first, then belts and pipes; each piece is paid like normal placing
  - pieces already there are kept; the summary names what was built, missing materials per building, blocked and not-yet-unlocked pieces
- **Storage:** stored per device (localStorage, up to 40), so blueprints work on every map and, later, every world.
- CLAUDE.md and DESIGN.md updated.

**Verified:** screenshot (panel, turned preview with a blocked tile). New smoke check: 4 pieces copied, 31-wide area refused, built turned with recipe/clock/rules, rebuilding on itself keeps all 4, no materials reports what's missing. `npm test` all PASS.

**Next up:** Tier 11 "Spaceflight" + the Moon (step 2), after Markus has tried blueprints.

## Session 48b — 2026-11-15 (Claude Code, cloud session) · Build 138

**Asked:** Markus proposed a different blueprint design (copying existing machinery is nice but inaccurate):
- a blueprint **building**, 12×12 to start, placed anywhere, needing electricity
- build the content inside it piece by piece and save it under a name
- load existing blueprints into it, change them, save them
- no clipboard button; the building goes under Signs

I repeated the idea back first. He said "go" with my recommendations: free design pieces that don't run; build-elsewhere from any station's panel; 12×12 now, bigger later. He had no saved blueprints yet, so nothing needed carrying over.

**Built (`js/blueprint.js` rewritten):**
- **Blueprint Station** (`bpstation`, k 'bpst', 12×12, 2 MW, 20 Iron Plate + 20 Wire, available from the start, Signs tab), drawn live in 2D as a blueprint-blue grid table; "NO POWER" and dimmed without power. 3D: a flat blue platform with a small console; design pieces show as ghost boxes.
- **Designing:** building tools and dragged belt/pipe lines inside a station make design pieces (`e.dsg`, saved with `e.dn`) at no cost. Pieces must fit inside and not overlap; belts drawn over belts are replaced. Design belts show their curves.
- **Pieces:** tapping one opens a "Design piece" panel: recipe (machines), logic-splitter rules (one per side), valve limit and mode, sign text, rotate, remove. Dismantle inside the station removes pieces; the station itself is removed from its panel.
- **Station panel:** name field, piece count and total cost, 💾 Save blueprint (needs power; same name replaces), Clear design (asks first). Under "Your blueprints": Build elsewhere, Load to change (needs power and must fit, asks before replacing the design), Delete.
- **Building from a blueprint:** unchanged (`bppaste`: tap shows the outline, tap inside builds, ⟳ turns it, pays, reports missing).
- **Removed:** the copy-an-area tool, the clipboard toolbar button, key B and the old Blueprints panel.
- DESIGN.md and CLAUDE.md updated.

**Verified:** screenshot (station with a design, panel). New smoke check:
- station placed; pieces placed, out-of-area and overlapping pieces refused
- pieces are free and not real buildings
- Save is disabled without power; a saved blueprint is trimmed to 5×2, and loading it back keeps the recipe
- Dismantle removes a piece but keeps the station
- built turned with recipe and rules; missing materials are reported
- Signs-tab test updated for the station

`npm test` all PASS.

## Session 48c — 2026-11-15 (Claude Code, cloud session) · Build 139

**Asked:**
- long-press and move a blueprint before committing it
- a commit button instead of tapping inside the outline, plus Cancel and Rotate before committing
- open the blueprint list without building a station first
- a new Blueprints menu holding the station sizes (one for now) and the list

**Built:**
- **Blueprints tab** (`bp`, clipboard icon) with "Blueprint Station 12×12" (moved from Signs) and a **Blueprint List** button (`bplist`, a button rather than a tool). The list opens panel 'bplib': saved blueprints with cost, Build, Delete, and a hint that designing happens in a station.
- **Placing:**
  - the outline starts in the middle of the view
  - a tap on the map moves it there and never builds
  - long-press inside it (0.38 s, light vibration) and drag slides it; with a mouse, dragging inside it moves it straight away (2D and 3D)
  - a bar above the menu, `#bpbar`: ⟳ Rotate · ✓ Build here · ✕ Cancel (Esc also cancels)
  - building pays and reports as before
  - the outline no longer follows the mouse, since it has to stay put while you go to the button
- Docs updated.

**Verified:** screenshot (tab, bar, outline). New smoke check: the tab shows both buttons; the list opens without a station; the bar shows; a tap moves without building; Rotate ×4, then Build here builds; Cancel ends and hides the bar. Signs-tab test is back to signs + zone. `npm test` all PASS.

## Session 48d — 2026-11-15 (Claude Code, cloud session) · Build 140

**Asked:** loading a blueprint into a station to change it should put it at the same position it was saved from.

**Built:** `stSave` stores where the trimmed design sat in the station (`bp.ox`, `bp.oy`). `stLoad` puts the pieces back there; if that wouldn't fit the station, it moves them as far in as possible. Blueprints without a stored position load at the top-left as before.

**Verified:** station smoke check extended (a design saved from (1,1) loads back at (1,1)). `npm test` all PASS.

## Session 49 — 2026-11-15 (Claude Code, cloud session) · Build 141

**Asked:** "go" for step 2a of the solar-project plan: the foundation for several worlds.

**Built:**
- **Several worlds in one save.** `WORLDS` (home, moon) and `WKEYS` (seed, gen, mw, ext, zones, zmap, cam, inv) in `data.js`.
  - `switchWorld(id)` packs the current world (its WKEYS and entities) into `S.worlds[id]`, then unpacks the target or creates it (map from WORLDS, empty stock, a Base Core in the middle) through the normal `load()`.
  - Unlocks, tiers and settings are shared; each world has its own stock.
  - The coast-ring migration now only runs when `S.ext` is missing (the Moon has `ext:0`).
- **The Moon** (`genMoon`, `S.gen===3`, 256×256):
  - two new biomes appended to `BIOMES` (Lunar Mare, Lunar Highlands); `genBiome` and its resource top-up only look at the first `EARTH_NB=7`, so Home maps are unchanged
  - craters (rock rim, dusty floor), no water, a flat landing site
  - nodes: iron mostly in maria, quartz and bauxite in highlands, some copper and uranium
  - 2D: no clouds; the ring around the map is regolith instead of sea
  - 3D: black sky with stars, no water, a grey floor, dark fog, and a small painted Home planet above the northern horizon
- **Solar Panel** (`solar`, gen, 2×2, 10 MW, no fuel, `only:'moon'`, enforced in `canPlace`; sprite and 3D model). Not unlocked yet; it comes with step 2b.
- **UI:** a world button in the top bar (only when a second world exists) → Worlds panel → Travel (short travel screen, then save).

**Fixed along the way:**
- an accidental empty slot in the biome list (double comma)
- the 3D fog colour (Three's Fog keeps its own copy, so the distant ground showed Earth haze)
- far too many dark stones on the Moon (now Earth's density)

**Verified:**
- Moon screenshots in 2D (near and far) and 3D.
- New smoke check: travel to the Moon (its own map and biomes, no water, Base Core, empty stock); solar powers a smelter there; Home is unchanged after the round trip (entities, stock, seed); solar is refused on Home; worlds survive save/load; the Moon keeps its buildings and stock.
- Biome test counts Earth biomes only.
- `npm test` all PASS.

**Next up:** step 2b, the Tier 11 parts, the Launch Pad, the colony rocket and the starter kit.

## Session 50 — 2026-11-15 (Claude Code, cloud session) · Build 142

**Asked:** a way to copy the settings of one machine and paste them onto another of the same type.

**Built (`js/ui.js`, `js/input.js`):** a "Settings" row in the panel of machines, drills, pumps, generators, signs, logic splitters and valves.
- 📋 Copy settings: recipe, clock, on/off, logic-splitter rules, valve limit and mode, sign text and colour (`UI.clip={d,s}`).
- Paste settings: only shown for the same building type.
- Paste onto others: tool `'paste'`; tap each building of that type, and the hand button or Esc stops. A different type is refused with a toast.
- A recipe change from pasting refunds the old buffers like the recipe buttons (`setRecipe` helper, now also used by `setRec`). Clock is clamped to the allowed range.

**Verified:** new smoke check (copy from a smelter, paste onto a second one: recipe, clock and off pasted and old ore refunded; paste mode applies to a third; a Press is refused). `npm test` all PASS.

## Session 50b — 2026-11-15 (Build 143)
**Asked:** Fuel Rod and Uranium Cell look identical.
**Built:** Fuel Rod gets its own item picture ('rods' in `js/render.js`): a tilted bundle of three long rods with grey caps and glowing green bands, held by a clamp. Uranium Cell and Battery keep the short "cell" shape. 3D belts show Fuel Rods as a slim upright cylinder (`rods` in the `view3d.js` item pool).
**Verified:** side-by-side render of Uranium Cell / Fuel Rod / Battery / Uranium; `npm test` all PASS.
**Known issues / next up / open questions:** unchanged from Session 50 (step 2b of the solar plan waits for Markus's go).

## Session 51 — 2026-11-15 (Claude Code, cloud session) · Build 144

**Asked:** "go for step 2B" of the solar plan: Tier 11, the Launch Pad, the colony rocket and the starter kit.

**Built:**
- **Tier 11 "Spaceflight"** after the Orbital Beacon: needs 50 Quantum Cores, 100 Control Chips, 100 Heavy Trusses and 500 Batteries.
  - It unlocks the Launch Pad, the Solar Panel and four new recipes.
  - The beacon dialog no longer says "every tier is complete"; it points to Tier 11.
- **New parts** (own icons):
  - Hull Plate (Assembler: 12 Alloy Panels + 1 Heavy Truss → 2)
  - Heat Shield (Blender: 2 Heat Sinks, 12 Silica, 6 acid)
  - Rocket Fuel canisters (Blender: 20 fuel, 2 Aluminum Casings, 4 acid → 2; solid, so they go on belts)
  - Guidance Core (Fabricator: Quantum Core, 2 Control Chips, 6 Resonators, 4 Data Buses)
- **Launch Pad** (`lpad`, 6×6, Home only, 150 MW while the rocket is ready):
  - takes the rocket parts and the starter kit by belt from any side, and only what's still missing
  - panel shows loaded / needed per item, with **Load from stock** and **Launch** buttons
  - the rocket stacks up visibly as it fills: in 2D a ghost outline is filled from the bottom; in 3D it is built in stages
  - Launch: about 10 s climb with flame, smoke and a rumble sound
- **Starter kit** (`ROCKET.kit`):
  - contents: 200 iron plates, 40 rods, 200 wire, 50 cable, 120 concrete, 16 braced plates, 8 rotors, 24 alloy panels, 12 circuit boards
  - enough for about 6 solar panels, a few drills, smelters and presses, an assembler, belts and poles
  - the first landing creates the Moon with the kit in its stock, with a dialog: "Travel to the Moon"
  - every further launch adds another kit (the only way to send material until Orbital Freighters)
- **Build menu:** buildings locked to one world (Solar Panel, Launch Pad) only show on that world.

**Decisions (my recommended defaults, per Markus's standing preference):**
- **Rocket Fuel is a canister item, not a fluid.** The pad then needs no pipe connection, and the freighters can reuse it later.
- **The kit is loaded into the pad like the parts.** You pack the cargo yourself; nothing is free.
- **The Moon has no coal and no limestone,** so concrete must come from Home.

**Verified:**
- Screenshots of an empty pad, a 40% pad, a full pad and a launch in 2D and 3D, plus the panel.
- New smoke check: Tier 11 unlocks; the pad only accepts rocket items; Load from stock; no launch without power; after the flight the Moon exists with the kit; a second launch adds another kit; solar is still Moon-only.
- The goals test now counts all tiers, and the dead-end audit covers Tier 11.
- `npm test` all PASS.

**Known issues:**
- Tier 11 numbers are first guesses; pacing for tiers 6–11 is untested.
- 3D items for Hull Plate and Heat Shield use the generic block shape.
- A launch pauses while you are on another world, and continues when you come back.

**Next up:** step 2c: helium crystals on the Moon, the Vacuum Furnace, and background production for worlds you aren't on.

**Open questions:** Is the kit too small or too big? Should later launches carry something other than the starter kit?

## Session 52 — 2026-11-15 (Claude Code, cloud session) · Build 145

**Asked:** keep the rocket as built for now (how material is shipped between Moon and Home comes with the freighter routes). Continue
with step 2c and prepare the Moon, even though Markus hasn't reached Tier 10/11 yet.

**Built:**
- **Helium Crystals.** A new Moon-only resource (`MOON_RES`) on nodes, mined by normal drills.
  - About 9 nodes on a 256 map, mostly on crater floors, plus one next to the landing site.
  - They are placed in their own pass with their own random numbers, so the Moon's other nodes stay where they were.
  - `genBiome` skips Moon resources, so Home maps are unchanged (important: its top-up loop goes through every node type).
- **Vacuum Furnace** (`vfurnace`, 3×3, 20 MW, Moon only, unlocked with Tier 11).
  - It is built from iron plates, copper sheets, quartz crystals and cable, which the Moon can make itself.
  - Recipes: Vacuum Wafer (6 silica + 2 helium → 2) and Lattice Crystal (4 quartz crystals + 4 helium → 1).
  - Both are parts for the later Dyson Sphere stages and have no use yet.
  - It has its own sprite (sealed dome with a blue glow), a 3D model and icons. It appears in the planner and the codex.
- **Background production.**
  - Each world counts what reaches its Base Core, over the last 5 minutes in 10 s steps.
  - Leaving a world stores that rate with it. Coming back pays out the time away (game time) into its stock.
  - The arrival message shows what came in, e.g. "while you were away (12 min): +3,400 Iron Plate…".
  - The Worlds panel lists each world's background rates (and "measuring…" for the current one).
  - Works both ways: Home keeps producing while you are on the Moon.

**Decisions (recommended defaults):**
- **Only Base Core deliveries count** as background production. It is simple, honest, and keeps the tablet fast.
  - Inactive worlds are not simulated; their machines stay paused as they were.
  - A world needs at least 1 minute of measuring before it gets a new rate; otherwise it keeps the old one.
- **Vacuum Furnace at 20 MW instead of 40.** The starter kit's 6 solar panels (60 MW) can then run it plus some drills and smelters.

**Verified:**
- Moon screenshots in 2D and 3D: helium drill and furnace.
- New smoke check: no helium and no furnace on Home; helium on the Moon including near the landing site; a furnace on solar power makes wafers; background pay-out matches the rate × time away; the Worlds panel text shows.
- `npm test` all PASS. One random-map belt check failed once and passed on the rerun; it is unrelated.

**Known issues:**
- Solar Panels need alloy panels and circuit boards, which the Moon can't make (no water for alumina, no oil for plastic). So Moon power grows only with rocket kits until freighters exist.
- Background production ignores power or input shortages that might have happened on the inactive world.

**Next up:** step 3, Orbital Freighters (a pad on each world, routes, fuel there and back), which also settles how concrete gets to the Moon.

**Open questions:** How often should a freighter fly, and how much should it carry? (Markus: "how often am I able to fly a rocket back and forth like a drone?" That gets answered with the freighter design.)

## Session 53 — 2026-11-16 (Claude Code, cloud session) · Build 146

**Asked:** (1) How many Quantum Cores and Turbine Cores per minute are reasonable? Answered in chat, no code change.
(2) A simple calculator in the app that can stay on screen.

**Answer to (1), from the planner:**
- Tier 10 needs 50 Turbine Cores. 104 Quantum Cores are needed in total (50 for Tier 10, 50 for Tier 11, 4 for Guidance Cores).
- Advice: 2 Turbine Cores/min (about 780 MW; Tier 10's 50 in about 25 min) and 1 Quantum Core/min (about 1.6 GW; about 8 Fabricators, 30 Refineries, 61 Presses; all 104 in about 1¾ h).
- Offered to lower Tier 11's Quantum Cores from 50 to 25 if it feels grindy.

**Built (new file `js/calc.js`, added to `index.html` and the `sw.js` ASSETS):**
- **Floating calculator:** opened from a new toolbar button ("+ − × =" icon, next to Find) or ☰ Menu → Tools.
  - It stays on screen while you play; drag it by its title bar.
  - Its position and open/closed state are remembered per device (`OPT.calc`, `OPT.calcPos`).
- **Keys:** digits, + − × ÷, brackets, ., ⌫, C and =. The result previews in amber while you type; = turns it into the new starting number.
  - `%` works from the keyboard only (e.g. 50%×200).
- **Keyboard:** digits, operators, Enter and Backspace go to the calculator while it is open. Game keys (R, X, C, V…) still work.
- **Safe arithmetic parser (`calcEval`):** no `eval`. It handles operator precedence, brackets, unary minus, % and thousands commas.
- Results are shown with up to 8 decimals and thousands separators.

**Verified:**
- Phone screenshot (390 px wide): the toolbar still fits.
- New smoke check: the toolbar button opens it; button presses give 12×3=36; typing 7+3 Enter gives 10; the parser handles precedence, brackets, ÷, %, unary minus, an unfinished expression and commas; closing hides it and remembers that.
- `npm test` all PASS.

**Known issues:** none.

**Next up:** step 3, Orbital Freighters (still waiting for Markus's go).

## Session 53b — 2026-11-16 (Claude Code, cloud session) · Build 147

**Asked:** the calculator's second line (the result preview) shrinks when it is empty, and the whole calculator jumps with it. Make it a fixed height.

**Built:** the result line now always has the same height (18 px plus padding). A very long result is cut off with "…" instead of wrapping.

**Verified:** the smoke check now also confirms the result line is the same height with and without a result. `npm test` all PASS.

## Session 54 — 2026-11-17 (Claude Code, cloud session) · Build 148

**Asked:** on the Moon, buildings should be white (against solar radiation): the same shapes and textures, only a whiter colour scheme. Show proposals first.

**Proposals (picture in chat):**
- A, Lunar White: pale tints. This was my recommendation.
- B, white with colour accents.
- C, all white.

Markus chose **B, with whiter whites and stronger colour accents**.

**Built:**
- **`moonTint`:** grey and plain parts are lifted towards white (with a soft curve, so holes and outlines stay darkish). Strongly coloured parts (saturation above about 0.3) keep their colour with 35% more saturation and a little more brightness.
- **2D:** building sprites made on the Moon get this pass once and are cached separately (`|m`), so Home sprites are untouched.
- **3D:** `v3WorldTint()` recolours the models' vertex colours in place when the world changes, and restores the originals on Home. Glowing parts are left alone.
- Belts, pipes, signs, lights, items and the toolbar icons keep their normal colours.

**Verified:**
- Moon screenshots in 2D and 3D: solar panels, Vacuum Furnace, drill, smelter, press, assembler, fabricator, crate, pole.
- The smoke check now also confirms that the Moon uses its own sprites, grey turns near-white, and red stays red.
- `npm test` all PASS.

**Known issues:**
- The thin semi-transparent edge of each sprite isn't whitened (it stays a dark outline, which looks fine).
- Animated overlays drawn live (the press plate, assembler arms) keep their Home colours.

## Session 54b — 2026-11-17 (Claude Code, cloud session) · Build 149

**Asked:** switch the Moon buildings to the monochrome option C instead, with stronger white ("real white") and stronger grey.

**Built:**
- `moonTint` is now monochrome: brightness is mapped with a contrast curve. Everything from mid brightness up becomes pure white (#fff); darker details become clear greys; holes and outlines go near-black (about 16%).
- No colour remains on Moon buildings, apart from live lights, glows, item badges, belts and signs.
- 2D and 3D use the same mapping.

**Verified:**
- Moon screenshots in 2D and 3D.
- The smoke check now confirms that grey and red both turn neutral white/grey, and that dark holes stay dark.
- `npm test` all PASS.

**Known issues:**
- Machines now differ only by shape, which is harder at far zoom. The far-zoom simplified view still uses each building's colour.
- Solar Panel cells are grey too.

## Session 55 — 2026-11-17 (Claude Code, cloud session) · Build 150

**Asked:**
- Discussion: water and concrete on the Moon. Markus agreed to the mix: ice in dark craters, sintered regolith blocks, Moon concrete from regolith + water, oil stays Earth-only. Not built yet.
- Trains: Markus agreed to all recommendations (one-way tracks, electric, Tier 6, Moon maglev look, after the freighters). Not built yet.
- A balance analysis of tiers 6–11 without changing recipes. Then: "Change tier 11."

**Analysis (measured with the planner, raw ore for each tier goal):** 300 · 1.6k · 1.6k · 4.2k · 7.2k · 15.7k · 8.3k · 8.3k · 14.5k · 110k · 169k (the rocket itself: 29k).
- Tiers 1–5 rise evenly. Tier 6 is a bump and tiers 7–8 a dip (only matters for new games).
- Tier 10 jumps 7.5× because of the Quantum Cores. Markus enjoyed building that line, so it stays.
- Tier 11 cost six times the rocket and mostly repeated Tier 10's parts: just waiting.
- The Fission Reactor makes power effectively unlimited late in the game (Markus has 50 GW spare). Plan: give future machines and the sphere large power demands instead of weakening the reactor.

**Built (goals and unlocks only; no recipe changed, so factories are unaffected):**
- **Tier 10, Orbital Beacon, now unlocks the four rocket-part recipes.** Saves already past Tier 10 get them on load (`grantUnlocks`).
- **Tier 11, Spaceflight, now asks for** 40 Hull Plates, 20 Heat Shields, 5 Guidance Cores and 100 Rocket Fuel (about 25k ore). It still unlocks the Launch Pad, Solar Panel, Vacuum Furnace and the two Vacuum Furnace recipes.
- The beacon dialog names the unlocked rocket parts.

**Verified:** the dead-end audit passes (Tier 11's items can be made with Tier 10's unlocks). Colony rocket and Moon checks still PASS. `npm test` all PASS.

**Next up:**
- Orbital Freighters, with the Moon water/concrete mix.
- Then trains.
- The balance rulebook and an all-tier measuring tool.

## Session 56 — 2026-11-17 (Claude Code, cloud session) · Build 151

**Asked:** "Go for trains, and make sure everything we've discussed is noted in our design document, so you can tell me where to kick off next time."

**Design document:**
- **Section 12:** the Moon water/concrete plan (ice in dark craters, Regolith Excavator, sintered blocks, Moon concrete, oil stays Earth-only, freighters as trade).
- **New section 13, Trains:** the agreed design and its phases.
- **New section 14, Balance rulebook:** the rules from Session 55, with the measured tier costs.
- **New section 15, Where to start next.**
- Section 11 (out of scope) no longer lists trains.

**Built: Trains Phase 1** (new file `js/train.js`, plus hooks in sim/ui/input/render/view3d; unlocked with Tier 6, so saves past it get it on load)
- **Track pieces** (Transport tab):
  - **Rail:** one-way, dragged like belts, with a direction arrow; turns become curves.
  - **Rail Switch:** trains leave front, left or right onto track leading away.
  - **Train Stop:** a named track piece, with a red post and a name tag. Several stops may share a name; the nearest one is used.
  - Any track can be joined from the side (merge).
- **Cargo Bay** (2×2, 5 MW, holds 800):
  - placed beside the track behind a stop (2 tiles per wagon)
  - **Load:** belts fill the bay, the bay fills the wagon next to it
  - **Unload:** the wagon empties into the bay, which passes items to belts like a crate
  - transfer speed: 40 items/s per bay
- **Trains:** built from a Train Stop's panel with 1–4 wagons (cost: loco 4 Motors, 4 Circuit Boards, 10 Steel Beams, 20 plates; wagon 4 Steel Beams, 20 plates, 20 bolts).
  - They appear on the track leading into the stop.
  - **Panel** (tap a train): status, speed, cargo per wagon, and the schedule (stop + condition: until full, until empty, wait 10/30/60 s; add, remove, Leave now, Remove train with refund).
  - **Default schedule:** this stop until full, then another stop until empty.
- **Driving:**
  - The shortest route over switches (BFS), recomputed whenever the track changes.
  - Speed up to 16 tiles/s, speeding up and braking smoothly.
  - It reserves the tiles it covers and brakes for the train ahead. It halts with the locomotive on the stop.
- **Power:** a pole whose supply area touches a track network powers the whole network. A moving train draws 15 MW; without power it crawls at 1.5 tiles/s.
- **Look:**
  - Earth 2D: concrete bed, sleepers, steel rails, a red loco and grey wagons with a cargo colour bar.
  - Earth 3D: a track bed with rails and boxy cars.
  - Moon: a white guideway beam and rounded white capsules, in 2D and 3D. Moon-buildable costs for the track; the loco needs parts from Home.
- **Safety:** a train whose track is removed is taken off and refunded, cargo included.
- Trains are saved per world (`S.trains`, a WKEY).

**Verified:**
- A browser run: a 30×12 loop with stops "Mine" and "Works", bays and burners. The train loads at Mine, drives the loop, unloads at Works, and delivered all 800 plates over two trips.
- Screenshots: 2D near and far, 3D Earth, Moon 2D and 3D, train and stop panels.
- New smoke check: Tier 6 unlock, curve detection, build, delivery, track power, tapping a train, panel, save/load keeps it, removing track under it refunds it.
- `npm test` all PASS.

**Known issues:**
- Trains cut curves slightly differently in 3D, where cars are straight boxes.
- Placing a train needs straight-ish track behind the stop (it follows the track backwards, so curves are fine).
- A schedule refers to stop *names*: renaming a stop updates the schedules.
- The far-zoom view shows track as thin strips and doesn't draw trains.

**Next up:** Markus tries trains on his phone. Then Orbital Freighters with the Moon water/concrete mix (DESIGN.md section 15).

## Session 56b — 2026-11-17 (Claude Code, cloud session) · Build 152

**Reported:** "No route to Station 2" (screenshot). The loop runs clockwise, but Station 2 on the bottom track faced east, against the flow. Its red post sat on the wrong side. Trains treat that like a one-way street the wrong way round.

**Fixed:**
- **Auto-turn:** a track piece or stop that is placed against the flow turns round by itself (on every track change), if that connects it. "Against the flow" means nothing leads into it and it leads nowhere. Switches are left alone. This also repairs existing saves, including Markus's.
- **Dragging plain track over a Train Stop or Switch** no longer replaces it; it only sets its direction.
- **Clearer message:** "No route to X: the track arrows don't lead there", or "No stop called X".
- **Arrows:** Train Stops now show the direction arrow too.

**Verified:** the trains smoke check now also turns a stop round on purpose (it turns back by itself) and drags track over a stop (the stop stays). `npm test` all PASS.

## Session 56c — 2026-11-17 (Claude Code, cloud session) · Build 153

**Reported:**
- The Rail Switch only turned in one direction. It should line up by itself and look like a switch right away, with a short section leading away; Rotate should swap that section's side.
- Track wasn't visible while dragging, only after lifting the finger.

**Built:**
- **Rail Switch redone:**
  - It has a main line (straight on) plus **one branch** on a side (`e.bs`: 1 right, 2 left, saved).
  - It always draws the branch curve, plus a short stub beyond the tile while nothing is connected there.
  - It **lines up with the track leading into it** by itself.
  - Rotate in its panel swaps the branch side. While placing a new switch, the Rotate button picks the side for it ("Switch branch: left/right").
  - Trains choose straight on or the branch, whichever leads to their next stop.
- **Dragging track** now shows the rails (curves included) while the finger is down, like belts. A single tap preview also shows rails.

**Verified:**
- Screenshot of a switch on a straight track (branch and stub) and of a drag preview with a curve.
- The smoke check now also confirms: a switch placed the wrong way lines up; it has one branch on the right; Rotate swaps it to the left; dragging track over it keeps it.
- `npm test` all PASS.

**Also in this push (same Build 153):**
- **Reported:** after deleting a train, a new one couldn't be placed ("Another train is on that track"). The tile-occupancy map was only refreshed while at least one train existed, so a deleted last train left its tiles marked. It is now reset every tick, and removing a train clears its tiles at once.
- The smoke check now deletes a train and builds a new one at the same stop.
- **Test fix:** the blueprint check's "build elsewhere" spot could land inside the Blueprint Station on some random maps, where pieces are free, so `poor` failed now and then. It now searches for a free spot away from the station after the first paste.

## Session 56d — 2026-11-17 (Claude Code, cloud session) · Build 154

**Reported:** a Train Stop became a curved piece when placed.

**Cause:** a stop placed at the end of a track (or beside it) with the Rotate direction pointing elsewhere was fed from its side, so it was drawn as a curve. Tapping a stop onto existing track was already fine.

**Fixed:** a Train Stop is always straight. If it is fed only from the side and nothing continues ahead, it turns to line up with the incoming track. The smoke check places a stop at a track end facing the wrong way and confirms it ends up straight. `npm test` all PASS.

## Session 56e — 2026-11-17 (Claude Code, cloud session) · Build 155

**Asked:** switches come in four kinds, not two: forward left/right (split) and backward left/right (a side track joining in).

**Built:**
- `e.bs` now has four values: 1 split right, 2 split left, 3 join from the right, 4 join from the left.
- A joining switch lets trains in from the back and from its branch side, and sends them straight on; it draws its branch curving in.
- Rotate (in the panel, or while placing) cycles through all four, with a toast naming the kind.
- The short stub shows on the branch side while nothing is connected there.

**Verified:** the smoke check cycles a switch through split right → split left → join from the right (one exit; accepts from back and side) → … → back to split right. `npm test` all PASS.

## Session 56f — 2026-11-17 (Claude Code, cloud session) · Build 156

**Reported:** a train added to an existing track started moving at once and seemed to copy the older train's plan, although Markus had given it its own.

**Causes:**
- A new train started straight away with its default plan ("this stop until full, then the other stop"). A stocked Cargo Bay fills it, so it leaves.
- Tapping a train picked the *first* train within reach, not the nearest. With two trains close together, the panel (and the schedule edits) could belong to the other train. The panel title just said "Train".

**Fixed:**
- **New trains start paused.** Their panel opens right after building, with the default plan pre-filled. The status reads "Paused: check the schedule, then press ▶ Start". The panel has **▶ Start / ⏸ Pause** (Leave now also un-pauses).
- **Tapping picks the car nearest the finger.**
- **The panel title shows the train's name** ("Train 3"), and the selected train is outlined in yellow (as before).
- The `hold` flag is saved with the train.

**Verified:** the smoke check confirms a newly built train is paused; the shuttle test starts it. `npm test` all PASS.

## Session 56g — 2026-11-17 (Claude Code, cloud session) · Build 157

**Reported:** a train meant to wait 10 s at a station instead showed "waiting for the track ahead" to that same station, and never moved on to its next stop.

**Cause:** braking into a stop could leave the train a hair short of the stop point (less than 0.01 tile). Speed was then set to 0, so it never "arrived", and its wait never started.

**Fixed:** within 0.03 tile of the stop point, the train snaps onto it and arrives.

**Verified:** the smoke check now puts a train 0.008 tile before its stop and confirms it arrives in one tick. `npm test` all PASS.

## Session 57 — 2026-11-17 (Claude Code, cloud session) · Build 158

**Asked:** Tier 11 is far too much right after the big Tier 10 factory (four new production lines, Heavy Trusses, Guidance Cores that are almost a second Quantum Core factory). Tune it down or drop it; the Quantum Core could be the heart of the ship. Markus accepted the proposal.

**Built (data only; Markus hadn't built any rocket-part lines, so nothing in his factory changes):**
- **Tier 11 removed.** Tier 10, Orbital Beacon, stays the "you win" moment. It now unlocks the Launch Pad, Solar Panel, Vacuum Furnace, the four rocket parts and the two Vacuum Furnace recipes.
  - The next goal is the launch itself: the Goals card shows "Next: Build a Launch Pad and launch the colony rocket…", and the top bar shows "🚀 Rocket" until the Moon is reached.
  - Saves that are past all tiers simply count as complete, with everything unlocked.
- **Simpler rocket parts:**
  - Hull Plate = 6 Alloy Panels + 2 Steel Beams → 1 (Assembler, 12 s); no more Heavy Truss.
  - **Guidance Core = 1 Quantum Core + 1 Control Chip** (Fabricator, 30 s).
  - Rocket Fuel = 10 fuel + 1 Aluminum Casing → 2 (Blender, 6 s); no acid.
  - Heat Shield is unchanged.
- **Smaller rocket:** 30 Hull Plates, 15 Heat Shields, 2 Guidance Cores, 60 Rocket Fuel (was 60 / 30 / 4 / 200), plus the starter kit. That is roughly a tenth of Tier 10.
- The design document (sections 12 and 14) is updated.

**Verified:** the colony-rocket smoke check now checks the unlocks on Tier 10, the last tier. The dead-end audit passes. `npm test` all PASS.

## Session 58 — 2026-11-17 (Claude Code, cloud session) · Build 159

**Asked:** Markus reached the Moon. He wanted guidance there like the tiers on Earth (the Goals panel showing the Moon's goals) and a purpose for the Moon. He agreed to the proposal.

**Built:**
- **World goals (`WGOALS`, progress `S.wms`):** four Moon goals, each delivered from the Moon's own stock.
  1. **Foothold:** 200 iron plates, 100 copper sheets, 200 wire. Unlocks the Regolith Excavator and Sintered Blocks.
  2. **Ice Prospecting:** 300 concrete, 100 quartz crystals, 50 vacuum wafers. Unlocks the Ice Melter and Moon Concrete.
  3. **Lunar Power:** 100 lattice crystals, 200 wafers, 500 concrete. Unlocks the Wafer Circuit Board and Lunar Aluminum.
  4. **Export Ready:** 1,000 helium, 300 wafers, 100 lattice crystals. Next: Orbital Freighters.
- **Goals panel:**
  - It shows the current world's goals, with a "🌍 Home tiers / 🌑 Moon goals" switch.
  - Each card shows a one-line "why", progress bars, unlocks and a Hand in button. You can only hand in on that world.
  - The top bar shows "🌑 Goal N" on the Moon. Tiers can only be submitted on Home.
- **New Moon content:**
  - **Regolith Excavator:** `rexc`, a 2×2 drill that needs no node, digs Regolith at 60/min, 8 MW, Moon only, built from Moon materials.
  - **Ice Melter:** `imelt`, 2×2, 6 MW, Moon only; 2 Ice → 10 Water.
  - **Ice nodes:** at least 5 on dark crater floors at least 45 tiles from the landing site, placed in their own generator pass, so existing Moon maps keep their other nodes.
  - **Vacuum Furnace recipes:** Sintered Blocks (4 regolith → 1 concrete), Moon Concrete (3 regolith + 4 water → 2), Wafer Circuit Board (1 wafer + 2 copper sheets → 2), Lunar Aluminum (4 bauxite + 6 water → 2 ingots).
  - Sprites, 3D models and item icons. The planner and codex know the Ice Melter.
- Design document: the Moon goals section, and "where to start next" (Orbital Freighters).

**Verified:**
- Screenshot of the Moon Goals panel.
- New smoke check:
  - every Moon goal can be made from Moon resources with what is unlocked by then (audit)
  - ice sits far away on crater floors
  - the excavator digs without a node
  - Sintered Blocks make concrete; the Ice Melter makes water
  - the panel shows Foothold with an active Hand in button; handing in unlocks and the top bar shows Goal 2
- `npm test` all PASS. The "power wires & switch" check failed once on a random map and passed on two reruns; it is unrelated and existed before.

**Known issues:**
- Goal amounts are first guesses.
- Moon machines needing steel or motors (Refinery, Fabricator, Assembler parts such as rotors are fine) still come from Home kits.

## Session 58b — 2026-11-18 (Claude Code, cloud session) · Build 160

**Reported:** tapping a Solar Panel on the Moon froze the interface (no supply circle, nothing).

**Cause:** the generator panel's consumption line (`genUseHtml`) reads the first fuel's energy. The Solar Panel has no fuels, so it threw an error halfway through opening the panel.

**Fixed:** generators without fuel show "Power source: Sunlight, no fuel needed, load %" and no Fuel or Hand-feed sections. The worlds smoke check now opens a Solar Panel's panel and looks for "Sunlight". `npm test` all PASS.

## Session 58c — 2026-11-18 (Claude Code, cloud session) · Build 161

**Asked:** Solar Panels should show the area they power, like poles.

**Built:**
- **While placing** a generator that also powers buildings (Solar Panel, Coal Burner, Steam Generator, Fuel Turbine, Fission Reactor), its own supply circle shows brightly, with a line to the node it will wire to. The other nodes' circles show too, as before.
- **A selected pole, switch or generator** (panel open) shows its supply circle.
- The circle uses the real rule: buildings whose nearest edge lies within `sup` tiles of the node's centre.

**Verified:** screenshots of a selected Solar Panel (circle) and of placing one (own circle, other circles, wire line). `npm test` all PASS.

## Session 58d — 2026-11-18 (Claude Code, cloud session) · Build 162

**Reported:** after switching off a whole factory with Power Switches, the top-left power indicator froze at 72.9 / 60 MW.

**Cause:** the top bar (and the Stats panel) summed the demand of every power network, including the sections cut off by switches. Machines there still want power, so their unmet demand kept being counted although no generator serves it. The solar network itself wasn't overloaded (no fuse warning).

**Fixed:** both totals now only count networks that have generators. The power-switch smoke check now also confirms that a switched-off machine's demand drops out of the total. `npm test` all PASS.

## Session 58e — 2026-11-18 (Claude Code, cloud session) · Build 163

**Asked:** draw power lines by tapping twice, start point then end point, with no automatic connections to nearby poles, so lines stay clean.

**Built (`poleTap` in `js/input.js`):**
- **Drawing a line** (Power Pole, Power Tower or Power Switch tool):
  - **First tap:** the start, either an existing pole, switch or generator, or empty ground (places a new pole).
  - **Second tap:** an existing node, or empty ground within wire reach (places a new pole). A wire joins them, and the end becomes the next start, so lines chain.
  - **Finishing:** tap the current start again, press Esc, or choose another tool.
- **Messages:** "too far" (with the reach in tiles) and "blocked" when a tap doesn't work.
- **Preview:** the current start is outlined in yellow and its reach shown as a dashed circle. A line runs to the finger: yellow when in reach, red dashed when too far.
- **No automatic wires:**
  - Placing a pole never wires it.
  - Removing a pole only removes its wires; nothing is re-routed.
  - A moved node keeps only the wires still in reach.
  - **Exception (my default):** a generator placed touching another generator joins it, so solar fields stay one network without wiring each panel.
- The Power Pole and Power Tower descriptions explain the taps.

**Verified:**
- Screenshot of a line being drawn: a chain of three poles, start highlighted, preview line.
- Power smoke check rewritten:
  - tap, tap, tap makes a chain with exactly two wires
  - a tap too far away places nothing; tapping the last pole again finishes
  - a pole placed next to a burner is not wired to it
  - the switch chain is now wired by hand
  - removing a pole no longer re-routes lines
- The starter-factory test wires its two poles by hand.
- `npm test` all PASS.

**Known issues:**
- Poles inside a pasted blueprint aren't wired anymore. Wire them with the pole tool or "Connect to…".

## Session 58f — 2026-11-18 (Claude Code, cloud session) · Build 164

**Reported:** the Ice Melter could be placed anywhere; it should only go on ice deposits.

**Built:**
- **The Ice Melter is now an extractor on ice deposits**, like an Oil Pump on a well: 2×2, 10 MW, Moon only. It makes Water straight from the ice below (120 m³/min on a normal deposit, ×0.5 / ×2 for impure / pure), out through a Pipe Junction.
- Placing it off ice says "Needs an ice deposit underneath".
- Drills refuse ice ("Ice is melted where it lies: use an Ice Melter").
- The "Melt Ice" recipe is gone. Moon goal 2 still unlocks the Ice Melter and Moon Concrete.

**Verified:** the Moon goals smoke check confirms the melter is refused off ice, a drill is refused on ice, the melter goes onto an ice node and produces water, and the goal audit counts water once the melter is unlocked. `npm test` all PASS.

## Session 58g — 2026-11-18 (Claude Code, cloud session) · Build 165

**Reported:** the newly unlocked Melt Ice and Moon Concrete seemed missing from the planner. Markus also asked for the difference between Sintered Blocks and Moon Concrete.

**Findings:**
- The planner does list Sintered Blocks and Moon Concrete once Moon goal 2 is handed in. Before that they are locked and only show with "🔒 Show locked".
- "Melt Ice" no longer exists: the Ice Melter makes water directly (Session 58f).

**Fixed (planning on the Moon):**
- Regolith counts as a raw material (dug anywhere), instead of showing as "missing".
- On the Moon, recipes needing Earth-only raws (limestone, coal, crude oil, sulfur) are listed last, so concrete defaults to Sintered Blocks there; on Home, the Press recipe stays the default.
- "From a node" on an ice deposit plans water.

**Verified:** the Moon goals smoke check confirms the Moon default for concrete is Sintered Blocks, regolith is raw and ice gives water; back on Home, concrete defaults to the Press again. `npm test` all PASS.

## Session 58h — 2026-11-18 (Claude Code, cloud session) · Build 166

**Reported:** when starting a power line by tapping a pole or generator, nothing showed which one was picked (on a phone there is no hover, and the start outline was only drawn under the finger).

**Fixed:** while a line is open, its start pole or generator keeps the same yellow dashed, moving ring as a selected building, plus a faint circle for the wire reach. This is drawn every frame, independent of the finger.

**Verified:** screenshot with no hover after two taps; the start pole is ringed. `npm test` all PASS.

**Open question:** Moon Rovers. A proposal was sent (Rover Depot, 200 items per trip, 6 tiles/s, drives around obstacles, tyre tracks, Moon goal 2). Waiting for Markus's go.

## Session 59 — 2026-11-18 (Claude Code, cloud session) · Build 167

**Asked:** Moon Rovers for transport between far-away places ("belts are fun, but rovers would be more fun"). The proposal was accepted as described.

**Built (new file `js/rover.js`, hooks in sim/ui/input/render/view3d):**
- **Rover Depot** (`rdepot`): 3×3, 10 MW (recharging), holds 600, Moon only, unlocked by Moon goal 2 (saves past it get it on load). It is built from Moon materials plus 10 concrete.
  - Belts deliver into it; an unlinked depot passes goods on to belts.
  - Panel: "Send to…" (tap another depot), Unlink, "+ Add a rover / − Remove one" (up to 3; extra rovers cost 20 iron plates, 10 copper sheets, 20 wire), per-rover status, route length, round trip, throughput, delivered so far.
- **Rovers** (`ROVER`): 200 items per trip, about 6 tiles/s (slower in turns), 2 s to load and unload; they wait up to 10 s for a full load.
  - The route is found with A* (8 directions) around buildings and crater rims, then straightened and its corners rounded. Belts, pipes and track can be crossed.
  - Rovers pass through each other. If there is no route, the panel says so and a red dashed line shows it.
  - The depot needs power to send rovers; driving needs none.
- **Look:**
  - 2D: six-wheeled white rovers with a cargo bed in the cargo's colour, a dashed route line for the selected depot, tyre tracks that fade over 2 minutes, and dust puffs.
  - 3D: a white rover model with a coloured cargo block, bouncing slightly on the move; a depot with three garage bays and a charging lamp.

**Verified:**
- A browser run: two depots 40 tiles apart. The rover delivered all 400 plates in two trips; route finding took a few ms.
- Screenshots in 2D (route line, tracks, depot panel) and 3D.
- New smoke check: Moon-only, Moon goal 2 unlock, route found, delivery, tracks, panel, an extra rover costs materials, save/load keeps rovers and route.
- `npm test` all PASS.

**Known issues:**
- Tyre tracks are 2D only and aren't saved.
- Rovers ignore each other. Very long routes (over about 200 tiles around big crater fields) may need a second depot in between.

## Session 59b — 2026-11-18 (Claude Code, cloud session) · Build 168

**Asked:** fluid rovers as well.

**Built:**
- **Tanker Depot** (`tdepot`): 3×3, 10 MW, holds 1200 m³ of one fluid, Moon only, unlocked by Moon goal 2 (saves past it get it on load). It has its own sprite (two tanks) and 3D model.
  - **Linked (sending):** it fills from its pipes through a Pipe Junction; it is a fluid consumer in `updNets`.
  - **Unlinked (receiving):** it feeds the fluid into its pipes, like a tank.
  - It won't deliver into a depot that holds a different fluid; the panel says so.
- **Tanker rovers:** the same rovers and route finding, 400 m³ per trip, drawn with a round tank showing a stripe of the fluid's colour. Panel units read m³.
- Dust puffs behind rovers are now much smaller and shorter-lived; before, they hid the rover and its tracks.

**Verified:**
- A browser run: source depot → junction → linked depot → tanker rovers → far depot → its pipe holds water.
- New smoke check: Moon goal 2 unlock, the source drains, water arrives, water reaches the far pipe, the tanker depot refuses items.
- `npm test` all PASS.

**Known issues:** a single pipe (300 m³/min) fills rovers slower than they drive, so they leave after 10 s with partial loads. Use a Mk2 pipe or several junctions for full loads.

## Session 60 — 2026-11-18 (Claude Code, cloud session) · Build 169

**Asked:** Markus found the Moon too easy (tiny factories were enough for every goal, helium was no challenge), and freighters would only stockpile Moon goods on Earth. He agreed to a "Moon Colony" chapter with four parts: rate goals, self-sufficiency, Habitats with a population, then freighters with real uses on Earth. Parts 1–3 are built in this session; part 4 comes next.

**Built:**
- **Rate goals:**
  - World goals can ask for steady deliveries into the Base Core (`rate`, per minute, measured over the last minute) held for 3 minutes (`WG_HOLD`), and/or a colony population (`pop`).
  - The goal card shows live rates (green when on target), "Held steadily x / 180 s" and the colonists. The button reads "Complete" and only works when everything is met (`wgReady`).
  - The hold timer advances every 10 s bucket (`wgRateTick`).
- **Self-sufficiency recipes (unlocked by Moon goal 4, Export Ready):**
  - Lunar Steel: Vacuum Furnace, 4 iron ore + 2 regolith → 2 steel ingots, 8 s.
  - Regolith Oxygen: Vacuum Furnace, 6 regolith → 3 oxygen + 1 iron ore.
  - Water Splitting: Refinery, 4 water → 3 oxygen.
  - With Moon steel, the normal recipes give steel pipes and beams, stators, motors and cased girders. Refineries and Fabricators can now be built from Moon materials; only plastic stays Earth-only.
- **Habitat** (`habitat`, k 'hab', 4×4, 15 MW, Moon only, unlocked by goal 4):
  - It takes water and oxygen through Pipe Junctions (new fluid: Oxygen).
  - Each colonist uses 2 m³/min of each. A supplied habitat gains a colonist every 20 s (up to 10); short of power, water or oxygen, it loses one.
  - Panel: colonists, status, buffers, consumption, colony total. It has a dome sprite with lit windows per colonist and a 3D dome with a glowing ring.
- **New Moon goals:**
  - 5 **First Settlers:** 10 colonists; 20 steel ingots/min and 30 concrete/min held.
  - 6 **Self-Sufficient:** 30 colonists; 6 motors/min, 15 steel beams/min, 20 vacuum wafers/min held. Next: Orbital Freighters.
  - Goal 4 now unlocks the colony content. Markus's four finished goals stay counted.
- **Rovers climb crater rims:** rim tiles are passable at four times the route cost and 45% speed. Before, crater floors enclosed by rims were unreachable (the smoke check failed on such maps). Straightening never adds a rim crossing.

**Verified:**
- New smoke check:
  - a supplied habitat grows to 3+ colonists in 65 s; one short of water shrinks
  - the habitat panel works
  - a rate goal is not ready at 170 s held and ready at 180 s; the panel shows "Held steadily"; Complete advances the goal
- The goal audit covers rate items and habitat supply.
- The rover checks pass across several random maps.
- `npm test` all PASS.

**Next up:** part 4. Orbital Freighters (stock-based, fuelled from Home) and real uses for Moon goods on Earth: the first Dyson Sphere stage (Sphere Frame) and Earth upgrades with lattice crystals and helium.

## Session 60b — 2026-11-18 (Claude Code, cloud session) · Build 170

**Asked:** part 4 of the Moon Colony chapter: Orbital Freighters with real uses for Moon goods on Earth.

**Built (new file `js/freight.js`):**
- **Freighter Port** (`fport`): 6×6 on either world, 40 MW while a freighter waits to launch, built from Moon-makeable materials (hull plates, steel beams, concrete, circuit boards). Unlocked by Moon goal 6, Self-Sufficient.
- **Freighters** (shared `S.fr`):
  - Built at Home's port, up to 3 (20 Hull Plates, 1 Guidance Core, 40 Rocket Fuel each).
  - Each has 3 cargo lines "to the Moon" and 3 "back to Home" (item + amount, up to 2,000 per direction).
  - They take from and deliver into the worlds' **item stocks**, so they keep flying while you are on the other world (packed stocks are updated directly).
  - 60 s per flight, 5 s docked at each end; 40 Rocket Fuel per round trip from Home's stock. The Home port needs power at launch while you're on Home.
  - Messages: no port, no fuel, no power. They can be scrapped when docked (refunded).
- **Panels:** the Home port edits routes and shows each freighter's live state; a Moon port explains it's a landing site and shows traffic; the Worlds panel lists all freighters.
- **2D:** a freighter (a smaller rocket) sits docked on the port, and take-off and landing are animated at the port of the world you're on.
- **Uses for Moon goods on Earth** (alternate recipes, unlocked by goal 6):
  - **Cryo Fuel Rod:** 30 uranium cells + 10 helium crystals + 3 girders → 1 rod (instead of 50 cells).
  - **Lattice Quantum Core:** 1 control chip + 2 compute modules + 2 lattice crystals → 1 core.

**Verified:**
- New smoke check: ports on both worlds; a freighter built at Home; one round trip carries 300 plastic to the Moon's stock and 500 helium to Home's stock and burns the fuel; the Worlds panel lists it; the new recipes and unlock exist.
- Screenshot of the port panel with the docked freighter.
- `npm test` all PASS.

**Known issues:**
- Freighters aren't drawn in 3D yet (ports are).
- Colony and freighter numbers are first guesses.
- The Sphere Frame (first Dyson Sphere stage) is not built; Moon goods' Earth use is the two alternate recipes for now.

**Next up:** Markus plays the colony goals and freighters. Then 3D freighter visuals, balance, and the next chapter (ice planet or first Dyson Sphere stage).

## Session 60c — 2026-11-18 (Claude Code, cloud session) · Build 171

**Asked:** why ask for raw steel ingots per minute? They aren't useful for building. Ask for beams or pipes instead.

**Changed:** Moon goal 5, First Settlers, now asks for **15 steel pipes/min** (was 20 steel ingots/min) plus 30 concrete/min. That is about the same steel; pipes are used for Refineries, stators and motors. Goal 6 already asks for beams and motors. Rate goals don't use up anything; deliveries stay in the Moon's stock.

**Verified:** the colony smoke check uses pipes. `npm test` all PASS.

## Session 60d — 2026-11-18 (Claude Code, cloud session) · Build 172

**Asked:** something stronger than 10 MW Solar Panels; a factory for the colony rate goals needs 350–400 MW. Markus accepted the proposal (both).

**Built:**
- **Solar Array** (`solar2`): 4×4, 60 MW, no fuel, Moon only. 50% more power per tile than panels. Cost: 16 alloy panels, 8 vacuum wafers, 6 steel beams, 20 wire. Unlocked by Moon goal 4 (saves past it get it on load). Arrays touching each other or panels join one network.
- **Helium Fusion Reactor** (`fusion`): 6×6, 1500 MW, Moon only. It burns Helium Crystals (now 3000 MJ each, so 30/min at full load) and needs 120 m³/min of water through a Pipe Junction. Unlocked by Moon goal 5.
  - Cost: 60 steel beams, 40 girders, 20 motors, 20 lattice crystals, 40 wafers, 80 copper sheets.
  - **Deviation from the proposal:** no Guidance Core from Earth, because freighters only arrive with goal 6.
- Sprites (a 4×4 cell grid; a torus chamber with a blue glow and a moving arc), 3D models, and the planner and generator cards through the normal generator code.

**Verified:**
- Screenshots in 2D and 3D on the Moon.
- New smoke check: the array alone gives a 60 MW grid; the reactor gives 1500 MW with helium and water and burns fuel under load; both are refused on Home.
- `npm test` all PASS.

## Session 61 — 2026-11-18 (Claude Code, cloud session) · Build 173

**Asked:** a way to show or hide the factory zones.

**Built:**
- ☰ Menu → View → **Factory zones: Show / Hide**, saved per device in `OPT.zhide`.
- Hidden means no tint, fences or name labels, in 2D and 3D.
- Zones still exist and still count: dashboard, stats and efficiency are unchanged.
- While the Factory Zone tool, zone cutting or a zone's panel is in use, they show anyway (`zHidden()`).

**Verified:** new smoke check for the menu switch, hiding, the zone tool still showing them, and showing again. `npm test` all PASS.

## Session 61b — 2026-11-18 (Claude Code, cloud session) · Build 174

**Reported:** the Regolith Excavator's panel didn't show its output rate like a drill.

**Cause:** the rate was computed from the ore node underneath; the excavator has none, so it came out as 0.

**Fixed:** it now shows its full rate (60/min at 100% clock, scaled by the clock). The Moon goals smoke check opens its panel and looks for "Output rate 60/min". `npm test` all PASS.

## Session 61c — 2026-11-18 (Claude Code, cloud session) · Build 175

**Asked:** rovers drive right over pipes and belts; avoid this.

**Changed:**
- Belts, pipes and track now cost 30× in the rover route search, so rovers drive around them.
- They only cross where there is no other way (e.g. a base fully enclosed by belts); there they slow to half speed.
- Straightening the route never adds a crossing.

**Verified:** the rover smoke check now lays a short belt across a found route; the new route avoids every belt tile. The rover and tanker checks pass. `npm test` all PASS.

## Session 61d — 2026-11-18 (Claude Code, cloud session) · Build 176

**Asked:** connected habitats should share water and oxygen, so one junction of each supplies a whole block.

**Built:**
- Habitats that touch form a block (`habClusters`, recomputed when the layout changes). Their water and oxygen are evened out every tick (`habShare`), so a junction on any one habitat feeds them all. Each still needs power.
- The panel says how many habitats it is connected to.
- A short corridor is drawn between habitats placed right next to each other.

**Verified:**
- Screenshot of three touching habitats with corridors.
- The colony smoke check places a second habitat next to the first, feeds only the first, and confirms the second fills with water and oxygen.
- `npm test` all PASS.

## Session 61e — 2026-11-19 (Claude Code, cloud session) · Build 177

**Asked:** rover tyre tracks visible in 3D as well.

**Built:**
- `v3Tracks` (rover.js) draws two flat dark marks per track point (left and right wheel) just above the ground.
- One instanced mesh, updated at most every 0.3 s or when tracks are added.
- Marks fade over 2 minutes from near-black towards the ground grey, matching 2D.
- Tracks are cleared when changing worlds.

**Verified:** 3D screenshot shows the twin tracks from the depot along the route. `npm test` all PASS.

## Session 61f — 2026-11-19 (Claude Code, cloud session) · Build 178

**Reported:** with rovers in the chain, the delivery rate goes up and down, and every dip below target restarted the 3-minute hold. It should be averaged over a longer time, like the belt meters.

**Changed:** goal rates are now averaged over the last 5 minutes (all Base Core buckets) instead of the last minute. Batches from rovers or trains even out, and the hold only resets when the 5-minute average really drops below target. The goal card text says so.

**Verified:** the colony smoke check now feeds the Base Core in batches every 30 s (empty buckets in between). The goal still completes after the hold. `npm test` all PASS.

## Session 61g — 2026-11-19 (Claude Code, cloud session) · Build 179

**Reported:** after replacing Solar Panels with Solar Arrays the fuse tripped. After resetting it, production stayed halted.

**Likely cause** (the save itself wasn't available):
- Since Session 58e nothing wires itself. Removing the panels removed their wires, and the new arrays only join if they touch another generator.
- The machines' poles were left on a network without generators. That network can't trip (no capacity), so nothing came back after the reset.
- **Fix in play:** draw a line from each separate group of arrays to a pole with the pole tool.

**Built, to make this visible:**
- **Machines, drills, pumps and pads** say why they have no power: "no pole in reach", "fuse tripped", "no generator on this network", or "generators idle (fuel?)".
- **A generator** with no wires and no consumers shows "Not connected: draw a power line to it" (red status dot).

**Verified:** the Moon power smoke check confirms a lone Solar Array reports "Not connected". `npm test` all PASS.

## Session 61h — 2026-11-19 (Claude Code, cloud session) · Build 180

**Asked:** the steady-hold measure should allow 10–20% deviation over the 3 minutes without resetting.

**Changed:**
- The hold now keeps counting while every rate's 5-minute average is at least **85%** of its target (`WG_TOL`, the middle of 10–20%). It resets only below that.
- Goal card colours: green at or above target, amber within tolerance, red below. The card text explains this.

**Verified:** the colony smoke check feeds about 90% of target in batches (the goal still completes) and confirms a rate far below target resets the clock. `npm test` all PASS.

## Session 62 — 2026-11-19 (Claude Code, cloud session) · Build 181

**Asked:** Markus finished Moon goal 6. He chose Dyson Sphere stage 1 (Sphere Frame) as the next chapter, before the ice planet.

**Built (new file `js/dyson.js`):**
- **Sphere Frame Segment:** Fabricator, 40 s; 2 lattice crystals + 2 hull plates + 4 heat sinks + 6 steel beams.
- **Sphere Launcher** (`slaunch`): 8×8, Home only.
  - It takes segments by belt (holds 20) and fires one every 20 s while powered, drawing 4000 MW while charging.
  - 2D: a blue charge glow and a golden launch streak. 3D: an inclined rail with glowing coils.
- **Stage 1, Sphere Frame:** 300 segments in orbit.
  - Completing it shows a dialog and unlocks the **Sphere Receiver** (`srecv`, 4×4, Home, 2500 MW, no fuel; a dish with a glowing focus).
  - Progress (shared `S.dyson.f`) shows in a "☀ Dyson Sphere" card under the Home tiers in Goals and in the top bar ("☀ Sphere 70%").
  - Stage 2 is listed as "needs goods from the ice planet".
- **3D sky:**
  - The sun (a glowing sprite) hangs low in the north-west sky, kept relative to the camera like the Moon's Home planet.
  - A golden ring of frame segments grows around it with progress; a second, crossing ring appears after 50%. It shows on both worlds.
  - The first placements sat above the visible sky, so it was moved down to just above the horizon.
- Unlocks: the launcher and the segment recipe come with Moon goal 6, so Markus has them on load.

**Verified:**
- Screenshots: 3D sky with the frame at 70%, and the launcher.
- New smoke check: the launcher only takes segments, fires per its timer when powered, the stage completes (dialog, receiver unlocked), it stops after completion, the Goals card and top-bar label work, and a Receiver gives a 2500 MW grid.
- `npm test` all PASS.

**Known issues:**
- The sun direction is fixed; it doesn't match the shadow light, which comes from higher up.
- The frame is only seen when the camera looks towards the horizon in the north-west.
