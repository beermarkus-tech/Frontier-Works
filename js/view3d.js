'use strict';
/* ================= 3D VIEW =================
   Optional WebGL view of the same world (Three.js r149 in js/lib/three.min.js, loaded on first use).
   It only draws and turns screen touches into tiles; building, inspecting and dismantling reuse
   tap()/linePath()/buildPath() from input.js, so the rules are identical to 2D.
   World units: 1 tile = 1 unit; tile (x,y) → world (x, height, y). North (y=0) is −z.
   Everything repeated is an InstancedMesh (one draw call per building type / belt shape / item shape),
   so large factories stay cheap on phones. */
const V3={on:false,ready:false,loading:false,q:'high',look:'nice',want:false,fps:60,slowT:0,warned:false};
try{const s=JSON.parse(localStorage.getItem('frontierworks_view')||'{}');V3.want=!!s.on;if(s.q==='low')V3.q='low';if(s.look==='classic')V3.look='classic';}catch(e){}
function v3Save(){try{localStorage.setItem('frontierworks_view',JSON.stringify({on:V3.on,q:V3.q,look:V3.look}));}catch(e){}}
const C3={x:MW/2,y:MH/2,dist:30,yaw:0,pitch:0.95,vx:0,vy:0,go:null};
const C3L={dmin:4,dmax:170,pmin:0.3,pmax:1.52};
const v3cl=(v,a,b)=>Math.max(a,Math.min(b,v));

function v3Load(cb){
 if(window.THREE)return cb();
 if(V3.loading)return;V3.loading=true;toast('Loading 3D view…');
 const s=document.createElement('script');s.src='js/lib/three.min.js';
 s.onload=()=>{V3.loading=false;cb();};s.onerror=()=>{V3.loading=false;toast('The 3D view could not be loaded');};
 document.head.appendChild(s);
}
function setView3D(on){
 if(on&&!V3.on){v3Load(()=>{
   if(!V3.ready){try{v3Init();}catch(err){console.warn('3D init failed',err);toast('3D is not supported on this device');return;}}
   V3.on=true;v3FromCam2D();v3Intro();V3.cv.style.display='block';cv.style.visibility='hidden';document.body.classList.add('v3');
   linePrev=null;hover=null;V3.sig=null;v3Save();v3Buttons();});}
 else if(!on&&V3.on){V3.on=false;v3ToCam2D();V3.cv.style.display='none';V3.tag.style.display='none';cv.style.visibility='';
  document.body.classList.remove('v3');linePrev=null;hover=null;v3Save();v3Buttons();}
}
function v3Buttons(){const b=$('f3d');if(b)b.querySelector('b').textContent=V3.on?'2D':'3D';if(UI.panel&&UI.panel.kind==='menu')renderPanel(true);}
const V3_K=1/(2*Math.tan(22.5*Math.PI/180));   // distance per visible tile at fov 45°
function v3FromCam2D(){C3.x=cam.x;C3.y=cam.y;C3.dist=v3cl(innerHeight/(TS*cam.z)*V3_K*1.1,C3L.dmin,C3L.dmax);C3.vx=C3.vy=0;C3.go=null;}
function v3ToCam2D(){cam.x=C3.x;cam.y=C3.y;cam.z=innerHeight/(TS*C3.dist/V3_K/1.1);vel.x=vel.y=0;zAnchor=null;clampCam();syncT();}
/* Fly-in when entering 3D (like an online globe): straight down over the spot in the middle of the screen, ease to ~35° tilt a bit closer,
   then keep circling slowly (one turn ≈ 90 s) until the player touches, scrolls or uses the keys. */
const easeIO=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function v3Intro(){V3.intro={t:0,p0:1.5,p1:0.62,d0:C3.dist,d1:v3cl(C3.dist*0.8,10,110)};C3.pitch=1.5;V3.orbit=2*Math.PI/90;}
function v3Stop(){V3.intro=null;V3.orbit=0;}
function v3Go(o){C3.go=Object.assign({x:C3.x,y:C3.y,dist:C3.dist,yaw:C3.yaw,pitch:C3.pitch},o);C3.vx=C3.vy=0;}

/* ---------- small helpers ---------- */
let T3;               // THREE, once loaded
const v3col=h=>new T3.Color(h);
function v3Mat(){return new T3.MeshStandardMaterial({vertexColors:true,roughness:0.72,metalness:0.18});}
function v3Canvas(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;}
/* Merge simple parts into one non-indexed BufferGeometry with vertex colours. part: {g, m:Matrix4, c:Color} */
/* Rounded box (Enhanced look): real size in tiles, so the edge radius is the same on big blocks and small parts. Cached by size. */
const RBOX=new Map();
function v3RBox(sx,sy,sz){const k=sx.toFixed(3)+'|'+sy.toFixed(3)+'|'+sz.toFixed(3);let g=RBOX.get(k);if(g)return g;
 const r=Math.min(0.075,Math.min(sx,sz)*0.18,sy*0.3),w=sx-2*r,d=sz-2*r,c=Math.min(w,d)*0.15,sh=new T3.Shape();
 sh.moveTo(-w/2+c,-d/2);sh.lineTo(w/2-c,-d/2);sh.quadraticCurveTo(w/2,-d/2,w/2,-d/2+c);sh.lineTo(w/2,d/2-c);sh.quadraticCurveTo(w/2,d/2,w/2-c,d/2);
 sh.lineTo(-w/2+c,d/2);sh.quadraticCurveTo(-w/2,d/2,-w/2,d/2-c);sh.lineTo(-w/2,-d/2+c);sh.quadraticCurveTo(-w/2,-d/2,-w/2+c,-d/2);
 g=new T3.ExtrudeGeometry(sh,{depth:Math.max(0.001,sy-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:2});
 g.translate(0,0,-(sy-2*r)/2);g.rotateX(-Math.PI/2);g.deleteAttribute('uv');g.computeVertexNormals();RBOX.set(k,g);return g;}
function v3Merge(parts){
 let n=0;const gs=parts.map(p=>{const g=(p.g.index?p.g.toNonIndexed():p.g.clone());g.applyMatrix4(p.m);n+=g.attributes.position.count;return g;});
 const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
 gs.forEach((g,i)=>{const c=parts[i].c,P=g.attributes.position.array,N=g.attributes.normal.array;pos.set(P,o*3);nor.set(N,o*3);
  for(let k=0;k<g.attributes.position.count;k++){col[(o+k)*3]=c.r;col[(o+k)*3+1]=c.g;col[(o+k)*3+2]=c.b;
   const x=P[k*3],y=P[k*3+1],z=P[k*3+2],ax=Math.abs(N[k*3]),ay=Math.abs(N[k*3+1]),az=Math.abs(N[k*3+2]),j=(o+k)*2;
   if(ay>=ax&&ay>=az){uv[j]=x;uv[j+1]=z;}else if(ax>=az){uv[j]=z;uv[j+1]=y;}else{uv[j]=x;uv[j+1]=y;}}
  o+=g.attributes.position.count;g.dispose();});
 const out=new T3.BufferGeometry();out.setAttribute('position',new T3.BufferAttribute(pos,3));out.setAttribute('normal',new T3.BufferAttribute(nor,3));out.setAttribute('color',new T3.BufferAttribute(col,3));out.setAttribute('uv',new T3.BufferAttribute(uv,2));
 out.computeBoundingSphere();return out;
}
/* InstancedMesh that grows when needed */
function v3Pool(geo,mat,opt){const p={geo,mat,cap:0,mesh:null,opt:opt||{}};return p;}
function v3PoolN(p,n){
 if(!p.mesh||n>p.cap){if(p.mesh){V3.scene.remove(p.mesh);p.mesh.dispose();}
  p.cap=Math.max(16,Math.ceil(n*1.4));p.mesh=new T3.InstancedMesh(p.geo,p.mat,p.cap);p.mesh.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  if(p.opt.color){p.mesh.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(p.cap*3),3);p.mesh.instanceColor.setUsage(T3.DynamicDrawUsage);}
  p.mesh.castShadow=!!p.opt.cast;p.mesh.receiveShadow=!!p.opt.recv;p.mesh.frustumCulled=false;if(p.opt.order)p.mesh.renderOrder=p.opt.order;V3.scene.add(p.mesh);}
 p.mesh.count=n;p.mesh.visible=n>0;p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;return p.mesh;
}

/* ---------- init ---------- */
function v3Init(){
 T3=window.THREE;
 const c=document.createElement('canvas');c.id='cv3';cv.after(c);V3.cv=c;
 const tag=document.createElement('div');tag.id='v3tag';tag.className='glass';document.body.appendChild(tag);V3.tag=tag;
 const r=new T3.WebGLRenderer({canvas:c,antialias:V3.q==='high',powerPreference:'high-performance'});
 V3.r=r;r.shadowMap.type=T3.PCFSoftShadowMap;
 c.addEventListener('webglcontextlost',e=>{e.preventDefault();if(V3.on){toast('3D view stopped, back to 2D');setView3D(false);}});
 const sc=new T3.Scene();V3.scene=sc;
 V3.camera=new T3.PerspectiveCamera(45,1,0.3,1400);
 V3.fogC=new T3.Color('#c6dcea');sc.fog=new T3.Fog(V3.fogC,80,300);
 // sky dome (vertex-colour gradient)
 const sg=new T3.SphereGeometry(900,24,16),sc0=new T3.Color('#4f86cc'),sc1=new T3.Color('#c6dcea'),sc2=new T3.Color('#16324c'),cols=[];
 for(let i=0;i<sg.attributes.position.count;i++){const y=sg.attributes.position.getY(i)/900;const k=y>0?Math.pow(y,0.55):0;const cc=y>=0?sc1.clone().lerp(sc0,k):sc1.clone().lerp(sc2,Math.min(1,-y*6));cols.push(cc.r,cc.g,cc.b);}
 sg.setAttribute('color',new T3.Float32BufferAttribute(cols,3));
 V3.sky=new T3.Mesh(sg,new T3.MeshBasicMaterial({vertexColors:true,side:T3.BackSide,fog:false,depthWrite:false}));V3.sky.renderOrder=-10;sc.add(V3.sky);
 // lights: soft sky fill + warm sun from the top-left (matches the 2D art)
 V3.hemi=new T3.HemisphereLight(0xe4f0ff,0x5c6a4c,0.56);sc.add(V3.hemi);
 const sun=new T3.DirectionalLight(0xfff0d6,0.62);V3.sun=sun;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.03;sc.add(sun);sc.add(sun.target);
 // shared geometry (unit sized; parts are scaled by matrices)
 const G={box:new T3.BoxGeometry(1,1,1),cyl:new T3.CylinderGeometry(0.5,0.5,1,18),cyl6:new T3.CylinderGeometry(0.5,0.5,1,6),cone:new T3.ConeGeometry(0.5,1,16),
  sph:new T3.SphereGeometry(0.5,16,12),tor:new T3.TorusGeometry(0.5,0.09,8,28),torThin:new T3.TorusGeometry(0.5,0.035,6,40),oct:new T3.OctahedronGeometry(0.5),dod:new T3.DodecahedronGeometry(0.5),
  frust:new T3.CylinderGeometry(0.22,0.5,1,4),lowcone:new T3.ConeGeometry(0.5,1,7,1,true),lowcyl:new T3.CylinderGeometry(0.5,0.5,1,6,1,true),lowsph:new T3.SphereGeometry(0.5,7,5),ico:new T3.IcosahedronGeometry(0.5,0),tower:new T3.LatheGeometry([...Array(9)].map((_,i)=>{const t=i/8;return new T3.Vector2(0.5-0.2*Math.sin(t*Math.PI*0.85)+0.02*t,t-0.5);}),20)};
 G.frust.rotateY(Math.PI/4);V3.G=G;
 V3.mat=v3Mat();V3.glowMat=new T3.MeshBasicMaterial({color:0xffffff});
 {const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,6,32,32,32);gr.addColorStop(0,'rgba(0,0,0,0.6)');gr.addColorStop(0.55,'rgba(0,0,0,0.34)');gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);const t=new T3.CanvasTexture(cv);
  V3.aoP=v3Pool(new T3.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T3.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),{order:1});}
 v3Models();v3Lines();v3ItemsInit();v3SmokeInit();v3Overlays();
 v3Terrain();
 v3Input();addEventListener('resize',v3Resize);v3Resize();v3Quality();
 V3.ready=true;
}
function v3Resize(){if(!V3.r)return;V3.r.setSize(innerWidth,innerHeight,false);V3.camera.aspect=innerWidth/innerHeight;V3.camera.updateProjectionMatrix();}
function v3Quality(){
 if(!V3.r)return;const hi=V3.q==='high';
 V3.r.setPixelRatio(Math.min(devicePixelRatio||1,hi?2:1));V3.r.shadowMap.enabled=hi;V3.sun.castShadow=hi;
 v3Look();V3.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});v3Resize();
}
/* 3D look (Session 35f): 'nice' = filmic colour grading, sky reflections on metal, soft contact shadows under buildings; 'classic' = the look up to
   Build 44, kept as the faster fallback. Both work with either quality setting. */
function v3Env(){if(V3.env)return V3.env;const es=new T3.Scene(),g=new T3.SphereGeometry(50,24,12),c0=new T3.Color('#5b8fd4'),c1=new T3.Color('#e8eef2'),c2=new T3.Color('#4a5340'),cols=[];
 for(let i=0;i<g.attributes.position.count;i++){const y=g.attributes.position.getY(i)/50,c=y>=0?c1.clone().lerp(c0,Math.pow(y,0.6)):c1.clone().lerp(c2,Math.min(1,-y*3));cols.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T3.Float32BufferAttribute(cols,3));es.add(new T3.Mesh(g,new T3.MeshBasicMaterial({vertexColors:true,side:T3.BackSide})));
 const sunD=new T3.Mesh(new T3.SphereGeometry(4,12,8),new T3.MeshBasicMaterial({color:new T3.Color(6,5.6,4.8)}));sunD.position.set(-28,32,-22);es.add(sunD);
 const pm=new T3.PMREMGenerator(V3.r);V3.env=pm.fromScene(es,0.02).texture;pm.dispose();return V3.env;}
function v3Detail(){if(V3.detail)return V3.detail;const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');
 let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
 g.fillStyle='#e6e6e6';g.fillRect(0,0,S,S);
 for(let i=0;i<5200;i++){const v=200+rnd()*55|0;g.fillStyle=`rgba(${v},${v},${v},0.5)`;g.fillRect(rnd()*S,rnd()*S,1+rnd()*2,1+rnd()*2);}      // speckle
 for(let i=0;i<4;i++){const x=i*64,y=(i%2)*64;const gr=g.createLinearGradient(0,0,0,S);g.globalAlpha=0.06;g.fillStyle=i%2?'#fff':'#777';g.fillRect(x,0,64,S);g.globalAlpha=1;}   // panel tone
 g.strokeStyle='rgba(60,60,60,0.38)';g.lineWidth=2;for(const p of [0]){g.beginPath();g.moveTo(p+1,0);g.lineTo(p+1,S);g.moveTo(0,p+1);g.lineTo(S,p+1);g.stroke();}   // seams
 g.strokeStyle='rgba(255,255,255,0.25)';g.lineWidth=1;for(const p of [0]){g.beginPath();g.moveTo(p+3,0);g.lineTo(p+3,S);g.moveTo(0,p+3);g.lineTo(S,p+3);g.stroke();}
 for(const p of [0])for(let t=16;t<S;t+=32)for(const [x,y] of [[p+9,t],[t,p+9]]){g.fillStyle='rgba(70,70,70,0.45)';g.beginPath();g.arc(x,y,2.1,0,7);g.fill();g.fillStyle='rgba(255,255,255,0.55)';g.beginPath();g.arc(x-0.7,y-0.7,1.1,0,7);g.fill();}   // rivets
 g.strokeStyle='rgba(120,120,120,0.35)';g.lineWidth=0.8;for(let i=0;i<70;i++){const x=rnd()*S,y=rnd()*S,a=rnd()*0.6-0.3,l=6+rnd()*22;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}   // scratches
 for(let i=0;i<14;i++){const x=rnd()*S,y=rnd()*S,r=8+rnd()*22,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(110,90,70,0.16)');gr.addColorStop(1,'rgba(110,90,70,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}   // grime
 const t=new T3.CanvasTexture(cv);t.wrapS=t.wrapT=T3.RepeatWrapping;t.anisotropy=Math.min(4,V3.r.capabilities.getMaxAnisotropy());return V3.detail=t;}
function v3Look(){if(!V3.r)return;const nice=V3.look==='nice',r=V3.r;
 r.toneMapping=T3.NoToneMapping;r.toneMappingExposure=1;   // same light as Classic (Markus: grading made the landscape pale)
 V3.scene.environment=nice?v3Env():null;if(V3.mat){V3.mat.map=nice?v3Detail():null;V3.mat.needsUpdate=true;}V3.hemi.intensity=0.56;V3.sun.intensity=0.62;
 if(V3.aoP&&V3.aoP.mesh)V3.aoP.mesh.visible=nice&&V3.aoP.mesh.count>0;V3.sig=null;V3.lookAt=null;}

/* ---------- terrain, water, decoration ---------- */
function v3H(x,z){   // ground height at a mesh vertex: lakes sink, the map edge drops into the sea
 if(x<=0.01||z<=0.01||x>=MW-0.01||z>=MH-0.01)return -1.6;
 const isW=(x,y)=>x<0||y<0||x>=MW||y>=MH||terr[y*MW+x]===1,fx=Math.floor(x),fz=Math.floor(z),cx=x-fx,cz=z-fz;
 if(cx>0.25&&cz>0.25)return isW(fx,fz)?-0.55:0;
 const xs=cx<0.25?[fx-1,fx]:[fx],zs=cz<0.25?[fz-1,fz]:[fz];for(const a of xs)for(const b of zs)if(!isW(a,b))return 0;return -0.5;
}
/* Ground = one coarse piece per chunk (overview texture, always there) + detailed chunks near the camera (chunk texture). */
function v3Terrain(){
 const sc=V3.scene;V3.mapGen=mapGen;C3L.dmax=Math.max(170,MW*1.3);
 for(const k of ['water','floor'])if(V3[k]){sc.remove(V3[k]);V3[k].geometry.dispose();}
 v3ClearChunks();
 if(V3.coarse)for(const m of V3.coarse){sc.remove(m);m.geometry.dispose();}
 if(V3.oTex)V3.oTex.dispose();
 const ot=new T3.CanvasTexture(terrO);ot.anisotropy=Math.min(8,V3.r.capabilities.getMaxAnisotropy());V3.oTex=ot;
 if(!V3.oMat)V3.oMat=new T3.MeshStandardMaterial({roughness:1,metalness:0});V3.oMat.map=ot;V3.oMat.needsUpdate=true;
 V3.coarse=[];const NX=MW/CH,NY=MH/CH;
 for(let cy=0;cy<NY;cy++)for(let cx=0;cx<NX;cx++){const g=new T3.PlaneGeometry(CH,CH,CH/2,CH/2);g.rotateX(-Math.PI/2);g.translate(cx*CH+CH/2,0,cy*CH+CH/2);
  const P=g.attributes.position,UV=g.attributes.uv;for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i);P.setY(i,v3H(x,z)-0.05);UV.setXY(i,x/MW,1-z/MH);}
  g.computeVertexNormals();const m=new T3.Mesh(g,V3.oMat);m.receiveShadow=true;sc.add(m);V3.coarse.push(m);}
 // sea floor around the island and the animated water surface
 V3.floor=new T3.Mesh(new T3.PlaneGeometry(4000,4000).rotateX(-Math.PI/2),new T3.MeshStandardMaterial({color:'#123a5e',roughness:1}));V3.floor.position.set(MW/2,-1.55,MH/2);sc.add(V3.floor);
 if(!V3.wNorm){V3.wNorm=new T3.CanvasTexture(v3Canvas(128,128,(g,w,h)=>{const im=g.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=2*Math.PI/w;
    const dx=Math.cos(x*a*3+y*a*2)*0.5+Math.cos(x*a*7-y*a*5)*0.3+Math.sin(x*a*11+y*a*13)*0.2,dy=Math.cos(y*a*4-x*a*1)*0.5+Math.sin(y*a*9+x*a*6)*0.3+Math.cos(x*a*5+y*a*12)*0.2;
    const i=(y*w+x)*4;im.data[i]=128+dx*60;im.data[i+1]=128+dy*60;im.data[i+2]=255;im.data[i+3]=255;}g.putImageData(im,0,0);}));
  V3.wNorm.wrapS=V3.wNorm.wrapT=T3.RepeatWrapping;V3.wNorm.repeat.set(290,290);}
 V3.water=new T3.Mesh(new T3.PlaneGeometry(4000,4000).rotateX(-Math.PI/2),new T3.MeshStandardMaterial({color:'#3f93d6',transparent:true,opacity:0.58,roughness:0.12,metalness:0.05,normalMap:V3.wNorm,normalScale:new T3.Vector2(0.45,0.45),depthWrite:false}));
 V3.water.position.set(MW/2,-0.12,MH/2);V3.water.receiveShadow=true;V3.water.renderOrder=2;sc.add(V3.water);
 if(V3.grid){sc.remove(V3.grid);V3.grid.geometry.dispose();}
 V3.grid=new T3.GridHelper(MW,MW,0xffffff,0xffffff);V3.grid.position.set(MW/2,0.03,MH/2);V3.grid.material.transparent=true;V3.grid.material.opacity=0.07;V3.grid.material.depthWrite=false;V3.grid.visible=false;sc.add(V3.grid);
 // decoration candidates per biome (shown near the camera, hidden where something is built)
 const dec=V3.dec=[],KD=['tree','snowtree','cactus','dead','bush','reed','rockg','crack'];
 for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){const i=y*MW+x,t=terr[i];if(t===1||nodeAt[i])continue;
  const sp=BIOMES[bio[i]].d3,h=hash2(x*3+1,y*5+2),h2=hash2(y*7+3,x*11+5),d=Math.hypot(x-MW/2,y-MH/2);
  if(t===3){if(h<(sp.rock||0))dec.push({k:'rock',x,y,h,c:sp.rockc});else if(sp.crack&&h2<sp.crack*2)dec.push({k:'crack',x,y,h});continue;}
  if(d<10)continue;
  const wet=terr[i-1]===1||terr[i+1]===1||terr[i-MW]===1||terr[i+MW]===1;let acc=0;
  for(const k of KD){let pr=sp[k]||0;if(k==='reed'&&!wet)pr=0;if((k==='tree'||k==='snowtree'||k==='bush')&&t===2)pr=0;
   if(h<acc+pr){dec.push({k:k==='rockg'?'rock':k,x,y,h:h2,c:sp.rockc});break;}acc+=pr;}}
 V3.sig=null;V3.decDirty=true;
}
function v3ClearChunks(){if(!V3.chunks)V3.chunks=new Map();for(const o of V3.chunks.values()){V3.scene.remove(o);o.geometry.dispose();o.material.map.dispose();o.material.dispose();}V3.chunks.clear();}
function v3Chunks(){
 const NX=MW/CH,NY=MH/CH,want=new Map(),max=V3.q==='high'?28:16;
 if(C3.dist<150){const R=v3cl(C3.dist*1.5,24,96),L=[];
  for(let cy=0;cy<NY;cy++)for(let cx=0;cx<NX;cx++){const dx=Math.max(0,Math.abs(cx*CH+CH/2-C3.x)-CH/2),dz=Math.max(0,Math.abs(cy*CH+CH/2-C3.y)-CH/2),d=Math.hypot(dx,dz);if(d<R)L.push([d,cx,cy]);}
  L.sort((a,b)=>a[0]-b[0]);for(const [,cx,cy] of L.slice(0,max))want.set(cy*1024+cx,[cx,cy]);}
 for(const [k,o] of V3.chunks)if(!want.has(k)){V3.scene.remove(o);o.geometry.dispose();o.material.map.dispose();o.material.dispose();V3.coarse[o.userData.ci].visible=true;V3.chunks.delete(k);}
 bakeT0=performance.now();
 for(const [k,[cx,cy]] of want){if(V3.chunks.has(k))continue;const c=getChunk(cx,cy,bakeBudget());if(!c)continue;
  const g=new T3.PlaneGeometry(CH,CH,CH*2,CH*2);g.rotateX(-Math.PI/2);g.translate(cx*CH+CH/2,0,cy*CH+CH/2);const P=g.attributes.position;
  for(let i=0;i<P.count;i++)P.setY(i,v3H(P.getX(i),P.getZ(i)));g.computeVertexNormals();
  const tex=new T3.CanvasTexture(c);tex.anisotropy=Math.min(8,V3.r.capabilities.getMaxAnisotropy());
  const m=new T3.Mesh(g,new T3.MeshStandardMaterial({map:tex,roughness:1,metalness:0,envMapIntensity:V3.look==='nice'?0:1}));m.receiveShadow=true;m.userData.ci=cy*NX+cx;V3.scene.add(m);V3.chunks.set(k,m);V3.coarse[m.userData.ci].visible=false;}
}
function v3Decor(){
 const R=v3cl(30+C3.dist*0.9,40,120),A=V3.decAt,keep=C3.dist<70?1:70/C3.dist;
 if(!V3.decDirty&&A&&Math.abs(C3.x-A.x)<R*0.25&&Math.abs(C3.y-A.y)<R*0.25&&Math.abs(R-A.R)<R*0.15)return;
 V3.decDirty=false;V3.decAt={x:C3.x,y:C3.y,R};
 const T=V3T,P=V3.decP,D={rock:[],tree:[],snowtree:[],bush:[],cactus:[],reed:[],dead:[],crack:[]};
 for(const d of V3.dec){if(Math.abs(d.x-C3.x)>R||Math.abs(d.y-C3.y)>R||grid[d.y*MW+d.x])continue;if(keep<1&&hash2(d.x+17,d.y+31)>keep)continue;D[d.k].push(d);}
 const at=(d,jx,jz)=>T.v.set(d.x+0.5+(hash2(d.x,d.y)-0.5)*jx,0,d.y+0.5+(hash2(d.y,d.x)-0.5)*jz);
 let ms=v3PoolN(P.rock,D.rock.length);D.rock.forEach((d,i)=>{T.e.set(0,d.h*40,0);T.q.setFromEuler(T.e);const s=0.7+d.h*1.2;ms.setMatrixAt(i,T.m.compose(at(d,0.4,0.4),T.q,T.s.set(s,s*(0.8+hash2(d.x+5,d.y)),s)));ms.setColorAt(i,T.c.set(d.c||'#8b857a').offsetHSL(0,0,(hash2(d.x*2,d.y)-0.5)*0.12));});
 const trees=[...D.tree,...D.snowtree],stems=[...trees,...D.dead];
 const tr=v3PoolN(P.trunk,stems.length),cr=v3PoolN(P.crown,trees.length);
 stems.forEach((d,i)=>{const dead=d.k==='dead',s=0.8+hash2(d.x,d.y*3)*0.6;T.e.set(dead?(d.h-0.5)*0.4:0,d.h*90,0);T.q.setFromEuler(T.e);T.m.compose(at(d,0,0),T.q,T.s.set(s,dead?s*1.9:s,s));tr.setMatrixAt(i,T.m);
  tr.setColorAt(i,T.c.set(dead?'#7c7268':'#6a4a30'));if(!dead){cr.setMatrixAt(i,T.m);cr.setColorAt(i,d.k==='snowtree'?T.c.set('#e6eef3').offsetHSL(0,0,(hash2(d.x,d.y*9)-0.5)*0.06):T.c.set('#3f7a3a').offsetHSL((hash2(d.y,d.x*7)-0.5)*0.05,0,(hash2(d.x,d.y*9)-0.5)*0.12));}});
 ms=v3PoolN(P.bush,D.bush.length);D.bush.forEach((d,i)=>{const s=0.6+hash2(d.x*3,d.y)*0.8;ms.setMatrixAt(i,T.m.compose(at(d,0.5,0.5),T.q.identity(),T.s.set(s,s,s)));ms.setColorAt(i,T.c.set('#5d8f3e').offsetHSL(0,0,(hash2(d.y*4,d.x)-0.5)*0.12));});
 ms=v3PoolN(P.cactus,D.cactus.length);D.cactus.forEach((d,i)=>{const s=0.7+d.h*0.6;T.e.set(0,d.h*50,0);T.q.setFromEuler(T.e);ms.setMatrixAt(i,T.m.compose(at(d,0.4,0.4),T.q,T.s.set(s,s,s)));ms.setColorAt(i,T.c.set('#4f8a3a').offsetHSL(0,0,(d.h-0.5)*0.1));});
 ms=v3PoolN(P.reed,D.reed.length);D.reed.forEach((d,i)=>{const s=0.8+d.h*0.5;T.e.set(0,d.h*70,0);T.q.setFromEuler(T.e);ms.setMatrixAt(i,T.m.compose(at(d,0.5,0.5),T.q,T.s.set(s,s,s)));ms.setColorAt(i,T.c.set('#8d9a52').offsetHSL(0,0,(d.h-0.5)*0.12));});
 ms=v3PoolN(P.crack,D.crack.length);D.crack.forEach((d,i)=>{T.e.set(0,d.h*60,0);T.q.setFromEuler(T.e);ms.setMatrixAt(i,T.m.compose(at(d,0.5,0.5),T.q,T.s.set(0.8+d.h,1,1)));ms.setColorAt(i,T.c.set('#e0561c').multiplyScalar(0.75+d.h*0.4));});
}

/* ---------- building models ----------
   Each building type: static parts merged into one geometry (vertex colours) + animated parts (own InstancedMesh).
   Part: [geo, colour, [x,y,z], [sx,sy,sz], opts]; opts: rot [rx,ry,rz], pivot [x,y,z], an(e,ph,act,t)→{dx,dy,dz,rx,ry,rz,sy},
   glow (unlit, brightness follows activity) or cf(e,act,t)→hex for per-building colour. Origin = footprint centre. */
function v3Models(){
 const M={},bolts=w=>V3.look!=='nice'?[]:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>['cyl6','#8a939c',[a*w*0.43,0.245,b*w*0.43],[0.09,0.05,0.09]]),
  base=(w,col)=>[['box','#2a3037',[0,0.11,0],[w*0.95,0.22,w*0.95]],['box',col?shade(col,-40):'#3b434c',[0,0.235,0],[w*0.85,0.03,w*0.85]],...bolts(w)];
 const def=(id,st,an,extra)=>{M[id]=Object.assign({st,an:an||[]},extra||{});};
 const spin=s=>(e,ph)=>({ry:ph*s}),glowF=(e,act,t)=>0.16+0.84*act*(0.85+0.15*Math.sin(t*9+e.id));
 // machines
 {const c=B.smelter.col;def('smelter',[...base(2),['box',c,[-0.05,0.72,0.05],[1.5,1,1.5]],['box',shade(c,-35),[-0.05,1.28,0.05],[1.62,0.12,1.62]],['cyl','#575c63',[0.48,1.35,-0.44],[0.36,2.2,0.36]],['cyl','#2d3136',[0.48,2.48,-0.44],[0.44,0.12,0.44]],['box','#22262b',[-0.05,0.55,0.81],[0.75,0.5,0.04]]],
  [['box','#ff8a2a',[-0.05,0.55,0.83],[0.6,0.38,0.03],{glow:1}]],{smoke:[[0.48,2.6,-0.44,0]],h:1.4});}
 {const c=B.press.col;def('press',[...base(2),['box',c,[0,0.47,0],[1.5,0.5,1.5]],['box','#30363d',[0,0.76,0],[1.0,0.08,1.0]],['box',shade(c,25),[-0.62,1.3,0],[0.2,1.6,0.3]],['box',shade(c,25),[0.62,1.3,0],[0.2,1.6,0.3]],['box',shade(c,-25),[0,2.12,0],[1.55,0.26,0.45]]],
  [['box','#c9ced4',[0,1.45,0],[0.72,0.55,0.62],{an:(e,ph)=>({dy:-0.42*Math.max(0,Math.sin(ph*4))})}],['cyl','#8d949c',[0,1.9,0],[0.22,0.5,0.22],{an:(e,ph)=>({dy:-0.42*Math.max(0,Math.sin(ph*4))})}]],{h:2.3});}
 {const c=B.assembler.col;def('assembler',[...base(3),['box',c,[0,0.55,0],[2.65,0.62,2.65]],['box','#23272c',[0,0.88,0],[2.3,0.05,0.7]],['cyl','#59616a',[-0.85,1.0,-0.75],[0.5,0.3,0.5]],['cyl','#59616a',[0.85,1.0,0.75],[0.5,0.3,0.5]],['box',shade(c,30),[1.2,0.9,-1.2],[0.18,0.08,0.18]]],
  [['box','#e8b440',[-0.35,1.28,-0.75],[1.0,0.16,0.18],{pivot:[-0.85,1.28,-0.75],an:(e,ph)=>({ry:Math.sin(ph*2.2)*1.1})}],['box','#e8b440',[0.35,1.28,0.75],[1.0,0.16,0.18],{pivot:[0.85,1.28,0.75],an:(e,ph)=>({ry:Math.sin(ph*2.2+2)*1.1})}],
   ['cyl','#e8b440',[-0.85,1.22,-0.75],[0.3,0.3,0.3]],['cyl','#e8b440',[0.85,1.22,0.75],[0.3,0.3,0.3]]],{h:1.4});}
 {const c=B.foundry.col;def('foundry',[...base(3),['box',c,[0,0.85,0],[2.55,1.25,2.55]],['box',shade(c,-30),[0,1.52,0],[2.7,0.1,2.7]],['cyl','#575c63',[0.9,1.9,-0.9],[0.42,2.6,0.42]],['cyl','#575c63',[-0.9,1.7,-0.9],[0.36,2.2,0.36]],['tor','#3a2a26',[0,1.6,0.35],[1.3,1.3,1.3],{rot:[Math.PI/2,0,0]}],['box','#22262b',[0,0.65,1.29],[1.1,0.6,0.04]]],
  [['cyl','#ffb040',[0,1.58,0.35],[1.15,0.06,1.15],{glow:1}],['box','#ff7a2a',[0,0.65,1.31],[0.9,0.45,0.03],{glow:1}]],{smoke:[[0.9,3.25,-0.9,0],[-0.9,2.85,-0.9,0]],h:1.6});}
 {const c=B.refinery.col;def('refinery',[...base(3),['box',c,[0,0.38,0],[2.65,0.3,2.65]],['cyl',c,[-0.7,1.9,-0.6],[0.8,2.9,0.8]],['cyl',shade(c,-30),[-0.7,3.4,-0.6],[0.9,0.12,0.9]],['cyl','#cdd2d9',[0.65,1.15,-0.55],[0.95,1.25,0.95]],['cyl','#cdd2d9',[0.65,1.15,0.65],[0.95,1.25,0.95]],
   ['box','#7d8690',[0,1.0,0.05],[1.6,0.12,0.12]],['box','#7d8690',[-0.7,0.9,0.6],[0.12,0.12,1.2]],['cyl','#7d8690',[-0.7,3.85,-0.6],[0.14,0.9,0.14]],['sph','#e3e6ea',[0.65,1.8,-0.55],[0.95,0.4,0.95]],['sph','#e3e6ea',[0.65,1.8,0.65],[0.95,0.4,0.95]]],
  [['cone','#ff9a3a',[-0.7,4.45,-0.6],[0.22,0.45,0.22],{glow:1,an:(e,ph,act,t)=>({sy:0.4+act*(0.8+0.3*Math.sin(t*14+e.id))})}]],{smoke:[[0.65,2.1,-0.55,1]],h:2});}
 {const c=B.fabricator.col;def('fabricator',[...base(4),['box',c,[0,0.7,0],[3.65,0.95,3.65]],['box','#8fc3e6',[0,1.4,0],[3.2,0.45,3.2]],['box',shade(c,-30),[-1.75,1.8,0],[0.18,0.8,3.5]],['box',shade(c,-30),[1.75,1.8,0],[0.18,0.8,3.5]]],
  [['box','#e8b440',[0,2.12,0],[3.5,0.16,0.28],{an:(e,ph)=>({dz:Math.sin(ph*0.9)*1.3})}],['box','#f0f2f4',[0,1.88,0],[0.36,0.32,0.36],{an:(e,ph)=>({dz:Math.sin(ph*0.9)*1.3,dx:Math.sin(ph*1.7)*1.3})}]],{h:2.2});}
 {const c=B.blender.col;def('blender',[...base(3),['box',c,[0,0.48,0],[2.45,0.5,2.45]],['box',shade(c,-30),[-1.08,1.05,0],[0.16,1.1,1.0]],['box',shade(c,-30),[1.08,1.05,0],[0.16,1.1,1.0]]],
  [['cyl',shade(c,30),[0,1.5,0],[1.7,2.0,1.7],{rot:[0,0,Math.PI/2],an:(e,ph)=>({rx:ph*1.6})}],['box',shade(c,-15),[0,1.5,0],[2.04,1.78,0.22],{an:(e,ph)=>({rx:ph*1.6})}]],{h:2.4});}
 // extraction
 for(const id of ['drill1','drill2','drill3']){const c=B[id].col,legs=[];for(const sx of [-1,1])for(const sz of [-1,1])legs.push(['box',c,[sx*0.66,1.05,sz*0.66],[0.14,1.65,0.14]]);
  def(id,[...base(2),...legs,['box',shade(c,-20),[0,1.9,0],[1.55,0.2,1.55]],['cyl','#3a4046',[0,2.3,0],[0.75,0.6,0.75]],['cyl',shade(c,30),[0,2.65,0],[0.5,0.12,0.5]]],
   [['cone','#c3c8ce',[0,0.75,0],[0.6,0.9,0.6],{rot:[Math.PI,0,0],an:(e,ph,act,t)=>({ry:ph*9,dy:Math.sin(ph*3)*0.06})}],['cyl','#9aa1a8',[0,1.45,0],[0.16,1.0,0.16],{an:(e,ph)=>({ry:ph*9})}]],{h:2.7});}
 {const c=B.wpump.col;def('wpump',[...base(2),['box',c,[0,0.6,-0.15],[1.4,0.75,1.1]],['box',shade(c,-30),[0,1.02,-0.15],[1.5,0.1,1.2]],['cyl','#7d8690',[0.5,0.9,0.5],[0.3,1.3,0.3]]],
  [['cyl',shade(c,40),[-0.25,0.95,0.6],[1.0,0.16,1.0],{rot:[Math.PI/2,0,0],an:(e,ph)=>({rz:ph*4})}],['box','#2a3037',[-0.25,0.95,0.7],[0.95,0.1,0.06],{an:(e,ph)=>({rz:ph*4})}]],{h:1.1});}
 {const c=B.opump.col,beam=(e,ph)=>({rz:Math.sin(ph*1.8)*0.32});def('opump',[...base(2),['box','#3b4048',[0.15,0.95,-0.22],[0.14,1.5,0.14],{rot:[0,0,-0.2]}],['box','#3b4048',[0.15,0.95,0.22],[0.14,1.5,0.14],{rot:[0,0,-0.2]}],['cyl','#2a2228',[-0.78,0.55,0],[0.3,0.65,0.3]],['box',shade(c,30),[0.65,0.45,0],[0.5,0.45,0.6]]],
  [['box',c,[0,1.72,0],[1.9,0.18,0.24],{pivot:[0,1.72,0],an:beam}],['box',shade(c,40),[-0.92,1.55,0],[0.28,0.55,0.3],{pivot:[0,1.72,0],an:beam}],['box','#2a3037',[0.85,1.5,0],[0.35,0.4,0.42],{pivot:[0,1.72,0],an:beam}]],{h:2});}
 // power
 {const c=B.burner.col;def('burner',[...base(2),['box',c,[-0.05,0.68,0.05],[1.5,0.9,1.5]],['box',shade(c,-35),[-0.05,1.17,0.05],[1.6,0.1,1.6]],['cyl','#575c63',[0.44,1.45,-0.44],[0.34,2.3,0.34]],['box','#22262b',[-0.05,0.5,0.81],[0.7,0.38,0.04]]],
  [['box','#ff7a2a',[-0.05,0.5,0.83],[0.55,0.28,0.03],{glow:1}]],{smoke:[[0.44,2.65,-0.44,0]],h:1.3,wire:1.25});}
 {const c=B.steam.col;def('steam',[...base(3),['box',c,[0,0.62,0],[2.55,0.8,2.55]],['tower','#d3cdc2',[0.5,1.95,-0.5],[1.5,1.9,1.5]],['cyl','#8b9198',[-0.6,1.3,0.55],[0.8,1.6,0.8],{rot:[0,0,Math.PI/2]}],['box',shade(c,-30),[0,1.04,0],[2.65,0.08,2.65]]],
  [['box','#2a3037',[-1.42,1.3,0.55],[0.06,0.9,0.14],{an:(e,ph)=>({rx:ph*8})}]],{smoke:[[0.5,2.95,-0.5,1]],h:2.9,wire:1.3});}
 {const c=B.turbine.col;def('turbine',[...base(3),['box',shade(c,-30),[0,0.4,0],[2.6,0.35,2.4]],['cyl',c,[0.15,1.1,0],[1.3,2.1,1.3],{rot:[0,0,Math.PI/2]}],['cone',shade(c,25),[-1.12,1.1,0],[1.2,0.4,1.2],{rot:[0,0,Math.PI/2]}],['cyl','#575c63',[0.85,2.0,0.6],[0.4,1.3,0.4]]],
  [['box','#d9dde1',[-1.36,1.1,0],[0.06,1.05,0.16],{an:(e,ph)=>({rx:ph*12})}],['box','#d9dde1',[-1.36,1.1,0],[0.06,0.16,1.05],{an:(e,ph)=>({rx:ph*12})}]],{smoke:[[0.85,2.7,0.6,0]],h:2.2,wire:1.3});}
 {const c=B.reactor.col;def('reactor',[...base(4),['sph','#d9ddd2',[-0.4,0.3,0.45],[2.5,2.3,2.5]],['tower','#cfcfc6',[0.95,1.5,-0.95],[2.0,2.7,2.0]],['box',c,[-0.4,0.4,0.45],[2.7,0.3,2.7]]],
  [['tor','#7cff6a',[-0.4,0.6,0.45],[2.55,2.55,2.55],{rot:[Math.PI/2,0,0],glow:1}],['sph','#7cff6a',[-0.4,1.45,0.45],[0.3,0.3,0.3],{glow:1,an:(e,ph,act,t)=>({sy:1})}]],{smoke:[[0.95,2.95,-0.95,2]],h:2.9,wire:1.5});}
 def('pole1',[['box','#4a4f55',[0,0.05,0],[0.3,0.1,0.3]],['cyl','#8a6a42',[0,0.85,0],[0.12,1.7,0.12]],['box','#5c4a32',[0,1.55,0],[0.75,0.07,0.08]],['cyl','#dfe6ea',[-0.3,1.64,0],[0.07,0.12,0.07]],['cyl','#dfe6ea',[0.3,1.64,0],[0.07,0.12,0.07]]],[],{wire:1.64,h:1.7});
 def('pole2',[['box','#4a4f55',[0,0.06,0],[0.8,0.12,0.8]],['frust','#9aa3ab',[0,1.5,0],[0.5,2.9,0.5]],['box','#6f7880',[0,1.5,0],[0.08,2.9,0.6]],['box','#6f7880',[0,1.5,0],[0.6,2.9,0.08]],['box',B.pole2.col,[0,2.85,0],[1.3,0.09,0.09]],['box',B.pole2.col,[0,2.3,0],[0.9,0.08,0.08]],['cyl','#dfe6ea',[-0.55,2.95,0],[0.08,0.14,0.08]],['cyl','#dfe6ea',[0.55,2.95,0],[0.08,0.14,0.08]]],[],{wire:2.95,h:3});
 // core, storage, tank, incinerator
 {const c=B.core.col;def('core',[['box','#272c32',[0,0.15,0],[3.85,0.3,3.85]],['box',c,[0,0.52,0],[3.2,0.45,3.2]],['box',shade(c,-30),[0,0.78,0],[2.6,0.08,2.6]],['cyl6','#4a525b',[0,1.9,0],[1.9,2.3,1.9]],['cyl6','#ffcf7a',[0,1.9,0],[1.95,0.06,1.95]],['cyl6',c,[0,1.5,0],[2.0,0.18,2.0]],['cyl6',c,[0,2.6,0],[2.0,0.18,2.0]],['cyl','#545b63',[0,3.25,0],[0.25,0.9,0.25]]],
  [['oct','#ffc56a',[0,3.85,0],[0.6,0.8,0.6],{glow:1,an:(e,ph,act,t)=>({ry:t*0.8,dy:Math.sin(t*1.6)*0.08})}],['torThin','#ffb547',[0,2.2,0],[2.5,2.5,2.5],{rot:[Math.PI/2,0,0],glow:1,an:(e,ph,act,t)=>({ry:t*0.5,rx:Math.sin(t*0.7)*0.15})}]],{h:3.6});}
 for(const id of SIGNS){const w=B[id].w,h=0.9+w*0.45;def(id,[['box','#3a4048',[0,0.05,0],[w*0.9,0.1,w*0.3]],['cyl','#59616a',[-w*0.32,h/2,0],[0.1,h,0.1]],['cyl','#59616a',[w*0.32,h/2,0],[0.1,h,0.1]]],[],{h,label:h});}
 {const c=B.dpad.col;def('dpad',[...base(3),['cyl','#30373f',[0,0.32,0],[2.6,0.18,2.6]],['tor',c,[0,0.43,0],[2.0,2.0,2.0],{rot:[Math.PI/2,0,0]}],['box',shade(c,-25),[0,0.42,0],[1.1,0.02,0.1]],['box',shade(c,-25),[0,0.42,0],[0.1,0.02,1.1]]],
  [['sph','#ffd36a',[-1.2,0.36,-1.2],[0.16,0.16,0.16],{glow:1}],['sph','#ffd36a',[1.2,0.36,-1.2],[0.16,0.16,0.16],{glow:1}],['sph','#ffd36a',[1.2,0.36,1.2],[0.16,0.16,0.16],{glow:1}],['sph','#ffd36a',[-1.2,0.36,1.2],[0.16,0.16,0.16],{glow:1}]],{h:0.5});}
 {const c=B.storage.col;def('storage',[...base(2,c),['box',c,[0,0.8,0],[1.6,1.1,1.6]],['box',shade(c,-30),[0,0.55,0],[1.64,0.12,1.64]],['box',shade(c,-30),[0,0.95,0],[1.64,0.12,1.64]],['box',shade(c,20),[0,1.37,0],[1.68,0.08,1.68]],['box',shade(c,-45),[0,0.8,0],[0.12,1.12,1.65]],['box',shade(c,-45),[0,0.8,0],[1.65,1.12,0.12]]],[],{h:1.4});}
 {const c=B.tank.col;def('tank',[...base(2),['cyl',c,[0,0.95,0],[1.55,1.45,1.55]],['sph',shade(c,25),[0,1.67,0],[1.55,0.4,1.55]],['box','#1c2024',[0,0.92,0.78],[0.24,1.1,0.03]]],
  [['box','#3d8ee6',[0,0.92,0.8],[0.16,1.0,0.03],{cf:e=>e.ft?IT[e.ft].c:'#333a40',an:e=>({sy:Math.max(0.02,(e.amt||0)/B.tank.cap)})}]],{h:1.9});}
 {const c=B.incin.col;def('incin',[...base(2),['box',c,[0,0.7,0.1],[1.5,1.0,1.3]],['box',shade(c,-30),[0,1.24,0.1],[1.56,0.1,1.36]],['cyl','#575c63',[0.45,1.7,-0.5],[0.32,1.8,0.32]],['box','#22262b',[0,0.62,0.76],[0.8,0.55,0.03]]],
  [['box','#ff6a2a',[0,0.62,0.77],[0.66,0.42,0.03],{glow:1}]],{smoke:[[0.45,2.7,-0.5,0]],h:1.6});}
 // logistics pieces (1×1, rotate with dir; front = +x)
 for(const id of ['splitter','merger','sorter']){const c=B[id].col,mk=[];const sides=id==='merger'?[[-0.36,0],[0,-0.36],[0,0.36]]:[[0.36,0],[0,-0.36],[0,0.36]];
  for(const [x,z] of sides)mk.push(['box',shade(c,45),[x,0.44,z],[Math.abs(x)>0?0.12:0.3,0.04,Math.abs(z)>0?0.12:0.3]]);
  def(id,[['box','#2a3037',[0,0.08,0],[0.92,0.16,0.92]],['box',c,[0,0.28,0],[0.84,0.28,0.84]],['box','#23272c',[0,0.425,0],[0.6,0.03,0.6]],...mk,['box','#f0f2f4',[0.28,0.44,0],[0.1,0.05,0.22]]],[],{h:0.45});}
 def('junction',[['box','#2a3037',[0,0.06,0],[0.6,0.12,0.6]],['sph',B.junction.col,[0,0.32,0],[0.5,0.5,0.5]],['cyl',shade(B.junction.col,-20),[0,0.32,0],[0.3,1.0,0.3],{rot:[0,0,Math.PI/2]}],['cyl',shade(B.junction.col,-20),[0,0.32,0],[0.3,1.0,0.3],{rot:[Math.PI/2,0,0]}]],[],{h:0.6});
 def('crossing',[['box','#2a3037',[0,0.07,0],[0.94,0.14,0.94]],['box','#5c6168',[0,0.17,0],[0.86,0.06,0.86]],['box','#9aa0a6',[0,0.21,0],[0.86,0.03,0.18]],['box','#9aa0a6',[0,0.21,0],[0.18,0.03,0.86]]],[],{h:0.25});
 // build: merge statics, create pools for animated parts
 const G=V3.G,m4=new T3.Matrix4(),q=new T3.Quaternion(),eu=new T3.Euler();
 const pm=(pos,scl,rot)=>{eu.set(...(rot||[0,0,0]));q.setFromEuler(eu);return new T3.Matrix4().compose(new T3.Vector3(...pos),q.clone(),new T3.Vector3(...scl));};
 V3.M=M;
 for(const id in M){const m=M[id];if(!B[id])continue;
  const nice=V3.look==='nice';m.geo=v3Merge(m.st.map(([g,c,pos,scl,o])=>nice&&g==='box'&&Math.min(scl[0],scl[1],scl[2])>=0.08?{g:v3RBox(scl[0],scl[1],scl[2]),c:v3col(c),m:pm(pos,[1,1,1],o&&o.rot)}:{g:G[g],c:v3col(c),m:pm(pos,scl,o&&o.rot)}));m.pool=v3Pool(m.geo,V3.mat,{cast:1,recv:1});
  m.parts=m.an.map(([g,c,pos,scl,o])=>{o=o||{};const geo=v3Merge([{g:G[g],c:v3col(o.glow||o.cf?'#ffffff':c),m:pm([0,0,0],scl,o.rot)}]);
   const glow=!!(o.glow||o.cf);const mat=glow?V3.glowMat:V3.mat;
   return{pos,o,glow,col:v3col(c),pool:v3Pool(geo,mat,{cast:!glow,recv:!glow,color:glow})};});}
 V3.led=v3Pool(G.sph,V3.glowMat,{color:1});
 {const parts=[{g:G.box,m:new T3.Matrix4().makeScale(0.55,0.18,0.42),c:v3col('#e9eef2')},{g:G.box,m:new T3.Matrix4().compose(new T3.Vector3(0,0.02,0),new T3.Quaternion(),new T3.Vector3(0.57,0.05,0.12)),c:v3col(B.dpad.col)}];
  for(const [ax,az] of [[-1,-1],[1,-1],[1,1],[-1,1]]){parts.push({g:G.box,m:new T3.Matrix4().compose(new T3.Vector3(ax*0.3,0.03,az*0.3),new T3.Quaternion().setFromEuler(new T3.Euler(0,ax*az>0?-Math.PI/4:Math.PI/4,0)),new T3.Vector3(0.5,0.05,0.06)),c:v3col('#3a4048')});
   parts.push({g:G.cyl,m:new T3.Matrix4().compose(new T3.Vector3(ax*0.5,0.1,az*0.5),new T3.Quaternion(),new T3.Vector3(0.46,0.02,0.46)),c:v3col('#cfd8de')});}
  V3.droneP=v3Pool(v3Merge(parts),V3.mat,{cast:1});
  V3.cargoP=v3Pool(G.box,new T3.MeshStandardMaterial({roughness:0.6}),{color:1,cast:1});
  const sh=new T3.CircleGeometry(0.6,20);sh.rotateX(-Math.PI/2);V3.dshadowP=v3Pool(sh,new T3.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.25,depthWrite:false}),{order:4});}
}

/* ---------- belts & pipes (procedural ribbons) ---------- */
function v3Ribbon(pts,segs){ // pts(t)->[x,z,tx,tz]; segs: [[o0,o1,y0,y1,top?]] lateral offsets & heights → walls+top
 const pos=[],nor=[],uv=[],N=pts.length;let L=[0];for(let i=1;i<N;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
 const quad=(a,b,c,d,n,ua,ub)=>{for(const [p,u] of [[a,ua[0]],[b,ua[1]],[c,ub[1]],[a,ua[0]],[c,ub[1]],[d,ub[0]]]){pos.push(...p);uv.push(...u);}for(let k=0;k<6;k++)nor.push(...(typeof n==='function'?n():n));};
 for(const [o0,o1,y0,y1] of segs){
  for(let i=0;i<N-1;i++){const A=pts[i],Bp=pts[i+1],nA=[-A[3],A[2]],nB=[-Bp[3],Bp[2]];
   const P=(p,n,o,y)=>[p[0]+n[0]*o,y,p[1]+n[1]*o];
   const a0=P(A,nA,o0,y1),a1=P(A,nA,o1,y1),b0=P(Bp,nB,o0,y1),b1=P(Bp,nB,o1,y1);
   quad(a0,a1,b1,b0,[0,1,0],[[L[i],0],[L[i],1]],[[L[i+1],0],[L[i+1],1]]);           // top
   const s0=P(A,nA,o0,y0),t0=P(Bp,nB,o0,y0),s1=P(A,nA,o1,y0),t1=P(Bp,nB,o1,y0);
   quad(s0,a0,b0,t0,[-nA[0],0,-nA[1]],[[L[i],0],[L[i],0]],[[L[i+1],0],[L[i+1],0]]);   // inner wall
   quad(a1,s1,t1,b1,[nA[0],0,nA[1]],[[L[i],1],[L[i],1]],[[L[i+1],1],[L[i+1],1]]);}}   // outer wall
 const g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T3.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T3.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function v3Path(kind){ // canonical tile: exit +x. kind 0 straight, 1 enters from north (-z), 2 enters from south (+z)
 const n=kind?10:2,pts=[];
 for(let i=0;i<=n;i++){const t=i/n;let x,z,tx,tz;
  if(!kind){x=-0.5+t;z=0;tx=1;tz=0;}
  else{const ez=kind===1?-0.5:0.5,u=1-t;x=2*u*t*0+t*t*0.5;z=u*u*ez;tx=2*t*0.5;tz=-2*u*ez;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;}
  pts.push([x,z,tx,tz]);}
 return pts;
}
function v3Lines(){
 const tread=new T3.CanvasTexture(v3Canvas(64,32,(g,w,h)=>{g.fillStyle='#24272c';g.fillRect(0,0,w,h);g.fillStyle='#3d434b';for(let i=0;i<4;i++)g.fillRect(i*16+2,2,5,h-4);g.fillStyle='rgba(255,255,255,0.05)';g.fillRect(0,0,w,3);}));
 tread.wrapS=T3.RepeatWrapping;tread.repeat.set(1,1);
 V3.belt={};
 for(const id of ['belt1','belt2','belt3','belt4','belt5']){const t=tread.clone();t.needsUpdate=true;
  V3.belt[id]={tex:t,mat:new T3.MeshStandardMaterial({map:t,roughness:0.9}),pools:[]};
  for(let k=0;k<3;k++)V3.belt[id].pools.push(v3Pool(v3Ribbon(v3Path(k),[[-0.37,0.37,0.02,0.15]]),V3.belt[id].mat,{recv:1}));}
 V3.rail=[0,1,2].map(k=>v3Pool(v3Ribbon(v3Path(k),[[-0.45,-0.37,0,0.2],[0.37,0.45,0,0.2]]),new T3.MeshStandardMaterial({roughness:0.5,metalness:0.4}),{color:1,cast:1,recv:1}));
 // pipes have no direction: an arm from the tile centre to each connected side (tier colour), plus a joint ball tinted by the network's fluid
 const pmat=new T3.MeshStandardMaterial({roughness:0.35,metalness:0.55});
 {const g=new T3.CylinderGeometry(0.17,0.17,0.5,14,1,true);g.rotateZ(Math.PI/2);g.translate(0.25,0.34,0);V3.pipeArm=v3Pool(g,pmat,{color:1,cast:1,recv:1});}
 {const j=new T3.SphereGeometry(0.2,14,10);j.translate(0,0.34,0);const sup=new T3.BoxGeometry(0.12,0.2,0.3);sup.translate(0,0.1,0);
  V3.pipeJoint=v3Pool(v3Merge([{g:j,m:new T3.Matrix4(),c:v3col('#ffffff')},{g:sup,m:new T3.Matrix4(),c:v3col('#8a949e')}]),new T3.MeshStandardMaterial({roughness:0.3,metalness:0.3,vertexColors:true}),{color:1,cast:1,recv:1});}
}

/* ---------- items ---------- */
function v3ItemsInit(){
 const G=V3.G,mk=(g,s,rot)=>{const m=new T3.Matrix4().compose(new T3.Vector3(0,s[1]/2,0),new T3.Quaternion().setFromEuler(new T3.Euler(...(rot||[0,0,0]))),new T3.Vector3(...s));return v3Merge([{g:G[g],m,c:v3col('#ffffff')}]);};
 const geo={ore:mk('dod',[0.3,0.26,0.3]),crystal:mk('oct',[0.22,0.34,0.22]),ingot:mk('box',[0.34,0.13,0.2]),plate:mk('box',[0.34,0.06,0.34]),rod:mk('cyl',[0.1,0.4,0.1],[0,0,Math.PI/2]),beam:v3Merge([[0,0.015,0.2],[0,0.115,0.2],[0,0.065,0.035]].map(([x,y,w])=>({g:G.box,m:new T3.Matrix4().compose(new T3.Vector3(0,y,0),new T3.Quaternion(),new T3.Vector3(0.42,y===0.065?0.1:0.03,w)),c:v3col('#ffffff')}))),
  girder:v3Merge([{g:G.box,m:new T3.Matrix4().compose(new T3.Vector3(0,0.08,0),new T3.Quaternion(),new T3.Vector3(0.42,0.16,0.16)),c:v3col('#ffffff')},{g:G.box,m:new T3.Matrix4().compose(new T3.Vector3(-0.2,0.08,0),new T3.Quaternion(),new T3.Vector3(0.04,0.17,0.17)),c:v3col('#4a5260')},{g:G.box,m:new T3.Matrix4().compose(new T3.Vector3(0.2,0.08,0),new T3.Quaternion(),new T3.Vector3(0.04,0.17,0.17)),c:v3col('#4a5260')}]),
  pipe:v3Merge([{g:new T3.CylinderGeometry(0.09,0.09,0.4,12,1,true),m:new T3.Matrix4().compose(new T3.Vector3(0,0.09,0),new T3.Quaternion().setFromEuler(new T3.Euler(0,0,Math.PI/2)),new T3.Vector3(1,1,1)),c:v3col('#ffffff')},{g:new T3.TorusGeometry(0.075,0.022,6,14),m:new T3.Matrix4().compose(new T3.Vector3(0.2,0.09,0),new T3.Quaternion().setFromEuler(new T3.Euler(0,Math.PI/2,0)),new T3.Vector3(1,1,1)),c:v3col('#ffffff')}]),
  bolts:mk('cyl',[0.2,0.1,0.2]),coil:mk('tor',[0.36,0.36,0.6],[Math.PI/2,0,0]),block:mk('box',[0.26,0.26,0.26]),pile:mk('cone',[0.32,0.22,0.32]),cell:mk('cyl',[0.18,0.32,0.18]),
  barrel:mk('cyl',[0.24,0.3,0.24]),frame:mk('box',[0.4,0.1,0.22]),gear:mk('cyl6',[0.32,0.12,0.32]),chip:mk('box',[0.3,0.05,0.24]),orb:mk('sph',[0.28,0.28,0.28])};
 const mat=new T3.MeshStandardMaterial({roughness:0.45,metalness:0.3});V3.items={};
 for(const k in geo)V3.items[k]={pool:v3Pool(geo[k],mat,{color:1}),n:0};
 V3.icol={};for(const k in IT)V3.icol[k]=v3col(IT[k].c);
}

/* ---------- smoke & steam (points with per-particle size/alpha) ---------- */
function v3SmokeInit(){
 const N=900,g=new T3.BufferGeometry();V3.sm={N,p:[],pos:new Float32Array(N*3),sz:new Float32Array(N),al:new Float32Array(N),col:new Float32Array(N*3)};
 g.setAttribute('position',new T3.BufferAttribute(V3.sm.pos,3));g.setAttribute('size',new T3.BufferAttribute(V3.sm.sz,1));g.setAttribute('alpha',new T3.BufferAttribute(V3.sm.al,1));g.setAttribute('color',new T3.BufferAttribute(V3.sm.col,3));
 V3.smU={scale:{value:600}};
 const mat=new T3.ShaderMaterial({uniforms:V3.smU,transparent:true,depthWrite:false,
  vertexShader:'attribute float size;attribute float alpha;attribute vec3 color;uniform float scale;varying float vA;varying vec3 vC;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*scale/max(0.5,-mv.z);gl_Position=projectionMatrix*mv;vA=alpha;vC=color;}',
  fragmentShader:'varying float vA;varying vec3 vC;void main(){vec2 d=gl_PointCoord-0.5;float r=length(d);if(r>0.5)discard;float a=smoothstep(0.5,0.0,r)*vA;gl_FragColor=vec4(vC,a);}'});
 V3.smoke=new T3.Points(g,mat);V3.smoke.frustumCulled=false;V3.smoke.renderOrder=5;V3.scene.add(V3.smoke);
}

/* ---------- overlays: selection, previews, power wires and ranges ---------- */
function v3Overlays(){
 const G=V3.G;
 const frame=(c)=>{const m=new T3.MeshBasicMaterial({color:c,transparent:true,opacity:0.9,depthWrite:false});const grp=new T3.Group();
  for(const [x,z,sx,sz] of [[0,-0.5,1,0.06],[0,0.5,1,0.06],[-0.5,0,0.06,1],[0.5,0,0.06,1]]){const b=new T3.Mesh(G.box,m);b.position.set(x,0.05,z);b.scale.set(sx,0.08,sz);grp.add(b);}
  grp.visible=false;grp.renderOrder=6;V3.scene.add(grp);return grp;};
 V3.selF=frame(0xffb547);V3.hovF=frame(0xffffff);V3.delF=frame(0xff5a46);
 V3.ghostMat=new T3.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.35,depthWrite:false});
 V3.ghost=v3Pool(G.box,V3.ghostMat,{color:1,order:7});
 V3.wireMat=new T3.LineBasicMaterial({vertexColors:true});V3.wires=null;
 const ring=new T3.RingGeometry(0.985,1,72);ring.rotateX(-Math.PI/2);
 V3.range=v3Pool(ring,new T3.MeshBasicMaterial({color:0xffd75a,transparent:true,opacity:0.55,depthWrite:false}),{order:6});
 const disc=new T3.CircleGeometry(1,48);disc.rotateX(-Math.PI/2);
 {const bg=new T3.CylinderGeometry(0.08,0.3,1,10,1,true);bg.translate(0,0.5,0);V3.hlBeam=v3Pool(bg,new T3.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:0.38,depthWrite:false,side:T3.DoubleSide}),{order:8});}
 V3.rangeFill=v3Pool(disc,new T3.MeshBasicMaterial({color:0xffd75a,transparent:true,opacity:0.07,depthWrite:false}),{order:5});
 const dg=V3.G;
 V3.decP={rock:v3Pool(v3Merge([{g:dg.ico,m:new T3.Matrix4().makeScale(0.55,0.36,0.5),c:v3col('#ffffff')}]),new T3.MeshStandardMaterial({roughness:0.95,flatShading:true}),{color:1,cast:1,recv:1}),
  trunk:v3Pool(v3Merge([{g:dg.lowcyl,m:new T3.Matrix4().compose(new T3.Vector3(0,0.3,0),new T3.Quaternion(),new T3.Vector3(0.14,0.6,0.14)),c:v3col('#ffffff')}]),V3.mat,{cast:1,color:1}),
  cactus:v3Pool(v3Merge([{g:dg.lowcyl,m:new T3.Matrix4().compose(new T3.Vector3(0,0.5,0),new T3.Quaternion(),new T3.Vector3(0.24,1.0,0.24)),c:v3col('#ffffff')},{g:dg.lowcyl,m:new T3.Matrix4().compose(new T3.Vector3(0.2,0.55,0),new T3.Quaternion(),new T3.Vector3(0.14,0.34,0.14)),c:v3col('#ffffff')},{g:dg.lowcyl,m:new T3.Matrix4().compose(new T3.Vector3(-0.19,0.7,0),new T3.Quaternion(),new T3.Vector3(0.13,0.3,0.13)),c:v3col('#ffffff')}]),new T3.MeshStandardMaterial({roughness:0.8,vertexColors:true}),{color:1,cast:1,recv:1}),
  reed:v3Pool(v3Merge([[-0.12,0.05,0.7],[0.08,-0.1,0.85],[0.1,0.12,0.6],[-0.05,0.14,0.75]].map(([x,z,h])=>({g:dg.lowcyl,m:new T3.Matrix4().compose(new T3.Vector3(x,h/2,z),new T3.Quaternion(),new T3.Vector3(0.05,h,0.05)),c:v3col('#ffffff')}))),new T3.MeshStandardMaterial({roughness:0.9,vertexColors:true}),{color:1,cast:1}),
  crack:v3Pool(v3Merge([[0,0,0.36,0],[0.2,0.07,0.3,0.75],[0.36,0.2,0.22,-0.4],[-0.2,-0.04,0.28,0.5]].map(([x,z,l,r])=>({g:dg.box,m:new T3.Matrix4().compose(new T3.Vector3(x,0.015,z),new T3.Quaternion().setFromEuler(new T3.Euler(0,r,0)),new T3.Vector3(l,0.02,0.045)),c:v3col('#ffffff')}))),V3.glowMat,{color:1}),
  crown:v3Pool(v3Merge([{g:dg.lowcone,m:new T3.Matrix4().compose(new T3.Vector3(0,1.05,0),new T3.Quaternion(),new T3.Vector3(0.85,1.3,0.85)),c:v3col('#ffffff')},{g:dg.lowcone,m:new T3.Matrix4().compose(new T3.Vector3(0,1.55,0),new T3.Quaternion(),new T3.Vector3(0.6,0.9,0.6)),c:v3col('#ffffff')}]),new T3.MeshStandardMaterial({roughness:0.9,flatShading:true}),{color:1,cast:1,recv:1}),
  bush:v3Pool(v3Merge([{g:dg.lowsph,m:new T3.Matrix4().compose(new T3.Vector3(0,0.15,0),new T3.Quaternion(),new T3.Vector3(0.5,0.35,0.45)),c:v3col('#ffffff')}]),new T3.MeshStandardMaterial({roughness:0.9,flatShading:true}),{color:1,cast:1,recv:1}),
  node:v3Pool(v3Merge([{g:dg.ico,m:new T3.Matrix4().makeScale(1,0.8,1),c:v3col('#ffffff')}]),new T3.MeshStandardMaterial({roughness:0.6,metalness:0.15,flatShading:true}),{color:1,cast:1,recv:1}),
  pur:v3Pool(dg.ico,V3.glowMat,{color:1}),
  oil:v3Pool(v3Merge([{g:dg.cyl,m:new T3.Matrix4().makeScale(0.8,0.04,0.65),c:v3col('#ffffff')}]),new T3.MeshStandardMaterial({roughness:0.05,metalness:0.6}),{color:1,recv:1})};
}

/* ---------- layout: rebuild instance buffers when the set of entities changes ---------- */
function v3Sig(){let h=ents.size|0;for(const e of ents.values())h=(Math.imul(h,31)+e.id*7+(e.dir||0)*3+(e.cin==null?5:e.cin)+(e.d.length<<4))|0;return h;}
const _m=()=>new T3.Matrix4(),_v=()=>new T3.Vector3(),_q=()=>new T3.Quaternion();
let V3T;   // scratch objects
function v3Layout(){
 if(V3.lookAt!==V3.look){V3.lookAt=V3.look;const nice=V3.look==='nice';V3.scene.traverse(o=>{const m=o.material;if(m&&m.isMeshStandardMaterial)m.envMapIntensity=nice?(m.metalness>0.25?0.5:0):1;});}
 if(!V3T)V3T={m:_m(),m2:_m(),v:_v(),s:_v(),q:_q(),e:new T3.Euler(),c:new T3.Color(),up:new T3.Vector3(0,1,0)};
 const L={type:{},belts:{belt1:[[],[],[]],belt2:[[],[],[]],belt3:[[],[],[]],belt4:[[],[],[]],belt5:[[],[],[]]},pipes:[],lines:[],led:[],emit:[],carry:[]};V3.L=L;
 for(const e of ents.values()){
  if(isLine(e.k)){const rel=e.cin==null?0:((e.cin-e.dir)&3)===1?1:((e.cin-e.dir)&3)===3?2:0;(e.k==='belt'?L.belts[e.d][rel]:L.pipes).push(e);L.lines.push(e);if(e.k==='belt')L.carry.push(e);continue;}
  (L.type[e.d]=L.type[e.d]||[]).push(e);if(e.k==='router'||e.k==='cross')L.carry.push(e);
  if(e.k==='mach'||e.k==='drill'||e.k==='pump'||e.k==='gen')L.led.push(e);
  const m=V3.M[e.d];if(m&&m.smoke)for(const s of m.smoke)L.emit.push([e,s]);}
 const T=V3T,base=e=>{const w=e.w;T.e.set(0,w===1&&(e.k==='router'||e.k==='cross')?-(e.dir||0)*Math.PI/2:0,0);T.q.setFromEuler(T.e);return new T3.Matrix4().compose(T.v.set(e.x+w/2,0,e.y+w/2),T.q,T.s.set(1,1,1));};
 for(const id in V3.M){const m=V3.M[id],list=L.type[id]||[];m.list=list;m.base=list.map(base);const ms=v3PoolN(m.pool,list.length);list.forEach((e,i)=>ms.setMatrixAt(i,m.base[i]));
  for(const p of m.parts)v3PoolN(p.pool,list.length);}
 const lineM=e=>{T.e.set(0,-e.dir*Math.PI/2,0);T.q.setFromEuler(T.e);return T.m.compose(T.v.set(e.x+0.5,0,e.y+0.5),T.q,T.s.set(1,1,1));};
 const railN=[0,0,0],railL=[[],[],[]];
 for(const id in L.belts)L.belts[id].forEach((list,k)=>{const ms=v3PoolN(V3.belt[id].pools[k],list.length);list.forEach((e,i)=>ms.setMatrixAt(i,lineM(e)));railN[k]+=list.length;railL[k].push(...list);});
 railL.forEach((list,k)=>{const ms=v3PoolN(V3.rail[k],list.length);list.forEach((e,i)=>{ms.setMatrixAt(i,lineM(e));ms.setColorAt(i,T.c.set(B[e.d].col));});});
 {const arms=[];for(const e of L.pipes){const m=e.pc||((1<<e.dir)|(1<<((e.dir+2)&3)));for(let d=0;d<4;d++)if(m&(1<<d))arms.push([e,d]);}
  const am=v3PoolN(V3.pipeArm,arms.length);arms.forEach(([e,d],i)=>{T.e.set(0,-d*Math.PI/2,0);T.q.setFromEuler(T.e);am.setMatrixAt(i,T.m.compose(T.v.set(e.x+0.5,0,e.y+0.5),T.q,T.s.set(1,1,1)));am.setColorAt(i,T.c.set(B[e.d].col));});
  const jm=v3PoolN(V3.pipeJoint,L.pipes.length);L.pipes.forEach((e,i)=>jm.setMatrixAt(i,T.m.compose(T.v.set(e.x+0.5,0,e.y+0.5),T.q.identity(),T.s.set(1,1,1))));}
 v3PoolN(V3.led,L.led.length);
 {const nice=V3.look==='nice',sh=nice?[...ents.values()].filter(e=>!isLine(e.k)&&e.k!=='sign'):[],am=v3PoolN(V3.aoP,sh.length);
  sh.forEach((e,i)=>{const k=e.w*1.45+(e.w===1?0.25:0);am.setMatrixAt(i,T.m.compose(T.v.set(e.x+e.w/2,0.025,e.y+e.w/2),T.q.identity(),T.s.set(k,1,k)));});am.visible=nice&&sh.length>0;}
 // power wires
 const pos=[],col=[],cA=new T3.Color('#22201d'),cT=new T3.Color('#ff4a3a'),top=e=>{const m=V3.M[e.d];return[e.x+e.w/2,m&&m.wire||1.3,e.y+e.h/2];};
 for(const [a,b] of pwLinks){const A=top(a),Bp=top(b),len=Math.hypot(A[0]-Bp[0],A[2]-Bp[2]),sag=Math.min(0.9,0.05*len),c=a.grid&&a.grid.trip?cT:cA;
  for(let i=0;i<10;i++){for(const t of [i/10,(i+1)/10]){pos.push(A[0]+(Bp[0]-A[0])*t,A[1]+(Bp[1]-A[1])*t-sag*Math.sin(Math.PI*t),A[2]+(Bp[2]-A[2])*t);col.push(c.r,c.g,c.b);}}}
 if(V3.wires){V3.scene.remove(V3.wires);V3.wires.geometry.dispose();}
 const wg=new T3.BufferGeometry();wg.setAttribute('position',new T3.Float32BufferAttribute(pos,3));wg.setAttribute('color',new T3.Float32BufferAttribute(col,3));
 V3.wires=new T3.LineSegments(wg,V3.wireMat);V3.wires.frustumCulled=false;V3.scene.add(V3.wires);V3.trip=v3TripSig();
 V3.decDirty=true;
 // resource nodes (hidden under buildings)
 let ms;const P=V3.decP;
 const nd=[],pu=[],oil=[];for(const n of nodes){if(grid[n.y*MW+n.x])continue;if(n.t==='oil')oil.push(n);else{for(let k=0;k<4;k++)nd.push([n,k]);for(let k=0;k<=n.p;k++)pu.push([n,k]);}}
 ms=v3PoolN(P.node,nd.length);nd.forEach(([n,k],i)=>{const ox=(hash2(n.x*7+k,n.y)-0.5)*0.5,oz=(hash2(n.x,n.y*7+k)-0.5)*0.45,r=0.34+hash2(k,n.x+n.y)*0.2;T.e.set(hash2(k,n.x)*3,hash2(n.y,k)*6,0);T.q.setFromEuler(T.e);
  ms.setMatrixAt(i,T.m.compose(T.v.set(n.x+0.5+ox,r*0.25,n.y+0.5+oz),T.q,T.s.set(r,r,r)));ms.setColorAt(i,T.c.set(NODE_T[n.t][1]));});
 ms=v3PoolN(P.pur,pu.length);pu.forEach(([n,k],i)=>{ms.setMatrixAt(i,T.m.compose(T.v.set(n.x+0.5+(k-n.p/2)*0.17,0.05,n.y+0.92),T.q.identity(),T.s.set(0.1,0.1,0.1)));ms.setColorAt(i,T.c.set(['#e08a5a','#e8e8e8','#7fe08a'][n.p]));});
 ms=v3PoolN(P.oil,oil.length);oil.forEach((n,i)=>{ms.setMatrixAt(i,T.m.compose(T.v.set(n.x+0.5,0.02,n.y+0.5),T.q.identity(),T.s.set(1,1,1)));ms.setColorAt(i,T.c.set('#120d16'));});
 // power ranges
 L.pn=pnodes.slice();
}
function v3TripSig(){let s='';for(const g of grids)s+=g.trip?1:0;return s+':'+pwLinks.length;}

/* ---------- per-frame animation ---------- */
function v3Anim(dt,t){
 const T=V3T,L=V3.L;
 for(const id in V3.M){const m=V3.M[id],list=m.list;if(!list||!list.length)continue;
  for(let i=0;i<list.length;i++){const e=list[i],act=isActive(e)?1:0;e._a3=(e._a3||0)+(act-(e._a3||0))*Math.min(1,dt*3);e._p3=(e._p3||0)+dt*e._a3*(e.clock||1);}
  for(const p of m.parts){const ms=p.pool.mesh;if(!ms)continue;
   for(let i=0;i<list.length;i++){const e=list[i],a=p.o.an?p.o.an(e,e._p3,e._a3,t):null,pv=p.o.pivot||p.pos;
    T.e.set(a&&a.rx||0,a&&a.ry||0,a&&a.rz||0);T.q.setFromEuler(T.e);
    // world = base · T(pivot+d) · R(anim) · T(pos−pivot) · [sy about bottom]
    const sy=a&&a.sy!=null?a.sy:1;
    T.m.compose(T.v.set(pv[0]+(a&&a.dx||0),pv[1]+(a&&a.dy||0),pv[2]+(a&&a.dz||0)),T.q,T.s.set(1,1,1));
    T.m2.makeTranslation(p.pos[0]-pv[0],p.pos[1]-pv[1]-(sy!==1&&p.o.cf?(1-sy)*0.5*(p.o.cfH||1):0),p.pos[2]-pv[2]);T.m.multiply(T.m2);
    if(sy!==1){T.m2.makeScale(1,sy,1);T.m.multiply(T.m2);}
    T.m.premultiply(m.base[i]);ms.setMatrixAt(i,T.m);
    if(p.glow){if(p.o.cf)T.c.set(p.o.cf(e,e._a3,t));else T.c.copy(p.col).multiplyScalar(id==='core'?1:0.16+0.84*e._a3*(0.85+0.15*Math.sin(t*9+e.id)));ms.setColorAt(i,T.c);}}
   ms.instanceMatrix.needsUpdate=true;if(ms.instanceColor)ms.instanceColor.needsUpdate=true;}}
 // status lights
 const led=V3.led.mesh;if(led){L.led.forEach((e,i)=>{const st=bStatus(e),w=e.w;led.setMatrixAt(i,T.m.compose(T.v.set(e.x+w-0.2,0.3,e.y+w-0.2),T.q.identity(),T.s.set(0.13,0.13,0.13)));T.c.set(st?st[0]:'#8a96a0');led.setColorAt(i,T.c);});led.instanceMatrix.needsUpdate=true;led.instanceColor.needsUpdate=true;}
 // pipe flanges show the fluid inside
 const jm=V3.pipeJoint.mesh;if(jm&&L.pipes.length){L.pipes.forEach((e,i)=>{const n=e.net;T.c.set('#5a646e');if(n&&n.fluid)T.c.lerp(V3.icol[n.fluid],Math.min(1,0.25+n._fl*1.5));jm.setColorAt(i,T.c);});jm.instanceColor.needsUpdate=true;}
 // belt treads move at belt speed
 for(const id in V3.belt){const b=V3.belt[id];b.tex.offset.x=-(t*Math.min(4,B[id].spd))%1;}
 if(V3.wNorm){V3.wNorm.offset.set(t*0.004,t*0.0025);}
}
/* Drones: hover on their pad, rise, fly the route at cruise height, land; a box underneath shows the cargo */
function v3Drones(){const T=V3T,list=pads.filter(e=>e.dr.st||padTarget(e)),dm=v3PoolN(V3.droneP,list.length),sm=v3PoolN(V3.dshadowP,list.length);let nc=0;const cm=v3PoolN(V3.cargoP,list.length);
 list.forEach((e,i)=>{const p=dronePos(e),y=0.75+p.h*6+Math.sin(animT*3+e.id)*0.05,yaw=e.dr.st?-Math.atan2(e.dr.ty-e.y,e.dr.tx-e.x):0;
  T.e.set(0,yaw,e.dr.st?0.08:0);T.q.setFromEuler(T.e);dm.setMatrixAt(i,T.m.compose(T.v.set(p.x,y,p.y),T.q,T.s.set(1.4,1.4,1.4)));
  sm.setMatrixAt(i,T.m.compose(T.v.set(p.x+p.h*1.2,0.03,p.y+p.h*0.8),T.q.identity(),T.s.set(1-p.h*0.3,1,1-p.h*0.3)));
  const c=Object.keys(e.dr.c||{})[0];if(c){cm.setMatrixAt(nc,T.m.compose(T.v.set(p.x,y-0.28,p.y),T.q.identity(),T.s.set(0.42,0.3,0.42)));cm.setColorAt(nc,V3.icol[c]);nc++;}});
 cm.count=nc;cm.visible=nc>0;dm.instanceMatrix.needsUpdate=sm.instanceMatrix.needsUpdate=cm.instanceMatrix.needsUpdate=true;if(cm.instanceColor)cm.instanceColor.needsUpdate=true;}
/* Sign labels in 3D: one sprite per sign (texture redrawn when text/colour/size change), standing above its posts and always facing the camera */
function v3Signs(){const T=V3T,seen=new Set();V3.signs=V3.signs||new Map();
 for(const id of SIGNS){const list=(V3.M[id]&&V3.M[id].list)||[];for(const e of list){seen.add(e.id);let o=V3.signs.get(e.id);const key=(e.tx||'')+'|'+(e.tc||0)+'|'+e.w;
  if(!o){const c=document.createElement('canvas');c.width=256;c.height=160;const tex=new T3.CanvasTexture(c);const sp=new T3.Sprite(new T3.SpriteMaterial({map:tex,depthWrite:false}));V3.scene.add(sp);o={c,tex,sp,key:null};V3.signs.set(e.id,o);}
  if(o.key!==key){o.key=key;const g=o.c.getContext('2d');g.clearRect(0,0,256,160);drawSign(g,e,0,-48,256);o.tex.needsUpdate=true;}
  const w=e.w,top=V3.M[e.d].label;o.sp.position.set(e.x+w/2,top+w*0.25,e.y+w/2);o.sp.scale.set(w*0.92,w*0.92*160/256,1);o.sp.visible=!!e.tx;}}
 for(const [k,o] of V3.signs)if(!seen.has(k)){V3.scene.remove(o.sp);o.tex.dispose();o.sp.material.dispose();V3.signs.delete(k);}}
function v3Items(){
 const T=V3T,I=V3.items;for(const k in I)I[k].n=0;
 const put=(it,x,y,z,yaw)=>{const s=I[SHAPE[it]||'block']||I.block,ms=s.pool.mesh;if(!ms||s.n>=s.pool.cap)return;T.e.set(0,yaw,0);T.q.setFromEuler(T.e);ms.setMatrixAt(s.n,T.m.compose(T.v.set(x,y,z),T.q,T.s.set(1,1,1)));ms.setColorAt(s.n,V3.icol[it]);s.n++;};
 const cap=V3.L.carry.length;for(const k in I){const p=I[k].pool;if(!p.mesh||p.cap<cap)v3PoolN(p,cap);}
 for(const e of V3.L.carry){
  if(e.k==='belt'){if(!e.item)continue;const [x,y]=itemPos(e,e.prog),[x2,y2]=itemPos(e,Math.min(1,e.prog+0.05));put(e.item,x,0.15,y,Math.atan2(-(y2-y),x2-x));}
  else if(e.k==='router'){if(e.item&&!IT[e.item].f)put(e.item,e.x+0.5,0.44,e.y+0.5,0);}
  else if(e.k==='cross'){if(e.hs&&!IT[e.hs].f)put(e.hs,e.x+0.5,0.24,e.y+0.5,0);if(e.vs&&!IT[e.vs].f)put(e.vs,e.x+0.5,0.24,e.y+0.5,Math.PI/2);}}
 for(const k in I){const ms=I[k].pool.mesh;if(!ms)continue;ms.count=I[k].n;ms.visible=I[k].n>0;ms.instanceMatrix.needsUpdate=true;ms.instanceColor.needsUpdate=true;}
}
function v3Smoke(dt){
 const sm=V3.sm,cx=C3.x,cy=C3.y,R=C3.dist*1.6+20;
 for(const [e,s] of V3.L.emit){const a=e._a3||0;if(a<0.3||sm.p.length>=sm.N)continue;if(Math.abs(e.x-cx)>R||Math.abs(e.y-cy)>R)continue;
  const rate=(s[3]===2?9:4)*a;if(Math.random()<rate*dt){const ox=e.x+e.w/2+s[0],oz=e.y+e.w/2+s[2];
   sm.p.push({x:ox+(Math.random()-0.5)*0.1,y:s[1],z:oz+(Math.random()-0.5)*0.1,vx:0.18+Math.random()*0.15,vy:0.55+Math.random()*0.35,vz:-0.08+Math.random()*0.1,r:(s[3]===2?0.9:0.38)+Math.random()*0.2,t:0,m:s[3]===2?4.5:3,k:s[3]});}}
 let n=0;for(let i=sm.p.length-1;i>=0;i--){const p=sm.p[i];p.t+=dt;if(p.t>p.m){sm.p.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy*=1-dt*0.25;}
 for(const p of sm.p){const f=p.t/p.m;sm.pos[n*3]=p.x;sm.pos[n*3+1]=p.y;sm.pos[n*3+2]=p.z;sm.sz[n]=p.r*(1+f*2.2);sm.al[n]=(1-f)*(f<0.12?f/0.12:1)*(p.k?0.6:0.5);
  const c=p.k?0.94:0.32+f*0.25;sm.col[n*3]=c;sm.col[n*3+1]=c;sm.col[n*3+2]=c*(p.k?1.02:1.03);n++;}
 const g=V3.smoke.geometry;g.setDrawRange(0,n);for(const k of ['position','size','alpha','color'])g.attributes[k].needsUpdate=true;
}
function v3Frame(f,e,on,col){if(!on||!e){f.visible=false;return;}f.visible=true;f.position.set(e.x+e.w/2,0,e.y+e.h/2);f.scale.set(e.w+0.12,1,e.h+0.12);if(col)f.children[0].material.opacity=col;}
function v3Overlay(t){
 const tool=UI.tool,T=V3T;
 V3.grid.visible=!!tool&&C3.dist<70;
 // selection & hover frames
 const sel=UI.sel&&ents.get(UI.sel);v3Frame(V3.selF,sel,!!sel,0.65+0.35*Math.sin(t*5));
 const he=hover&&entAt(hover.x,hover.y);v3Frame(V3.hovF,he,!tool&&he&&(!sel||he.id!==sel.id));
 v3Frame(V3.delF,tool==='del'&&he&&he.k!=='core'?he:null,tool==='del'&&he&&he.k!=='core');
 // ghosts: dragged line preview or building under the mouse
 const gh=[];let tagAt=null,tag='';
 if(linePrev){const n=linePrev.path.length,ok=afford(B[linePrev.id].cost,n);for(const p of linePrev.path){const why=canPlace(linePrev.id,p.x,p.y),bad=why&&!(why==='Blocked'&&entAt(p.x,p.y)&&entAt(p.x,p.y).k===B[linePrev.id].k);gh.push([p.x,p.y,1,0.12,bad||!ok]);}
  const l=linePrev.path[n-1];tagAt=[l.x+0.5,0.6,l.y+0.5];tag=`${n} × ${B[linePrev.id].n}`;V3.tag.classList.toggle('bad',!ok);}
 else if(movePrev&&ents.has(movePrev.e.id)){const m=movePrev,e=m.e;gh.push([m.nx,m.ny,e.w,isLine(e.k)?0.12:Math.min(2.2,(V3.M[e.d]&&V3.M[e.d].h)||1),!m.ok]);}
 else if(hover&&tool&&B[tool]){const d=B[tool],fp=footprint(tool,hover.x,hover.y),why=canPlace(tool,fp.x,fp.y),bad=why&&!(why==='Blocked'&&isLine(d.k)&&entAt(hover.x,hover.y)&&entAt(hover.x,hover.y).k===d.k);
  gh.push([fp.x,fp.y,d.w,isLine(d.k)?0.12:Math.min(2.2,(V3.M[tool]&&V3.M[tool].h)||1),bad]);}
 const gm=v3PoolN(V3.ghost,gh.length);gh.forEach(([x,y,w,h,bad],i)=>{gm.setMatrixAt(i,T.m.compose(T.v.set(x+w/2,h/2+0.01,y+w/2),T.q.identity(),T.s.set(w*0.96,h,w*0.96)));gm.setColorAt(i,T.c.set(bad?'#ff5a46':'#6ef08a'));});
 if(tagAt){const v=T.v.set(...tagAt).project(V3.camera);V3.tag.style.display='block';V3.tag.textContent=tag;V3.tag.style.left=((v.x+1)/2*innerWidth)+'px';V3.tag.style.top=((1-v.y)/2*innerHeight-34)+'px';}else V3.tag.style.display='none';
 // highlighted resource nodes: light beams
 {const hl=hlNodes(),bm=v3PoolN(V3.hlBeam,hl.length),h=6+C3.dist*0.09,w=Math.max(1,C3.dist/90),pu=1+0.15*Math.sin(t*5);hl.forEach((n,i)=>bm.setMatrixAt(i,T.m.compose(T.v.set(n.x+0.5,0,n.y+0.5),T.q.identity(),T.s.set(pu*w,h,pu*w))));}
 // power ranges while placing power things
 const showPw=tool&&B[tool]&&(B[tool].k==='pole'||B[tool].k==='gen'||B[tool].pw),pn=showPw?V3.L.pn:[];
 const rm=v3PoolN(V3.range,pn.length),rf=v3PoolN(V3.rangeFill,pn.length);pn.forEach((p,i)=>{const s=B[p.d].sup;T.m.compose(T.v.set(p.x+p.w/2,0.04,p.y+p.h/2),T.q.identity(),T.s.set(s,1,s));rm.setMatrixAt(i,T.m);rf.setMatrixAt(i,T.m);});
}

/* ---------- camera ---------- */
function v3Clamp(){C3.x=v3cl(C3.x,0,MW);C3.y=v3cl(C3.y,0,MH);C3.dist=v3cl(C3.dist,C3L.dmin,C3L.dmax);C3.pitch=v3cl(C3.pitch,C3L.pmin,C3L.pmax);}
function v3Cam(){const c=V3.camera,h=C3.dist*Math.cos(C3.pitch);c.position.set(C3.x+Math.sin(C3.yaw)*h,C3.dist*Math.sin(C3.pitch),C3.y+Math.cos(C3.yaw)*h);c.lookAt(C3.x,0,C3.y);c.updateMatrixWorld();}
function v3Pick(sx,sy){
 const c=V3.camera,v=new T3.Vector3(sx/innerWidth*2-1,-(sy/innerHeight)*2+1,0.5).unproject(c),o=c.position;v.sub(o).normalize();
 if(v.y>-0.01)return null;const t=-o.y/v.y;const fx=o.x+v.x*t,fy=o.z+v.z*t;return{x:Math.floor(fx),y:Math.floor(fy),fx,fy};
}
function v3Motion(dt){
 if(V3.intro){const I=V3.intro;I.t=Math.min(1,I.t+dt/2.4);const k=easeIO(I.t);C3.pitch=I.p0+(I.p1-I.p0)*k;C3.dist=I.d0+(I.d1-I.d0)*k;if(I.t>=1)V3.intro=null;}
 if(V3.orbit)C3.yaw+=V3.orbit*dt*(V3.intro?easeIO(V3.intro.t):1);
 if(keys.size&&V3.orbit)v3Stop();
 if(C3.go){const k=1-Math.exp(-dt*6),g=C3.go;for(const p of ['x','y','dist','yaw','pitch'])C3[p]+=(g[p]-C3[p])*k;
  if(Math.abs(g.x-C3.x)+Math.abs(g.y-C3.y)+Math.abs(g.dist-C3.dist)*0.1+Math.abs(g.yaw-C3.yaw)+Math.abs(g.pitch-C3.pitch)<0.005)C3.go=null;}
 else if(Math.abs(C3.vx)+Math.abs(C3.vy)>0.02){C3.x+=C3.vx*dt;C3.y+=C3.vy*dt;const f=Math.exp(-dt*4.5);C3.vx*=f;C3.vy*=f;}
 if(keys.size){const sp=C3.dist*0.9*dt,fx=-Math.sin(C3.yaw),fz=-Math.cos(C3.yaw);let f=0,s=0;
  if(keys.has('w')||keys.has('arrowup'))f+=sp;if(keys.has('s')||keys.has('arrowdown'))f-=sp;if(keys.has('d')||keys.has('arrowright'))s+=sp;if(keys.has('a')||keys.has('arrowleft'))s-=sp;
  if(f||s){C3.x+=fx*f-fz*s;C3.y+=fz*f+fx*s;C3.go=null;}
  if(keys.has('e'))C3.yaw+=dt*1.5;if(keys.has('z'))C3.yaw-=dt*1.5;if(keys.has('pageup'))C3.pitch-=dt;if(keys.has('pagedown'))C3.pitch+=dt;}
 v3Clamp();
}

/* ---------- input (mirrors input.js, plus rotate & tilt) ---------- */
function v3Input(){
 const el=V3.cv,P=new Map();let g=null;
 const two=()=>{const [a,b]=[...P.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y),a:Math.atan2(b.y-a.y,b.x-a.x),mx:(a.x+b.x)/2,my:(a.y+b.y)/2};};
 const keep=(g0,sx,sy)=>{if(!g0)return;v3Cam();const p=v3Pick(sx,sy);if(!p)return;const lim=C3.dist*0.6;C3.x+=v3cl(g0.fx-p.fx,-lim,lim);C3.y+=v3cl(g0.fy-p.fy,-lim,lim);v3Clamp();};
 el.addEventListener('contextmenu',e=>e.preventDefault());
 el.addEventListener('pointerdown',e=>{
  el.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});C3.vx=C3.vy=0;C3.go=null;v3Stop();v3Cam();
  if(P.size===2){if(g&&g.lp)clearTimeout(g.lp);if(g&&g.type==='move')movePrev=null;const s=two();g=Object.assign(s,{type:'two',d0:s.d,a0:s.a,my0:s.my,dist0:C3.dist,yaw0:C3.yaw,pitch0:C3.pitch,gm:v3Pick(s.mx,s.my)});linePrev=null;return;}
  if(P.size>2)return;
  const p=v3Pick(e.clientX,e.clientY),base={sx:e.clientX,sy:e.clientY,lt:performance.now(),vx:0,vy:0,g0:p};
  if(e.button===2){g=Object.assign(base,{type:'orbit',yaw0:C3.yaw,pitch0:C3.pitch});return;}
  if(e.button===1){g=Object.assign(base,{type:'pan'});return;}
  g=Object.assign(base,{type:'pending',t0:p});armLongPress(g,p);
 });
 el.addEventListener('pointermove',e=>{
  if(P.has(e.pointerId))P.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!g||g.type!=='two'){v3Cam();const t=v3Pick(e.clientX,e.clientY);if(e.pointerType==='mouse'||g)hover=t;}
  if(!g)return;
  if(g.type==='two'){if(P.size!==2)return;const s=two();
   C3.dist=v3cl(g.dist0*g.d0/Math.max(10,s.d),C3L.dmin,C3L.dmax);C3.yaw=g.yaw0+(s.a-g.a0);C3.pitch=v3cl(g.pitch0+(s.my-g.my0)*0.006,C3L.pmin,C3L.pmax);
   keep(g.gm,s.mx,g.my0);return;}
  const moved=Math.hypot(e.clientX-g.sx,e.clientY-g.sy);
  if(g.type==='move'){dragMove(g,hover);return;}
  if(g.type==='pending'&&moved>(e.pointerType==='mouse'?5:9)){clearTimeout(g.lp);const tool=UI.tool;g.type=tool&&B[tool]&&isLine(B[tool].k)?'line':tool==='del'?'del':'pan';}
  if(g.type==='orbit'){C3.yaw=g.yaw0+(e.clientX-g.sx)*0.008;C3.pitch=v3cl(g.pitch0+(e.clientY-g.sy)*0.006,C3L.pmin,C3L.pmax);return;}
  if(g.type==='pan'){const x0=C3.x,y0=C3.y;keep(g.g0,e.clientX,e.clientY);const now=performance.now(),dt=Math.max(1,now-g.lt)/1000;g.vx=g.vx*0.5+(C3.x-x0)/dt*0.5;g.vy=g.vy*0.5+(C3.y-y0)/dt*0.5;g.lt=now;}
  else if(g.type==='line'){if(hover&&g.t0)linePrev={id:UI.tool,path:linePath(g.t0,hover,UI.rot)};}
  else if(g.type==='del'){const x=hover&&entAt(hover.x,hover.y);if(x&&(isLine(x.k)||x.k==='router'||x.k==='cross'||x.k==='pole')){removeEnt(x,true);refreshTools();}}
 });
 const end=e=>{
  P.delete(e.pointerId);if(!g)return;
  if(g.type==='two'){g=P.size?{type:'dead'}:null;return;}
  clearTimeout(g.lp);
  if(g.type==='move')dropMove();
  else if(g.type==='pending'&&g.t0)tap(g.t0);
  else if(g.type==='line'&&linePrev){buildPath(linePrev.id,linePrev.path);linePrev=null;}
  else if(g.type==='pan'&&performance.now()-g.lt<70){const sp=Math.hypot(g.vx,g.vy),mx=C3.dist*3;const k=sp>mx?mx/sp:1;C3.vx=g.vx*k;C3.vy=g.vy*k;}
  if(!P.size)g=null;if(e.pointerType!=='mouse')hover=null;
 };
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',e=>{P.delete(e.pointerId);g=null;linePrev=null;});
 el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!g)hover=null;});
 el.addEventListener('wheel',e=>{e.preventDefault();C3.go=null;C3.vx=C3.vy=0;v3Stop();v3Cam();const g0=v3Pick(e.clientX,e.clientY);const dy=e.deltaMode===1?e.deltaY*30:e.deltaY;
  if(e.ctrlKey){C3.pitch=v3cl(C3.pitch+dy*0.004,C3L.pmin,C3L.pmax);return;}
  C3.dist=v3cl(C3.dist*Math.exp(dy*0.0016),C3L.dmin,C3L.dmax);keep(g0,e.clientX,e.clientY);},{passive:false});
}

/* ---------- frame ---------- */
function render3D(el){
 if(!V3.ready)return;
 const t=animT;
 if(V3.mapGen!==mapGen)v3Terrain();
 v3Motion(el);v3Cam();
 const sig=v3Sig();if(sig!==V3.sig){V3.sig=sig;v3Layout();}else if(v3TripSig()!==V3.trip)v3Layout();
 for(const p of parts)if(V3.sm.p.length<V3.sm.N)V3.sm.p.push({x:p.x,y:0.3,z:p.y,vx:p.vx*0.5,vy:0.6+Math.random()*0.4,vz:p.vy*0.5,r:0.35,t:0,m:1.2,k:1});parts.length=0;
 v3Anim(el,t);v3Items();v3Smoke(el);v3Drones();v3Signs();v3Overlay(t);
 // sun & shadows follow the view; fog keeps the horizon soft
 const s=v3cl(C3.dist*0.8,12,70),sun=V3.sun;sun.position.set(C3.x-40,70,C3.y-28);sun.target.position.set(C3.x,0,C3.y);
 const sc=sun.shadow.camera;if(sc.right!==s){sc.left=-s;sc.right=s;sc.top=s;sc.bottom=-s;sc.near=10;sc.far=220;sc.updateProjectionMatrix();}
 const cm=V3.camera,nr=Math.max(0.3,C3.dist*0.02),fr=Math.max(1400,C3.dist*3+700);if(cm.near!==nr||cm.far!==fr){cm.near=nr;cm.far=fr;cm.updateProjectionMatrix();}
 V3.sky.position.copy(V3.camera.position);V3.sky.scale.setScalar(fr/1500);
 V3.scene.fog.near=C3.dist*1.4+10;V3.scene.fog.far=C3.dist*4.5+80;
 V3.smU.scale.value=V3.r.domElement.height/(2*Math.tan(22.5*Math.PI/180));
 v3Chunks();v3Decor();
 V3.r.render(V3.scene,V3.camera);
 // suggest low quality if the phone struggles
 V3.fps=V3.fps*0.95+(1/Math.max(0.001,el))*0.05;
 if(V3.q==='high'&&!V3.warned&&V3.fps<24){V3.slowT+=el;if(V3.slowT>6){V3.warned=true;toast('3D is running slowly. Try ☰ Menu → 3D quality: Low');}}else V3.slowT=0;
 const n=$('fNorth');if(n)n.firstElementChild.style.transform=`rotate(${-C3.yaw}rad)`;
}
/* actions & hooks */
Object.assign(ACT,{
 toggle3d:()=>setView3D(!V3.on),
 view:v=>setView3D(v==='3d'),
 look3:v=>{V3.look=v==='classic'?'classic':'nice';v3Look();v3Save();renderPanel(true);toast((V3.look==='nice'?'3D look: Enhanced':'3D look: Classic (faster)'));},
 q3:v=>{V3.q=v==='low'?'low':'high';V3.warned=false;v3Quality();v3Save();renderPanel(true);},
 north3d:()=>{if(V3.on)v3Stop(),v3Go({yaw:Math.round(C3.yaw/(2*Math.PI))*2*Math.PI,pitch:0.95});},
});
{const home2d=ACT.home;ACT.home=()=>{if(V3.on)v3Go({x:MW/2,y:MH/2,dist:28});else home2d();};}
