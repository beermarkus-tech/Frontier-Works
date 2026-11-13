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
/* Long press (≈0.45 s, no tool, finger still) on a building lifts it; dragging moves the preview, releasing places it */
let movePrev=null;
/* Ghost taps (phones): after a finger tap on the map opens the panel, the browser can send the same tap again as a click to whatever button
   now sits under the finger (e.g. a recipe). Panel clicks right after, and at the spot of, a map tap are ignored (see the click handler in ui.js). */
let mapTap={t:-1e9,x:0,y:0};
function calmPanel(){const p=document.getElementById('panel');if(!p)return;p.style.pointerEvents='none';clearTimeout(calmPanel.t);calmPanel.t=setTimeout(()=>{p.style.pointerEvents='';},450);}
function armLongPress(g,t0){if(UI.tool||UI.moveId||UI.linkFrom)return;const en=t0&&entAt(t0.x,t0.y);if(!en||en.k==='core')return;
 g.lp=setTimeout(()=>{if(g.type!=='pending')return;g.type='move';g.mv={e:en,dx:en.x-t0.x,dy:en.y-t0.y};movePrev={e:en,nx:en.x,ny:en.y,ok:true};
  try{navigator.vibrate&&navigator.vibrate(18);}catch(_){}toast(`Moving ${B[en.d].n}: drag and let go`);},450);}
function dragMove(g,t){if(!t)return;const nx=t.x+g.mv.dx,ny=t.y+g.mv.dy;movePrev={e:g.mv.e,nx,ny,ok:!canMove(g.mv.e,nx,ny)};}
function dropMove(){const m=movePrev;movePrev=null;if(!m)return;if(!ents.has(m.e.id))return;const why=moveEnt(m.e,m.nx,m.ny);if(why)toast(why+': not moved');else{UI.sel=m.e.id;refreshTools();}}
function tap(t){
 if(UI.wireFrom){const a=ents.get(UI.wireFrom),b=entAt(t.x,t.y);UI.wireFrom=null;updInfo();if(!a)return;
  if(!isPN(b)||b===a)toast('That is not a pole, tower, switch or generator');else if(!pnRange(a,b))toast('Too far for a wire (out of range)');else if(pnLinked(a,b))toast('Already connected');else{pnLink(a,b);toast('Wire added');}
  openPanel('ent',a.id);return;}
 if(UI.moveId){const e=ents.get(UI.moveId);UI.moveId=null;movePrev=null;updInfo();if(!e)return;const fp=footprint(e.d,t.x,t.y),why=moveEnt(e,fp.x,fp.y);toast(why?why+': not moved':`${B[e.d].n} moved`);if(!why)UI.sel=e.id;return;}
 if(UI.linkFrom){const src=ents.get(UI.linkFrom),e=entAt(t.x,t.y);UI.linkFrom=null;updInfo();
  if(src&&e&&e.k==='dpad'&&e!==src){src.lx=e.x;src.ly=e.y;toast(`Route set: ${Math.round(padRoute(src,e))} tiles`);UI.sel=src.id;openPanel('ent',src.id);}else toast('Route not changed: tap a different Drone Pad');return;}
 const tool=UI.tool;
 if(tool==='del'){const e=entAt(t.x,t.y);if(e&&e.k!=='core'){puff(e);removeEnt(e,true);refreshTools();}return;}
 if(UI.zoneCut){toast('Drag over the area to remove');return;}
 if(tool==='zone'){const v=zoneAt(t.x,t.y);if(v)openPanel('zone',v);else toast('Drag to draw a factory zone');return;}
 if(tool==='fmeter'){const e=entAt(t.x,t.y),r=toggleMeter(e);toast(r==='on'?'Flow Meter on: the rate settles over 30 s':r==='off'?'Flow Meter taken off (refunded)':r);refreshTools();return;}
 if(tool==='clr'){const e=entAt(t.x,t.y);if(!e)return;if(!ERASE_K.includes(e.k)){toast(`The eraser leaves ${B[e.d].n} alone (it's storage)`);return;}const n=eraseEnt(e);sparkle(e);toast(n?`Emptied ${B[e.d].n}: ${n} back to stock (fluids drain away)`:`${B[e.d].n} was already empty`);refreshTools();return;}
 if(tool&&B[tool]){const d=B[tool];
  if(isLine(d.k)){const o=entAt(t.x,t.y);buildPath(tool,[{x:t.x,y:t.y,d:o&&o.k===d.k?o.dir:UI.rot}]);return;}   // tapping an existing belt/pipe upgrades it in place, keeping its direction
  const fp=footprint(tool,t.x,t.y);const why=placeEnt(tool,fp.x,fp.y,UI.rot);if(why&&why!=='same')toast(why);refreshTools();updInfo();
  if(!why&&d.k==='sign'){const e=entAt(fp.x,fp.y);setTool(null);UI.sel=e.id;openPanel('ent',e.id);setTimeout(()=>{const i=document.getElementById('signTxt');if(i)i.focus();},60);}   // straight to typing the label
  return;}
 const e=entAt(t.x,t.y);
 if(e){UI.sel=e.id;openPanel('ent',e.id);return;}
 const n=t.x>=0&&t.y>=0&&t.x<MW&&t.y<MH?nodeAt[t.y*MW+t.x]:null;if(n){UI.sel=null;openPanel('node',n);return;}
 autoClose();
}
/* eraser feedback: a few light sparkles instead of smoke */
function sparkle(e){for(let k=0;k<6;k++)parts.push({x:e.x+Math.random()*e.w,y:e.y+Math.random()*e.h,vx:(Math.random()-0.5)*0.8,vy:-Math.random()*0.6,r:0.1+Math.random()*0.08,t:0,m:0.6,k:'spark'});}
let eraseN=0;
function puff(e){for(let k=0;k<10;k++)parts.push({x:e.x+Math.random()*e.w,y:e.y+Math.random()*e.h,vx:(Math.random()-0.5)*1.2,vy:-Math.random()*0.8,r:0.18+Math.random()*0.15,t:0,m:0.9,k:1});}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
 cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});vel.x=vel.y=0;zAnchor=null;syncT();
 if(ptrs.size===2){if(G&&G.lp)clearTimeout(G.lp);if(G&&G.type==='move'){movePrev=null;}const [a,b]=[...ptrs.values()];G={type:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),z0:cam.z,m:toTile((a.x+b.x)/2,(a.y+b.y)/2)};linePrev=null;return;}
 if(ptrs.size>2)return;
 const base={sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y,lt:performance.now(),lx:e.clientX,ly:e.clientY,vx:0,vy:0};
 if(e.button===1||e.button===2){G=Object.assign(base,{type:'pan'});return;}
 G=Object.assign(base,{type:'pending',t0:toTile(e.clientX,e.clientY)});armLongPress(G,G.t0);
});
cv.addEventListener('pointermove',e=>{
 if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const t=toTile(e.clientX,e.clientY);if(e.pointerType==='mouse'||G)hover=t;
 if(UI.moveId&&!G){const en=ents.get(UI.moveId);if(en){const fp=footprint(en.d,t.x,t.y);movePrev={e:en,nx:fp.x,ny:fp.y,ok:!canMove(en,fp.x,fp.y)};}}
 if(!G)return;
 if(G.type==='pinch'&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);cam.z=Math.max(zMin(),Math.min(3.5,G.z0*d/Math.max(10,G.d0)));const s=TS*cam.z,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.x=G.m.fx-(mx-innerWidth/2)/s;cam.y=G.m.fy-(my-innerHeight/2)/s;clampCam();syncT();return;}
 const moved=Math.hypot(e.clientX-G.sx,e.clientY-G.sy);
 if(G.type==='move'){dragMove(G,t);return;}
 if(G.type==='pending'&&moved>(e.pointerType==='mouse'?5:9)){clearTimeout(G.lp);const tool=UI.tool;if(tool&&B[tool]&&isLine(B[tool].k))G.type='line';else if(tool==='del')G.type='del';else if(tool==='clr'){G.type='clr';eraseN=0;}else if(tool==='zone'||UI.zoneCut)G.type='zone';else G.type='pan';}
 if(G.type==='pan'){const s=TS*cam.z,now=performance.now(),dt=Math.max(1,now-G.lt)/1000;
  const nx=G.cx-(e.clientX-G.sx)/s,ny=G.cy-(e.clientY-G.sy)/s;G.vx=G.vx*0.5+((nx-cam.x)/dt)*0.5;G.vy=G.vy*0.5+((ny-cam.y)/dt)*0.5;G.lt=now;cam.x=nx;cam.y=ny;clampCam();syncT();}
 else if(G.type==='line'){linePrev={id:UI.tool,path:linePath(G.t0,t,UI.rot)};}
 else if(G.type==='del'){const x=entAt(t.x,t.y);if(x&&(isLine(x.k)||x.k==='router'||x.k==='cross'||x.k==='pole')){puff(x);removeEnt(x,true);refreshTools();}}
 else if(G.type==='zone'){G.t1=t;zonePrev=Object.assign(zoneCheck(G.t0,t,UI.zoneCut),{cut:UI.zoneCut});}
 else if(G.type==='clr'){const x=entAt(t.x,t.y);if(x&&(isLine(x.k)||x.k==='router'||x.k==='cross')){const n=eraseEnt(x);if(n){eraseN+=n;sparkle(x);}}}
});
function endPtr(e){
 ptrs.delete(e.pointerId);if(!G)return;
 if(G.type==='pinch'){if(ptrs.size===0)G=null;else G={type:'dead'};return;}
 clearTimeout(G.lp);
 if(G.type==='zone'){const cut=UI.zoneCut;UI.zoneCut=null;zoneDrop(G.t0,G.t1||G.t0,cut);updInfo();}
 if(G.type==='clr'){if(eraseN)toast(`Erased ${eraseN} item${eraseN>1?'s':''}: back to stock`);eraseN=0;refreshTools();}
 if(G.type==='move')dropMove();
 else if(G.type==='pending'){mapTap={t:performance.now(),x:e.clientX,y:e.clientY};tap(G.t0);if(e.pointerType!=='mouse')calmPanel();}
 else if(G.type==='line'&&linePrev){buildPath(linePrev.id,linePrev.path);linePrev=null;}
 else if(G.type==='pan'&&performance.now()-G.lt<70){const sp=Math.hypot(G.vx,G.vy),mx=120/cam.z;const k=sp>mx?mx/sp:1;vel.x=G.vx*k;vel.y=G.vy*k;}
 if(ptrs.size===0)G=null;
 if(e.pointerType!=='mouse')hover=null;
}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);if(G)clearTimeout(G.lp);G=null;linePrev=null;movePrev=null;});
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!G)hover=null;});
cv.addEventListener('wheel',e=>{e.preventDefault();vel.x=vel.y=0;const m=toTile(e.clientX,e.clientY);const dy=e.deltaMode===1?e.deltaY*30:e.deltaY;camT.z=Math.max(zMin(),Math.min(3.5,camT.z*Math.exp(-dy*0.0016)));zAnchor={sx:e.clientX,sy:e.clientY,fx:m.fx,fy:m.fy};},{passive:false});
const keys=new Set();
addEventListener('keydown',e=>{if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;const k=e.key.toLowerCase();keys.add(k);
 if(k==='r'){if(UI.tool)ACT.rotate();else if(UI.panel&&UI.panel.kind==='ent')ACT.rotSel();}
 else if(k==='escape'){setTool(null);UI.moveId=null;UI.wireFrom=null;UI.zoneCut=null;zonePrev=null;movePrev=null;autoClose();}else if(k==='x'||k==='delete')ACT.toolDel();else if(k==='c')ACT.toolClr();else if(k==='h')ACT.home();else if(k==='v')ACT.toggle3d();
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
 const k=W/MW,vw=innerWidth/(TS*cam.z),vh=innerHeight/(TS*cam.z);mg.strokeStyle='#ffb547';mg.lineWidth=1.5*DPR;mg.fillStyle='rgba(255,181,71,0.12)';mg.fillRect((cam.x-vw/2)*k,(cam.y-vh/2)*k,vw*k,vh*k);mg.strokeRect((cam.x-vw/2)*k,(cam.y-vh/2)*k,vw*k,vh*k);
 {const hl=hlNodes();if(hl.length&&Math.sin(animT*6)>-0.3){mg.fillStyle='#ffd34a';for(const n of hl){mg.beginPath();mg.arc((n.x+0.5)*k,(n.y+0.5)*k,2.2*DPR,0,7);mg.fill();}}}
 mg.restore();
}
function miniJump(ev){const r=mini.getBoundingClientRect();camT.x=(ev.clientX-r.left)/r.width*MW;camT.y=(ev.clientY-r.top)/r.height*MH;vel.x=vel.y=0;zAnchor=null;}
mini.addEventListener('pointerdown',ev=>{mini.setPointerCapture(ev.pointerId);miniJump(ev);mini._d=true;});
mini.addEventListener('pointermove',ev=>{if(mini._d)miniJump(ev);});
mini.addEventListener('pointerup',()=>{mini._d=false;});
function layoutVars(){const d=document.getElementById('dock'),b=document.getElementById('dockShow'),hid=document.body.classList.contains('dockhid');const h=hid?(b?b.offsetHeight:40):(d?d.offsetHeight:0);document.documentElement.style.setProperty('--dockH',h+'px');}
/* hidden toolbar (Session 37h): OPT.dockHid, a small ▴ Tools button brings it back */
function applyDock(){document.body.classList.toggle('dockhid',!!OPT.dockHid);layoutVars();}
