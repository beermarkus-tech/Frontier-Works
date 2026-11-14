'use strict';
/* ---------- save/load ---------- */
const SKEYS=['d','x','y','dir','fm','pl','off','lr','lx','ly','dr','del','lv','tx','tc','item','prog','r','inb','outb','run','clock','buf','fuel','energy','water','wacc','trip','store','ft','amt','hs','vs','hd','vd'];
/* Save format v2: compact JSON (entities as [d,x,y,dir,{only non-default fields}]), gzip-compressed where the browser supports it,
   stored in IndexedDB (lots of room) with localStorage as fallback. Old v1 saves (base64 JSON, entity objects) still load.
   Exported text: "FW2:" + base64(gzip). If saving fails, the player sees a warning (it used to fail silently). */
const SAVE_KEY='frontierworks_save',SAVE={busy:null,last:0,bytes:0,where:'',err:'',warned:0};
function serialize(){syncPipes();const es=[];
 for(const e of ents.values()){const x={};
  for(const k of SKEYS){if(k==='d'||k==='x'||k==='y'||k==='dir')continue;let v=e[k];if(v===undefined||v===null||v===false||v===0)continue;
   if(k==='clock'&&v===1)continue;if(typeof v==='number'&&!Number.isInteger(v))v=Math.round(v*1000)/1000;if(typeof v==='object'&&!Object.keys(v).length)continue;x[k]=v;}
  if(e.k==='gen'&&e.outb&&Object.keys(e.outb).length)x.outb=e.outb;
  const a=[e.d,e.x,e.y,e.dir||0];if(Object.keys(x).length)a.push(x);es.push(a);}
 return JSON.stringify({v:2,S,es});}
function parseSave(str){str=String(str).trim();return JSON.parse(str[0]==='{'?str:decodeURIComponent(escape(atob(str))));}
/* Older saves store the unlock lists from when they were made; new buildings/recipes (signs, Drone Pad, …) are added on load */
function grantUnlocks(){S.ub=S.ub||[];S.ur=S.ur||[];const b=[...START_B],r=[...START_R];for(let i=0;i<Math.min(S.ms||0,MS.length);i++){b.push(...MS[i].b);r.push(...MS[i].r);}
 for(const x of b)if(!S.ub.includes(x))S.ub.push(x);for(const x of r)if(!S.ur.includes(x))S.ur.push(x);if((S.ms||0)>=4)S.oc=true;}
/* Build 44: the Incinerator became 2×2. Older saves hold 1×1 ones. Rebuild the grid: everything else first, then each incinerator takes a free
   2×2 that includes its old tile (own corner first), or goes back to stock if boxed in. Idempotent: a real 2×2 one keeps its corner. */
function growIncin(){const inc=[...ents.values()].filter(e=>e.k==='incin');if(!inc.length)return;let back=0;grid.fill(0);
 for(const o of ents.values())if(o.k!=='incin')for(let j=0;j<o.w;j++)for(let i=0;i<o.w;i++)grid[(o.y+j)*MW+o.x+i]=o.id;
 for(const e of inc)grid[e.y*MW+e.x]=e.id;   // reserve every incinerator's own tile so a neighbour can't grow over it
 for(const e of inc){const ox=e.x,oy=e.y;grid[oy*MW+ox]=0;let at=null;
  for(const [x,y] of [[ox,oy],[ox-1,oy],[ox,oy-1],[ox-1,oy-1]])if(x>=0&&y>=0&&!canPlace('incin',x,y)){at=[x,y];break;}
  if(!at){ents.delete(e.id);refund(B.incin.cost);back++;continue;}
  e.x=at[0];e.y=at[1];e.w=e.h=2;for(let j=0;j<2;j++)for(let i=0;i<2;i++)grid[(e.y+j)*MW+e.x+i]=e.id;}
 if(back)setTimeout(()=>toast(`Incinerators are 2×2 now: ${back} had no room and went back to stock`),1500);}
function load(str){const data=typeof str==='string'?parseSave(str):str;
 S=data.S;S.spd=S.spd||1;MW=MH=S.mw||128;genMap(S.seed);ents=new Map();grid=new Int32Array(MW*MH);nextId=1;
 for(const o0 of data.es){const o=Array.isArray(o0)?Object.assign({d:o0[0],x:o0[1],y:o0[2],dir:o0[3]},o0[4]||{}):o0;
  /* Sorting Splitter removed (Session 39ae): becomes a Logic Splitter doing the same (filter item → front, the rest → sides) */
  if(o.d==='sorter'){o.d='lsplit';o.lr=o.filter?{l:['rest'],f:[o.filter],r:['rest']}:{l:['any'],f:['any'],r:['any']};delete o.filter;}
  const d=B[o.d];if(!d)continue;
  const e=Object.assign({},o,{id:nextId++,k:d.k,w:d.w,h:d.w});initEnt(e,d);ents.set(e.id,e);for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(e.y+j)*MW+e.x+i]=e.id;}
 if(S.ub)S.ub=S.ub.filter(id=>B[id]);growIncin();if(!S.pw2)pnMigrate();zoneInit();grantUnlocks();
 S.cam=S.cam||{x:MW/2,y:MH/2,z:1.2};setCam(S.cam);lastBio=null;topoDirty=true;stat.hist=[];buildCats();
}
async function gz(str){if(typeof CompressionStream==='undefined')return null;return new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());}
async function gunz(u8){return await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
const b64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);};
const unb64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
let idbP=null;
function idb(){return idbP||(idbP=new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no browser database'));const r=indexedDB.open('frontierworks',1);
 r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>res(r.result);r.onerror=()=>{idbP=null;rej(r.error||new Error('database unavailable'));};}));}
async function idbPut(k,v){const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put(v,k);t.oncomplete=()=>res();t.onerror=t.onabort=()=>rej(t.error||new Error('write failed'));});}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('saves').objectStore('saves').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
function save(){
 if(!S)return Promise.resolve(false);if(SAVE.busy)return SAVE.busy;
 S.cam={x:cam.x,y:cam.y,z:cam.z};const json=serialize();
 return SAVE.busy=(async()=>{let err='';const z=await gz(json).catch(()=>null);
  try{await idbPut('main',{v:2,z:!!z,data:z||json,t:Date.now()});SAVE.where='browser database';SAVE.bytes=z?z.length:json.length;try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
  catch(e){try{const txt=z?'FW2:'+b64(z):json;localStorage.setItem(SAVE_KEY,txt);SAVE.where='browser storage';SAVE.bytes=txt.length;}catch(e2){err=(e2&&e2.name==='QuotaExceededError')?'the browser storage is full':((e2&&e2.message)||'unknown error');}}
  SAVE.err=err;SAVE.busy=null;
  if(err){if(Date.now()-SAVE.warned>60000){SAVE.warned=Date.now();toast(`⚠ Saving failed (${err}). Use ☰ Menu → Export to keep a copy.`);}}else SAVE.last=Date.now();
  return !err;})();
}
/* Boot: browser database first, then the old localStorage slot (v1 base64 or FW2 text). A save that can't be read is kept aside, not overwritten. */
async function loadStored(){
 try{const r=await idbGet('main');if(r){const json=r.z?await gunz(r.data):r.data;try{load(json);return true;}catch(e){await idbPut('broken-'+Date.now(),r).catch(()=>{});}}}catch(e){}
 try{const s=localStorage.getItem(SAVE_KEY);if(s){try{load(s.startsWith('FW2:')?await gunz(unb64(s.slice(4))):s);return true;}catch(e){localStorage.setItem(SAVE_KEY+'_broken',s);}}}catch(e){}
 return false;}
async function exportText(){const json=serialize(),z=await gz(json).catch(()=>null);return z?'FW2:'+b64(z):btoa(unescape(encodeURIComponent(json)));}
async function importText(t){t=t.trim();load(t.startsWith('FW2:')?await gunz(unb64(t.slice(4))):t);return save();}
setInterval(save,30000);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});

/* ---------- loop ---------- */
let last=performance.now(),acc=0,uiT=0,rAcc=0;const DT=0.05;
/* performance meter (Session 40, ☰ Menu): smoothed fps and milliseconds per frame for simulation and drawing */
const PF={fps:60,sim:0,draw:0,t:0};
function perfShow(el){const d=$('perf');if(!d)return;if(!OPT.perf){if(d.style.display!=='none')d.style.display='none';return;}d.style.display='';PF.t+=el;if(PF.t<0.5)return;PF.t=0;
 let b=0;for(const e of ents.values())if(e.k!=='belt'&&e.k!=='pipe')b++;d.textContent=`${Math.round(PF.fps)} fps · sim ${PF.sim.toFixed(1)} ms · draw ${PF.draw.toFixed(1)} ms · ${ents.size.toLocaleString()} objects (${b.toLocaleString()} buildings)${OPT.fps30?' · 30 fps cap':''}`;}
function frame(now){
 const el=Math.min(0.1,(now-last)/1000);last=now;fdt=el;acc+=el*(S.spd||1);animT+=el;
 const pt0=performance.now();let n=0;while(acc>=DT&&n<40){tick(DT);acc-=DT;n++;}if(n>=40)acc=0;const pt1=performance.now();PF.sim+=(pt1-pt0-PF.sim)*0.05;
 // camera: smooth zoom around anchor, inertia, eased jumps
 const k=1-Math.exp(-el*13);
 if(zAnchor){cam.z+=(camT.z-cam.z)*k;if(Math.abs(camT.z-cam.z)<0.0008)cam.z=camT.z;const s=TS*cam.z;cam.x=zAnchor.fx-(zAnchor.sx-innerWidth/2)/s;cam.y=zAnchor.fy-(zAnchor.sy-innerHeight/2)/s;camT.x=cam.x;camT.y=cam.y;if(cam.z===camT.z)zAnchor=null;clampCam();}
 else if(!G||G.type==='line'||G.type==='del'||G.type==='pending'){
  if(Math.abs(vel.x)+Math.abs(vel.y)>0.05){cam.x+=vel.x*el;cam.y+=vel.y*el;const f=Math.exp(-el*4.5);vel.x*=f;vel.y*=f;syncT();clampCam();}
  else{cam.x+=(camT.x-cam.x)*k;cam.y+=(camT.y-cam.y)*k;cam.z+=(camT.z-cam.z)*k;}
 }
 if(keys.size){const sp=14*el/cam.z;let mx=0,my=0;if(keys.has('w')||keys.has('arrowup'))my-=sp;if(keys.has('s')||keys.has('arrowdown'))my+=sp;if(keys.has('a')||keys.has('arrowleft'))mx-=sp;if(keys.has('d')||keys.has('arrowright'))mx+=sp;if(mx||my){camT.x+=mx;camT.y+=my;cam.x+=mx;cam.y+=my;clampCam();}}
 rAcc+=el;if(!OPT.fps30||rAcc>=0.03){fdt=rAcc;const pt2=performance.now();if(V3.on)render3D(rAcc);else{render();drawMini(rAcc);}PF.draw+=(performance.now()-pt2-PF.draw)*0.1;PF.fps+=(1/Math.max(0.001,rAcc)-PF.fps)*0.1;rAcc=0;}   /* battery saver: draw at most ~30 times a second */
 perfShow(el);
 uiT+=el;if(uiT>0.3){uiT=0;updTop();updBiome();if(UI.panel)renderPanel(false);}
 requestAnimationFrame(frame);
}
let lastAff='',lastBio=null;
function updBiome(){if(S.gen!==2||!bio)return;const x=V3.on?C3.x:cam.x,y=V3.on?C3.y:cam.y,b=biomeAt(x,y);if(b!==lastBio){if(lastBio)toast(`Entering ${b.n}: ${b.desc}`);lastBio=b;}}
function updTop(){let d=0,c=0,tr=false;for(const g of grids){d+=g.dem;c+=g.cap;if(g.trip)tr=true;}
 $('pwv').textContent=fmt(d);$('pwc').textContent=fmt(c);$('fuse').style.display=tr?'':'none';
 const r=c>0?d/c:0,m=$('pwm');m.style.width=Math.min(100,r*100)+'%';m.style.background=tr?'#ff5a46':r>0.9?'#ffb547':'#5fe08a';
 const ms=MS[S.ms];$('msBtn').classList.toggle('ready',!!ms&&afford(ms.req));$('msTxt').textContent=ms?`Tier ${S.ms+1}`:'Complete';
 const aff=Object.values(B).filter(x=>x.cat===UI.cat&&ub(x.id)).map(x=>afford(x.cost)?1:0).join('');if(aff!==lastAff){lastAff=aff;refreshTools();}
 updInfo();
}
/* ---------- boot ---------- */
UI.rotA=0;resize();
(async()=>{
 const loaded=await loadStored();
 if(!loaded){newGame();}
 buildCats();applyDock();if(typeof syncBoot==='function')syncBoot();if(OPT.plLeft&&OPT.plOpen)plRenderLeft(true);
 requestAnimationFrame(t=>{last=t;requestAnimationFrame(frame);});
 if(V3.want)setView3D(true);
 setTimeout(()=>{const l=$('loading');l.style.opacity=0;setTimeout(()=>l.remove(),500);if(!loaded)openPanel('menu');},250);
})();
window.__fw={SY:typeof SY!=='undefined'?SY:null,save,SAVE,get S(){return S},ents:()=>ents,placeEnt,tick,entAt,B,RC,nodes:()=>nodes,ACT,grids:()=>grids,rates,cam:()=>cam,V3,C3,setView3D,v3Pick:(x,y)=>V3.ready&&(v3Cam(),v3Pick(x,y))};
