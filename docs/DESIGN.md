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
- **Bigger maps with a real coast** (Session 46, Markus): every map is the original map plus a ring of MAP_EXT=32 tiles on each side
  (new maps 448×448, old 384 maps → 448, classic 128 → 192). The ring comes from a deterministic coast field around the original map:
  where the edge was land the land carries on 2.5–10.5 tiles with a wavy shore (buildable ground, beach), lakes at the edge open into the
  sea, the rest is water. S.ext marks a converted save; older saves are moved 32 tiles in once on load (entities, wires, drone routes,
  zones, camera), the original save text is kept in localStorage 'frontierworks_preexpand'. The scenery ring below now lies around the
  bigger map.
- **Coast around the map** (Session 45): outside the map edge a 32-tile ring of scenery: the land carries on a few tiles with a wavy
  outline (where the edge itself is land), then beach, surf, shallow and open sea; lakes touching the edge open into the sea. Nothing inside
  the map changes and the ring can't be built on (a faint dashed line in 2D marks the limit). The camera can pull the edge to the middle of
  the screen (6 tiles past it), so work at the coast isn't hidden under panels. 3D shows the same coast as a sloping shore.
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
- **Pipes have no flow direction** (agreed with Markus, Session 31). Pipe tiles join **only end to end along the drawn line** (Session 41e,
  Markus: side-by-side pipes and a pipe ending at another pipe's side stay apart; a Pipe Junction joins or branches them). Joined pipes and junctions (also through Crossings) form one
  **fluid network**, like a power grid: one fluid per network (sticky until emptied in the pipe's panel), 10 m³ per tile, max flow set by the slowest
  pipe (Mk1 300, Mk2 600 m³/min). **Buildings join only where a Pipe Junction touches them** (Session 33, Markus's choice: plain pipes can run right
  past a machine without connecting; the junction is the dedicated entry point). Pumps, machine fluid outputs and tanks (under half full) fill the
  network; machines and generators needing that fluid, tanks (over 80 % full) and incinerators draw from it. A second fluid is refused and marked with a red "!" (no mixing).
  The Pipe Junction connects all four sides, to pipes and to the buildings it touches. Old saves keep their pipes, with direction ignored.
- Pipes pass through Crossings like belts do, also through several in a row, and a Pipe Junction can feed a building through a crossing
  chain (Session 41d). Each crossing axis is separate, so two fluids can cross on one tile without mixing.
- **Flow Valve** (Session 41, Tier 2, 6 Copper Sheet + 1 Rotor): sits between two pipes and keeps their networks apart. Moves fluid only in its
  arrow direction, at most the limit set in its panel (0–600 m³/min, default 60, 0 = shut), never mixing fluids. Use: top up a loop that
  recycles water with only as much outside water as it lacks, so the recycled water is used first.
  Mode **Top up** (Session 41f, the default answer for loops): passes fluid only while the network ahead is under half full (still capped by the limit),
  so a loop's own returned fluid always has room and outside fluid follows the real demand. A fixed limit can't: any surplus, however small, fills
  every buffer and then blocks the returned fluid.
- **A building outputs into any belt/pipe that points away from its edge, and accepts input from any belt/pipe pointing into it.**
  There are no fixed ports. Solids only go to belts and fluids only to pipes.
  **Routers touch buildings directly** (confirmed with Markus, Session 10): a Splitter/Logic Splitter output side (or Pipe Junction side)
  touching a building feeds it without a belt, and a building pushes output straight into a touching Merger (from any side except
  the merger's front) or into the back of a touching Splitter. A Merger's front can also feed a building directly.
  **Crossings touching a building are see-through** (Session 22): the building only pushes output into a crossing if whatever is on the
  crossing's far side would accept it from that direction (a belt pointing away, a router facing the right way, storage, a machine needing it…).
  So a crossing can carry input in or output out, and it never fills up with output aimed at an incoming belt.
  A belt that runs into a crossing with nothing able to take the item on the far side clogs: the item waits in the crossing and the line
  backs up, like any belt end (Session 39ad; before, such items went back to the stock).
- Belts can feed another belt from the side (side-loading). Belt corners are drawn curved, also when a splitter, merger, crossing or pipe
  junction feeds a belt from the side (Session 21).
- A belt with a building behind it and one belt (or splitter/merger/crossing) feeding it from the side bends towards that feeder, so a line
  can turn away from a machine it runs past. A bent belt takes items only from its bend: the building behind it does not output into it
  (Session 39v). With no side feeder, the belt stays straight and takes the building's output as before.
- Splitter (back → front/left/right), Merger (back/left/right → front, fair alternation),
  Logic Splitter (rules per output, see below), Crossing (two lines cross), Pipe Junction (fluid to all other sides).
- Storage Crate (2000 items) and Fluid Tank (400 m³) buffer and pass items on. The Incinerator (2×2 since Session 35e, like a Press) destroys anything.
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
| 2 | Structural Works | Pipes, Junction, Flow Valve, Water Pump, Tank, Logic Splitter, Truss Frame |
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
- Bottom dock: hint/cost line → category tabs (Logistics = belts/splitters/crossing/crate, Fluids = pipes/junction/tank, Extraction, Production
  (Incinerator last), Power, Transport = Drone Pad, Signs) → building cards with drawn icons.
- Tool buttons (Inspect/pan, Rotate, Dismantle, 2D/3D, compass, Center on Core) sit in a row at the top of the bottom dock (moved from the right edge in
  Session 24 so panels never cover them). Minimap on desktop.
- **Pin** (📌 in every panel's header, Session 25): while pinned, the panel (always in its normal place on the right / bottom) stays open when you
  tap the empty map, pick a building or press Esc, whatever it shows: planner, Stats, Items, a machine… Tapping a machine still switches it to
  that machine. ✕ closes it. The pin setting is remembered per device.
- Machines, drills and pumps not at 100 % clock show a small badge with their clock (amber above 100 %, blue below) in 2D, at the same size and
  zoom level as the number in the efficiency ring.
- Tap = inspect/place, drag = pan, or lay belts when a belt or pipe is selected. Drag with Dismantle clears belts, pipes and poles.
- **Power wires & Power Switch** (Session 36h, agreed with Markus): poles, towers, switches and generators connect by saved wires. **Since Session 58e (Markus): no
  automatic wires.** With a pole tool, tap a start (an existing pole/switch/generator, or empty ground for a new pole), then tap where the line
  goes (an existing node, or empty ground within reach for a new pole): a wire joins them and the line continues from there; tapping the last
  pole again (or Esc / another tool) finishes. A preview line shows reach (yellow = OK, red dashed = too far). Only a generator placed touching
  another generator joins it (solar fields stay one network). Removing a pole just removes its wires; a moved one keeps the wires still in
  reach. Panels list the wires (✕ to remove) and "Connect to…" adds one by hand. Old saves were reduced once to the fewest wires with the
  same connections. **Power Switch** (Tier 1, 4 Iron Plate + 6 Wire): a pole that powers nothing itself; turned off it cuts its wires, so the part
  behind it forms its own grid. Name tag shown above it. Every pole/switch panel lists the grid's switches with the load behind each and on/off.
  The selected grid's wires light up yellow; cut wires are dashed grey.
- **Flow Meter** (Session 36f, Tier 1 Field Assembly, 2 Iron Plate + 4 Wire, Logistics tab): tap a belt or pipe with it to clip a gauge on
  (tap again to take it off, refunded). Badge above the tile in the efficiency-number font: items/min on belts (counted on that tile, 30 s average),
  m³/min on pipes (the network's flow). White = flowing, amber = at the line's limit, grey = idle. The belt's panel shows flow, maximum and % used.
  Stays on a belt when it's upgraded, refunded when the belt is dismantled. Saved as `fm` on the tile.
- **Stack sizes and input buffers** (Session 39m, agreed with Markus): every item has a stack size (`STACK` in data.js: 200 bolts/wire, 100 raw
  materials, ingots, basic parts and fluids (m³), 50 intermediate parts, 20 advanced parts, 10 Quantum Core). A machine holds one stack of each
  input (at least one cycle's worth). The panel shows "x / stack" per input. ⬆ Fill from stock (Session 39p) tops every solid input up to its stack from the
  item stock. Output buffers unchanged (twice a cycle, min 10).
- **On/off per building** (Session 37e): machines, drills, pumps and generators have ⏻ Turn off / ▶ Turn on in their panel (`e.off`, saved).
  Off: no new cycles (a started one pauses), no extraction or burning, no power drawn or supplied; finished items still leave. Shown dimmed with a
  power symbol in 2D; status "Switched off"; efficiency pauses.
- **Logic Splitter** (Session 39r, Tier 2 "Structural Works", 2 Braced Plate + 10 Cable; it replaced the Sorting Splitter in Session 39ae, old saves convert it to filter item → front, Any other → sides): rules per output (left,
  front, right): specific items, Any, Any other (items no output names), Overflow (only when every normal choice is full or blocked); no rules =
  blocked. Items take turns among the outputs that want them, then overflow outputs; otherwise they wait. Default: Any on all three (= Splitter).
  2D: arrows per output, red square = blocked, amber arrow = overflow-only. Own design, inspired by programmable splitters in factory games.
- **Eraser** (Session 36d, dock button next to Dismantle, key C): swipe over belts, splitters, mergers, crossings and pipes to empty them; tap a
  machine, drill, pump or generator to empty its buffers (recipe stays). Buildings stay. Items go back to the item stock; fluids drain away (a pipe
  empties its whole network). Crates, tanks, Drone Pads and the Core are storage and are left alone.
- **Resizing signs (Session 35c):** a placed sign's panel has Size S/M/L/XL/XXL buttons (XXL = 6×6, added Session 35d). Text and colour stay; it grows from the same top-left corner
  (or keeps its centre if that fits better); the plate difference is paid or refunded. If there's no room, a toast says so.
- **Moving buildings (Session 35):** with no build tool selected, press and hold a building ~0.45 s (short buzz), drag it, let go. A see-through
  preview outlined green/red shows the spot. Or ✥ Move in its panel, then tap the new spot (Esc cancels). Moving is free and keeps everything
  (recipe, buffers, clock, fuel, sign text, drone routes; routes from other pads follow). The new spot must be free and valid; the Base Core can't move. Works in 3D too.
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
- **Signs** (Session 32): Sign S/M/L/XL (1×1 to 4×4, 1–6 Iron Plates, start unlocked, own Signs tab since Session 34, XXL 6×6 since 35d, also on water). Placing one opens its panel with a text
  box (60 characters) and 6 board colours. Text wraps (max 3 lines) and is sized to fill the board; signs stay visible in the far view. In 3D a sign
  stands on two posts with its label floating above, facing the camera.
- **3D fly-in** (Session 32): switching to 3D starts straight above the spot in the middle of the screen, eases to an airplane angle (~35°) a bit closer,
  then circles slowly (one turn ≈ 90 s) until the player touches the screen, scrolls or uses the keys.
- Desktop extras: wheel zoom to cursor, right-drag pan, WASD, R/X/Q/H/Esc.
- Camera: eased zoom, swipe momentum, clamped to the map.

- **Byproducts used inside the plan** (Session 37c): in "For a target" (and the Power tab's fuel chain), a byproduct of one step covers demand for
  that item elsewhere in the same plan (input, raw resource or end product) before more machines or mining are planned. Shown as "♻ … comes from
  byproducts" on the card and in "Byproducts used here"; only the rest is listed as "Byproducts left over".
- **Sound** (Session 39, agreed with Markus: industrial, in the spirit of big factory games, all original and synthesised in code): step 1 =
  effects for placing (metal clunk + ratchet), belt ticks while dragging, dismantling, eraser scrape, rotating (ratchet), moving (servo), buttons,
  refused actions, goal reached (chime), fuse trip (buzz). ☰ Menu → Sound: On/Muted, and per part (Effects / Machines / Music) a tick box and a volume slider (per device; Session 39o).
  Step 2 (Session 39c): machine sounds: one voice per kind (furnace, press, assembler, refinery/pump, drill, generator, belts), louder the more
  working buildings of that kind are near the screen centre; zoom works as overall volume (far out = soft); idle/blocked/off = silent.
  Belts rattle (clicks only) whether loaded or not (Session 39f).
  Step 3 (Session 39f): generative background music: ~80 BPM, minor key; slow pad chords, plucked arpeggio with echo, quiet bass, occasional
  metallic swell with a bell ring; sections of 32–64 beats change progression, pattern and layers; a silent break of 25–60 s every 3–5 min.
  Second track "Pulse" (Session 39h, beat reworked 39k, upbeat 39l): 110 BPM, C-major family, bass drum on every beat (four on the floor, with a click so
  small speakers play it), hats on every off-beat, clap on 2 and 4, busier pulsing bass line, background pads, a plucked arpeggio throughout and an occasional
  metallic clank. Mixed so the beat leads (ear-weighted: kick ~55 %, hats ~13 %, clap ~10 %, bass/pads ~18 %). The tracks alternate forever: 2–3 min each, ~3 s pause between (Session 39n).
  Third track "Assembly Line" (Session 44, replaced the Night Shift attempts of Session 43): 100 BPM, D major, D · A · Bm · G (two bars each).
  Machine groove (kick 1 and 3, snare 2 and 4, even hats, sequencer bass in steady eighths, a press stamp on the last off-beat of each bar,
  a pneumatic hiss every two bars), one composed tune with the same rhythm in every phrase, fixed form: intro → groove → tune →
  tune + harmony → breakdown → tune, then from groove again. The tracks rotate Drift → Pulse → Assembly Line, each 2–3 minutes with a
  ~3 s pause, forever.
- **Factory zones** (Session 38, agreed with Markus: drawn boundaries instead of power switches, since pole circles reach into neighbouring
  factories): Factory Zone tool in the Signs tab, free. Drag a rectangle: touching one zone extends it (any shape from rectangles), touching none
  starts a new one, touching two is refused. Zones never overlap. Shown as a coloured fence (2D line with posts, 3D low fence), faint tint and a
  name tag (2D). Tap a zone with the tool: name, colour, area, buildings inside, ✂ Cut area, Delete. Blocks nothing.
- **Factories dashboard** (Session 38b, the Stats panel): one card per zone (+ "Outside zones"): buildings, power, Designed to make (net full-speed
  output after its own use, with "now"; Session 38c replaced Makes/Uses/Could make more), Sends to / Gets from other factories, Into stock / crates,
  Burned, Short of (machines waiting).
  Items remember the zone they last came from, so a gap between fences still counts as zone → zone. Efficiency badge per card.
  Tap a zone name: the map flies there and its fence pulses. Averages over the last 60 s. Since Session 38f the Stats panel shows only this
  (no Items table, no "All factories together"), with Factory size and Power at the bottom.
- **From other factories** (Session 41j, "For a target" mode): parts (or raw resources) already made elsewhere can be entered with a rate
  per minute ("⇢ I make this elsewhere" on a machine card adds the current need; "+ Bring in an item…"). They are used first, so the
  machines, power and mining behind that amount drop out of the plan; supply beyond the need is shown as not needed. Saved with the plan.
- **Several plans** (Session 37b): the planner has plan tabs (blue) above the mode buttons. Each plan keeps its own mode, settings and ticks;
  tabs are named after what they make unless renamed (✎). ＋ New plan, ✕ Delete this plan (asks), up to 12. "Plan this node" and "Plan the power"
  open their own new tab (or reuse an untouched one). Stored per device.
- **Planner pinned on the left** (Session 36c): the ⇤ button in the planner's header moves it into its own window on the left (on phones: at the top).
  The normal panel keeps opening/closing on the right and follows its own 📌 pin. ⇥ puts the planner back on the right; ✕ closes it (it reopens on
  the left next time). Remembered per device. Planner steps / machine cards have a ☐ tick box: ticked cards are greyed out ("built already").
  Ticks stay while the plan stays the same and clear when a new plan starts (another node/extractor, or other end products).
- **Cloud save** (Session 35k, ☰ Menu → Cloud save): one game on all devices through a private GitHub Gist, with a GitHub key that can only use Gists.
  Automatic (start, coming back to the app, every 3 min, leaving), plus Sync now / Pause / Undo last sync / Disconnect. A device uploads only if the
  cloud still holds the version it started from. Newer cloud + no local play → loads; anything unclear (first connection, both played, cloud looks
  older, another device playing) → asks. The losing game is always kept (cloud backup file or local undo copy). Import asks "all devices" or "only here".

### 8a. 3D view (agreed with Markus in Session 4)
- **3D look** (Session 35f, ☰ Menu): *Enhanced* (default: same lighting as Classic, plus rounded edges, panel texture, sky reflections on metal parts only, soft contact shadows)
  or *Classic* (the look up to Build 44, faster). Independent of 3D quality High/Low. Stored per device.
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

- **Factory zones can be hidden** (Session 61): ☰ Menu → View → Show/Hide; per device; the zone tool shows them anyway.

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

## 12. Long-term plan: the solar project (agreed with Markus, Session 47, not built yet)
After tier 10 the game continues across several worlds towards one goal: a **Dyson Sphere** around the sun. It stays a factory game,
with **no contracts, rewards or endless upgrade scaling**. Order of work: 1 Blueprints → 2 Tier 11 "Spaceflight" + the Moon →
3 Orbital Freighters → 4 Ice and fire planets → 5 the Dyson Sphere in stages.

- **Why travel:** each world has a raw material found nowhere else and **production conditions** that make certain recipes possible
  only there. The sphere's parts combine several worlds (e.g. a superconductor magnet: Moon crystals + ice-planet cryo-ice + home copper,
  assembled in the cold).

  | World | Look | Only here | Condition | Special machine | Local power |
  |---|---|---|---|---|---|
  | Home (today's map) | as now | the full existing industry | normal gravity | – | as now |
  | Moon (first jump, small) | grey dust, craters, black sky, home planet on the horizon | helium crystals | low gravity + vacuum | Vacuum Furnace | solar, no coal |
  | Ice planet | white-blue, frozen seas, geysers | cryo-ice, rare gases | extreme cold | Cryo Plant | geyser steam |
  | Fire planet | black rock, lava rivers, red sky | volcanic glass, heavy metals | heat + radiation | Radiation Lab | (tbd) |

  World names, materials and machines are working titles. Each world's surface must look clearly different.
- **New worlds:** the first trip needs a **colony rocket** (the goal of tier 11). It carries a **small, tight starter kit** (contents to
  be decided while building it). You keep everything unlocked (tiers, belt speeds, machines, recipes); only materials are local. Each
  world adds local ores, a few local recipes and its special machine.
- **Going back and forth:** every world you've reached can be switched to at any time; worlds you aren't looking at keep producing in
  the background at their measured rates (keeps the tablet fast). Each world is its own map in the same save.
- **Orbital Freighters** (like Drone Pads, between worlds): a Launch Pad on each world; a route per pad ("Moon → Home: helium
  crystals"); real travel times (about a minute to the Moon, longer further out); large cargo; **need fuel from a fuel factory,
  enough for the trip there and back**, plus power at launch. Visible take-off, landing and traffic in the sky (3D).
- **Dyson Sphere:** a Sphere Launcher on home (very high power draw, where nuclear finally matters) fires sphere segments to the sun.
  Stages (frame → panels → collectors), each needing parts from more worlds; each finished stage beams power back. It has a clear
  end: a closed, glowing sphere in a space and sky view.
- **Worlds, built so far** (Session 49, step 2a): the save holds several worlds. The one you're on is the normal game state; the others
  are packed into `S.worlds` (their map seed/size, buildings, zones, camera and **own stock**). Unlocks, tiers and settings are shared.
  A world button in the top bar (shown once a second world exists) opens the Worlds panel; Travel shows a short travel screen and saves.
  **The Moon** (256×256, no coast ring): dark maria and bright highlands, craters (rock rim, dusty floor), no water, a flat landing site
  with a Base Core; iron (mostly maria), quartz and bauxite (highlands), some copper and uranium. Black sky with stars and Home in the
  sky in 3D, no clouds in 2D. **Solar Panel** (10 MW, 2×2, no fuel) works only on the Moon. The Moon is reached with the colony rocket
  (step 2b, below).
- **The colony rocket** (Session 51, step 2b; Session 57: **Tier 11 removed** with Markus, it meant a second huge factory right after
  Tier 10): the Orbital Beacon (Tier 10, still the "you win" moment) unlocks four rocket parts, the **Launch Pad** (6×6, Home only,
  150 MW while the rocket is ready), the **Solar Panel** and the Vacuum Furnace. The next goal is the launch itself. Parts, kept simple
  from things a Tier-10 factory already makes: **Hull Plate** (Assembler: Alloy Panels + Steel Beams), **Heat Shield** (Blender),
  **Guidance Core** (Fabricator: **1 Quantum Core + 1 Control Chip**, the Quantum Core is the heart of the ship), **Rocket Fuel** canisters
  (Blender: fuel + Aluminum Casing). The pad is filled by belt from any side or with *Load from stock*: rocket parts
  (30 Hull Plates, 15 Heat Shields, 2 Guidance Cores, 60 Rocket Fuel; about a tenth of Tier 10) plus the **starter kit** it carries (plates, rods, wire, cable,
  120 concrete, braced plates, rotors, alloy panels, circuit boards: enough for a few solar panels, drills, smelters, presses, belts and
  poles). The rocket visibly stacks up on the pad as parts arrive; **Launch** sends it up (about 10 s, flame and smoke, 2D and 3D).
  The first landing creates the Moon with the kit in its own stock and offers to travel there; every later launch delivers another kit
  (the only way to send things until Orbital Freighters). The Moon has no coal or limestone: solar power, concrete from home.
  Exact numbers in `ROCKET` (`js/data.js`). Buildings locked to one world only show in the build menu on that world.
- **Moon industry and background production** (Session 52, step 2c): the Moon has **Helium Crystals** nodes (only there, mostly on
  crater floors, one next to the landing site), mined by normal drills. The **Vacuum Furnace** (3×3, 20 MW, Moon only, built from
  things the Moon can make; unlocked with Tier 11) makes **Vacuum Wafers** (silica + helium) and **Lattice Crystals** (quartz crystals +
  helium). They have no use yet: they are parts for the later Dyson Sphere stages. **Worlds you aren't on keep producing:** each world
  measures what its factories deliver into its Base Core (last 5 minutes, needs at least 1 minute). When you leave, that rate is stored
  with the world; when you come back, the time away (game time, so the speed buttons count) is paid out into its stock, and the arrival
  message says what came in. The Worlds panel shows each world's background rates. Only Base Core deliveries count; buildings, belts
  and crates on the inactive world stay paused as they were.
- **Moon look** (Session 54; Session 54b: Markus switched to the all-white option, "real white, stronger grey"): on the Moon all buildings
  are painted white against the sun, in 2D and 3D. Shapes, details and textures stay; colours become pure white or clear greys by their
  brightness (bodies white, darker details grey, holes near-black). Home is unchanged. Belts, pipes, signs, lights and items keep their colours.
- **Blueprints** (Session 48; reworked 48b with Markus: designed in a station instead of copying from the factory, which was inaccurate):
  a **Blueprint Station** (12×12, needs power) is a design table. Both live in their own **Blueprints** tab (Session 48c): the station(s)
  (bigger sizes later) and the **Blueprint List** button, which opens the saved blueprints without needing a station. Building and belt tools used inside it place free
  **design pieces** that don't run and cost nothing; tap a piece to set its recipe, logic-splitter rules (one rule per side), valve limit
  and mode, or sign text, rotate or remove it; Dismantle inside the station removes pieces (the station itself is removed from its panel).
  Its panel saves the design under a name (same name = replace), loads a saved blueprint back in to change it, and starts **building one
  elsewhere** (also from the Blueprint List): the outline appears in the middle of the view (blocked tiles red); a tap moves it there,
  long-press inside it and drag slides it, and a bar offers **⟳ Rotate · ✓ Build here · ✕ Cancel**; nothing is built before Build here.
  It pays like normal placing and reports what's missing. Blueprints are stored per device, so they work on every map and world. Bigger stations (e.g. 18×18, 24×24) can come
  with later tiers.

- **Moon goals (Session 58, built).** The Moon's purpose: become self-sufficient in bulk, make what Earth can't (helium, vacuum
  wafers, lattice crystals), and send it home for the Dyson Sphere. The Goals panel shows the goals of the world you're on (a switch
  shows the other world's list; hand-ins happen on that world, from its own stock); the top bar shows "🌑 Goal N" there.
  1 **Foothold** (iron plates, copper sheets, wire) → Regolith Excavator (digs anywhere) + Sintered Blocks (Vacuum Furnace: regolith → concrete).
  2 **Ice Prospecting** (concrete, quartz crystals, vacuum wafers) → Ice Melter (sits on an ice deposit, makes water; Session 58f) + Moon
    Concrete (regolith + water).
  3 **Lunar Power** (lattice crystals, wafers, concrete) → Wafer Circuit Board (wafer + copper sheet) + Lunar Aluminum (bauxite + water):
    with Assemblers the Moon makes its own Alloy Panels, circuit boards and so Solar Panels.
  4 **Export Ready** (a stockpile of helium, wafers, lattice crystals) → Habitat, Lunar Steel, Regolith Oxygen, Water Splitting.
  **Moon Colony chapter (Session 60, agreed with Markus: the Moon was too easy, goods had no use on Earth):** colony goals ask for
  **steady rates** into the Base Core (averaged over the last 5 minutes, Session 61f) held for 3 minutes (dips to 85% of
  target don't reset the clock, Session 61h), and a **population**. **Habitats** (4×4) need power + water + oxygen through
  Pipe Junctions (2 m³/min each per colonist), gain a colonist every 20 s when supplied (max 10), lose one when short. Habitats that touch share water
  and oxygen (one junction of each feeds the whole block; Session 61d); each still needs power. With **Lunar Steel**
  the Moon makes motors, beams, girders and so its own Refineries and Fabricators (plastic stays Earth-only).
  5 **First Settlers** (10 colonists; 15 steel pipes/min, 30 concrete/min; Session 60c: pipes instead of raw ingots, they are useful for building). 6 **Self-Sufficient** (30 colonists; 6 motors/min, 15 steel beams/min,
  20 wafers/min) → **Orbital Freighters** (Session 60b) + Earth uses for Moon goods. Rovers may climb crater rims slowly.
- **Moon power (Session 60d, agreed with Markus):** **Solar Array** (4×4, 60 MW, no fuel, Moon materials; unlocked by Moon goal 4) and
  **Helium Fusion Reactor** (6×6, 1500 MW from 30 Helium Crystals/min + 120 m³/min water; Moon materials only, lattice crystals as its
  heart; unlocked by Moon goal 5). Helium thereby gets a use on the Moon itself.
- **Dyson Sphere stage 1, Sphere Frame (built, Session 62, agreed with Markus).** Sphere Frame Segments (Fabricator on Earth: 2 lattice
  crystals from the Moon + 2 hull plates + 4 heat sinks + 6 steel beams) are belted into a **Sphere Launcher** (8×8, Home only, 4000 MW
  while charging, one segment every 20 s). 300 segments complete the stage and unlock the **Sphere Receiver** (4×4, Home, 2500 MW, no
  fuel: power beamed back). Progress shows as a "☀ Dyson Sphere" card under the Home tiers and in the top bar; in 3D the sun hangs low
  in the north-west sky and a golden frame ring grows around it (both worlds). Stage 2 (Sphere Panels) will need ice-planet goods.
  Launcher and segment recipe are unlocked by Moon goal 6. Numbers in `DYSON`.
- **Orbital Freighters (built, Session 60b).** A **Freighter Port** (6×6, 40 MW while a freighter waits to launch) is needed on both worlds.
  Freighters (up to 3, built at Home's port: 20 Hull Plates, 1 Guidance Core, 40 Rocket Fuel) have a route with up to 3 cargo lines each
  way and work with the worlds' **item stocks** (not belts), so they keep flying while you are on the other world. Up to 2,000 items each
  way, 60 s per flight, 5 s docked at each end; each round trip burns 40 Rocket Fuel from Home's stock (the Home port needs power at launch).
  Take-off and landing are drawn at the port of the world you're on; the Worlds panel and port panels show each freighter's state.
  **Uses on Earth:** Cryo Fuel Rod (alt: 30 uranium cells + 10 helium + 3 girders, instead of 50 cells) and Lattice Quantum Core (alt:
  1 control chip + 2 compute modules + 2 lattice crystals). The Dyson Sphere stages (with a Sphere Frame from Moon goods) come later.
  Ice lies on dark crater floors at least 45 tiles from the landing site (own generator pass). Complex machines (Refinery, Fabricator…)
  still need steel/motors from Home: more rocket launches now, freighters later. Numbers in `WGOALS` (`js/data.js`).
- **Moon Rovers (Session 59, agreed with Markus).** A ground drone for the Moon: **Rover Depot** (3×3, 10 MW to recharge, holds 600, Moon only,
  unlocked by Moon goal 2) linked to another depot (like Drone Pads). Its rovers (1 included, up to 3, extra ones cost Moon materials) carry
  200 items per trip at about 6 tiles/s, slower in turns, along a path found around buildings, belts, pipes and track (Session 61c: crossed only where there is no
  other way; crater rims are climbed slowly); they pass through each other. No route → the panel says so and a red line shows the gap.
  **Tanker Depot** (Session 59b): the fluid version (holds 1200 m³ of one fluid): a linked one fills from a pipe through a Pipe Junction, its
  tanker rovers carry 400 m³ per trip, an unlinked one feeds what arrives into its pipes; it won't deliver into a depot holding another fluid. Tyre tracks fade in the dust over 2
  minutes; dust puffs; slight bounce in 3D. Unlinked depots pass goods on to belts. Numbers in `ROVER` (`js/data.js`).
- **Moon water and concrete (agreed with Markus, Session 55; built in Session 58 as the Moon goals above).** Shipping heavy bulk (concrete, water) by rocket makes
  no sense, so the Moon makes its own base materials; freighters carry what the Moon truly can't make (plastic, circuit boards, rocket
  fuel, maybe hydrogen) and bring precious Moon goods home (helium, wafers, lattice crystals): trade, not a concrete delivery service.
  - **Ice in dark craters:** a few rare Ice deposits on dark crater floors, far from the landing site, mined by drills; an Ice Melter (or a
    Smelter recipe) makes water. Reaching ice is a reason to expand (later: trains from the far craters).
  - **Regolith:** a Regolith Excavator digs anywhere (no node needed).
  - **Sintered blocks (no water):** Vacuum Furnace, regolith → blocks that count as concrete; about 2× Earth's effort (power). Works from day one.
  - **Moon concrete ("lunarcrete"):** regolith + water → concrete, cheaper on power once water flows.
  - Water also makes alumina → aluminium → Solar Panels possible on the Moon (fixes the power bottleneck). **Oil/plastic stays Earth-only**
    for good, so worlds keep trading and travel keeps its point.
  - Optional later: ilmenite reduction (iron ore + hydrogen from Earth → water + iron) in the Vacuum Furnace.

## 13. Trains (agreed with Markus, Session 55; Phase 1 built in Session 56)
A train is a big drone on rails: large, steady flows over long distances inside one world. Belts = short, drones = medium (40 per trip),
**trains = long distance, about 1,000 items per wagon**, freighters = between worlds.
- **Tracks are one-way** (arrow, like belts), drawn by dragging; a turn becomes a smooth curve. Lines are loops, or two parallel tracks
  for there and back. That rules out head-on blockages, so **no signals** are needed. Any track tile can be joined from the side (merge);
  a **Rail Switch** has a main line plus one short branch at its side, in four kinds (Rotate cycles): split off right, split off left,
  join from right, join from left (Session 56c/e). It lines up with the track by itself.
- **Trains pick their own way** to their next stop over switches (shortest path), and **reserve the track ahead**: a train brakes behind
  another one and waits; several trains share a network automatically.
- **Train Stop** (a track piece with a name; several stops may share a name, the nearest is used). The locomotive halts on the stop tile;
  its wagons line up behind it. **Cargo Bays** (2×2) beside the track behind the stop load or unload the wagon next to them (mode
  Load: belts fill the bay, the bay fills the wagon; Unload: the wagon empties into the bay, belts carry it away).
- **Trains** = a locomotive and 1–4 cargo wagons, built from a Train Stop's panel (paid from stock, appears on the track behind the stop).
  Schedule: a list of stops, each with a condition (until full, until empty, wait N seconds); the default is a shuttle "load here until
  full → unload at the other stop until empty". A new train starts **paused** (its panel opens): set the schedule, then ▶ Start; Pause stops it at
  the next moment (Session 56f). Tap a train for its cargo, status and schedule; it can be removed (refunded).
- **Power: electric on both worlds.** A power pole whose supply area touches any tile of a track network powers that whole network; a
  moving train draws about 15 MW from that grid, a waiting one nothing. Without power trains crawl slowly instead of stopping dead.
- **Look:** Earth: rails on a concrete bed, boxy locomotive and wagons. Moon: a single raised white guideway beam (maglev style) and
  rounded white capsules, built from materials the Moon can make (no concrete). Same mechanics on both worlds.
- **Unlock:** Tier 6 (Petrochemistry); saves past Tier 6 get it on load.
- **Phases:** 1 = tracks, curves, switches, merges, stops, Cargo Bays, trains with schedules, power, 2D/3D, Earth/Moon look.
  2 = Rail Underpass (belts/pipes under a track), Rail Crossing (track over track), fluid wagons, trains in blueprints.
  Later maybe: two-way track with signals.

## 14. Balance rulebook (agreed with Markus, Session 55)
Balance as we go, against these rules, measured with the planner/playtest tool; Markus's playtesting is the final judge.
1. **Base materials stay simple on every world:** one input, one machine, one step (concrete, plates, ingots, wire).
2. **Complexity grows slowly:** parts 2 inputs, components 3, top parts at most 4; chains get about one step deeper every two tiers.
3. **Each tier brings a little:** about 3–6 new parts, one new machine or mechanic, at most one new raw material. The goal mostly asks for
   the newest parts plus one bulk item from earlier, and should mean **building something new**, not waiting for more of the same.
4. **Cost grows steadily:** a tier's goal costs roughly 2× the previous one in raw ore (not 10×). Measured Session 55: 300 · 1.6k · 1.6k ·
   4.2k · 7.2k · 15.7k · 8.3k · 8.3k · 14.5k · 110k (Quantum Cores; Markus enjoyed that line, it stays). Tier 11 removed in Session 57:
   right after a big tier the next goal should be small (the rocket is about a tenth of Tier 10).
5. **Pacing target:** about 10 min for Tier 1, 45 min for Tier 5, 2 h for Tier 10 with a sensible factory.
6. **No annoying recipes:** no tiny amounts from long far chains, no huge grinds of one item, no by-product without a use.
7. **Alternative recipes are trade-offs** (fewer machines but more power, or a local resource), never strictly better.
8. **New worlds:** the same base material may get a local recipe of at most about 2× Earth's effort (one extra input or more power, never a
   whole new chain). Each world: one raw material found only there, 2–3 local recipes, one special machine; exports are valuable per
   kilo. Some things stay Earth-only (oil/plastic) so worlds trade.
9. **Power:** the Fission Reactor makes power plentiful after Tier 9 (Markus had 50 GW spare). Don't weaken it; give later machines and the
   Dyson Sphere large power demands on purpose.
10. **Dyson Sphere stages** need special parts from several worlds, fixed amounts, a clear end. No endless scaling.

## 15. Where to start next (kept up to date)
- **Trains Phase 1 is built (Session 56).** Markus should try it on his phone first: track loop, two stops, Cargo Bays, a train.
- **Moon goals are built (Session 58).** Markus plays them on the Moon.
- **Moon Colony and Orbital Freighters are built (Sessions 60, 60b).**
- **Dyson Sphere stage 1 is built (Session 62).**
- **Next:** the ice planet (new colony rocket, cryo-ice, rare gases, Cryo Plant), whose goods Sphere stage 2 (panels) will need; freighter
  visuals in 3D; balance after Markus plays the colony and sphere. Then trains Phase 2 (Rail Underpass/Crossing, fluid wagons, trains in
  blueprints). Then the all-tier measuring tool, also checking the Moon goals. Then the all-tier measuring tool for the rulebook (section 14) and Tier 7/8 goal tweaks for new games.

## 11. Explicitly out of scope (for now)
Other vehicles beyond Cargo Drones, trains (section 13) and the planned Orbital Freighters (section 12), combat/creatures, multiplayer, accounts or cloud saves, sound.
These can be reconsidered; record the decision here if that happens.
