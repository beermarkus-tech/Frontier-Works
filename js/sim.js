'use strict';
/* ================= STATE ================= */
let S, ents=new Map(), grid=new Int32Array(MW*MH), nextId=1;
let terr, nodeAt, nodes=[], terrC, bio;
let nets=[];   // fluid networks (pipes have no direction)
let topoVer=0, topoDirty=true, valves=[], beltOrder=[], routers=[], crosses=[], buildings=[], pnodes=[], grids=[], pwLinks=[], pads=[], meters=[];
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
 S={pw2:1,gen:2,mw:MAP_NEW,seed:seed||((Math.random()*1e9)|0),inv:Object.assign({},START_INV),ms:0,oc:false,ub:[...START_B],ur:[...START_R],t:0,won:false,cam:{x:MW/2,y:MH/2,z:1.2},spd:1};
 ents=new Map();grid=new Int32Array(MW*MH);nextId=1;
 genMap(S.seed);
 placeEnt('core',MW/2-2,MH/2-2,0,true);
 topoDirty=true;setCam(S.cam);if(typeof zoneInit==='function')zoneInit();
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
 let cfm=0;if(old){carry=old.item;cfm=old.fm&&isLine(d.k);removeEnt(old,true,true);}
 if(!free)pay(d.cost);
 const e={id:nextId++,d:id,k:d.k,x,y,w:d.w,h:d.w,dir:dir||0};
 initEnt(e,d);
 if(carry&&isLine(e.k)&&IT[carry].f===(e.k==='pipe'))e.item=carry;
 if(cfm&&afford(B.fmeter.cost)){pay(B.fmeter.cost);e.fm=1;e.fa=[];}   // the meter stays on an upgraded belt
 ents.set(e.id,e);e.born=animT;
 for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(y+j)*MW+x+i]=e.id;
 if(isPN(e)&&S.pw2)pnAuto(e);
 topoDirty=true;return '';
}
function initEnt(e,d){
 switch(e.k){
  case 'belt':case 'pipe':e.item=e.item||null;e.prog=e.prog||0;e.spd=d.spd;break;
  case 'router':e.item=e.item||null;e.rr=0;e.req={};e.lastIn=-1;if(d.sub==='valve'){if(e.vr==null)e.vr=60;e.vacc=0;e.vf=0;}break;
  case 'cross':e.hs=e.hs||null;e.vs=e.vs||null;e.hd=e.hd||0;e.vd=e.vd||1;break;
  case 'mach':e.r=e.r||null;e.inb=e.inb||{};e.outb=e.outb||{};e.prog=e.prog||0;e.run=!!e.run;e.clock=e.clock||1;e.rr=0;break;
  case 'drill':case 'pump':{e.buf=e.buf||0;e.prog=e.prog||0;e.clock=e.clock||1;e.rr=0;let nd=null;for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++){const n=nodeAt[(e.y+j)*MW+e.x+i];if(n&&!nd)nd=n;}e.node=nd;break;}
  case 'gen':e.fuel=e.fuel||{};e.energy=e.energy||0;e.water=e.water||0;e.wacc=e.wacc||0;e.outb=e.outb||{};e.trip=!!e.trip;e.load=0;e.rr=0;break;
  case 'pole':e.trip=!!e.trip;break;
  case 'storage':e.store=e.store||{};e.rr=0;break;
  case 'sign':e.tx=e.tx||'';e.tc=e.tc||0;break;
  case 'dpad':e.store=e.store||{};e.rr=0;e.dr=Object.assign({st:0,t:0,c:{},w:0,tx:0,ty:0},e.dr||{});break;
  case 'tank':e.ft=e.ft||null;e.amt=e.amt||0;e.rr=0;break;
 }
 e.pw=0;e.want=false;
}
/* Moving: same entity (recipe, buffers, clock, fuel, text, routes) at a new corner. The new footprint must be free (apart from itself)
   and valid for the building (water, ore node, …). Drone Pad routes pointing at a moved pad follow it. */
function canMove(e,nx,ny){if(e.k==='core')return 'The Base Core stays put';const w=e.w;
 for(let j=0;j<w;j++)for(let i=0;i<w;i++){const x=nx+i,y=ny+j;if(x<0||y<0||x>=MW||y>=MH)return 'Out of bounds';const id=grid[y*MW+x];if(id&&id!==e.id)return 'Blocked';}
 for(let j=0;j<w;j++)for(let i=0;i<w;i++)grid[(e.y+j)*MW+e.x+i]=0;const why=canPlace(e.d,nx,ny);for(let j=0;j<w;j++)for(let i=0;i<w;i++)grid[(e.y+j)*MW+e.x+i]=e.id;return why;}
/* Resize a placed sign (S/M/L/XL): keeps text and colour; tries the same top-left corner, then the same centre. Pays or refunds the plate difference. */
function resizeSign(e,id){if(e.k!=='sign'||!B[id]||B[id].k!=='sign')return 'Not a sign';if(e.d===id)return '';const o=B[e.d],n=B[id];
 const diff={};for(const k in n.cost)diff[k]=n.cost[k]-((o.cost||{})[k]||0);const more={};for(const k in diff)if(diff[k]>0)more[k]=diff[k];if(!afford(more))return 'Not enough materials';
 const w=e.w;for(let j=0;j<w;j++)for(let i=0;i<w;i++)grid[(e.y+j)*MW+e.x+i]=0;const c=Math.floor((w-n.w)/2);let at=null,why='';
 for(const [x,y] of [[e.x,e.y],[e.x+c,e.y+c]]){why=canPlace(id,x,y);if(!why){at=[x,y];break;}}
 if(!at){for(let j=0;j<w;j++)for(let i=0;i<w;i++)grid[(e.y+j)*MW+e.x+i]=e.id;return why==='Blocked'?'No room for that size here':why;}
 for(const k in diff){if(diff[k]>0)S.inv[k]-=diff[k];else give(k,-diff[k]);}
 e.d=id;e.x=at[0];e.y=at[1];e.w=e.h=n.w;for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(e.y+j)*MW+e.x+i]=e.id;e.born=animT;topoDirty=true;topoVer++;return '';}
function moveEnt(e,nx,ny){const why=canMove(e,nx,ny);if(why)return why;if(nx===e.x&&ny===e.y)return '';const ox=e.x,oy=e.y,w=e.w;
 const peers=isPN(e)?pnPeers(e):null;if(peers)for(const p of peers)pnUnlink(e,p);
 for(let j=0;j<w;j++)for(let i=0;i<w;i++)grid[(oy+j)*MW+ox+i]=0;e.x=nx;e.y=ny;for(let j=0;j<w;j++)for(let i=0;i<w;i++)grid[(ny+j)*MW+nx+i]=e.id;
 if(e.k==='dpad')for(const o of ents.values())if(o.k==='dpad'&&o.lx===ox&&o.ly===oy){o.lx=nx;o.ly=ny;}
 initEnt(e,B[e.d]);e.born=animT;topoDirty=true;
 if(peers){pnAuto(e);for(const p of peers)if(!pnPeers(p).length)pnAuto(p);pnHeal(peers);}return '';}
/* Eraser (Session 36d): empty a building's contents without removing it. Items go back to the item stock, fluids drain away
   (a pipe or junction empties its whole network). Storage (crates, tanks, pads, Core) is left alone. Returns the number of items/units removed. */
const ERASE_K=['belt','pipe','router','cross','mach','drill','pump','gen'];
function eraseEnt(e){if(!e||!ERASE_K.includes(e.k))return 0;let n=0;const back=(k,c)=>{c=Math.floor(c||0);if(k&&c>0){give(k,c);n+=c;}};
 if(e.k==='pipe'||(e.k==='router'&&B[e.d].fl)){const nt=e.net;if(nt&&nt.amt>0){n+=Math.round(nt.amt);nt.amt=0;nt.fluid=null;for(const t of nt.tiles){t.item=null;t.lv=0;}}else if(e.item){e.item=null;e.lv=0;n++;}return n;}
 if(e.k==='belt'||e.k==='router'){if(e.item){back(e.item,1);e.item=null;e.prog=0;}return n;}
 if(e.k==='cross'){back(e.hs,e.hs?1:0);back(e.vs,e.vs?1:0);e.hs=e.vs=null;return n;}
 if(e.k==='mach'){for(const b of [e.inb,e.outb])for(const k in b)back(k,b[k]);if(e.run&&e.r)for(const k in RC[e.r].i)back(k,RC[e.r].i[k]);e.inb={};e.outb={};e.run=false;e.prog=0;return n;}
 if(e.k==='drill'||e.k==='pump'){if(e.buf>0&&e.node){back(NODE_T[e.node.t][0],e.buf);if(IT[NODE_T[e.node.t][0]]&&IT[NODE_T[e.node.t][0]].f)n+=Math.floor(e.buf);}e.buf=0;e.prog=0;return n;}
 if(e.k==='gen'){for(const k in e.outb)back(k,e.outb[k]);e.outb={};return n;}
 return n;}
/* Flow Meter (Session 36f): a marker on a belt/pipe tile (e.fm, saved). Belts remember item arrival times (e.fa): always the last 60 s, and on
   slow belts back to the last 60 items (max 10 min, Session 37l), and the shown value (e.fr) glides towards the measurement; the rate is the time between them (Session 37k: busy belts average over 60 s, 1–2 items/min over several minutes,
   and a belt that stops drops gradually); pipes show their network's flow. fmRate → [per minute, max per minute]. */
function fmRate(e){if(e.k==='pipe'){const n=e.net;return[n?Math.max(n.inR,n.outR):0,(n?n.rate:e.spd)*60];}return[e.fr!=null?e.fr:fmRaw(e),e.spd*60];}
function fmRaw(e){
 const a=e.fa||[],n=a.length;if(n<2)return 0;const span=Math.max(0.5,a[n-1]-a[0]),gap=Math.max(span/(n-1),e.fg||0),extra=Math.max(0,S.t-a[n-1]-gap);

 return 60*(n-1)/(span+extra);}   // the wait since the last item only counts once it's longer than the longest recent gap (items often come in bunches)
function toggleMeter(e){if(!e||!isLine(e.k))return 'Put it on a belt or pipe';if(e.fm){e.fm=0;e.fa=null;e.fr=null;refund(B.fmeter.cost);topoDirty=true;return 'off';}
 if(!afford(B.fmeter.cost))return 'Not enough materials';pay(B.fmeter.cost);e.fm=1;e.fa=[];topoDirty=true;return 'on';}
/* ---------- Power wires (Session 36h) ----------
   Wires are saved per node (pole, tower, switch, generator) as e.pl=[[x,y],…] (corners of linked nodes), kept on both ends.
   A new node wires itself only to the nearest node in range (a tidy tree instead of a web); the pole panel can add/remove wires by hand.
   Removing or moving a node rewires neighbours that were left without any wire. Old saves (no S.pw2): the old web (up to 5 nearest)
   is reduced once to a spanning tree, so exactly the same buildings stay connected. A Power Switch that is off cuts its wires. */
const isPN=e=>!!e&&(e.k==='pole'||e.k==='gen');
function pnRange(a,b){const A=cen(a),C=cen(b);return Math.hypot(A.x-C.x,A.y-C.y)<=Math.max(B[a.d].link||0,B[b.d].link||0)+1e-6;}
function pnLinked(a,b){return (a.pl||[]).some(p=>p[0]===b.x&&p[1]===b.y);}
function pnLink(a,b){if(!a||!b||a===b||pnLinked(a,b))return;(a.pl=a.pl||[]).push([b.x,b.y]);(b.pl=b.pl||[]).push([a.x,a.y]);topoDirty=true;}
function pnUnlink(a,b){a.pl=(a.pl||[]).filter(p=>!(p[0]===b.x&&p[1]===b.y));b.pl=(b.pl||[]).filter(p=>!(p[0]===a.x&&p[1]===a.y));topoDirty=true;}
function pnPeers(e){const out=[];for(const [x,y] of e.pl||[]){const o=entAt(x,y);if(isPN(o)&&o!==e&&o.x===x&&o.y===y&&!out.includes(o))out.push(o);}return out;}
function pnNearest(e,skip){let best=null,bd=1e9;const A=cen(e);for(const o of ents.values()){if(!isPN(o)||o===e||o===skip||!pnRange(e,o))continue;const C=cen(o),d=Math.hypot(A.x-C.x,A.y-C.y);if(d<bd){bd=d;best=o;}}return best;}
function pnAuto(e){const o=pnNearest(e);if(o)pnLink(e,o);}
function pnComp(e){const seen=new Set([e]),q=[e];while(q.length){const a=q.pop();for(const b of pnPeers(a))if(!seen.has(b)){seen.add(b);q.push(b);}}return seen;}
/* after a node is removed or moved: each former neighbour that is now cut off from the others gets one wire to the nearest node in range
   outside its own part (so removing a pole in the middle of a line doesn't split the grid when another pole can bridge the gap) */
function pnHeal(peers){for(const p of peers){if(!ents.has(p.id))continue;const comp=pnComp(p);if(peers.every(q=>q===p||!ents.has(q.id)||comp.has(q)))continue;
 let best=null,bd=1e9;const A=cen(p);for(const c of comp)for(const o of ents.values()){if(!isPN(o)||comp.has(o)||!pnRange(c,o))continue;const C=cen(o),Cc=cen(c),d=Math.hypot(Cc.x-C.x,Cc.y-C.y);if(d<bd){bd=d;best=[c,o];}}
 if(best)pnLink(best[0],best[1]);}}
function pnMigrate(){const P=[...ents.values()].filter(isPN),C=P.map(cen),edges=[];
 for(let i=0;i<P.length;i++){const cand=[];for(let j=0;j<P.length;j++){if(i===j)continue;const d=Math.hypot(C[i].x-C[j].x,C[i].y-C[j].y);if(d<=Math.max(B[P[i].d].link,B[P[j].d].link))cand.push([d,j]);}
  cand.sort((a,b)=>a[0]-b[0]);for(const [d,j] of cand.slice(0,5))edges.push([d,i,j]);}
 edges.sort((a,b)=>a[0]-b[0]);const par=P.map((_,i)=>i),f=i=>par[i]===i?i:(par[i]=f(par[i]));for(const e of P)e.pl=[];
 for(const [,i,j] of edges){const a=f(i),b=f(j);if(a!==b){par[a]=b;pnLink(P[i],P[j]);}}S.pw2=1;topoDirty=true;}
/* the part of the grid behind a switch: nodes reachable from its smaller side (not through the switch or other off switches) */
function swSide(sw){const sides=pnPeers(sw).map(p=>{const seen=new Set([sw,p]),q=[p];while(q.length){const a=q.pop();if(a.d==='pswitch'&&a.off&&a!==p)continue;for(const b of pnPeers(a))if(!seen.has(b)){seen.add(b);q.push(b);}}seen.delete(sw);return seen;});
 if(!sides.length)return new Set();const gens=s=>[...s].filter(x=>x.k==='gen').length;sides.sort((a,b)=>gens(a)-gens(b)||a.size-b.size);return sides[0];}
function swLoad(sw){const side=swSide(sw);let mw=0;for(const e of ents.values())if(e.pnode&&side.has(e.pnode))mw+=B[e.d].pw?B[e.d].pw*Math.pow(e.clock||1,1.6)*(e.k==='mach'&&!e.r?0:1):0;return mw;}
function removeEnt(e,ref,silent){
 if(e.k==='core')return;if(ref&&e.fm)refund(B.fmeter.cost);
 const peers=isPN(e)?pnPeers(e):null;if(peers)for(const p of peers)pnUnlink(e,p);
 for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(e.y+j)*MW+e.x+i]=0;
 ents.delete(e.id);
 if(peers&&S.pw2){for(const p of peers)if(!pnPeers(p).length)pnAuto(p);pnHeal(peers);}
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
function capIn(n,item){return Math.max(n,stackOf(item));}   /* input buffer: one stack of the item (STACK in data.js), at least one cycle's worth (Session 39m; was 2 cycles, min 4) */
function capOut(n){return Math.max(n*2,10);}
function accept(e,item,dir,carry){
 const fl=IT[item].f;
 switch(e.k){
  case 'pipe':return false;   // pipes are part of a fluid network (updNets), they don't pass single items
  case 'belt':
   if(e.item||fl!==(e.k==='pipe'))return false; if(((dir+2)&3)===e.dir)return false;
   e.item=item;e.prog=(dir===e.dir||dir===e.cin)?Math.min(Math.max(carry||0,0),0.95):0.5;if(e.fm){const a=e.fa||(e.fa=[]);a.push(S.t);if(a.length>3000)a.shift();}return true;
  case 'router':{
   if(fl!==!!B[e.d].fl)return false;if(B[e.d].sub==='junc'||B[e.d].sub==='valve')return false;   // a Pipe Junction is a network piece
   const sub=B[e.d].sub;
   if(sub==='split'||sub==='logic'){if(dir!==e.dir||e.item)return false;}
   else if(sub==='merge'){
    if(dir===((e.dir+2)&3))return false;
    if(e.item){e.req[dir]=tickNo;return false;}
    /* strict turn-taking (Session 39z): among the sides waiting (asked within the last tick), the next one after the last side served goes first.
       Before, a slow belt could be starved by two fast ones, depending on processing order. */
    {const L=e.lastIn>=0?e.lastIn:e.dir,pr=d=>(d-L+3)&3,pd=pr(dir);for(let od=0;od<4;od++)if(od!==dir&&e.req[od]>=tickNo-1&&pr(od)<pd){e.req[dir]=tickNo;return false;}}
    e.lastIn=dir;
   } else if(e.item)return false;
   e.item=item;e.inDir=dir;e.inT=accT!=null?accT:S.t;return true;}
  case 'cross':
   if(dir===0||dir===2){if(e.hs)return false;e.hs=item;e.hd=dir;e.hT=accT!=null?accT:S.t;return true;}
   if(e.vs)return false;e.vs=item;e.vd=dir;e.vT=accT!=null?accT:S.t;return true;
  case 'mach':{
   if(!e.r)return false;const r=RC[e.r];const need=r.i[item];if(!need)return false;
   if((e.inb[item]||0)>=capIn(need,item))return false;e.inb[item]=(e.inb[item]||0)+1;return true;}
  case 'gen':{const d=B[e.d];
   if(item==='water'&&d.water){if(e.water>=100)return false;e.water++;return true;}
   if(!has(d.fuels,item))return false;const cap=item==='fuel_rod'?5:50;if((e.fuel[item]||0)>=cap)return false;e.fuel[item]=(e.fuel[item]||0)+1;return true;}
  case 'storage':case 'dpad':{if(fl)return false;let t=0;for(const k in e.store)t+=e.store[k];if(t>=B[e.d].cap)return false;e.store[item]=(e.store[item]||0)+1;if(e.k==='storage')zStat('s',e,item,1);return true;}
  case 'tank':if(!fl||(e.ft&&e.ft!==item&&e.amt>0)||e.amt>=B[e.d].cap)return false;e.ft=item;e.amt++;return true;
  case 'core':if(fl)return false;S.inv[item]=(S.inv[item]||0)+1;zStat('k',e,item,1);return true;
  case 'incin':e.burnT=S.t;stat.c[item]=(stat.c[item]||0)+1;zStat('b',e,item,1);return true;
 }
 return false;
}
function perim(e){const p=[];
 for(let i=0;i<e.w;i++){p.push({x:e.x+i,y:e.y-1,d:3});p.push({x:e.x+e.w,y:e.y+i,d:0});p.push({x:e.x+e.w-1-i,y:e.y+e.h,d:1});p.push({x:e.x-1,y:e.y+e.h-1-i,d:2});}
 return p;}
/* Would t take item arriving in direction d (without changing anything)? Used to see through a crossing. */
/* can an item moving in direction d end up somewhere useful from tile t? Crossings are followed to the end of the chain (Session 39j: before,
   any crossing counted as fine, so machine output leaked into input crossings, ran to a dead end and blocked the lane other inputs needed) */
function passOK(t,item,d,depth){const fl=IT[item].f;depth=depth||0;
 if(isLine(t.k))return (t.dir===d||(t.k==='belt'&&t.cin===d))&&fl===(t.k==='pipe');   /* straight in, or into the belt's bend (Session 39y) */
 if(t.k==='router'){const b=B[t.d];if(fl!==!!b.fl)return false;if(b.sub==='merge')return d!==((t.dir+2)&3);if(b.sub==='junc')return true;return d===t.dir;}
 if(t.k==='cross'){if(depth>32)return false;const far=entAt(t.x+DX[d],t.y+DY[d]);return !!far&&passOK(far,item,d,depth+1);}
 if(t.k==='mach')return !!(t.r&&RC[t.r].i[item]);
 if(t.k==='gen')return has(B[t.d].fuels,item)||(item==='water'&&!!B[t.d].water);
 if(t.k==='tank')return fl;
 return t.k==='storage'||t.k==='core'||t.k==='dpad'?!fl:t.k==='incin';}
/* Sub-tick timing (Sessions 37i/37j): accT = the moment the item being handed over reached the tile edge (set by belts, splitters, crossings
   while they call accept). Splitters/crossings keep it (e.inT, e.hT, e.vT) and act like a belt piece of zero length; a belt tile receiving an
   item starts it with the progress it would have made since max(that moment, the moment the tile became free). Without this every handoff
   lost part of a tick and lines through several splitters dropped from 270 to ~223/min. */
let accT=null;
function beltCarry(t,from){if(t.k!=='belt')return 0;if(t.freeAt!=null)from=Math.max(from,t.freeAt);const el=S.t-from;return el>=0&&el<0.1?Math.min(0.95,el*t.spd):0;}
function pushOut(e,item){
 const n=e.ports.length;
 for(let k=0;k<n;k++){const idx=(e.rr+k)%n,p=e.ports[idx];const t=entAt(p.x,p.y);if(!t)continue;
  if(isLine(t.k)){if(t.dir!==p.d||(t.cin!=null&&t.cin!==p.d))continue;}   /* a bent belt only takes items from its bend */else if(t.k==='cross'){const far=entAt(t.x+DX[p.d],t.y+DY[p.d]);if(!far||!passOK(far,item,p.d))continue;}
  else if(t.k!=='router')continue;
  // a building's item starts with the progress it would have made since the belt tile became free (Session 37i): without this, every item
  // waited for a whole tick and a Mk3 belt fed by a drill or machine carried 240/min instead of 270
  const c=t.k==='belt'&&t.freeAt!=null?beltCarry(t,t.freeAt):0;
  if(accept(t,item,p.d,c)){zMove(e,null,t,item,p.d);e.rr=(idx+1)%n;return true;}}
 return false;
}

/* ================= TOPOLOGY ================= */
function cen(e){return{x:e.x+e.w/2,y:e.y+e.h/2};}
function rectDist(px,py,e){const dx=Math.max(e.x-px,0,px-(e.x+e.w)),dy=Math.max(e.y-py,0,py-(e.y+e.h));return Math.hypot(dx,dy);}
/* Does side neighbour sd (lying in direction o from line e) push items into e? Used for belt/pipe curves:
   another line pointing in, a splitter/merger with an output side facing e, a pipe junction (pipes),
   or a crossing whose far side is fed in the same direction (items pass straight through it). */
/* fluid-only pieces: a belt pointing at one is a dead end (Session 39t: Rotate skips these, 2D draws an end stop) */
const fluidOnly=t=>!!t&&(t.k==='pipe'||t.k==='tank'||t.k==='pump'||(t.k==='router'&&!!B[t.d].fl));
const beltBlocked=e=>e.k==='belt'&&fluidOnly(entAt(e.x+DX[e.dir],e.y+DY[e.dir]));
function feedsInto(sd,e,o,depth){const into=(o+2)&3;
 if(isLine(sd.k))return sd.k===e.k&&sd.dir===into;
 if(sd.k==='router'){const d=B[sd.d];if(!!d.fl!==(e.k==='pipe'))return false;const D=sd.dir;
  if(d.sub==='merge')return into===D;if(d.sub==='junc')return true;if(d.sub==='valve')return false;return into===D||into===((D+1)&3)||into===((D+3)&3);}
 if(sd.k==='cross'){if((depth||0)>32)return false;const far=entAt(sd.x+DX[o],sd.y+DY[o]);return !!far&&feedsInto(far,e,o,(depth||0)+1);}   /* follows the chain to a belt, splitter or merger (Session 39y) */
 return false;}
function rebuildTopo(){
 syncPipes();topoDirty=false;topoVer++;valves=[];beltOrder=[];routers=[];crosses=[];buildings=[];pnodes=[];grids=[];pwLinks=[];pads=[];meters=[];
 const lines=[];
 for(const e of ents.values())if(e.fm&&isLine(e.k))meters.push(e);
 for(const e of ents.values()){
  if(isLine(e.k))lines.push(e);else if(e.k==='router'){const sb=B[e.d].sub;if(sb==='valve')valves.push(e);else if(sb!=='junc')routers.push(e);}else if(e.k==='cross')crosses.push(e);
  else if(e.k!=='pole'){e.ports=perim(e);buildings.push(e);}
  if(e.k==='pole'||e.k==='gen')pnodes.push(e);if(e.k==='dpad')pads.push(e);
  e.grid=null;if(B[e.d].pw)e.pw=0;
 }
 /* a belt bends towards a single side feeder unless a line/splitter/crossing feeds it from behind. A building behind no longer forces it straight
    (Session 39v: a line could not turn away from a machine); a bent belt takes no building output from behind (see pushOut). */
 for(const e of lines){e.cin=null;const bk=entAt(e.x-DX[e.dir],e.y-DY[e.dir]);if(bk&&(isLine(bk.k)?(bk.k===e.k&&bk.dir===e.dir):((bk.k==='router'||bk.k==='cross')&&feedsInto(bk,e,(e.dir+2)&3))))continue;   /* only if it really feeds this belt (Session 39w: a pipe junction or an unrelated crossing behind blocked the bend) */let f=null,c=0,fl=null,cl=0;for(const o of [(e.dir+1)&3,(e.dir+3)&3]){const sd=entAt(e.x+DX[o],e.y+DY[o]);if(sd&&feedsInto(sd,e,o)){f=(o+2)&3;c++;if(isLine(sd.k)){fl=f;cl++;}}}if(c===1)e.cin=f;else if(cl===1)e.cin=fl;}   /* two feeders: a real belt wins over a splitter/crossing (Session 39ag) */
 const vis=new Set();
 for(const b of lines){if(vis.has(b))continue;const ch=[];let c=b;while(c&&isLine(c.k)&&!vis.has(c)){vis.add(c);ch.push(c);c=entAt(c.x+DX[c.dir],c.y+DY[c.dir]);}for(let i=ch.length-1;i>=0;i--)beltOrder.push(ch[i]);}
 // power
 const n=pnodes.length,par=[...Array(n).keys()];const f=i=>par[i]===i?i:(par[i]=f(par[i]));
 const C=pnodes.map(cen);const seen=new Set(),ix=new Map(pnodes.map((e,i)=>[e,i]));
 for(let i=0;i<n;i++){const a=pnodes[i];for(const b of pnPeers(a)){const j=ix.get(b);if(j==null)continue;const key=i<j?i+','+j:j+','+i;if(seen.has(key))continue;seen.add(key);
  const cut=(a.d==='pswitch'&&a.off)||(b.d==='pswitch'&&b.off);pwLinks.push([a,b,cut]);if(!cut)par[f(i)]=f(j);}}
 const gm=new Map();
 for(let i=0;i<n;i++){const r=f(i);if(!gm.has(r))gm.set(r,{gens:[],cons:[],nodes:[],dem:0,cap:0,trip:false});const g=gm.get(r);g.nodes.push(pnodes[i]);pnodes[i].grid=g;if(pnodes[i].k==='gen')g.gens.push(pnodes[i]);}
 grids=[...gm.values()];
 for(const e of ents.values()){if(!B[e.d].pw)continue;let best=null,bd=1e9;e.pnode=null;
  for(let i=0;i<n;i++){if(!B[pnodes[i].d].sup)continue;const dd=rectDist(C[i].x,C[i].y,e);if(dd<=B[pnodes[i].d].sup&&dd<bd){bd=dd;best=pnodes[i];}}
  if(best){best.grid.cons.push(e);e.grid=best.grid;e.pnode=best;}}
 buildNets();
 for(const v of valves){const bk=entAt(v.x-DX[v.dir],v.y-DY[v.dir]),fr=entAt(v.x+DX[v.dir],v.y+DY[v.dir]);v.va=pipeLike(bk)?bk.net:null;v.vb=pipeLike(fr)?fr.net:null;}
}
/* ---------- Fluid networks ----------
   Pipes have no direction: touching pipe tiles and Pipe Junctions (also straight through a Crossing) form one network, like a power grid.
   A network holds one fluid (sticky until flushed), PIPE_CAP m³ per tile, and moves at most `rate` m³/s in and out (slowest pipe: Mk1 5, Mk2 10).
   Buildings take part only where a Pipe Junction touches them (plain pipes can run right past a machine without connecting): pumps, machine fluid outputs and tanks (when the network is under half full) fill it; machines and generators
   needing that fluid, tanks (when it's over 80 % full) and incinerators draw from it. A second fluid is refused and flagged (no mixing). */
const PIPE_CAP=10,pipeLike=e=>!!e&&(e.k==='pipe'||(e.k==='router'&&B[e.d].sub==='junc'));
function syncPipes(){for(const n of nets)for(const t of n.tiles){t.item=n.fluid;t.lv=n.cap?n.amt/n.cap:0;}}   // store contents on the tiles (save, rebuild)
/* first piece beyond a chain of crossings (Session 41d: pipes looked through one crossing only, and never through one into a building) */
const FLB=['mach','gen','pump','tank','incin'];
function pastCross(t,d){let n=entAt(t.x+DX[d],t.y+DY[d]),k=0;while(n&&n.k==='cross'&&k++<32)n=entAt(n.x+DX[d],n.y+DY[d]);return n;}
function buildNets(){
 nets=[];const list=[],ix=new Map();for(const e of ents.values())if(pipeLike(e)){ix.set(e,list.length);list.push(e);e.net=null;e.pc=0;}
 const par=list.map((_,i)=>i),f=i=>par[i]===i?i:(par[i]=f(par[i])),un=(a,b)=>{par[f(a)]=f(b);};
 for(const t of list)for(let d=0;d<4;d++){const n=entAt(t.x+DX[d],t.y+DY[d]);if(!n)continue;
  if(pipeLike(n)){un(ix.get(t),ix.get(n));t.pc|=1<<d;}
  else if(n.k==='cross'){const far=pastCross(t,d);if(pipeLike(far)){un(ix.get(t),ix.get(far));t.pc|=1<<d;}else if(far&&t.k!=='pipe'&&FLB.includes(far.k))t.pc|=1<<d;}   /* through crossings: to pipes, or from a junction into a building */
  else if(n.k==='router'&&B[n.d].sub==='valve'&&(d&1)===(n.dir&1))t.pc|=1<<d;   /* a pipe reaches into a valve along its axis; the valve keeps the two networks apart */
  else if(t.k!=='pipe'&&['mach','gen','pump','tank','incin'].includes(n.k))t.pc|=1<<d;}   // only a Pipe Junction is an entry point into a building
 const G=new Map();list.forEach((t,i)=>{const r=f(i);if(!G.has(r))G.set(r,[]);G.get(r).push(t);});
 for(const tiles of G.values()){const cnt={};let rate=Infinity;
  for(const t of tiles){if(t.item)cnt[t.item]=(cnt[t.item]||0)+1;if(t.k==='pipe')rate=Math.min(rate,B[t.d].spd);}
  const fluid=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||null;let amt=0;
  for(const t of tiles)if(t.item===fluid)amt+=t.lv!=null?t.lv*PIPE_CAP:1;   // old saves: one unit per pipe tile holding fluid
  const att=new Set();for(const t of tiles)if(t.k!=='pipe')for(let d=0;d<4;d++){let n=entAt(t.x+DX[d],t.y+DY[d]);if(n&&n.k==='cross')n=pastCross(t,d);if(n&&FLB.includes(n.k))att.add(n);}
  const n={tiles,fluid,cap:tiles.length*PIPE_CAP,amt:0,rate:isFinite(rate)?rate:5,att:[...att],bi:0,bo:0,inR:0,outR:0,_fl:0,conflict:null};n.amt=Math.min(n.cap,amt);n._fl=n.cap?n.amt/n.cap:0;
  for(const t of tiles)t.net=n;nets.push(n);}
}
/* A mismatch is only a real conflict if none of the building's networks can take that fluid (Session 37g): a refinery with a fuel pipe and a
   resin pipe used to raise the mixing warning on both, although each fluid had its own pipe. */
function fluidHome(b,k,except){for(const m of nets)if(m!==except&&(!m.fluid||m.fluid===k)&&m.att.includes(b))return true;return false;}
function updNets(dt){
 for(const n of nets){const lim=n.rate;n.bi=Math.min(lim,n.bi+lim*dt);n.bo=Math.min(lim,n.bo+lim*dt);let got=0,sent=0;
  let src=null;const take=(fluid,avail)=>{if(n.fluid&&n.fluid!==fluid)return 0;const m=Math.min(avail,Math.floor(n.cap-n.amt),Math.floor(n.bi));if(m<=0)return 0;n.fluid=fluid;n.amt+=m;n.bi-=m;got+=m;zNetFlow(n,src,m,true);return m;};
  for(const b of n.att){src=b;
   if(b.k==='pump'){if(b.item&&b.buf>0){if(n.fluid&&n.fluid!==b.item){if(!fluidHome(b,b.item,n))n.conflict={fluid:b.item,b,t:tickNo};continue;}b.buf-=take(b.item,b.buf);}}
   else if(b.k==='mach'){for(const k in b.outb)if(IT[k].f&&b.outb[k]>0){if(n.fluid&&n.fluid!==k){if(!fluidHome(b,k,n))n.conflict={fluid:k,b,t:tickNo};continue;}b.outb[k]-=take(k,b.outb[k]);}}
   else if(b.k==='tank'&&b.ft&&b.amt>0&&n.amt<n.cap*0.5){if(n.fluid&&n.fluid!==b.ft){if(!fluidHome(b,b.ft,n))n.conflict={fluid:b.ft,b,t:tickNo};continue;}b.amt-=take(b.ft,b.amt);if(!b.amt)b.ft=null;}}
  if(n.fluid&&n.amt>=1){
   // fair share (Session 37f): one unit at a time, in turn, to every building that can take it; the starting point moves by one each tick.
   // Before, each building in turn was filled as far as it could take, and the start could land on the same building every tick, so when
   // fluid was short one refinery always got served first.
   const cons=n.att.filter(b=>b.k!=='pump'&&!(b.k==='tank'&&n.amt<=n.cap*0.8)&&!(b.k==='mach'&&!(b.r&&RC[b.r].i[n.fluid])));
   if(cons.length){let i=(n.rr=((n.rr||0)+1)%cons.length),stall=0;
    while(n.amt>=1&&n.bo>=1&&stall<cons.length){if(accept(cons[i],n.fluid,0,0)){n.amt--;n.bo--;sent++;stall=0;zNetFlow(n,cons[i],1,false);}else stall++;i=(i+1)%cons.length;}}}
  const a=Math.min(1,dt/3);n.inR+=(got/dt*60-n.inR)*a;n.outR+=(sent/dt*60-n.outR)*a;n._fl+=((n.cap?n.amt/n.cap:0)-n._fl)*Math.min(1,dt/1.2);}
 /* Flow Valves (Session 41): move fluid from the network behind (va) to the one in front (vb), at most e.vr m³/min, never mixing fluids */
 for(const v of valves){const A=v.va,Bn=v.vb;let m=0;v.vwhy=null;
  if(!A||!Bn)v.vwhy='pipe';else if(A===Bn)v.vwhy='same';else if(!A.fluid||A.amt<1)v.vwhy='empty';else if(Bn.fluid&&Bn.fluid!==A.fluid&&Bn.amt>=1)v.vwhy='mix';
  else if(v.vr>0){v.vacc=Math.min(v.vacc+v.vr/60*dt,Math.max(1.5,v.vr/60*dt*2));m=Math.floor(Math.min(v.vacc,A.amt,Bn.cap-Bn.amt));if(m>0){A.amt-=m;Bn.fluid=A.fluid;Bn.amt+=m;v.vacc-=m;}else if(Bn.amt>=Bn.cap-1)v.vwhy='full';}
  if(v.vwhy)v.vacc=0;v.vf+=(m/dt*60-v.vf)*Math.min(1,dt/3);}
}


/* ================= SIMULATION ================= */
function drawMW(e){const d=B[e.d];return e.want?d.pw*Math.pow(e.clock||1,1.6):0;}
function genCan(g){const d=B[g.d];if(g.off)return false;if(d.water&&g.water<1)return false;if(g.d==='reactor'&&(g.outb.waste||0)>=50)return false;if(g.energy>0)return true;for(const f of d.fuels)if((g.fuel[f]||0)>0)return true;return false;}
function powerStep(dt){
 for(const g of grids){
  let dem=0;for(const c of g.cons)dem+=drawMW(c);
  let cap=0;for(const ge of g.gens){ge.can=genCan(ge);if(ge.can)cap+=B[ge.d].cap;}
  let tr=g.nodes.some(x=>x.trip);
  if(!tr&&cap>0&&dem>cap+1e-6){for(const x of g.nodes)x.trip=true;tr=true;toast('⚠ Power fuse tripped — demand exceeds supply');if(typeof sfx==='function')sfx('trip');}
  g.trip=tr;g.dem=dem;g.cap=cap;
  const ok=!tr&&cap>0&&dem<=cap+1e-6;
  for(const c of g.cons)c.pw=ok?1:0;
  const load=ok&&cap>0?dem/cap:0;g.prod=ok?dem:0;
  for(const ge of g.gens){ge.load=ge.can?load:0;ge._ls=(ge._ls||0)+(ge.load-(ge._ls||0))*Math.min(1,dt/4);if(ok&&ge.can&&load>0)burn(ge,B[ge.d].cap*load*dt);}   // _ls: load averaged over ~4 s, for the panel
 }
}
function burn(g,mj){const d=B[g.d];
 while(g.energy<mj){let got=false;for(const f of d.fuels)if((g.fuel[f]||0)>0){g.fuel[f]--;g.energy+=IT[f].e;stat.c[f]=(stat.c[f]||0)+1;zStat('c',g,f,1);if(f==='fuel_rod'){g.outb.waste=(g.outb.waste||0)+10;stat.p.waste=(stat.p.waste||0)+10;}got=true;break;}if(!got)break;}
 g.energy=Math.max(0,g.energy-mj);
 if(d.water){g.wacc+=mj*d.water;while(g.wacc>=1&&g.water>0){g.water--;g.wacc--;stat.c.water=(stat.c.water||0)+1;}}
}
function updBelt(e,dt){
 if(e.k==='pipe')return;
 if(!e.item)return;e.prog+=e.spd*dt;
 if(e.prog>=1){const t=entAt(e.x+DX[e.dir],e.y+DY[e.dir]),ov=e.prog-1;accT=S.t-ov/e.spd;const it0=e.item,ok=t&&t!==e&&accept(t,e.item,e.dir,ov);accT=null;if(ok){zMove(e,e.oz,t,it0,e.dir);e.item=null;e.prog=0;e.freeAt=S.t-ov/e.spd;}else e.prog=1;}   // freeAt: the exact moment the tile became free
}
/* Logic Splitter (Session 39r): rules per output e.lr = {l,f,r} (left, front, right), each a list of item ids and/or 'any' (every item),
   'rest' (items no output names specifically), 'over' (overflow: only when every normal choice is full or blocked); an empty list = blocked.
   An item is offered in turn to the outputs whose rules want it; if none can take it, to the overflow outputs; otherwise it waits. */
function lsRules(e){return e.lr||{l:['any'],f:['any'],r:['any']};}
function lsOuts(e,it){const L=lsRules(e),D=e.dir,dirOf={l:(D+3)&3,f:D,r:(D+1)&3},named=new Set(),prim=[],over=[];
 for(const k of 'lfr')for(const x of L[k]||[])if(IT[x])named.add(x);
 for(const k of 'lfr'){const R=L[k]||[];if(R.includes('any')||R.includes(it)||(R.includes('rest')&&!named.has(it)))prim.push(dirOf[k]);else if(R.includes('over'))over.push(dirOf[k]);}
 return[prim,over];}
function updRouter(e){
 if(!e.item)return;const sub=B[e.d].sub,D=e.dir;let outs;
 if(sub==='logic'){const [prim,over]=lsOuts(e,e.item);const T=e.rrI||(e.rrI={}),tk=T[e.item]||(T[e.item]={});   /* turn counters per item (Session 39ac: a shared counter was reset by front-only items, so circuit boards always went left) */
  for(const [list,key] of [[prim,'rr'],[over,'ro']]){const n=list.length;e[key]=tk[key]||0;
   for(let k=0;k<n;k++){const i=((e[key]||0)+k)%n,o=list[i],t=entAt(e.x+DX[o],e.y+DY[o]);if(!t)continue;if(t.k==='cross'&&!passOK(t,e.item,o))continue;
    const T0=e.inT!=null?e.inT:S.t;accT=T0;const ok=accept(t,e.item,o,beltCarry(t,T0));accT=null;if(ok){zMove(e,e.oz,t,e.item,o);tk[key]=(i+1)%n;e.item=null;e[key]=tk[key];return;}}}
  return;}
 if(sub==='split')outs=[D,(D+1)&3,(D+3)&3];
 else if(sub==='merge')outs=[D];
 else outs=[0,1,2,3].filter(o=>o!==((e.inDir+2)&3));
 for(let k=0;k<outs.length;k++){const o=outs[(e.rr+k)%outs.length];const t=entAt(e.x+DX[o],e.y+DY[o]);
  if(!t)continue;if(t.k==='cross'&&!passOK(t,e.item,o))continue;const T0=e.inT!=null?e.inT:S.t;accT=T0;const ok=accept(t,e.item,o,beltCarry(t,T0));accT=null;if(ok){zMove(e,e.oz,t,e.item,o);e.item=null;e.rr=(e.rr+k+1)%outs.length;return;}}
}
function updCross(e){
 /* an item that can't move on waits in the crossing, so the line behind clogs (Session 39ad: dead-end items used to go back to the stock,
    which hid the problem; machines and splitters already check passOK before entering a crossing) */
 const pass=(item,d,T)=>{const t=entAt(e.x+DX[d],e.y+DY[d]);if(!t)return false;const T0=T!=null?T:S.t;accT=T0;const ok=accept(t,item,d,beltCarry(t,T0));accT=null;if(ok)zMove(e,(d===0||d===2)?e.hoz:e.voz,t,item,d);return ok;};
 if(e.hs&&pass(e.hs,e.hd,e.hT))e.hs=null;
 if(e.vs&&pass(e.vs,e.vd,e.vT))e.vs=null;
}
function canStart(e,r){for(const k in r.i)if((e.inb[k]||0)<r.i[k])return false;for(const k in r.o)if((e.outb[k]||0)+r.o[k]>capOut(r.o[k]))return false;return true;}
/* Efficiency: running average over the last EFF_T seconds of "working" vs. why not (e._ef 0..1, e._efw {reason: share}).
   Not saved; it re-measures after loading. Reasons: 'in:<item>' waiting for input, 'out' output full, 'power', 'recipe', 'none'. */
const EFF_T=300;   /* 5 minutes (Session 39q; was 30 s) */
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
     for(const k in D.c){const m=Math.min(d.cap-padCount(tg),D.c[k]);if(m>0){tg.store[k]=(tg.store[k]||0)+m;D.c[k]-=m;n+=m;zFlow(e,tg,k,m);}if(!D.c[k])delete D.c[k];}
     e.del=(e.del||0)+n;D.st=2;D.w=0;}}}}
  if(D.st===2){D.t=Math.max(0,D.t-DRONE.spd*dt/dist);if(D.t<=0){for(const k in D.c)e.store[k]=(e.store[k]||0)+D.c[k];D.c={};D.st=0;}}}
}
function updBuilding(e,dt){
 switch(e.k){
  case 'mach':{
   const r=e.r&&RC[e.r];e.want=false;if(!r){effTrack(e,dt,'recipe');return;}
   if(e.off){for(const k in e.outb)if(e.outb[k]>0){if(pushOut(e,k))e.outb[k]--;}break;}   // switched off (Session 37e): no new cycles, no power; finished items still leave
   if(!e.run&&canStart(e,r)){for(const k in r.i){e.inb[k]-=r.i[k];stat.c[k]=(stat.c[k]||0)+r.i[k];zStat('c',e,k,r.i[k]);}e.run=true;e.prog=0;}
   if(e.run){e.want=true;if(e.pw>0){e.prog+=dt*e.clock/r.t;if(e.prog>=1){for(const k in r.o){e.outb[k]=(e.outb[k]||0)+r.o[k];stat.p[k]=(stat.p[k]||0)+r.o[k];zStat('p',e,k,r.o[k]);}e.run=false;e.prog=0;
     if(canStart(e,r)){for(const k in r.i){e.inb[k]-=r.i[k];stat.c[k]=(stat.c[k]||0)+r.i[k];zStat('c',e,k,r.i[k]);}e.run=true;}}}}
   for(const k in e.outb)if(e.outb[k]>0){for(let a=0;a<2&&e.outb[k]>0;a++){if(pushOut(e,k))e.outb[k]--;else break;}}
   effTrack(e,dt,machState(e,r));
   break;}
  case 'drill':case 'pump':{
   const d=B[e.d];let item=null,rate=0;
   if(d.water){item='water';rate=d.rate;}else if(e.node){item=NODE_T[e.node.t][0];rate=d.rate*PUR[e.node.p][0];}
   e.item=item;e.want=!!item&&e.buf<10&&!e.off;
   if(e.off){if(item&&e.buf>0&&pushOut(e,item))e.buf--;break;}
   if(e.want&&e.pw>0){e.prog+=rate*e.clock*dt;while(e.prog>=1&&e.buf<10){e.buf++;e.prog--;stat.p[item]=(stat.p[item]||0)+1;zStat('p',e,item,1);}}
   if(item)for(let a=0;a<2&&e.buf>0;a++){if(pushOut(e,item))e.buf--;else break;}
   effTrack(e,dt,!item?'none':e.want&&e.pw>0?'work':!e.want?'out':'power');   // a full buffer (want false) is 'Output full', never 'No power'
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
 if(tickNo%20===0)for(const e of meters){const a=e.fa;if(!a)continue;while(a.length&&(S.t-a[0]>600||(a.length>60&&S.t-a[0]>60)))a.shift();let g=0;for(let i=1;i<a.length;i++)g=Math.max(g,a[i]-a[i-1]);e.fg=g;
  const raw=fmRaw(e);e.fr=e.fr==null?raw:e.fr+(raw-e.fr)*0.12;}   // shown value glides (~8 s) instead of stepping when items enter/leave the window   // Flow Meters: at least the last 60 s; slow belts: the last 30 items, at most 5 min
 powerStep(dt);
 for(const e of beltOrder)updBelt(e,dt);
 for(const e of routers)updRouter(e);   // after the belts (Session 37j): the tile in front has already moved on this tick, so a
 for(const e of crosses)updCross(e);    // splitter never waits a whole tick (Mk5 through splitters: 684 → 780/min)
 for(const e of buildings)updBuilding(e,dt);
 updNets(dt);
 zTick(dt);stat.acc+=dt;if(stat.acc>=1){stat.acc-=1;stat.hist.push({p:stat.p,c:stat.c});if(stat.hist.length>60)stat.hist.shift();stat.p={};stat.c={};}
}
function rates(){const p={},c={};for(const h of stat.hist){for(const k in h.p)p[k]=(p[k]||0)+h.p[k];for(const k in h.c)c[k]=(c[k]||0)+h.c[k];}const m=60/Math.max(1,stat.hist.length);for(const k in p)p[k]*=m;for(const k in c)c[k]*=m;return{p,c};}
