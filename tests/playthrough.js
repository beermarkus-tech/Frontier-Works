// Play-through check for tiers 1–5 (and a dead-end audit for all 10): node tests/playthrough.js  → writes docs/PLAYTEST.md
// 1. Dead-end audit: per tier, can every unlocked building be built from things you can already make (or hand-craft)?
//    Can every goal item be produced?
// 2. Bench test: every recipe unlocked by tier 5 is built in the real sim with belts/pipes, supply, sinks and power, run for
//    70 s, and its measured output is compared with the recipe's rate. Every drill tier is tested on a real node too.
// 3. Pacing: raw materials each tier needs, how long the start area's nodes take to supply them, and the factory size for ~15 min.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const server = require('./serve.js');
const SEED = +process.argv[2] || 20261110;
(async () => {
 await new Promise(r => server.listen(8098, r));
 const b = await chromium.launch(); const p = await b.newPage();
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('http://localhost:8098/'); await p.waitForTimeout(1500);
 const R = await p.evaluate((SEED) => {
  ACT.closePanel(); newGame(SEED);
  const fw = window.__fw, P = (...a) => fw.placeEnt(...a, true);
  const unlocks = t => { const b = new Set(START_B), r = new Set(START_R); for (let i = 0; i < t; i++) { MS[i].b.forEach(x => b.add(x)); MS[i].r.forEach(x => r.add(x)); } return { b, r }; };
  const HAND = ['smelter', 'press', 'assembler'], ORES = Object.keys(NODE_T).filter(k => k !== 'oil').map(k => NODE_T[k][0]);
  /* ---------- 1. dead-end audit ---------- */
  const runAudit = HAND => { const audit = [];
  for (let t = 0; t <= MS.length - 1; t++) {
   const { b: ub, r: ur } = unlocks(t), built = new Set(['core']), boot = new Set(Object.keys(START_INV));
   let prod = new Set(), changed = true;
   while (changed) {
    changed = false;
    const p2 = new Set(ORES);                        // hand mining always gives ore
    if (built.has('opump')) p2.add('crude'); if (built.has('wpump')) p2.add('water');
    let grow = true;
    while (grow) { grow = false;
     for (const id of ur) { const r = RC[id]; const fluid = [...Object.keys(r.i), ...Object.keys(r.o)].some(k => IT[k].f);
      if (!(built.has(r.m) || HAND.includes(r.m) && !fluid)) continue; if (fluid && !built.has('pipe1')) continue;
      if (Object.keys(r.i).every(k => p2.has(k))) for (const k in r.o) if (!p2.has(k)) { p2.add(k); grow = true; } } }
    prod = p2;
    for (const id of ub) if (!built.has(id) && Object.keys(B[id].cost).every(k => prod.has(k) || boot.has(k))) { built.add(id); changed = true; }
   }
   const stuck = [...ub].filter(id => !built.has(id)).map(id => ({ id: B[id].n, missing: Object.keys(B[id].cost).filter(k => !prod.has(k) && !boot.has(k)).map(k => IT[k].n) }));
   const goal = MS[t], missingGoal = Object.keys(goal.req).filter(k => !prod.has(k)).map(k => IT[k].n);
   audit.push({ tier: t + 1, name: goal.n, stuck, missingGoal });
  } return audit; };
  const audit = runAudit(HAND), selfTest = runAudit(['smelter', 'press']).filter(a => a.stuck.length).map(a => `tier ${a.tier}: ${a.stuck.map(s => s.id).join(', ')}`);
  /* ---------- 2. bench tests in the real sim ---------- */
  const clear = () => { for (const e of [...ents.values()]) if (e.k !== 'core') removeEnt(e, false, true); for (let i = 0; i < 3; i++) tick(0.05); };
  let X, Y;
  for (let r = 14; r < 170 && X == null; r += 2) for (let a = 0; a < 48; a++) { const x = Math.round(MW / 2 + r * Math.cos(a / 7.6)), y = Math.round(MH / 2 + r * Math.sin(a / 7.6)); let ok = true;
   for (let j = -6; j < 12 && ok; j++) for (let i = -7; i < 12 && ok; i++) if (canPlace('incin', x + i, y + j) || nodeAt[(y + j) * MW + x + i]) ok = false; if (ok) { X = x; Y = y; break; } }
  const { r: ur5, b: ub5 } = unlocks(5);
  S.ub = Object.keys(B); S.ur = Object.keys(RC); S.oc = true;
  const benches = [];
  for (const id of [...ur5]) {
   const r = RC[id], m = B[r.m], w = m.w, ins = Object.keys(r.i), outs = Object.keys(r.o);
   if (!ub5.has(r.m)) { benches.push({ id, n: r.n, m: m.n, skip: 'machine not unlocked by tier 5' }); continue; }
   clear(); const res = [];
   res.push(P(r.m, X, Y, 0)); const e = fw.entAt(X, Y); e.r = id;
   // inputs: west side rows 0,2 then north side columns 0,2 (storage crate or tank → belt/pipe into the machine)
   const slots = [['w', 0], ['n', 0], ['w', 2], ['n', 2]].filter(([s, o]) => o < w || (o === 0));
   const feeders = [];
   ins.forEach((k, i) => { const [side, o] = slots[i], fl = IT[k].f, line = fl ? 'pipe2' : 'belt5', src = fl ? 'tank' : 'storage';
    if (side === 'w') { res.push(P(src, X - 4, Y + o, 0), P(line, X - 2, Y + o, 0), P(line, X - 1, Y + o, 0)); feeders.push([fw.entAt(X - 4, Y + o), k]); }
    else { res.push(P(src, X + o, Y - 4, 0), P(line, X + o, Y - 2, 1), P(line, X + o, Y - 1, 1)); feeders.push([fw.entAt(X + o, Y - 4), k]); } });
   // outputs: east side, one row per output, into incinerators (2×2, one per two rows)
   outs.forEach((k, j) => { const line = IT[k].f ? 'pipe2' : 'belt5'; res.push(P(line, X + w, Y + j, 0)); if (j % 2 === 0) res.push(P('incin', X + w + 1, Y + j, 0)); });   // a 2×2 incinerator takes two rows
   // power: burners south of the machine (also act as poles)
   const nb = Math.ceil(m.pw * 1.2 / 30), gens = [];
   for (let g = 0; g < nb; g++) { res.push(P('burner', X - 2 + g * 2, Y + w + 1, 0)); gens.push(fw.entAt(X - 2 + g * 2, Y + w + 1)); }
   const refill = () => { for (const [f, k] of feeders) { if (f.k === 'tank') { f.ft = k; f.amt = B.tank.cap; } else f.store = { [k]: 1500 }; } for (const g of gens) if (g) g.fuel.coal = 50; };
   if (res.some(x => x)) { benches.push({ id, n: r.n, m: m.n, skip: 'placement failed: ' + res.filter(x => x).join(', ') }); continue; }
   const WARM = 40, MEAS = 240, tot = {};   // seconds: warm-up, then measure (long enough for slow batch recipes)
   stat.hist = []; stat.p = {}; stat.c = {};
   for (let s = 0; s < WARM + MEAS; s++) { refill(); for (let k = 0; k < 20; k++) tick(0.05); if (s >= WARM) { const h = stat.hist[stat.hist.length - 1]; if (h) for (const k in h.p) tot[k] = (tot[k] || 0) + h.p[k]; } }
   const out = {}; let ok = true;
   for (const k of outs) { const exp = r.o[k] * 60 / r.t, have = (tot[k] || 0) / (MEAS / 60); out[k] = [Math.round(have * 10) / 10, Math.round(exp * 10) / 10]; if (Math.abs(have - exp) > exp * 0.06 + r.o[k] * 60 / MEAS) ok = false; }
   benches.push({ id, n: r.n, m: m.n, ok, out, eff: Math.round((e._ef || 0) * 100), why: Object.keys(e._efw || {}).sort((a, b) => e._efw[b] - e._efw[a])[0] || '' });
  }
  const tierOf = id => START_R.includes(id) ? 0 : MS.findIndex(m => m.r.includes(id)) + 1;
  const beltAt = t => { const { b } = unlocks(t); return ['belt5', 'belt4', 'belt3', 'belt2', 'belt1'].find(x => b.has(x)); };
  const beltWarn = [];
  for (const id of [...ur5]) { const r = RC[id], t = tierOf(id), bl = beltAt(t), cap = B[bl].spd * 60;
   for (const k in r.i) { const rate = r.i[k] * 60 / r.t; if (!IT[k].f && rate > cap) beltWarn.push(`${r.n}: ${Math.round(rate)} ${IT[k].n}/min per machine, but the best belt at tier ${t} (${B[bl].n}) carries ${cap}/min`); }
   for (const k in r.o) { const rate = r.o[k] * 60 / r.t; if (!IT[k].f && rate > cap) beltWarn.push(`${r.n}: makes ${Math.round(rate)} ${IT[k].n}/min, more than ${B[bl].n} (${cap}/min)`); } }
  // drills on real nodes (impure/normal/pure as found) into a fast belt and an incinerator
  const drills = [];
  for (const d of ['drill1', 'drill2', 'drill3']) for (const pu of [0, 1, 2]) {
   const n = nodes.find(n => n.t === 'iron' && n.p === pu && !grid[n.y * MW + n.x] && [0, 1].every(j => [0, 1, 2, 3, 4, 5].every(i => !canPlace('incin', n.x + i, n.y + j) || (i < 2 && j < 2))));
   if (!n) { drills.push({ d, pu, skip: 'no free node' }); continue; }
   clear(); const res = [P(d, n.x, n.y, 0), P('belt5', n.x + 2, n.y, 0), P('incin', n.x + 3, n.y, 0), P('burner', n.x + 5, n.y, 0)];
   const g = fw.entAt(n.x + 5, n.y); if (res.some(x => x)) { drills.push({ d, pu, skip: res.join(',') }); continue; }
   stat.hist = []; stat.p = {}; stat.c = {}; for (let s = 0; s < 70; s++) { g.fuel.coal = 50; for (let k = 0; k < 20; k++) tick(0.05); }
   drills.push({ d, pu, have: Math.round((rates().p.iron_ore || 0) * 10) / 10, exp: B[d].rate * PUR[pu][0] * 60 });
  }
  clear();
  /* ---------- 3. pacing (tiers 1–5) ---------- */
  const pacing = [];
  for (let t = 0; t < 5; t++) {
   const { b: ub, r: ur } = unlocks(t); S.ub = [...ub]; S.ur = [...ur]; PL.locked = false;
   const raw = {}, mach = {}, req = MS[t].req, steps = {};
   for (const k in req) { const o = plRev(k, req[k], {}); for (const x in o.raw) raw[x] = (raw[x] || 0) + o.raw[x]; for (const row of o.rows) { const key = row.item; steps[key] = steps[key] || { n: 0, m: row.r.m, item: row.item }; steps[key].n += row.n; } const o15 = plRev(k, req[k] / 15, {}); for (const mm in o15.mach) mach[mm] = (mach[mm] || 0) + o15.mach[mm]; }
   const drill = ['drill3', 'drill2', 'drill1'].find(d => ub.has(d)), belt = ['belt5', 'belt4', 'belt3', 'belt2', 'belt1'].find(x => ub.has(x)), cap = B[belt].spd * 60, rad = t < 3 ? 30 : 50;
   const supply = {}, count = {};
   for (const n of nodes) { if (Math.hypot(n.x - MW / 2, n.y - MH / 2) > rad || n.t === 'oil') continue; const it = NODE_T[n.t][0]; supply[it] = (supply[it] || 0) + Math.min(B[drill].rate * PUR[n.p][0] * 60, cap); count[it] = (count[it] || 0) + 1; }
   const per = Object.keys(raw).map(k => ({ k: IT[k].n, need: Math.round(raw[k]), nodes: count[k] || 0, supply: Math.round(supply[k] || 0), min: supply[k] ? raw[k] / supply[k] : Infinity }));
   pacing.push({ tier: t + 1, name: MS[t].n, req: Object.keys(req).map(k => `${req[k]} ${IT[k].n}`).join(', '), drill: B[drill].n, belt: B[belt].n, rad, per, minutes: Math.max(...per.map(x => x.min)), slow: Object.values(steps).sort((a, b) => b.n - a.n)[0], mach: Object.keys(mach).map(k => `${mach[k]} × ${B[k].n}`).join(', ') });
  }
  return { seed: SEED, MW, audit, selfTest, benches, beltWarn, drills, pacing: pacing.map(t => Object.assign(t, { slow: t.slow && { min: Math.round(t.slow.n * 10) / 10, what: `${IT[t.slow.item].n} (${B[t.slow.m].n})` } })) };
 }, SEED);
 // ---------- report ----------
 const L = [];
 L.push(`# Play-through report (tiers 1–5)`, ``, `Generated by \`node tests/playthrough.js ${R.seed}\` on a ${R.MW}×${R.MW} map (seed ${R.seed}). Re-run after balance changes.`, ``);
 L.push(`## 1. Dead-end audit (all tiers)`, ``, `A building counts as buildable if its cost items can be made with already-buildable machines, hand crafting (Smelter/Press/Assembler recipes) or the start stock.`, ``, `| Tier | Goal | Buildings that can't be built | Goal items that can't be made |`, `|---|---|---|---|`);
 for (const a of R.audit) L.push(`| ${a.tier} | ${a.name} | ${a.stuck.length ? a.stuck.map(s => `${s.id} (needs ${s.missing.join(', ')})`).join('; ') : '✓ none'} | ${a.missingGoal.length ? a.missingGoal.join(', ') : '✓ none'} |`);
 L.push(``, `Self-test: with the old rule (hand crafting only Smelter/Press) the audit reports: ${R.selfTest.join('; ') || 'nothing'}. That's the dead end fixed in Build 20, so the audit does catch this kind of problem.`);
 L.push(``, `## 2. Every recipe up to tier 5 in the real simulation`, ``, `Each recipe was built with real belts/pipes (Mk5 belts / Mk2 pipes, so supply isn't the limit) from supply crates/tanks, outputs into incinerators, and coal burners for power: 40 s warm-up, then 4 minutes measured.`, ``, `| Recipe | Machine | Output measured / expected per min | Working | Result |`, `|---|---|---|---|---|`);
 for (const x of R.benches) L.push(x.skip ? `| ${x.n} | ${x.m} | — | — | ⚠ ${x.skip} |` : `| ${x.n} | ${x.m} | ${Object.keys(x.out).map(k => `${x.out[k][0]} / ${x.out[k][1]}`).join(' · ')} | ${x.eff}%${x.eff < 90 && x.why ? ` (${x.why})` : ''} | ${x.ok ? '✓' : '✗ CHECK'} |`);
 L.push(``, `**Belt limits:** ${R.beltWarn.length ? R.beltWarn.map(x => '\n- ' + x).join('') + '\n\n(Not a dead end: feed the machine from two sides, or wait for the next belt tier. Worth knowing when planning.)' : 'every recipe fits on the best belt available when it unlocks.'}`);
 L.push(``, `**Drills on real iron nodes** (output into a Mk5 belt):`, ``, `| Drill | Node | Measured / expected per min |`, `|---|---|---|`);
 for (const d of R.drills) L.push(`| ${d.d} | ${['impure', 'normal', 'pure'][d.pu]} | ${d.skip ? '⚠ ' + d.skip : `${d.have} / ${d.exp}`} |`);
 L.push(``, `## 3. Pacing`, ``, `Raw materials each goal needs in total, and how long the nodes near the start would take to supply them if every node there had a drill (best drill and belt available at that tier; nodes within the radius shown). Building costs come on top. The last column is the factory needed to finish the goal in about 15 minutes.`, ``);
 for (const t of R.pacing) {
  L.push(`### Tier ${t.tier}: ${t.name}`, ``, `Goal: ${t.req}  ·  ${t.drill}, ${t.belt}, nodes within ${t.rad} tiles`, ``, `| Raw | Total needed | Nodes | Supply/min | Minutes |`, `|---|---|---|---|---|`);
  for (const r of t.per) L.push(`| ${r.k} | ${r.need} | ${r.nodes} | ${r.supply} | ${isFinite(r.min) ? r.min.toFixed(1) : '∞ (no nodes in range)'} |`);
  L.push(``, `Bottleneck: **${isFinite(t.minutes) ? t.minutes.toFixed(1) + ' min' : 'not reachable from start-area nodes'}** at full use of those nodes. Smallest factory (one machine per step): **${t.slow ? t.slow.min + ' min' : '—'}**, slowest step ${t.slow ? t.slow.what : '—'}. Factory for ~15 min: ${t.mach}.`, ``);
 }
 if (errs.length) L.push(``, `Page errors: ${errs.join(' | ')}`);
 fs.writeFileSync(path.join(__dirname, '..', 'docs', 'PLAYTEST.md'), L.join('\n') + '\n');
 console.log(JSON.stringify({ audit: R.audit.filter(a => a.stuck.length || a.missingGoal.length), fails: R.benches.filter(x => x.skip || !x.ok), drills: R.drills, minutes: R.pacing.map(t => [t.tier, +t.minutes.toFixed(1), t.slow && t.slow.min]), selfTest: R.selfTest, beltWarn: R.beltWarn, errs }, null, 1));
 await b.close(); server.close();
})();
