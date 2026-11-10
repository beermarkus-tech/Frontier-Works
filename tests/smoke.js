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
  const o=JSON.parse(decodeURIComponent(escape(atob(s0))));delete o.S.gen;delete o.S.mw;o.S.seed=777;o.es=o.es.filter(e=>e.d==='core').map(e=>Object.assign(e,{x:62,y:62}));
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
  for(let r=20;r<150&&X==null;r+=3)for(let a=0;a<40;a++){const x=Math.round(MW/2+r*Math.cos(a)),y=Math.round(MH/2+r*Math.sin(a));let ok=true;for(let j=-4;j<8&&ok;j++)for(let i=-2;i<14&&ok;i++)if(canPlace('belt1',x+i,y+j))ok=false;if(ok){X=x;Y=y;break;}}
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
 await p.selectOption('#pbody select[data-pl="r.item"]','quantum_core');await p.waitForTimeout(100);
 check('planner reverse mode with locked recipes (quantum core chain)',await p.evaluate(()=>document.querySelectorAll('#pbody .plbig').length>10));
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
 await p.waitForTimeout(500);await ctx.setOffline(true);await p.reload();await p.waitForTimeout(1500);
 check('works offline',await p.evaluate(()=>!!window.__fw&&document.getElementById('cv').width>0));
 await ctx.setOffline(false);
 check('no page errors',errs.length===0);
 for(const [n,v] of ok)console.log((v?'PASS ':'FAIL ')+n);if(errs.length)console.log(errs);
 await b.close();server.close();process.exit(ok.every(x=>x[1])?0:1);
})();
