'use strict';
/* ================= ORBITAL FREIGHTERS (Session 60b, DESIGN.md section 12) =================
   Freighters live in S.fr (shared by all worlds, so they fly whichever world you are on). Each is based at Home ({home:'home', dest:'moon'}),
   carries up to FREIGHT.cap items each way and works with the worlds' **item stocks** (what reached the Base Core), so it keeps flying while
   you are on the other world (stocks of inactive worlds are in S.worlds[id].WS.inv). Each round trip burns FREIGHT.fuel Rocket Fuel from
   Home's stock. A Freighter Port is needed on both worlds. States: 0 docked at home (loading), 1 flying out, 2 docked at the destination
   (unloading + loading the return cargo), 3 flying back. f.t = seconds in the current state. Routes: f.out / f.back = [{i:item,n:amount}]. */
function wInv(w){if(w===(S.w||'home'))return S.inv;const p=S.worlds&&S.worlds[w];if(!p)return null;p.WS.inv=p.WS.inv||{};return p.WS.inv;}
function portsOn(w){if(w===(S.w||'home'))return[...ents.values()].filter(e=>e.k==='fport');const p=S.worlds&&S.worlds[w];return p?p.es.filter(a=>a[0]==='fport').map(a=>({x:a[1],y:a[2],w:6,packed:true})):[];}
const frLoad=f=>{let n=0;for(const k in f.c||{})n+=f.c[k];return n;};
function frTake(inv,rows){const c={};let room=FREIGHT.cap;for(const r of rows||[]){if(!r.i||!(r.n>0))continue;const m=Math.min(r.n,Math.floor(inv[r.i]||0),room);if(m>0){inv[r.i]-=m;c[r.i]=(c[r.i]||0)+m;room-=m;}}return c;}
function frGive(inv,c){for(const k in c)inv[k]=(inv[k]||0)+c[k];}
function freightTick(dt){const L=S.fr;if(!L||!L.length)return;
 for(const f of L){f.t=(f.t||0)+dt;f.msg='';
  if(f.st===0){if(f.t<FREIGHT.dock)continue;const H=wInv(f.home),Dn=wInv(f.dest);
   if(!Dn||!portsOn(f.dest).length){f.msg=`No Freighter Port on the ${WORLDS[f.dest].n}`;continue;}if(!portsOn(f.home).length){f.msg=`No Freighter Port on ${WORLDS[f.home].n}`;continue;}
   if((H.rocket_fuel||0)<FREIGHT.fuel){f.msg=`Needs ${FREIGHT.fuel} Rocket Fuel in ${WORLDS[f.home].n}'s stock`;continue;}
   if(f.home===(S.w||'home')){const pt=portsOn(f.home)[0];if(pt&&!(pt.pw>0)){f.msg='The port needs power to launch';continue;}}
   H.rocket_fuel-=FREIGHT.fuel;f.c=frTake(H,f.out);f.st=1;f.t=0;f.trips=(f.trips||0)+1;}
  else if(f.st===1&&f.t>=FREIGHT.fly){frGive(wInv(f.dest),f.c);f.del=(f.del||0)+frLoad(f);f.c={};f.st=2;f.t=0;}
  else if(f.st===2&&f.t>=FREIGHT.dock){f.c=frTake(wInv(f.dest),f.back);f.st=3;f.t=0;}
  else if(f.st===3&&f.t>=FREIGHT.fly){frGive(wInv(f.home),f.c);f.del=(f.del||0)+frLoad(f);f.c={};f.st=0;f.t=0;}}}
function frStatus(f){if(f.msg)return['#ffa53a',f.msg];const H=WORLDS[f.home].n,Dn=WORLDS[f.dest].n,left=s=>Math.max(0,Math.ceil(s-f.t))+' s';
 return f.st===0?['#ffd34a',`Docked at ${H}: loading (${left(FREIGHT.dock)})`]:f.st===1?['#4fe08a',`Flying to the ${Dn} · ${left(FREIGHT.fly)} · ${frLoad(f)} items`]:f.st===2?['#ffd34a',`Docked on the ${Dn}: unloading and loading (${left(FREIGHT.dock)})`]:['#4fe08a',`Flying back to ${H} · ${left(FREIGHT.fly)} · ${frLoad(f)} items`];}

/* ---------- panels ---------- */
const frItems=()=>Object.keys(IT).filter(k=>!IT[k].f).sort((a,b)=>IT[a].n.localeCompare(IT[b].n));
function frRows(f,side){const rows=f[side];let h='';for(let k=0;k<3;k++){const r=rows[k]||{i:'',n:0};
  h+=`<div class="row" style="gap:6px"><select class="wide" data-act="frItem" data-v="${f.id}|${side}|${k}" style="flex:1"><option value="">– nothing –</option>${frItems().map(x=>`<option value="${x}" ${x===r.i?'selected':''}>${IT[x].n}</option>`).join('')}</select><input type="number" min="0" max="${FREIGHT.cap}" step="50" value="${r.n||0}" data-act="frNum" data-v="${f.id}|${side}|${k}" style="width:78px"></div>`;}return h;}
function freightStatic(e){if(e.k!=='fport')return'';const here=S.w||'home';
 if(here!=='home')return`<h4>Freighters</h4><div class="muted">This is a landing site. Freighters are built and given routes at Home's Freighter Port (they refuel there).</div>`;
 const L=(S.fr||[]).filter(f=>f.home===here);let h=`<h4>Freighters</h4><div class="muted" style="margin-bottom:6px">Each freighter takes the cargo below from this world's item stock, flies ${FREIGHT.fly} s to the Moon, delivers it into the Moon's stock, loads the return cargo from there and flies back. Up to ${FREIGHT.cap} items each way. Every round trip burns ${FREIGHT.fuel} Rocket Fuel from Home's stock.</div>`;
 for(const f of L)h+=`<div class="card"><div class="row"><b>🚀 ${f.nm}</b><button class="btn chip" data-act="frDel" data-v="${f.id}" title="Scrap (refunded when docked)">✕</button></div>
   <div class="muted" style="margin:2px 0 4px">To the ${WORLDS[f.dest].n} (from ${WORLDS[f.home].n}'s stock)</div>${frRows(f,'out')}<div class="muted" style="margin:6px 0 4px">Back to ${WORLDS[f.home].n} (from the ${WORLDS[f.dest].n}'s stock)</div>${frRows(f,'back')}<div id="frst${f.id}"></div></div>`;
 h+=`<button class="btn" data-act="frAdd" ${L.length<FREIGHT.max&&afford(FREIGHT.cost)?'':'disabled'}>+ Build a freighter</button><div class="muted" style="margin-top:4px">Up to ${FREIGHT.max} · each: ${Object.entries(FREIGHT.cost).map(([k,v])=>v+' '+IT[k].n).join(', ')}.</div>`;
 return h;}
function freightDyn(e){if(e.k!=='fport')return'';const L=(S.fr||[]).filter(f=>f.home===(S.w||'home')||f.dest===(S.w||'home'));if(!L.length)return'';
 return`<h4>Traffic</h4>`+L.map(f=>{const st=frStatus(f);return`<div class="row"><span>${f.nm}</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div><div class="muted">${f.trips||0} trips · ${fmt(f.del||0)} items delivered</div>`;}).join('');}
function freightWorldsHtml(){const L=S.fr||[];if(!L.length)return'';return`<h4>Freighters</h4>`+L.map(f=>{const st=frStatus(f);return`<div class="row"><span>🚀 ${f.nm}</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div>`;}).join('');}
Object.assign(ACT,{
 frAdd:()=>{const here=S.w||'home';if(here!=='home'||!afford(FREIGHT.cost))return;S.fr=S.fr||[];if(S.fr.filter(f=>f.home===here).length>=FREIGHT.max)return;pay(FREIGHT.cost);
  const id=S.fr.reduce((m,f)=>Math.max(m,f.id),0)+1;S.fr.push({id,nm:'Freighter '+id,home:'home',dest:'moon',st:0,t:0,c:{},out:[],back:[]});sfx('place');renderPanel(true);},
 frDel:v=>{const f=(S.fr||[]).find(q=>q.id===+v);if(!f)return;if(f.st===1||f.st===3){toast('It is in flight: scrap it when it is docked');return;}frGive(wInv(f.st===2?f.dest:f.home)||S.inv,f.c);S.fr.splice(S.fr.indexOf(f),1);refund(FREIGHT.cost);toast(`${f.nm} scrapped (refunded)`);renderPanel(true);}});
document.addEventListener('change',ev=>{const el=ev.target,a=el.dataset&&el.dataset.act;if(a!=='frItem'&&a!=='frNum')return;const [id,side,k]=el.dataset.v.split('|'),f=(S.fr||[]).find(q=>q.id===+id);if(!f)return;
 const rows=f[side];while(rows.length<=+k)rows.push({i:'',n:0});if(a==='frItem'){rows[+k].i=el.value;if(el.value&&!rows[+k].n)rows[+k].n=500;}else rows[+k].n=Math.max(0,Math.min(FREIGHT.cap,Math.round(+el.value||0)));renderPanel(true);});
setInterval(()=>{if(UI.panel&&UI.panel.kind==='ent'){const e=ents.get(UI.panel.arg);if(e&&e.k==='fport')for(const f of S.fr||[]){const el=document.getElementById('frst'+f.id);if(el){const st=frStatus(f);setHTML(el,`<div class="row" style="margin-top:6px"><span>Now</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div>`);}}}},500);

/* ---------- 2D: freighters docked at a port, taking off and landing (the flight itself is out of sight) ---------- */
function drawFreighters(sx,sy,s){const L=S.fr;if(!L||!L.length)return;const here=S.w||'home',pts=portsOn(here);if(!pts.length)return;
 L.forEach((f,k)=>{const pt=pts[k%pts.length];let lift=null;
  if(f.home===here){if(f.st===0)lift=0;else if(f.st===1&&f.t<8)lift=Math.pow(f.t,2)*0.5;else if(f.st===3&&f.t>FREIGHT.fly-8)lift=Math.pow(FREIGHT.fly-f.t,2)*0.5;}
  if(f.dest===here){if(f.st===2)lift=0;else if(f.st===1&&f.t>FREIGHT.fly-8)lift=Math.pow(FREIGHT.fly-f.t,2)*0.5;else if(f.st===3&&f.t<8)lift=Math.pow(f.t,2)*0.5;}
  if(lift==null)return;const a=Math.max(0,Math.min(1,1-(lift-20)/15));if(a<=0)return;const X=sx(pt.x+3+[0,-1.5,1.5][k%3]),Yb=sy(pt.y+4)-lift*s,w=s*0.9,H=s*2.8;
  if(lift>0){const fl=s*1.6*(0.9+0.1*Math.sin(animT*40));glow(X,Yb+fl*0.3,fl,'#ff9a30',0.8*a);}
  ctx.globalAlpha=a;drawRocketShape(X,Yb,w,H);ctx.globalAlpha=1;});}
