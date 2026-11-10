# Frontier Works

A 2D factory-building game for the browser, installable as an app (PWA) on phone and desktop.
Mine ore, smelt and assemble parts, belt them around, run a power grid, and climb 10 tiers of tech
until you launch the **Orbital Beacon**.

**Play:** https://beermarkus-tech.github.io/Frontier-Works/

## Install as an app
- **Android / Chrome / Edge:** open the link → ☰ Menu → *Install app* (or the browser's “Install” prompt).
- **iPhone / iPad:** open the link in Safari → Share → *Add to Home Screen*.

Once installed it runs fullscreen and works offline. Saves live in the browser (☰ Menu → Export/Import to move them).

## Features
- 10 raw resources on a procedurally generated 128×128 map (impure / normal / pure nodes)
- 56 items (6 fluids), 56 recipes incl. 10 alternates, 7 production machines
- Conveyors Mk1–5, pipelines, splitters, mergers, sorting splitters, crossings, storage, tanks
- Power grid with poles, fuses, and four generator types up to a fission reactor
- Production planner (☰ Menu): plan a line from a node, or work backwards from a target rate
- 2D map or full 3D view with zoom, rotate and tilt (button on the right, or V)
- Overclocking, production stats, recipe codex, 1×/2×/4× speed, autosave

## Controls
| | Touch | Mouse / keyboard |
|---|---|---|
| Pan | drag | right-drag, WASD / arrows |
| Zoom | pinch | scroll wheel |
| Place | pick a building, tap | click |
| Lay belts / pipes | drag | drag |
| Rotate | ↻ button | R |
| Dismantle | 🗑 button | X |
| Copy building under cursor | — | Q |
| Center on Base Core | ⌖ button | H |
| 2D / 3D view | 3D/2D button | V |
| Rotate / tilt (3D) | twist / two-finger slide up-down | right-drag, Ctrl+wheel, E/Z |

## Project layout
```
index.html            markup + script tags (classic scripts, shared global scope, load order matters)
css/style.css         all styles (self-hosted Inter + Rajdhani fonts in fonts/)
js/data.js            items, recipes, buildings, milestones (game balance lives here)
js/sim.js             state, map generation, entities, item transfer, topology, simulation tick
js/render.js          terrain bake, building/item sprites, belts & pipes, particles, main render
js/ui.js              toolbar, panels, actions
js/plan.js            production planner (maths only, own localStorage key)
js/view3d.js          optional 3D view (Three.js), same world and input actions as 2D
js/lib/three.min.js   Three.js r149 (MIT, see js/lib/THREE-LICENSE.txt)
js/input.js           pointer/touch/keyboard input, camera, minimap
js/pwa.js             service-worker registration, update prompt, install button
js/main.js            save/load, main loop, boot
sw.js                 offline cache (bump VERSION on every release)
manifest.webmanifest  PWA manifest; icons/ has the app icons
tests/                local server + Playwright smoke test
docs/DESIGN.md        what the game is (living design, agreed decisions only)
docs/BUILD_LOG.md     append-only log of sessions: built, decided, next up
```

## Develop
No build step. Serve the folder and open it:
```
node tests/serve.js 8080      # http://localhost:8080
npm install && npm test       # Playwright smoke test (sim, goals, service worker, offline)
```

Fonts: Inter and Rajdhani, SIL Open Font License (see `fonts/`).
