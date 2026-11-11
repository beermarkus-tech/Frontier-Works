// Smoke test: node tests/smoke.js  (needs playwright + a Chrome/Chromium; set CHROME=/path if not auto-found)
const { chromium } = require('playwright');
const server=require('./serve.js');
(async()=>{
 await new Promise(r=>server.listen(8099,r));
 const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
 const ctx=await b.newContext({viewport:{width:1280,height:800}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('http://localhost:8099/');await p.waitForTimeout(1500);
 const ok=[];const check=(name,cond)=>{ok.push([name,!!cond]);};
 // build iron line + coal power
 const r=await p.evaluate(()=>{const fw=window.__fw,S=fw.S;fw.ACT.closePanel();for(const k of ['iron_plate','concrete','cable','wire','iron_rod'])S.inv[k]=999;
  const n=fw.nodes(),iron=n.find(x=>x.t==='iron'&&x.p===2),coal=n.find(x=>x.t==='coal'&&x.p===1),P=(...a)=>fw.placeEnt(...a);
  const res=[P('drill1',iron.x,iron.y,0),P('belt1',iron.x+2,iron.y,0),P('belt1',iron.x+3,iron.y,0),P('smelter',iron.x+4,iron.y,0)];fw.entAt(iron.x+4,iron.y).r='r_iron_ingot';
  res.push(P('belt1',iron.x+6,iron.y+1,0),P('drill1',coal.x,coal.y,0),P('belt1',coal.x-1,coal.y,2),P('burner',coal.x-3,coal.y,0));fw.entAt(coal.x-3,coal.y).fuel.coal=10;
  res.push(P('pole1',MW/2-7,MH/2-7,0),P('pole1',MW/2-7,MH/2,0));const before=S.inv.iron_ingot||0;for(let i=0;i<20*120;i++)fw.tick(0.05);return{res,ingots:(S.inv.iron_ingot||0)-before};});
 check('placements',r.res.every(x=>x===''));check('ingots delivered ('+r.ingots+')',r.ingots>40);
 await p.click('#msBtn');await p.waitForTimeout(300);check('goals list renders',(await p.$$('#pbody .card')).length===10);
 // build number: shown in the Menu header and matching the service-worker version
 await p.evaluate(()=>ACT.openMenu());await p.waitForTimeout(150);
 const bn=await p.evaluate(()=>({b:BUILD,txt:document.getElementById('pbuild').textContent}));
 const swv=require('fs').readFileSync(require('path').join(__dirname,'..','sw.js'),'utf8').match(/VERSION = '([^']+)'/)[1];
 check(`build number ${bn.b} in Menu header and sw.js (${swv})`,bn.txt==='Build '+bn.b&&swv==='fw-build-'+bn.b);
 const rl=await p.evaluate(()=>{const b=document.getElementById('preload');return !!b&&b.style.display!=='none'&&typeof ACT.forceReload==='function';});
 await Promise.all([p.waitForEvent('load',{timeout:15000}),p.click('#preload')]);await p.waitForTimeout(1200);
 check('↻ reload button in Menu reloads the game (save kept)',rl&&await p.evaluate(()=>!!window.__fw&&window.__fw.ents().size>5));
 await p.evaluate(()=>ACT.closePanel());
 // big biome map + old saves
 const bm=await p.evaluate(()=>{const bc=BIOMES.map(()=>0);for(let i=0;i<MW*MH;i++)bc[bio[i]]++;const types=new Set(nodes.map(n=>n.t));
  const ur=nodes.filter(n=>n.t==='uranium'),urHot=ur.filter(n=>['frostmark','emberfield'].includes(biomeAt(n.x,n.y).id)).length;
  const c=getChunk(5,5,true);return{MW,gen:S.gen,bc,types:types.size,ur:ur.length,urHot,chunk:c&&c.width,cpx:CH*TPX,startBio:biomeAt(MW/2,MH/2).id};});
 check(`new map is ${bm.MW}×${bm.MW} with all 7 biomes (${bm.bc})`,bm.MW===384&&bm.gen===2&&bm.bc.every(v=>v>2000)&&bm.startBio==='greenvale');
 check(`every resource exists; uranium mostly in Frostmark/Emberfield (${bm.urHot}/${bm.ur})`,bm.types===9&&bm.urHot/bm.ur>0.6);
 check('terrain chunk paints ('+bm.chunk+'px)',bm.chunk===bm.cpx);
 const sv=await p.evaluate(()=>{const s0=serialize(),n0=nodes.length,e0=ents.size;load(s0);const same=nodes.length===n0&&ents.size===e0&&MW===384;
  // an old save: no gen/mw fields → must come back as the classic 128 map with the same layout as before
  const o=JSON.parse(s0);delete o.S.gen;delete o.S.mw;o.S.seed=777;o.v=1;o.es=[{d:'core',x:62,y:62,dir:0}];   // v1 format: base64 JSON, entity objects
  load(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));const old={MW,n:nodes.length,core:[...ents.values()][0].x,iron:nodes[0].x+','+nodes[0].y,bios:new Set(bio).size};
  load(s0);return{same,old,back:MW};});
 check(`save/load keeps the big map; old saves load as 128 classic (${JSON.stringify(sv.old)})`,sv.same&&sv.old.MW===128&&sv.old.core===62&&sv.old.iron==='55,61'&&sv.old.bios===1&&sv.back===384);
 // recipe codex: generator fuel use; top-bar planner button
 await p.evaluate(()=>ACT.openCodex());await p.waitForTimeout(150);
 const cx=await p.evaluate(()=>document.getElementById('pbody').innerText);
 check('codex shows generator fuel use (burner 12 coal/min, steam 45 water/min, reactor 0.2 rods/min)',/Coal Burner[\s\S]*?Coal\s*12\/min/.test(cx)&&/Steam Generator[\s\S]*?Water\s*45\/min/.test(cx)&&/Fission Reactor[\s\S]*?Fuel Rod\s*0\.2\/min/.test(cx));
 await p.click('#planBtn');await p.waitForTimeout(150);
 check('top-bar Planner button opens the planner',await p.evaluate(()=>UI.panel&&UI.panel.kind==='plan'));
 await p.evaluate(()=>ACT.closePanel());
 // splitter feeds machines directly; machine pushes straight into a merger (no belts in between)
 const sm=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);let X,Y;
  for(let r=20;r<150&&X==null;r+=3)for(let a=0;a<40;a++){const x=Math.round(MW/2+r*Math.cos(a)),y=Math.round(MH/2+r*Math.sin(a));let ok=true;for(let j=-4;j<8&&ok;j++)for(let i=-2;i<14&&ok;i++)if(canPlace('incin',x+i,y+j))ok=false;if(ok){X=x;Y=y;break;}}
  const r=[P('storage',X,Y,0),P('belt1',X+2,Y,0),P('splitter',X+3,Y,0),P('smelter',X+4,Y,0),P('smelter',X+3,Y-2,0),P('merger',X+6,Y,0),P('belt1',X+7,Y,0),P('storage',X+8,Y,0),P('burner',X+3,Y+2,0)];
  fw.entAt(X,Y).store={iron_ore:400};fw.entAt(X+4,Y).r='r_iron_ingot';fw.entAt(X+3,Y-2).r='r_iron_ingot';fw.entAt(X+3,Y+2).fuel.coal=50;
  for(let i=0;i<20*60;i++)fw.tick(0.05);const out=fw.entAt(X+8,Y).store.iron_ingot||0,side=fw.entAt(X+3,Y-2).outb.iron_ingot||0;
  const eA=fw.entAt(X+4,Y),eB=fw.entAt(X+3,Y-2);ACT.closePanel();openPanel('ent',eB.id);const txt=document.getElementById('pbody').innerText,chip=document.getElementById('pbuild').textContent;ACT.closePanel();
  window.__eff={a:eA._ef,b:eB._ef,bw:Object.keys(eB._efw).sort((x,y)=>eB._efw[y]-eB._efw[x])[0],txt:/Working\s*\d+%/.test(txt)&&/Output full/.test(txt)&&chip===Math.round(eB._ef*100)+'%'};
  for(const x of [X,X+2,X+3,X+4,X+6,X+7,X+8])removeEnt(fw.entAt(x,Y),false,true);removeEnt(fw.entAt(X+3,Y-2),false,true);removeEnt(fw.entAt(X+3,Y+2),false,true);
  return{ok:r.every(x=>x===''),out,side};});
 const ef=await p.evaluate(()=>window.__eff);
 check(`efficiency: fed smelter ${Math.round(ef.a*100)}%, blocked one ${Math.round(ef.b*100)}% (${ef.bw}); shown in its panel`,ef.a>0.8&&ef.b<0.4&&ef.bw==='out'&&ef.txt);
 check(`splitter feeds touching smelters; smelter → touching merger → belt (${sm.out} ingots delivered, side smelter made ${sm.side})`,sm.ok&&sm.out>20&&sm.side>5);
 // "Plan this node": node panel → planner set to that node with a first step
 const pn=await p.evaluate(()=>{const n=nodes.find(x=>x.t==='copper'&&!grid[x.y*MW+x.x]);openPanel('node',n);const btn=!!document.querySelector('#pbody [data-act="planNode"]');ACT.planNode();
  const r={btn,kind:UI.panel.kind,res:PL.fwd.res,p:PL.fwd.p===n.p,steps:PL.fwd.steps.map(s=>s.r).join(),big:(document.querySelector('#pbody .plbig')||{}).textContent};
  localStorage.removeItem('frontierworks_plan');PL=plDefault();ACT.closePanel();return r;});
 check(`"Plan this node" opens the planner for that node (${pn.res}, ${pn.steps}, ${pn.big})`,pn.btn&&pn.kind==='plan'&&pn.res==='copper'&&pn.p&&pn.steps==='r_copper_ingot'&&/Smelter/.test(pn.big||''));
 check('efficiency rings option is on by default and toggles',await p.evaluate(()=>{const a=OPT.eff;ACT.openMenu();ACT.optEff('0');const b=OPT.eff;ACT.optEff('1');ACT.closePanel();return a&&!b&&OPT.eff;}));
 // tapping a belt with a better belt selected upgrades it without turning it around
 const up=await p.evaluate(()=>{const fw=window.__fw;let X,Y;for(let r=6;r<150&&X==null;r+=2)for(let a=0;a<40;a++){const x=Math.round(MW/2+r*Math.cos(a)),y=Math.round(MH/2+r*Math.sin(a));if(!canPlace('belt1',x,y)){X=x;Y=y;break;}}
  S.ub.push('belt2');S.inv.bolts=999;S.inv.iron_plate=999;fw.placeEnt('belt1',X,Y,1);UI.rot=0;setTool('belt2');tap({x:X,y:Y});setTool(null);const e=fw.entAt(X,Y);const r={d:e.d,dir:e.dir};removeEnt(e,false,true);return r;});
 check(`tap-upgrade keeps belt direction (${up.d}, dir ${up.dir})`,up.d==='belt2'&&up.dir===1);
 // Tier 1 bootstrap: braced plates and rotors can be hand-crafted from the start stock, enough for the first Assembler
 const hc=await p.evaluate(()=>{const keep=JSON.stringify(S);S.inv=Object.assign({},START_INV);for(const r of MS[0].r)if(!ur(r))S.ur.push(r);
  openPanel('inv');const shown=['r_braced_plate','r_rotor'].every(id=>document.querySelector(`#pbody [data-act="craft"][data-v="${id}"]`));
  for(let i=0;i<8;i++)ACT.craft('r_braced_plate',{dataset:{n:1}});for(let i=0;i<4;i++)ACT.craft('r_rotor',{dataset:{n:1}});
  const r={shown,bp:S.inv.braced_plate,ro:S.inv.rotor,can:afford(B.assembler.cost)};ACT.closePanel();S=JSON.parse(keep);return r;});
 check(`hand-craft 8 braced plates + 4 rotors from start stock → can afford an Assembler (${hc.bp}/${hc.ro})`,hc.shown&&hc.bp===8&&hc.ro===4&&hc.can);
 // clock: slider in 1 % steps plus −10/−1/+1/+10 buttons
 const ck=await p.evaluate(()=>{const fw=window.__fw,e=[...fw.ents().values()].find(x=>x.k==='mach');e.clock=1;openPanel('ent',e.id);const step=document.querySelector('#pbody input[data-act="clock"]').step;
  ACT.clockStep('-1');ACT.clockStep('-10');const a=Math.round(e.clock*100);ACT.clockStep('+10');ACT.clockStep('+1');const b=Math.round(e.clock*100);ACT.closePanel();return{step,a,b};});
 check(`clock steps of 1 % (slider step ${ck.step}; 100 −1 −10 = ${ck.a}; back to ${ck.b})`,ck.step==='1'&&ck.a===89&&ck.b===100);
 // dead-end audit (same rule as tests/playthrough.js): every unlocked building must be buildable from makeable items, every goal makeable
 const de=await p.evaluate(()=>{const HAND=['smelter','press','assembler'],ORES=Object.keys(NODE_T).filter(k=>k!=='oil').map(k=>NODE_T[k][0]),bad=[];
  for(let t=0;t<MS.length;t++){const ub=new Set(START_B),ur=new Set(START_R);for(let i=0;i<t;i++){MS[i].b.forEach(x=>ub.add(x));MS[i].r.forEach(x=>ur.add(x));}
   const built=new Set(['core']),boot=new Set(Object.keys(START_INV));let prod=new Set(),ch=true;
   while(ch){ch=false;const p2=new Set(ORES);if(built.has('opump'))p2.add('crude');if(built.has('wpump'))p2.add('water');let g=true;
    while(g){g=false;for(const id of ur){const r=RC[id],fl=[...Object.keys(r.i),...Object.keys(r.o)].some(k=>IT[k].f);if(!(built.has(r.m)||HAND.includes(r.m)&&!fl))continue;if(fl&&!built.has('pipe1'))continue;
     if(Object.keys(r.i).every(k=>p2.has(k)))for(const k in r.o)if(!p2.has(k)){p2.add(k);g=true;}}}
    prod=p2;for(const id of ub)if(!built.has(id)&&Object.keys(B[id].cost).every(k=>prod.has(k)||boot.has(k))){built.add(id);ch=true;}}
   for(const id of ub)if(!built.has(id))bad.push(`tier ${t+1}: ${B[id].n}`);for(const k in MS[t].req)if(!prod.has(k))bad.push(`goal ${t+1}: ${IT[k].n}`);}
  return bad;});
 check('no progression dead ends in tiers 1–10'+(de.length?' ('+de.join('; ')+')':''),de.length===0);
 // cloud shadow picture must wrap seamlessly (a seam shows up as a straight line sliding across the map)
 const cs=await p.evaluate(()=>{const d=cloudC.getContext('2d').getImageData(0,0,128,128).data,a=(x,y)=>d[(y*128+x)*4+3];let ex=0,ey=0,inn=0;
  for(let i=0;i<128;i++){ex+=Math.abs(a(127,i)-a(0,i));ey+=Math.abs(a(i,127)-a(i,0));inn+=Math.abs(a(63,i)-a(64,i));}return{ex:ex/128,ey:ey/128,inn:inn/128};});
 check(`cloud shadows wrap without a seam (edge jumps ${cs.ex.toFixed(1)}/${cs.ey.toFixed(1)} vs normal ${cs.inn.toFixed(1)})`,cs.ex<=cs.inn*2+1&&cs.ey<=cs.inn*2+1);
 // belts curve out of splitters, mergers and crossings (not only out of other belts), and items follow the curve
 const cv=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);let X,Y;
  for(let r=8;r<150&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));let ok=true;for(let j=-2;j<12&&ok;j++)for(let i=-2;i<12&&ok;i++)if(canPlace('incin',x+i,y+j)||nodeAt[(y+j)*MW+x+i])ok=false;if(ok){X=x;Y=y;break;}}
  const placed=[P('belt1',X,Y,0),P('splitter',X+1,Y,0),P('belt1',X+1,Y+1,0),P('belt1',X,Y+4,0),P('crossing',X+1,Y+4,0),P('belt1',X+2,Y+4,1),P('belt1',X+2,Y+5,1),
   P('belt1',X+6,Y+3,1),P('crossing',X+6,Y+4,0),P('belt1',X+6,Y+5,0),P('belt1',X+5,Y+8,0),P('merger',X+6,Y+8,0),P('belt1',X+7,Y+8,1),P('belt1',X+5,Y+11,0),P('belt1',X+6,Y+11,0)];
  tick(0.05);const c=(x,y)=>fw.entAt(x,y).cin;
  const r={ok:placed.every(x=>x===''),split:c(X+1,Y+1),cross:c(X+2,Y+4),cross2:c(X+6,Y+5),merge:c(X+7,Y+8),straight:c(X+6,Y+11)};
  // item through the crossing then round the curve and on
  fw.entAt(X,Y+4).item='iron_ore';for(let i=0;i<60;i++)tick(0.05);r.flowed=!!fw.entAt(X+2,Y+5).item||[...[0,1,2,3]].some(()=>false);
  for(let j=-1;j<13;j++)for(let i=-1;i<10;i++){const e=fw.entAt(X+i,Y+j);if(e&&e.k!=='core')removeEnt(e,false,true);}return r;});
 check(`belts curve out of splitter/crossing/merger (${cv.split},${cv.cross},${cv.cross2},${cv.merge}; plain belt ${cv.straight})`,cv.ok&&cv.split===1&&cv.cross===0&&cv.cross2===1&&cv.merge===0&&cv.straight===null&&cv.flowed);
 // a machine never pushes output into a crossing whose far side can't take it (used to jam an input crossing for good once the input paused)
 const xj=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);let X,Y;
  for(let r=8;r<150&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));let ok=true;for(let j=-3;j<10&&ok;j++)for(let i=-6;i<12&&ok;i++)if(canPlace('incin',x+i,y+j)||nodeAt[(y+j)*MW+x+i])ok=false;if(ok){X=x;Y=y;break;}}
  const r=[P('storage',X-4,Y,0),P('belt1',X-2,Y,0),P('crossing',X-1,Y,0),P('smelter',X,Y,0),P('belt1',X+2,Y+1,0),P('incin',X+3,Y+1,0),P('burner',X,Y+2,0),
   // second line: output THROUGH a crossing onto an outgoing belt must still work
   P('storage',X-4,Y+5,0),P('belt1',X-2,Y+5,0),P('smelter',X-1,Y+5,0),P('crossing',X+1,Y+5,0),P('belt1',X+2,Y+5,0),P('incin',X+3,Y+5,0)];
  const g=fw.entAt(X,Y+2),run=s=>{for(let i=0;i<s;i++){g.fuel.coal=50;for(let k=0;k<20;k++)tick(0.05);}};
  fw.entAt(X-4,Y).store={iron_ore:20};fw.entAt(X-4,Y+5).store={iron_ore:999};fw.entAt(X,Y).r='r_iron_ingot';fw.entAt(X-1,Y+5).r='r_iron_ingot';
  run(90);fw.entAt(X-4,Y).store={iron_ore:999};stat.hist=[];run(90);const a=fw.entAt(X,Y)._ef,b=fw.entAt(X-1,Y+5)._ef;
  for(let j=-1;j<8;j++)for(let i=-5;i<5;i++){const e=fw.entAt(X+i,Y+j);if(e&&e.k!=='core')removeEnt(e,false,true);}return{ok:r.every(v=>v===''),a,b};});
 check(`crossing in front of a machine: input survives a pause (${Math.round(xj.a*100)}%), output through a crossing works (${Math.round(xj.b*100)}%)`,xj.ok&&xj.a>0.8&&xj.b>0.8);
 // pipes keep a steady fill level instead of blinking; Items panel can empty all crates at once
 const pf=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);let X,Y;
  for(let r=8;r<150&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));let ok=true;for(let j=-1;j<6&&ok;j++)for(let i=-1;i<12&&ok;i++)if(canPlace('incin',x+i,y+j)||nodeAt[(y+j)*MW+x+i])ok=false;if(ok){X=x;Y=y;break;}}
  P('tank',X,Y,0);for(let i=2;i<8;i++)P('pipe1',X+i,Y,0);P('incin',X+8,Y,0);const tk=fw.entAt(X,Y),pp=fw.entAt(X+5,Y);let lo=1,hi=0,flips=0,last=null;
  for(let t=0;t<400;t++){if(t%10===0){tk.ft='water';tk.amt+=1;}tick(0.05);if(t>100){lo=Math.min(lo,pp._fl);hi=Math.max(hi,pp._fl);const on=!!pp.item;if(last!==null&&on!==last)flips++;last=on;}}
  P('storage',X,Y+3,0);P('storage',X+3,Y+3,0);fw.entAt(X,Y+3).store={iron_plate:7};fw.entAt(X+3,Y+3).store={wire:5,bolts:3};const before=(S.inv.iron_plate||0)+(S.inv.wire||0)+(S.inv.bolts||0);
  openPanel('inv');const btn=!!document.querySelector('#pbody [data-act="collectAll"]');ACT.collectAll();const after=(S.inv.iron_plate||0)+(S.inv.wire||0)+(S.inv.bolts||0);ACT.closePanel();
  const empty=Object.keys(fw.entAt(X,Y+3).store).length+Object.keys(fw.entAt(X+3,Y+3).store).length;
  for(let j=-1;j<6;j++)for(let i=-1;i<10;i++){const e=fw.entAt(X+i,Y+j);if(e&&e.k!=='core')removeEnt(e,false,true);}return{lo,hi,flips,btn,gain:after-before,empty};});
 check(`pipe fill stays steady (${pf.lo.toFixed(2)}–${pf.hi.toFixed(2)}) while the raw contents flip ${pf.flips}×`,pf.flips>20&&pf.lo>0.15&&pf.hi-pf.lo<0.45);
 check(`Items: "Move everything from all crates" collects ${pf.gain} items and empties the crates`,pf.btn&&pf.gain===15&&pf.empty===0);
 // planner: several end products at once share their parts (Steel Beam 10/min + Steel Pipe 20/min → 70 Steel Ingot/min)
 const mt=await p.evaluate(()=>{PL.locked=true;const o=plRevMulti([{item:'steel_beam',rate:10},{item:'steel_pipe',rate:20}],{});PL.locked=false;
  const ing=o.rows.find(r=>r.item==='steel_ingot');return{ing:ing&&Math.round(ing.rate),goals:Object.keys(o.goal).length,beam:o.rows.find(r=>r.item==='steel_beam').n};});
 check(`planner multi-target: shared Steel Ingot ${mt.ing}/min for 10 beams + 20 pipes`,mt.ing===70&&mt.goals===2&&Math.abs(mt.beam-10/15)<1e-6);
 const ui2=await p.evaluate(()=>{PL=plDefault();PL.locked=true;PL.mode='rev';ACT.openPlan();ACT.plTAdd();const n1=PL.rev.targets.length,sel=document.querySelectorAll('#pbody select[data-pl^="r.t."][data-pl$=".item"]').length;
  ACT.plTDel('1');const n2=PL.rev.targets.length;return{n1,sel,n2};});
 check(`planner: + Add product / ✕ remove (${ui2.n1} → ${ui2.n2}, ${ui2.sel} pickers)`,ui2.n1===2&&ui2.sel===2&&ui2.n2===1);
 // pin: the whole panel (right side) stays open for any content while pinned
 const pin=await p.evaluate(()=>{OPT.pin=false;ACT.openPlan();ACT.pinPanel();const btnOn=document.getElementById('ppinBtn').classList.contains('on');
  tap({x:2,y:2});const a=UI.panel&&UI.panel.kind==='plan';ACT.tool('belt1');const b=UI.panel&&UI.panel.kind==='plan';setTool(null);
  ACT.openStats();tap({x:2,y:2});const c=UI.panel&&UI.panel.kind==='stats';ACT.pinPanel();tap({x:2,y:2});const d=!UI.panel;
  localStorage.removeItem('frontierworks_plan');PL=plDefault();return{btnOn,a,b,c,d};});
 check(`pin keeps the panel open (planner on map tap & tool pick, Stats too), unpinned closes again (${Object.values(pin).join(',')})`,Object.values(pin).every(Boolean));
 check('tool buttons (inspect, rotate, dismantle…) live in the bottom dock',await p.evaluate(()=>document.getElementById('dock').contains(document.getElementById('fabs'))));
 // clock badge drawn on a machine that isn't at 100 %
 const cb=await p.evaluate(()=>{const e=[...ents.values()].find(x=>x.k==='mach');const old=e.clock;e.clock=0.73;cam.x=camT.x=e.x+1;cam.y=camT.y=e.y+1;cam.z=camT.z=3;
  const seen=[],f=ctx.fillText;ctx.fillText=function(t,...a){seen.push(String(t));return f.call(this,t,...a);};render();ctx.fillText=f;e.clock=old;return seen.includes('73%');});
 check('2D shows a clock badge on machines not at 100 %',cb);
 // planner maths (pure functions, no factory state)
 const pm=await p.evaluate(()=>{const f=(res,steps)=>plFwd({res,p:1,ex:'drill1',n:1,clock:100,steps:steps.map(r=>({r,share:100}))});
  const a=f('iron',['r_iron_ingot','r_iron_plate']),b=f('copper',['r_copper_ingot','r_wire','r_cable']),c=(PL.locked=true,plRev('motor',10,{}));PL.locked=false;
  const n=it=>{const r=c.rows.find(x=>x.item===it);return r&&+r.n.toFixed(3);};
  return{a:[a.srcRate,...a.steps.map(s=>s.n),a.left.iron_plate,a.used],b:[...b.steps.map(s=>s.n),b.left.cable],c:[n('motor'),n('rotor'),n('stator')]};});
 check('planner: iron node → 2 smelters, 2 presses, 40 plates ('+pm.a+')',pm.a.join()==='60,2,2,40,1');
 check('planner: copper node → 2/4/2 machines, 60 cable ('+pm.b+')',pm.b.join()==='2,4,2,60');
 check('planner: 10 motors/min → 2 motor, 5 rotor, 4 stator assemblers ('+pm.c+')',pm.c.join()==='2,5,4');
 // planner power: generators, fuel, water, waste, fuel chain
 const pw=await p.evaluate(()=>{PL.locked=true;const f=(gen,fuel,mw,self)=>plPow({gen,fuel,mw,self});
  const a=f('burner','coal',60,0),b=f('steam','coal',75,0),c=f('turbine','fuel',150,0),d=f('reactor','fuel_rod',2500,0),e=f('burner','coal',60,1);
  const ref=c.chain.rows.find(r=>r.item==='fuel');PL.locked=false;
  return{a:[a.n,a.fuelMin],b:[b.n,b.fuelMin,b.water],c:[c.fuelMin,ref&&+ref.n.toFixed(2),ref&&ref.r.m,c.chain.raw.crude],d:[d.fuelMin,d.waste,d.water],e:[+e.tot.toFixed(2),e.own>0]};});
 check('planner power: 60 MW = 2 coal burners, 24 coal/min ('+pw.a+')',pw.a.join()==='2,24');
 check('planner power: steam 75 MW = 30 coal + 45 water/min ('+pw.b+')',pw.b.join()==='1,30,45');
 check('planner power: turbine 150 MW = 12 fuel/min from 0.3 refinery, 18 crude ('+pw.c+')',pw.c.join()==='12,0.3,refinery,18');
 check('planner power: reactor = 0.2 rods, 2 waste, 240 water/min ('+pw.d+')',pw.d.join()==='0.2,2,240');
 check('planner power: own use of drills added ('+pw.e+')',pw.e[0]>60&&pw.e[0]<62&&pw.e[1]);
 // planner UI: open from Menu, add steps, switch modes
 await p.evaluate(()=>{localStorage.removeItem('frontierworks_plan');PL=plDefault();});
 await p.click('[data-act="openMenu"]');await p.waitForTimeout(200);await p.click('#pbody [data-act="openPlan"]');await p.waitForTimeout(200);
 for(let i=0;i<2;i++){await p.click('#pbody [data-act="plAdd"]');await p.waitForTimeout(100);}
 const ui1=await p.evaluate(()=>({t:document.getElementById('ptitle').textContent,steps:PL.fwd.steps.map(s=>s.r).join(),big:[...document.querySelectorAll('#pbody .plbig')].map(e=>e.textContent).join('|')}));
 check('planner opens from Menu and adds steps ('+ui1.steps+': '+ui1.big+')',ui1.t==='Production Planner'&&ui1.steps==='r_iron_ingot,r_iron_plate'&&ui1.big==='2 × Smelter|2 × Press');
 await p.selectOption('#pbody select[data-pl="f.p"]','2');await p.waitForTimeout(100);
 check('planner reacts to purity change',await p.evaluate(()=>document.querySelector('#pbody .plbig').textContent==='4 × Smelter'));
 await p.click('#pbody [data-act="plLocked"]');await p.click('#pbody [data-act="plMode"][data-v="rev"]');await p.waitForTimeout(100);
 await p.selectOption('#pbody select[data-pl="r.t.0.item"]','quantum_core');await p.waitForTimeout(100);
 check('planner reverse mode with locked recipes (quantum core chain)',await p.evaluate(()=>document.querySelectorAll('#pbody .plbig').length>10));
 check('planner reverse cards list In and Out per machine',await p.evaluate(()=>{const c=[...document.querySelectorAll('#pbody .card')].find(x=>x.querySelector('.plbig'));return !!c&&/In[\s\S]*\/min[\s\S]*Out[\s\S]*\/min/i.test(c.innerText);}));
 await p.click('#pbody [data-act="plMode"][data-v="fwd"]');await p.waitForTimeout(100);await p.click('#pbody [data-act="plPowFrom"]');await p.waitForTimeout(100);
 check('planner: "Plan the power" opens the Power tab with that demand',await p.evaluate(()=>PL.mode==='pow'&&PL.pow.mw>0&&document.querySelector('#pbody .plbig').textContent.includes('×')));
 await p.evaluate(()=>{localStorage.removeItem('frontierworks_plan');PL=plDefault();ACT.closePanel();});
 // 3D view: toggle, tap to inspect, tap to build, drag a belt line, back to 2D
 await p.evaluate(()=>window.__fw.setView3D(true));await p.waitForFunction(()=>window.__fw.V3.on,null,{timeout:20000});await p.waitForTimeout(500);
 const W=1280,H=800,look=(x,y)=>p.evaluate(([x,y])=>{const C=window.__fw.C3;Object.assign(C,{x,y,dist:22,pitch:1.0,yaw:0.5,go:null,vx:0,vy:0});},[x,y]);
 const core=await p.evaluate(()=>{const e=[...window.__fw.ents().values()].find(e=>e.k==='core');return{x:e.x+e.w/2,y:e.y+e.h/2};});
 await look(core.x,core.y);await p.waitForTimeout(150);await p.mouse.click(W/2,H/2);await p.waitForTimeout(150);
 check('3D: tap opens the Base Core panel',await p.evaluate(()=>UI.panel&&UI.panel.kind==='ent'&&window.__fw.ents().get(UI.panel.arg).k==='core'));
 const spot=await p.evaluate(()=>{for(let r=6;r<30;r++)for(let a=0;a<64;a++){const x=Math.round(MW/2+r*Math.cos(a/10)),y=Math.round(MH/2+r*Math.sin(a/10));let ok=true;for(let i=0;i<7;i++)if(canPlace('belt1',x+i,y+3)||canPlace('smelter',x,y))ok=false;if(ok)return{x,y};}});
 await p.evaluate(()=>{ACT.closePanel();ACT.tool('smelter');});await look(spot.x+0.5,spot.y+0.5);await p.waitForTimeout(150);await p.mouse.click(W/2,H/2);await p.waitForTimeout(150);
 check('3D: tap builds a smelter',await p.evaluate(s=>{const e=window.__fw.entAt(s.x,s.y);return e&&e.d==='smelter'&&e.x===s.x&&e.y===s.y;},spot));
 await p.evaluate(()=>ACT.tool('belt1'));await look(spot.x+3.5,spot.y+3.5);await p.waitForTimeout(150);
 const scr=await p.evaluate(s=>{const V=window.__fw.V3,c=V.camera,f=(x,y)=>{const v=new THREE.Vector3(x,0,y).project(c);return[(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];};return[f(s.x+0.5,s.y+3.5),f(s.x+6.5,s.y+3.5)];},spot);
 await p.mouse.move(...scr[0]);await p.mouse.down();await p.mouse.move(...scr[1],{steps:8});await p.mouse.up();await p.waitForTimeout(150);
 check('3D: dragging lays a belt line',await p.evaluate(s=>{let n=0;for(let i=0;i<7;i++){const e=window.__fw.entAt(s.x+i,s.y+3);if(e&&e.d==='belt1'&&e.dir===0)n++;}return n===7;},spot));
 const r3=await p.evaluate(()=>{const V=window.__fw.V3;return{calls:V.r.info.render.calls,ok:!!V.cv&&V.cv.style.display==='block'};});
 check('3D: renders ('+r3.calls+' draw calls)',r3.ok&&r3.calls>10);
 await p.evaluate(()=>{ACT.toolNone();window.__fw.setView3D(false);});await p.waitForTimeout(200);
 check('3D: back to 2D keeps the place',await p.evaluate(s=>{const c=window.__fw.cam();return !window.__fw.V3.on&&Math.abs(c.x-(s.x+3.5))<2&&document.getElementById('cv').style.visibility==='';},spot));
 const sw=await p.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return !!reg.active;});check('service worker active',sw);
 // saves: compact + compressed in the browser database; export/import round trip; old v1 text still imports
 const sv2=await p.evaluate(async()=>{const fw=window.__fw,ok=await fw.save(),n=ents.size,per=fw.SAVE.bytes/n;
  const t=await exportText();await importText(t);const back=ents.size;
  const v1=btoa(unescape(encodeURIComponent(JSON.stringify({v:1,S:Object.assign({},S),es:[...ents.values()].map(e=>({d:e.d,x:e.x,y:e.y,dir:e.dir}))}))));await importText(v1);const v1n=ents.size;
  await importText(t);await fw.save();return{ok,where:fw.SAVE.where,n,per:+per.toFixed(1),fw2:t.startsWith('FW2:'),back,v1n};});
 check(`save goes to the ${sv2.where}, ${sv2.per} bytes per object; FW2 export/import and old text import keep all ${sv2.n} objects`,sv2.ok&&sv2.where==='browser database'&&sv2.fw2&&sv2.back===sv2.n&&sv2.v1n===sv2.n&&sv2.per<40);
 const before=await p.evaluate(()=>ents.size);
 await p.waitForTimeout(500);await ctx.setOffline(true);await p.reload();await p.waitForTimeout(2000);
 check('works offline',await p.evaluate(()=>!!window.__fw&&document.getElementById('cv').width>0));
 check('reload restores the saved factory from the browser database',await p.evaluate(n=>ents.size===n,before));
 // factory size in Stats; far zoom uses simple blocks
 check('Stats shows factory size',await p.evaluate(()=>{ACT.openStats();const t=document.getElementById('pbody').innerText;ACT.closePanel();return /Factory size[\s\S]*Objects\s*[\d,]+/i.test(t);}));
 check('far zoom draws without errors (simple blocks)',await p.evaluate(()=>{cam.z=camT.z=0.3;render();cam.z=camT.z=1.2;return true;}));
 await ctx.setOffline(false);
 check('no page errors',errs.length===0);
 for(const [n,v] of ok)console.log((v?'PASS ':'FAIL ')+n);if(errs.length)console.log(errs);
 await b.close();server.close();process.exit(ok.every(x=>x[1])?0:1);
})();
