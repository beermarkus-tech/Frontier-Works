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
  res.push(P('pole1',MW/2-7,MH/2-7,0),P('pole1',MW/2-7,MH/2,0));const before=S.inv.iron_ingot||0;for(let i=0;i<20*120;i++)fw.tick(0.05);
  const g=fw.entAt(coal.x-3,coal.y);fw.ACT.closePanel();openPanel('ent',g.id);const txt=document.getElementById('pbody').innerText,chip=document.getElementById('pbuild').textContent;fw.ACT.closePanel();
  const m=txt.match(/Burns now\s*([\d.]+)\s*Coal\/min/);return{res,ingots:(S.inv.iron_ingot||0)-before,gen:{burn:m&&+m[1],exp:+(12*Math.min(1,g._ls)).toFixed(1),chip,full:/At full load[\s\S]*12 Coal\/min/.test(txt)}};});
 check('placements',r.res.every(x=>x===''));
 check(`coal burner panel shows consumption (${r.gen.burn} coal/min now, expected ≈${r.gen.exp}; header ${r.gen.chip})`,r.gen.burn!=null&&Math.abs(r.gen.burn-r.gen.exp)<=0.2&&r.gen.full&&/⚡ \d+%/.test(r.gen.chip));check('ingots delivered ('+r.ingots+')',r.ingots>40);
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
 // pipes have no direction: tank → pipes laid "backwards" + a Pipe Junction + a corner → incinerator, one network at Mk1 rate;
 // a second fluid is refused and flagged; the network's fluid and amount survive save/load. Then: Items panel empties all crates at once
 const pnet=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);let X,Y;
  for(let r=8;r<150&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));let ok=true;for(let j=-1;j<8&&ok;j++)for(let i=-1;i<12&&ok;i++)if(canPlace('incin',x+i,y+j)||nodeAt[(y+j)*MW+x+i])ok=false;if(ok){X=x;Y=y;break;}}
  S.ub.push('junction','pipe1','tank');
  const r=[P('tank',X,Y,0),P('junction',X+2,Y,0),P('pipe1',X+3,Y,2),P('pipe1',X+4,Y,2),P('junction',X+5,Y,0),P('pipe1',X+6,Y,1),P('pipe1',X+6,Y+1,3),P('junction',X+6,Y+2,0),P('incin',X+7,Y+2,0),P('tank',X+2,Y+1,0),P('pipe1',X+9,Y+3,0),P('pipe1',X+10,Y+3,0),P('incin',X+8,Y+4,0)];
  const tk=fw.entAt(X,Y),t2=fw.entAt(X+2,Y+1);tick(0.05);const one=new Set([X+2,X+3,X+4,X+5].map(x=>fw.entAt(x,Y).net).concat([fw.entAt(X+6,Y+2).net])).size===1;
  for(let s=0;s<5;s++){tk.ft='water';tk.amt=400;for(let k=0;k<20;k++)tick(0.05);}
  stat.hist=[];t2.ft='crude';t2.amt=100;for(let s=0;s<70;s++){tk.ft='water';tk.amt=400;t2.ft='crude';t2.amt=100;for(let k=0;k<20;k++)tick(0.05);}
  const lone=fw.entAt(X+9,Y+3).net,past=lone.att.length===0;   // plain pipes next to an incinerator: no connection
  const n=fw.entAt(X+3,Y).net,rate=Math.round(rates().c.water||0),mix=!!n.conflict&&n.conflict.fluid==='crude'&&n.fluid==='water'&&t2.ft==='crude'&&t2.amt===100;
  const amt=n.amt,sv=serialize();load(sv);tick(0.05);const n2=fw.entAt(X+3,Y).net,kept=n2&&n2.fluid==='water'&&Math.abs(n2.amt-amt)<=1;
  P('storage',X,Y+5,0);P('storage',X+3,Y+5,0);fw.entAt(X,Y+5).store={iron_plate:7};fw.entAt(X+3,Y+5).store={wire:5,bolts:3};const before=(S.inv.iron_plate||0)+(S.inv.wire||0)+(S.inv.bolts||0);
  openPanel('inv');const btn=!!document.querySelector('#pbody [data-act="collectAll"]');ACT.collectAll();const after=(S.inv.iron_plate||0)+(S.inv.wire||0)+(S.inv.bolts||0);ACT.closePanel();
  const empty=Object.keys(fw.entAt(X,Y+5).store).length+Object.keys(fw.entAt(X+3,Y+5).store).length;
  for(let j=-1;j<8;j++)for(let i=-1;i<10;i++){const e=fw.entAt(X+i,Y+j);if(e&&e.k!=='core')removeEnt(e,false,true);}
  return{ok:r.every(v=>v===''),one,rate,mix,kept,past,btn,gain:after-before,empty};});
 check(`pipes without direction: junction entry points + backwards pipes + junction + corner form one network, ${pnet.rate} m³/min (Mk1 = 300)`,pnet.ok&&pnet.one&&pnet.rate>=270&&pnet.rate<=310);
 check('pipe network refuses a second fluid (no mixing) and flags it',pnet.mix);
 check('a plain pipe running past a building does not connect (only Pipe Junctions are entry points)',pnet.past);
 check('pipe network fluid and amount survive save/load',pnet.kept);
 check(`Items: "Move everything from all crates" collects ${pnet.gain} items and empties the crates`,pnet.btn&&pnet.gain===15&&pnet.empty===0);
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
 // Cargo Drones (Tier 5): link two pads by tapping, drone carries items over ~60 tiles, receiver passes them on; route survives save/load
 const dr=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);const dry=(x,y,w,h)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(canPlace('incin',x+i,y+j)||nodeAt[(y+j)*MW+x+i])return false;return true;};
  let A=null,Bq=null;for(let r=10;r<170&&!Bq;r+=3)for(let a=0;a<64&&!Bq;a++){const x=Math.round(MW/2+r*Math.cos(a/10)),y=Math.round(MH/2+r*Math.sin(a/10));if(!dry(x-1,y-2,9,6))continue;
   if(!A){A={x,y};continue;}if(Math.hypot(x-A.x,y-A.y)>=55&&Math.hypot(x-A.x,y-A.y)<=90)Bq={x,y};}
  const unlocked=MS[4].b.includes('dpad');S.ub.push('dpad');
  const r=[P('storage',A.x-1,A.y,0),P('belt5',A.x+1,A.y,0),P('dpad',A.x+2,A.y-1,0),P('burner',A.x+2,A.y+2,0),P('dpad',Bq.x,Bq.y-1,0),P('belt5',Bq.x+3,Bq.y,0),P('incin',Bq.x+4,Bq.y,0)];
  const crate=fw.entAt(A.x-1,A.y),snd=fw.entAt(A.x+2,A.y-1),rcv=fw.entAt(Bq.x,Bq.y-1),g=fw.entAt(A.x+2,A.y+2);
  openPanel('ent',snd.id);ACT.padLink();tap({x:Bq.x+1,y:Bq.y});const linked=padTarget(snd)===rcv;
  const dist=padRoute(snd,rcv),trip=2*dist/DRONE.spd+DRONE.load+DRONE.unload;
  for(let s=0;s<150;s++){crate.store={iron_ore:999};g.fuel.coal=50;for(let k=0;k<20;k++)tick(0.05);}
  const del=snd.del||0,exp=Math.floor((150-DRONE.load-1)/trip)*DRONE.cap,passed=(rcv.store.iron_ore||0)<B.dpad.cap;
  const sv=serialize();load(sv);const s2=fw.entAt(A.x+2,A.y-1),keep=!!s2&&padTarget(s2)&&padTarget(s2).x===Bq.x&&s2.del===del;
  ACT.closePanel();return{unlocked,ok:r.every(v=>v===''),linked,del,exp,dist:Math.round(dist),passed,keep};});
 check(`drones: Tier 5 unlock, tap-to-link, ${dr.del} items flown ${dr.dist} tiles (expected ≈${dr.exp}), receiver passes them on, route survives save/load`,dr.unlocked&&dr.ok&&dr.linked&&dr.del>=dr.exp*0.9&&dr.del<=dr.exp+40&&dr.passed&&dr.keep);
 // find & highlight resource nodes: panel toggle, rings drawn, edge arrow for off-screen, fly to nearest, clear
 const hl=await p.evaluate(()=>{ACT.openFind();ACT.hlToggle('uranium');const n=hlNodes().length,chip=document.getElementById('hlchip').style.display==='flex';
  cam.x=camT.x=MW/2;cam.y=camT.y=MH/2;cam.z=camT.z=3.4;const nr=hlNearest(hlNodes());   // close zoom: no uranium on screen (it's ≥45 tiles out), so the edge arrow must show
  const seen=[],f=ctx.fillText;ctx.fillText=function(t,...a){seen.push(String(t));return f.call(this,t,...a);};render();ctx.fillText=f;const arrow=seen.includes(String(Math.round(nr.d)));
  ACT.hlFly();const flew=Math.hypot(camT.x-(nr.n.x+0.5),camT.y-(nr.n.y+0.5))<0.01;
  const core=[...ents.values()].find(e=>e.k==='core');const node=nodes.find(x=>x.t==='iron');openPanel('node',node);const btn=!!document.querySelector('#pbody [data-act="hlNode"]');ACT.hlNode();const iron=UI.hl.types.join();
  ACT.hlClear();const cleared=!UI.hl.types.length&&document.getElementById('hlchip').style.display==='none';ACT.closePanel();cam.x=camT.x=core.x+2;cam.y=camT.y=core.y+2;
  return{n,chip,arrow,flew,btn,iron,cleared};});
 check(`highlight nodes: ${hl.n} uranium nodes, chip, edge arrow with distance, fly to nearest, node-panel button, clear (${Object.values(hl).join(',')})`,hl.n>0&&hl.chip&&hl.arrow&&hl.flew&&hl.btn&&hl.iron==='iron'&&hl.cleared);
 // moving buildings: keeps state, blocked spots refused, long-press drag (mouse) and the panel ✥ Move button
 const mv=await p.evaluate(()=>{const fw=window.__fw;const free=(x,y)=>{for(let j=-1;j<3;j++)for(let i=-1;i<9;i++)if(canPlace('smelter',x+i,y+j))return false;return true;};let X,Y;
  for(let r=8;r<160&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));if(free(x,y)){X=x;Y=y;break;}}
  fw.placeEnt('smelter',X,Y,0,true);fw.placeEnt('smelter',X+3,Y,0,true);const a=fw.entAt(X,Y),b=fw.entAt(X+3,Y);a.r='r_iron_ingot';a.inb={iron_ore:7};a.clock=0.73;
  const blocked=moveEnt(a,X+2,Y)!==''&&fw.entAt(X,Y)===a;const why=moveEnt(a,X+6,Y);const kept=why===''&&fw.entAt(X+6,Y)===a&&fw.entAt(X,Y)==null&&a.r==='r_iron_ingot'&&a.inb.iron_ore===7&&a.clock===0.73;
  moveEnt(a,X,Y);cam.x=camT.x=X+4;cam.y=camT.y=Y+1;cam.z=camT.z=2;const s=TS*cam.z,scr=(tx,ty)=>({x:innerWidth/2+(tx+0.5-cam.x)*s,y:innerHeight/2+(ty+0.5-cam.y)*s});
  return{X,Y,blocked,kept,from:scr(X,Y),to:scr(X+6,Y)};});
 await p.mouse.move(mv.from.x,mv.from.y);await p.mouse.down();await p.waitForTimeout(650);await p.mouse.move(mv.to.x,mv.to.y,{steps:6});await p.waitForTimeout(80);
 const prevOk=await p.evaluate(()=>!!movePrev&&movePrev.ok);await p.mouse.up();await p.waitForTimeout(80);
 const mv2=await p.evaluate(m=>{const fw=window.__fw,a=fw.entAt(m.X+6,m.Y),dragged=!!a&&a.r==='r_iron_ingot'&&fw.entAt(m.X,m.Y)==null;
  openPanel('ent',a.id);const btn=!!document.querySelector('#pbody [data-act="moveSel"]');ACT.moveSel();tap({x:m.X,y:m.Y});const back=fw.entAt(m.X,m.Y)===a&&!UI.moveId;
  const b=fw.entAt(m.X+3,m.Y);removeEnt(a,false,true);removeEnt(b,false,true);ACT.closePanel&&ACT.closePanel();return{dragged,btn,back};},mv);
 check(`move buildings: keeps recipe/buffer/clock, blocked spot refused, long-press drag moves it, ✥ Move button + tap (${[mv.blocked,mv.kept,prevOk,mv2.dragged,mv2.btn,mv2.back].join(',')})`,mv.blocked&&mv.kept&&prevOk&&mv2.dragged&&mv2.btn&&mv2.back);
 // menus: Fluids tab (pipes, junction, tank), Incinerator 2×2 at the end of Production; old saves' 1×1 incinerators grow or go back to stock
 const inc=await p.evaluate(()=>{const fw=window.__fw,P=(...a)=>fw.placeEnt(...a,true);const ids=c=>Object.values(B).filter(d=>d.cat===c).map(d=>d.id);
  const fl=ids('fluid').join(),prod=ids('prod'),log=ids('log');let X,Y;
  for(let r=8;r<150&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));let ok=true;for(let j=-2;j<4&&ok;j++)for(let i=-2;i<14&&ok;i++)if(canPlace('incin',x+i,y+j))ok=false;if(ok){X=x;Y=y;break;}}
  const ring=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];for(const [i,j] of ring)P('belt1',X+1+i,Y+j,0);P('belt1',X+9,Y,0);
  const keep=serialize(),o=JSON.parse(keep);o.es.push(['incin',X+1,Y,0],['incin',X+10,Y,0]);const conc=S.inv.concrete||0;load(JSON.stringify(o));
  const boxed=!fw.entAt(X+1,Y)||fw.entAt(X+1,Y).k!=='incin',back=(S.inv.concrete||0)===conc+B.incin.cost.concrete,g=fw.entAt(X+10,Y),grew=!!g&&g.k==='incin'&&g.x===X+10&&g.w===2&&fw.entAt(X+11,Y+1)===g;
  const belts=ring.every(([i,j])=>{const b=fw.entAt(X+1+i,Y+j);return b&&b.k==='belt';});
  const again=JSON.parse(serialize());load(JSON.stringify(again));const g2=fw.entAt(X+10,Y),stable=!!g2&&g2.x===X+10&&g2.y===Y;load(keep);
  for(let j=-2;j<4;j++)for(let i=-2;i<14;i++){const e=fw.entAt(X+i,Y+j);if(e&&e.k!=='core')removeEnt(e,false,true);}
  return{fl:fl==='pipe1,pipe2,junction,tank',last:prod[prod.length-1]==='incin'&&B.incin.w===2,log:!log.some(id=>B[id].k==='pipe'||id==='tank'||id==='junction'||id==='incin'),boxed,back,grew,belts,stable};});
 check(`menus: Fluids tab, 2×2 Incinerator last in Production; old 1×1 incinerators grow or are refunded (${Object.values(inc).join(',')})`,Object.values(inc).every(Boolean));
 // cloud save sync against a fake GitHub Gist API: two simulated devices, first connection asks, auto-load, playing-now warning,
 // undo + resume, downgrade guard, both-played conflict, import "only this device"
 const GHS={gists:{},n:0,calls:0};
 const gjson=g=>({id:g.id,description:g.description,files:Object.fromEntries(Object.entries(g.files).map(([k,v])=>[k,{filename:k,content:v,truncated:false,raw_url:'https://example.invalid/'+k}]))});
 await p.route('https://api.github.com/**',async route=>{const r=route.request(),u=new URL(r.url()),m=r.method();GHS.calls++;
  if(r.headers()['authorization']!=='Bearer tok123')return route.fulfill({status:401,body:'{}'});
  const send=o=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(u.pathname==='/gists'&&m==='GET')return send(Object.values(GHS.gists).map(g=>({id:g.id,description:g.description})));
  if(u.pathname==='/gists'&&m==='POST'){const b=JSON.parse(r.postData()),id='g'+(++GHS.n);GHS.gists[id]={id,description:b.description,files:Object.fromEntries(Object.entries(b.files).map(([k,v])=>[k,v.content]))};return send(gjson(GHS.gists[id]));}
  const g=GHS.gists[u.pathname.split('/')[2]];if(!g)return route.fulfill({status:404,body:'{}'});
  if(m==='PATCH'){const b=JSON.parse(r.postData());for(const [k,v] of Object.entries(b.files))if(v)g.files[k]=v.content;else delete g.files[k];}
  return send(gjson(g));});
 const cloudMeta=()=>{const g=Object.values(GHS.gists)[0];return g?JSON.parse(g.files['fw-meta.json']):null;};
 await p.evaluate(()=>{window.__dlgDog=setInterval(()=>{if(SY.ans&&!document.getElementById('dlg').classList.contains('hidden')){SY.__t=(SY.__t||0)+1;if(SY.__t>16){SY.__t=0;SY.ans('later');}}else SY.__t=0;},500);});
 const sy=await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),dlgOpen=()=>!document.getElementById('dlg').classList.contains('hidden'),dlgTxt=()=>document.getElementById('dlgc').textContent;
  const until=async f=>{for(let i=0;i<100&&!f();i++)await w(30);return f();};const out={};
  const gameA=serialize(),nA=ents.size;
  // device A (tablet) connects first: cloud empty → uploads
  SC={dev:'A',token:'tok123',name:'Tablet'};await syncNow(true);out.a1=SC.base===1&&!!SC.gist;const gid=SC.gist,stA=JSON.parse(JSON.stringify(SC));
  // device B (phone) with a fresh small game connects: cloud not empty → asks; pick cloud → gets A's factory
  newGame();const nB=ents.size;SC={dev:'B',token:'tok123',name:'Phone'};SY.liveOk=true;   // (the playing-now warning is checked on device A below)
  const pB=syncNow(true);await until(dlgOpen);out.b1=dlgTxt().includes('A cloud save already exists')&&dlgTxt().includes('Tablet');
  ACT.syncAns('cloud');await pB;out.b2=ents.size===nA&&SC.base===1&&nB<nA;
  // B plays a bit and syncs → version 2 from B
  S.t+=60;await syncNow(false);out.b3=SC.base===2&&SC.baseDev==='B';
  // A again (not played since its base): sees B playing → warning; continue → loads B's newer game automatically
  SC=stA;load(gameA);SY.liveOk=false;const pA=syncNow(false);await until(dlgOpen);out.a2=dlgTxt().includes('Phone is playing');ACT.syncAns('1');await pA;
  out.a3=SC.base===2&&!dlgOpen()&&SY.undo;
  // undo restores the pre-sync game and pauses; resume asks again (base forgotten)
  await ACT.syncUndo();out.u1=SC.paused===true;
  return out;});
 const sy2=await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),dlgOpen=()=>!document.getElementById('dlg').classList.contains('hidden'),dlgTxt=()=>document.getElementById('dlgc').textContent;
  const until=async f=>{for(let i=0;i<100&&!f();i++)await w(30);return f();};const out={};
  out.paused=SC.paused===true;ACT.syncResume();await until(dlgOpen);out.resumeAsks=dlgTxt().includes('A cloud save already exists');ACT.syncAns('cloud');await until(()=>SC.base===2&&!SY.busy);
  out.back=SC.base===2;return out;});
 // downgrade guard: another device uploads a tiny, lower-tier game as version 3 → A (not played) must ask, not load
 const g0=Object.values(GHS.gists)[0];g0.files['fw-meta.json']=JSON.stringify({ver:3,dev:'C',name:'Old phone',time:Date.now(),tier:0,n:3,t:10});g0.files['fw-live.json']=JSON.stringify({dev:'C',time:Date.now(),closed:true});
 const sy3=await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),dlgOpen=()=>!document.getElementById('dlg').classList.contains('hidden'),dlgTxt=()=>document.getElementById('dlgc').textContent;
  const until=async f=>{for(let i=0;i<100&&!f();i++)await w(30);return f();};const out={},n0=ents.size;S.ms=Math.max(S.ms,1);
  const pr=syncNow(false);await until(dlgOpen);out.down=dlgTxt().includes('looks older')&&ents.size===n0;ACT.syncAns('local');await pr;out.kept=SC.base===4&&ents.size===n0;
  // both played: cloud v5 from C, A also played → asks; Decide later holds
  return out;});
 const out3backup=!!Object.values(GHS.gists)[0].files['fw-backup.txt'];
 g0.files['fw-meta.json']=JSON.stringify({ver:5,dev:'C',name:'Old phone',time:Date.now(),tier:9,n:999,t:99999});
 const sy4=await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),dlgOpen=()=>!document.getElementById('dlg').classList.contains('hidden'),dlgTxt=()=>document.getElementById('dlgc').textContent;
  const until=async f=>{for(let i=0;i<100&&!f();i++)await w(30);return f();};const out={};S.t+=60;
  const pr=syncNow(false);await until(dlgOpen);out.both=dlgTxt().includes('Both devices have new progress');ACT.syncAns('later');await pr;out.hold=SY.hold===true&&SC.base===4;
  // import with sync on → asks; "only this device" pauses
  openPanel('menu');document.getElementById('saveTxt').value=serialize();const pi=ACT.importSave();await until(dlgOpen);out.imp=dlgTxt().includes('Use this save everywhere');ACT.syncAns('here');await pi;out.impPaused=SC.paused===true;
  // menu shows the cloud section; disconnect clears the key
  openPanel('menu');out.menu=document.getElementById('pbody').textContent.includes('Cloud save (GitHub)');ACT.syncOff();out.off=!SC.token;ACT.closePanel();SY.hold=false;return out;});
 const syncAll=Object.assign({},sy,sy2,sy3,sy4,{backup:out3backup,v:cloudMeta().ver});
 check(`cloud sync (fake GitHub): ${Object.entries(syncAll).map(([k,v])=>k+'='+v).join(' ')}`,Object.entries(syncAll).every(([k,v])=>k==='v'?v===5:v===true));
 await p.unroute('https://api.github.com/**');await p.evaluate(()=>clearInterval(window.__dlgDog));
 // signs: four sizes, placing opens the panel, text + colour, drawn in 2D, kept in saves
 const sg=await p.evaluate(()=>{const fw=window.__fw;let X,Y;for(let r=8;r<150&&X==null;r+=2)for(let a=0;a<48;a++){const x=Math.round(MW/2+r*Math.cos(a/7.6)),y=Math.round(MH/2+r*Math.sin(a/7.6));if(!canPlace('sign3',x,y)){X=x;Y=y;break;}}
  const sizes=SIGNS.map(id=>B[id].w).join();setTool('sign3');tap({x:X+1,y:Y+1});const e=fw.entAt(X,Y),opened=UI.panel&&UI.panel.kind==='ent'&&UI.panel.arg===e.id&&!!document.getElementById('signTxt');
  const inp=document.getElementById('signTxt');inp.value='Iron Works';inp.dispatchEvent(new Event('input',{bubbles:true}));ACT.signColor('3');ACT.closePanel();
  cam.x=camT.x=X+1.5;cam.y=camT.y=Y+1.5;cam.z=camT.z=2;const seen=[],f=ctx.fillText;ctx.fillText=function(t,...a){seen.push(String(t));return f.call(this,t,...a);};render();ctx.fillText=f;
  const sv=serialize();load(sv);const e2=fw.entAt(X,Y);const r={sizes,opened,txt:e.tx,col:e.tc,drawn:seen.join(' ').includes('Iron')&&seen.join(' ').includes('Works'),kept:e2&&e2.tx==='Iron Works'&&e2.tc===3};
  openPanel('ent',e2.id);const sb=document.querySelectorAll('#pbody [data-act="signSize"]').length===5;S.inv.iron_plate=(S.inv.iron_plate||0)+10;const pl=S.inv.iron_plate;ACT.signSize('sign1');const small=e2.d==='sign1'&&e2.w===1&&S.inv.iron_plate===pl+3&&e2.tx==='Iron Works';
  ACT.signSize('sign3');const big=e2.d==='sign3'&&e2.w===3&&fw.entAt(e2.x+2,e2.y+2)===e2&&S.inv.iron_plate===pl;ACT.closePanel();r.resize=sb&&small&&big;removeEnt(e2,false,true);return r;});
 check(`signs: sizes ${sg.sizes}, placing opens the text box, "${sg.txt}" in colour ${sg.col} is drawn and survives save/load; size changes S↔L after placing (${sg.resize})`,sg.resize&&sg.sizes==='1,2,3,4,6'&&sg.opened&&sg.txt==='Iron Works'&&sg.col===3&&sg.drawn&&sg.kept);
 // older saves get buildings added later (signs, Drone Pad) on load; signs have their own tab
 const ul=await p.evaluate(()=>{const keep=serialize();const o=JSON.parse(keep);o.S.ub=o.S.ub.filter(x=>!x.startsWith('sign')&&x!=='dpad');o.S.ms=5;load(JSON.stringify(o));
  const r={signs:SIGNS.every(ub),dpad:ub('dpad'),tab:CATS.some(c=>c[0]==='sign')&&Object.values(B).filter(d=>d.cat==='sign').length===5&&!Object.values(B).some(d=>d.cat==='log'&&d.k==='sign')};
  UI.cat='sign';buildCats();r.shown=document.querySelectorAll('#tools [data-act="tool"]').length===5;
  r.trans=B.dpad.cat==='trans'&&CATS.some(c=>c[0]==='trans');UI.cat='trans';buildCats();r.transShown=!!document.querySelector('#tools [data-v="dpad"]');UI.cat='log';buildCats();load(keep);return r;});
 check(`older saves get signs and the Drone Pad on load; Signs and Transport (Drone Pad) have their own tabs (${Object.values(ul).join(',')})`,Object.values(ul).every(Boolean));
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
 await p.evaluate(()=>{cam.z=camT.z=1.0;window.__fw.setView3D(true);});await p.waitForFunction(()=>window.__fw.V3.on,null,{timeout:20000});
 const intro0=await p.evaluate(()=>({pitch:C3.pitch,yaw:C3.yaw,orbit:V3.orbit}));await p.waitForFunction(()=>!V3.intro,null,{timeout:60000});await p.waitForTimeout(800);
 const intro1=await p.evaluate(()=>({pitch:C3.pitch,yaw:C3.yaw,intro:!!V3.intro}));
 await p.mouse.move(640,300);await p.mouse.down();await p.mouse.up();const stopped=await p.evaluate(()=>V3.orbit===0);
 check(`3D fly-in: starts top-down (${intro0.pitch.toFixed(2)}), tilts to ${intro1.pitch.toFixed(2)}, circles (yaw +${(intro1.yaw-intro0.yaw).toFixed(2)}), a touch stops it`,intro0.pitch>1.4&&intro0.orbit>0&&Math.abs(intro1.pitch-0.62)<0.03&&!intro1.intro&&intro1.yaw-intro0.yaw>0.05&&stopped);
 const W=1280,H=800,look=(x,y)=>p.evaluate(([x,y])=>{v3Stop();const C=window.__fw.C3;Object.assign(C,{x,y,dist:22,pitch:1.0,yaw:0.5,go:null,vx:0,vy:0});},[x,y]);
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
 const lk=await p.evaluate(async()=>{const V=window.__fw.V3,w=()=>new Promise(r=>setTimeout(r,250));const def=V.look==='nice';ACT.look3('classic');await w();
  const cl=!V.scene.environment&&!V.mat.map&&!V.aoP.mesh.visible&&JSON.parse(localStorage.getItem('frontierworks_view')).look==='classic';
  ACT.look3('nice');await w();const ni=V.r.toneMapping===0&&!!V.scene.environment&&!!V.mat.map&&!!V.M.smelter.geo.attributes.uv&&V.aoP.mesh.visible&&V.aoP.mesh.count>0;return{def,cl,ni};});
 check(`3D look: Enhanced by default, same light as Classic; Classic has no reflections/textures/contact shadows, back to Enhanced (${Object.values(lk).join(',')})`,lk.def&&lk.cl&&lk.ni);
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
