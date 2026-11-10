'use strict';
/* ================= RENDER ================= */
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let DPR=1,cam={x:MW/2,y:MH/2,z:1.2},camT={x:MW/2,y:MH/2,z:1.2},vel={x:0,y:0},zAnchor=null,hover=null,linePrev=null,animT=0,fdt=0.016,cloudC=null;
const parts=[];
function setCam(c){cam=c;camT={x:c.x,y:c.y,z:c.z};vel={x:0,y:0};zAnchor=null;}
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(innerWidth*DPR);cv.height=Math.round(innerHeight*DPR);if(typeof layoutVars==='function')layoutVars();}
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
function bakeTerrain(seed){
 const r=rng((seed^0x5bd1e995)>>>0),nA=mkNoise(r,11),nB=mkNoise(r,3.5),nW=mkNoise(r,1.3);
 const N=MW*TPX,T=MW*MH;
 const dist=new Int16Array(T).fill(999),q=[];
 for(let i=0;i<T;i++)if(terr[i]!==1){dist[i]=0;q.push(i);}
 for(let h=0;h<q.length;h++){const i=q[h],x=i%MW,y=(i/MW)|0;for(let k=0;k<4;k++){const nx=x+DX[k],ny=y+DY[k];if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const j=ny*MW+nx;if(dist[j]>dist[i]+1){dist[j]=dist[i]+1;q.push(j);}}}
 const Wf=new Float32Array(T),Sf=new Float32Array(T),Rf=new Float32Array(T),Df=new Float32Array(T),Gf=new Float32Array(T);
 for(let i=0;i<T;i++){const x=i%MW,y=(i/MW)|0,t=terr[i];Wf[i]=t===1?1:0;Sf[i]=t===2?1:0;Rf[i]=t===3?1:0;Df[i]=Math.min(1,Math.max(0,(dist[i]-1)/5));Gf[i]=nA(x,y)*0.65+nB(x,y)*0.35;}
 const img=new ImageData(N,N),D=img.data;
 const GA=[40,74,42],GB=[62,102,50],GC=[98,134,60],SA=[212,192,140],WS=[146,128,92],RA=[122,118,110],RB=[108,105,99],SH=[66,160,204],DP=[18,62,118],FO=[230,244,250];
 let c0,c1,c2;
 for(let py=0;py<N;py++){const fy=(py+0.5)/TPX-0.5,iy=Math.floor(fy),ty=fy-iy,y0=Math.max(0,iy)*MW,y1=Math.min(MH-1,iy+1)*MW;
  for(let px=0;px<N;px++){const fx=(px+0.5)/TPX-0.5,ix=Math.floor(fx),tx=fx-ix,x0=Math.max(0,ix),x1=Math.min(MW-1,ix+1);
   const a=y0+x0,b=y0+x1,cc=y1+x0,d=y1+x1,w00=(1-tx)*(1-ty),w10=tx*(1-ty),w01=(1-tx)*ty,w11=tx*ty;
   const gn=Gf[a]*w00+Gf[b]*w10+Gf[cc]*w01+Gf[d]*w11, gr=hash2(px,py)-0.5;
   if(gn<0.5){const t=gn*2;c0=GA[0]+(GB[0]-GA[0])*t;c1=GA[1]+(GB[1]-GA[1])*t;c2=GA[2]+(GB[2]-GA[2])*t;}
   else{const t=(gn-0.5)*2;c0=GB[0]+(GC[0]-GB[0])*t;c1=GB[1]+(GC[1]-GB[1])*t;c2=GB[2]+(GC[2]-GB[2])*t;}
   const wp=(nW(fx+0.5,fy+0.5)-0.5)*0.24,w=Wf[a]*w00+Wf[b]*w10+Wf[cc]*w01+Wf[d]*w11+wp, sd=Sf[a]*w00+Sf[b]*w10+Sf[cc]*w01+Sf[d]*w11, rk=Rf[a]*w00+Rf[b]*w10+Rf[cc]*w01+Rf[d]*w11;
   let t=Math.max(sstep(0.2,0.55,sd),sstep(0.24,0.44,w));
   if(t>0){c0+=(SA[0]-c0)*t;c1+=(SA[1]-c1)*t;c2+=(SA[2]-c2)*t;}
   if(rk>0.2){t=sstep(0.36,0.62,rk+wp*1.3+(hash2(px>>2,py>>2)-0.5)*0.1);if(t>0){const R=gr>0?RA:RB;c0+=(R[0]-c0)*t;c1+=(R[1]-c1)*t;c2+=(R[2]-c2)*t;}}
   t=sstep(0.4,0.5,w)*0.7;if(t>0){c0+=(WS[0]-c0)*t;c1+=(WS[1]-c1)*t;c2+=(WS[2]-c2)*t;}
   const wa=sstep(0.485,0.515,w);
   if(wa>0){const dp=sstep(0,1,Df[a]*w00+Df[b]*w10+Df[cc]*w01+Df[d]*w11);let r0=SH[0]+(DP[0]-SH[0])*dp,r1=SH[1]+(DP[1]-SH[1])*dp,r2=SH[2]+(DP[2]-SH[2])*dp;
    const fo=sstep(0.5,0.55,w)*(1-sstep(0.56,0.7,w))*0.6;r0+=(FO[0]-r0)*fo;r1+=(FO[1]-r1)*fo;r2+=(FO[2]-r2)*fo;
    c0+=(r0-c0)*wa;c1+=(r1-c1)*wa;c2+=(r2-c2)*wa;}
   const gv=gr*9*(1-wa*0.7),o=(py*N+px)*4;D[o]=c0+gv;D[o+1]=c1+gv;D[o+2]=c2+gv;D[o+3]=255;}}
 terrC=document.createElement('canvas');terrC.width=terrC.height=N;const g=terrC.getContext('2d');g.putImageData(img,0,0);
 // decorations
 const dark=new Path2D(),light=new Path2D();
 for(let i=0;i<T;i++){if(terr[i]!==0||nodeAt[i])continue;const X=(i%MW)*TPX,Y=((i/MW)|0)*TPX;const n=2+Math.floor(r()*3);
  for(let k=0;k<n;k++){const x=X+r()*TPX,y=Y+r()*TPX,l=2+r()*3.5,p=r()<0.55?dark:light;p.moveTo(x,y);p.lineTo(x-1.6,y-l);p.moveTo(x,y);p.lineTo(x+1.4,y-l*0.85);p.moveTo(x,y);p.lineTo(x,y-l*1.1);}}
 g.lineCap='round';g.lineWidth=1.1;g.strokeStyle='rgba(18,44,20,0.5)';g.stroke(dark);g.strokeStyle='rgba(160,200,100,0.32)';g.stroke(light);
 const FL=['#f6e27a','#f59ac0','#ffffff','#b7d0ff','#ffb36b'];
 for(let i=0;i<T;i++){if(terr[i]!==0||nodeAt[i]||r()>0.05)continue;const X=(i%MW)*TPX,Y=((i/MW)|0)*TPX,col=FL[Math.floor(r()*FL.length)];for(let k=0;k<3;k++){g.fillStyle=col;g.beginPath();g.arc(X+r()*TPX,Y+r()*TPX,1.4,0,7);g.fill();}}
 const stone=(x,y,rad,base)=>{g.fillStyle='rgba(0,0,0,0.3)';g.beginPath();g.ellipse(x+1.2,y+1.6,rad*1.1,rad*0.8,0,0,7);g.fill();const gr=g.createRadialGradient(x-rad*0.4,y-rad*0.4,0,x,y,rad*1.2);gr.addColorStop(0,shade(base,40));gr.addColorStop(1,shade(base,-30));g.fillStyle=gr;g.beginPath();g.ellipse(x,y,rad*1.1,rad*0.85,r()*3,0,7);g.fill();};
 for(let i=0;i<T;i++){const t=terr[i],X=(i%MW)*TPX,Y=((i/MW)|0)*TPX;if(nodeAt[i])continue;
  if(t===3){if(r()<0.28)stone(X+3+r()*(TPX-6),Y+3+r()*(TPX-6),2+r()*3,'#8a8680');}
  else if(t===0&&r()<0.012)stone(X+TPX/2,Y+TPX/2,3+r()*3,'#7e7a72');
  else if(t===2&&r()<0.6){g.fillStyle='rgba(120,100,70,0.45)';for(let k=0;k<3;k++){g.beginPath();g.arc(X+r()*TPX,Y+r()*TPX,0.9,0,7);g.fill();}}}
 // node beds (darker soil ring under resource nodes)
 for(const n of nodes){const x=(n.x+0.5)*TPX,y=(n.y+0.5)*TPX;const gr=g.createRadialGradient(x,y,2,x,y,TPX*1.25);gr.addColorStop(0,'rgba(40,30,20,0.55)');gr.addColorStop(1,'rgba(40,30,20,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,TPX*1.25,0,7);g.fill();}
 // cloud shadows
 const cn=mkNoise(rng(seed+99),14),cn2=mkNoise(rng(seed+7),5);cloudC=document.createElement('canvas');cloudC.width=cloudC.height=128;const cg=cloudC.getContext('2d'),ci=cg.createImageData(128,128);
 for(let i=0;i<128*128;i++){const x=i%128,y=(i/128)|0;const v=cn(x,y)*0.75+cn2(x,y)*0.25;ci.data[i*4+3]=sstep(0.55,0.78,v)*60;}
 cg.putImageData(ci,0,0);
}

/* ---------- building sprites ---------- */
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
  case 'storage':{box(i,i,W,W,u*0.12,'#8a6a42');g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=Math.max(1,u*0.05);for(let y=i+W/4;y<P-i;y+=W/4){g.beginPath();g.moveTo(i,y);g.lineTo(P-i,y);g.stroke();}
   g.strokeStyle='#5a4228';g.lineWidth=Math.max(1.5,u*0.1);g.beginPath();g.moveTo(i+u*0.1,i+u*0.1);g.lineTo(P-i-u*0.1,P-i-u*0.1);g.moveTo(P-i-u*0.1,i+u*0.1);g.lineTo(i+u*0.1,P-i-u*0.1);g.stroke();break;}
  case 'tank':circ(P/2,P/2,P*0.38,'#9ab0c6',40);g.fillStyle='#10161c';g.beginPath();g.arc(P/2,P/2,P*0.29,0,7);g.fill();break;
  case 'incin':box(i,i,W,W,u*0.12,col);g.fillStyle='#140806';g.beginPath();g.arc(P/2,P/2,W*0.32,0,7);g.fill();break;
  default:box(i,i,W,W,u*0.16,col);
 }
}
function bStatus(e){
 if(e.k==='mach'){if(!e.r)return['#8a96a0','No recipe'];if(e.want&&!e.pw)return['#ff5a46','No power'];if(e.run)return['#4fe08a','Working'];
  const r=RC[e.r];for(const k in r.o)if((e.outb[k]||0)+r.o[k]>capOut(r.o[k]))return['#ffa53a','Output full'];return['#ffd34a','Waiting for input'];}
 if(e.k==='drill'||e.k==='pump'){if(!e.item)return['#8a96a0','Nothing to extract'];if(e.want&&!e.pw)return['#ff5a46','No power'];if(e.buf>=10)return['#ffa53a','Output blocked'];return['#4fe08a','Extracting'];}
 if(e.k==='gen'){if(e.grid&&e.grid.trip)return['#ff5a46','Fuse tripped'];if(!genCan(e))return['#ffa53a',B[e.d].water&&e.water<1?'Needs water':'Needs fuel'];return e.load>0?['#4fe08a','Generating']:['#ffd34a','Standby'];}
 return null;
}
/* live overlays (animation on top of sprites) */
function isActive(e){if(e.k==='mach')return e.run&&e.pw>0;if(e.k==='drill'||e.k==='pump')return e.want&&e.pw>0;if(e.k==='gen')return e.load>0;return e.k==='core';}
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
 const st=bStatus(e);if(st&&s>7){const lx=X+P-s*0.36,ly=Y+s*0.36,lr=Math.max(1.6,s*0.09);glow(lx,ly,lr*3,st[0],0.45);ctx.fillStyle=st[0];ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.fill();}
 let pg=null;if(e.k==='mach'&&e.run)pg=e.prog;else if(e.k==='storage'){let t=0;for(const k in e.store)t+=e.store[k];pg=t/B[e.d].cap;}
 if(pg!==null&&s>9){const bw=P-s*0.9,bx=X+s*0.62,by=Y+P-s*0.2;ctx.fillStyle='rgba(0,0,0,0.6)';rr(bx,by,bw,s*0.08,s*0.04);ctx.fill();ctx.fillStyle='#ffb547';rr(bx,by,bw*Math.min(1,pg),s*0.08,s*0.04);ctx.fill();}
}
function drawBuilding(e,X,Y,s){
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
setS('rod','iron_rod steel_pipe steel_beam');setS('bolts','bolts');setS('coil','wire cable');setS('block','concrete cased_girder rubber coolant_block');
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
  const all=new Path2D(),byT={},fl={};
  for(const e of pipes){const X=sx(e.x),Y=sy(e.y);pathLine(all,e,X,Y,s,ext);(byT[e.d]||(byT[e.d]=new Path2D()));pathLine(byT[e.d],e,X,Y,s,ext);if(e.item){const c=IT[e.item].c;(fl[c]||(fl[c]=new Path2D()));pathLine(fl[c],e,X,Y,s,0);}}
  ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.lineWidth=s*0.54;ctx.stroke(all);
  for(const d in byT){ctx.strokeStyle=tint||B[d].col;ctx.lineWidth=s*0.46;ctx.stroke(byT[d]);}
  ctx.strokeStyle='#141a20';ctx.lineWidth=s*0.26;ctx.stroke(all);
  for(const c in fl){ctx.strokeStyle=c;ctx.lineWidth=s*0.26;ctx.stroke(fl[c]);ctx.setLineDash([s*0.08,s*0.17]);ctx.lineDashOffset=-((animT*s*1.6)%(s*0.25));ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=s*0.1;ctx.stroke(fl[c]);ctx.setLineDash([]);}
  ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.lineWidth=s*0.05;ctx.stroke(all);
  if(s>9){for(const e of pipes){if(e.cin!=null)continue;const X=sx(e.x),Y=sy(e.y),d=e.dir;ctx.fillStyle=shade(B[e.d].col,-35);const cx=X+s/2-DX[d]*s*0.5,cy=Y+s/2-DY[d]*s*0.5;if(d===0||d===2)ctx.fillRect(cx-s*0.05,cy-s*0.3,s*0.1,s*0.6);else ctx.fillRect(cx-s*0.3,cy-s*0.05,s*0.6,s*0.1);}}
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
 const W=cv.width,H=cv.height;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#123a5e';ctx.fillRect(0,0,W,H);
 const s=TS*cam.z*DPR,ox=W/2-cam.x*s,oy=H/2-cam.y*s;
 const sx=x=>ox+x*s,sy=y=>oy+y*s;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=s<TPX?'high':'low';ctx.drawImage(terrC,ox,oy,MW*s,MH*s);
 const x0=Math.max(0,Math.floor(-ox/s)-1),y0=Math.max(0,Math.floor(-oy/s)-1),x1=Math.min(MW,Math.ceil((W-ox)/s)+1),y1=Math.min(MH,Math.ceil((H-oy)/s)+1);
 // water shimmer
 if(s>=12){ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1,s*0.04);ctx.lineCap='round';
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
 drawLines(vis.filter(e=>isLine(e.k)),sx,sy,s);
 for(const e of vis)if(e.k==='router'||e.k==='cross')drawRouter(ctx,e,sx(e.x),sy(e.y),s);
 // items
 const isz=s*0.5;
 for(const e of vis){
  if(e.k==='belt'&&e.item){const [ix,iy]=itemPos(e,e.prog);drawItem(e.item,sx(ix),sy(iy),isz);}
  else if(e.k==='router'&&e.item&&!IT[e.item].f)drawItem(e.item,sx(e.x+0.5),sy(e.y+0.5),isz*0.85);
  else if(e.k==='cross'){if(e.hs&&!IT[e.hs].f)drawItem(e.hs,sx(e.x+0.5),sy(e.y+0.5),isz*0.8);if(e.vs&&!IT[e.vs].f)drawItem(e.vs,sx(e.x+0.5),sy(e.y+0.5),isz*0.8);}
 }
 for(const e of vis)if(!isLine(e.k)&&e.k!=='router'&&e.k!=='cross'&&e.k!=='pole')drawBuilding(e,sx(e.x),sy(e.y),s);
 // particles
 for(let k=parts.length-1;k>=0;k--){const p=parts[k];p.t+=fdt;if(p.t>p.m){parts.splice(k,1);continue;}p.x+=p.vx*fdt;p.y+=p.vy*fdt;}
 for(const p of parts){if(p.x<x0-2||p.x>x1+2||p.y<y0-2||p.y>y1+2)continue;const f=p.t/p.m,al=(1-f)*(f<0.15?f/0.15:1);ctx.globalAlpha=al*(p.k?0.55:0.45);ctx.fillStyle=p.k?'#eef2f5':'#3a3a3c';ctx.beginPath();ctx.arc(sx(p.x),sy(p.y),s*p.r*(1+f*1.8),0,7);ctx.fill();}
 ctx.globalAlpha=1;
 // power overlay
 const showPw=tool&&B[tool]&&(B[tool].k==='pole'||B[tool].k==='gen'||B[tool].pw);
 if(showPw){for(const p of pnodes){const c=cen(p);ctx.fillStyle='rgba(255,215,90,0.06)';ctx.strokeStyle='rgba(255,215,90,0.4)';ctx.lineWidth=1.5*DPR;ctx.setLineDash([6*DPR,5*DPR]);ctx.beginPath();ctx.arc(sx(c.x),sy(c.y),B[p.d].sup*s,0,7);ctx.fill();ctx.stroke();ctx.setLineDash([]);}}
 // wires
 for(const [a,b] of pwLinks){const A=cen(a),Bc=cen(b),tr=a.grid&&a.grid.trip;const mx=(A.x+Bc.x)/2,my=(A.y+Bc.y)/2+0.5;
  ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=Math.max(1,s*0.05);ctx.beginPath();ctx.moveTo(sx(A.x+0.3),sy(A.y+0.4));ctx.quadraticCurveTo(sx(mx+0.3),sy(my+0.6),sx(Bc.x+0.3),sy(Bc.y+0.4));ctx.stroke();
  ctx.strokeStyle=tr?'rgba(255,80,60,0.9)':'rgba(24,22,20,0.85)';ctx.lineWidth=Math.max(1,s*0.045);ctx.beginPath();ctx.moveTo(sx(A.x),sy(A.y));ctx.quadraticCurveTo(sx(mx),sy(my),sx(Bc.x),sy(Bc.y));ctx.stroke();}
 for(const e of vis)if(e.k==='pole')drawPole(ctx,e,sx(e.x),sy(e.y),s);
 // previews
 if(linePrev){const fake=linePrev.path.map((p,k,arr)=>{const prev=arr[k-1];const o={x:p.x,y:p.y,dir:p.d,d:linePrev.id,k:B[linePrev.id].k,spd:B[linePrev.id].spd,cin:null};if(prev&&prev.d!==p.d)o.cin=prev.d;return o;});
  const bad=fake.filter(f=>{const why=canPlace(linePrev.id,f.x,f.y);return why&&!(why==='Blocked'&&entAt(f.x,f.y)&&entAt(f.x,f.y).k===B[linePrev.id].k);});
  drawLines(fake,sx,sy,s,0.7);for(const f of bad){ctx.fillStyle='rgba(255,70,50,0.45)';ctx.fillRect(sx(f.x),sy(f.y),s,s);}
  const n=fake.length,cost=B[linePrev.id].cost;const last=fake[n-1];const okA=afford(cost,n);ctx.font=`600 ${12*DPR}px Inter,system-ui,sans-serif`;const txt=`${n} × ${B[linePrev.id].n}`;const tw=ctx.measureText(txt).width;const lx=sx(last.x+0.5)-tw/2-8*DPR,ly=sy(last.y)-26*DPR;ctx.fillStyle=okA?'rgba(14,20,27,0.85)':'rgba(120,30,20,0.9)';rr(lx,ly,tw+16*DPR,20*DPR,8*DPR);ctx.fill();ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.fillText(txt,lx+8*DPR,ly+10*DPR);}
 else if(hover&&tool&&B[tool]){const d=B[tool],fp=footprint(tool,hover.x,hover.y),why=canPlace(tool,fp.x,fp.y),bad=why&&!(why==='Blocked'&&isLine(d.k)&&entAt(hover.x,hover.y)&&entAt(hover.x,hover.y).k===d.k);
  const X=sx(fp.x),Y=sy(fp.y),P=d.w*s;
  if(isLine(d.k))drawLines([{x:fp.x,y:fp.y,dir:UI.rot,d:tool,k:d.k,spd:d.spd,cin:null}],sx,sy,s,0.75);
  else if(d.k==='router'||d.k==='cross'){ctx.globalAlpha=0.75;drawRouter(ctx,{d:tool,k:d.k,dir:UI.rot},X,Y,s);ctx.globalAlpha=1;}
  else if(d.k==='pole'){ctx.globalAlpha=0.8;drawPole(ctx,{d:tool},X,Y,s);ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,215,90,0.6)';ctx.setLineDash([5*DPR,5*DPR]);ctx.beginPath();ctx.arc(X+s/2,Y+s/2,d.link*s,0,7);ctx.stroke();ctx.setLineDash([]);}
  else blit(tool,X,Y,s,0.7);
  ctx.strokeStyle=bad?'#ff5a46':'#6ef08a';ctx.lineWidth=2*DPR;rr(X+1,Y+1,P-2,P-2,s*0.15);ctx.stroke();ctx.fillStyle=bad?'rgba(255,70,50,0.18)':'rgba(110,240,138,0.1)';ctx.fill();}
 else if(hover&&tool==='del'){const e=entAt(hover.x,hover.y);ctx.strokeStyle='#ff5a46';ctx.lineWidth=2*DPR;if(e&&e.k!=='core'){ctx.fillStyle='rgba(255,70,50,0.2)';rr(sx(e.x),sy(e.y),e.w*s,e.h*s,s*0.15);ctx.fill();ctx.stroke();}else{rr(sx(hover.x),sy(hover.y),s,s,s*0.15);ctx.stroke();}}
 else if(hover&&!tool&&!G){const e=entAt(hover.x,hover.y);if(e&&e.id!==UI.sel){ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.5*DPR;rr(sx(e.x)+1,sy(e.y)+1,e.w*s-2,e.h*s-2,s*0.18);ctx.stroke();}}
 if(UI.sel&&ents.has(UI.sel)){const e=ents.get(UI.sel),X=sx(e.x)-3*DPR,Y=sy(e.y)-3*DPR,P=e.w*s+6*DPR;ctx.strokeStyle='rgba(255,181,71,0.25)';ctx.lineWidth=7*DPR;rr(X,Y,P,P,s*0.2);ctx.stroke();ctx.strokeStyle='#ffb547';ctx.lineWidth=2*DPR;ctx.setLineDash([7*DPR,5*DPR]);ctx.lineDashOffset=-animT*24*DPR;ctx.stroke();ctx.setLineDash([]);}
 // clouds
 if(cloudC){const cs=2.2*s,off=animT*0.5;const bx=((off*s)%(128*cs));ctx.globalAlpha=0.8;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const X=ox-bx+i*128*cs+MW*s/2-64*cs,Y=oy-bx*0.4+j*128*cs+MH*s/2-64*cs;if(X>W||Y>H||X+128*cs<0||Y+128*cs<0)continue;ctx.drawImage(cloudC,X,Y,128*cs,128*cs);}ctx.globalAlpha=1;}
 // vignette
 const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.45)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}
