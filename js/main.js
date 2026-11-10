'use strict';
/* ---------- save/load ---------- */
const SKEYS=['d','x','y','dir','item','prog','r','inb','outb','run','clock','buf','fuel','energy','water','wacc','trip','store','ft','amt','filter','hs','vs','hd','vd'];
function serialize(){const es=[];for(const e of ents.values()){const o={};for(const k of SKEYS)if(e[k]!==undefined&&e[k]!==null&&e[k]!==false)o[k]=e[k];if(e.k==='gen')o.outb=e.outb;es.push(o);}
 return btoa(unescape(encodeURIComponent(JSON.stringify({v:1,S,es}))));}
function load(str){const data=JSON.parse(decodeURIComponent(escape(atob(str))));
 S=data.S;S.spd=S.spd||1;genMap(S.seed);ents=new Map();grid=new Int32Array(MW*MH);nextId=1;
 for(const o of data.es){const d=B[o.d];if(!d)continue;const e=Object.assign({},o,{id:nextId++,k:d.k,w:d.w,h:d.w});initEnt(e,d);ents.set(e.id,e);for(let j=0;j<e.w;j++)for(let i=0;i<e.w;i++)grid[(e.y+j)*MW+e.x+i]=e.id;}
 S.cam=S.cam||{x:MW/2,y:MH/2,z:1.2};setCam(S.cam);topoDirty=true;stat.hist=[];buildCats();
}
function save(){try{S.cam=cam;localStorage.setItem('frontierworks_save',serialize());}catch(e){}}
setInterval(save,30000);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});

/* ---------- loop ---------- */
let last=performance.now(),acc=0,uiT=0;const DT=0.05;
function frame(now){
 const el=Math.min(0.1,(now-last)/1000);last=now;fdt=el;acc+=el*(S.spd||1);animT+=el;
 let n=0;while(acc>=DT&&n<40){tick(DT);acc-=DT;n++;}if(n>=40)acc=0;
 // camera: smooth zoom around anchor, inertia, eased jumps
 const k=1-Math.exp(-el*13);
 if(zAnchor){cam.z+=(camT.z-cam.z)*k;if(Math.abs(camT.z-cam.z)<0.0008)cam.z=camT.z;const s=TS*cam.z;cam.x=zAnchor.fx-(zAnchor.sx-innerWidth/2)/s;cam.y=zAnchor.fy-(zAnchor.sy-innerHeight/2)/s;camT.x=cam.x;camT.y=cam.y;if(cam.z===camT.z)zAnchor=null;clampCam();}
 else if(!G||G.type==='line'||G.type==='del'||G.type==='pending'){
  if(Math.abs(vel.x)+Math.abs(vel.y)>0.05){cam.x+=vel.x*el;cam.y+=vel.y*el;const f=Math.exp(-el*4.5);vel.x*=f;vel.y*=f;syncT();clampCam();}
  else{cam.x+=(camT.x-cam.x)*k;cam.y+=(camT.y-cam.y)*k;cam.z+=(camT.z-cam.z)*k;}
 }
 if(keys.size){const sp=14*el/cam.z;let mx=0,my=0;if(keys.has('w')||keys.has('arrowup'))my-=sp;if(keys.has('s')||keys.has('arrowdown'))my+=sp;if(keys.has('a')||keys.has('arrowleft'))mx-=sp;if(keys.has('d')||keys.has('arrowright'))mx+=sp;if(mx||my){camT.x+=mx;camT.y+=my;cam.x+=mx;cam.y+=my;clampCam();}}
 if(V3.on)render3D(el);else{render();drawMini(el);}
 uiT+=el;if(uiT>0.3){uiT=0;updTop();if(UI.panel)renderPanel(false);}
 requestAnimationFrame(frame);
}
let lastAff='';
function updTop(){let d=0,c=0,tr=false;for(const g of grids){d+=g.dem;c+=g.cap;if(g.trip)tr=true;}
 $('pwv').textContent=fmt(d);$('pwc').textContent=fmt(c);$('fuse').style.display=tr?'':'none';
 const r=c>0?d/c:0,m=$('pwm');m.style.width=Math.min(100,r*100)+'%';m.style.background=tr?'#ff5a46':r>0.9?'#ffb547':'#5fe08a';
 const ms=MS[S.ms];$('msBtn').classList.toggle('ready',!!ms&&afford(ms.req));$('msTxt').textContent=ms?`Tier ${S.ms+1}`:'Complete';
 const aff=Object.values(B).filter(x=>x.cat===UI.cat&&ub(x.id)).map(x=>afford(x.cost)?1:0).join('');if(aff!==lastAff){lastAff=aff;refreshTools();}
 updInfo();
}
/* ---------- boot ---------- */
UI.rotA=0;resize();
let loaded=false;try{const s=localStorage.getItem('frontierworks_save');if(s){load(s);loaded=true;}}catch(e){loaded=false;}
if(!loaded){newGame();}
buildCats();layoutVars();
requestAnimationFrame(t=>{last=t;requestAnimationFrame(frame);});
if(V3.want)setView3D(true);
setTimeout(()=>{const l=$('loading');l.style.opacity=0;setTimeout(()=>l.remove(),500);if(!loaded)openPanel('menu');},250);
window.__fw={get S(){return S},ents:()=>ents,placeEnt,tick,entAt,B,RC,nodes:()=>nodes,ACT,grids:()=>grids,rates,cam:()=>cam,V3,C3,setView3D,v3Pick:(x,y)=>V3.ready&&(v3Cam(),v3Pick(x,y))};
