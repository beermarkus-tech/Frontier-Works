'use strict';
/* ================= ORBITAL FREIGHTERS (Session 60b, DESIGN.md section 12) =================
   Freighters live in S.fr (shared by all worlds, so they fly whichever world you are on). Each is based at Home ({home:'home', dest:'moon'}),
   carries up to FREIGHT.cap items each way and works with the worlds' **item stocks** (what reached the Base Core), so it keeps flying while
   you are on the other world (stocks of inactive worlds are in S.worlds[id].WS.inv). Each round trip burns FREIGHT.fuel Rocket Fuel from
   Home's stock. A Freighter Port is needed on both worlds. States: 0 docked at home (loading), 1 flying out, 2 docked at the destination
   (unloading + loading the return cargo), 3 flying back. f.t = seconds in the current state. Routes: f.out / f.back = [{i:item,n:amount}]. */
function wInv(w){if(w===(S.w||'home'))return S.inv;const p=S.worlds&&S.worlds[w];if(!p)return null;p.WS.inv=p.WS.inv||{};return p.WS.inv;}
function portsOn(w){if(w===(S.w||'home'))return[...ents.values()].filter(e=>e.k==='fport');const p=S.worlds&&S.worlds[w];return p?p.es.filter(a=>a[0]==='fport').map(a=>({x:a[1],y:a[2],w:6,packed:true})):[];}
/* flight time each way depends on the destination (Session 64: Rime is twice as far) */
const frFly=f=>(FREIGHT.flyTo&&FREIGHT.flyTo[f.dest])||FREIGHT.fly;
const frDests=()=>Object.keys(WORLDS).filter(w=>w!=='home'&&S.worlds&&S.worlds[w]);
const frLoad=f=>{let n=0;for(const k in f.c||{})n+=f.c[k];return n;};
function frTake(inv,rows){const c={};let room=FREIGHT.cap;for(const r of rows||[]){if(!r.i||!(r.n>0))continue;const m=Math.min(r.n,Math.floor(inv[r.i]||0),room);if(m>0){inv[r.i]-=m;c[r.i]=(c[r.i]||0)+m;room-=m;}}return c;}
function frGive(inv,c){for(const k in c)inv[k]=(inv[k]||0)+c[k];}
function freightTick(dt){const L=S.fr;if(!L||!L.length)return;
 for(const f of L){f.t=(f.t||0)+dt;f.msg='';
  if(f.st===0){if(f.t<FREIGHT.dock)continue;const H=wInv(f.home),Dn=wInv(f.dest);
   if(!Dn||!portsOn(f.dest).length){f.msg=`No Freighter Port on ${theW(f.dest)}`;continue;}if(!portsOn(f.home).length){f.msg=`No Freighter Port on ${WORLDS[f.home].n}`;continue;}
   if((H.rocket_fuel||0)<FREIGHT.fuel){f.msg=`Needs ${FREIGHT.fuel} Rocket Fuel in ${WORLDS[f.home].n}'s stock`;continue;}
   if(f.home===(S.w||'home')){const pt=portsOn(f.home)[0];if(pt&&!(pt.pw>0)){f.msg='The port needs power to launch';continue;}}
   H.rocket_fuel-=FREIGHT.fuel;f.c=frTake(H,f.out);f.st=1;f.t=0;f.trips=(f.trips||0)+1;}
  else if(f.st===1&&f.t>=frFly(f)){frGive(wInv(f.dest),f.c);f.del=(f.del||0)+frLoad(f);f.c={};f.st=2;f.t=0;}
  else if(f.st===2&&f.t>=FREIGHT.dock){f.c=frTake(wInv(f.dest),f.back);f.st=3;f.t=0;}
  else if(f.st===3&&f.t>=frFly(f)){frGive(wInv(f.home),f.c);f.del=(f.del||0)+frLoad(f);f.c={};f.st=0;f.t=0;}}}
function frStatus(f){if(f.msg)return['#ffa53a',f.msg];const H=WORLDS[f.home].n,Dn=theW(f.dest),left=s=>Math.max(0,Math.ceil(s-f.t))+' s';
 return f.st===0?['#ffd34a',`Docked at ${H}: loading (${left(FREIGHT.dock)})`]:f.st===1?['#4fe08a',`Flying to ${Dn} · ${left(frFly(f))} · ${frLoad(f)} items`]:f.st===2?['#ffd34a',`Docked on ${Dn}: unloading and loading (${left(FREIGHT.dock)})`]:['#4fe08a',`Flying back to ${H} · ${left(frFly(f))} · ${frLoad(f)} items`];}

/* ---------- panels ---------- */
const frItems=()=>Object.keys(IT).filter(k=>!IT[k].f).sort((a,b)=>IT[a].n.localeCompare(IT[b].n));
function frRows(f,side){const rows=f[side];let h='';for(let k=0;k<3;k++){const r=rows[k]||{i:'',n:0};
  h+=`<div class="row" style="gap:6px"><select class="wide" data-act="frItem" data-v="${f.id}|${side}|${k}" style="flex:1"><option value="">– nothing –</option>${frItems().map(x=>`<option value="${x}" ${x===r.i?'selected':''}>${IT[x].n}</option>`).join('')}</select><input type="number" min="0" max="${FREIGHT.cap}" step="50" value="${r.n||0}" data-act="frNum" data-v="${f.id}|${side}|${k}" style="width:78px"></div>`;}return h;}
function freightStatic(e){if(e.k!=='fport')return'';const here=S.w||'home';
 if(here!=='home')return`<h4>Freighters</h4><div class="muted">This is a landing site. Freighters are built and given routes at Home's Freighter Port (they refuel there).</div>`;
 const L=(S.fr||[]).filter(f=>f.home===here);let h=`<h4>Freighters</h4><div class="muted" style="margin-bottom:6px">Each freighter takes the cargo below from this world's item stock, flies to its destination (${frDests().map(w=>WORLDS[w].n+' '+((FREIGHT.flyTo||{})[w]||FREIGHT.fly)+' s').join(', ')||'the Moon'}), delivers it into that world's stock, loads the return cargo from there and flies back. Up to ${FREIGHT.cap} items each way. Every round trip burns ${FREIGHT.fuel} Rocket Fuel from Home's stock.</div>`;
 for(const f of L)h+=`<div class="card"><div class="row"><b>🚀 ${f.nm}</b><button class="btn chip" data-act="frDel" data-v="${f.id}" title="Scrap (refunded when docked)">✕</button></div>
   ${frDests().length>1?`<div class="row" style="gap:4px;flex-wrap:wrap;margin:2px 0">${frDests().map(w=>`<button class="btn chip ${f.dest===w?'on':''}" data-act="frDest" data-v="${f.id}|${w}" ${f.st!==0&&f.dest!==w?'disabled':''}>${WORLDS[w].ic} ${WORLDS[w].n}</button>`).join('')}</div>${f.st!==0?'<div class="muted">The destination can be changed while it is docked at Home.</div>':''}`:''}
   <div class="muted" style="margin:2px 0 4px">To ${theW(f.dest)} (from ${WORLDS[f.home].n}'s stock)</div>${frRows(f,'out')}<div class="muted" style="margin:6px 0 4px">Back to ${WORLDS[f.home].n} (from ${theW(f.dest)}'s stock)</div>${frRows(f,'back')}<div id="frst${f.id}"></div></div>`;
 h+=`<button class="btn" data-act="frAdd" ${L.length<FREIGHT.max&&afford(FREIGHT.cost)?'':'disabled'}>+ Build a freighter</button><div class="muted" style="margin-top:4px">Up to ${FREIGHT.max} · each: ${Object.entries(FREIGHT.cost).map(([k,v])=>v+' '+IT[k].n).join(', ')}.</div>`;
 return h;}
function freightDyn(e){if(e.k!=='fport')return'';const L=(S.fr||[]).filter(f=>f.home===(S.w||'home')||f.dest===(S.w||'home'));if(!L.length)return'';
 return`<h4>Traffic</h4>`+L.map(f=>{const st=frStatus(f);return`<div class="row"><span>${f.nm}</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div><div class="muted">${f.trips||0} trips · ${fmt(f.del||0)} items delivered</div>`;}).join('');}
function freightWorldsHtml(){const L=S.fr||[];if(!L.length)return'';return`<h4>Freighters</h4>`+L.map(f=>{const st=frStatus(f);return`<div class="row"><span>🚀 ${f.nm}</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div>`;}).join('');}
Object.assign(ACT,{
 frAdd:()=>{const here=S.w||'home';if(here!=='home'||!afford(FREIGHT.cost))return;S.fr=S.fr||[];if(S.fr.filter(f=>f.home===here).length>=FREIGHT.max)return;pay(FREIGHT.cost);
  const id=S.fr.reduce((m,f)=>Math.max(m,f.id),0)+1;S.fr.push({id,nm:'Freighter '+id,home:'home',dest:'moon',st:0,t:0,c:{},out:[],back:[]});sfx('place');renderPanel(true);},
 frDest:v=>{const [id,w]=v.split('|'),f=(S.fr||[]).find(q=>q.id===+id);if(!f||!WORLDS[w]||w==='home')return;if(f.st!==0){toast('Change the destination while it is docked at Home');return;}f.dest=w;sfx('click');renderPanel(true);},
 frDel:v=>{const f=(S.fr||[]).find(q=>q.id===+v);if(!f)return;if(f.st===1||f.st===3){toast('It is in flight: scrap it when it is docked');return;}frGive(wInv(f.st===2?f.dest:f.home)||S.inv,f.c);S.fr.splice(S.fr.indexOf(f),1);refund(FREIGHT.cost);toast(`${f.nm} scrapped (refunded)`);renderPanel(true);}});
document.addEventListener('change',ev=>{const el=ev.target,a=el.dataset&&el.dataset.act;if(a!=='frItem'&&a!=='frNum')return;const [id,side,k]=el.dataset.v.split('|'),f=(S.fr||[]).find(q=>q.id===+id);if(!f)return;
 const rows=f[side];while(rows.length<=+k)rows.push({i:'',n:0});if(a==='frItem'){rows[+k].i=el.value;if(el.value&&!rows[+k].n)rows[+k].n=500;}else rows[+k].n=Math.max(0,Math.min(FREIGHT.cap,Math.round(+el.value||0)));renderPanel(true);});
setInterval(()=>{if(UI.panel&&UI.panel.kind==='ent'){const e=ents.get(UI.panel.arg);if(e&&e.k==='fport')for(const f of S.fr||[]){const el=document.getElementById('frst'+f.id);if(el){const st=frStatus(f);setHTML(el,`<div class="row" style="margin-top:6px"><span>Now</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div>`);}}}},500);

/* ---------- 2D: freighters docked at a port, taking off and landing (the flight itself is out of sight) ---------- */
/* where each freighter is on the world you're on: docked (lift 0), taking off or landing (lift in tiles), or away (not listed) */
function frPoses(){const L=S.fr,out=[];if(!L||!L.length)return out;const here=S.w||'home',pts=portsOn(here);if(!pts.length)return out;
 L.forEach((f,k)=>{const pt=pts[k%pts.length];let lift=null;
  if(f.home===here){if(f.st===0)lift=0;else if(f.st===1&&f.t<8)lift=Math.pow(f.t,2)*0.5;else if(f.st===3&&f.t>frFly(f)-8)lift=Math.pow(frFly(f)-f.t,2)*0.5;}
  if(f.dest===here){if(f.st===2)lift=0;else if(f.st===1&&f.t>frFly(f)-8)lift=Math.pow(frFly(f)-f.t,2)*0.5;else if(f.st===3&&f.t<8)lift=Math.pow(f.t,2)*0.5;}
  if(lift!=null)out.push({x:pt.x+3+[0,-1.5,1.5][k%3],y:pt.y+3,lift,f});});return out;}
function drawFreighters(sx,sy,s){for(const q of frPoses()){const lift=q.lift,a=Math.max(0,Math.min(1,1-(lift-20)/15));if(a<=0)continue;const X=sx(q.x),Yb=sy(q.y+1)-lift*s,w=s*0.9,H=s*2.8;
  if(lift>0){const fl=s*1.6*(0.9+0.1*Math.sin(animT*40));glow(X,Yb+fl*0.3,fl,'#ff9a30',0.8*a);}
  ctx.globalAlpha=a;drawRocketShape(X,Yb,w,H);ctx.globalAlpha=1;}}
/* 3D (Session 62e): the same take-off and landing; a white rocket with red fins and a flame while it flies, climbing out of sight */
function v3FreightInit(){const part=(geo,c,p,sc,rot)=>({g:geo,c:new T3.Color(c),m:new T3.Matrix4().compose(new T3.Vector3(...p),new T3.Quaternion().setFromEuler(new T3.Euler(...(rot||[0,0,0]))),new T3.Vector3(...sc))});
 const cy=new T3.CylinderGeometry(0.5,0.5,1,16),co=new T3.ConeGeometry(0.5,1,16),bx=new T3.BoxGeometry(1,1,1),P=[part(cy,'#eef1f4',[0,1.6,0],[0.8,2.4,0.8]),part(co,'#eef1f4',[0,3.3,0],[0.8,1.0,0.8]),part(cy,'#e8a23a',[0,2.4,0],[0.82,0.14,0.82]),part(cy,'#3a3f46',[0,0.3,0],[0.6,0.4,0.6])];
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])P.push(part(bx,'#c9302c',[Math.cos(a)*0.5,0.7,Math.sin(a)*0.5],[0.06,0.9,0.45],[0,-a,0]));
 V3.frP=v3Pool(v3Merge(P),V3.mat,{cast:1,recv:1});const fg=new T3.ConeGeometry(0.4,1,12);fg.rotateX(Math.PI);fg.translate(0,-0.5,0);V3.frF=v3Pool(fg,new T3.MeshBasicMaterial({color:'#ffa040',transparent:true,opacity:0.85,depthWrite:false}),{order:4});}
function v3Freighters(){if(!V3.frP||!V3T)return;const T=V3T,L=frPoses().filter(q=>q.lift<45),m=v3PoolN(V3.frP,L.length),fl=L.filter(q=>q.lift>0),fm=v3PoolN(V3.frF,fl.length);T.q.identity();
 L.forEach((q,i)=>m.setMatrixAt(i,T.m.compose(T.v.set(q.x,0.3+q.lift*1.3,q.y),T.q,T.s.set(1,1,1))));
 fl.forEach((q,i)=>{const n=1.2+Math.min(2.5,q.lift*0.2)+Math.sin(animT*40+i)*0.15;fm.setMatrixAt(i,T.m.compose(T.v.set(q.x,0.3+q.lift*1.3+0.1,q.y),T.q,T.s.set(1,n,1)));});
 m.instanceMatrix.needsUpdate=true;fm.instanceMatrix.needsUpdate=true;}
