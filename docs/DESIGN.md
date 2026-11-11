# Frontier Works — Design

**What this file is:** the living description of what the game *is* — vision, rules, systems and agreed decisions.
Update it only when Markus and Claude agree a design change. It is **not** a progress log (that's `BUILD_LOG.md`).
Exact numbers (recipes, costs, rates) live in `js/data.js`; this file explains the *why* and the structure.

---

## 1. Vision
A 2D, top-down factory-building game in the browser, in the spirit of the big 3D factory games, but
playable on a phone. The player lands on an untouched planet, taps resources, builds production chains and
a power grid, and climbs 10 tech tiers until launching the **Orbital Beacon**.

**Pillars (in priority order)**
1. **Deep production chains:** many intermediate parts, byproducts, alternate recipes, fluids and power.
   Complexity comes from logistics and ratios, not from fiddly controls.
2. **Beautiful and alive:** painted terrain, detailed buildings that animate while working, smoke, flowing belts.
3. **Smooth on touch:** every action works with one finger; pinch to zoom; no hover-only features.
4. **Original:** own name, item names, recipes and art (drawn in code). Never copy assets or names from commercial games.

## 2. Core loop
Find a node → drill it → belt ore into machines → belt products into the **Base Core** (they go into the item stock) →
spend the stock on new buildings → submit parts in **Goals** to unlock the next tier → scale up and add power.

## 3. World
- **384×384 tile map** for new games (agreed with Markus in Session 5), procedurally generated from a seed (`genBiome` in `js/sim.js`),
  with lakes, sand, rock and grass. Saves made before Session 5 keep their 128×128 map, generated exactly as before (`genClassic`);
  the map size is stored in the save (`S.mw`, `S.gen:2` for biome maps).
- **Seven biomes** (new maps only). They affect look, decoration and resource odds, **not** building rules (agreed in Session 5).
  The start is always Greenvale; biomes get harder and richer further out. Borders are organic and blend over a few tiles.

| Biome | Look | More common | Rarer |
|---|---|---|---|
| Greenvale (start, radius ~36–55) | meadows, ponds, flowers | iron, copper, limestone, coal | — |
| Pinewood | dense conifer forest | coal, limestone, iron | sulfur |
| Dustreach | dunes, red rock, cacti, few lakes | oil, sulfur, raw quartz | coal |
| Craglands | bare grey rock | iron, bauxite, quartz; more pure nodes | oil |
| Mirefen | marsh, many pools, reeds | oil, coal, sulfur | quartz |
| Frostmark | snow, ice, snowy pines | quartz, bauxite, uranium | limestone |
| Emberfield (outer ring) | ash, basalt, glowing cracks | sulfur, uranium; many pure nodes | iron, copper |

  Every resource is guaranteed to exist. Tapping a node shows its biome; moving into a new biome shows a short message;
  the planner's "For a target" mode says which biomes a raw resource is most common in.
- The start area around the Core is always dry and has guaranteed iron, copper, limestone and coal nodes, plus a pond.
- **Resources (10):** iron ore, copper ore, limestone, coal, sulfur, raw quartz, bauxite, uranium ore, crude oil (wells), water (any lake).
  Rarer resources sit further from the start (sulfur/quartz/oil ≥ 24 tiles, bauxite ≥ 28, uranium ≥ 45).
- **Node purity:** impure ×0.5, normal ×1, pure ×2 extraction rate.
- **Building rules:** buildings can't sit on water; belts, pipes, poles, splitters and crossings can (bridges).
  The water pump must sit fully on water. Drills need an ore node and oil pumps an oil well inside their footprint.

## 4. Items and production
- 56 items (6 of them fluids) and 56 recipes, 10 of them alternates (marked "(alt)").
- **Seven machines.** Each has its own recipe set, and the player picks the recipe per machine:

| Machine | Size | Role |
|---|---|---|
| Smelter | 2×2 | ore → ingot (1 input) |
| Press | 2×2 | 1 input → 1 part (plates, rods, bolts, wire, cable, concrete, beams, pipes, quartz parts) |
| Assembler | 3×3 | 2 inputs → 1 part |
| Foundry | 3×3 | 2-ingredient smelting (steel, aluminum) |
| Refinery | 3×3 | fluid processing; can output 1 solid + 1 fluid (byproducts!) |
| Fabricator | 4×4 | up to 4 inputs → complex parts |
| Blender | 3×3 | mixes solids and fluids |

- **Byproducts are real:** if a byproduct's output buffer is full, the machine stops. Players must route or burn it
  (incinerator) or recycle it (e.g. heavy residue → fuel / petroleum coke, polymer resin → plastic / rubber).
- **Clock speed:** 10–100%, and up to 250% after Tier 4. Power use scales with clock^1.6.

## 5. Logistics rules (important, intentionally simple)
- One item per belt tile. Belt speeds: Mk1 60/min, Mk2 120, Mk3 270, Mk4 480, Mk5 780. Pipes: Mk1 300 m³/min, Mk2 600.
- **Pipes have no direction** (agreed with Markus, Session 31). Touching pipe tiles and Pipe Junctions (also straight through a Crossing) form one
  **fluid network**, like a power grid: one fluid per network (sticky until emptied in the pipe's panel), 10 m³ per tile, max flow set by the slowest
  pipe (Mk1 300, Mk2 600 m³/min). Touching buildings join automatically: pumps, machine fluid outputs and tanks (under half full) fill it; machines and
  generators needing that fluid, tanks (over 80 % full) and incinerators draw from it. A second fluid is refused and marked with a red "!" (no mixing).
  The Pipe Junction stays as a 4-way pipe piece; plain pipes connect just as well. Old saves keep their pipes, with direction ignored.
- **A building outputs into any belt/pipe that points away from its edge, and accepts input from any belt/pipe pointing into it.**
  There are no fixed ports. Solids only go to belts and fluids only to pipes.
  **Routers touch buildings directly** (confirmed with Markus, Session 10): a Splitter/Sorting Splitter output side (or Pipe Junction side)
  touching a building feeds it without a belt, and a building pushes output straight into a touching Merger (from any side except
  the merger's front) or into the back of a touching Splitter. A Merger's front can also feed a building directly.
  **Crossings touching a building are see-through** (Session 22): the building only pushes output into a crossing if whatever is on the
  crossing's far side would accept it from that direction (a belt pointing away, a router facing the right way, storage, a machine needing it…).
  So a crossing can carry input in or output out, and it never fills up with output aimed at an incoming belt.
- Belts can feed another belt from the side (side-loading). Belt corners are drawn curved, also when a splitter, merger, crossing or pipe
  junction feeds a belt from the side (Session 21).
- Splitter (back → front/left/right), Merger (back/left/right → front, fair alternation),
  Sorting Splitter (filter item → front, rest → sides), Crossing (two lines cross), Pipe Junction (fluid to all other sides).
- Storage Crate (2000 items) and Fluid Tank (400 m³) buffer and pass items on. The Incinerator destroys anything.
- **Cargo Drones** (agreed with Markus, Session 28; Tier 5): a **Drone Pad** (3×3, holds 400 solid items, fed by belts like a crate). In its panel,
  "Send to…" then tap another pad sets a route (stored by position, so it survives saves). A linked pad is a sender: its drone waits for a full
  load (40 items, at most 8 s), flies straight there at 10 tiles/s (over anything), unloads what fits and flies back. Leftovers return to the pad.
  It draws 25 MW only while busy. An unlinked pad is a receiver and passes items on to outgoing belts. Chains work. Solids only for now; the
  panel shows throughput (≈ items/min), the drone's state and items delivered. Freight rail may come later for bulk.
- The Base Core accepts any solid on any side and adds it to the item stock.

## 6. Power
- Generators: Coal Burner 30 MW, Steam Generator 75 MW (+water), Fuel Turbine 150 MW (liquid fuel),
  Fission Reactor 2500 MW (fuel rods + water; outputs nuclear waste that must be belted away).
- Generators also act as small power poles. Power Pole links 10 tiles and powers buildings within 6; Power Tower links 24 and powers within 9.
- Grids form automatically. Each pole links to at most 5 nearest nodes, and each consumer attaches to the nearest node in range.
- **Fuse:** if demand exceeds capacity on a grid that has running generators, the grid trips and the player must press *Reset fuse*.
  A grid with zero capacity (out of fuel) just blacks out without tripping, so the start can't deadlock.
- Machines draw power only while working. Fuel burns in proportion to load.
- Bootstrap: generators can be hand-fed from stock, and the start stock includes coal.

## 7. Progression
Ten sequential tiers (Goals panel). Each requires parts from the item stock and unlocks buildings and recipes:

| Tier | Name | Key unlocks |
|---|---|---|
| start | — | Drill Mk1, Smelter, Press, Belt Mk1, Splitter/Merger/Crossing, Storage, Coal Burner, Pole |
| 1 | Field Assembly | Assembler, Belt Mk2, Incinerator, Braced Plate, Rotor, Copper Sheet |
| 2 | Structural Works | Pipes, Junction, Water Pump, Tank, Sorting Splitter, Truss Frame |
| 3 | Steam Power | Steam Generator, Power Tower, Drill Mk2 |
| 4 | Steelworks | Foundry, Belt Mk3, steel chain, Cased Girder, Stator, Motor, overclocking |
| 5 | Heavy Industry | Fabricator, Heavy Truss, Drone Pad (Cargo Drones) |
| 6 | Petrochemistry | Oil Pump, Refinery, Fuel Turbine, Pipe Mk2, Belt Mk4, plastic/rubber/fuel, Circuit Board |
| 7 | Electronics | Compute Module, Data Bus, quartz parts, Resonator |
| 8 | Lightweight Alloys | Blender, Drill Mk3, aluminum chain, Heat Sink, acid, Battery, Coolant, Control Chip |
| 9 | Nuclear Age | Fission Reactor, Belt Mk5, Uranium Cell, Fuel Rod, Turbine Core, Quantum Core |
| 10 | Orbital Beacon | Win screen (play can continue) |

Start stock: 120 iron plate, 80 iron rod, 120 wire, 60 cable, 60 concrete, 200 bolts, 40 coal. Hand crafting covers unlocked Smelter, Press and **Assembler** recipes (Assembler added in Session 17: the Assembler costs Braced Plates
and Rotors, which only an Assembler makes, so the first one would otherwise be impossible).
Hand mining gives +5 ore from a node.

## 8. Interface
- Mobile-first, frosted-glass panels. Top bar: logo, power meter, Goals (shows tier, glows when it can be submitted), Items, Stats, Menu.
- Bottom dock: hint/cost line → category tabs (Logistics, Extraction, Production, Power) → building cards with drawn icons.
- Tool buttons (Inspect/pan, Rotate, Dismantle, 2D/3D, compass, Center on Core) sit in a row at the top of the bottom dock (moved from the right edge in
  Session 24 so panels never cover them). Minimap on desktop.
- **Pin** (📌 in every panel's header, Session 25): while pinned, the panel (always in its normal place on the right / bottom) stays open when you
  tap the empty map, pick a building or press Esc, whatever it shows: planner, Stats, Items, a machine… Tapping a machine still switches it to
  that machine. ✕ closes it. The pin setting is remembered per device.
- Machines, drills and pumps not at 100 % clock show a small badge with their clock (amber above 100 %, blue below) in 2D, at the same size and
  zoom level as the number in the efficiency ring.
- Tap = inspect/place, drag = pan, or lay belts when a belt or pipe is selected. Drag with Dismantle clears belts, pipes and poles.
- **Production Planner** (☰ Menu → Tools). A paper-planning tool that only does maths. It never changes the factory.
  - *From a node:* pick resource, purity, extractor, count and clock, then add steps (recipes). Each step takes a chosen
    share (%) of what's left of its input. It shows exact and rounded machine counts (e.g. "3 × Smelter: 2 at 100% + 1 at 67%"),
    rates, the belt/pipe tier each line needs, power, leftovers, missing inputs and "Node output used: N%".
  - *For a target:* pick **one or more end products**, each with its own rate per minute (Session 24). Shared parts are summed, end products are
    marked 🎯. It lists every machine for the whole chain (with a recipe picker where there are alternatives), raw resources (with an extractor estimate),
    byproducts and total power.
    where there are alternatives), raw resources (with an extractor estimate), byproducts and total power.
  - *⚡ Power* (Session 9 request): enter the MW needed and pick a generator and fuel. It shows how many generators
    (and their load), fuel, water and nuclear waste per minute, the chain that makes the fuel, the drills/pumps for it
    (with biome hints), and optionally adds that chain's own power to the demand. Generators burn fuel in proportion to the
    power drawn (fuel/min = MW × 60 ÷ fuel energy). The other two tabs show a "Power plant" line under their total power,
    with a button that opens the Power tab with that demand. "For a target" also estimates drill & pump power.
  - *Plan this node* (Session 13): a resource node's panel (and a drill's or pump's panel) has "📐 Plan this node/drill", which opens
    "From a node" set to that resource, purity, extractor and clock, with a first step already added.
  - Only unlocked recipes and buildings by default. "Show locked" lets you plan later tiers (marked 🔒).
  - Plans are stored separately from the game save (`frontierworks_plan`), so they never affect saves.
- **Efficiency** (Session 11): every machine, drill and pump panel shows the share of the last 30 s it was working, the output per minute
  this gives vs. its maximum at the current clock, and how the rest of the time was lost (waiting for a named input, output full,
  no power), with a short tip for the biggest loss. Measured live, not saved. The panel header shows it as a coloured badge, and
  buildings show it on the map (Session 13): a small ring in the top-left corner in 2D (number shown when zoomed in). Not shown in 3D
  (removed at Markus's request in Session 15). ☰ Menu → View → "Efficiency rings on buildings" turns them off (per device).
- **Factory size** (Session 19): Stats shows objects, buildings, belts, poles, items on belts and save size. When zoomed far out or with
  more than ~6,000 objects on screen, the map switches to simple coloured blocks (belts as strips, status dots on machines) to stay smooth.
- **Find resources** (Session 30): 🔍 in the dock's tool row opens a panel to highlight resource types (counts shown; free nodes only or all).
  Highlighted nodes get a pulsing ring (visible even fully zoomed out), an edge arrow with distance when none is on screen, blinking minimap dots
  and light beams in 3D. A resource node's panel offers "🔦 Highlight all X nodes". Temporary (not saved): a chip above the dock shows it, ✕ clears.
- **Signs** (Session 32): Sign S/M/L/XL (1×1 to 4×4, 1–6 Iron Plates, start unlocked, Logistics, also on water). Placing one opens its panel with a text
  box (60 characters) and 6 board colours. Text wraps (max 3 lines) and is sized to fill the board; signs stay visible in the far view. In 3D a sign
  stands on two posts with its label floating above, facing the camera.
- **3D fly-in** (Session 32): switching to 3D starts straight above the spot in the middle of the screen, eases to an airplane angle (~35°) a bit closer,
  then circles slowly (one turn ≈ 90 s) until the player touches the screen, scrolls or uses the keys.
- Desktop extras: wheel zoom to cursor, right-drag pan, WASD, R/X/Q/H/Esc.
- Camera: eased zoom, swipe momentum, clamped to the map.

### 8a. 3D view (agreed with Markus in Session 4)
- A **2D/3D button** (right-side buttons, or key V, or ☰ Menu → View) switches between the flat map and a real 3D view
  of the same world. It's the same game and the same save; only the drawing differs. The choice is remembered.
- Camera like an online map: one finger drags, pinch zooms, twisting two fingers rotates, sliding two fingers up/down
  tilts (from straight down to a low "airplane" angle). The compass button resets to north and the default tilt.
  Mouse: left-drag pans, right-drag rotates/tilts, wheel zooms, Ctrl+wheel tilts. Keys: WASD move, E/Z rotate.
- Everything works in 3D as in 2D: tap to inspect, place buildings, drag belts/pipes, dismantle (incl. drag-clear).
- 3D look: the painted 2D terrain on the ground with sunken lakes and an animated water surface, the map as an island
  in the sea, trees/bushes/boulders as decoration (they vanish where you build), resource nodes as coloured rocks,
  each building as its own model built from simple shapes, animated while working (drill bits spin, presses stamp,
  arms swing, furnaces glow, smoke/steam rise), moving belt treads with items riding on them, pipes showing their fluid,
  sagging power wires, status lights, soft sun shadows.
- **3D quality: High / Low** in ☰ Menu (Low: no shadows, lower resolution). If High runs slowly the game suggests Low.

## 9. Art direction
- Top-down, soft lighting from the top-left, drop shadows, dark metal bases with a coloured machine body per type.
- Everything is drawn in code (Canvas 2D for the map, Three.js shapes for 3D). There are no image assets except the app icons.
- Status LED per building (green working, yellow waiting, orange blocked, red no power) and an output-item badge.
- Accent colour `#ffb547` (amber). Fonts: Inter (UI) and Rajdhani (headings), self-hosted.

## 10. Technical decisions
- Plain JavaScript, no framework, no build step. The only library is Three.js (MIT, vendored in `js/lib/`), loaded only when 3D is first used. Hosted on GitHub Pages and installable as a PWA (offline via `sw.js`).
- Fixed-step simulation at 20 ticks/s, decoupled from rendering. Game speed can be 1×/2×/4×.
- Updates: ☰ Menu shows the build number top right, with a ↻ button that saves, fetches the newest build and reloads (Session 8). The normal "Update ready" prompt still appears on its own.
- Saves: autosave every 30 s (and when the app is hidden) plus Export/Import as text. Since Session 19: compact format, gzip-compressed,
  stored in the browser's database (IndexedDB) with localStorage as fallback; a failed save shows a warning; old saves and old export text still load.
  Exports start with `FW2:`. Saves are tied to the site's address.
- New features must keep old saves loading.

## 11. Explicitly out of scope (for now)
Trains/rail and other vehicles beyond Cargo Drones, combat/creatures, multiplayer, accounts or cloud saves, sound.
These can be reconsidered; record the decision here if that happens.
