'use strict';
/* ================= MOON ROVERS (Session 59) =================
   A Rover Depot (k 'rdepot', Moon only) linked to another depot (e.lx/e.ly, like Drone Pads) sends its rovers (e.rn of them, e.rv states,
   saved) with up to ROVER.cap items. They drive on the ground along a path found around buildings and crater rims (terr 3); belts, pipes and
   track can be crossed. Rover state: st 0 at the depot (loading), 1 driving out (p = distance along the path), 2 driving back; c = cargo.
   Rovers recharge at the depot (it needs power to send them); driving needs none. Tyre tracks fade in the dust (RVTR, not saved). */
/* Session 63: Ice Sleds on Rime use the same depots and code with their own numbers (SLED) */
const VP=e=>e&&B[e.d]&&B[e.d].veh==='sled'?SLED:ROVER;
let rdepots=[];const RVTR=[];RVTR.w=null;
function roverTopo(){rdepots=[...ents.values()].filter(e=>e.k==='rdepot'||e.k==='tdepot');for(const e of rdepots)e._rp=null;}
function rvTarget(e){if(e.lx==null)return null;const t=entAt(e.lx,e.ly);return t&&t.k===e.k&&t!==e&&t.x===e.lx&&t.y===e.ly?t:null;}
const rvCount=e=>{let n=0;for(const k in e.store)n+=e.store[k];return n;};

/* ---------- path finding (A*, 8 directions, no corner cutting), then straightened and rounded ---------- */
/* crater rims (terr 3) can be climbed, slowly: they cost 4× in the route search and slow the rover (Session 60: rims enclose crater floors) */
const rvRim=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH&&terr[y*MW+x]===3;
/* belts, pipes and track (Session 61c, Markus): rovers drive around them; crossing costs 30× in the route search, so it only happens where there is no other way */
const rvLine=(x,y)=>{if(x<0||y<0||x>=MW||y>=MH)return false;const id=grid[y*MW+x];if(!id)return false;const o=ents.get(id);return !!o&&(isLine(o.k)||o.k==='rail');};
function rvPass(x,y,a,b){if(x<0||y<0||x>=MW||y>=MH)return false;const i=y*MW+x;if(terr[i]===1||(terr[i]===3&&a&&B[a.d].veh==='sled'))return false;const id=grid[i];   /* sleds can't climb glacier cliffs */if(!id)return true;
 const o=ents.get(id);if(!o||o===a||o===b)return true;return isLine(o.k)||o.k==='rail';}
function rvAstar(a,b){const sx=a.x+1,sy=a.y+1,gx=b.x+1,gy=b.y+1,N=MW*MH,G=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),done=new Uint8Array(N);
 const H=(x,y)=>{const dx=Math.abs(x-gx),dy=Math.abs(y-gy);return Math.max(dx,dy)+0.414*Math.min(dx,dy);};
 const heap=[];const push=(f,i)=>{heap.push([f,i]);let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
 const s0=sy*MW+sx,g0=gy*MW+gx;G[s0]=0;push(H(sx,sy),s0);let n=0;
 while(heap.length&&n++<250000){const [,i]=pop();if(done[i])continue;done[i]=1;if(i===g0)break;const x=i%MW,y=(i/MW)|0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(!rvPass(nx,ny,a,b))continue;if(dx&&dy&&(!rvPass(x+dx,y,a,b)||!rvPass(x,y+dy,a,b)))continue;
   const j=ny*MW+nx,c=G[i]+(dx&&dy?1.414:1)*(rvLine(nx,ny)?30:terr[j]===3?4:1);if(c<G[j]){G[j]=c;from[j]=i;push(c+H(nx,ny),j);}}}
 if(from[g0]<0)return null;const p=[];for(let i=g0;i>=0;i=from[i]){p.push([i%MW+0.5,((i/MW)|0)+0.5]);if(i===s0)break;}return p.reverse();}
function rvLOS(p,q,a,b){const d=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.ceil(d*4);for(let k=1;k<n;k++){const t=k/n,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;
 for(const [ox,oy] of [[0.3,0.3],[-0.3,0.3],[0.3,-0.3],[-0.3,-0.3]]){const tx=Math.floor(x+ox),ty=Math.floor(y+oy);if(!rvPass(tx,ty,a,b)||rvLine(tx,ty)||(rvRim(tx,ty)&&!(rvRim(Math.floor(p[0]),Math.floor(p[1]))&&rvRim(Math.floor(q[0]),Math.floor(q[1])))))return false;}}return true;}   /* straightening never adds rim crossings */
function rvPath(e,tg){const key=topoVer+'|'+tg.id;if(e._rp&&e._rp.key===key)return e._rp.L?e._rp:null;
 let raw=rvAstar(e,tg);if(!raw){e._rp={key,L:0};return null;}
 const sp=[raw[0]];for(let i=0;i<raw.length-1;){let j=Math.min(raw.length-1,i+60);while(j>i+1&&!rvLOS(raw[i],raw[j],e,tg))j--;sp.push(raw[j]);i=j;}   /* straighten */
 let pts=sp;for(let it=0;it<2;it++){const o=[pts[0]];for(let k=0;k<pts.length-1;k++){const A=pts[k],Bq=pts[k+1];o.push([A[0]*0.75+Bq[0]*0.25,A[1]*0.75+Bq[1]*0.25],[A[0]*0.25+Bq[0]*0.75,A[1]*0.25+Bq[1]*0.75]);}o.push(pts[pts.length-1]);pts=o;}   /* round the corners */
 const cum=[0],f=[1];for(let k=1;k<pts.length;k++)cum.push(cum[k-1]+Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]));
 for(let k=1;k<pts.length;k++){const A=pts[k-1],Bq=pts[k],Cq=pts[k+1]||Bq;let da=Math.atan2(Cq[1]-Bq[1],Cq[0]-Bq[0])-Math.atan2(Bq[1]-A[1],Bq[0]-A[0]);while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;f.push((1-0.55*Math.min(1,Math.abs(da)/0.6))*(rvRim(Math.floor(Bq[0]),Math.floor(Bq[1]))?0.45:rvLine(Math.floor(Bq[0]),Math.floor(Bq[1]))?0.5:1))*(B[e.d].veh==='sled'&&terr[Math.floor(Bq[1])*MW+Math.floor(Bq[0])]===2?1.35:1);}   /* slower in turns and on crater rims */
 e._rp={key,pts,cum,f,L:cum[cum.length-1]};return e._rp;}
function rvAt(P,d){const c=P.cum;d=Math.max(0,Math.min(P.L,d));let lo=0,hi=c.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(c[m]<=d)lo=m;else hi=m;}
 const A=P.pts[lo],Bq=P.pts[hi],t=c[hi]>c[lo]?(d-c[lo])/(c[hi]-c[lo]):0;return{x:A[0]+(Bq[0]-A[0])*t,y:A[1]+(Bq[1]-A[1])*t,a:Math.atan2(Bq[1]-A[1],Bq[0]-A[0]),f:P.f[lo]+(P.f[hi]-P.f[lo])*t};}

/* ---------- simulation (from updBuilding) ---------- */
function updRover(e,dt){const tg=rvTarget(e);while(e.rv.length<e.rn)e.rv.push({st:0,p:0,c:{},w:0});
 e.want=!!tg;e._msg='';
 if(!tg){if(e.k==='tdepot')return;const ks=Object.keys(e.store);if(ks.length)for(let a=0;a<2;a++){let moved=false;for(let k=0;k<ks.length;k++){const it=ks[(e.si=(e.si||0)+1)%ks.length];if(e.store[it]>0&&pushOut(e,it)){if(--e.store[it]<=0)delete e.store[it];moved=true;break;}}if(!moved)break;}return;}
 const P=rvPath(e,tg);if(!P){e._msg='No route: buildings or crater rims are in the way';return;}
 let loading=false;
 for(const r of e.rv){
  if(r.st===0){if(loading)continue;const fl=e.k==='tdepot',ek=Object.keys(e.store).find(k=>e.store[k]>0),clash=fl&&ek&&Object.keys(tg.store).some(k=>k!==ek&&tg.store[k]>0),room=clash?0:B[tg.d].cap-rvCount(tg),n=rvCount(e);if(clash)e._msg='The destination holds a different fluid';if(e.pw>0&&n>0&&room>0){loading=true;r.w+=dt;const cap=fl?VP(e).fcap:VP(e).cap;if(r.w>=VP(e).load&&(n>=cap||r.w>=VP(e).wait)){let take=Math.min(cap,room);r.c={};
     for(const k of Object.keys(e.store)){const m=Math.min(take,e.store[k]);if(m>0){r.c[k]=m;e.store[k]-=m;if(!e.store[k])delete e.store[k];take-=m;}if(take<=0)break;}r.st=1;r.p=0;r.w=0;}}else r.w=0;continue;}
  const at=rvAt(P,r.p),sp=VP(e).spd*Math.max(0.35,at.f)*dt,p0=r.p;
  if(r.st===1){if(r.p<P.L)r.p=Math.min(P.L,r.p+sp);else{r.w+=dt;if(r.w>=VP(e).unload){let n=0;for(const k of Object.keys(r.c)){const m=Math.min(B[tg.d].cap-rvCount(tg),r.c[k]);if(m>0){tg.store[k]=(tg.store[k]||0)+m;r.c[k]-=m;n+=m;}if(!r.c[k])delete r.c[k];}e.del=(e.del||0)+n;r.st=2;r.w=0;}}}
  else if(r.st===2){r.p=Math.max(0,r.p-sp);if(r.p<=0){for(const k in r.c)e.store[k]=(e.store[k]||0)+r.c[k];r.c={};r.st=0;r.w=0;}}
  if(r.p!==p0){r.tk=(r.tk||0)+Math.abs(r.p-p0);if(r.tk>=0.4){r.tk=0;const q=rvAt(P,r.p);RVTR.push([q.x,q.y,q.a,S.t,B[e.d].veh==='sled'?1:0]);if(RVTR.length>4000)RVTR.splice(0,500);
    if(typeof parts!=='undefined'&&parts.length<600&&Math.random()<0.18)parts.push({x:q.x-Math.cos(q.a)*(r.st===1?0.4:-0.4),y:q.y-Math.sin(q.a)*(r.st===1?0.4:-0.4),vx:(Math.random()-0.5)*0.2,vy:-0.05-Math.random()*0.1,r:0.07+Math.random()*0.05,t:0,m:0.9,k:1});   /* small, short dust puffs (Session 59b) */}}}}
/* rover positions for drawing: parked ones sit on the depot's charging pad */
function rvPos(e){const tg=rvTarget(e),P=tg&&e._rp&&e._rp.L?e._rp:null,out=[];
 e.rv.slice(0,e.rn).forEach((r,k)=>{if(r.st===0||!P)out.push({x:e.x+0.75+k*0.75,y:e.y+2.15,a:-Math.PI/2,r,park:true});else{const q=rvAt(P,r.p);out.push({x:q.x,y:q.y,a:r.st===2?q.a+Math.PI:q.a,r,park:false});}});return out;}

/* ---------- panel ---------- */
function roverStatic(e){if(e.k!=='rdepot'&&e.k!=='tdepot')return'';const fl=e.k==='tdepot';const tg=rvTarget(e);
 return`<h4>Rover route</h4><div class="muted" style="margin-bottom:6px">${tg?`${fl?'Tanker rovers carry the fluid':'Rovers drive the goods'} to the ${B[e.d].n} at ${tg.x}, ${tg.y}.${fl?' Fill this depot from a pipe through a Pipe Junction.':''}`:fl?'Not linked: this depot receives tanker rovers and feeds the fluid into its pipes (through a Pipe Junction).':'Not linked: this depot receives rovers and passes their goods on to outgoing belts.'}</div>
  <button class="btn" data-act="rvLink">📍 ${tg?'Change destination':'Send to…'}</button>${tg?' <button class="btn" data-act="rvUnlink">✕ Unlink</button>':''}
  <h4>Rovers</h4><div class="chips"><button class="btn chip" data-act="rvAdd" ${e.rn<VP(e).max&&afford(VP(e).cost)?'':'disabled'}>+ Add a rover</button><button class="btn chip" data-act="rvDel" ${e.rn>1?'':'disabled'}>− Remove one</button></div>
  <div class="muted" style="margin-top:4px">Up to ${VP(e).max} per depot · each extra rover: ${Object.entries(VP(e).cost).map(([k,v])=>v+' '+IT[k].n).join(', ')} · ${fl?VP(e).fcap+' m³':VP(e).cap+' items'} per trip.</div>`;}
function roverDyn(e){if(e.k!=='rdepot'&&e.k!=='tdepot')return'';const tg=rvTarget(e),n=rvCount(e),P=tg&&e._rp&&e._rp.L?e._rp:null,fl=e.k==='tdepot',u=fl?' m³':'';
 let h=`<div class="row"><span>Stored</span><span>${n}/${B[e.d].cap}${u}</span></div><div class="bar"><i style="width:${n/B[e.d].cap*100}%"></i></div>${bufList(e.store)}`;
 if(e._msg)h+=`<div class="plbad" style="margin:4px 0">⚠ ${e._msg}</div>`;
 if(tg&&P){const trip=2*P.L/(VP(e).spd*0.85)+VP(e).load+VP(e).unload;h+=`<div class="row"><span>Route</span><span>${Math.round(P.L)} tiles · ≈ ${Math.round(trip)} s round trip</span></div><div class="row"><span>Throughput</span><span>≈ ${fmt(e.rn*(fl?VP(e).fcap:VP(e).cap)*60/trip)}${fl?' m³':' items'}/min</span></div><div class="row"><span>Delivered so far</span><span>${fmt(e.del||0)}</span></div>`;
  e.rv.slice(0,e.rn).forEach((r,k)=>{const c=Object.keys(r.c).reduce((a,q)=>a+r.c[q],0);h+=`<div class="row"><span>Rover ${k+1}</span><span>${r.st===1?`driving out (${Math.round(r.p/P.L*100)}%) · ${c} items`:r.st===2?`returning (${Math.round((1-r.p/P.L)*100)}%)`:e.pw>0?(r.w>0?`loading ${fmt(Math.min(rvCount(e),fl?VP(e).fcap:VP(e).cap))}/${fl?VP(e).fcap:VP(e).cap} · leaves when full or in ${Math.max(0,Math.ceil(VP(e).wait-r.w))} s`:'waiting for goods'):'charging: no power'}</span></div>`;});}
 return h;}
Object.assign(ACT,{
 rvLink:()=>{const e=ents.get(UI.panel.arg);if(!e)return;UI.linkFrom=e.id;setTool(null);toast('Tap the Rover Depot the rovers should drive to');updInfo();},
 rvUnlink:()=>{const e=ents.get(UI.panel.arg);if(!e)return;e.lx=e.ly=null;renderPanel(true);},
 rvAdd:()=>{const e=ents.get(UI.panel.arg);if(!e||e.rn>=VP(e).max||!afford(VP(e).cost))return;pay(VP(e).cost);e.rn++;sfx('place');renderPanel(true);},
 rvDel:()=>{const e=ents.get(UI.panel.arg);if(!e||e.rn<=1)return;const k=e.rv.findIndex((r,i)=>i<e.rn&&r.st===0);if(k<0){toast('All rovers are out: wait until one is back');return;}
  const r=e.rv.splice(k,1)[0];for(const q in r.c)e.store[q]=(e.store[q]||0)+r.c[q];e.rn--;refund(VP(e).cost);renderPanel(true);}});

/* ---------- 2D ---------- */
function drawRovers(sx,sy,s){if(RVTR.w!==S.w){RVTR.length=0;RVTR.w=S.w;}if(!rdepots.length&&!RVTR.length)return;
 /* tyre tracks */
 if(s>6&&RVTR.length){for(const [x,y,a,t,sl] of RVTR){ctx.fillStyle=sl?'#5f86a8':'#000';const age=S.t-t;if(age>120)continue;const X=sx(x),Y=sy(y);if(X<-s||Y<-s||X>cv.width+s||Y>cv.height+s)continue;
   ctx.globalAlpha=(sl?0.3:0.16)*(1-age/120);const c=Math.cos(a),si=Math.sin(a);for(const o of (sl?[-0.17,0.17]:[-0.24,0.24])){const px=X-si*o*s,py=Y+c*o*s;ctx.save();ctx.translate(px,py);ctx.rotate(a);if(sl)ctx.fillRect(-s*0.24,-s*0.025,s*0.48,s*0.05);else ctx.fillRect(-s*0.2,-s*0.05,s*0.4,s*0.1);ctx.restore();}}ctx.globalAlpha=1;}
 /* the selected depot shows its route */
 const sel=UI.panel&&UI.panel.kind==='ent'&&ents.get(UI.panel.arg),src=UI.linkFrom&&ents.get(UI.linkFrom);
 for(const e of [sel,src])if(e&&(e.k==='rdepot'||e.k==='tdepot')){const tg=rvTarget(e);ctx.save();ctx.lineWidth=Math.max(1.5,s*0.07);ctx.setLineDash([s*0.3,s*0.25]);ctx.lineDashOffset=-animT*s*0.8;
  if(e===src&&hover){ctx.strokeStyle='rgba(216,221,226,0.9)';ctx.beginPath();ctx.moveTo(sx(e.x+1.5),sy(e.y+1.5));ctx.lineTo(sx(hover.x+0.5),sy(hover.y+0.5));ctx.stroke();}
  else if(tg){const P=e._rp&&e._rp.L?e._rp:null;if(P){ctx.strokeStyle='rgba(216,221,226,0.85)';ctx.beginPath();P.pts.forEach((q,k)=>k?ctx.lineTo(sx(q[0]),sy(q[1])):ctx.moveTo(sx(q[0]),sy(q[1])));ctx.stroke();}
   else{ctx.strokeStyle='rgba(255,90,70,0.9)';ctx.beginPath();ctx.moveTo(sx(e.x+1.5),sy(e.y+1.5));ctx.lineTo(sx(tg.x+1.5),sy(tg.y+1.5));ctx.stroke();}}ctx.restore();}
 /* rovers: six wheels, white body, cargo bed */
 for(const e of rdepots)for(const q of rvPos(e)){const X=sx(q.x),Y=sy(q.y);if(X<-2*s||Y<-2*s||X>cv.width+2*s||Y>cv.height+2*s)continue;const L=s*0.95,W=s*0.62,bob=q.park?0:Math.sin(animT*14+q.x)*s*0.015;
  ctx.save();ctx.translate(X,Y+bob);ctx.rotate(q.a);ctx.fillStyle='rgba(0,0,0,0.3)';rr(-L/2+s*0.06,-W/2+s*0.08,L,W,s*0.12);ctx.fill();
  if(B[e.d].veh==='sled'){ctx.fillStyle='#3a4450';for(const wy of [-1,1])rr(-L*0.55,wy*W*0.36-s*0.03,L*1.1,s*0.06,s*0.03),ctx.fill();   /* Ice Sled (Session 63): two long skids, slim body, rear track */
   ctx.fillStyle='#2b2f34';rr(-L*0.55,-W*0.18,L*0.3,W*0.36,s*0.04);ctx.fill();ctx.fillStyle='#e8f1f8';rr(-L*0.3,-W*0.3,L*0.78,W*0.6,W*0.3);ctx.fill();ctx.strokeStyle='#7f9fb8';ctx.lineWidth=Math.max(1,s*0.04);ctx.stroke();
   ctx.fillStyle='#3a6e9a';rr(L*0.22,-W*0.2,L*0.16,W*0.4,s*0.05);ctx.fill();}
  else{ctx.fillStyle='#2b2f34';for(const wx of [-0.33,0,0.33])for(const wy of [-1,1])rr(L*wx-s*0.11,wy*W/2-s*0.07,s*0.22,s*0.14,s*0.05),ctx.fill();
  ctx.fillStyle='#eef1f4';rr(-L*0.42,-W*0.36,L*0.84,W*0.72,s*0.1);ctx.fill();ctx.strokeStyle='#8f979f';ctx.lineWidth=Math.max(1,s*0.04);ctx.stroke();
  ctx.fillStyle='#3a4450';rr(L*0.18,-W*0.24,L*0.18,W*0.48,s*0.05);ctx.fill();}
  const k0=Object.keys(q.r.c||{}).find(k=>q.r.c[k]>0);if(e.k==='tdepot'){ctx.fillStyle='#cfe3f0';rr(-L*0.4,-W*0.3,L*0.56,W*0.6,W*0.3);ctx.fill();ctx.strokeStyle='#8f979f';ctx.stroke();if(k0){ctx.fillStyle=IT[k0].c;rr(-L*0.32,-W*0.12,L*0.4,W*0.24,W*0.12);ctx.fill();}}   /* tanker: a round tank with a stripe of its fluid */
  else{ctx.fillStyle=k0?IT[k0].c:'#b9c0c7';rr(-L*0.36,-W*0.24,L*0.46,W*0.48,s*0.04);ctx.fill();}
  ctx.restore();}}

/* ---------- 3D ---------- */
function v3RoverInit(){const part=(geo,c,p,s,rot)=>({g:geo,c:new T3.Color(c),m:new T3.Matrix4().compose(new T3.Vector3(...p),new T3.Quaternion().setFromEuler(new T3.Euler(...(rot||[0,0,0]))),new T3.Vector3(...s))});
 const bx=new T3.BoxGeometry(1,1,1),cy=new T3.CylinderGeometry(0.5,0.5,1,12),P=[part(bx,'#eef1f4',[0,0.42,0],[0.85,0.22,0.55]),part(bx,'#3a4450',[0.25,0.6,0],[0.2,0.16,0.4]),part(cy,'#9aa3ab',[-0.2,0.75,0.18],[0.04,0.4,0.04])];
 for(const wx of [-0.3,0,0.3])for(const wz of [-0.32,0.32])P.push(part(cy,'#2b2f34',[wx,0.15,wz],[0.28,0.12,0.28],[Math.PI/2,0,0]));
 V3.rovP=v3Pool(v3Merge(P),V3.mat,{cast:1,recv:1});
 {const Q=[part(bx,'#3a4450',[0,0.06,0.3],[1.3,0.06,0.07]),part(bx,'#3a4450',[0,0.06,-0.3],[1.3,0.06,0.07]),part(bx,'#e8f1f8',[0.05,0.32,0],[0.95,0.26,0.5]),part(bx,'#2b2f34',[-0.5,0.2,0],[0.35,0.22,0.36]),part(bx,'#3a6e9a',[0.35,0.52,0],[0.12,0.2,0.42],[0,0,-0.4]),part(cy,'#9aa3ab',[0.05,0.14,0.3],[0.05,0.16,0.05]),part(cy,'#9aa3ab',[0.05,0.14,-0.3],[0.05,0.16,0.05])];V3.sledP=v3Pool(v3Merge(Q),V3.mat,{cast:1,recv:1});}   /* Ice Sled 3D (Session 63) */
 {const g=new T3.PlaneGeometry(0.4,0.1);g.rotateX(-Math.PI/2);V3.trkP=v3Pool(g,new T3.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.6,depthWrite:false}),{color:1,order:3});}   /* tyre tracks in 3D (Session 61e) */V3.rovC=v3Pool(new T3.BoxGeometry(1,1,1),new T3.MeshStandardMaterial({roughness:0.6}),{color:1,cast:1});}
function v3Tracks(){const T=V3T;if(RVTR.w!==S.w){RVTR.length=0;RVTR.w=S.w;}const now=performance.now();if(V3.trkT&&now-V3.trkT<300&&V3.trkN===RVTR.length)return;V3.trkT=now;V3.trkN=RVTR.length;
 const pts=RVTR.filter(q=>S.t-q[3]<120),m=v3PoolN(V3.trkP,pts.length*2),dk=new T3.Color('#141418'),gr=new T3.Color('#4a4a50');let i=0;
 const dkS=new T3.Color('#6f93b4'),grS=new T3.Color('#dfe9f2');for(const [x,y,a,t,sl] of pts){const f=(S.t-t)/120;if(sl)T.c.copy(dkS).lerp(grS,f);else T.c.copy(dk).lerp(gr,f);T.e.set(0,-a,0);T.q.setFromEuler(T.e);const c=Math.cos(a),s=Math.sin(a);
  for(const o of [-0.29,0.29]){m.setMatrixAt(i,T.m.compose(T.v.set(x-s*o,0.03,y+c*o),T.q,T.s.set(1,1,1)));m.setColorAt(i,T.c);i++;}}
 m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
function v3Rovers(){if(!V3.rovP||!V3T)return;if(V3.trkP)v3Tracks();const T=V3T,all=rdepots.flatMap(e=>rvPos(e).map(q=>Object.assign(q,{sled:B[e.d].veh==='sled'}))),list=all.filter(q=>!q.sled),sl=all.filter(q=>q.sled),m=v3PoolN(V3.rovP,list.length),cg=list.filter(q=>Object.keys(q.r.c||{}).some(k=>q.r.c[k]>0)),cm=v3PoolN(V3.rovC,cg.length);
 list.forEach((q,i)=>{T.e.set(0,-q.a,0);T.q.setFromEuler(T.e);m.setMatrixAt(i,T.m.compose(T.v.set(q.x,q.park?0.05:0.05+Math.abs(Math.sin(animT*9+q.x*3))*0.04,q.y),T.q,T.s.set(1.2,1.2,1.2)));});
 cg.forEach((q,i)=>{const k0=Object.keys(q.r.c).find(k=>q.r.c[k]>0);T.e.set(0,-q.a,0);T.q.setFromEuler(T.e);cm.setMatrixAt(i,T.m.compose(T.v.set(q.x,0.72,q.y),T.q,T.s.set(0.5,0.18,0.45)));cm.setColorAt(i,T.c.set(IT[k0].c));});
 m.instanceMatrix.needsUpdate=true;cm.instanceMatrix.needsUpdate=true;if(cm.instanceColor)cm.instanceColor.needsUpdate=true;
 if(V3.sledP){const sm=v3PoolN(V3.sledP,sl.length);sl.forEach((q,i)=>{T.e.set(0,-q.a,q.park?0:Math.sin(animT*7+q.x)*0.03);T.q.setFromEuler(T.e);sm.setMatrixAt(i,T.m.compose(T.v.set(q.x,0.04,q.y),T.q,T.s.set(1.2,1.2,1.2)));});sm.instanceMatrix.needsUpdate=true;}}
