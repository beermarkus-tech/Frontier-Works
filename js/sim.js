'use strict';
/* ================= STATE ================= */
let S, ents=new Map(), grid=new Int32Array(MW*MH), nextId=1;
let terr, nodeAt, nodes=[], terrC, bio;
let topoVer=0, topoDirty=true, beltOrder=[], routers=[], crosses=[], buildings=[], pnodes=[], grids=[], pwLinks=[], pads=[];
let tickNo=0;
const stat={p:{},c:{},hist:[],acc:0};

function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mkNoise(r,cell){const gw=Math.ceil(MW/cell)+2,gh=Math.ceil(MH/cell)+2,v=[];for(let i=0;i<gw*gh;i++)v.push(r());
 const sm=t=>t*t*(3-2*t);return(x,y)=>{const fx=x/cell,fy=y/cell,ix=Math.floor(fx),iy=Math.floor(fy),tx=sm(fx-ix),ty=sm(fy-iy);
 const a=v[iy*gw+ix],b=v[iy*gw+ix+1],c=v[(iy+1)*gw+ix],d=v[(iy+1)*gw+ix+1];return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;};}

function genMap(seed){if(S&&S.gen===2)genBiome(seed);else genClassic(seed);}
function genClassic(seed){   // maps made before biomes: must stay exactly as they were
 bio=new Uint8Array(MW*MH);
 const r=rng(seed), n1=mkNoise(r,18), n2=mkNoise(r,7), n3=mkNoise(r,4);
 terr=new Uint8Array(MW*MH); nodeAt=new Array(MW*MH).fill(null); nodes=[];
 const cx=MW/2, cy=MH/2;
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
  let v=n1(x,y)*0.65+n2(x,y)*0.35; const d=Math.hypot(x-cx,y-cy);
  if(d<14) v=Math.max(v,0.45+ (14-d)*0.01);
  let t=0; if(v<0.3)t=1; else if(v<0.34)t=2; else if(v>0.7 && n3(x,y)>0.45)t=3;
  terr[y*MW+x]=t;
 }
 // guaranteed pond
 for(let y=-5;y<=5;y++)for(let x=-6;x<=6;x++){const d=Math.hypot(x/1.3,y);const X=cx+16+x,Y=cy+5+y;if(d<4.2)terr[Y*MW+X]=1;else if(d<5.2&&terr[Y*MW+X]!==1)terr[Y*MW+X]=2;}
 const add=(t,x,y,p)=>{const i=y*MW+x;if(nodeAt[i])return false;if(t!=='oil'&&terr[i]===1)return false;terr[i]=terr[i]===1?2:(terr[i]===3?3:terr[i]);const n={t,x,y,p};nodes.push(n);nodeAt[i]=n;return true;};
 add('iron',cx-9,cy-3,2);add('iron',cx-8,cy+6,1);add('copper',cx+8,cy-7,1);add('copper',cx+3,cy-11,0);add('limestone',cx+6,cy+8,1);add('limestone',cx-2,cy+11,1);add('coal',cx-4,cy-10,1);add('coal',cx-12,cy+1,0);
 const near=(x,y,rr)=>{for(const n of nodes)if(Math.abs(n.x-x)<rr&&Math.abs(n.y-y)<rr)return true;return false;};
 const place=(t,count,minD,maxD)=>{let k=0;for(let a=0;a<6000&&k<count;a++){const x=2+Math.floor(r()*(MW-4)),y=2+Math.floor(r()*(MH-4));const d=Math.hypot(x-cx,y-cy);if(d<minD||d>maxD)continue;if(Math.abs(x-cx)<5&&Math.abs(y-cy)<5)continue;const i=y*MW+x;if(t!=='oil'&&terr[i]===1)continue;if(t==='oil'&&terr[i]===1&&r()<0.5)continue;if(near(x,y,4))continue;const q=r();if(add(t,x,y,q<0.3?0:q<0.8?1:2))k++;}};
 place('iron',26,12,62);place('copper',20,12,62);place('limestone',18,12,62);place('coal',18,14,62);
 place('sulfur',10,24,62);place('quartz',10,24,62);place('bauxite',10,28,62);place('oil',12,24,62);place('uranium',6,38,62);
 prepTerrain(seed);
}

/* Biome maps: jittered seed points get a biome by distance from the start, tiles take the nearest point
   (with warped coordinates for organic borders), then terrain thresholds and resource odds follow the biome. */
function genBiome(seed){
 const r=rng((seed^0x2f6b1a3c)>>>0),n1=mkNoise(r,18),n2=mkNoise(r,7),n3=mkNoise(r,4),wx=mkNoise(r,40),wy=mkNoise(r,40),vx=mkNoise(r,13),vy=mkNoise(r,13);
 const T=MW*MH,cx=MW/2,cy=MH/2,NB=BIOMES.length;
 terr=new Uint8Array(T);bio=new Uint8Array(T);nodeAt=new Array(T).fill(null);nodes=[];
 const pick=w=>{let s=0;for(const v of w)s+=v;let q=r()*s;for(let i=0;i<w.length;i++){q-=w[i];if(q<=0)return i;}return 0;};
 const band=d=>d<55?[1,0,0,0,0,0,0]:d<115?[1,3,2,2,2,0,0]:d<170?[0,1,2,2,2,2,0.6]:[0,0,1,1,0.5,2,2.5];
 const G=48,pts=[];
 for(let gy=0;gy<MH/G;gy++)for(let gx=0;gx<MW/G;gx++){const x=(gx+0.15+r()*0.7)*G,y=(gy+0.15+r()*0.7)*G,d=Math.hypot(x-cx,y-cy);pts.push({x,y,d,b:pick(band(d))});}
 for(let b=1;b<NB;b++)if(!pts.some(p=>p.b===b)){const c=pts.filter(p=>p.d>=55&&band(p.d)[b]>0&&pts.filter(q=>q.b===p.b).length>1);if(c.length)c[Math.floor(r()*c.length)].b=b;}
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
  const qx=x+(wx(x,y)-0.5)*44+(vx(x,y)-0.5)*12,qy=y+(wy(x,y)-0.5)*44+(vy(x,y)-0.5)*12;let best=0,bd=1e9;
  for(let k=0;k<pts.length;k++){const dx=pts[k].x-qx,dy=pts[k].y-qy,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=k;}}
  bio[y*MW+x]=Math.hypot(x-cx,y-cy)<36?0:pts[best].b;}
 // terrain thresholds blend across biome borders (box blur of the per-biome parameters)
 const par=[0,1,2,3].map(k=>{const a=new Float32Array(T);for(let i=0;i<T;i++)a[i]=BIOMES[bio[i]].t[k];return boxBlur(a,MW,MH,5);});
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=y*MW+x;
  let v=n1(x,y)*0.65+n2(x,y)*0.35;const d=Math.hypot(x-cx,y-cy);if(d<14)v=Math.max(v,0.45+(14-d)*0.01);
  const wt=par[0][i];let t=0;if(v<wt)t=1;else if(v<wt+par[1][i])t=2;else if(v>par[2][i]&&n3(x,y)>par[3][i])t=3;terr[i]=t;}
 for(let y=-5;y<=5;y++)for(let x=-6;x<=6;x++){const d=Math.hypot(x/1.3,y);const X=cx+16+x,Y=cy+5+y;if(d<4.2)terr[Y*MW+X]=1;else if(d<5.2&&terr[Y*MW+X]!==1)terr[Y*MW+X]=2;}
 const add=(t,x,y,p)=>{const i=y*MW+x;if(nodeAt[i])return false;if(t!=='oil'&&terr[i]===1)return false;terr[i]=terr[i]===1?2:(terr[i]===3?3:terr[i]);const n={t,x,y,p};nodes.push(n);nodeAt[i]=n;return true;};
 add('iron',cx-9,cy-3,2);add('iron',cx-8,cy+6,1);add('copper',cx+8,cy-7,1);add('copper',cx+3,cy-11,0);add('limestone',cx+6,cy+8,1);add('limestone',cx-2,cy+11,1);add('coal',cx-4,cy-10,1);add('coal',cx-12,cy+1,0);
 const near=(x,y,rr)=>{for(let j=-rr;j<=rr;j++)for(let i=-rr;i<=rr;i++){const X=x+i,Y=y+j;if(X>=0&&Y>=0&&X<MW&&Y<MH&&nodeAt[Y*MW+X])return true;}return false;};
 const RES=Object.keys(NODE_T),gate={sulfur:24,quartz:24,bauxite:28,oil:24,uranium:45};
 const tryAt=(x,y,t)=>{const i=y*MW+x,d=Math.hypot(x-cx,y-cy),Bm=BIOMES[bio[i]];if(d<12||(Math.abs(x-cx)<5&&Math.abs(y-cy)<5))return false;
  if(!t){const w=RES.map(k=>gate[k]&&d<gate[k]?0:(Bm.res[k]||0));t=RES[pick(w)];}
  if(t!=='oil'&&terr[i]===1)return false;if(t==='oil'&&terr[i]===1&&r()<0.5)return false;if(near(x,y,4))return false;
  const q=r(),pb=Bm.pure;return add(t,x,y,q<0.3-pb*0.12?0:q<0.8-pb*0.15?1:2);};
 let land=0;for(let i=0;i<T;i++)if(terr[i]!==1)land++;
 const target=Math.round(land/105);
 for(let a=0,k=0;a<target*25&&k<target;a++){const x=2+Math.floor(r()*(MW-4)),y=2+Math.floor(r()*(MH-4));if(r()>BIOMES[bio[y*MW+x]].dens)continue;if(tryAt(x,y))k++;}
 // every resource must exist: top up rare ones in the biomes that favour them
 for(const t of RES){let c=nodes.filter(n=>n.t===t).length;const fav=BIOMES.map((b,i)=>[b.res[t]||0,i]).sort((a,b)=>b[0]-a[0]).slice(0,2).map(x=>x[1]);
  for(let a=0;a<40000&&c<8;a++){const x=2+Math.floor(r()*(MW-4)),y=2+Math.floor(r()*(MH-4));if(fav.includes(bio[y*MW+x])&&tryAt(x,y,t))c++;}}
 prepTerrain(seed);
}
function boxBlur(a,w,h,rad){const t=new Float32Array(a.length),o=new Float32Array(a.length);
 for(let y=0;y<h;y++){let s=0,n=0;for(let x=-rad;x<w+rad;x++){if(x+rad<w){s+=a[y*w+x+rad];n++;}if(x-rad-1>=0){s-=a[y*w+x-rad-1];n--;}if(x>=0&&x<w)t[y*w+x]=s/n;}}
 for(let x=0;x<w;x++){let s=0,n=0;for(let y=-rad;y<h+rad;y++){if(y+rad<h){s+=t[(y+rad)*w+x];n++;}if(y-rad-1>=0){s-=t[(y-rad-1)*w+x];n--;}if(y>=0&&y<h)o[y*w+x]=s/n;}}
 return o;}
const biomeAt=(x,y)=>bio&&x>=0&&y>=0&&x<MW&&y<MH?BIOMES[bio[(y|0)*MW+(x|0)]]:BIOMES[0];
function newGame(seed){
 MW=MH=MAP_NEW;
 S={gen:2,mw:MAP_NEW,seed:seed||((Math.random()*1e9)|0),inv:Object.assign({},START_INV),ms:0,oc:false,ub:[...START_B],ur:[...START_R],t:0,won:false,cam:{x:MW/2,y:MH/2,z:1.2},spd:1};
 ents=new Map();grid=new Int32Array(MW*MH);nextId=1;
 genMap(S.seed);
 placeEnt('core',MW/2-2,MH/2-2,0,true);
 topoDirty=true;setCam(S.cam);
}
const has=(arr,v)=>arr.indexOf(v)>=0;
const ub=id=>has(S.ub,id), ur=id=>has(S.ur,id);

/* ================= ENTITIES ================= */
const entAt=(x,y)=>(x<0||y<0||x>=MW||y>=MH)?null:(grid[y*MW+x]?ents.get(grid[y*MW+x]):null);
const isLine=k=>k==='belt'||k==='pipe';
function canPlace(id,x,y){
 const d=B[id],w=d.w;
 if(x<0||y<0||x+w>MW||y+w>MH)return 'Out of bounds';
 let water=0,node=null;
 for(let j=0;j<w;j++)for(let i=0;i<w;i++){const idx=(y+j)*MW+x+i;
  if(grid[idx]){const o=ents.get(grid[idx]);if(!(isLine(d.k)&&o.k===d.k))return 'Blocked';}
  if(terr[idx]===1)water++; if(nodeAt[idx]&&!node)node=nodeAt[idx];}
 if(d.k==='pump'&&d.water){if(water<w*w)return 'Must sit fully on water';}
 else if(!d.ow&&water>0&&!(d.k==='pump'&&d.oil))return 'Cannot build on water';
 if(d.k==='drill'&&(!node||node.t==='oil'))return 'Needs an ore node underneath';
 if(d.k==='pump'&&d.oil&&(!node||node.t!=='oil'))return 'Needs an oil well underneath';
 return '';
}
function afford(cost,mult){mult=mult||1;for(const k in cost)if((S.inv[k]||0)<cost[k]*mult)return false;return true;}
function pay(cost){for(const k in cost)S.inv[k]-=cost[k];}
function give(k,n){if(!n)return;if(IT[k]&&IT[k].f)return;S.inv[k]=(S.inv[k]||0)+n;}
function refund(cost){for(const k in cost)give(k,cost[k]);}

function placeEnt(id,x,y,dir,free){
 const d=B[id];const why=canPlace(id,x,y);if(why)return why;
 let carry=null;
 const old=d.w===1?entAt(x,y):null;
 if(old){ if(old.d===id&&old.dir===dir)return 'same'; }
 if(!free){ let c=d.cost; if(!afford(c))return 'Not enough materials'; }
 if(old){carry=old.item;removeEnt(old,true,true);}
 if(!free)pay(d.cost);
 const e={id:nextId++,d:id,k:d.k,x,y,w:d.w,h:d.w,dir:dir||0};
 initEnt(e,d);
 if(carry&&isLine(e.k)&&IT[carry].f===(e.k==='pipe'))e.item=carry;
 ents.set(e.id,e);e.born=animT;
 for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(y+j)*MW+x+i]=e.id;
 topoDirty=true;return '';
}
function initEnt(e,d){
 switch(e.k){
  case 'belt':case 'pipe':e.item=e.item||null;e.prog=e.prog||0;e.spd=d.spd;break;
  case 'router':e.item=e.item||null;e.rr=0;e.filter=e.filter||null;e.req={};e.lastIn=-1;break;
  case 'cross':e.hs=e.hs||null;e.vs=e.vs||null;e.hd=e.hd||0;e.vd=e.vd||1;break;
  case 'mach':e.r=e.r||null;e.inb=e.inb||{};e.outb=e.outb||{};e.prog=e.prog||0;e.run=!!e.run;e.clock=e.clock||1;e.rr=0;break;
  case 'drill':case 'pump':{e.buf=e.buf||0;e.prog=e.prog||0;e.clock=e.clock||1;e.rr=0;let nd=null;for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++){const n=nodeAt[(e.y+j)*MW+e.x+i];if(n&&!nd)nd=n;}e.node=nd;break;}
  case 'gen':e.fuel=e.fuel||{};e.energy=e.energy||0;e.water=e.water||0;e.wacc=e.wacc||0;e.outb=e.outb||{};e.trip=!!e.trip;e.load=0;e.rr=0;break;
  case 'pole':e.trip=!!e.trip;break;
  case 'storage':e.store=e.store||{};e.rr=0;break;
  case 'dpad':e.store=e.store||{};e.rr=0;e.dr=Object.assign({st:0,t:0,c:{},w:0,tx:0,ty:0},e.dr||{});break;
  case 'tank':e.ft=e.ft||null;e.amt=e.amt||0;e.rr=0;break;
 }
 e.pw=0;e.want=false;
}
function removeEnt(e,ref,silent){
 if(e.k==='core')return;
 for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(e.y+j)*MW+e.x+i]=0;
 ents.delete(e.id);
 if(ref){refund(B[e.d].cost);
  if(!silent&&e.item)give(e.item,1);
  if(e.k==='cross'){if(e.hs)give(e.hs,1);if(e.vs)give(e.vs,1);}
  for(const b of [e.inb,e.outb,e.store,e.fuel])if(b)for(const k in b)give(k,Math.floor(b[k]));
  if((e.k==='drill')&&e.node&&e.buf)give(NODE_T[e.node.t][0],e.buf);
  if(e.k==='dpad'&&e.dr)for(const k in e.dr.c)give(k,e.dr.c[k]);
 }
 topoDirty=true;
}

/* ================= TRANSFER ================= */
function capIn(n){return Math.max(n*2,4);}
function capOut(n){return Math.max(n*2,10);}
function accept(e,item,dir,carry){
 const fl=IT[item].f;
 switch(e.k){
  case 'belt':case 'pipe':
   if(e.item||fl!==(e.k==='pipe'))return false; if(((dir+2)&3)===e.dir)return false;
   e.item=item;e.prog=(dir===e.dir||dir===e.cin)?Math.min(Math.max(carry||0,0),0.95):0.5;return true;
  case 'router':{
   if(fl!==!!B[e.d].fl)return false;
   const sub=B[e.d].sub;
   if(sub==='split'||sub==='sort'){if(dir!==e.dir||e.item)return false;}
   else if(sub==='merge'){
    if(dir===((e.dir+2)&3))return false;
    if(e.item){e.req[dir]=tickNo;return false;}
    if(e.lastIn===dir){for(let od=0;od<4;od++)if(od!==dir&&e.req[od]>=tickNo-1){e.req[dir]=tickNo;e.lastIn=-1;return false;}}
    e.lastIn=dir;
   } else if(e.item)return false;
   e.item=item;e.inDir=dir;return true;}
  case 'cross':
   if(dir===0||dir===2){if(e.hs)return false;e.hs=item;e.hd=dir;return true;}
   if(e.vs)return false;e.vs=item;e.vd=dir;return true;
  case 'mach':{
   if(!e.r)return false;const r=RC[e.r];const need=r.i[item];if(!need)return false;
   if((e.inb[item]||0)>=capIn(need))return false;e.inb[item]=(e.inb[item]||0)+1;return true;}
  case 'gen':{const d=B[e.d];
   if(item==='water'&&d.water){if(e.water>=100)return false;e.water++;return true;}
   if(!has(d.fuels,item))return false;const cap=item==='fuel_rod'?5:50;if((e.fuel[item]||0)>=cap)return false;e.fuel[item]=(e.fuel[item]||0)+1;return true;}
  case 'storage':case 'dpad':{if(fl)return false;let t=0;for(const k in e.store)t+=e.store[k];if(t>=B[e.d].cap)return false;e.store[item]=(e.store[item]||0)+1;return true;}
  case 'tank':if(!fl||(e.ft&&e.ft!==item&&e.amt>0)||e.amt>=B[e.d].cap)return false;e.ft=item;e.amt++;return true;
  case 'core':if(fl)return false;S.inv[item]=(S.inv[item]||0)+1;return true;
  case 'incin':stat.c[item]=(stat.c[item]||0)+1;return true;
 }
 return false;
}
function perim(e){const p=[];
 for(let i=0;i<e.w;i++){p.push({x:e.x+i,y:e.y-1,d:3});p.push({x:e.x+e.w,y:e.y+i,d:0});p.push({x:e.x+e.w-1-i,y:e.y+e.h,d:1});p.push({x:e.x-1,y:e.y+e.h-1-i,d:2});}
 return p;}
/* Would t take item arriving in direction d (without changing anything)? Used to see through a crossing. */
function passOK(t,item,d){const fl=IT[item].f;
 if(isLine(t.k))return t.dir===d&&fl===(t.k==='pipe');
 if(t.k==='router'){const b=B[t.d];if(fl!==!!b.fl)return false;if(b.sub==='merge')return d!==((t.dir+2)&3);if(b.sub==='junc')return true;return d===t.dir;}
 if(t.k==='cross')return true;
 if(t.k==='mach')return !!(t.r&&RC[t.r].i[item]);
 if(t.k==='gen')return has(B[t.d].fuels,item)||(item==='water'&&!!B[t.d].water);
 if(t.k==='tank')return fl;
 return t.k==='storage'||t.k==='core'?!fl:t.k==='incin';}
function pushOut(e,item){
 const n=e.ports.length;
 for(let k=0;k<n;k++){const idx=(e.rr+k)%n,p=e.ports[idx];const t=entAt(p.x,p.y);if(!t)continue;
  if(isLine(t.k)){if(t.dir!==p.d)continue;}else if(t.k==='cross'){const far=entAt(t.x+DX[p.d],t.y+DY[p.d]);if(!far||!passOK(far,item,p.d))continue;}
  else if(t.k!=='router')continue;
  if(accept(t,item,p.d,0)){e.rr=(idx+1)%n;return true;}}
 return false;
}

/* ================= TOPOLOGY ================= */
function cen(e){return{x:e.x+e.w/2,y:e.y+e.h/2};}
function rectDist(px,py,e){const dx=Math.max(e.x-px,0,px-(e.x+e.w)),dy=Math.max(e.y-py,0,py-(e.y+e.h));return Math.hypot(dx,dy);}
/* Does side neighbour sd (lying in direction o from line e) push items into e? Used for belt/pipe curves:
   another line pointing in, a splitter/sorter/merger with an output side facing e, a pipe junction (pipes),
   or a crossing whose far side is fed in the same direction (items pass straight through it). */
function feedsInto(sd,e,o){const into=(o+2)&3;
 if(isLine(sd.k))return sd.k===e.k&&sd.dir===into;
 if(sd.k==='router'){const d=B[sd.d];if(!!d.fl!==(e.k==='pipe'))return false;const D=sd.dir;
  if(d.sub==='merge')return into===D;if(d.sub==='junc')return true;return into===D||into===((D+1)&3)||into===((D+3)&3);}
 if(sd.k==='cross'){const far=entAt(sd.x+DX[o],sd.y+DY[o]);return !!far&&isLine(far.k)&&far.k===e.k&&far.dir===into;}
 return false;}
function rebuildTopo(){
 topoDirty=false;topoVer++;beltOrder=[];routers=[];crosses=[];buildings=[];pnodes=[];grids=[];pwLinks=[];pads=[];
 const lines=[];
 for(const e of ents.values()){
  if(isLine(e.k))lines.push(e);else if(e.k==='router')routers.push(e);else if(e.k==='cross')crosses.push(e);
  else if(e.k!=='pole'){e.ports=perim(e);buildings.push(e);}
  if(e.k==='pole'||e.k==='gen')pnodes.push(e);if(e.k==='dpad')pads.push(e);
  e.grid=null;if(B[e.d].pw)e.pw=0;
 }
 for(const e of lines){e.cin=null;const bk=entAt(e.x-DX[e.dir],e.y-DY[e.dir]);if(bk&&(isLine(bk.k)?(bk.k===e.k&&bk.dir===e.dir):true))continue;let f=null,c=0;for(const o of [(e.dir+1)&3,(e.dir+3)&3]){const sd=entAt(e.x+DX[o],e.y+DY[o]);if(sd&&feedsInto(sd,e,o)){f=(o+2)&3;c++;}}if(c===1)e.cin=f;}
 const vis=new Set();
 for(const b of lines){if(vis.has(b))continue;const ch=[];let c=b;while(c&&isLine(c.k)&&!vis.has(c)){vis.add(c);ch.push(c);c=entAt(c.x+DX[c.dir],c.y+DY[c.dir]);}for(let i=ch.length-1;i>=0;i--)beltOrder.push(ch[i]);}
 // power
 const n=pnodes.length,par=[...Array(n).keys()];const f=i=>par[i]===i?i:(par[i]=f(par[i]));
 const C=pnodes.map(cen);const seen=new Set();
 for(let i=0;i<n;i++){const Li=B[pnodes[i].d].link;const cand=[];
  for(let j=0;j<n;j++){if(i===j)continue;const dd=Math.hypot(C[i].x-C[j].x,C[i].y-C[j].y);if(dd<=Math.max(Li,B[pnodes[j].d].link))cand.push([dd,j]);}
  cand.sort((a,b)=>a[0]-b[0]);
  for(const [,j] of cand.slice(0,5)){par[f(i)]=f(j);const key=i<j?i+','+j:j+','+i;if(!seen.has(key)){seen.add(key);pwLinks.push([pnodes[i],pnodes[j]]);}}}
 const gm=new Map();
 for(let i=0;i<n;i++){const r=f(i);if(!gm.has(r))gm.set(r,{gens:[],cons:[],nodes:[],dem:0,cap:0,trip:false});const g=gm.get(r);g.nodes.push(pnodes[i]);pnodes[i].grid=g;if(pnodes[i].k==='gen')g.gens.push(pnodes[i]);}
 grids=[...gm.values()];
 for(const e of ents.values()){if(!B[e.d].pw)continue;let best=null,bd=1e9;
  for(let i=0;i<n;i++){const dd=rectDist(C[i].x,C[i].y,e);if(dd<=B[pnodes[i].d].sup&&dd<bd){bd=dd;best=pnodes[i];}}
  if(best){best.grid.cons.push(e);e.grid=best.grid;}}
}

/* ================= SIMULATION ================= */
function drawMW(e){const d=B[e.d];return e.want?d.pw*Math.pow(e.clock||1,1.6):0;}
function genCan(g){const d=B[g.d];if(d.water&&g.water<1)return false;if(g.d==='reactor'&&(g.outb.waste||0)>=50)return false;if(g.energy>0)return true;for(const f of d.fuels)if((g.fuel[f]||0)>0)return true;return false;}
function powerStep(dt){
 for(const g of grids){
  let dem=0;for(const c of g.cons)dem+=drawMW(c);
  let cap=0;for(const ge of g.gens){ge.can=genCan(ge);if(ge.can)cap+=B[ge.d].cap;}
  let tr=g.nodes.some(x=>x.trip);
  if(!tr&&cap>0&&dem>cap+1e-6){for(const x of g.nodes)x.trip=true;tr=true;toast('⚠ Power fuse tripped — demand exceeds supply');}
  g.trip=tr;g.dem=dem;g.cap=cap;
  const ok=!tr&&cap>0&&dem<=cap+1e-6;
  for(const c of g.cons)c.pw=ok?1:0;
  const load=ok&&cap>0?dem/cap:0;g.prod=ok?dem:0;
  for(const ge of g.gens){ge.load=ge.can?load:0;ge._ls=(ge._ls||0)+(ge.load-(ge._ls||0))*Math.min(1,dt/4);if(ok&&ge.can&&load>0)burn(ge,B[ge.d].cap*load*dt);}   // _ls: load averaged over ~4 s, for the panel
 }
}
function burn(g,mj){const d=B[g.d];
 while(g.energy<mj){let got=false;for(const f of d.fuels)if((g.fuel[f]||0)>0){g.fuel[f]--;g.energy+=IT[f].e;stat.c[f]=(stat.c[f]||0)+1;if(f==='fuel_rod'){g.outb.waste=(g.outb.waste||0)+10;stat.p.waste=(stat.p.waste||0)+10;}got=true;break;}if(!got)break;}
 g.energy=Math.max(0,g.energy-mj);
 if(d.water){g.wacc+=mj*d.water;while(g.wacc>=1&&g.water>0){g.water--;g.wacc--;stat.c.water=(stat.c.water||0)+1;}}
}
function updBelt(e,dt){
 // pipes: smoothed fill level (~1 s) and last fluid, so drawing doesn't blink when a pipe isn't completely full
 if(e.k==='pipe'){const f=e._fl||0;e._fl=f+((e.item?1:0)-f)*Math.min(1,dt/1.1);if(e.item)e._ft=e.item;}
 if(!e.item)return;e.prog+=e.spd*dt;
 if(e.prog>=1){const t=entAt(e.x+DX[e.dir],e.y+DY[e.dir]);if(t&&t!==e&&accept(t,e.item,e.dir,e.prog-1)){e.item=null;e.prog=0;}else e.prog=1;}
}
function updRouter(e){
 if(!e.item)return;const sub=B[e.d].sub,D=e.dir;let outs;
 if(sub==='split')outs=[D,(D+1)&3,(D+3)&3];
 else if(sub==='sort')outs=!e.filter?[D,(D+1)&3,(D+3)&3]:(e.item===e.filter?[D]:[(D+1)&3,(D+3)&3]);
 else if(sub==='merge')outs=[D];
 else outs=[0,1,2,3].filter(o=>o!==((e.inDir+2)&3));
 for(let k=0;k<outs.length;k++){const o=outs[(e.rr+k)%outs.length];const t=entAt(e.x+DX[o],e.y+DY[o]);
  if(t&&accept(t,e.item,o,0)){e.item=null;e.rr=(e.rr+k+1)%outs.length;return;}}
}
function updCross(e){
 // an item heading into a belt/pipe that points back at the crossing can never move (old saves could jam like this): return it to the stock
 const stuck=(t,d)=>t&&isLine(t.k)&&t.dir===((d+2)&3);
 if(e.hs){const t=entAt(e.x+DX[e.hd],e.y+DY[e.hd]);if(t&&accept(t,e.hs,e.hd,0))e.hs=null;else if(stuck(t,e.hd)){give(e.hs,1);e.hs=null;}}
 if(e.vs){const t=entAt(e.x+DX[e.vd],e.y+DY[e.vd]);if(t&&accept(t,e.vs,e.vd,0))e.vs=null;else if(stuck(t,e.vd)){give(e.vs,1);e.vs=null;}}
}
function canStart(e,r){for(const k in r.i)if((e.inb[k]||0)<r.i[k])return false;for(const k in r.o)if((e.outb[k]||0)+r.o[k]>capOut(r.o[k]))return false;return true;}
/* Efficiency: running average over the last EFF_T seconds of "working" vs. why not (e._ef 0..1, e._efw {reason: share}).
   Not saved; it re-measures after loading. Reasons: 'in:<item>' waiting for input, 'out' output full, 'power', 'recipe', 'none'. */
const EFF_T=30;
function effTrack(e,dt,st){const T=e._efT=Math.min(EFF_T,(e._efT||0)+dt),a=dt/T;e._ef=(e._ef||0)*(1-a)+(st==='work'?a:0);
 const w=e._efw||(e._efw={});for(const k in w){w[k]*=1-a;if(w[k]<0.002)delete w[k];}if(st!=='work')w[st]=(w[st]||0)+a;}
function machState(e,r){if(!r)return'recipe';if(e.run)return e.pw>0?'work':'power';
 for(const k in r.i)if((e.inb[k]||0)<r.i[k])return'in:'+k;return'out';}
/* ---------- Drone Pads ----------
   A pad linked to another pad (e.lx,e.ly = its corner) is a sender: its drone loads up to DRONE.cap items, flies straight to the target,
   unloads what fits and flies back (leftovers go back into the pad). It draws power only while busy. An unlinked pad is a receiver
   and passes items on to outgoing belts like a crate. e.dr = {st:0 on pad | 1 out | 2 back, t:0..1 along the route, c:cargo, w:timer, tx,ty:route end}. */
const padCount=e=>{let n=0;for(const k in e.store)n+=e.store[k];return n;};
function padTarget(e){if(e.lx==null)return null;const t=entAt(e.lx,e.ly);return t&&t.k==='dpad'&&t!==e&&t.x===e.lx&&t.y===e.ly?t:null;}
const padRoute=(e,tg)=>Math.hypot(tg.x-e.x,tg.y-e.y);
function updPad(e,dt){const d=B[e.d],D=e.dr,tg=padTarget(e),pw=e.pw>0;
 if(!tg){const ks=Object.keys(e.store);if(ks.length)for(let a=0;a<2;a++){let moved=false;for(let k=0;k<ks.length;k++){const it=ks[(e.si=(e.si||0)+1)%ks.length];if(e.store[it]>0&&pushOut(e,it)){if(--e.store[it]<=0)delete e.store[it];moved=true;break;}}if(!moved)break;}}
 e.want=D.st!==0||(!!tg&&padCount(e)>0&&padCount(tg)<d.cap);
 if(D.st===0){
  if(tg&&pw&&e.want){D.w+=dt;const full=padCount(e)>=Math.min(DRONE.cap,d.cap-padCount(tg));if(D.w>=DRONE.load&&(full||D.w>=DRONE.wait)){let take=Math.min(DRONE.cap,d.cap-padCount(tg));D.c={};
    for(const k of Object.keys(e.store)){const m=Math.min(take,e.store[k]);if(m>0){D.c[k]=m;e.store[k]-=m;if(!e.store[k])delete e.store[k];take-=m;}if(take<=0)break;}
    D.st=1;D.t=0;D.w=0;D.tx=tg.x;D.ty=tg.y;}}else D.w=0;}
 else if(pw){const dist=Math.max(1,Math.hypot(D.tx-e.x,D.ty-e.y));
  if(D.st===1){if(!tg||tg.x!==D.tx||tg.y!==D.ty){D.st=2;}else{D.t=Math.min(1,D.t+DRONE.spd*dt/dist);if(D.t>=1){D.w+=dt;if(D.w>=DRONE.unload){let n=0;
     for(const k in D.c){const m=Math.min(d.cap-padCount(tg),D.c[k]);if(m>0){tg.store[k]=(tg.store[k]||0)+m;D.c[k]-=m;n+=m;}if(!D.c[k])delete D.c[k];}
     e.del=(e.del||0)+n;D.st=2;D.w=0;}}}}
  if(D.st===2){D.t=Math.max(0,D.t-DRONE.spd*dt/dist);if(D.t<=0){for(const k in D.c)e.store[k]=(e.store[k]||0)+D.c[k];D.c={};D.st=0;}}}
}
function updBuilding(e,dt){
 switch(e.k){
  case 'mach':{
   const r=e.r&&RC[e.r];e.want=false;if(!r){effTrack(e,dt,'recipe');return;}
   if(!e.run&&canStart(e,r)){for(const k in r.i){e.inb[k]-=r.i[k];stat.c[k]=(stat.c[k]||0)+r.i[k];}e.run=true;e.prog=0;}
   if(e.run){e.want=true;if(e.pw>0){e.prog+=dt*e.clock/r.t;if(e.prog>=1){for(const k in r.o){e.outb[k]=(e.outb[k]||0)+r.o[k];stat.p[k]=(stat.p[k]||0)+r.o[k];}e.run=false;e.prog=0;
     if(canStart(e,r)){for(const k in r.i){e.inb[k]-=r.i[k];stat.c[k]=(stat.c[k]||0)+r.i[k];}e.run=true;}}}}
   for(const k in e.outb)if(e.outb[k]>0){for(let a=0;a<2&&e.outb[k]>0;a++){if(pushOut(e,k))e.outb[k]--;else break;}}
   effTrack(e,dt,machState(e,r));
   break;}
  case 'drill':case 'pump':{
   const d=B[e.d];let item=null,rate=0;
   if(d.water){item='water';rate=d.rate;}else if(e.node){item=NODE_T[e.node.t][0];rate=d.rate*PUR[e.node.p][0];}
   e.item=item;e.want=!!item&&e.buf<10;
   if(e.want&&e.pw>0){e.prog+=rate*e.clock*dt;while(e.prog>=1&&e.buf<10){e.buf++;e.prog--;stat.p[item]=(stat.p[item]||0)+1;}}
   if(item)for(let a=0;a<2&&e.buf>0;a++){if(pushOut(e,item))e.buf--;else break;}
   effTrack(e,dt,!item?'none':e.want&&e.pw>0?'work':e.buf>=10?'out':'power');
   break;}
  case 'gen':if(e.outb.waste>0)for(let a=0;a<2&&e.outb.waste>0;a++){if(pushOut(e,'waste'))e.outb.waste--;else break;}break;
  case 'storage':{const ks=Object.keys(e.store);if(!ks.length)break;
   for(let a=0;a<2;a++){let moved=false;for(let k=0;k<ks.length;k++){const it=ks[(e.si=(e.si||0)+1)%ks.length];if(e.store[it]>0&&pushOut(e,it)){if(--e.store[it]<=0)delete e.store[it];moved=true;break;}}if(!moved)break;}
   break;}
  case 'tank':if(e.amt>0&&e.ft)for(let a=0;a<3&&e.amt>0;a++){if(pushOut(e,e.ft))e.amt--;else break;}break;
  case 'dpad':updPad(e,dt);break;
 }
}
function tick(dt){
 if(topoDirty)rebuildTopo();
 tickNo++;S.t+=dt;
 powerStep(dt);
 for(const e of routers)updRouter(e);
 for(const e of crosses)updCross(e);
 for(const e of beltOrder)updBelt(e,dt);
 for(const e of buildings)updBuilding(e,dt);
 stat.acc+=dt;if(stat.acc>=1){stat.acc-=1;stat.hist.push({p:stat.p,c:stat.c});if(stat.hist.length>60)stat.hist.shift();stat.p={};stat.c={};}
}
function rates(){const p={},c={};for(const h of stat.hist){for(const k in h.p)p[k]=(p[k]||0)+h.p[k];for(const k in h.c)c[k]=(c[k]||0)+h.c[k];}const m=60/Math.max(1,stat.hist.length);for(const k in p)p[k]*=m;for(const k in c)c[k]*=m;return{p,c};}
