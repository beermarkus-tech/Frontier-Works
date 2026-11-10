'use strict';
/* ================= UI ================= */
const UI={tool:null,rot:0,cat:'log',sel:null,panel:null};
const $=id=>document.getElementById(id);
let toastT=0;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600);}
const IICON={};
function itemIcon(id){if(IICON[id])return IICON[id];const c=document.createElement('canvas');c.width=c.height=40;const g=c.getContext('2d');g.translate(20,20);paintItem(g,id,30);return IICON[id]=c.toDataURL();}
const dot=it=>`<img class="ii" src="${itemIcon(it)}" alt="">`;
const nm=it=>dot(it)+IT[it].n;
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'k':(Math.round(n*10)/10).toString();
function costHtml(c,mult){mult=mult||1;const ks=Object.keys(c);if(!ks.length)return'<span class="cc">free</span>';return ks.map(k=>{const ok=(S.inv[k]||0)>=c[k]*mult;return`<span class="cc ${ok?'':'bad'}" title="${IT[k].n} — have ${fmt(S.inv[k]||0)}">${dot(k)}${c[k]*mult}</span>`;}).join('');}
function footprint(id,tx,ty){const w=B[id].w;return{x:tx-Math.floor((w-1)/2),y:ty-Math.floor((w-1)/2)};}
const CAT_ICON={log:'<rect x="2" y="9" width="20" height="6" rx="3"/><path d="M7 12h.01M12 12h.01M17 12h.01"/>',ext:'<path d="M14.5 3.5c3 0 6 3 6 6M3 21l9.5-9.5M8 5c3.5-2 8-1.5 11 1.5"/>',prod:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',pow:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'};
const TICON={};
function makeIcon(id){
 const S2=96,c=document.createElement('canvas');c.width=c.height=S2;const g=c.getContext('2d'),d=B[id];
 if(isLine(d.k)){const u=S2*0.5;g.lineCap='butt';const y=S2/2;
  if(d.k==='belt'){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=u*0.92;g.beginPath();g.moveTo(8,y);g.lineTo(S2-8,y);g.stroke();g.strokeStyle=d.col;g.lineWidth=u*0.84;g.stroke();g.strokeStyle='#202328';g.lineWidth=u*0.66;g.stroke();g.setLineDash([u*0.06,u*0.19]);g.strokeStyle='#454b55';g.lineWidth=u*0.6;g.stroke();g.setLineDash([]);
   const it=itemSprite('iron_plate',u*0.55);g.drawImage(it,S2/2-it.width/2,y-it.height/2);}
  else{g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=u*0.54;g.beginPath();g.moveTo(8,y);g.lineTo(S2-8,y);g.stroke();g.strokeStyle=d.col;g.lineWidth=u*0.46;g.stroke();g.strokeStyle='#3d8ee6';g.lineWidth=u*0.26;g.stroke();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=u*0.06;g.stroke();g.fillStyle=shade(d.col,-35);g.fillRect(S2/2-3,y-u*0.3,6,u*0.6);}}
 else if(d.k==='router'||d.k==='cross'){const u=S2*0.7;drawRouter(g,{d:id,k:d.k,dir:0},(S2-u)/2,(S2-u)/2,u);}
 else if(d.k==='pole'){const u=S2*0.8;drawPole(g,{d:id},(S2-u)/2,(S2-u)/2,u);}
 else{const w=d.w,u=S2/(w+0.55);g.translate(u*0.14,u*0.08);paintB(g,id,w*u,u);}
 return c.toDataURL();
}
const toolIcon=id=>TICON[id]||(TICON[id]=makeIcon(id));
let toolsKey='';
function buildCats(){$('cats').innerHTML=CATS.map(([k,n])=>`<button class="cat ${UI.cat===k?'on':''}" data-act="cat" data-v="${k}"><svg class="i" viewBox="0 0 24 24">${CAT_ICON[k]}</svg><span>${n}</span></button>`).join('');toolsKey='';buildTools();}
function buildTools(){
 const list=Object.values(B).filter(d=>d.cat===UI.cat&&ub(d.id)),key=UI.cat+':'+list.map(d=>d.id).join(',');
 if(key!==toolsKey){toolsKey=key;const el=$('tools');
  el.innerHTML=list.map(d=>`<button class="tool" data-act="tool" data-v="${d.id}" title="${d.n}"><img src="${toolIcon(d.id)}" alt=""><span>${d.n}</span></button>`).join('')||'<span class="muted" style="padding:10px">Nothing unlocked here yet — check Goals.</span>';}
 refreshTools();updInfo();
}
function refreshTools(){for(const b of $('tools').children){const id=b.dataset&&b.dataset.v;if(!id)continue;b.classList.toggle('poor',!afford(B[id].cost));b.classList.toggle('on',UI.tool===id);}}
function updInfo(){
 const t=UI.tool;let h;
 if(t==='del')h='<b>Dismantle</b><span class="hint">Tap to remove (full refund) · drag across belts, pipes & poles to clear them</span>';
 else if(t&&B[t])h=`<b>${B[t].n}</b>${costHtml(B[t].cost)}<span class="hint">${B[t].desc||''}</span>`;
 else h='<span class="hint">Tap anything to inspect · drag to pan · pinch or scroll to zoom · pick a building below to place it</span>';
 if($('info').__h!==h){$('info').__h=h;$('info').innerHTML=h;}
 $('fInspect').classList.toggle('on',!t);$('fDel').classList.toggle('on',t==='del');$('fRot').firstElementChild.style.transform=`rotate(${UI.rotA}deg)`;
}
function setTool(t){UI.tool=t;linePrev=null;refreshTools();updInfo();}
function setHTML(el,h){if(el&&el.__h!==h){el.__h=h;el.innerHTML=h;}}

/* ---------- panels ---------- */
function openPanel(kind,arg){const same=UI.panel&&UI.panel.kind===kind&&UI.panel.arg===arg;UI.panel={kind,arg};const p=$('panel');p.classList.remove('hidden');if(!same){p.classList.remove('in');void p.offsetWidth;p.classList.add('in');$('pbody').scrollTop=0;}renderPanel(true);}
function closePanel(){UI.panel=null;UI.sel=null;$('panel').classList.add('hidden');}
function renderPanel(full){
 const P=UI.panel;if(!P)return;const body=$('pbody'),pi=$('picon');
 if(P.kind==='ent'){const e=ents.get(P.arg);if(!e){closePanel();return;}
  if(full){$('ptitle').textContent=B[e.d].n;pi.src=toolIcon(e.d);pi.style.display='';body.__h=null;body.innerHTML=entStatic(e)+'<div id="pdyn"></div>';}
  setHTML($('pdyn'),entDyn(e));return;}
 pi.style.display='none';
 const map={inv:['Items & Crafting',invHtml],ms:['Goals',msHtml],stats:['Production',statsHtml],menu:['Menu',menuHtml],node:['Resource Node',nodeHtml],codex:['Recipe Codex',codexHtml],plan:['Production Planner',planHtml]};
 const [title,fn]=map[P.kind];
 if(!full&&(P.kind==='menu'||P.kind==='codex'||P.kind==='plan'))return;
 $('ptitle').textContent=title;
 if(P.kind==='node'){pi.src=itemIcon(NODE_T[P.arg.t][0]);pi.style.display='';}
 const st=body.scrollTop;setHTML(body,fn(P.arg));body.scrollTop=st;
}

function perMin(r,amt,clock){return amt*60/r.t*(clock||1);}
function recLine(r,clock){const i=Object.keys(r.i).map(k=>`${dot(k)}${r.i[k]} ${IT[k].n} <small>${fmt(perMin(r,r.i[k],clock))}/m</small>`).join(' + ');const o=Object.keys(r.o).map(k=>`${dot(k)}${r.o[k]} ${IT[k].n} <small>${fmt(perMin(r,r.o[k],clock))}/m</small>`).join(' + ');return`${i}<br>→ ${o} <small>· ${r.t}s</small>`;}
function entStatic(e){
 const d=B[e.d];let h=`<div class="muted" style="margin-bottom:6px">${d.desc||''}</div>`;
 if(e.k==='mach'){
  h+=`<h4>Recipe</h4>`;
  const rs=RL.filter(r=>r.m===d.mt&&ur(r.id));
  h+=rs.map(r=>`<button class="btn rec ${e.r===r.id?'on':''}" data-act="setRec" data-v="${r.id}"><b>${r.n}</b><br>${recLine(r,e.clock)}</button>`).join('')||'<div class="muted">No recipes unlocked for this machine yet.</div>';
 }
 if(e.k==='mach'||e.k==='drill'||e.k==='pump'){
  const mx=S.oc?250:100;h+=`<h4>Clock speed</h4><div class="clockv" id="clockv">${Math.round(e.clock*100)}%</div><input type="range" min="10" max="${mx}" step="5" value="${Math.round(e.clock*100)}" data-act="clock">${S.oc?'':'<div class="muted">Overclocking above 100% unlocks with “Steelworks”.</div>'}<div class="muted">Power use scales with clock^1.6.</div>`;
 }
 if(e.k==='router'&&d.sub==='sort'){
  const items=Object.keys(IT).filter(k=>!IT[k].f);
  h+=`<h4>Filter (goes out the front)</h4><div class="chips"><button class="btn chip ${!e.filter?'on':''}" data-act="filter" data-v="">None (split all)</button>${items.map(k=>`<button class="btn chip ${e.filter===k?'on':''}" data-act="filter" data-v="${k}">${nm(k)}</button>`).join('')}</div>`;
 }
 if(e.k==='gen')h+=`<h4>Hand-feed</h4><div class="chips">${d.fuels.filter(f=>!IT[f].f).map(f=>`<button class="btn chip" data-act="feed" data-v="${f}">+10 ${nm(f)} from stock</button>`).join('')}</div>`;
 if(e.k==='storage')h+=`<h4>Actions</h4><button class="btn" data-act="takeAll">Move all into item stock</button>`;
 if(e.k==='tank')h+=`<h4>Actions</h4><button class="btn" data-act="flushTank">Flush tank</button>`;
 if(e.k==='core')h+=`<h4>Base Core</h4><p class="muted">Belt items into any side of the Core to add them to your item stock. Buildings are paid for from that stock.</p><button class="btn" data-act="openMs" style="margin-top:6px">🏁 Open goals</button> <button class="btn" data-act="openInv">📦 Items</button>`;
 if(e.k==='router'||e.k==='cross'||isLine(e.k)||e.k==='pole')h+='';
 if(e.k!=='core')h+=`<h4>&nbsp;</h4><button class="btn" data-act="rotSel" ${e.w===1&&e.k!=='pole'?'':'style="display:none"'}>↻ Rotate</button> <button class="btn" data-act="delSel">🗑 Dismantle</button>`;
 return h;
}
function bufList(b){const ks=Object.keys(b).filter(k=>b[k]>0);return ks.length?ks.map(k=>`<div class="row"><span>${nm(k)}</span><span>${fmt(Math.floor(b[k]))}</span></div>`).join(''):'<div class="muted">empty</div>';}
function entDyn(e){
 const d=B[e.d];let h='';const st=bStatus(e);
 if(st)h+=`<div class="row"><span>Status</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div>`;
 if(d.pw){h+=`<div class="row"><span>Power</span><span>${fmt(d.pw*Math.pow(e.clock||1,1.6))} MW ${e.grid?'':'<span style="color:#e04030">(not connected)</span>'}</span></div>`;}
 if(e.k==='mach'){
  if(e.r){h+=`<div class="bar"><i style="width:${(e.prog*100).toFixed(0)}%"></i></div><h4>Input buffer</h4>${bufList(e.inb)}<h4>Output buffer</h4>${bufList(e.outb)}`;}
  h+=`<div class="muted" style="margin-top:8px">Belts/pipes pointing <b>into</b> the machine feed it; belts/pipes pointing <b>away</b> from it receive output.</div>`;}
 if(e.k==='drill'||e.k==='pump'){
  if(e.node)h+=`<div class="row"><span>Node</span><span>${nm(NODE_T[e.node.t][0])} · ${PUR[e.node.p][1]}</span></div>`;
  if(e.item){const rate=(d.water?d.rate:d.rate*(e.node?PUR[e.node.p][0]:0))*e.clock*60;h+=`<div class="row"><span>Output rate</span><span>${fmt(rate)}/min</span></div><div class="row"><span>Buffered</span><span>${e.buf}/10</span></div>`;}
  h+=`<div class="muted" style="margin-top:6px">Connect a belt/pipe pointing away from the drill.</div>`;}
 if(e.k==='gen'){
  h+=`<div class="row"><span>Capacity</span><span>${d.cap} MW</span></div><div class="row"><span>Load</span><span>${(e.load*100).toFixed(0)}%</span></div><div class="bar"><i style="width:${e.load*100}%"></i></div>`;
  h+=`<h4>Fuel</h4>${bufList(e.fuel)}`;if(d.water)h+=`<div class="row"><span>${nm('water')}</span><span>${e.water}/100</span></div>`;
  if(e.d==='reactor')h+=`<div class="row"><span>${nm('waste')}</span><span>${e.outb.waste||0}/50</span></div>`;
  h+=gridHtml(e.grid);}
 if(e.k==='pole')h+=gridHtml(e.grid);
 if(e.k==='storage'){let t=0;for(const k in e.store)t+=e.store[k];h+=`<div class="row"><span>Used</span><span>${t}/${d.cap}</span></div><div class="bar"><i style="width:${t/d.cap*100}%"></i></div>${bufList(e.store)}`;}
 if(e.k==='tank')h+=`<div class="row"><span>${e.ft?nm(e.ft):'Empty'}</span><span>${e.amt}/${d.cap} m³</span></div>`;
 if(isLine(e.k))h+=`<div class="row"><span>Throughput</span><span>${fmt(d.spd*60)}/min</span></div><div class="row"><span>Carrying</span><span>${e.item?nm(e.item):'—'}</span></div>`;
 if(e.k==='router'||e.k==='cross'){const its=[e.item,e.hs,e.vs].filter(Boolean);h+=`<div class="row"><span>Holding</span><span>${its.length?its.map(nm).join(', '):'—'}</span></div>`;}
 return h;
}
function gridHtml(g){if(!g)return'<div class="muted">Not connected to a grid.</div>';
 return`<h4>Power grid</h4><div class="row"><span>Consumption</span><span>${fmt(g.dem)} MW</span></div><div class="row"><span>Capacity</span><span>${fmt(g.cap)} MW</span></div><div class="row"><span>Generators / consumers</span><span>${g.gens.length} / ${g.cons.length}</span></div>${g.trip?'<button class="btn warn" data-act="resetFuse">⚠ Reset fuse</button>':''}`;}
function invHtml(){
 const ks=Object.keys(S.inv).filter(k=>S.inv[k]>0).sort((a,b)=>IT[a].n.localeCompare(IT[b].n));
 let h=`<h4>Item stock</h4>`+(ks.length?ks.map(k=>`<div class="row"><span>${nm(k)}</span><span>${fmt(S.inv[k])}</span></div>`).join(''):'<div class="muted">empty</div>');
 h+=`<h4>Hand crafting</h4><div class="muted" style="margin-bottom:4px">Slow-but-free bootstrap: craft basic smelter/press recipes from your stock.</div>`;
 for(const r of RL){if(!ur(r.id)||(r.m!=='smelter'&&r.m!=='press'))continue;const ok=afford(r.i);
  h+=`<div class="card"><div>${recLine(r)}</div><button class="btn" data-act="craft" data-v="${r.id}" data-n="1" ${ok?'':'disabled'}>×1</button> <button class="btn" data-act="craft" data-v="${r.id}" data-n="10" ${afford(r.i,10)?'':'disabled'}>×10</button></div>`;}
 return h;
}
function msHtml(){
 let h=`<div class="muted" style="margin-bottom:8px">Deliver parts to the Base Core (they land in your item stock), then submit them here to unlock new tech.</div>`;
 MS.forEach((m,i)=>{
  const done=i<S.ms,cur=i===S.ms;
  h+=`<div class="card ${done?'done':''} ${cur?'cur':''}"><b>${done?'✓ ':''}Tier ${i+1}: ${m.n}</b>`;
  if(!done&&i<=S.ms+1){h+=Object.keys(m.req).map(k=>{const have=Math.min(S.inv[k]||0,m.req[k]);return`<div class="row"><span>${nm(k)}</span><span>${fmt(have)} / ${m.req[k]}</span></div><div class="bar"><i style="width:${have/m.req[k]*100}%"></i></div>`;}).join('');}
  const un=[...m.b.map(b=>B[b].n),...m.r.map(r=>RC[r].n)];
  if(un.length&&i<=S.ms+1)h+=`<div class="muted" style="margin-top:4px">Unlocks: ${un.join(', ')}${m.oc?', overclocking':''}</div>`;
  if(m.win&&i<=S.ms+1)h+=`<div class="muted">Launches the beacon — you win!</div>`;
  if(cur)h+=`<button class="btn ${afford(m.req)?'on':''}" style="margin-top:6px" data-act="submitMs" ${afford(m.req)?'':'disabled'}>Submit</button>`;
  h+=`</div>`;});
 return h;
}
function statsHtml(){
 const {p,c}=rates();const ks=[...new Set([...Object.keys(p),...Object.keys(c)])].sort((a,b)=>(p[b]||0)-(p[a]||0));
 let tot=0,cap=0;for(const g of grids){tot+=g.dem;cap+=g.cap;}
 let h=`<h4>Power</h4><div class="row"><span>Grids</span><span>${grids.length}</span></div><div class="row"><span>Consumption / capacity</span><span>${fmt(tot)} / ${fmt(cap)} MW</span></div>`;
 h+=`<h4>Items per minute (last ${stat.hist.length}s)</h4><table><tr><th>Item</th><th>Made</th><th>Used</th></tr>${ks.map(k=>`<tr><td>${nm(k)}</td><td>${fmt(p[k]||0)}</td><td>${fmt(c[k]||0)}</td></tr>`).join('')}</table>`;
 if(!ks.length)h+='<div class="muted">No production yet.</div>';
 h+=`<div style="margin-top:10px"><button class="btn" data-act="openCodex">📖 Recipe codex</button></div>`;
 return h;
}
function codexHtml(){
 const mts=['smelter','press','assembler','foundry','refinery','fabricator','blender'];let h='';
 for(const mt of mts){const rs=RL.filter(r=>r.m===mt&&ur(r.id));if(!rs.length)continue;h+=`<h4>${B[mt].n}</h4>`+rs.map(r=>`<div class="card"><b>${r.n}</b><br>${recLine(r)}</div>`).join('');}
 h+=`<h4>Generators</h4>`+['burner','steam','turbine','reactor'].filter(ub).map(g=>`<div class="card"><b>${B[g].n}</b> — ${B[g].desc}</div>`).join('');
 return h;
}
function nodeHtml(n){const it=NODE_T[n.t][0];return`<div class="row"><span>Resource</span><span>${nm(it)}</span></div><div class="row"><span>Purity</span><span>${PUR[n.p][1]} (×${PUR[n.p][0]})</span></div><div class="muted" style="margin:6px 0">${n.t==='oil'?'Place an Oil Pump here.':'Place a Drill over this node.'}</div>${n.t!=='oil'?`<button class="btn" data-act="handMine">⛏ Mine by hand (+5)</button>`:''}`;}
function menuHtml(){
 return`<h4>Tools</h4><button class="btn" data-act="openPlan">📐 Production planner</button> <button class="btn" data-act="openCodex">📖 Recipe codex</button>
 <h4>View</h4><div class="chips"><button class="btn chip ${V3.on?'':'on'}" data-act="view" data-v="2d">2D map</button><button class="btn chip ${V3.on?'on':''}" data-act="view" data-v="3d">3D view</button></div>
 <div class="row"><span>3D quality</span><span class="chips"><button class="btn chip ${V3.q==='high'?'on':''}" data-act="q3" data-v="high">High</button><button class="btn chip ${V3.q==='low'?'on':''}" data-act="q3" data-v="low">Low (faster)</button></span></div>
 <div class="muted">3D: drag to move · pinch to zoom · twist two fingers to rotate · slide two fingers up/down to tilt. Mouse: right-drag rotates &amp; tilts, wheel zooms, Ctrl+wheel tilts. Keys: V switch view, E/Z rotate.</div>
 <h4>How to play</h4><div class="muted">
 1. Drill the iron node, belt the ore into a Smelter, then into a Press. Belt products into the Base Core.<br>
 2. Power: drill coal → belt into a Coal Burner. Power Poles link generators to machines (yellow circles show range).<br>
 3. Hit the goals (🏁) to unlock new machines, recipes and alternates. 10 tiers end with launching the Orbital Beacon.<br>
 4. If demand exceeds supply the fuse trips — add generators, then reset it.<br>
 Keys: R rotate · X dismantle · Esc inspect · WASD/arrows pan · wheel zoom · right-drag pan.</div>
 <h4>Install app</h4>${installHtml()}
 <h4>Simulation speed</h4><div class="chips">${[1,2,4].map(v=>`<button class="btn chip ${S.spd===v?'on':''}" data-act="spd" data-v="${v}">${v}×</button>`).join('')}</div>
 <h4>Save</h4><button class="btn" data-act="saveNow">💾 Save now</button> <span class="muted">(auto-saves every 30s in this browser)</span>
 <h4>Transfer</h4><button class="btn" data-act="exportSave">Export</button> <button class="btn" data-act="copySave">Copy</button> <button class="btn" data-act="importSave">Import pasted</button>
 <textarea id="saveTxt" placeholder="Export puts your save here; paste a save here to import."></textarea>
 <h4>New game</h4><button class="btn" data-act="newGameAsk">Start a new map…</button>`;
}
function dialog(html){$('dlgc').innerHTML=html;$('dlg').classList.remove('hidden');}
function closeDlg(){$('dlg').classList.add('hidden');}

/* ---------- actions ---------- */
const ACT={
 cat:v=>{UI.cat=v;buildCats();},
 tool:v=>{setTool(UI.tool===v?null:v);closePanel();},
 toolNone:()=>setTool(null),
 toolDel:()=>setTool(UI.tool==='del'?null:'del'),
 rotate:()=>{UI.rot=(UI.rot+1)&3;UI.rotA=(UI.rotA||0)+90;updInfo();},
 home:()=>{camT.x=MW/2;camT.y=MH/2;camT.z=1.2;vel.x=vel.y=0;zAnchor=null;},
 closePanel,
 openMs:()=>openPanel('ms'),openInv:()=>openPanel('inv'),openStats:()=>openPanel('stats'),openMenu:()=>openPanel('menu'),openCodex:()=>openPanel('codex'),
 setRec:v=>{const e=ents.get(UI.panel.arg);if(!e)return;if(e.r===v)return;for(const b of [e.inb,e.outb])for(const k in b)give(k,Math.floor(b[k]));if(e.run)for(const k in RC[e.r].i)give(k,RC[e.r].i[k]);e.inb={};e.outb={};e.run=false;e.prog=0;e.r=v;renderPanel(true);},
 filter:v=>{const e=ents.get(UI.panel.arg);if(e){e.filter=v||null;renderPanel(true);}},
 takeAll:()=>{const e=ents.get(UI.panel.arg);if(!e)return;for(const k in e.store)give(k,e.store[k]);e.store={};toast('Moved to item stock');},
 feed:v=>{const e=ents.get(UI.panel.arg);if(!e)return;const cap=v==='fuel_rod'?5:50;const n=Math.min(10,S.inv[v]||0,cap-(e.fuel[v]||0));if(n<=0)return toast(S.inv[v]?'Fuel slot full':'None in stock');S.inv[v]-=n;e.fuel[v]=(e.fuel[v]||0)+n;toast(`Added ${n} ${IT[v].n}`);},
 flushTank:()=>{const e=ents.get(UI.panel.arg);if(e){e.amt=0;e.ft=null;}},
 delSel:()=>{const e=ents.get(UI.panel.arg);if(e){removeEnt(e,true);closePanel();buildTools();}},
 rotSel:()=>{const e=ents.get(UI.panel.arg);if(e){e.dir=(e.dir+1)&3;topoDirty=true;}},
 resetFuse:()=>{for(const g of grids)if(g.trip){for(const n of g.nodes)n.trip=false;g.trip=false;}toast('Fuse reset');},
 craft:(v,el)=>{const r=RC[v],n=+el.dataset.n;if(!afford(r.i,n))return;for(const k in r.i)S.inv[k]-=r.i[k]*n;for(const k in r.o)give(k,r.o[k]*n);renderPanel(true);buildTools();},
 handMine:()=>{const n=UI.panel.arg;give(NODE_T[n.t][0],5);toast(`+5 ${IT[NODE_T[n.t][0]].n}`);},
 submitMs:()=>{const m=MS[S.ms];if(!m||!afford(m.req))return;pay(m.req);for(const b of m.b)if(!ub(b))S.ub.push(b);for(const r of m.r)if(!ur(r))S.ur.push(r);if(m.oc)S.oc=true;S.ms++;
  toast(`Tier ${S.ms} complete: ${m.n}!`);buildTools();renderPanel(true);
  if(m.win){S.won=true;dialog(`<h2>🚀 Orbital Beacon launched!</h2><p>Your frontier outpost has reached orbit — every tier is complete. Thanks for playing. Feel free to keep optimising your factory.</p><button class="btn on" data-act="closeDlg">Keep building</button>`);}
  else{const un=[...m.b.map(b=>B[b].n),...m.r.map(r=>RC[r].n)];dialog(`<h2>Tier ${S.ms}: ${m.n}</h2><p>Unlocked: ${un.join(', ')||'—'}${m.oc?', overclocking':''}</p><button class="btn on" data-act="closeDlg">Nice</button>`);}
  save();},
 closeDlg,
 spd:v=>{S.spd=+v;renderPanel(true);},
 saveNow:()=>{save();toast('Saved');},
 exportSave:()=>{$('saveTxt').value=serialize();},
 copySave:()=>{const t=$('saveTxt');if(!t.value)t.value=serialize();try{navigator.clipboard.writeText(t.value).then(()=>toast('Copied'),()=>{t.select();toast('Select & copy the text');});}catch(e){t.select();}},
 importSave:()=>{const t=$('saveTxt').value.trim();if(!t)return toast('Paste a save first');try{load(t);toast('Save loaded');closePanel();}catch(e){toast('That save could not be read');}},
 newGameAsk:()=>dialog(`<h2>Start a new map?</h2><p>Your current factory will be replaced.</p><button class="btn warn" data-act="newGameGo">Yes, new map</button> <button class="btn" data-act="closeDlg">Cancel</button>`),
 newGameGo:()=>{closeDlg();closePanel();newGame();buildCats();save();},
};
document.addEventListener('click',ev=>{const el=ev.target.closest('[data-act]');if(!el||el.tagName==='INPUT')return;const f=ACT[el.dataset.act];if(f)f(el.dataset.v,el);});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset.act==='clock'&&UI.panel){const e=ents.get(UI.panel.arg);if(e){e.clock=+el.value/100;const cv2=document.getElementById('clockv');if(cv2)cv2.textContent=el.value+'%';}}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset.act==='clock')renderPanel(true);});
