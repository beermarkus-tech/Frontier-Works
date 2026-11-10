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
  res.push(P('pole1',57,57,0),P('pole1',57,64,0));const before=S.inv.iron_ingot||0;for(let i=0;i<20*120;i++)fw.tick(0.05);return{res,ingots:(S.inv.iron_ingot||0)-before};});
 check('placements',r.res.every(x=>x===''));check('ingots delivered ('+r.ingots+')',r.ingots>40);
 await p.click('#msBtn');await p.waitForTimeout(300);check('goals list renders',(await p.$$('#pbody .card')).length===10);
 // planner maths (pure functions, no factory state)
 const pm=await p.evaluate(()=>{const f=(res,steps)=>plFwd({res,p:1,ex:'drill1',n:1,clock:100,steps:steps.map(r=>({r,share:100}))});
  const a=f('iron',['r_iron_ingot','r_iron_plate']),b=f('copper',['r_copper_ingot','r_wire','r_cable']),c=(PL.locked=true,plRev('motor',10,{}));PL.locked=false;
  const n=it=>{const r=c.rows.find(x=>x.item===it);return r&&+r.n.toFixed(3);};
  return{a:[a.srcRate,...a.steps.map(s=>s.n),a.left.iron_plate,a.used],b:[...b.steps.map(s=>s.n),b.left.cable],c:[n('motor'),n('rotor'),n('stator')]};});
 check('planner: iron node → 2 smelters, 2 presses, 40 plates ('+pm.a+')',pm.a.join()==='60,2,2,40,1');
 check('planner: copper node → 2/4/2 machines, 60 cable ('+pm.b+')',pm.b.join()==='2,4,2,60');
 check('planner: 10 motors/min → 2 motor, 5 rotor, 4 stator assemblers ('+pm.c+')',pm.c.join()==='2,5,4');
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
 await p.evaluate(()=>{localStorage.removeItem('frontierworks_plan');PL=plDefault();ACT.closePanel();});
 const sw=await p.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return !!reg.active;});check('service worker active',sw);
 await p.waitForTimeout(500);await ctx.setOffline(true);await p.reload();await p.waitForTimeout(1500);
 check('works offline',await p.evaluate(()=>!!window.__fw&&document.getElementById('cv').width>0));
 await ctx.setOffline(false);
 check('no page errors',errs.length===0);
 for(const [n,v] of ok)console.log((v?'PASS ':'FAIL ')+n);if(errs.length)console.log(errs);
 await b.close();server.close();process.exit(ok.every(x=>x[1])?0:1);
})();
