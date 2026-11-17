'use strict';
/* ================= TRAINS (Session 56, DESIGN.md section 13) =================
   One-way track pieces are entities with k 'rail' (Rail, Rail Switch, Train Stop). Trains live in S.trains (per world, a WKEY):
   {id, nm, n wagons, tr: trail of tiles [x,y,i,o] (i = travel direction into the tile, o = out of it; oldest first, head last),
    u: head position in its tile (0 entry edge … 1 exit edge), v speed (tiles/s), sch [{s: stop name, c: 'full'|'empty'|'t10'|'t30'|'t60'}],
    si schedule index, st 0 driving / 1 halted at a stop, wt time halted, cg [{item:n}] per wagon}.
   Transient state (route, power) is kept in TRC, not saved. Trains reserve the tiles they cover; a train brakes for the one ahead.
   Power: a pole whose supply area touches a track network powers the whole network (RCOMP); a moving train draws TRAIN.pw MW. */
const TRC=new Map();let OCC=new Map(),BAYADJ=new Map(),RCOMP=[],railList=[];
const tKey=(x,y)=>y*MW+x;
const railAt=(x,y)=>{const e=entAt(x,y);return e&&e.k==='rail'?e:null;};
const rSub=e=>B[e.d].sub||'';
function canEnter(n,od){return rSub(n)==='switch'?n.dir===od:n.dir!==((od+2)&3);}
/* tiles a train can drive to from track piece t: [entity, direction] */
/* Rail Switch (Session 56c): main line straight on + one branch on side e.bs (1 = right, 2 = left); Rotate swaps the side */
const swBranch=t=>t.bs===2?(t.dir+3)&3:(t.dir+1)&3;
function rsucc(t){const out=[],dirs=rSub(t)==='switch'?[t.dir,swBranch(t)]:[t.dir];
 for(const od of dirs){const n=railAt(t.x+DX[od],t.y+DY[od]);if(n&&canEnter(n,od))out.push([n,od]);}return out;}
const dirTo=(a,b)=>b[0]>a[0]?0:b[1]>a[1]?1:b[0]<a[0]?2:3;
function stopNewName(){let k=1;const names=new Set([...ents.values()].filter(e=>e.k==='rail'&&rSub(e)==='stop').map(e=>e.tx));while(names.has('Station '+k))k++;return 'Station '+k;}
const stopNames=()=>[...new Set([...ents.values()].filter(e=>e.k==='rail'&&rSub(e)==='stop'&&e.tx).map(e=>e.tx))].sort();
const trCost=n=>{const c=Object.assign({},TRAIN.loco);for(const k in TRAIN.wagon)c[k]=(c[k]||0)+TRAIN.wagon[k]*n;return c;};
const trLen=tr=>(tr.n+1)*TRAIN.car;
const wagonLoad=w=>{let t=0;for(const k in w)t+=w[k];return t;};

/* ---------- topology (end of rebuildTopo) ---------- */
function trainTopo(){railList=[];BAYADJ=new Map();RCOMP=[];
 for(const e of ents.values()){if(e.k==='rail'){railList.push(e);e._rc=-1;}}
 /* a stop or track piece placed against the flow (nothing leads in, nothing leads on) turns round if that connects it (Session 56b) */
 const fedBy=e=>{for(let d=0;d<4;d++){const n=railAt(e.x-DX[d],e.y-DY[d]);if(n&&rsucc(n).some(([m])=>m===e))return true;}return false;};
 for(const e of railList){if(rSub(e)==='switch'||fedBy(e)||rsucc(e).length)continue;const d0=e.dir;e.dir=(d0+2)&3;if(!(fedBy(e)&&rsucc(e).length))e.dir=d0;}
 for(const e of railList){if(rSub(e)!=='switch'||fedBy(e))continue;const d0=e.dir;let ok=false;for(const d of [d0,(d0+1)&3,(d0+2)&3,(d0+3)&3]){e.dir=d;if(fedBy(e)){ok=true;break;}}if(!ok)e.dir=d0;}   /* a switch lines up with the track that leads into it */
 /* curves for drawing: a plain track piece fed only from one side bends (e.cin = travel direction coming in) */
 for(const e of railList){e.cin=null;if(rSub(e)==='switch')continue;const fed=[];
  for(let d=0;d<4;d++){const n=railAt(e.x-DX[d],e.y-DY[d]);if(n&&rsucc(n).some(([m])=>m===e))fed.push(d);}
  if(fed.length&&!fed.includes(e.dir))e.cin=fed[0];}
 /* connected track networks and their power */
 let cid=0;for(const e of railList){if(e._rc>=0)continue;const q=[e];e._rc=cid;while(q.length){const a=q.pop();for(let d=0;d<4;d++){const n=railAt(a.x+DX[d],a.y+DY[d]);if(n&&n._rc<0){n._rc=cid;q.push(n);}}}RCOMP.push({grid:null});cid++;}
 for(const p of pnodes){const r=B[p.d].sup;if(!r||!p.grid)continue;const C=cen(p);
  for(let y=Math.floor(C.y-r);y<=Math.ceil(C.y+r);y++)for(let x=Math.floor(C.x-r);x<=Math.ceil(C.x+r);x++){const t=railAt(x,y);if(t&&RCOMP[t._rc]&&!RCOMP[t._rc].grid&&rectDist(C.x,C.y,t)<=r)RCOMP[t._rc].grid=p.grid;}}
 /* Cargo Bays: the track tiles next to them */
 for(const e of ents.values())if(e.k==='cbay')for(const p of perim(e)){const k=tKey(p.x,p.y);if(!BAYADJ.has(k))BAYADJ.set(k,[]);BAYADJ.get(k).push(e);}
 /* a train whose track was removed is taken off (refunded) */
 if(S.trains)for(const tr of [...S.trains]){if(trTiles(tr).some(([x,y])=>!railAt(x,y))){trainRemove(tr,true);toast(`🚂 ${tr.nm} was taken off: its track was removed (refunded)`);}}
 for(const c of TRC.values())c.ver=-1;}

/* ---------- geometry along the trail ---------- */
function trTiles(tr){const out=[],T=tr.tr,L=trLen(tr);let d=-tr.u;for(let k=T.length-1;k>=0&&d<L;k--){out.push(T[k]);d+=1;}return out;}
function tilePt(T,t){const [x,y,i,o]=T,en=(i+2)&3,ax=x+0.5+DX[en]*0.5,ay=y+0.5+DY[en]*0.5,bx=x+0.5+DX[o]*0.5,by=y+0.5+DY[o]*0.5;
 if(i===o||((i+2)&3)===o)return[ax+(bx-ax)*t,ay+(by-ay)*t];
 const cx=x+0.5+0.5*(DX[en]+DX[o]),cy=y+0.5+0.5*(DY[en]+DY[o]);let a0=Math.atan2(ay-cy,ax-cx),a1=Math.atan2(by-cy,bx-cx),da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
 const a=a0+da*t;return[cx+Math.cos(a)*0.5,cy+Math.sin(a)*0.5];}
function trPos(tr,d){const T=tr.tr;let k=T.length-1;if(d<=tr.u)return tilePt(T[k],tr.u-d);d-=tr.u;k--;while(k>0&&d>1){d-=1;k--;}if(k<0)return tilePt(T[0],0);return tilePt(T[k],Math.max(0,1-d));}
/* cars: k = 0 locomotive, 1… wagons; front and back points */
function trCars(tr){const out=[];for(let k=0;k<=tr.n;k++){const f=trPos(tr,k*TRAIN.car+0.08),b=trPos(tr,k*TRAIN.car+1.82);out.push({k,f,b,x:(f[0]+b[0])/2,y:(f[1]+b[1])/2,a:Math.atan2(f[1]-b[1],f[0]-b[0])});}return out;}
function trainAt(x,y){if(!S.trains)return null;for(const tr of S.trains)for(const c of trCars(tr))if(Math.hypot(c.x-(x+0.5),c.y-(y+0.5))<0.95)return tr;return null;}

/* ---------- routes ---------- */
function trc(tr){let c=TRC.get(tr.id);if(!c){c={ver:-1,path:null,tgt:null,msg:'',pw:false,want:false,xa:0};TRC.set(tr.id,c);}return c;}
function trRoute(tr){const c=trc(tr),s=tr.sch[tr.si];c.tgt=s?s.s:null;c.ver=topoVer;c.path=null;c.msg='';if(!s){c.msg='No schedule: tap the train to add stops';return;}
 const H=tr.tr[tr.tr.length-1],h=railAt(H[0],H[1]);if(!h){c.msg='Off the track';return;}
 if(rSub(h)==='stop'&&h.tx===s.s&&tr.u<0.5){c.path=[];return;}
 const n0=railAt(H[0]+DX[H[3]],H[1]+DY[H[3]]);if(!n0||!canEnter(n0,H[3])){c.msg='End of the track';return;}
 const par=new Map([[n0,null]]),q=[n0];let goal=null;
 for(let qi=0;qi<q.length&&!goal;qi++){const a=q[qi];if(rSub(a)==='stop'&&a.tx===s.s){goal=a;break;}for(const [n] of rsucc(a))if(!par.has(n)){par.set(n,a);q.push(n);}}
 if(!goal){const tg=railList.filter(e=>rSub(e)==='stop'&&e.tx===s.s);c.msg=!tg.length?`No stop called ${s.s}`:`No route to ${s.s}: the track arrows don't lead there`;return;}
 const p=[];for(let a=goal;a;a=par.get(a))p.push([a.x,a.y]);c.path=p.reverse();}
const condTxt={full:'until full',empty:'until empty',t10:'wait 10 s',t30:'wait 30 s',t60:'wait 60 s'};
function condMet(tr){const s=tr.sch[tr.si];if(!s)return false;if(tr.wt<1.5)return false;
 if(s.c==='full')return tr.cg.every(w=>wagonLoad(w)>=TRAIN.cap);if(s.c==='empty')return tr.cg.every(w=>wagonLoad(w)<=0);const t=+String(s.c).slice(1)||10;return tr.wt>=t;}

/* ---------- simulation (every tick, after buildings) ---------- */
function trainTick(dt){const L=S.trains;OCC=new Map();if(!L||!L.length)return;for(const tr of L)for(const [x,y] of trTiles(tr))OCC.set(tKey(x,y),tr.id);
 const look=TRAIN.vmax*TRAIN.vmax/(2*TRAIN.brk)+2;
 for(const tr of L){const c=trc(tr);
  if(tr.st===1){tr.wt+=dt;c.want=false;trTransfer(tr,dt,c);if(condMet(tr)){tr.si=(tr.si+1)%tr.sch.length;tr.st=0;tr.wt=0;c.ver=-1;}continue;}
  if(c.ver!==topoVer||c.tgt!==(tr.sch[tr.si]&&tr.sch[tr.si].s))trRoute(tr);
  let free=0;const H=tr.tr[tr.tr.length-1];
  if(c.path){if(!c.path.length)free=0.5-tr.u;else{let dist=1-tr.u;free=dist;for(let k=0;k<c.path.length;k++){const P=c.path[k],o=OCC.get(tKey(P[0],P[1]));if(o!=null&&o!==tr.id){free=dist-0.12;break;}if(k===c.path.length-1){free=dist+0.5;break;}dist+=1;free=dist;if(dist>look)break;}}}
  const vmax=c.pw?TRAIN.vmax:TRAIN.crawl;tr.v=Math.min(tr.v+TRAIN.acc*dt,vmax,Math.sqrt(2*TRAIN.brk*Math.max(0,free)));if(free<0.01)tr.v=0;c.want=tr.v>0.05;
  tr.u+=Math.min(tr.v*dt,Math.max(0,free));
  while(tr.u>=1&&c.path&&c.path.length){const P=c.path[0],k=tKey(P[0],P[1]),o=OCC.get(k);if(o!=null&&o!==tr.id){tr.u=1;tr.v=0;break;}
   c.path.shift();const T=railAt(P[0],P[1]);const ex=c.path.length&&T&&rSub(T)==='switch'?dirTo(P,c.path[0]):T?T.dir:H[3];
   tr.tr.push([P[0],P[1],tr.tr[tr.tr.length-1][3],ex]);OCC.set(k,tr.id);tr.u-=1;}
  if(tr.u>1)tr.u=1;
  const keep=Math.ceil(trLen(tr))+3;if(tr.tr.length>keep)tr.tr.splice(0,tr.tr.length-keep);
  if(c.path&&!c.path.length&&tr.u>=0.499){tr.u=0.5;tr.v=0;tr.st=1;tr.wt=0;}}}
/* loading / unloading through the Cargo Bays next to each wagon (bays need power) */
function trTransfer(tr,dt,c){c.xa+=TRAIN.xfer*dt;let budget=Math.floor(c.xa);if(budget<=0)return;c.xa-=budget;
 for(let j=1;j<=tr.n;j++){const w=tr.cg[j-1],bays=new Set();for(const d of [j*TRAIN.car+0.5,j*TRAIN.car+1.4]){const p=trPos(tr,d);for(const b of BAYADJ.get(tKey(Math.floor(p[0]),Math.floor(p[1])))||[])bays.add(b);}
  for(const b of bays){if(!(b.pw>0))continue;let n=budget;
   if(!b.bm){for(const k of Object.keys(b.store)){while(n>0&&b.store[k]>0&&wagonLoad(w)<TRAIN.cap){b.store[k]--;w[k]=(w[k]||0)+1;n--;}if(b.store[k]<=0)delete b.store[k];}}
   else{let t=0;for(const k in b.store)t+=b.store[k];for(const k of Object.keys(w)){while(n>0&&w[k]>0&&t<B[b.d].cap){w[k]--;b.store[k]=(b.store[k]||0)+1;t++;n--;}if(w[k]<=0)delete w[k];}}}}}
function trainDemand(g){let d=0;if(S.trains)for(const tr of S.trains){const c=trc(tr),H=tr.tr[tr.tr.length-1],h=railAt(H[0],H[1]);if(h&&RCOMP[h._rc]&&RCOMP[h._rc].grid===g&&c.want)d+=TRAIN.pw;}return d;}
function trainPower(g,ok){if(!S.trains)return;for(const tr of S.trains){const H=tr.tr[tr.tr.length-1],h=railAt(H[0],H[1]),gg=h&&RCOMP[h._rc]&&RCOMP[h._rc].grid;if(gg===g)trc(tr).pw=ok;else if(!gg)trc(tr).pw=false;}}

/* ---------- building and removing trains ---------- */
function trainBuild(stop,n){n=Math.max(1,Math.min(TRAIN.maxW,n|0));if(!stop||rSub(stop)!=='stop')return 'Not a Train Stop';S.trains=S.trains||[];
 const need=Math.ceil((n+1)*TRAIN.car)+2,list=[stop],seen=new Set([stop]);
 while(list.length<need){const cur=list[list.length-1],back=cur.cin!=null?(cur.cin+2)&3:(cur.dir+2)&3;let p=null;
  for(const d of [back,0,1,2,3]){const m=railAt(cur.x+DX[d],cur.y+DY[d]);if(m&&!seen.has(m)&&rsucc(m).some(([q])=>q===cur)){p=m;break;}}
  if(!p)return `Needs ${need} tiles of track leading into this stop`;list.push(p);seen.add(p);}
 if(S.trains.some(tr=>trTiles(tr).some(([x,y])=>list.some(e=>e.x===x&&e.y===y))))return 'Another train is on that track';
 const cost=trCost(n);if(!afford(cost))return 'Not enough materials';pay(cost);
 const seq=list.slice().reverse(),T=seq.map((e,k)=>{const o=k<seq.length-1?dirTo([e.x,e.y],[seq[k+1].x,seq[k+1].y]):stop.dir;return[e.x,e.y,o,o];});
 for(let k=1;k<T.length;k++)T[k][2]=T[k-1][3];
 const id=S.trains.reduce((m,t)=>Math.max(m,t.id),0)+1,other=stopNames().find(x=>x!==stop.tx);
 S.trains.push({id,nm:'Train '+id,n,tr:T,u:0.5,v:0,sch:[{s:stop.tx,c:'full'}].concat(other?[{s:other,c:'empty'}]:[]),si:0,st:1,wt:0,cg:Array.from({length:n},()=>({}))});return '';}
function trainRemove(tr,silent){const i=S.trains.indexOf(tr);if(i<0)return;for(const [x,y] of trTiles(tr))if(OCC.get(tKey(x,y))===tr.id)OCC.delete(tKey(x,y));S.trains.splice(i,1);TRC.delete(tr.id);refund(trCost(tr.n));for(const w of tr.cg)for(const k in w)give(k,w[k]);if(!silent)toast(`${tr.nm} removed: cost and cargo back in stock`);}

/* ---------- panels ---------- */
function trainStatic(e){
 if(e.k==='rail'&&rSub(e)==='stop'){const S0=S.trains||[];return`<h4>Name</h4><input type="text" class="signtxt" data-act="stopName" maxlength="30" value="${(e.tx||'').replace(/"/g,'&quot;')}">
  <h4>Build a train here</h4><div class="muted" style="margin-bottom:4px">A locomotive and wagons, placed on the track leading into this stop (2 tiles per car). Each wagon holds ${TRAIN.cap} items.</div>
  <div class="chips">${[1,2,3,4].map(n=>`<button class="btn chip ${afford(trCost(n))?'':'poor'}" data-act="trBuild" data-v="${n}">🚂 + ${n} wagon${n>1?'s':''}</button>`).join('')}</div>
  <div class="muted" style="margin-top:4px">Locomotive: ${Object.entries(TRAIN.loco).map(([k,v])=>v+' '+IT[k].n).join(', ')} · each wagon: ${Object.entries(TRAIN.wagon).map(([k,v])=>v+' '+IT[k].n).join(', ')}.</div>`;}
 if(e.k==='cbay')return`<h4>Mode</h4><div class="chips"><button class="btn chip ${e.bm?'':'on'}" data-act="bayMode" data-v="0">⬆ Load trains</button><button class="btn chip ${e.bm?'on':''}" data-act="bayMode" data-v="1">⬇ Unload trains</button></div>
  <div class="muted" style="margin-top:4px">${e.bm?'Takes everything from the wagon next to it and passes it on to belts leading away.':'Belts fill the bay; it loads the wagon that stops next to it.'}</div>`;
 return '';}
function trainDyn(e){
 if(e.k==='cbay'){let t=0;for(const k in e.store)t+=e.store[k];return`<div class="row"><span>Holds</span><span>${t}/${B[e.d].cap}</span></div><div class="bar"><i style="width:${t/B[e.d].cap*100}%"></i></div>${bufList(e.store)}`;}
 if(e.k==='rail'&&rSub(e)==='stop'){const here=(S.trains||[]).filter(tr=>{const H=tr.tr[tr.tr.length-1];return tr.st===1&&H[0]===e.x&&H[1]===e.y;}),to=(S.trains||[]).filter(tr=>tr.st===0&&tr.sch[tr.si]&&tr.sch[tr.si].s===e.tx);
  return`<h4>Trains</h4><div class="row"><span>Here now</span><span>${here.map(t=>t.nm).join(', ')||'–'}</span></div><div class="row"><span>On the way</span><span>${to.map(t=>t.nm).join(', ')||'–'}</span></div>`;}
 if(e.k==='rail'){const c=RCOMP[e._rc];return`<div class="row"><span>Track power</span><span>${c&&c.grid?'connected':'<span style="color:#ff8a6a">none: put a power pole near the track</span>'}</span></div>`;}
 return '';}
function trById(id){return(S.trains||[]).find(t=>t.id===id);}
function trainStatus(tr){const c=trc(tr),s=tr.sch[tr.si];if(tr.st===1)return['#4fe08a',`At ${s?s.s:'a stop'}: ${s?condTxt[s.c]:''}`];if(c.msg)return['#ffa53a',c.msg];if(tr.v<0.05)return['#ffd34a',`Waiting for the track ahead (to ${s?s.s:'?'})`];return[c.pw?'#4fe08a':'#ffa53a',`${c.pw?'Driving':'No track power: crawling'} to ${s?s.s:'?'}`];}
function trainHtml(id){const tr=trById(id);if(!tr)return'<div class="muted">This train is gone.</div>';const names=stopNames();
 return`<div id="trdyn">${trainDynHtml(tr)}</div><h4>Schedule</h4><div class="muted" style="margin-bottom:4px">The train drives to each stop in turn and leaves when the condition is met.</div>`+
  tr.sch.map((s,i)=>`<div class="card"><div class="row"><b>${i===tr.si?'▶ ':''}${i+1}.</b><button class="btn chip" data-act="trDel" data-v="${i}" title="Remove stop">✕</button></div>
   <select class="wide" data-act="trSchS" data-v="${i}">${(names.includes(s.s)?names:[s.s,...names]).map(n=>`<option ${n===s.s?'selected':''}>${n.replace(/</g,'&lt;')}</option>`).join('')}</select>
   <select class="wide" data-act="trSchC" data-v="${i}" style="margin-top:4px">${Object.keys(condTxt).map(k=>`<option value="${k}" ${k===s.c?'selected':''}>${condTxt[k]}</option>`).join('')}</select></div>`).join('')+
  `<div class="chips" style="margin-top:6px"><button class="btn chip" data-act="trAdd" ${names.length?'':'disabled'}>+ Add stop</button><button class="btn chip" data-act="trGo">⏭ Leave now</button><button class="btn chip" data-act="trRemove">🗑 Remove train</button></div>`;}
function trainDynHtml(tr){const st=trainStatus(tr);
 return`<div class="row"><span>Status</span><span class="status" style="color:${st[0]}"><i style="background:${st[0]}"></i>${st[1]}</span></div><div class="row"><span>Speed</span><span>${(tr.v*60/1).toFixed(0)} tiles/min</span></div>`+
  tr.cg.map((w,i)=>{const t=wagonLoad(w),ks=Object.keys(w).filter(k=>w[k]>0);return`<div class="row"><span>Wagon ${i+1}</span><span>${t}/${TRAIN.cap}</span></div><div class="bar"><i style="width:${t/TRAIN.cap*100}%"></i></div>${ks.length?`<div class="muted">${ks.map(k=>w[k]+' '+IT[k].n).join(', ')}</div>`:''}`;}).join('');}
setInterval(()=>{if(UI.panel&&UI.panel.kind==='train'){const tr=trById(UI.panel.arg);const el=$('trdyn');if(tr&&el)setHTML(el,trainDynHtml(tr));}},250);
Object.assign(ACT,{
 trBuild:v=>{const e=ents.get(UI.panel&&UI.panel.arg);const why=trainBuild(e,+v);if(why){toast(why);sfx('deny');return;}sfx('place');toast('🚂 Train built: tap it to set its schedule');renderPanel(true);},
 bayMode:v=>{const e=ents.get(UI.panel&&UI.panel.arg);if(e&&e.k==='cbay'){e.bm=v==='1'?1:0;renderPanel(true);}},
 trAdd:()=>{const tr=trById(UI.panel.arg);if(!tr)return;const n=stopNames();if(!n.length)return;tr.sch.push({s:n[0],c:'empty'});renderPanel(true);},
 trDel:v=>{const tr=trById(UI.panel.arg);if(!tr)return;tr.sch.splice(+v,1);if(tr.si>=tr.sch.length)tr.si=0;trc(tr).ver=-1;renderPanel(true);},
 trGo:()=>{const tr=trById(UI.panel.arg);if(!tr||!tr.sch.length)return;if(tr.st===1){tr.si=(tr.si+1)%tr.sch.length;tr.st=0;tr.wt=0;}trc(tr).ver=-1;renderPanel(true);},
 trRemove:()=>{const tr=trById(UI.panel.arg);if(!tr)return;trainRemove(tr);closePanel();}});
document.addEventListener('change',ev=>{const el=ev.target,a=el.dataset&&el.dataset.act;if(a!=='trSchS'&&a!=='trSchC')return;const tr=UI.panel&&trById(UI.panel.arg);if(!tr)return;const s=tr.sch[+el.dataset.v];if(!s)return;
 if(a==='trSchS')s.s=el.value;else s.c=el.value;trc(tr).ver=-1;renderPanel(true);});
document.addEventListener('input',ev=>{const el=ev.target;if(!el.dataset||el.dataset.act!=='stopName'||!UI.panel)return;const e=ents.get(UI.panel.arg);if(!e||e.k!=='rail')return;
 const old=e.tx,nw=el.value.slice(0,30)||old;if(nw===old)return;e.tx=nw;if(S.trains&&!stopNames().includes(old))for(const tr of S.trains)for(const s of tr.sch)if(s.s===old)s.s=nw;for(const c of TRC.values())c.ver=-1;});

/* ---------- 2D drawing ---------- */
function railSegs(e){if(rSub(e)==='switch')return[[e.x,e.y,e.dir,e.dir],[e.x,e.y,e.dir,swBranch(e)]];return[[e.x,e.y,e.cin!=null?e.cin:e.dir,e.dir]];}
function drawRails(list,sx,sy,s){if(!list.length)return;const moon=moonLook(),bed=new Path2D(),sl=new Path2D(),rl=new Path2D(),mid=new Path2D();
 const off=(T,t,o)=>{const p=tilePt(T,t),q=tilePt(T,Math.min(1,t+0.02)),r=tilePt(T,Math.max(0,t-0.02)),dx=q[0]-r[0],dy=q[1]-r[1],l=Math.hypot(dx,dy)||1;return[sx(p[0]-dy/l*o),sy(p[1]+dx/l*o)];};
 const line=(P,T,o)=>{for(let k=0;k<=8;k++){const p=off(T,k/8,o);if(k)P.lineTo(p[0],p[1]);else P.moveTo(p[0],p[1]);}};
 for(const e of list)for(const T of railSegs(e)){
  if(moon){line(bed,T,0);line(mid,T,0);continue;}
  line(bed,T,0);for(const t of [1/6,0.5,5/6]){const a=off(T,t,-0.34),b=off(T,t,0.34);sl.moveTo(a[0],a[1]);sl.lineTo(b[0],b[1]);}line(rl,T,-0.21);line(rl,T,0.21);}
 ctx.lineCap='butt';
 if(moon){ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=s*0.6;ctx.save();ctx.translate(s*0.08,s*0.1);ctx.stroke(bed);ctx.restore();ctx.strokeStyle='#e9ecef';ctx.lineWidth=s*0.5;ctx.stroke(bed);ctx.strokeStyle='#a9b0b8';ctx.lineWidth=Math.max(1,s*0.08);ctx.stroke(mid);}
 else{ctx.strokeStyle='#6f6b63';ctx.lineWidth=s*0.78;ctx.stroke(bed);ctx.strokeStyle='#4e3f33';ctx.lineWidth=Math.max(1,s*0.13);ctx.stroke(sl);ctx.strokeStyle='#c9ced4';ctx.lineWidth=Math.max(1,s*0.07);ctx.stroke(rl);}
 if(s>=16){ctx.fillStyle=moon?'rgba(90,100,110,0.55)':'rgba(255,255,255,0.32)';for(const e of list){if(rSub(e)==='switch')continue;const T=railSegs(e)[0],p=tilePt(T,0.5),q=tilePt(T,0.62),a=Math.atan2(q[1]-p[1],q[0]-p[0]);ctx.save();ctx.translate(sx(p[0]),sy(p[1]));ctx.rotate(a);ctx.beginPath();ctx.moveTo(s*0.12,0);ctx.lineTo(-s*0.07,-s*0.1);ctx.lineTo(-s*0.07,s*0.1);ctx.fill();ctx.restore();}}
 for(const e of list){const X=sx(e.x),Y=sy(e.y);
  if(rSub(e)==='stop'){const d=e.dir,px=X+s*0.5+DY[d]*s*0.5,py=Y+s*0.5-DX[d]*s*0.5;ctx.fillStyle='#e05a3a';ctx.beginPath();ctx.arc(px,py,s*0.16,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,s*0.05);ctx.stroke();
   ctx.strokeStyle='#e05a3a';ctx.lineWidth=Math.max(1.5,s*0.1);ctx.beginPath();const ax=X+s*0.5-DY[d]*s*0.45,ay=Y+s*0.5+DX[d]*s*0.45;ctx.moveTo(ax,ay);ctx.lineTo(px,py);ctx.stroke();
   if(s>=12&&e.tx){const fs=Math.max(9*DPR,s*0.32);ctx.font=`700 ${fs}px Inter,system-ui,sans-serif`;const w=ctx.measureText(e.tx).width+fs*0.8;ctx.fillStyle='rgba(10,14,18,0.8)';rr(px-w/2,py-s*0.25-fs*1.5,w,fs*1.35,fs*0.6);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.tx,px,py-s*0.25-fs*0.8);ctx.textAlign='left';}}
  else if(rSub(e)==='switch'){const b=swBranch(e);if(!railAt(e.x+DX[b],e.y+DY[b])){const cx=X+s*0.5+DX[b]*s*0.5,cy=Y+s*0.5+DY[b]*s*0.5,ex=cx+DX[b]*s*0.45,ey=cy+DY[b]*s*0.45;ctx.lineCap='butt';
    ctx.strokeStyle=moon?'#e9ecef':'#6f6b63';ctx.lineWidth=moon?s*0.5:s*0.78;ctx.globalAlpha=0.8;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);ctx.stroke();if(!moon){ctx.strokeStyle='#c9ced4';ctx.lineWidth=Math.max(1,s*0.07);ctx.beginPath();for(const o of [-0.21,0.21]){ctx.moveTo(cx-DY[b]*s*o,cy+DX[b]*s*o);ctx.lineTo(ex-DY[b]*s*o,ey+DX[b]*s*o);}ctx.stroke();}ctx.globalAlpha=1;}   /* short branch stub showing where the side track leaves */
   ctx.fillStyle='#d0a040';ctx.beginPath();ctx.arc(X+s*0.5,Y+s*0.5,s*0.13,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;ctx.stroke();}}}
function drawTrains(sx,sy,s){if(!S.trains||!S.trains.length)return;const moon=moonLook(),sel=UI.panel&&UI.panel.kind==='train'?UI.panel.arg:null;
 for(const tr of S.trains)for(const c of trCars(tr)){const X=sx(c.x),Y=sy(c.y);if(X<-3*s||Y<-3*s||X>cv.width+3*s||Y>cv.height+3*s)continue;const len=Math.hypot(c.f[0]-c.b[0],c.f[1]-c.b[1])*s,w=s*0.72;
  ctx.save();ctx.translate(X,Y);ctx.rotate(c.a);ctx.fillStyle='rgba(0,0,0,0.3)';rr(-len/2+s*0.08,-w/2+s*0.1,len,w,moon?w/2:s*0.12);ctx.fill();
  if(moon){ctx.fillStyle='#f4f6f8';rr(-len/2,-w/2,len,w,w/2);ctx.fill();ctx.strokeStyle='#8f979f';ctx.lineWidth=Math.max(1,s*0.05);ctx.stroke();
   if(c.k===0){ctx.fillStyle='#3a4450';rr(len/2-w*0.75,-w*0.3,w*0.5,w*0.6,w*0.25);ctx.fill();}else{ctx.fillStyle='#b9c0c7';ctx.fillRect(-len*0.3,-w/2,len*0.06,w);ctx.fillRect(len*0.24,-w/2,len*0.06,w);}}
  else{ctx.fillStyle='#2d3238';rr(-len/2,-w/2,len,w,s*0.12);ctx.fill();
   if(c.k===0){ctx.fillStyle='#c8442e';rr(-len/2+s*0.06,-w/2+s*0.06,len-s*0.12,w-s*0.12,s*0.1);ctx.fill();ctx.fillStyle='#1d2228';rr(len/2-s*0.55,-w*0.32,s*0.36,w*0.64,s*0.06);ctx.fill();ctx.fillStyle='#ffd36a';ctx.fillRect(len/2-s*0.1,-w*0.3,s*0.06,w*0.6);}
   else{ctx.fillStyle='#69737e';rr(-len/2+s*0.06,-w/2+s*0.06,len-s*0.12,w-s*0.12,s*0.08);ctx.fill();}}
  if(c.k>0){const wg=tr.cg[c.k-1],ks=Object.keys(wg).filter(k=>wg[k]>0);if(ks.length){const f=Math.min(1,wagonLoad(wg)/TRAIN.cap);ctx.fillStyle=IT[ks[0]].c;rr(-len*0.36,-w*0.26,len*0.72*Math.max(0.12,f),w*0.52,s*0.05);ctx.fill();}}
  if(sel===tr.id){ctx.strokeStyle='#ffd34a';ctx.lineWidth=Math.max(1.5,s*0.08);rr(-len/2-s*0.06,-w/2-s*0.06,len+s*0.12,w+s*0.12,s*0.16);ctx.stroke();}
  ctx.restore();}}

/* ---------- 3D (called from view3d.js) ---------- */
function v3TrainInit(){const box=(c,p,s)=>({g:new T3.BoxGeometry(1,1,1),c:new T3.Color(c),m:new T3.Matrix4().compose(new T3.Vector3(...p),new T3.Quaternion(),new T3.Vector3(...s))});
 const cap=(c,p,s)=>({g:new T3.SphereGeometry(0.5,14,10),c:new T3.Color(c),m:new T3.Matrix4().compose(new T3.Vector3(...p),new T3.Quaternion(),new T3.Vector3(...s))});
 const cyl=(c,p,s)=>({g:new T3.CylinderGeometry(0.5,0.5,1,16),c:new T3.Color(c),m:new T3.Matrix4().compose(new T3.Vector3(...p),new T3.Quaternion().setFromEuler(new T3.Euler(0,0,Math.PI/2)),new T3.Vector3(...s))});
 const pool=parts=>v3Pool(v3Merge(parts),V3.mat,{cast:1,recv:1});
 V3.trk={bed:[0,1,2].map(k=>v3Pool(v3Ribbon(v3Path(k),[[-0.42,0.42,0,0.07]]),new T3.MeshStandardMaterial({color:'#77736b',roughness:0.95}),{recv:1})),
  rails:[0,1,2].map(k=>v3Pool(v3Ribbon(v3Path(k),[[-0.25,-0.18,0.07,0.16],[0.18,0.25,0.07,0.16]]),new T3.MeshStandardMaterial({color:'#b9bfc6',roughness:0.35,metalness:0.7}),{cast:1,recv:1})),
  beam:[0,1,2].map(k=>v3Pool(v3Ribbon(v3Path(k),[[-0.26,0.26,0,0.42]]),new T3.MeshStandardMaterial({color:'#e8ebee',roughness:0.6}),{cast:1,recv:1}))};
 V3.trn={loco:pool([box('#2d3238',[0,0.28,0],[1.75,0.2,0.62]),box('#c8442e',[-0.15,0.62,0],[1.4,0.55,0.66]),box('#1d2228',[0.6,0.72,0],[0.35,0.4,0.62]),box('#c8442e',[0.6,0.98,0],[0.42,0.1,0.7])]),
  wagon:pool([box('#2d3238',[0,0.28,0],[1.75,0.2,0.62]),box('#69737e',[0,0.6,0],[1.65,0.45,0.66])]),
  mloco:pool([cyl('#f4f6f8',[-0.1,0.78,0],[0.62,1.3,0.62]),cap('#f4f6f8',[0.55,0.78,0],[0.62,0.62,0.62]),cap('#f4f6f8',[-0.75,0.78,0],[0.62,0.62,0.62]),box('#3a4450',[0.66,0.86,0],[0.28,0.18,0.5])]),
  mwagon:pool([cyl('#f4f6f8',[0,0.78,0],[0.62,1.4,0.62]),cap('#f4f6f8',[0.7,0.78,0],[0.62,0.62,0.62]),cap('#f4f6f8',[-0.7,0.78,0],[0.62,0.62,0.62]),box('#b9c0c7',[0,0.78,0],[0.12,0.66,0.66])]),
  cargo:v3Pool(new T3.BoxGeometry(1,1,1),new T3.MeshStandardMaterial({roughness:0.6}),{color:1,cast:1})};}
function v3TrackLayout(lineM){if(!V3.trk)return;const moon=moonLook(),L=[[],[],[]];
 for(const e of railList){if(!ents.has(e.id))continue;for(const T of railSegs(e)){const [x,y,i,o]=T,rel=i===o?0:((i-o)&3)===1?1:((i-o)&3)===3?2:0;L[rel].push({x,y,dir:o});}}
 for(let k=0;k<3;k++){const use=moon?[V3.trk.beam[k]]:[V3.trk.bed[k],V3.trk.rails[k]],off=moon?[V3.trk.bed[k],V3.trk.rails[k]]:[V3.trk.beam[k]];
  for(const p of use){const ms=v3PoolN(p,L[k].length);L[k].forEach((e,i)=>ms.setMatrixAt(i,lineM(e)));}for(const p of off)v3PoolN(p,0);}}
function v3Trains(){if(!V3.trn||!V3T)return;const T=V3T,moon=moonLook(),cars=S.trains?S.trains.flatMap(tr=>trCars(tr).map(c=>Object.assign(c,{tr}))):[];
 const lo=cars.filter(c=>c.k===0),wa=cars.filter(c=>c.k>0),y0=moon?0.0:0.0;
 const put=(pool,list,off)=>{const ms=v3PoolN(pool,list.length);list.forEach((c,i)=>{T.e.set(0,-c.a,0);T.q.setFromEuler(T.e);const len=Math.hypot(c.f[0]-c.b[0],c.f[1]-c.b[1])/1.74;ms.setMatrixAt(i,T.m.compose(T.v.set(c.x,y0,c.y),T.q,T.s.set(Math.max(0.6,len),1,1)));});ms.instanceMatrix.needsUpdate=true;};
 put(moon?V3.trn.mloco:V3.trn.loco,lo);put(moon?V3.trn.mwagon:V3.trn.wagon,wa);v3PoolN(moon?V3.trn.loco:V3.trn.mloco,0);v3PoolN(moon?V3.trn.wagon:V3.trn.mwagon,0);
 const cg=wa.filter(c=>wagonLoad(c.tr.cg[c.k-1])>0),cm=v3PoolN(V3.trn.cargo,moon?0:cg.length);if(!moon){cg.forEach((c,i)=>{const w=c.tr.cg[c.k-1],k0=Object.keys(w).find(k=>w[k]>0),f=Math.min(1,wagonLoad(w)/TRAIN.cap);T.e.set(0,-c.a,0);T.q.setFromEuler(T.e);
  cm.setMatrixAt(i,T.m.compose(T.v.set(c.x,0.83+0.12*f,c.y),T.q,T.s.set(1.5,0.05+0.24*f,0.56)));cm.setColorAt(i,T.c.set(IT[k0].c));});cm.instanceMatrix.needsUpdate=true;if(cm.instanceColor)cm.instanceColor.needsUpdate=true;}}
