'use strict';
/* ================= PLANNER =================
   Paper-planning tool (☰ Menu → Production planner). Pure maths on the recipe and building data:
   it never reads or changes the factory. Two modes:
   - fwd ("From a node"): extractor on a node → chain of steps → how many machines use it fully.
   - rev ("For a target"): wanted item per minute → every machine and raw resource needed.
   Plans are kept in their own localStorage key, separate from the game save. */
const PLAN_KEY='frontierworks_plan';
const PL_MACH=['smelter','press','assembler','foundry','refinery','fabricator','blender'];
const PL_RES=[...Object.keys(NODE_T),'water'];
const plResItem=res=>res==='water'?'water':NODE_T[res][0];
const PL_RAW=new Set(PL_RES.map(plResItem));
const PL_EPS=1e-6;
function plDefault(){return{mode:'fwd',locked:false,fwd:{res:'iron',p:1,ex:'drill1',n:1,clock:100,steps:[]},rev:{targets:[{item:'iron_plate',rate:60}],pick:{}},pow:{mw:100,gen:'burner',fuel:'coal',self:1}};}
/* Several plans at once (Session 37b): PLS.list holds plans (each: name, mode, fwd/rev/pow, ticks); PL is the active one (same object).
   Older single-plan storage becomes the first plan. */
function plNorm(o){const d=plDefault();o=o||{};return{name:typeof o.name==='string'?o.name:'',mode:['fwd','rev','pow'].includes(o.mode)?o.mode:'fwd',locked:!!o.locked,fwd:Object.assign(d.fwd,o.fwd),rev:Object.assign(d.rev,o.rev),pow:Object.assign(d.pow,o.pow),done:o.done&&typeof o.done==='object'?o.done:{},doneSig:o.doneSig||''};}
let PLS={list:[],cur:0},PL;
try{const s=localStorage.getItem(PLAN_KEY);if(s){const o=JSON.parse(s);if(Array.isArray(o.list)&&o.list.length)PLS={list:o.list.map(plNorm),cur:Math.max(0,Math.min(o.cur|0,o.list.length-1))};else PLS={list:[plNorm(o)],cur:0};}}catch(e){PLS={list:[],cur:0};}
if(!PLS.list.length)PLS={list:[plNorm()],cur:0};
PL=PLS.list[PLS.cur];
const plEsc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function plName(p){if(p.name)return p.name;if(p.mode==='fwd')return IT[plResItem(p.fwd.res)].n+' node';if(p.mode==='rev')return p.rev.targets.map(t=>IT[t.item]?IT[t.item].n:'?').join(' + ');return`Power ${fmt(p.pow.mw)} MW`;}
const plPristine=p=>!p.name&&JSON.stringify(plNorm(p))===JSON.stringify(plNorm());
function plNewTab(){if(plPristine(PL))return;if(PLS.list.length>=12){PLS.list.splice(0,1);}const p=plNorm();PLS.list.push(p);PLS.cur=PLS.list.length-1;PL=p;}
function plTabs(){return`<div class="pltabs">${PLS.list.map((p,i)=>`<button class="btn chip pltab ${i===PLS.cur?'on':''}" data-act="plTab" data-v="${i}">${plEsc(plName(p))}</button>`).join('')}<button class="btn chip" data-act="plNew" title="Start another plan">＋ New plan</button></div>
 <div class="pltabs plctl"><button class="btn chip" data-act="plRen">✎ Rename</button>${PLS.list.length>1?'<button class="btn chip" data-act="plDelPlan">✕ Delete this plan</button>':''}</div>`;}
function plSave(){try{localStorage.setItem(PLAN_KEY,JSON.stringify({v:2,list:PLS.list,cur:PLS.cur}));}catch(e){}}

/* ---------- visibility (unlocked only, unless "Show locked") ---------- */
const plRecOk=r=>PL.locked||ur(r.id);
const plBOk=id=>PL.locked||ub(id);
const plLock=ok=>ok?'':' 🔒';
function plExtractors(res){const all=res==='water'?['wpump']:res==='oil'?['opump']:['drill1','drill2','drill3'];const vis=all.filter(plBOk);return vis.length?vis:all;}
function plFix(){
 const f=PL.fwd;if(!PL_RES.includes(f.res))f.res='iron';if(!PUR[f.p])f.p=1;
 const ex=plExtractors(f.res);if(!ex.includes(f.ex))f.ex=ex[0];
 f.n=Math.max(1,Math.min(99,Math.round(+f.n||1)));f.clock=Math.max(10,Math.min(250,Math.round(+f.clock||100)));
 f.steps=(f.steps||[]).filter(s=>s&&RC[s.r]);
 const r=PL.rev;r.pick=r.pick||{};if(!Array.isArray(r.targets))r.targets=[{item:r.item||'iron_plate',rate:+r.rate||60}];delete r.item;delete r.rate;
 const tg=plTargets();r.targets=r.targets.filter(t=>t&&IT[t.item]);if(!r.targets.length)r.targets=[{item:'iron_plate',rate:60}];
 for(const t of r.targets){t.rate=Math.max(0.1,Math.min(1e5,+t.rate||60));if(!tg.includes(t.item))t.item=tg.includes('iron_plate')?'iron_plate':tg[0];}
 const w=PL.pow;w.mw=Math.max(0.1,Math.min(1e6,+w.mw||100));const gens=plGens();if(!gens.includes(w.gen))w.gen=gens[0];if(!B[w.gen].fuels.includes(w.fuel))w.fuel=B[w.gen].fuels[0];w.self=w.self?1:0;
}

/* Biomes where a resource is most common (new maps only) */
const plWhere=res=>BIOMES.map(b=>[b.res[res]||0,b.n]).sort((a,b)=>b[0]-a[0]).slice(0,2).map(x=>x[1]).join(' and ');

/* ---------- maths ---------- */
const PL_GENS=['burner','steam','turbine','reactor'];
function plGens(){const v=PL_GENS.filter(plBOk);return v.length?v:['burner'];}
/* Extractors for raw resources (best unlocked, on normal nodes / water), and the power they draw */
function plExtract(raw){const list=[];let power=0;
 for(const k in raw){const res=PL_RES.find(x=>plResItem(x)===k);if(!res)continue;const ex=plExtractors(res),best=ex.filter(id=>ub(id)).pop()||ex[0],n=raw[k]/(B[best].rate*60);
  list.push({k,id:best,n,rate:raw[k]});power+=plPower(B[best].pw,n);}
 return{list,power};}
/* Power plant for a demand: generators, fuel/water/waste per minute, and the chain that makes the fuel.
   Generators burn fuel in proportion to load: fuel/min = MW·60 / energy per item. With self=1 the fuel chain's own
   power (machines + drills/pumps) is added to the demand, repeated until it settles. */
function plPow(p){
 const d=B[p.gen],en=IT[p.fuel].e;let own=0,o;
 for(let i=0;i<12;i++){const tot=p.mw+(p.self?own:0),fuelMin=tot*60/en,water=d.water?tot*60*d.water:0;
  const chain=PL_RAW.has(p.fuel)?{rows:[],raw:{[p.fuel]:fuelMin},by:{},none:{},power:0,mach:{}}:plRev(p.fuel,fuelMin,PL.rev.pick);
  const raw=Object.assign({},chain.raw);if(water)raw.water=(raw.water||0)+water;const ex=plExtract(raw);
  o={d,tot,fuelMin,water,waste:p.fuel==='fuel_rod'?fuelMin*10:0,n:tot/d.cap,chain,ex,own:chain.power+ex.power};
  if(!p.self||Math.abs(o.own-own)<0.005)break;own=o.own;}
 return o;
}
const plPerMin=(r,amt)=>amt*60/r.t;   // per machine at 100% clock
function plPower(pw,n){const full=Math.floor(n+PL_EPS),fr=n-full;return pw*full+(fr>PL_EPS?pw*Math.pow(fr,1.6):0);}
function plSourceRate(f){const d=B[f.ex],pur=f.res==='water'?1:PUR[f.p][0];return d.rate*pur*60*(f.clock/100)*f.n;}
function plBelt(item,rate){
 const ids=IT[item].f?['pipe1','pipe2']:['belt1','belt2','belt3','belt4','belt5'];
 for(const id of ids)if(B[id].spd*60>=rate-PL_EPS)return{id,lines:1};
 const top=ids[ids.length-1];return{id:top,lines:Math.ceil(rate/(B[top].spd*60)-PL_EPS)};
}
/* Forward: source → steps. Each step takes `share`% of what is left of its feed item; other inputs come from what is
   left over, and anything missing is reported as "bring from elsewhere". Fractional machine counts are kept exact. */
function plFwd(f){
 const src=plResItem(f.res),srcRate=plSourceRate(f),pool={[src]:srcRate};
 const out={src,srcRate,power:B[f.ex].pw*Math.pow(f.clock/100,1.6)*f.n,steps:[],mach:{[f.ex]:f.n},short:{}};
 for(const st of f.steps){
  const r=RC[st.r],row={st,r,ok:false,before:Object.assign({},pool)};out.steps.push(row);
  const ins=Object.keys(r.i),feed=ins.includes(st.feed)&&pool[st.feed]>PL_EPS?st.feed:ins.find(k=>pool[k]>PL_EPS);
  if(!feed){row.err='Nothing left to feed this. None of its inputs are left over from the steps above.';continue;}
  const share=Math.max(0,Math.min(100,st.share==null?100:+st.share))/100,n=pool[feed]*share/plPerMin(r,r.i[feed]);
  Object.assign(row,{ok:true,feed,n,ins:{},outs:{},need:{}});
  for(const k of ins){const want=n*plPerMin(r,r.i[k]),have=Math.min(want,pool[k]||0);row.ins[k]=want;
   if(pool[k]!==undefined){pool[k]-=have;if(pool[k]<PL_EPS)delete pool[k];}
   if(want-have>PL_EPS){row.need[k]=want-have;out.short[k]=(out.short[k]||0)+want-have;}}
  for(const k in r.o){const v=n*plPerMin(r,r.o[k]);row.outs[k]=v;pool[k]=(pool[k]||0)+v;}
  row.power=plPower(B[r.m].pw,n);out.power+=row.power;out.mach[r.m]=(out.mach[r.m]||0)+Math.ceil(n-PL_EPS);
 }
 out.left=pool;out.used=srcRate>0?1-(pool[src]||0)/srcRate:0;return out;
}
/* Recipes that make `item` (main product first, then byproduct recipes; standard before alternates). */
function plProducers(item){return RL.filter(r=>r.o[item]&&!r.i[item]&&plRecOk(r)).sort((a,b)=>((Object.keys(a.o)[0]!==item)-(Object.keys(b.o)[0]!==item))||(a.alt-b.alt));}
function plPick(item,pick){const ps=plProducers(item);if(!ps.length)return null;return ps.find(r=>r.id===pick[item])||ps[0];}
function plTargets(){const s=new Set();for(const r of RL)if(plRecOk(r))for(const k in r.o)if(!PL_RAW.has(k)&&!r.i[k])s.add(k);return[...s].sort((a,b)=>IT[a].n.localeCompare(IT[b].n));}
/* Reverse: target per minute → machines per item (summed across the whole tree), raw resources, byproducts. */
/* Reverse planner for one or more end products [{item,rate}]: shared parts are summed (e.g. Steel Ingot for both Steel Beam and Steel Pipe).
   Items are processed consumers-first (reverse DFS post-order over all targets), so every demand is complete before its producer is sized. */
function plRev(item,rate,pick){return plRevMulti([{item,rate}],pick);}
/* Byproducts are used inside the same factory (Session 37c): an item that some step makes as a byproduct covers demand for it (as an input,
   raw resource or end product) before more machines or mining are planned. Using it changes machine counts and so the byproduct amount,
   so the plan is recalculated until it settles. out.by = byproducts left over, out.used = byproducts used inside the factory. */
/* Items that no recipe makes as its main output (e.g. Heavy Oil Residue) are "byproduct-only": they're taken from the plan's byproducts first,
   and only if those don't cover the need is a recipe that makes them as a byproduct added for the rest (Session 37d; before, the planner
   picked the Plastic recipe "to make residue" and its plastic then wrongly replaced the real plastic machines). */
function plRevMulti(targets,pick){let credit={},out=null,fb=new Set();
 for(let round=0;round<3;round++){
  for(let k=0;k<40;k++){out=plRevOnce(targets,pick,credit,fb);const nb=out.byAll;let diff=0;for(const x of new Set([...Object.keys(nb),...Object.keys(credit)]))diff=Math.max(diff,Math.abs((nb[x]||0)-(credit[x]||0)));
   if(diff<1e-7)break;credit=nb;}
  const more=Object.keys(out.none).filter(k=>!fb.has(k)&&plProducers(k).length);if(!more.length)break;for(const k of more)fb.add(k);}
 return out;}
function plRevOnce(targets,pick,credit,fb){
 const order=[],state={},rec={},avail=Object.assign({},credit||{}),used={};
 const pickFor=it=>{const r=plPick(it,pick);if(!r)return null;if(Object.keys(r.o)[0]===it||pick[it]===r.id)return r;
  if(fb&&fb.has(it))return plProducers(it).sort((a,b)=>b.o[it]/b.t-a.o[it]/a.t)[0];return null;};   // fallback: the recipe that makes the most of it
 const take=(k,v)=>{const u=Math.min(v,avail[k]||0);if(u>PL_EPS){avail[k]-=u;used[k]=(used[k]||0)+u;return v-u;}return v;};
 const visit=it=>{if(state[it]||PL_RAW.has(it))return;state[it]=1;const r=pickFor(it);if(r){rec[it]=r;for(const k in r.i)visit(k);}order.push(it);};
 for(const t of targets)visit(t.item);
 const dem={},done=new Set(),out={rows:[],raw:{},by:{},none:{},power:0,mach:{},goal:{}};
 for(const t of targets){dem[t.item]=(dem[t.item]||0)+t.rate;out.goal[t.item]=(out.goal[t.item]||0)+t.rate;}
 const add=(o,k,v)=>{o[k]=(o[k]||0)+v;};const byAll={};
 for(let i=order.length-1;i>=0;i--){const it=order[i];done.add(it);const need=take(it,dem[it]||0);if(need<=PL_EPS)continue;const r=rec[it];
  if(!r){add(out.none,it,need);continue;}
  const n=need/plPerMin(r,r.o[it]);out.rows.push({item:it,r,n,rate:need});out.power+=plPower(B[r.m].pw,n);add(out.mach,r.m,Math.ceil(n-PL_EPS));
  for(const k in r.i){const v=n*plPerMin(r,r.i[k]);if(PL_RAW.has(k))add(out.raw,k,v);else if(done.has(k))add(out.none,k,v);else add(dem,k,v);}
  for(const k in r.o)if(k!==it)add(byAll,k,n*plPerMin(r,r.o[k]));
 }
 for(const k of Object.keys(out.raw)){out.raw[k]=take(k,out.raw[k]);if(out.raw[k]<=PL_EPS)delete out.raw[k];}
 for(const k of Object.keys(out.none)){out.none[k]=take(k,out.none[k]);if(out.none[k]<=PL_EPS)delete out.none[k];}
 for(const k in byAll){const left=byAll[k]-(used[k]||0);if(left>PL_EPS)out.by[k]=left;}
 out.used=used;out.byAll=byAll;return out;
}

/* ---------- UI ---------- */
const plN=n=>(Math.round(n*100)/100).toString();
const plSel=(key,opts,val,cls)=>`<select data-pl="${key}" ${cls?`class="${cls}"`:''}>${opts}</select>`.replace(`value="${val}"`,`value="${val}" selected`);
const plOpt=(v,t)=>`<option value="${v}">${t}</option>`;
const plNum=(key,val,min,max,step)=>`<input type="number" inputmode="decimal" data-pl="${key}" value="${val}" min="${min}" max="${max}" step="${step||1}">`;
const plRow=(a,b)=>`<div class="row"><span>${a}</span><span>${b}</span></div>`;
function plBeltTxt(item,rate){const b=plBelt(item,rate);return`${b.lines>1?b.lines+'× ':''}${B[b.id].n.replace('Conveyor ','Belt ').replace('Pipeline ','Pipe ')}${plLock(ub(b.id))}`;}
const plRate=(k,v,cls)=>`<div class="row ${cls||''}"><span>${nm(k)}</span><span>${fmt(v)}/min <small class="muted">· ${plBeltTxt(k,v)}</small></span></div>`;
function plCount(n,mid){
 if(n<=PL_EPS)return`<div class="plbig">0 × ${B[mid].n}</div>`;
 const c=Math.max(1,Math.ceil(n-PL_EPS)),full=Math.floor(n+PL_EPS),fr=n-full;
 let split=fr<=PL_EPS?'all at 100%':full?`${full} at 100% + 1 at ${Math.round(fr*100)}%`:`1 at ${Math.round(fr*100)}%`;
 if(fr>PL_EPS&&c>1)split+=` <small>(or all ${c} at ${Math.round(n/c*100)}%)</small>`;
 return`<div class="plbig">${c} × ${B[mid].n}${plLock(ub(mid))}</div><div class="muted">${split} · exactly ${plN(n)}</div>`;
}
function plRecOpts(list){
 let h='';for(const mt of PL_MACH){const rs=list.filter(r=>r.m===mt);if(rs.length)h+=`<optgroup label="${B[mt].n}">${rs.map(r=>plOpt(r.id,r.n+plLock(ur(r.id)))).join('')}</optgroup>`;}
 return h;
}
/* In/Out lists for n machines running recipe r (per minute, with the belt/pipe each line needs) */
const plIO=(r,n)=>`<div class="plsub">In</div>`+Object.keys(r.i).map(k=>plRate(k,n*plPerMin(r,r.i[k]))).join('')+`<div class="plsub">Out</div>`+Object.keys(r.o).map(k=>plRate(k,n*plPerMin(r,r.o[k]))).join('');
/* summary: one building type per line (Session 39g: one long comma list ran off the panel on phones) */
const plMachBlock=m=>{const ks=Object.keys(m).filter(k=>m[k]>0).sort((a,b)=>m[b]-m[a]);return`<div class="plsub">Buildings</div>`+(ks.length?ks.map(k=>`<div class="row"><span>${B[k].n}${plLock(ub(k))}</span><span>${m[k]} ×</span></div>`).join(''):'<div class="muted">—</div>');};
function planHtml(){
 plFix();
 let h=plTabs()+`<div class="chips" style="margin-bottom:8px"><button class="btn chip ${PL.mode==='fwd'?'on':''}" data-act="plMode" data-v="fwd">From a node →</button><button class="btn chip ${PL.mode==='rev'?'on':''}" data-act="plMode" data-v="rev">← For a target</button><button class="btn chip ${PL.mode==='pow'?'on':''}" data-act="plMode" data-v="pow">⚡ Power</button><button class="btn chip ${PL.locked?'on':''}" data-act="plLocked">${PL.locked?'🔓':'🔒'} Show locked</button></div>`;
 return h+(PL.mode==='fwd'?plFwdHtml():PL.mode==='rev'?plRevHtml():plPowHtml());
}
function plFwdHtml(){
 const f=PL.fwd,o=plFwd(f);
 let h=`<div class="muted">Start with a drill on a node, then add machines step by step. The planner works out how many of each you need to use everything. It's maths only: nothing is built.</div>`;
 h+=`<h4>Source</h4><div class="card">`;
 h+=plRow('Resource',plSel('f.res',PL_RES.map(r=>plOpt(r,IT[plResItem(r)].n)).join(''),f.res));
 if(f.res!=='water')h+=plRow('Purity',plSel('f.p',PUR.map((p,i)=>plOpt(i,`${p[1]} (×${p[0]})`)).join(''),f.p));
 h+=plRow('Extractor',plSel('f.ex',plExtractors(f.res).map(id=>plOpt(id,B[id].n+plLock(ub(id)))).join(''),f.ex));
 h+=plRow('How many',plNum('f.n',f.n,1,99));
 h+=plRow('Clock speed %',plNum('f.clock',f.clock,10,250,5));
 if(f.clock>100&&!S.oc)h+=`<div class="muted">Above 100% needs overclocking (unlocks with “Steelworks”).</div>`;
 h+=plRate(o.src,o.srcRate)+`</div>`;
 h+=`<h4>Steps</h4>`;
 o.steps.forEach((row,i)=>{
  const cands=RL.filter(r=>plRecOk(r)&&Object.keys(r.i).some(k=>row.before[k]>PL_EPS));if(!cands.includes(row.r))cands.push(row.r);
  const tk='s'+i+':'+row.r.id;
  h+=`<div class="card ${plDone(tk)?'pldone':''}"><div class="row"><b>${plTickBtn(tk)} Step ${i+1}</b><button class="btn chip" data-act="plDel" data-v="${i}" title="Remove step">✕</button></div>`;
  h+=plSel(`s.${i}.r`,plRecOpts(cands),row.r.id,'wide');
  if(!row.ok){h+=`<div class="plbad">${row.err}</div></div>`;return;}
  const feeds=Object.keys(row.r.i).filter(k=>row.before[k]>PL_EPS);
  h+=plRow(`Use % of the ${feeds.length>1?plSel(`s.${i}.feed`,feeds.map(k=>plOpt(k,IT[k].n)).join(''),row.feed):IT[row.feed].n} left`,plNum(`s.${i}.share`,row.st.share==null?100:row.st.share,0,100,5));
  h+=plCount(row.n,row.r.m);
  h+=`<div class="plsub">In</div>`+Object.keys(row.ins).map(k=>plRate(k,row.ins[k])).join('');
  for(const k in row.need)h+=`<div class="plbad">Missing ${fmt(row.need[k])}/min ${IT[k].n}: bring it from another line.</div>`;
  h+=`<div class="plsub">Out</div>`+Object.keys(row.outs).map(k=>plRate(k,row.outs[k])).join('');
  h+=plRow('Power',fmt(row.power)+' MW')+`</div>`;
 });
 h+=`<button class="btn" data-act="plAdd">+ Add step</button>${f.steps.length?' <button class="btn" data-act="plClear">Clear steps</button>':''}`;
 const used=Math.round(o.used*100);
 h+=`<h4>Summary</h4><div class="card">`;
 h+=`<div class="${used>=100?'plok':''}" style="margin-bottom:4px"><b>${used>=100?'✓ ':''}Node output used: ${used}%</b></div>`;
 h+=plMachBlock(o.mach)+plRow('Total power',fmt(o.power)+' MW')+plPlantLine(o.power);
 const lk=Object.keys(o.left);
 h+=`<div class="plsub">Output / left over</div>`+(lk.length?lk.map(k=>plRate(k,o.left[k])).join(''):'<div class="muted">nothing</div>');
 const sk=Object.keys(o.short);
 if(sk.length)h+=`<div class="plsub">Bring in from elsewhere</div>`+sk.map(k=>plRate(k,o.short[k],'plbad')).join('');
 return h+`</div>`;
}
function plRevHtml(){
 const r=PL.rev,o=plRevMulti(r.targets,r.pick),opts=plTargets().map(k=>plOpt(k,IT[k].n)).join('');
 let h=`<div class="muted">Pick one or more end products and how many of each per minute. The planner combines them: shared parts are counted once, with all machines, raw resources and power.</div>`;
 h+=`<h4>End products</h4><div class="card">`+r.targets.map((t,i)=>`<div class="pltarget">${plSel(`r.t.${i}.item`,opts,t.item,'wide')}<div class="row"><span>Per minute</span><span>${plNum(`r.t.${i}.rate`,t.rate,0.1,100000,'any')}${r.targets.length>1?` <button class="btn chip" data-act="plTDel" data-v="${i}" title="Remove">✕</button>`:''}</span></div></div>`).join('')+`<button class="btn" data-act="plTAdd">+ Add product</button></div>`;
 h+=`<h4>Machines</h4>`;
 for(const row of o.rows){
  const ps=plProducers(row.item);
  const g=o.goal[row.item],tk='m:'+row.item;h+=`<div class="card ${plDone(tk)?'pldone':''}"><div class="row"><b>${plTickBtn(tk)} ${nm(row.item)}${g?' <span class="plgoal">🎯 end product</span>':''}</b><span>${fmt(row.rate)}/min</span></div>${g&&row.rate-g>PL_EPS?`<div class="muted">${fmt(g)} as end product + ${fmt(row.rate-g)} used by other steps</div>`:''}`;
  if(ps.length>1)h+=plSel(`r.pick.${row.item}`,plRecOpts(ps),row.r.id,'wide');else h+=`<div class="muted">${row.r.n}</div>`;
  if(o.used&&o.used[row.item]>PL_EPS)h+=`<div class="plok" style="margin-top:2px">♻ ${fmt(o.used[row.item])}/min more comes from byproducts of this factory</div>`;
  h+=plCount(row.n,row.r.m)+plIO(row.r,row.n)+`</div>`;
 }
 const rk=Object.keys(o.raw);
 h+=`<h4>Raw resources</h4><div class="card">`+(rk.length?rk.map(k=>{
  const res=PL_RES.find(x=>plResItem(x)===k),ex=plExtractors(res),best=ex.filter(id=>ub(id)).pop()||ex[0],per=B[best].rate*60;
  return plRate(k,o.raw[k])+`<div class="muted" style="margin:-2px 0 4px">≈ ${plN(o.raw[k]/per)} × ${B[best].n} on ${k==='water'?'water':'normal nodes'}${S.gen===2&&res!=='water'?` · found mostly in ${plWhere(res)}`:''}</div>`;}).join(''):'<div class="muted">none</div>')+`</div>`;
 const uk=Object.keys(o.used||{}).filter(k=>o.used[k]>PL_EPS);
 if(uk.length)h+=`<h4>Byproducts used here</h4><div class="card"><div class="muted">These come out of one step and go straight into another, so they don't need extra machines or mining.</div>${uk.map(k=>plRate(k,o.used[k],'plok')).join('')}</div>`;
 const bk=Object.keys(o.by),nk=Object.keys(o.none);
 if(bk.length)h+=`<h4>Byproducts left over</h4><div class="card"><div class="muted">These come out too. Belt them on, recycle them or burn them in an Incinerator.</div>${bk.map(k=>plRate(k,o.by[k])).join('')}</div>`;
 if(nk.length)h+=`<h4>Bring in from elsewhere</h4><div class="card"><div class="muted">No ${PL.locked?'':'unlocked '}recipe makes these here.</div>${nk.map(k=>plRate(k,o.none[k],'plbad')).join('')}</div>`;
 const ex=plExtract(o.raw),tp=o.power+ex.power;
 h+=`<h4>Summary</h4><div class="card">`+plMachBlock(o.mach)+plRow('Machines power',fmt(o.power)+' MW')+plRow('Drills & pumps (estimate)',fmt(ex.power)+' MW')+plRow('<b>Total power</b>',`<b>${fmt(tp)} MW</b>`)+plPlantLine(tp)+`</div>`;
 return h;
}
/* One line under a plan's power total: what plant covers it, plus a jump to the Power tab with that demand */
function plPlantLine(mw){if(mw<=PL_EPS)return'';const p=Object.assign({},PL.pow,{mw}),o=plPow(p);
 return`<div class="row"><span>Power plant</span><span>≈ ${Math.ceil(o.n-PL_EPS)} × ${B[p.gen].n} <small class="muted">(${fmt(o.fuelMin)} ${IT[p.fuel].n}/min)</small></span></div><button class="btn chip" data-act="plPowFrom" data-v="${Math.round(mw*10)/10}">⚡ Plan the power for this</button>`;}
function plPowHtml(){
 const p=PL.pow,o=plPow(p),d=o.d;
 let h=`<div class="muted">How many generators a power demand needs, how much fuel and water they burn, and the chain that makes the fuel. Generators burn fuel in proportion to the power actually drawn.</div>`;
 h+=`<h4>Demand</h4><div class="card">`+plRow('Power needed (MW)',plNum('w.mw',p.mw,0.1,1000000,'any'));
 h+=`<div class="plsub">Generator</div>`+plSel('w.gen',plGens().map(id=>plOpt(id,`${B[id].n} (${B[id].cap} MW)${plLock(ub(id))}`)).join(''),p.gen,'wide');
 if(d.fuels.length>1)h+=plRow('Fuel',plSel('w.fuel',d.fuels.map(f=>plOpt(f,IT[f].n)).join(''),p.fuel));
 h+=plRow('Add the fuel chain’s own power',plSel('w.self',plOpt(1,'Yes')+plOpt(0,'No'),p.self))+`</div>`;
 h+=`<h4>Power plant</h4><div class="card ${plDone('w:plant')?'pldone':''}"><div class="row"><b>${plTickBtn('w:plant')} ${B[p.gen].n}</b></div>`+plCount(o.n,p.gen).replace(' at 100%',' at full load').replace(/ at (\d+)%/g,' at $1% load');
 h+=plRow('Total power to make',`${fmt(o.tot)} MW`)+(p.self?`<div class="muted">Includes ${fmt(o.own)} MW for the fuel chain below.</div>`:'');
 h+=`<div class="plsub">Burns</div>`+plRate(p.fuel,o.fuelMin);
 if(o.water)h+=plRate('water',o.water);
 if(o.waste)h+=`<div class="plbad">Makes ${fmt(o.waste)}/min ${IT.waste.n}. Belt it away (storage or incinerator), or the reactor stops.</div>`;
 h+=`</div>`;
 const c=o.chain;
 if(c.rows.length){h+=`<h4>Fuel chain</h4>`;for(const row of c.rows){const tk='wc:'+row.item;h+=`<div class="card ${plDone(tk)?'pldone':''}"><div class="row"><b>${plTickBtn(tk)} ${nm(row.item)}</b><span>${fmt(row.rate)}/min</span></div><div class="muted">${row.r.n}</div>${plCount(row.n,row.r.m)}${plIO(row.r,row.n)}</div>`;}
  const bk=Object.keys(c.by);if(bk.length)h+=`<div class="card"><div class="plsub">Byproducts</div>${bk.map(k=>plRate(k,c.by[k])).join('')}</div>`;
  const nk=Object.keys(c.none);if(nk.length)h+=`<div class="card"><div class="plsub">Bring in from elsewhere</div>${nk.map(k=>plRate(k,c.none[k],'plbad')).join('')}</div>`;}
 h+=`<h4>Drills & pumps</h4><div class="card ${plDone('w:ex')?'pldone':''}">${o.ex.list.length?`<div class="row"><b>${plTickBtn('w:ex')} Drills & pumps</b></div>`:''}`+(o.ex.list.length?o.ex.list.map(x=>plRate(x.k,x.rate)+`<div class="muted" style="margin:-2px 0 4px">≈ ${plN(x.n)} × ${B[x.id].n}${plLock(ub(x.id))} ${x.k==='water'?'on water':'on normal nodes'}${S.gen===2&&x.k!=='water'?` · found mostly in ${plWhere(PL_RES.find(r=>plResItem(r)===x.k))}`:''}</div>`).join(''):'<div class="muted">none</div>')+`</div>`;
 h+=`<h4>Summary</h4><div class="card">`+plMachBlock(Object.assign({[p.gen]:Math.ceil(o.n-PL_EPS)},c.mach))+plRow('Power for others',`${fmt(p.mw)} MW`)+`</div>`;
 return h;
}
/* Open the planner set to a node / existing drill: resource, purity, extractor (given or best unlocked), clock, one first step */
const d3res=e=>B[e.d].water?'water':e.node?e.node.t:'iron';
function planFrom(res,p,ex,clock){plNewTab();const f=PL.fwd,list=plExtractors(res);
 f.res=res;f.p=p==null?1:p;f.ex=ex&&list.includes(ex)?ex:(list.filter(id=>ub(id)).pop()||list[0]);f.n=1;f.clock=Math.round((clock||1)*100);f.steps=[];
 PL.mode='fwd';plFix();plAddStep();plSave();plShow();}
/* Default recipe for a new step: use the biggest leftover, preferring recipes whose inputs are all available, then standard ones. */
function plAddStep(){
 const o=plFwd(PL.fwd),left=Object.keys(o.left).sort((a,b)=>o.left[b]-o.left[a]);
 for(const k of left){const rs=RL.filter(r=>plRecOk(r)&&r.i[k]).sort((a,b)=>(Object.keys(b.i).every(x=>o.left[x])-Object.keys(a.i).every(x=>o.left[x]))||(a.alt-b.alt));
  if(rs.length){PL.fwd.steps.push({r:rs[0].id,feed:k,share:100});return true;}}
 return false;
}
function plSet(key,v){
 const p=key.split('.');
 if(p[0]==='f'){PL.fwd[p[1]]=p[1]==='res'||p[1]==='ex'?v:+v;}
 else if(p[0]==='s'){const st=PL.fwd.steps[+p[1]];if(!st)return;if(p[2]==='share')st.share=Math.max(0,Math.min(100,+v||0));else st[p[2]]=v;}
 else if(p[0]==='w'){PL.pow[p[1]]=p[1]==='gen'||p[1]==='fuel'?v:+v;}
 else if(p[0]==='r'){if(p[1]==='pick')PL.rev.pick[p[2]]=v;else if(p[1]==='t'){const t=PL.rev.targets[+p[2]];if(t)t[p[3]]=p[3]==='rate'?+v:v;}}
 plFix();
}
/* Left-pinned planner (Session 36c): its own window on the left (OPT.plLeft), so the normal right panel keeps opening/closing as usual.
   OPT.plOpen remembers whether it was open, so it comes back after a reload. */
function plLeftOn(){return !!OPT.plLeft&&!!OPT.plOpen;}
function plRenderLeft(top){const p=$('lpanel');if(!plLeftOn()){p.classList.add('hidden');document.body.classList.remove('plleft');return;}
 p.classList.remove('hidden');document.body.classList.add('plleft');const b=$('lbody'),y=b.scrollTop;b.innerHTML=planHtml();b.scrollTop=top?0:y;}
const plRefresh=()=>{plSave();if(UI.panel&&UI.panel.kind==='plan')renderPanel(true);if(plLeftOn())plRenderLeft();};
function plOpen(top){if(OPT.plLeft){OPT.plOpen=true;saveOpt();plRenderLeft(top);}else{openPanel('plan');if(top)$('pbody').scrollTop=0;}}
function plShow(){plOpen(true);}
/* Tick boxes on plan steps: a temporary "built that already" mark. Kept while the plan stays the same; a new plan (other node/extractor in
   "From a node", other end products in "For a target") clears them. */
function plSig(){return PL.mode==='fwd'?'f|'+PL.fwd.res+'|'+PL.fwd.p+'|'+PL.fwd.ex:PL.mode==='rev'?'r|'+PL.rev.targets.map(t=>t.item).sort().join(','):'w|'+PL.pow.gen+'|'+PL.pow.fuel;}
function plDone(k){if(PL.doneSig!==plSig()){PL.doneSig=plSig();PL.done={};}return !!(PL.done&&PL.done[k]);}
function plTickBtn(k){const on=plDone(k);return`<button class="btn chip pltick ${on?'on':''}" data-act="plTick" data-v="${k}" title="${on?'Mark as not built yet':'Mark as built'}">${on?'☑':'☐'}</button>`;}
document.addEventListener('change',ev=>{const k=ev.target.dataset&&ev.target.dataset.pl;if(!k)return;plSet(k,ev.target.value);plRefresh();});
Object.assign(ACT,{
 openPlan:()=>plOpen(false),
 plTab:v=>{PLS.cur=Math.max(0,Math.min(+v,PLS.list.length-1));PL=PLS.list[PLS.cur];plRefresh();$('pbody').scrollTop=0;$('lbody').scrollTop=0;},
 plNew:()=>{const p=plNorm();if(PLS.list.length>=12)return toast('Up to 12 plans: delete one first');PLS.list.push(p);PLS.cur=PLS.list.length-1;PL=p;plRefresh();},
 plRen:()=>{const n=prompt('Name of this plan',plName(PL));if(n!==null){PL.name=n.trim().slice(0,30);plRefresh();}},
 plDelPlan:()=>{if(PLS.list.length<2)return;if(!confirm(`Delete the plan “${plName(PL)}”?`))return;PLS.list.splice(PLS.cur,1);PLS.cur=Math.max(0,PLS.cur-1);PL=PLS.list[PLS.cur];plRefresh();},
 plPinLeft:()=>{OPT.plLeft=true;OPT.plOpen=true;saveOpt();if(UI.panel&&UI.panel.kind==='plan')closePanel();plRenderLeft(true);toast('Planner pinned. Other panels open and close as usual');},
 plUnpinLeft:()=>{OPT.plLeft=false;OPT.plOpen=false;saveOpt();plRenderLeft();openPanel('plan');},
 plCloseLeft:()=>{OPT.plOpen=false;saveOpt();plRenderLeft();},
 plTick:k=>{plDone(k);PL.done[k]=!PL.done[k];plRefresh();},
 plTAdd:()=>{const have=new Set(PL.rev.targets.map(t=>t.item)),k=plTargets().find(x=>!have.has(x))||'iron_plate';PL.rev.targets.push({item:k,rate:30});plRefresh();},
 plTDel:v=>{PL.rev.targets.splice(+v,1);plFix();plRefresh();},
 plMode:v=>{PL.mode=v;plRefresh();},
 plLocked:()=>{PL.locked=!PL.locked;plFix();plRefresh();},
 plPowFrom:v=>{const src=plName(PL);plNewTab();PL.name='Power for '+src.slice(0,18);PL.pow.mw=+v;PL.mode='pow';plFix();plRefresh();$('pbody').scrollTop=0;$('lbody').scrollTop=0;},
 plAdd:()=>{if(!plAddStep())toast(Object.keys(plFwd(PL.fwd).left).length?'Nothing can use what is left over. Try “Show locked”.':'Nothing left over to use');plRefresh();},
 plDel:v=>{PL.fwd.steps.splice(+v,1);plRefresh();},
 plClear:()=>{PL.fwd.steps=[];plRefresh();},
});
