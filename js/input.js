'use strict';
/* ---------- input ---------- */
const ptrs=new Map();let G=null;
function toTile(cx,cy){const s=TS*cam.z,fx=cam.x+(cx-innerWidth/2)/s,fy=cam.y+(cy-innerHeight/2)/s;return{x:Math.floor(fx),y:Math.floor(fy),fx,fy};}
function zMin(){return Math.max(0.3,Math.max(innerWidth,innerHeight)/(MW*TS));}
function clampCam(){const zm=zMin();for(const c of [cam,camT]){c.z=Math.max(zm,Math.min(3.5,c.z));const hw=innerWidth/(TS*c.z)/2,hh=innerHeight/(TS*c.z)/2;c.x=hw*2>=MW?MW/2:Math.max(hw,Math.min(MW-hw,c.x));c.y=hh*2>=MH?MH/2:Math.max(hh,Math.min(MH-hh,c.y));}}
function syncT(){camT.x=cam.x;camT.y=cam.y;camT.z=cam.z;}
function linePath(a,b,rot){
 const path=[];const dx=b.x-a.x,dy=b.y-a.y;let x=a.x,y=a.y;
 if(dx===0&&dy===0)return[{x,y,d:rot}];
 const steps=[],hx=Math.sign(dx),hy=Math.sign(dy);
 if(Math.abs(dx)>=Math.abs(dy)){for(let i=0;i<Math.abs(dx);i++)steps.push(hx>0?0:2);for(let i=0;i<Math.abs(dy);i++)steps.push(hy>0?1:3);}
 else{for(let i=0;i<Math.abs(dy);i++)steps.push(hy>0?1:3);for(let i=0;i<Math.abs(dx);i++)steps.push(hx>0?0:2);}
 for(let i=0;i<steps.length;i++){path.push({x,y,d:steps[i]});x+=DX[steps[i]];y+=DY[steps[i]];}
 path.push({x,y,d:steps[steps.length-1]});return path;
}
function buildPath(id,path){let fail='';for(const p of path){const why=placeEnt(id,p.x,p.y,p.d);if(why&&why!=='same'&&why!=='Blocked'){fail=why;if(why==='Not enough materials')break;}}if(fail)toast(fail);refreshTools();updInfo();}
function tap(t){
 const tool=UI.tool;
 if(tool==='del'){const e=entAt(t.x,t.y);if(e&&e.k!=='core'){puff(e);removeEnt(e,true);refreshTools();}return;}
 if(tool&&B[tool]){const d=B[tool];
  if(isLine(d.k)){const o=entAt(t.x,t.y);buildPath(tool,[{x:t.x,y:t.y,d:o&&o.k===d.k?o.dir:UI.rot}]);return;}   // tapping an existing belt/pipe upgrades it in place, keeping its direction
  const fp=footprint(tool,t.x,t.y);const why=placeEnt(tool,fp.x,fp.y,UI.rot);if(why&&why!=='same')toast(why);refreshTools();updInfo();return;}
 const e=entAt(t.x,t.y);
 if(e){UI.sel=e.id;openPanel('ent',e.id);return;}
 const n=t.x>=0&&t.y>=0&&t.x<MW&&t.y<MH?nodeAt[t.y*MW+t.x]:null;if(n){UI.sel=null;openPanel('node',n);return;}
 closePanel();
}
function puff(e){for(let k=0;k<10;k++)parts.push({x:e.x+Math.random()*e.w,y:e.y+Math.random()*e.h,vx:(Math.random()-0.5)*1.2,vy:-Math.random()*0.8,r:0.18+Math.random()*0.15,t:0,m:0.9,k:1});}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
 cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});vel.x=vel.y=0;zAnchor=null;syncT();
 if(ptrs.size===2){const [a,b]=[...ptrs.values()];G={type:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),z0:cam.z,m:toTile((a.x+b.x)/2,(a.y+b.y)/2)};linePrev=null;return;}
 if(ptrs.size>2)return;
 const base={sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y,lt:performance.now(),lx:e.clientX,ly:e.clientY,vx:0,vy:0};
 if(e.button===1||e.button===2){G=Object.assign(base,{type:'pan'});return;}
 G=Object.assign(base,{type:'pending',t0:toTile(e.clientX,e.clientY)});
});
cv.addEventListener('pointermove',e=>{
 if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const t=toTile(e.clientX,e.clientY);if(e.pointerType==='mouse'||G)hover=t;
 if(!G)return;
 if(G.type==='pinch'&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);cam.z=Math.max(zMin(),Math.min(3.5,G.z0*d/Math.max(10,G.d0)));const s=TS*cam.z,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.x=G.m.fx-(mx-innerWidth/2)/s;cam.y=G.m.fy-(my-innerHeight/2)/s;clampCam();syncT();return;}
 const moved=Math.hypot(e.clientX-G.sx,e.clientY-G.sy);
 if(G.type==='pending'&&moved>(e.pointerType==='mouse'?5:9)){const tool=UI.tool;if(tool&&B[tool]&&isLine(B[tool].k))G.type='line';else if(tool==='del')G.type='del';else G.type='pan';}
 if(G.type==='pan'){const s=TS*cam.z,now=performance.now(),dt=Math.max(1,now-G.lt)/1000;
  const nx=G.cx-(e.clientX-G.sx)/s,ny=G.cy-(e.clientY-G.sy)/s;G.vx=G.vx*0.5+((nx-cam.x)/dt)*0.5;G.vy=G.vy*0.5+((ny-cam.y)/dt)*0.5;G.lt=now;cam.x=nx;cam.y=ny;clampCam();syncT();}
 else if(G.type==='line'){linePrev={id:UI.tool,path:linePath(G.t0,t,UI.rot)};}
 else if(G.type==='del'){const x=entAt(t.x,t.y);if(x&&(isLine(x.k)||x.k==='router'||x.k==='cross'||x.k==='pole')){puff(x);removeEnt(x,true);refreshTools();}}
});
function endPtr(e){
 ptrs.delete(e.pointerId);if(!G)return;
 if(G.type==='pinch'){if(ptrs.size===0)G=null;else G={type:'dead'};return;}
 if(G.type==='pending')tap(G.t0);
 else if(G.type==='line'&&linePrev){buildPath(linePrev.id,linePrev.path);linePrev=null;}
 else if(G.type==='pan'&&performance.now()-G.lt<70){const sp=Math.hypot(G.vx,G.vy),mx=120/cam.z;const k=sp>mx?mx/sp:1;vel.x=G.vx*k;vel.y=G.vy*k;}
 if(ptrs.size===0)G=null;
 if(e.pointerType!=='mouse')hover=null;
}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);G=null;linePrev=null;});
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!G)hover=null;});
cv.addEventListener('wheel',e=>{e.preventDefault();vel.x=vel.y=0;const m=toTile(e.clientX,e.clientY);const dy=e.deltaMode===1?e.deltaY*30:e.deltaY;camT.z=Math.max(zMin(),Math.min(3.5,camT.z*Math.exp(-dy*0.0016)));zAnchor={sx:e.clientX,sy:e.clientY,fx:m.fx,fy:m.fy};},{passive:false});
const keys=new Set();
addEventListener('keydown',e=>{if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;const k=e.key.toLowerCase();keys.add(k);
 if(k==='r'){if(UI.tool)ACT.rotate();else if(UI.panel&&UI.panel.kind==='ent')ACT.rotSel();}
 else if(k==='escape'){setTool(null);closePanel();}else if(k==='x'||k==='delete')ACT.toolDel();else if(k==='h')ACT.home();else if(k==='v')ACT.toggle3d();
 else if(k==='q'&&hover){const x=entAt(hover.x,hover.y);if(x&&B[x.d].cat&&ub(x.d)){UI.cat=B[x.d].cat;UI.rot=x.dir||0;UI.rotA=UI.rot*90;buildCats();setTool(x.d);}}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
// minimap
const mini=document.getElementById('mini'),mg=mini.getContext('2d');let miniBase=null,miniT=0;
function drawMini(el){
 if(innerWidth<=700)return;const W=Math.round(164*DPR);if(mini.width!==W){mini.width=mini.height=W;miniBase=null;}
 miniT-=el;if(!miniBase||miniT<=0){miniT=1;miniBase=miniBase||document.createElement('canvas');miniBase.width=miniBase.height=W;const g=miniBase.getContext('2d');g.imageSmoothingEnabled=true;g.drawImage(terrO,0,0,W,W);g.fillStyle='rgba(0,0,0,0.15)';g.fillRect(0,0,W,W);const k=W/MW;
  for(const e of ents.values()){g.fillStyle=e.k==='belt'?'#c9ced4':e.k==='pipe'?'#8fb6d9':e.k==='core'?'#ffb547':B[e.d].col;g.fillRect(e.x*k,e.y*k,Math.max(1,e.w*k),Math.max(1,e.h*k));}}
 mg.clearRect(0,0,W,W);mg.save();rrg(mg,0,0,W,W,14*DPR);mg.clip();mg.drawImage(miniBase,0,0);
 const k=W/MW,vw=innerWidth/(TS*cam.z),vh=innerHeight/(TS*cam.z);mg.strokeStyle='#ffb547';mg.lineWidth=1.5*DPR;mg.fillStyle='rgba(255,181,71,0.12)';mg.fillRect((cam.x-vw/2)*k,(cam.y-vh/2)*k,vw*k,vh*k);mg.strokeRect((cam.x-vw/2)*k,(cam.y-vh/2)*k,vw*k,vh*k);mg.restore();
}
function miniJump(ev){const r=mini.getBoundingClientRect();camT.x=(ev.clientX-r.left)/r.width*MW;camT.y=(ev.clientY-r.top)/r.height*MH;vel.x=vel.y=0;zAnchor=null;}
mini.addEventListener('pointerdown',ev=>{mini.setPointerCapture(ev.pointerId);miniJump(ev);mini._d=true;});
mini.addEventListener('pointermove',ev=>{if(mini._d)miniJump(ev);});
mini.addEventListener('pointerup',()=>{mini._d=false;});
function layoutVars(){const d=document.getElementById('dock');if(d)document.documentElement.style.setProperty('--dockH',d.offsetHeight+'px');}
