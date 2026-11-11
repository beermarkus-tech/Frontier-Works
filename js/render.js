'use strict';
/* ================= RENDER ================= */
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let DPR=1,cam={x:MW/2,y:MH/2,z:1.2},camT={x:MW/2,y:MH/2,z:1.2},vel={x:0,y:0},zAnchor=null,hover=null,linePrev=null,animT=0,fdt=0.016,cloudC=null;
const parts=[];
function setCam(c){cam=c;camT={x:c.x,y:c.y,z:c.z};vel={x:0,y:0};zAnchor=null;}
/* Canvas resolution: full device sharpness (max 2×) normally; 1× when zoomed far out, where detail is too small to see.
   That's a quarter of the pixels on 2× screens, which matters most on tablets (big screens, ~35 ground chunks visible). Hysteresis avoids flapping. */
let lowRes=false;
const fullDPR=()=>Math.min(2,window.devicePixelRatio||1);
function wantLow(){const z=TS*cam.z;return fullDPR()>1&&(lowRes?z<13:z<11);}
function resize(){lowRes=wantLow();DPR=lowRes?1:fullDPR();cv.width=Math.round(innerWidth*DPR);cv.height=Math.round(innerHeight*DPR);if(typeof LODC!=='undefined')LODC.c=null;if(typeof layoutVars==='function')layoutVars();}
addEventListener('resize',resize);
function rrg(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function rr(x,y,w,h,r){rrg(ctx,x,y,w,h,r);}
function shade(hex,a){const n=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,v+a));return`rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;}
function rgba(hex,al){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16},${(n>>8)&255},${n&255},${al})`;}
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function hash2(x,y){let h=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
const easeBack=t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

/* ---------- terrain bake ---------- */
const TPX=16;
/* Terrain is painted on demand in CH×CH-tile chunks at TPX px/tile (a whole 384-tile map would be too big for one
   canvas on phones), plus one small overview picture (terrO) for zoomed-out views, the minimap and far 3D ground.
   Per-tile fields are prepared once per map; every random choice is hashed from the tile, so chunks match at edges. */
const CH=32,CHMAX=48,chunkC=new Map();let TF=null,terrO=null,mapGen=0;
const PALK=['ga','gb','gc','sa','ra','rb','sh','dp'];
function prepTerrain(seed){
 mapGen++;chunkC.clear();
 const r=rng((seed^0x5bd1e995)>>>0),nA=mkNoise(r,11),nB=mkNoise(r,3.5),nW=mkNoise(r,1.3);
 const T=MW*MH,dist=new Int16Array(T).fill(999),q=[];
 for(let i=0;i<T;i++)if(terr[i]!==1){dist[i]=0;q.push(i);}
 for(let h=0;h<q.length;h++){const i=q[h],x=i%MW,y=(i/MW)|0;for(let k=0;k<4;k++){const nx=x+DX[k],ny=y+DY[k];if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const j=ny*MW+nx;if(dist[j]>dist[i]+1){dist[j]=dist[i]+1;q.push(j);}}}
 const Wf=new Float32Array(T),Sf=new Float32Array(T),Rf=new Float32Array(T),Df=new Float32Array(T),Gf=new Float32Array(T);
 for(let i=0;i<T;i++){const x=i%MW,y=(i/MW)|0,t=terr[i];Wf[i]=t===1?1:0;Sf[i]=t===2?1:0;Rf[i]=t===3?1:0;Df[i]=Math.min(1,Math.max(0,(dist[i]-1)/5));Gf[i]=nA(x,y)*0.65+nB(x,y)*0.35;}
 // per-tile ground palette, blurred so biome borders fade over a few tiles; U[i]=1 where the 2×2 block is uniform (fast path)
 const PAL=new Uint8ClampedArray(T*24),U=new Uint8Array(T);let mixed=false;for(let i=1;i<T;i++)if(bio[i]!==bio[0]){mixed=true;break;}
 for(let k=0;k<8;k++)for(let c=0;c<3;c++){const a=new Float32Array(T);for(let i=0;i<T;i++)a[i]=BIOMES[bio[i]].pal[PALK[k]][c];const bl=mixed?boxBlur(a,MW,MH,3):a;for(let i=0;i<T;i++)PAL[i*24+k*3+c]=Math.round(bl[i]);}
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=y*MW+x,b=Math.min(MW-1,x+1)-x,d=(Math.min(MH-1,y+1)-y)*MW;let u=1;for(let k=0;k<24&&u;k++){const v=PAL[i*24+k];if(PAL[(i+b)*24+k]!==v||PAL[(i+d)*24+k]!==v||PAL[(i+b+d)*24+k]!==v)u=0;}U[i]=u;}
 TF={seed,nW,Wf,Sf,Rf,Df,Gf,PAL,U};
 const op=MW>200?3:4;terrO=paintTerrain(0,0,MW,MH,op);terrO.ppt=op;terrC=terrO;
 // cloud shadows
 // cloud shadows: tileable noise (wraps at 128 px), so the repeated picture has no seam that slides across the map
 const tn=(r,g)=>{const v=[];for(let i=0;i<g*g;i++)v.push(r());const sm=t=>t*t*(3-2*t);return(x,y)=>{const fx=x/128*g,fy=y/128*g,ix=Math.floor(fx),iy=Math.floor(fy),tx=sm(fx-ix),ty=sm(fy-iy),x0=ix%g,x1=(ix+1)%g,y0=iy%g,y1=(iy+1)%g,a=v[y0*g+x0],b=v[y0*g+x1],c=v[y1*g+x0],d=v[y1*g+x1];return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;};};
 const cn=tn(rng(seed+99),9),cn2=tn(rng(seed+7),24);cloudC=document.createElement('canvas');cloudC.width=cloudC.height=128;const cg=cloudC.getContext('2d'),ci=cg.createImageData(128,128);
 for(let i=0;i<128*128;i++){const x=i%128,y=(i/128)|0;const v=cn(x,y)*0.75+cn2(x,y)*0.25;ci.data[i*4+3]=sstep(0.55,0.78,v)*60;}
 cg.putImageData(ci,0,0);
}
/* Paint tiles [x0,x0+w)×[y0,y0+h) at ppt pixels per tile. Same blend as the original single-canvas painter. */
function paintTerrain(x0,y0,w,h,ppt){
 const {nW,Wf,Sf,Rf,Df,Gf,PAL,U}=TF,Wp=w*ppt,Hp=h*ppt,img=new ImageData(Wp,Hp),D=img.data,k16=TPX/ppt,P=new Float32Array(24),WS=[146,128,92],FO=[230,244,250];
 let c0,c1,c2;
 for(let py=0;py<Hp;py++){const gpy=y0*ppt+py,fy=(gpy+0.5)/ppt-0.5,iy=Math.floor(fy),ty=fy-iy,y0r=Math.max(0,iy)*MW,y1r=Math.min(MH-1,iy+1)*MW;
  for(let px=0;px<Wp;px++){const gpx=x0*ppt+px,fx=(gpx+0.5)/ppt-0.5,ix=Math.floor(fx),tx=fx-ix,x0c=Math.max(0,ix),x1c=Math.min(MW-1,ix+1);
   const a=y0r+x0c,b=y0r+x1c,cc=y1r+x0c,d=y1r+x1c,w00=(1-tx)*(1-ty),w10=tx*(1-ty),w01=(1-tx)*ty,w11=tx*ty;
   if(U[a]){const o=a*24;for(let k=0;k<24;k++)P[k]=PAL[o+k];}
   else{const oa=a*24,ob=b*24,oc=cc*24,od=d*24;for(let k=0;k<24;k++)P[k]=PAL[oa+k]*w00+PAL[ob+k]*w10+PAL[oc+k]*w01+PAL[od+k]*w11;}
   const gn=Gf[a]*w00+Gf[b]*w10+Gf[cc]*w01+Gf[d]*w11,gr=hash2(Math.floor(gpx*k16),Math.floor(gpy*k16))-0.5;
   if(gn<0.5){const t=gn*2;c0=P[0]+(P[3]-P[0])*t;c1=P[1]+(P[4]-P[1])*t;c2=P[2]+(P[5]-P[2])*t;}
   else{const t=(gn-0.5)*2;c0=P[3]+(P[6]-P[3])*t;c1=P[4]+(P[7]-P[4])*t;c2=P[5]+(P[8]-P[5])*t;}
   const wp=(nW(fx+0.5,fy+0.5)-0.5)*0.24,wv=Wf[a]*w00+Wf[b]*w10+Wf[cc]*w01+Wf[d]*w11+wp,sd=Sf[a]*w00+Sf[b]*w10+Sf[cc]*w01+Sf[d]*w11,rk=Rf[a]*w00+Rf[b]*w10+Rf[cc]*w01+Rf[d]*w11;
   let t=Math.max(sstep(0.2,0.55,sd),sstep(0.24,0.44,wv));
   if(t>0){c0+=(P[9]-c0)*t;c1+=(P[10]-c1)*t;c2+=(P[11]-c2)*t;}
   if(rk>0.2){t=sstep(0.36,0.62,rk+wp*1.3+(hash2(Math.floor(gpx*k16)>>2,Math.floor(gpy*k16)>>2)-0.5)*0.1);if(t>0){const o=gr>0?12:15;c0+=(P[o]-c0)*t;c1+=(P[o+1]-c1)*t;c2+=(P[o+2]-c2)*t;}}
   t=sstep(0.4,0.5,wv)*0.7;if(t>0){c0+=(WS[0]-c0)*t;c1+=(WS[1]-c1)*t;c2+=(WS[2]-c2)*t;}
   const wa=sstep(0.485,0.515,wv);
   if(wa>0){const dp=sstep(0,1,Df[a]*w00+Df[b]*w10+Df[cc]*w01+Df[d]*w11);let r0=P[18]+(P[21]-P[18])*dp,r1=P[19]+(P[22]-P[19])*dp,r2=P[20]+(P[23]-P[20])*dp;
    const fo=sstep(0.5,0.55,wv)*(1-sstep(0.56,0.7,wv))*0.6;r0+=(FO[0]-r0)*fo;r1+=(FO[1]-r1)*fo;r2+=(FO[2]-r2)*fo;
    c0+=(r0-c0)*wa;c1+=(r1-c1)*wa;c2+=(r2-c2)*wa;}
   const gv=gr*9*(1-wa*0.7),o=(py*Wp+px)*4;D[o]=c0+gv;D[o+1]=c1+gv;D[o+2]=c2+gv;D[o+3]=255;}}
 const cv2=document.createElement('canvas');cv2.width=Wp;cv2.height=Hp;cv2.getContext('2d').putImageData(img,0,0);return cv2;
}
/* Full-detail chunk: ground + painted details (grass tufts, flowers, stones, specks) + soil beds under nodes. */
function bakeChunk(cx,cy){
 const x0=cx*CH,y0=cy*CH,c=paintTerrain(x0,y0,CH,CH,TPX),g=c.getContext('2d');g.translate(-x0*TPX,-y0*TPX);
 const seed=TF.seed,paths=new Map(),P=(k)=>{if(!paths.has(k))paths.set(k,new Path2D());return paths.get(k);};
 const stone=(r,x,y,rad,base)=>{g.fillStyle='rgba(0,0,0,0.3)';g.beginPath();g.ellipse(x+1.2,y+1.6,rad*1.1,rad*0.8,0,0,7);g.fill();const gr=g.createRadialGradient(x-rad*0.4,y-rad*0.4,0,x,y,rad*1.2);gr.addColorStop(0,shade(base,40));gr.addColorStop(1,shade(base,-30));g.fillStyle=gr;g.beginPath();g.ellipse(x,y,rad*1.1,rad*0.85,r()*3,0,7);g.fill();};
 const FL=['#f6e27a','#f59ac0','#ffffff','#b7d0ff','#ffb36b'],dots=[];
 for(let y=Math.max(0,y0-1);y<Math.min(MH,y0+CH+1);y++)for(let x=Math.max(0,x0-1);x<Math.min(MW,x0+CH+1);x++){const i=y*MW+x;if(nodeAt[i])continue;
  const t=terr[i],bm=BIOMES[bio[i]].d2,r=rng((Math.imul(seed,31)+Math.imul(i,2654435761))>>>0),X=x*TPX,Y=y*TPX;
  if(t===0&&bm.tuft){const n=2+Math.floor(r()*3);for(let k=0;k<n;k++){const px=X+r()*TPX,py=Y+r()*TPX,l=2+r()*3.5,p=P(bm.tuft[r()<0.55?0:1]);p.moveTo(px,py);p.lineTo(px-1.6,py-l);p.moveTo(px,py);p.lineTo(px+1.4,py-l*0.85);p.moveTo(px,py);p.lineTo(px,py-l*1.1);}}
  if(t===0&&r()<bm.flower){const col=FL[Math.floor(r()*FL.length)];for(let k=0;k<3;k++)dots.push([col,X+r()*TPX,Y+r()*TPX,1.4]);}
  if(bm.speck&&t!==1&&r()<bm.speck[1]*3)dots.push([bm.speck[0],X+r()*TPX,Y+r()*TPX,0.8+r()*0.8]);
  if(t===3){if(r()<0.28)stone(r,X+3+r()*(TPX-6),Y+3+r()*(TPX-6),2+r()*3,bm.rock);}
  else if(t===0&&r()<bm.stone)stone(r,X+TPX/2,Y+TPX/2,3+r()*3,shade(bm.rock,-8));
  else if(t===2&&r()<0.6){const col=bm.sand||'rgba(120,100,70,0.45)';for(let k=0;k<3;k++)dots.push([col,X+r()*TPX,Y+r()*TPX,0.9]);}}
 g.lineCap='round';g.lineWidth=1.1;for(const [k,p] of paths){g.strokeStyle=k;g.stroke(p);}
 for(const [col,x,y,rad] of dots){g.fillStyle=col;g.beginPath();g.arc(x,y,rad,0,7);g.fill();}
 for(const n of nodes){if(n.x<x0-2||n.y<y0-2||n.x>x0+CH+1||n.y>y0+CH+1)continue;const x=(n.x+0.5)*TPX,y=(n.y+0.5)*TPX;const gr=g.createRadialGradient(x,y,2,x,y,TPX*1.25);gr.addColorStop(0,'rgba(40,30,20,0.55)');gr.addColorStop(1,'rgba(40,30,20,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,TPX*1.25,0,7);g.fill();}
 return c;
}
/* Cached chunk canvas (LRU). bake=false returns null instead of painting a missing chunk. */
function getChunk(cx,cy,bake){const key=cy*1024+cx;let c=chunkC.get(key);
 if(c){chunkC.delete(key);chunkC.set(key,c);return c;}
 if(!bake)return null;c=bakeChunk(cx,cy);chunkC.set(key,c);while(chunkC.size>CHMAX)chunkC.delete(chunkC.keys().next().value);return c;}
/* Smaller copies of a chunk for far zoom, so the browser doesn't shrink 512 px every frame */
function chunkMip(c,px){if(px>c.width*0.6)return c;const lvl=px>c.width*0.3?1:2,k='_m'+lvl;if(!c[k]){const m=document.createElement('canvas');m.width=m.height=c.width>>lvl;const g=m.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(c,0,0,m.width,m.height);c[k]=m;}return c[k];}
let bakeT0=0;const bakeBudget=()=>performance.now()-bakeT0<8;   // ms of chunk painting allowed per frame
function drawTerrain(ox,oy,s,W,H){
 const op=terrO.ppt;bakeT0=performance.now();
 if(s<=4.5){ctx.drawImage(terrO,ox,oy,MW*s,MH*s);return;}
 const nx=MW/CH,ny=MH/CH,cx0=Math.max(0,Math.floor(-ox/s/CH)),cx1=Math.min(nx-1,Math.floor((W-ox)/s/CH)),cy0=Math.max(0,Math.floor(-oy/s/CH)),cy1=Math.min(ny-1,Math.floor((H-oy)/s/CH));
 // nearest chunks first, so the view sharpens from the middle out
 const list=[];for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++)list.push([cx,cy,Math.hypot(ox+(cx+0.5)*CH*s-W/2,oy+(cy+0.5)*CH*s-H/2)]);list.sort((a,b)=>a[2]-b[2]);
 for(const [cx,cy] of list){const c=getChunk(cx,cy,bakeBudget()),X0=Math.floor(ox+cx*CH*s),X1=Math.floor(ox+(cx+1)*CH*s),Y0=Math.floor(oy+cy*CH*s),Y1=Math.floor(oy+(cy+1)*CH*s);
  if(c)ctx.drawImage(chunkMip(c,X1-X0),X0,Y0,X1-X0,Y1-Y0);else ctx.drawImage(terrO,cx*CH*op,cy*CH*op,CH*op,CH*op,X0,Y0,X1-X0,Y1-Y0);}
}
const SPR=new Map();
function bkt(s){return Math.max(6,Math.min(180,Math.pow(2,Math.round(Math.log2(s)*3)/3)));}
function getSprite(id,s){const b=bkt(s),key=id+'|'+b;let c=SPR.get(key);if(c)return c;const w=B[id].w,pad=Math.ceil(b*0.35);
 c=document.createElement('canvas');c.width=c.height=Math.ceil(w*b+pad*2);const g=c.getContext('2d');g.translate(pad,pad);paintB(g,id,w*b,b);c.pad=pad;c.b=b;SPR.set(key,c);if(SPR.size>500)SPR.delete(SPR.keys().next().value);return c;}
function blit(id,X,Y,s,alpha){const c=getSprite(id,s),k=s/c.b;if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(c,X-c.pad*k,Y-c.pad*k,c.width*k,c.height*k);ctx.globalAlpha=1;}
function paintB(g,id,P,u){
 const d=B[id],col=d.col,lw=Math.max(1,u*0.045);
 const R=(x,y,w,h,r)=>rrg(g,x,y,w,h,r);
 const lin=(y,h,c,hi,lo)=>{const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,shade(c,hi===undefined?36:hi));gr.addColorStop(0.5,c);gr.addColorStop(1,shade(c,lo===undefined?-42:lo));return gr;};
 const box=(x,y,w,h,r,c)=>{g.fillStyle=lin(y,h,c);R(x,y,w,h,r);g.fill();g.lineWidth=lw;g.strokeStyle='rgba(0,0,0,0.55)';g.stroke();g.strokeStyle='rgba(255,255,255,0.17)';R(x+lw*1.4,y+lw*1.4,w-lw*2.8,h-lw*2.8,Math.max(0,r-lw*1.4));g.stroke();};
 const circ=(x,y,r,c,hl)=>{const gr=g.createRadialGradient(x-r*0.35,y-r*0.4,r*0.08,x,y,r);gr.addColorStop(0,shade(c,hl===undefined?55:hl));gr.addColorStop(1,shade(c,-48));g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.lineWidth=lw;g.strokeStyle='rgba(0,0,0,0.55)';g.stroke();};
 const hole=(x,y,r)=>{const gr=g.createRadialGradient(x,y-r*0.3,0,x,y,r);gr.addColorStop(0,'#05070a');gr.addColorStop(1,'#2b323b');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle='rgba(255,255,255,0.14)';g.lineWidth=lw;g.stroke();};
 const dots=(pts,r,c)=>{g.fillStyle=c;for(const [a,b] of pts){g.beginPath();g.arc(a,b,r,0,7);g.fill();}};
 const vents=(x,y,w,n)=>{g.strokeStyle='rgba(0,0,0,0.45)';g.lineWidth=Math.max(1,u*0.05);for(let k=0;k<n;k++){const yy=y+k*u*0.12;g.beginPath();g.moveTo(x,yy);g.lineTo(x+w,yy);g.stroke();}};
 const pipe=(x1,y1,x2,y2,wd,c)=>{g.lineCap='round';g.strokeStyle='rgba(0,0,0,0.5)';g.lineWidth=wd+lw*2;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.strokeStyle=c;g.lineWidth=wd;g.stroke();g.strokeStyle='rgba(255,255,255,0.28)';g.lineWidth=wd*0.3;g.stroke();g.lineCap='butt';};
 // ground shadow
 g.fillStyle='rgba(0,0,0,0.34)';R(u*0.16,u*0.24,P-u*0.12,P-u*0.14,u*0.28);g.fill();
 const m=u*0.06;
 if(id==='core'){
  const C=P/2,hx=(rad,fill,stroke)=>{g.beginPath();for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3;g[k?'lineTo':'moveTo'](C+Math.cos(a)*rad,C+Math.sin(a)*rad);}g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}};
  hx(P*0.5,lin(0,P,'#6a5428',30,-30),'rgba(0,0,0,0.6)');hx(P*0.44,lin(0,P,'#c99a3c',40,-40),'rgba(0,0,0,0.4)');hx(P*0.34,lin(0,P,'#3a3f46',20,-20),'rgba(255,255,255,0.15)');
  for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3;dots([[C+Math.cos(a)*P*0.39,C+Math.sin(a)*P*0.39]],u*0.07,'#f6d27a');}
  circ(C,C,P*0.19,'#d8dde2',60);circ(C,C,P*0.1,'#ffb547',70);
  return;}
 const base=d.k==='gen'||d.k==='mach'||d.k==='drill'||d.k==='pump'||d.k==='incin'?'#444d57':'#3c444d';
 box(m,m,P-2*m,P-2*m,u*0.2,base);
 dots([[m+u*0.17,m+u*0.17],[P-m-u*0.17,m+u*0.17],[m+u*0.17,P-m-u*0.17],[P-m-u*0.17,P-m-u*0.17]],Math.max(0.7,u*0.045),'rgba(255,255,255,0.35)');
 const i=u*0.27,W=P-2*i;
 switch(id){
  case 'drill1':case 'drill2':case 'drill3':{
   box(i,i,W,W,u*0.16,col);
   g.save();R(i+u*0.12,P-i-u*0.3,W-u*0.24,u*0.2,u*0.05);g.clip();g.fillStyle='#1d1d1d';g.fillRect(0,0,P,P);g.fillStyle='#f2c230';for(let x=-u;x<P+u;x+=u*0.28){g.beginPath();g.moveTo(x,P);g.lineTo(x+u*0.14,P);g.lineTo(x+u*0.64,P-u*1.2);g.lineTo(x+u*0.5,P-u*1.2);g.fill();}g.restore();
   circ(P/2,P*0.45,P*0.27,'#5c636c');hole(P/2,P*0.45,P*0.19);
   if(id!=='drill1')dots([[i+u*0.2,i+u*0.2],[P-i-u*0.2,i+u*0.2]],u*0.07,id==='drill3'?'#7fe3ff':'#ffe27a');
   break;}
  case 'wpump':box(i,i,W,W,u*0.16,col);pipe(P*0.5,P*0.5,P*0.5,P-i,u*0.22,'#8fb6d9');circ(P/2,P*0.42,P*0.24,'#6c8fae');hole(P/2,P*0.42,P*0.15);break;
  case 'opump':box(i,i,W,W,u*0.16,col);g.fillStyle='#22202a';R(P*0.2,P*0.66,P*0.6,P*0.12,u*0.05);g.fill();circ(P*0.5,P*0.42,P*0.24,'#77708a');hole(P*0.5,P*0.42,P*0.13);break;
  case 'smelter':{
   box(i,i,W,W,u*0.18,col);
   g.save();R(i,i,W,W,u*0.18);g.clip();g.strokeStyle='rgba(0,0,0,0.22)';g.lineWidth=Math.max(1,u*0.04);const bh=u*0.2;
   for(let y=i,row=0;y<P-i;y+=bh,row++){g.beginPath();g.moveTo(i,y);g.lineTo(P-i,y);g.stroke();for(let x=i+(row%2)*u*0.2;x<P-i;x+=u*0.4){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+bh);g.stroke();}}g.restore();
   g.fillStyle='#160c07';R(P*0.28,P*0.56,P*0.44,P*0.22,u*0.12);g.fill();g.strokeStyle='rgba(0,0,0,0.6)';g.lineWidth=lw;g.stroke();
   circ(P*0.74,P*0.28,u*0.26,'#5a5a5a');hole(P*0.74,P*0.28,u*0.15);break;}
  case 'press':box(i,i,W,W,u*0.16,col);vents(i+u*0.2,i+u*0.15,W-u*0.4,2);box(P*0.27,P*0.3,P*0.46,P*0.46,u*0.1,'#2d343c');dots([[P*0.33,P*0.36],[P*0.67,P*0.36],[P*0.33,P*0.7],[P*0.67,P*0.7]],u*0.05,'#9aa4ae');break;
  case 'assembler':box(i,i,W,W,u*0.18,col);box(P*0.2,P*0.55,P*0.6,P*0.25,u*0.08,'#2e3a3a');box(P*0.18,P*0.2,P*0.22,P*0.22,u*0.06,'#5a6a6a');box(P*0.6,P*0.2,P*0.22,P*0.22,u*0.06,'#5a6a6a');circ(P*0.5,P*0.45,u*0.32,'#c8ced4');break;
  case 'foundry':box(i,i,W,W,u*0.18,col);vents(i+u*0.25,P-i-u*0.5,W-u*0.5,3);circ(P*0.36,P*0.42,u*0.48,'#3c3c3c',30);hole(P*0.36,P*0.42,u*0.32);circ(P*0.64,P*0.42,u*0.48,'#3c3c3c',30);hole(P*0.64,P*0.42,u*0.32);circ(P*0.8,P*0.2,u*0.2,'#5a5a5a');hole(P*0.8,P*0.2,u*0.11);break;
  case 'refinery':box(i,i,W,W,u*0.18,col);pipe(P*0.3,P*0.32,P*0.7,P*0.45,u*0.14,'#a0a8b0');pipe(P*0.3,P*0.7,P*0.7,P*0.45,u*0.14,'#a0a8b0');circ(P*0.3,P*0.32,u*0.42,'#c4ccd4');circ(P*0.3,P*0.7,u*0.42,'#c4ccd4');circ(P*0.7,P*0.45,u*0.6,'#9ba3ab');circ(P*0.7,P*0.45,u*0.3,'#7d858d');break;
  case 'fabricator':box(i,i,W,W,u*0.2,col);g.fillStyle='#1d2228';R(P*0.14,P*0.44,P*0.72,P*0.18,u*0.05);g.fill();g.strokeStyle='rgba(255,255,255,0.12)';g.lineWidth=Math.max(1,u*0.04);for(let x=P*0.16;x<P*0.85;x+=u*0.22){g.beginPath();g.moveTo(x,P*0.45);g.lineTo(x,P*0.61);g.stroke();}
   for(const [a,b] of [[0.3,0.3],[0.7,0.3],[0.3,0.76],[0.7,0.76]])circ(P*a,P*b,u*0.24,'#c8d0d8');box(P*0.42,P*0.15,P*0.16,P*0.08,u*0.03,'#0e1a26');break;
  case 'blender':box(i,i,W,W,u*0.18,col);circ(P/2,P/2,P*0.31,'#aab6be');hole(P/2,P/2,P*0.23);pipe(P*0.2,P*0.2,P*0.32,P*0.32,u*0.12,'#8fd0c8');break;
  case 'burner':box(i,i,W,W,u*0.16,col);g.fillStyle='#120a06';R(P*0.24,P*0.48,P*0.52,P*0.3,u*0.08);g.fill();g.strokeStyle='#4a3a30';g.lineWidth=Math.max(1,u*0.06);for(let x=P*0.3;x<P*0.74;x+=u*0.18){g.beginPath();g.moveTo(x,P*0.5);g.lineTo(x,P*0.76);g.stroke();}circ(P*0.72,P*0.28,u*0.22,'#5a5a5a');hole(P*0.72,P*0.28,u*0.12);break;
  case 'steam':box(i,i,W,W,u*0.18,col);circ(P*0.42,P*0.54,P*0.27,'#7a8189');hole(P*0.42,P*0.54,P*0.2);circ(P*0.8,P*0.22,u*0.26,'#9aa0a6');hole(P*0.8,P*0.22,u*0.15);pipe(P*0.66,P*0.54,P*0.84,P*0.54,u*0.14,'#c0c6cc');break;
  case 'turbine':box(i,i,W,W,u*0.18,col);{const gr=g.createLinearGradient(0,P*0.34,0,P*0.66);gr.addColorStop(0,'#d8dde2');gr.addColorStop(0.5,'#8a9198');gr.addColorStop(1,'#4a5056');g.fillStyle=gr;R(P*0.16,P*0.34,P*0.7,P*0.32,P*0.16);g.fill();g.strokeStyle='rgba(0,0,0,0.5)';g.lineWidth=lw;g.stroke();}hole(P*0.3,P*0.5,P*0.13);g.fillStyle='#2a2a2a';R(P*0.78,P*0.4,P*0.08,P*0.2,u*0.04);g.fill();break;
  case 'reactor':box(i,i,W,W,u*0.2,col);box(P*0.68,P*0.2,P*0.18,P*0.6,u*0.08,'#5a6a5a');circ(P*0.4,P*0.46,P*0.31,'#cfcabc',25);hole(P*0.4,P*0.46,P*0.21);
   g.fillStyle='#f2c230';g.beginPath();g.arc(P*0.77,P*0.72,u*0.13,0,7);g.fill();break;
  case 'sign1':case 'sign2':case 'sign3':case 'sign4':case 'sign5':{box(i,i,W,W,u*0.1,col);g.fillStyle='#3a3226';const lh=W*0.12;for(let k=0;k<3;k++)g.fillRect(i+W*0.18,i+W*(0.28+k*0.2),W*(k===2?0.4:0.64),lh);break;}   // toolbar icon only; placed signs are drawn live
  case 'dpad':{box(i,i,W,W,u*0.16,'#2c333b');g.strokeStyle=col;g.lineWidth=Math.max(1.5,u*0.12);g.beginPath();g.arc(P/2,P/2,W*0.34,0,7);g.stroke();
   g.strokeStyle=shade(col,-25);g.lineWidth=Math.max(1,u*0.06);g.beginPath();g.moveTo(P/2-W*0.18,P/2);g.lineTo(P/2+W*0.18,P/2);g.moveTo(P/2,P/2-W*0.18);g.lineTo(P/2,P/2+W*0.18);g.stroke();
   dots([[i+u*0.3,i+u*0.3],[P-i-u*0.3,i+u*0.3],[i+u*0.3,P-i-u*0.3],[P-i-u*0.3,P-i-u*0.3]],u*0.1,'#ffd36a');break;}
  case 'storage':{box(i,i,W,W,u*0.12,'#8a6a42');g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=Math.max(1,u*0.05);for(let y=i+W/4;y<P-i;y+=W/4){g.beginPath();g.moveTo(i,y);g.lineTo(P-i,y);g.stroke();}
   g.strokeStyle='#5a4228';g.lineWidth=Math.max(1.5,u*0.1);g.beginPath();g.moveTo(i+u*0.1,i+u*0.1);g.lineTo(P-i-u*0.1,P-i-u*0.1);g.moveTo(P-i-u*0.1,i+u*0.1);g.lineTo(i+u*0.1,P-i-u*0.1);g.stroke();break;}
  case 'tank':circ(P/2,P/2,P*0.38,'#9ab0c6',40);g.fillStyle='#10161c';g.beginPath();g.arc(P/2,P/2,P*0.29,0,7);g.fill();break;
  case 'incin':box(i,i,W,W,u*0.12,col);g.fillStyle=shade(col,-35);g.fillRect(i+W*0.08,i+W*0.08,W*0.84,W*0.84);g.fillStyle='#140806';g.beginPath();g.arc(P/2,P/2,W*0.32,0,7);g.fill();
   g.strokeStyle='#5a2a1c';g.lineWidth=Math.max(1,W*0.04);for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(P/2+k*W*0.11,P/2-W*0.28);g.lineTo(P/2+k*W*0.11,P/2+W*0.28);g.stroke();}
   g.fillStyle='#575c63';g.beginPath();g.arc(i+W*0.85,i+W*0.15,W*0.08,0,7);g.fill();break;
  default:box(i,i,W,W,u*0.16,col);
 }
}
function bStatus(e){
 if(e.k==='dpad'){const tg=padTarget(e);if(!tg)return null;if(e.want&&!e.pw)return['#ff5a46','No power'];if(e.dr.st)return['#4fe08a',e.dr.st===1?'Drone flying out':'Drone returning'];if(!padCount(e))return['#ffd34a','Waiting for items'];if(padCount(tg)>=B[tg.d].cap)return['#ffa53a','Destination full'];return['#4fe08a','Loading'];}
 if(e.k==='mach'){if(!e.r)return['#8a96a0','No recipe'];if(e.want&&!e.pw)return['#ff5a46','No power'];if(e.run)return['#4fe08a','Working'];
  const r=RC[e.r];for(const k in r.o)if((e.outb[k]||0)+r.o[k]>capOut(r.o[k]))return['#ffa53a','Output full'];return['#ffd34a','Waiting for input'];}
 if(e.k==='drill'||e.k==='pump'){if(!e.item)return['#8a96a0','Nothing to extract'];if(e.want&&!e.pw)return['#ff5a46','No power'];if(e.buf>=10)return['#ffa53a','Output blocked'];return['#4fe08a','Extracting'];}
 if(e.k==='gen'){if(e.grid&&e.grid.trip)return['#ff5a46','Fuse tripped'];if(!genCan(e))return['#ffa53a',B[e.d].water&&e.water<1?'Needs water':'Needs fuel'];return e.load>0?['#4fe08a','Generating']:['#ffd34a','Standby'];}
 return null;
}
/* live overlays (animation on top of sprites) */
function isActive(e){if(e.k==='dpad')return !!(e.dr&&e.dr.st);if(e.k==='mach')return e.run&&e.pw>0;if(e.k==='drill'||e.k==='pump')return e.want&&e.pw>0;if(e.k==='gen')return e.load>0;return e.k==='core';}
const SMOKE={smelter:[0.74,0.28,0],foundry:[0.8,0.2,0],burner:[0.72,0.28,0],incin:[0.5,0.5,0],steam:[0.8,0.22,1],reactor:[0.4,0.46,2],refinery:[0.7,0.45,1]};
function glow(x,y,r,c,a){const gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgba(c,a));gr.addColorStop(1,rgba(c,0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
function blades(x,y,r,n,ang,c,wd){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=c;for(let k=0;k<n;k++){ctx.rotate(Math.PI*2/n);ctx.beginPath();ctx.moveTo(0,-wd);ctx.quadraticCurveTo(r*0.6,-wd*2.2,r,0);ctx.quadraticCurveTo(r*0.5,wd*0.6,0,wd);ctx.fill();}ctx.restore();ctx.fillStyle='#d8dde2';ctx.beginPath();ctx.arc(x,y,r*0.22,0,7);ctx.fill();}
function drawLive(e,X,Y,s){
 const P=e.w*s,id=e.d,act=(e.act=(e.act||0)+((isActive(e)?1:0)-(e.act||0))*Math.min(1,fdt*4));e.ang=(e.ang||0)+fdt*act;const a=e.ang;
 switch(id){
  case 'drill1':case 'drill2':case 'drill3':blades(X+P/2,Y+P*0.45,P*0.17,3,a*(id==='drill3'?14:id==='drill2'?10:7),'#b8bec6',P*0.035);break;
  case 'wpump':case 'opump':blades(X+P/2,Y+P*0.42,P*(id==='wpump'?0.13:0.11),4,a*5,'#c8d0d8',P*0.03);break;
  case 'smelter':glow(X+P*0.5,Y+P*0.67,P*0.36,'#ff7a1a',act*(0.55+0.2*Math.sin(animT*13+e.id)));ctx.fillStyle=rgba('#ffb040',act*0.9);rr(X+P*0.31,Y+P*0.6,P*0.38,P*0.14,s*0.08);ctx.fill();break;
  case 'foundry':for(const fx of [0.36,0.64]){glow(X+P*fx,Y+P*0.42,s*0.42,'#ff8a20',act*(0.75+0.2*Math.sin(animT*9+fx*9)));}break;
  case 'burner':glow(X+P*0.5,Y+P*0.63,P*0.34,'#ff7020',act*(0.6+0.25*Math.sin(animT*11+e.id)));break;
  case 'incin':glow(X+P*0.5,Y+P*0.5,P*0.4,'#ff5a1a',0.35+0.2*Math.sin(animT*8));break;
  case 'press':{const k=act*Math.abs(Math.sin(a*4)),sz=P*(0.3-0.07*k);ctx.fillStyle='#8a96a2';rr(X+P/2-sz/2,Y+P*0.53-sz/2,sz,sz,s*0.06);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.25)';rr(X+P/2-sz/2,Y+P*0.53-sz/2,sz,sz*0.35,s*0.06);ctx.fill();break;}
  case 'assembler':case 'fabricator':{const pts=id==='assembler'?[[0.5,0.45]]:[[0.3,0.3],[0.7,0.3],[0.3,0.76],[0.7,0.76]];
   pts.forEach(([px,py],k)=>{const an=Math.sin(a*3+k*1.7)*1.2+k*1.57,L=s*0.62;const x=X+P*px,y=Y+P*py,ex=x+Math.cos(an)*L,ey=y+Math.sin(an)*L;ctx.strokeStyle='#f2c230';ctx.lineCap='round';ctx.lineWidth=s*0.12;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();ctx.fillStyle='#3a3a3a';ctx.beginPath();ctx.arc(ex,ey,s*0.09,0,7);ctx.fill();ctx.lineCap='butt';});
   if(id==='fabricator'){for(let k=0;k<4;k++){const on=act>0.5&&((animT*3+k)|0)%3===0;ctx.fillStyle=on?'#59f0a0':'#1d3a2c';ctx.fillRect(X+P*(0.44+k*0.035),Y+P*0.17,P*0.022,P*0.04);}}break;}
  case 'refinery':glow(X+P*0.7,Y+P*0.45,s*0.4,'#ff4040',0.25+0.35*(Math.sin(animT*3+e.id)>0.6?1:0));if(act>0.2)glow(X+P*0.7,Y+P*0.45,s*0.3,'#ffd060',act*0.4);break;
  case 'blender':blades(X+P/2,Y+P/2,P*0.2,2,a*4,'#7ad6c8',P*0.04);break;
  case 'steam':blades(X+P*0.42,Y+P*0.54,P*0.18,6,a*10,'#c4cad0',P*0.03);break;
  case 'turbine':blades(X+P*0.3,Y+P*0.5,P*0.11,8,a*18,'#d0d6dc',P*0.02);if(act>0.1)glow(X+P*0.86,Y+P*0.5,P*0.16,'#ffa040',act*0.6);break;
  case 'reactor':glow(X+P*0.4,Y+P*0.46,P*0.22,'#60ff80',act*(0.45+0.25*Math.sin(animT*2)));break;
  case 'tank':if(e.amt>0&&e.ft){const f=e.amt/B.tank.cap;ctx.fillStyle=rgba(IT[e.ft].c,0.9);ctx.beginPath();ctx.arc(X+P/2,Y+P/2,P*0.29*Math.sqrt(f),0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.18)';ctx.beginPath();ctx.arc(X+P/2-P*0.06,Y+P/2-P*0.06,P*0.08*Math.sqrt(f),0,7);ctx.fill();}break;
  case 'core':{const C=P/2;ctx.save();ctx.translate(X+C,Y+C);ctx.rotate(animT*0.4);ctx.strokeStyle='rgba(255,200,100,0.55)';ctx.lineWidth=s*0.08;ctx.setLineDash([s*0.3,s*0.25]);ctx.beginPath();ctx.arc(0,0,P*0.27,0,7);ctx.stroke();ctx.setLineDash([]);ctx.restore();glow(X+C,Y+C,P*0.25,'#ffb547',0.35+0.25*Math.sin(animT*2.5));break;}
 }
 // smoke
 const sm=SMOKE[id];if(sm&&act>0.3&&parts.length<600){const rate=(sm[2]===2?9:4)*act;if(Math.random()<rate*fdt)parts.push({x:e.x+e.w*sm[0],y:e.y+e.w*sm[1],vx:0.25+Math.random()*0.2,vy:-0.35-Math.random()*0.25,r:(sm[2]===2?0.55:0.22)+Math.random()*0.12,t:0,m:sm[2]===2?4:2.6,k:sm[2]});}
 // badge + status
 let icon=null;if(e.k==='mach'&&e.r)icon=Object.keys(RC[e.r].o)[0];else if((e.k==='drill'||e.k==='pump')&&e.item)icon=e.item;else if(e.k==='storage'){for(const k in e.store){icon=k;break;}}
 if(icon&&s>9){const r=Math.min(s*0.32,P*0.16),bx=X+s*0.42,by=Y+P-s*0.42;ctx.fillStyle='rgba(10,14,18,0.85)';ctx.beginPath();ctx.arc(bx,by,r*1.25,0,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1;ctx.stroke();drawItem(icon,bx,by,r*2.1);}
 effRing(e,X,Y,s);clockBadge(e,X,Y,s);const st=bStatus(e);if(st&&s>7){const lx=X+P-s*0.36,ly=Y+s*0.36,lr=Math.max(1.6,s*0.09);glow(lx,ly,lr*3,st[0],0.45);ctx.fillStyle=st[0];ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.fill();}
 let pg=null;if(e.k==='mach'&&e.run)pg=e.prog;else if(e.k==='storage'){let t=0;for(const k in e.store)t+=e.store[k];pg=t/B[e.d].cap;}
 if(pg!==null&&s>9){const bw=P-s*0.9,bx=X+s*0.62,by=Y+P-s*0.2;ctx.fillStyle='rgba(0,0,0,0.6)';rr(bx,by,bw,s*0.08,s*0.04);ctx.fill();ctx.fillStyle='#ffb547';rr(bx,by,bw*Math.min(1,pg),s*0.08,s*0.04);ctx.fill();}
}
/* Efficiency ring in the building's top-left corner (fills clockwise, coloured like the panel badge) */
/* Clock badge, bottom-right, when a machine/drill/pump doesn't run at 100 % (amber = overclocked, blue = slowed down) */
function clockBadge(e,X,Y,s){
 if(s<46||!(e.k==='mach'||e.k==='drill'||e.k==='pump'))return;const c=e.clock||1;if(Math.abs(c-1)<0.005)return;   // same zoom level and font size as the efficiency ring's number
 const P=e.w*s,txt=Math.round(c*100)+'%',fs=Math.round(Math.max(3,s*0.17)*0.78);ctx.font=`700 ${fs}px Inter,system-ui,sans-serif`;
 const w=ctx.measureText(txt).width+fs*0.8,h=fs*1.45,x=X+P-w-s*0.1,y=Y+P-h-s*0.1;
 ctx.fillStyle='rgba(10,14,18,0.82)';rr(x,y,w,h,h/2);ctx.fill();ctx.strokeStyle=c>1?'#ffb547':'#7fb6ff';ctx.lineWidth=Math.max(1,fs*0.1);ctx.stroke();
 ctx.fillStyle=c>1?'#ffcf7a':'#bcd8ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x+w/2,y+h/2+0.5);ctx.textAlign='left';
}
function effRing(e,X,Y,s){
 if(!OPT.eff||s<9||e._efT==null||e._efT<3||!(e.k==='mach'&&e.r||e.k==='drill'||e.k==='pump'))return;
 const r=Math.max(3,s*0.17),cx=X+s*0.36,cy=Y+s*0.36,f=e._ef,col=effCol(Math.round(f*100));
 ctx.fillStyle='rgba(10,14,18,0.78)';ctx.beginPath();ctx.arc(cx,cy,r*1.35,0,7);ctx.fill();
 ctx.lineWidth=Math.max(1.5,r*0.42);ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,0.13)';ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.stroke();
 if(f>0.005){ctx.strokeStyle=col;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,f));ctx.stroke();}
 ctx.lineCap='butt';
 if(s>=46){ctx.fillStyle='#fff';ctx.font=`700 ${Math.round(r*0.78)}px Inter,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(Math.round(f*100),cx,cy+0.5);ctx.textAlign='left';}
}
/* Level of detail for huge factories / far zoom: one filled path per colour (a handful of draw calls for thousands of objects).
   Belts/pipes become thin strips in their tier colour, buildings coloured blocks with a dark rim, machines keep a status dot. */
function drawLOD(vis,sx,sy,s,g){g=g||ctx;
 const signs=[],G=new Map(),add=(c,x,y,w,h)=>{let p=G.get(c);if(!p){p=new Path2D();G.set(c,p);}p.rect(x,y,w,h);},rim=new Path2D(),dots=new Map();
 for(const e of vis){const d=B[e.d],X=sx(e.x),Y=sy(e.y);
  if(e.k==='pipe'){const c='#6f93b8';let m=e.pc||((1<<e.dir)|(1<<((e.dir+2)&3)));add(c,X+s*0.32,Y+s*0.32,s*0.36,s*0.36);if(m&1)add(c,X+s*0.5,Y+s*0.32,s*0.5+0.6,s*0.36);if(m&4)add(c,X,Y+s*0.32,s*0.5,s*0.36);if(m&2)add(c,X+s*0.32,Y+s*0.5,s*0.36,s*0.5+0.6);if(m&8)add(c,X+s*0.32,Y,s*0.36,s*0.5);continue;}
  if(isLine(e.k)){const c=d.col,h=e.dir===0||e.dir===2;if(h)add(c,X,Y+s*0.32,s+0.6,s*0.36);else add(c,X+s*0.32,Y,s*0.36,s+0.6);continue;}
  if(e.k==='pole'){add(d.col,X+s*0.3,Y+s*0.3,s*0.4,s*0.4);continue;}
  if(e.k==='sign'){signs.push([e,X,Y]);continue;}
  const W=e.w*s;rim.rect(X+0.5,Y+0.5,W-1,W-1);add(e.k==='router'||e.k==='cross'?d.col:shade(d.col,-10),X+s*0.12,Y+s*0.12,W-s*0.24,W-s*0.24);
  const st=(e.k==='mach'||e.k==='drill'||e.k==='pump'||e.k==='gen')&&bStatus(e);if(st&&W>=5){let p=dots.get(st[0]);if(!p){p=new Path2D();dots.set(st[0],p);}const r=Math.max(1.2,W*0.12);p.rect(X+W/2-r,Y+W/2-r,r*2,r*2);}}
 g.fillStyle='#20262c';g.fill(rim);for(const [c,p] of G){g.fillStyle=c;g.fill(p);}for(const [c,p] of dots){g.fillStyle=c;g.fill(p);}
 for(const [e,X,Y] of signs)drawSign(g,e,X,Y,e.w*s);   // signs stay readable at far zoom
}
/* Drone position for a pad: lerp between pad centres along its route, with a take-off / landing height */
function dronePos(e){const D=e.dr,c=e.w/2;if(!D||!D.st)return{x:e.x+c,y:e.y+c,h:D&&D.w>0?0.15:0};const k=D.t;
 return{x:e.x+c+(D.tx-e.x)*k,y:e.y+c+(D.ty-e.y)*k,h:Math.min(1,Math.min(k,1-k)*9+(D.w>0?0.1:0.25))};}
function drawDrones(sx,sy,s,lod){
 const sel=UI.sel&&ents.get(UI.sel),src=UI.linkFrom&&ents.get(UI.linkFrom);
 for(const e of [sel,src])if(e&&e.k==='dpad'){const tg=padTarget(e),A=[sx(e.x+1.5),sy(e.y+1.5)];let Bp=null;
  if(e===src&&hover)Bp=[sx(hover.x+0.5),sy(hover.y+0.5)];else if(tg)Bp=[sx(tg.x+1.5),sy(tg.y+1.5)];
  if(Bp){ctx.save();ctx.strokeStyle='rgba(47,167,160,0.85)';ctx.lineWidth=Math.max(1.5,s*0.06);ctx.setLineDash([s*0.3,s*0.25]);ctx.lineDashOffset=-animT*s*0.8;ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...Bp);ctx.stroke();ctx.restore();}}
 for(const e of pads){if(!e.dr.st&&!padTarget(e))continue;   // only pads with a route have a drone
  const p=dronePos(e),X=sx(p.x),Y=sy(p.y),lift=p.h*s*1.4,r=Math.max(2.5,s*0.55);
  if(X<-s*3||Y<-s*3||X>cv.width+s*3||Y>cv.height+s*3)continue;
  if(lod){ctx.fillStyle='#e9eef2';ctx.fillRect(X-r*0.6,Y-lift-r*0.6,r*1.2,r*1.2);continue;}
  ctx.globalAlpha=0.28*(1-p.h*0.4);ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(X+p.h*s*0.5,Y+p.h*s*0.4,r*(1-p.h*0.25),r*0.7*(1-p.h*0.25),0,0,7);ctx.fill();ctx.globalAlpha=1;
  const Y2=Y-lift,ang=Math.atan2(e.dr.ty-e.y,e.dr.tx-e.x);ctx.save();ctx.translate(X,Y2);ctx.rotate(e.dr.st?ang:0);
  const c=Object.keys(e.dr.c||{})[0];if(c){ctx.fillStyle=IT[c].c;rr(-r*0.32,-r*0.32,r*0.64,r*0.64,r*0.1);ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;ctx.stroke();}
  ctx.strokeStyle='#3a4048';ctx.lineWidth=Math.max(1,r*0.14);ctx.beginPath();ctx.moveTo(-r*0.7,-r*0.7);ctx.lineTo(r*0.7,r*0.7);ctx.moveTo(r*0.7,-r*0.7);ctx.lineTo(-r*0.7,r*0.7);ctx.stroke();
  for(const [ax,ay] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.fillStyle='rgba(220,230,236,0.35)';ctx.beginPath();ctx.arc(ax*r*0.7,ay*r*0.7,r*0.36,0,7);ctx.fill();
   ctx.strokeStyle='#cfd8de';ctx.lineWidth=Math.max(1,r*0.08);const a=animT*(e.dr.st||e.dr.w?40:0)+ax;ctx.beginPath();ctx.moveTo(ax*r*0.7+Math.cos(a)*r*0.34,ay*r*0.7+Math.sin(a)*r*0.34);ctx.lineTo(ax*r*0.7-Math.cos(a)*r*0.34,ay*r*0.7-Math.sin(a)*r*0.34);ctx.stroke();}
  ctx.fillStyle='#e9eef2';rr(-r*0.3,-r*0.24,r*0.6,r*0.48,r*0.14);ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=B.dpad.col;ctx.fillRect(-r*0.3,-r*0.05,r*0.6,r*0.1);
  ctx.restore();}
}
/* While panning at far zoom the simplified layer is drawn once into a canvas covering the screen plus a margin, then just shifted.
   Redrawn when the zoom changes (zooming draws directly), when something is built/removed (topoVer), or once a second (status dots). */
const LODC={c:null,s:0,ver:-1,t:-9,x0:0,y0:0,w:0,h:0,lastS:0};
function drawLODCached(ox,oy,s,W,H,vis,sx,sy){const C=LODC,zooming=Math.abs(s-C.lastS)>1e-6;C.lastS=s;
 if(zooming){drawLOD(vis,sx,sy,s);return;}
 const ok=C.c&&C.s===s&&C.ver===topoVer&&animT-C.t<1&&-ox>=C.x0&&-oy>=C.y0&&W-ox<=C.x0+C.w&&H-oy<=C.y0+C.h;
 if(!ok){const mx=Math.round(W*0.25),my=Math.round(H*0.25);C.x0=Math.floor(-ox-mx);C.y0=Math.floor(-oy-my);C.w=W+2*mx;C.h=H+2*my;
  if(!C.c)C.c=document.createElement('canvas');if(C.c.width!==C.w||C.c.height!==C.h){C.c.width=C.w;C.c.height=C.h;}
  const g=C.c.getContext('2d');g.clearRect(0,0,C.w,C.h);const tx0=C.x0/s-3,ty0=C.y0/s-3,tx1=(C.x0+C.w)/s+1,ty1=(C.y0+C.h)/s+1,list=[];
  for(const e of ents.values())if(e.x+e.w>=tx0&&e.x<=tx1&&e.y+e.h>=ty0&&e.y<=ty1)list.push(e);
  drawLOD(list,x=>x*s-C.x0,y=>y*s-C.y0,s,g);C.s=s;C.ver=topoVer;C.t=animT;}
 ctx.drawImage(C.c,Math.round(C.x0+ox),Math.round(C.y0+oy));
}
function syncClouds(ox,oy){const el=document.getElementById('clouds');if(!el||!cloudC)return;
 if(el._src!==cloudC){el._src=cloudC;el.style.backgroundImage=`url(${cloudC.toDataURL()})`;}
 const sc=TS*cam.z,T=128*2.2*sc,bx=((animT*0.5*sc)%T),X=ox/DPR-bx+MW*sc/2-64*2.2*sc,Y=oy/DPR-bx*0.4+MH*sc/2-64*2.2*sc;
 const st=`${(X%T).toFixed(1)}px ${(Y%T).toFixed(1)}px`,sz=`${T.toFixed(1)}px`;if(el._p!==st){el._p=st;el.style.backgroundPosition=st;}if(el._s!==sz){el._s=sz;el.style.backgroundSize=sz;}}
/* Highlighted resource nodes: pulsing ring (minimum size so it shows at far zoom) and, if none of a type is on screen, an edge arrow to the nearest */
function drawHighlights(sx,sy,s,W,H){
 const list=hlNodes();if(!list.length)return;const pulse=0.5+0.5*Math.sin(animT*5),rr0=Math.max(12*DPR,s*0.95),lw=Math.max(3.2*DPR,s*0.09),onScreen=new Set();
 ctx.save();ctx.lineWidth=lw;
 for(const n of list){const X=sx(n.x+0.5),Y=sy(n.y+0.5);if(X<-40||Y<-40||X>W+40||Y>H+40)continue;onScreen.add(n.t);
  ctx.globalAlpha=0.25+0.2*pulse;ctx.fillStyle='#ffd34a';ctx.beginPath();ctx.arc(X,Y,rr0*(0.9+0.25*pulse),0,7);ctx.fill();
  ctx.globalAlpha=1;ctx.strokeStyle='#ffd34a';ctx.beginPath();ctx.arc(X,Y,rr0*(1+0.25*pulse),0,7);ctx.stroke();ctx.strokeStyle='rgba(0,0,0,0.6)';ctx.lineWidth=Math.max(1,DPR);ctx.beginPath();ctx.arc(X,Y,rr0*(1+0.25*pulse)+lw*0.9,0,7);ctx.stroke();ctx.lineWidth=lw;}
 const cx=W/2,cy=H/2,m=34*DPR,bottom=H-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockH'))||150)*DPR-30*DPR;
 for(const t of UI.hl.types){if(onScreen.has(t))continue;const nr=hlNearest(list.filter(n=>n.t===t));if(!nr)continue;
  const X=sx(nr.n.x+0.5),Y=sy(nr.n.y+0.5),dx=X-cx,dy=Y-cy,k=Math.min((cx-m)/Math.max(1e-6,Math.abs(dx)),((dy>0?bottom-cy:cy-m-60*DPR))/Math.max(1e-6,Math.abs(dy))),ax=cx+dx*k,ay=cy+dy*k,ang=Math.atan2(dy,dx),R=15*DPR;
  ctx.globalAlpha=1;ctx.fillStyle='rgba(14,20,27,0.88)';ctx.strokeStyle='#ffd34a';ctx.lineWidth=2*DPR;ctx.beginPath();ctx.arc(ax,ay,R,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd34a';ctx.beginPath();ctx.moveTo(ax+Math.cos(ang)*(R+9*DPR),ay+Math.sin(ang)*(R+9*DPR));ctx.lineTo(ax+Math.cos(ang+0.5)*R,ay+Math.sin(ang+0.5)*R);ctx.lineTo(ax+Math.cos(ang-0.5)*R,ay+Math.sin(ang-0.5)*R);ctx.fill();
  ctx.fillStyle=NODE_T[t][1];ctx.beginPath();ctx.arc(ax,ay-R*0.28,R*0.32,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font=`700 ${9*DPR}px Inter,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(Math.round(nr.d),ax,ay+R*0.42);ctx.textAlign='left';}
 ctx.restore();
}
/* Signs: coloured board with the text wrapped (max 3 lines) and sized to fill it; used by the normal view, the far view and 3D labels */
function signLayout(g,text,W,H){const words=(text||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return null;let best=null;
 for(let n=1;n<=Math.min(3,words.length);n++){const per=Math.ceil(words.length/n),lines=[];for(let i=0;i<words.length;i+=per)lines.push(words.slice(i,i+per).join(' '));
  g.font=`700 100px Rajdhani,Inter,sans-serif`;const wmax=Math.max(...lines.map(l=>g.measureText(l).width));const fs=Math.min(W*0.86/wmax*100,H*0.78/(n*1.08));if(!best||fs>best.fs)best={lines,fs};}
 return best;}
function signColors(e){const bg=SIGN_COL[e.tc||0]||SIGN_COL[0],c=parseInt(bg.slice(1),16),lum=((c>>16)*0.3+((c>>8)&255)*0.59+(c&255)*0.11);return{bg,fg:lum>150?'#1d232a':'#ffffff'};}
function drawSign(g,e,X,Y,P){const {bg,fg}=signColors(e),i=Math.max(1,P*0.06);
 g.fillStyle='rgba(0,0,0,0.35)';rrg(g,X+i+P*0.03,Y+i+P*0.05,P-2*i,P-2*i,P*0.08);g.fill();
 g.fillStyle=bg;rrg(g,X+i,Y+i,P-2*i,P-2*i,P*0.08);g.fill();g.lineWidth=Math.max(1,P*0.035);g.strokeStyle=shade(bg,-55);g.stroke();
 if(!e.tx)return;const key=e.tx+'|'+Math.round(P);if(e._tk!==key){e._tk=key;e._tl=signLayout(g,e.tx,P-4*i,P-4*i);}const L=e._tl;if(!L||L.fs<4)return;
 g.fillStyle=fg;g.font=`700 ${L.fs}px Rajdhani,Inter,sans-serif`;g.textAlign='center';g.textBaseline='middle';const lh=L.fs*1.02,y0=Y+P/2-(L.lines.length-1)*lh/2;
 L.lines.forEach((l,k)=>g.fillText(l,X+P/2,y0+k*lh+L.fs*0.05));g.textAlign='left';}
function drawBuilding(e,X,Y,s){
 if(e.k==='sign'){drawSign(ctx,e,X,Y,e.w*s);return;}
 const P=e.w*s;let sc=1;
 if(e.born!==undefined){const t=(animT-e.born)/0.3;if(t<1)sc=0.7+0.3*easeBack(Math.max(0,t));else e.born=undefined;}
 if(sc!==1){ctx.save();ctx.translate(X+P/2,Y+P/2);ctx.scale(sc,sc);ctx.translate(-X-P/2,-Y-P/2);}
 blit(e.d,X,Y,s);drawLive(e,X,Y,s);
 if(sc!==1)ctx.restore();
}

/* ---------- items ---------- */
const SHAPE={};const setS=(sh,ids)=>ids.split(' ').forEach(i=>SHAPE[i]=sh);
setS('ore','iron_ore copper_ore limestone coal sulfur bauxite uranium');setS('crystal','quartz quartz_crystal resonator');
setS('ingot','iron_ingot copper_ingot steel_ingot alu_ingot alu_casing');setS('plate','iron_plate copper_sheet alloy_panel braced_plate plastic heat_sink');
setS('rod','iron_rod');setS('beam','steel_beam');setS('pipe','steel_pipe');setS('bolts','bolts');setS('coil','wire cable');setS('block','concrete rubber coolant_block');setS('girder','cased_girder');
setS('pile','silica petro_coke polymer_resin alu_scrap');setS('cell','uranium_cell fuel_rod battery');setS('barrel','waste');setS('frame','truss_frame heavy_truss');
setS('gear','rotor motor stator turbine_core');setS('chip','circuit_board compute_module control_chip data_bus');setS('orb','quantum_core');
const ISPR=new Map();
function itemSprite(id,px){const b=Math.max(6,Math.min(96,Math.round(bkt(px)))),key=id+'|'+b;let c=ISPR.get(key);if(c)return c;
 c=document.createElement('canvas');c.width=c.height=Math.ceil(b*1.3);const g=c.getContext('2d');g.translate(c.width/2,c.height/2);paintItem(g,id,b);c.b=b;ISPR.set(key,c);if(ISPR.size>800)ISPR.delete(ISPR.keys().next().value);return c;}
function drawItem(id,x,y,px){const c=itemSprite(id,px),k=px/c.b;ctx.drawImage(c,x-c.width*k/2,y-c.height*k/2,c.width*k,c.height*k);}
function paintItem(g,id,R){
 const col=IT[id].c,sh=IT[id].f?'drop':(SHAPE[id]||'part'),lw=Math.max(0.8,R*0.06),out='rgba(0,0,0,0.6)';
 const rad=(r)=>{const gr=g.createRadialGradient(-r*0.35,-r*0.4,r*0.05,0,0,r*1.1);gr.addColorStop(0,shade(col,60));gr.addColorStop(0.6,col);gr.addColorStop(1,shade(col,-50));return gr;};
 const lin=(h)=>{const gr=g.createLinearGradient(0,-h,0,h);gr.addColorStop(0,shade(col,55));gr.addColorStop(1,shade(col,-45));return gr;};
 const fin=()=>{g.lineWidth=lw;g.strokeStyle=out;g.stroke();};
 g.save();g.translate(R*0.04,R*0.07);g.globalAlpha=0.35;g.fillStyle='#000';g.beginPath();g.ellipse(0,R*0.06,R*0.4,R*0.33,0,0,7);g.fill();g.restore();g.globalAlpha=1;
 let h=0;for(let k=0;k<id.length;k++)h=(h*31+id.charCodeAt(k))|0;
 switch(sh){
  case 'ore':{g.beginPath();for(let k=0;k<7;k++){const a=k/7*Math.PI*2,rr=R*0.4*(0.72+0.28*(((h>>(k*3))&7)/7));g[k?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fillStyle=rad(R*0.42);g.fill();fin();g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.arc(-R*0.12,-R*0.12,R*0.07,0,7);g.fill();break;}
  case 'crystal':g.beginPath();g.moveTo(0,-R*0.46);g.lineTo(R*0.3,-R*0.1);g.lineTo(R*0.2,R*0.4);g.lineTo(-R*0.2,R*0.4);g.lineTo(-R*0.3,-R*0.1);g.closePath();g.fillStyle=rad(R*0.45);g.fill();fin();g.strokeStyle='rgba(255,255,255,0.45)';g.lineWidth=lw*0.7;g.beginPath();g.moveTo(0,-R*0.46);g.lineTo(0,R*0.4);g.moveTo(-R*0.3,-R*0.1);g.lineTo(R*0.3,-R*0.1);g.stroke();break;
  case 'ingot':g.beginPath();g.moveTo(-R*0.42,R*0.22);g.lineTo(R*0.42,R*0.22);g.lineTo(R*0.3,-R*0.2);g.lineTo(-R*0.3,-R*0.2);g.closePath();g.fillStyle=lin(R*0.22);g.fill();fin();g.fillStyle='rgba(255,255,255,0.3)';g.fillRect(-R*0.26,-R*0.16,R*0.52,R*0.08);break;
  case 'plate':rrg(g,-R*0.38,-R*0.38,R*0.76,R*0.76,R*0.08);g.fillStyle=lin(R*0.38);g.fill();fin();g.strokeStyle='rgba(255,255,255,0.3)';g.lineWidth=lw*0.7;rrg(g,-R*0.3,-R*0.3,R*0.6,R*0.6,R*0.05);g.stroke();
   if(id==='braced_plate'){g.strokeStyle='rgba(0,0,0,0.4)';g.lineWidth=lw*1.3;g.beginPath();g.moveTo(-R*0.28,-R*0.28);g.lineTo(R*0.28,R*0.28);g.moveTo(R*0.28,-R*0.28);g.lineTo(-R*0.28,R*0.28);g.stroke();}
   if(id==='heat_sink'){g.strokeStyle='rgba(0,0,0,0.4)';g.lineWidth=lw;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*R*0.12,-R*0.28);g.lineTo(k*R*0.12,R*0.28);g.stroke();}}break;
  case 'girder':{g.save();g.rotate(-0.7);const L=R*0.94,H=R*0.36;   // concrete-cased steel girder: long concrete body, steel end caps and bands, "I" on the end
   rrg(g,-L/2,-H/2,L,H,R*0.04);g.fillStyle=lin(H/2);g.fill();fin();
   g.fillStyle='rgba(0,0,0,0.12)';for(let k=0;k<5;k++)g.fillRect(-L/2+R*0.12+k*R*0.15,-H/2+R*0.06+((k*37)%3)*R*0.06,R*0.04,R*0.04);
   const st='#3d4652';g.fillStyle=st;g.fillRect(-L/2,-H/2,R*0.09,H);g.fillRect(L/2-R*0.09,-H/2,R*0.09,H);g.fillRect(-R*0.03,-H/2,R*0.06,H);
   g.fillStyle='#c9d2dc';const ex=L/2-R*0.045;g.fillRect(ex-R*0.035,-H*0.32,R*0.07,R*0.03);g.fillRect(ex-R*0.035,H*0.32-R*0.03,R*0.07,R*0.03);g.fillRect(ex-R*0.012,-H*0.32,R*0.024,H*0.64);
   g.restore();break;}
  case 'beam':{g.save();g.rotate(-0.7);const L=R*0.92,H=R*0.34;   // I-beam seen from the side: solid bar, recessed web groove, bold "I" profile at the end
   rrg(g,-L/2,-H/2,L,H,R*0.03);g.fillStyle=lin(H/2);g.fill();fin();
   g.fillStyle=shade(col,-50);g.fillRect(-L/2+R*0.05,-H*0.18,L-R*0.13,H*0.36);
   g.fillStyle='rgba(255,255,255,0.28)';g.fillRect(-L/2+R*0.03,-H/2+R*0.025,L-R*0.08,Math.max(0.8,R*0.03));
   const ex=L/2-R*0.06,c2=shade(col,75);g.fillStyle=c2;g.fillRect(ex-R*0.07,-H/2+R*0.03,R*0.14,R*0.06);g.fillRect(ex-R*0.07,H/2-R*0.09,R*0.14,R*0.06);g.fillRect(ex-R*0.022,-H/2+R*0.06,R*0.044,H-R*0.12);
   g.restore();break;}
  case 'pipe':{g.save();g.rotate(-0.7);   // round tube with a big open, hollow end
   rrg(g,-R*0.44,-R*0.15,R*0.86,R*0.3,R*0.14);g.fillStyle=lin(R*0.15);g.fill();fin();
   g.strokeStyle='rgba(255,255,255,0.35)';g.lineWidth=Math.max(0.8,R*0.04);g.beginPath();g.moveTo(-R*0.36,-R*0.08);g.lineTo(R*0.34,-R*0.08);g.stroke();
   g.fillStyle=shade(col,45);g.beginPath();g.ellipse(R*0.42,0,R*0.09,R*0.15,0,0,7);g.fill();g.lineWidth=lw;g.strokeStyle=out;g.stroke();
   g.fillStyle='#0d1116';g.beginPath();g.ellipse(R*0.43,0,R*0.05,R*0.095,0,0,7);g.fill();
   g.restore();break;}
  case 'rod':g.save();g.rotate(-0.7);rrg(g,-R*0.46,-R*0.11,R*0.92,R*0.22,R*0.08);g.fillStyle=lin(R*0.11);g.fill();fin();if(id==='steel_pipe'){g.fillStyle='#111';g.beginPath();g.ellipse(R*0.42,0,R*0.04,R*0.08,0,0,7);g.fill();}g.restore();break;
  case 'bolts':for(const [x,y] of [[-0.18,-0.12],[0.18,-0.1],[0,0.18]]){g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g[k?'lineTo':'moveTo'](R*x+Math.cos(a)*R*0.17,R*y+Math.sin(a)*R*0.17);}g.closePath();g.fillStyle=rad(R*0.2);g.fill();fin();g.fillStyle='rgba(0,0,0,0.5)';g.beginPath();g.arc(R*x,R*y,R*0.06,0,7);g.fill();}break;
  case 'coil':g.lineWidth=R*0.16;g.strokeStyle=out;g.beginPath();g.arc(0,0,R*0.3,0,7);g.stroke();g.lineWidth=R*0.12;g.strokeStyle=col;g.stroke();g.lineWidth=R*0.04;g.strokeStyle='rgba(255,255,255,0.4)';g.beginPath();g.arc(0,0,R*0.3,3.6,5.6);g.stroke();g.fillStyle='#222';g.beginPath();g.arc(0,0,R*0.15,0,7);g.fill();break;
  case 'block':rrg(g,-R*0.36,-R*0.3,R*0.72,R*0.64,R*0.06);g.fillStyle=shade(col,-25);g.fill();fin();rrg(g,-R*0.36,-R*0.3,R*0.72,R*0.24,R*0.06);g.fillStyle=shade(col,35);g.fill();break;
  case 'pile':for(const [x,y,r] of [[-0.16,0.08,0.22],[0.16,0.1,0.2],[0,-0.12,0.22]]){g.beginPath();g.arc(R*x,R*y,R*r,0,7);g.fillStyle=rad(R*0.3);g.fill();fin();}break;
  case 'cell':rrg(g,-R*0.17,-R*0.44,R*0.34,R*0.88,R*0.15);g.fillStyle=lin(R*0.44);g.fill();fin();g.fillStyle='#7d858d';g.fillRect(-R*0.17,-R*0.44,R*0.34,R*0.13);g.fillRect(-R*0.17,R*0.31,R*0.34,R*0.13);g.fillStyle='rgba(255,255,255,0.4)';g.fillRect(-R*0.1,-R*0.25,R*0.06,R*0.5);break;
  case 'barrel':rrg(g,-R*0.3,-R*0.38,R*0.6,R*0.76,R*0.1);g.fillStyle=lin(R*0.38);g.fill();fin();g.fillStyle='#1d1d1d';g.beginPath();g.arc(0,0,R*0.14,0,7);g.fill();break;
  case 'frame':g.lineWidth=R*0.14;g.strokeStyle=out;rrg(g,-R*0.34,-R*0.34,R*0.68,R*0.68,R*0.04);g.stroke();g.beginPath();g.moveTo(-R*0.34,R*0.34);g.lineTo(R*0.34,-R*0.34);g.stroke();g.lineWidth=R*0.09;g.strokeStyle=col;rrg(g,-R*0.34,-R*0.34,R*0.68,R*0.68,R*0.04);g.stroke();g.beginPath();g.moveTo(-R*0.34,R*0.34);g.lineTo(R*0.34,-R*0.34);g.stroke();break;
  case 'gear':g.beginPath();for(let k=0;k<16;k++){const a=k/16*Math.PI*2,rr=k%2?R*0.32:R*0.44;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fillStyle=rad(R*0.44);g.fill();fin();g.fillStyle='rgba(0,0,0,0.55)';g.beginPath();g.arc(0,0,R*0.12,0,7);g.fill();break;
  case 'chip':g.strokeStyle='#c9b46a';g.lineWidth=R*0.05;for(let k=-1;k<=1;k++){g.beginPath();g.moveTo(-R*0.46,k*R*0.18);g.lineTo(R*0.46,k*R*0.18);g.moveTo(k*R*0.18,-R*0.46);g.lineTo(k*R*0.18,R*0.46);g.stroke();}rrg(g,-R*0.32,-R*0.32,R*0.64,R*0.64,R*0.06);g.fillStyle=lin(R*0.32);g.fill();fin();g.fillStyle='rgba(0,0,0,0.5)';g.fillRect(-R*0.13,-R*0.13,R*0.26,R*0.26);break;
  case 'orb':{const gr=g.createRadialGradient(0,0,0,0,0,R*0.48);gr.addColorStop(0,'#fff');gr.addColorStop(0.35,col);gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.beginPath();g.arc(0,0,R*0.48,0,7);g.fill();g.fillStyle=rad(R*0.24);g.beginPath();g.arc(0,0,R*0.24,0,7);g.fill();fin();break;}
  case 'drop':g.beginPath();g.moveTo(0,-R*0.44);g.bezierCurveTo(R*0.12,-R*0.2,R*0.34,0,R*0.34,R*0.12);g.arc(0,R*0.12,R*0.34,0,Math.PI);g.bezierCurveTo(-R*0.34,0,-R*0.12,-R*0.2,0,-R*0.44);g.fillStyle=rad(R*0.4);g.fill();fin();g.fillStyle='rgba(255,255,255,0.45)';g.beginPath();g.ellipse(-R*0.12,R*0.05,R*0.05,R*0.1,0.4,0,7);g.fill();break;
  default:rrg(g,-R*0.36,-R*0.36,R*0.72,R*0.72,R*0.16);g.fillStyle=lin(R*0.36);g.fill();fin();g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.arc(0,0,R*0.12,0,7);g.fill();
 }
}

/* ---------- lines (belts & pipes) ---------- */
function pathLine(p,e,X,Y,s,ext){const cx=X+s/2,cy=Y+s/2,h=s/2,d=e.dir;
 if(e.cin!=null){const i=e.cin;p.moveTo(cx-DX[i]*(h+ext),cy-DY[i]*(h+ext));p.lineTo(cx-DX[i]*h,cy-DY[i]*h);p.quadraticCurveTo(cx,cy,cx+DX[d]*h,cy+DY[d]*h);p.lineTo(cx+DX[d]*(h+ext),cy+DY[d]*(h+ext));}
 else{p.moveTo(cx-DX[d]*(h+ext),cy-DY[d]*(h+ext));p.lineTo(cx+DX[d]*(h+ext),cy+DY[d]*(h+ext));}}
function itemPos(e,p){if(e.cin!=null){const i=e.cin,d=e.dir,ex=0.5-DX[i]*0.5,ey=0.5-DY[i]*0.5,xx=0.5+DX[d]*0.5,xy=0.5+DY[d]*0.5,u=1-p;return[e.x+u*u*ex+2*u*p*0.5+p*p*xx,e.y+u*u*ey+2*u*p*0.5+p*p*xy];}
 const q=p-0.5;return[e.x+0.5+DX[e.dir]*q,e.y+0.5+DY[e.dir]*q];}
function drawLines(list,sx,sy,s,alpha,tint){
 if(!list.length)return;const belts=list.filter(e=>e.k==='belt'),pipes=list.filter(e=>e.k==='pipe'),ext=Math.min(1,s*0.03);
 ctx.lineCap='butt';ctx.lineJoin='round';if(alpha)ctx.globalAlpha=alpha;
 if(belts.length){
  const all=new Path2D(),byT={},byS={};
  for(const e of belts){const X=sx(e.x),Y=sy(e.y);pathLine(all,e,X,Y,s,ext);(byT[e.d]||(byT[e.d]=new Path2D()));pathLine(byT[e.d],e,X,Y,s,ext);const k=e.spd;(byS[k]||(byS[k]=new Path2D()));pathLine(byS[k],e,X,Y,s,0);}
  ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=s*0.92;ctx.stroke(all);
  for(const d in byT){ctx.strokeStyle=tint||B[d].col;ctx.lineWidth=s*0.84;ctx.stroke(byT[d]);}
  ctx.strokeStyle='#202328';ctx.lineWidth=s*0.66;ctx.stroke(all);
  if(s>6){const per=s*0.25;ctx.setLineDash([s*0.06,per-s*0.06]);for(const k in byS){ctx.lineDashOffset=-((animT*k*s)%per);ctx.strokeStyle='#3c414a';ctx.lineWidth=s*0.6;ctx.stroke(byS[k]);}ctx.setLineDash([]);}
  if(s>10){ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=s*0.03;const hl=new Path2D();for(const e of belts){const X=sx(e.x),Y=sy(e.y);if(e.cin!=null)continue;const d=e.dir,px=-DY[d],py=DX[d],cx=X+s/2+px*s*0.39,cy=Y+s/2+py*s*0.39;hl.moveTo(cx-DX[d]*s/2,cy-DY[d]*s/2);hl.lineTo(cx+DX[d]*s/2,cy+DY[d]*s/2);}ctx.stroke(hl);}
 }
 if(pipes.length){
  // pipes have no direction: draw arms from the tile centre to every connected side (e.pc bitmask); fluid colour and fill come from the network
  const all=new Path2D(),byT={},fl={},arm=(p,e,X,Y)=>{const cx=X+s/2,cy=Y+s/2,h=s/2+ext;let m=e.pc||0;if(!m)m=(1<<e.dir)|(1<<((e.dir+2)&3));
   for(let d=0;d<4;d++)if(m&(1<<d)){p.moveTo(cx,cy);p.lineTo(cx+DX[d]*h,cy+DY[d]*h);}};
  for(const e of pipes){const X=sx(e.x),Y=sy(e.y);arm(all,e,X,Y);(byT[e.d]||(byT[e.d]=new Path2D()));arm(byT[e.d],e,X,Y);
   const n=e.net,lv=n?Math.min(1,n._fl*1.4):0,ft=n&&n.fluid;if(ft&&lv>0.03){const bk=Math.ceil(lv*4)/4,key=IT[ft].c+'|'+bk;(fl[key]||(fl[key]=new Path2D()));arm(fl[key],e,X,Y);}}
  ctx.lineCap='round';
  ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.lineWidth=s*0.54;ctx.stroke(all);
  for(const d in byT){ctx.strokeStyle=tint||B[d].col;ctx.lineWidth=s*0.46;ctx.stroke(byT[d]);}
  ctx.strokeStyle='#141a20';ctx.lineWidth=s*0.26;ctx.stroke(all);
  const ga=ctx.globalAlpha;for(const key in fl){const [c,b]=key.split('|');ctx.globalAlpha=ga*(0.3+0.7*b);ctx.strokeStyle=c;ctx.lineWidth=s*0.26;ctx.stroke(fl[key]);ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.lineWidth=s*0.07;ctx.stroke(fl[key]);}ctx.globalAlpha=ga;
  ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.lineWidth=s*0.05;ctx.stroke(all);ctx.lineCap='butt';
  // a red mark where a second fluid is refused (no mixing)
  for(const e of pipes){const n=e.net;if(!n||!n.conflict||tickNo-n.conflict.t>40)continue;const b=n.conflict.b;if(Math.abs(e.x-(b.x+b.w/2))+Math.abs(e.y-(b.y+b.h/2))>b.w/2+1.5)continue;
   ctx.fillStyle='#ff5a46';ctx.beginPath();ctx.arc(sx(e.x+0.5),sy(e.y+0.5),Math.max(3,s*0.18),0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font=`800 ${Math.max(7,s*0.24)}px Inter,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',sx(e.x+0.5),sy(e.y+0.5)+0.5);ctx.textAlign='left';}
 }
 ctx.globalAlpha=1;
}
function drawRouter(g,e,X,Y,s){const d=B[e.d],sub=d.sub,fl=d.fl;
 g.fillStyle='rgba(0,0,0,0.35)';rrg(g,X+s*0.1,Y+s*0.14,s*0.9,s*0.9,s*0.18);g.fill();
 const gr=g.createLinearGradient(0,Y,0,Y+s);gr.addColorStop(0,'#5a636d');gr.addColorStop(1,'#2c3238');g.fillStyle=gr;rrg(g,X+s*0.05,Y+s*0.05,s*0.9,s*0.9,s*0.18);g.fill();g.strokeStyle='rgba(0,0,0,0.6)';g.lineWidth=Math.max(1,s*0.04);g.stroke();
 const g2=g.createLinearGradient(0,Y,0,Y+s);g2.addColorStop(0,shade(d.col,40));g2.addColorStop(1,shade(d.col,-30));g.fillStyle=g2;rrg(g,X+s*0.18,Y+s*0.18,s*0.64,s*0.64,s*0.12);g.fill();
 const arrow=(o,inward)=>{const cx=X+s/2+DX[o]*s*0.3,cy=Y+s/2+DY[o]*s*0.3,px=-DY[o],py=DX[o],dir=inward?-1:1,t=s*0.11;g.beginPath();g.moveTo(cx+DX[o]*t*dir,cy+DY[o]*t*dir);g.lineTo(cx-DX[o]*t*dir+px*t,cy-DY[o]*t*dir+py*t);g.lineTo(cx-DX[o]*t*dir-px*t,cy-DY[o]*t*dir-py*t);g.closePath();g.fill();};
 g.fillStyle='rgba(255,255,255,0.92)';
 if(e.k==='cross'){g.fillStyle='rgba(20,24,28,0.8)';g.fillRect(X+s*0.18,Y+s*0.4,s*0.64,s*0.2);g.fillRect(X+s*0.4,Y+s*0.18,s*0.2,s*0.64);}
 else if(sub==='split'||sub==='sort'){arrow(e.dir);arrow((e.dir+1)&3);arrow((e.dir+3)&3);}
 else if(sub==='merge'){arrow(e.dir);arrow((e.dir+1)&3,1);arrow((e.dir+3)&3,1);arrow((e.dir+2)&3,1);}
 else if(sub==='junc'){g.fillStyle='rgba(20,24,28,0.8)';g.beginPath();g.arc(X+s/2,Y+s/2,s*0.2,0,7);g.fill();}
 if(fl&&e.item){g.fillStyle=IT[e.item].c;g.beginPath();g.arc(X+s/2,Y+s/2,s*0.14,0,7);g.fill();}
 if(sub==='sort'&&e.filter&&g===ctx){drawItem(e.filter,X+s/2,Y+s/2,s*0.36);}
}
function drawPole(g,e,X,Y,s){const tall=e.d==='pole2',tr=e.grid&&e.grid.trip;
 g.fillStyle='rgba(0,0,0,0.3)';g.beginPath();g.ellipse(X+s*0.62,Y+s*0.66,s*0.36,s*0.2,0.5,0,7);g.fill();
 if(tall){g.strokeStyle='#8a8f96';g.lineWidth=Math.max(1,s*0.06);g.strokeRect(X+s*0.22,Y+s*0.22,s*0.56,s*0.56);g.beginPath();g.moveTo(X+s*0.22,Y+s*0.22);g.lineTo(X+s*0.78,Y+s*0.78);g.moveTo(X+s*0.78,Y+s*0.22);g.lineTo(X+s*0.22,Y+s*0.78);g.stroke();}
 const gr=g.createRadialGradient(X+s*0.44,Y+s*0.42,0,X+s/2,Y+s/2,s*0.26);gr.addColorStop(0,'#e8d08a');gr.addColorStop(1,tall?'#8a7030':'#6a4a28');g.fillStyle=gr;g.beginPath();g.arc(X+s/2,Y+s/2,s*(tall?0.22:0.2),0,7);g.fill();g.strokeStyle='rgba(0,0,0,0.6)';g.lineWidth=Math.max(1,s*0.04);g.stroke();
 g.fillStyle=tr?'#ff4a3a':'#ffd34a';g.beginPath();g.arc(X+s/2,Y+s/2,s*0.07,0,7);g.fill();}

/* ---------- main render ---------- */
function render(){
 if(wantLow()!==lowRes)resize();
 const W=cv.width,H=cv.height;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
 const s=TS*cam.z*DPR,ox=W/2-cam.x*s,oy=H/2-cam.y*s;
 const sx=x=>ox+x*s,sy=y=>oy+y*s;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=s<TPX?'high':'low';drawTerrain(ox,oy,s,W,H);
 const x0=Math.max(0,Math.floor(-ox/s)-1),y0=Math.max(0,Math.floor(-oy/s)-1),x1=Math.min(MW,Math.ceil((W-ox)/s)+1),y1=Math.min(MH,Math.ceil((H-oy)/s)+1);
 // water shimmer (only when zoomed in enough to see it)
 if(s>=22){ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1,s*0.04);ctx.lineCap='round';
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){if(terr[y*MW+x]!==1)continue;const h=hash2(x,y),a=Math.sin(animT*1.3+h*40);if(a<0.6)continue;ctx.globalAlpha=(a-0.6)*0.5;const px=sx(x+0.2+h*0.6),py=sy(y+0.3+hash2(y,x)*0.5);ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+s*0.12,py-s*0.06,px+s*0.25,py);ctx.stroke();}
  ctx.globalAlpha=1;ctx.lineCap='butt';}
 // grid when building
 const tool=UI.tool;
 if(tool&&s>14){ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;ctx.beginPath();for(let x=x0;x<=x1;x++){ctx.moveTo(sx(x),sy(y0));ctx.lineTo(sx(x),sy(y1));}for(let y=y0;y<=y1;y++){ctx.moveTo(sx(x0),sy(y));ctx.lineTo(sx(x1),sy(y));}ctx.stroke();}
 // nodes
 for(const n of nodes){if(n.x<x0||n.x>x1||n.y<y0||n.y>y1)continue;if(grid[n.y*MW+n.x])continue;const col=NODE_T[n.t][1],X=sx(n.x),Y=sy(n.y),cx=X+s/2,cy=Y+s/2;
  if(n.t==='oil'){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.ellipse(cx,cy+s*0.05,s*0.46,s*0.36,0,0,7);ctx.fill();const gr=ctx.createRadialGradient(cx-s*0.1,cy-s*0.1,0,cx,cy,s*0.4);gr.addColorStop(0,'#5a4a6a');gr.addColorStop(1,'#0c0810');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(cx,cy,s*0.4,s*0.3,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.25)';ctx.beginPath();ctx.ellipse(cx-s*0.12,cy-s*0.08,s*0.1,s*0.04,0,0,7);ctx.fill();}
  else{for(let k=0;k<4;k++){const ox2=(hash2(n.x*7+k,n.y)-0.5)*s*0.5,oy2=(hash2(n.x,n.y*7+k)-0.5)*s*0.45,r=s*(0.22+hash2(k,n.x+n.y)*0.12);ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(cx+ox2+s*0.04,cy+oy2+s*0.06,r*1.05,r*0.85,0,0,7);ctx.fill();const gr=ctx.createRadialGradient(cx+ox2-r*0.4,cy+oy2-r*0.4,0,cx+ox2,cy+oy2,r*1.1);gr.addColorStop(0,shade(col,55));gr.addColorStop(0.6,col);gr.addColorStop(1,shade(col,-45));ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(cx+ox2,cy+oy2,r,r*0.82,0,0,7);ctx.fill();}}
  if(s>12){ctx.fillStyle='rgba(10,14,18,0.75)';rr(X+s*0.18,Y+s*0.82,s*0.64,s*0.18,s*0.09);ctx.fill();ctx.fillStyle=['#e08a5a','#e8e8e8','#7fe08a'][n.p];for(let k=0;k<=n.p;k++){ctx.beginPath();ctx.arc(X+s*(0.5+(k-n.p/2)*0.17),Y+s*0.91,s*0.05,0,7);ctx.fill();}}}
 const vis=[];for(const e of ents.values()){if(e.x+e.w<x0||e.x>x1||e.y+e.h<y0||e.y>y1)continue;vis.push(e);}
 const lod=TS*cam.z<12||vis.length>6000;   // far out or very busy: simple blocks instead of detailed sprites
 if(lod)drawLODCached(ox,oy,s,W,H,vis,sx,sy);
 if(!lod){drawLines(vis.filter(e=>isLine(e.k)),sx,sy,s);
 for(const e of vis)if(e.k==='router'||e.k==='cross')drawRouter(ctx,e,sx(e.x),sy(e.y),s);
 // items
 const isz=s*0.5;
 for(const e of vis){
  if(e.k==='belt'&&e.item){const [ix,iy]=itemPos(e,e.prog);drawItem(e.item,sx(ix),sy(iy),isz);}
  else if(e.k==='router'&&e.item&&!IT[e.item].f)drawItem(e.item,sx(e.x+0.5),sy(e.y+0.5),isz*0.85);
  else if(e.k==='cross'){if(e.hs&&!IT[e.hs].f)drawItem(e.hs,sx(e.x+0.5),sy(e.y+0.5),isz*0.8);if(e.vs&&!IT[e.vs].f)drawItem(e.vs,sx(e.x+0.5),sy(e.y+0.5),isz*0.8);}
 }
 for(const e of vis)if(!isLine(e.k)&&e.k!=='router'&&e.k!=='cross'&&e.k!=='pole')drawBuilding(e,sx(e.x),sy(e.y),s);
 }
 // drones (above buildings) and the selected pad's route
 drawDrones(sx,sy,s,lod);drawHighlights(sx,sy,s,W,H);
 // particles
 for(let k=parts.length-1;k>=0;k--){const p=parts[k];p.t+=fdt;if(p.t>p.m){parts.splice(k,1);continue;}p.x+=p.vx*fdt;p.y+=p.vy*fdt;}
 for(const p of parts){if(p.x<x0-2||p.x>x1+2||p.y<y0-2||p.y>y1+2)continue;const f=p.t/p.m,al=(1-f)*(f<0.15?f/0.15:1);ctx.globalAlpha=al*(p.k?0.55:0.45);ctx.fillStyle=p.k?'#eef2f5':'#3a3a3c';ctx.beginPath();ctx.arc(sx(p.x),sy(p.y),s*p.r*(1+f*1.8),0,7);ctx.fill();}
 ctx.globalAlpha=1;
 // power overlay
 const showPw=tool&&B[tool]&&(B[tool].k==='pole'||B[tool].k==='gen'||B[tool].pw);
 if(showPw){for(const p of pnodes){const c=cen(p);ctx.fillStyle='rgba(255,215,90,0.06)';ctx.strokeStyle='rgba(255,215,90,0.4)';ctx.lineWidth=1.5*DPR;ctx.setLineDash([6*DPR,5*DPR]);ctx.beginPath();ctx.arc(sx(c.x),sy(c.y),B[p.d].sup*s,0,7);ctx.fill();ctx.stroke();ctx.setLineDash([]);}}
 // wires
 if(!lod)for(const [a,b] of pwLinks){const A=cen(a),Bc=cen(b),tr=a.grid&&a.grid.trip;const mx=(A.x+Bc.x)/2,my=(A.y+Bc.y)/2+0.5;
  ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=Math.max(1,s*0.05);ctx.beginPath();ctx.moveTo(sx(A.x+0.3),sy(A.y+0.4));ctx.quadraticCurveTo(sx(mx+0.3),sy(my+0.6),sx(Bc.x+0.3),sy(Bc.y+0.4));ctx.stroke();
  ctx.strokeStyle=tr?'rgba(255,80,60,0.9)':'rgba(24,22,20,0.85)';ctx.lineWidth=Math.max(1,s*0.045);ctx.beginPath();ctx.moveTo(sx(A.x),sy(A.y));ctx.quadraticCurveTo(sx(mx),sy(my),sx(Bc.x),sy(Bc.y));ctx.stroke();}
 if(!lod)for(const e of vis)if(e.k==='pole')drawPole(ctx,e,sx(e.x),sy(e.y),s);
 // previews
 if(linePrev){const fake=linePrev.path.map((p,k,arr)=>{const prev=arr[k-1];const o={x:p.x,y:p.y,dir:p.d,d:linePrev.id,k:B[linePrev.id].k,spd:B[linePrev.id].spd,cin:null};if(prev&&prev.d!==p.d)o.cin=prev.d;return o;});
  const bad=fake.filter(f=>{const why=canPlace(linePrev.id,f.x,f.y);return why&&!(why==='Blocked'&&entAt(f.x,f.y)&&entAt(f.x,f.y).k===B[linePrev.id].k);});
  drawLines(fake,sx,sy,s,0.7);for(const f of bad){ctx.fillStyle='rgba(255,70,50,0.45)';ctx.fillRect(sx(f.x),sy(f.y),s,s);}
  const n=fake.length,cost=B[linePrev.id].cost;const last=fake[n-1];const okA=afford(cost,n);ctx.font=`600 ${12*DPR}px Inter,system-ui,sans-serif`;const txt=`${n} × ${B[linePrev.id].n}`;const tw=ctx.measureText(txt).width;const lx=sx(last.x+0.5)-tw/2-8*DPR,ly=sy(last.y)-26*DPR;ctx.fillStyle=okA?'rgba(14,20,27,0.85)':'rgba(120,30,20,0.9)';rr(lx,ly,tw+16*DPR,20*DPR,8*DPR);ctx.fill();ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.fillText(txt,lx+8*DPR,ly+10*DPR);}
 else if(hover&&tool&&B[tool]){const d=B[tool],fp=footprint(tool,hover.x,hover.y),why=canPlace(tool,fp.x,fp.y),bad=why&&!(why==='Blocked'&&isLine(d.k)&&entAt(hover.x,hover.y)&&entAt(hover.x,hover.y).k===d.k);
  const X=sx(fp.x),Y=sy(fp.y),P=d.w*s;
  if(isLine(d.k)){const o=entAt(fp.x,fp.y);drawLines([{x:fp.x,y:fp.y,dir:o&&o.k===d.k?o.dir:UI.rot,d:tool,k:d.k,spd:d.spd,cin:null}],sx,sy,s,0.75);}
  else if(d.k==='router'||d.k==='cross'){ctx.globalAlpha=0.75;drawRouter(ctx,{d:tool,k:d.k,dir:UI.rot},X,Y,s);ctx.globalAlpha=1;}
  else if(d.k==='pole'){ctx.globalAlpha=0.8;drawPole(ctx,{d:tool},X,Y,s);ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,215,90,0.6)';ctx.setLineDash([5*DPR,5*DPR]);ctx.beginPath();ctx.arc(X+s/2,Y+s/2,d.link*s,0,7);ctx.stroke();ctx.setLineDash([]);}
  else blit(tool,X,Y,s,0.7);
  ctx.strokeStyle=bad?'#ff5a46':'#6ef08a';ctx.lineWidth=2*DPR;rr(X+1,Y+1,P-2,P-2,s*0.15);ctx.stroke();ctx.fillStyle=bad?'rgba(255,70,50,0.18)':'rgba(110,240,138,0.1)';ctx.fill();}
 else if(movePrev&&ents.has(movePrev.e.id)){const m=movePrev,e=m.e,X=sx(m.nx),Y=sy(m.ny),P=e.w*s;
  ctx.globalAlpha=0.35;ctx.fillStyle='#000';rr(sx(e.x),sy(e.y),P,P,s*0.15);ctx.fill();ctx.globalAlpha=1;
  ctx.globalAlpha=0.7;if(e.k==='sign')drawSign(ctx,e,X,Y,P);else if(isLine(e.k))drawLines([Object.assign({},e,{x:m.nx,y:m.ny,cin:null})],sx,sy,s,0.75);else if(e.k==='router'||e.k==='cross')drawRouter(ctx,Object.assign({},e,{x:m.nx,y:m.ny}),X,Y,s);else if(e.k==='pole')drawPole(ctx,e,X,Y,s);else blit(e.d,X,Y,s,0.7);ctx.globalAlpha=1;
  ctx.strokeStyle=m.ok?'#6ef08a':'#ff5a46';ctx.lineWidth=2.5*DPR;rr(X+1,Y+1,P-2,P-2,s*0.15);ctx.stroke();ctx.fillStyle=m.ok?'rgba(110,240,138,0.12)':'rgba(255,70,50,0.2)';ctx.fill();}
 else if(hover&&tool==='del'){const e=entAt(hover.x,hover.y);ctx.strokeStyle='#ff5a46';ctx.lineWidth=2*DPR;if(e&&e.k!=='core'){ctx.fillStyle='rgba(255,70,50,0.2)';rr(sx(e.x),sy(e.y),e.w*s,e.h*s,s*0.15);ctx.fill();ctx.stroke();}else{rr(sx(hover.x),sy(hover.y),s,s,s*0.15);ctx.stroke();}}
 else if(hover&&!tool&&!G){const e=entAt(hover.x,hover.y);if(e&&e.id!==UI.sel){ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.5*DPR;rr(sx(e.x)+1,sy(e.y)+1,e.w*s-2,e.h*s-2,s*0.18);ctx.stroke();}}
 if(UI.sel&&ents.has(UI.sel)){const e=ents.get(UI.sel),X=sx(e.x)-3*DPR,Y=sy(e.y)-3*DPR,P=e.w*s+6*DPR;ctx.strokeStyle='rgba(255,181,71,0.25)';ctx.lineWidth=7*DPR;rr(X,Y,P,P,s*0.2);ctx.stroke();ctx.strokeStyle='#ffb547';ctx.lineWidth=2*DPR;ctx.setLineDash([7*DPR,5*DPR]);ctx.lineDashOffset=-animT*24*DPR;ctx.stroke();ctx.setLineDash([]);}
 // clouds and vignette are CSS layers above the canvas (cheap on phones): just keep the cloud layer in step with the camera
 syncClouds(ox,oy);
}
