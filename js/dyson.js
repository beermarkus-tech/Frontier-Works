'use strict';
/* ================= DYSON SPHERE (Session 62, DESIGN.md section 12) =================
   Stage 1, Sphere Frame: Sphere Launchers (k 'slaunch', Home only, 8×8) take Sphere Frame Segments by belt and fire one every DYSON.fire
   seconds while powered (4000 MW while charging). Segments in orbit are counted in S.dyson.f (shared). When a stage is complete its
   unlocks are granted (Sphere Receiver: 2500 MW, no fuel). The frame is drawn growing around the sun in the 3D sky (both worlds).
   Stage 2 (Session 64), Sphere Panels: the launchers then take Sphere Panels instead (DYSON.stages[i].it); finished, every Sphere
   Receiver gives stages[i].cap MW (dysonApply sets B.srecv.cap; called at load and when a stage completes). Panels fill in a disc in 3D. */
const dyS=()=>(S.dyson=S.dyson||{f:0});
function dysonStage(){const D=dyS();let left=D.f;for(let i=0;i<DYSON.stages.length;i++){const st=DYSON.stages[i];if(!st.need)return{i,st,have:0,done:false,soon:true};if(left<st.need)return{i,st,have:left,done:false};left-=st.need;}return{i:DYSON.stages.length,done:true};}
const dysonFrac=()=>Math.min(1,dyS().f/DYSON.stages[0].need);
const dysonFrac2=()=>Math.max(0,Math.min(1,(dyS().f-DYSON.stages[0].need)/DYSON.stages[1].need));
/* the item launchers take now (the last real stage's item once complete or waiting for the next chapter, so nothing is wasted) */
function dysonItem(){const c=dysonStage();let i=c.i;while(i>0&&(!DYSON.stages[i]||!DYSON.stages[i].it))i--;return DYSON.stages[i].it;}
function dysonApply(){const c=dysonStage();let cap=B.srecv.cap0||(B.srecv.cap0=B.srecv.cap);for(let i=0;i<c.i;i++)if(DYSON.stages[i].cap)cap=DYSON.stages[i].cap;B.srecv.cap=cap;
 B.srecv.desc=`Receives power beamed down from the Dyson Sphere: ${cap} MW, no fuel.${cap<DYSON.stages[1].cap?` ${DYSON.stages[1].cap} MW once the Sphere Panels are done.`:''} Home only.`;}
function updLauncher(e,dt){const cur=dysonStage(),it=cur.st&&cur.st.it,ok=!cur.soon&&!cur.done&&!!it&&(e.store[it]||0)>0;e.want=ok;if(!ok){e.ch=0;return;}
 if(e.pw>0){e.ch+=dt;if(e.ch>=DYSON.fire){e.ch=0;e.store[it]--;if(!e.store[it])delete e.store[it];dyS().f++;e.fl=S.t;stat.c[it]=(stat.c[it]||0)+1;
  const now=dysonStage();if(now.i>cur.i){for(const b of cur.st.b||[])if(!ub(b))S.ub.push(b);dysonApply();if(typeof dysonDone==='function')dysonDone(cur.st);}}}}
function dysonDone(st){sfx('goal');const txt=st.it==='sphere_frame'?`The frame now circles the sun. Unlocked: ${(st.b||[]).map(b=>B[b].n).join(', ')}: power beamed down to Home, no fuel needed.`:`The panels catch far more sunlight: every Sphere Receiver now gives ${B.srecv.cap} MW.`;
 dialog(`<h2>☀ Dyson Sphere: ${st.n} complete!</h2><p>${txt} Look up in 3D to see it.</p><button class="btn on" data-act="closeDlg">Beautiful</button>`);if(typeof buildTools==='function')buildTools();save();}
function dysonLabel(){const c=dysonStage();return c.done?'☀ Complete':c.soon?'☀ Stage '+(c.i+1)+' soon':'☀ Sphere '+Math.round(c.have/c.st.need*100)+'%';}
/* Goals panel card (Home view, after the tiers) */
function dysonHtml(){if(!ub('slaunch'))return'';const D=dyS(),c=dysonStage(),ls=[...ents.values()].filter(e=>e.k==='slaunch');let h=`<h4>☀ Dyson Sphere</h4>`;
 DYSON.stages.forEach((st,i)=>{const done=i<c.i||c.done,cur=i===c.i&&!c.done;h+=`<div class="card ${done?'done':''} ${cur?'cur':''}"><b>${done?'✓ ':''}Stage ${i+1}: ${st.n}</b>`;
  if(st.soon){h+=`<div class="muted">${st.soon}</div></div>`;return;}h+=`<div class="muted" style="margin:2px 0 4px">${st.why}</div>`;
  if(cur){h+=`<div class="row"><span>${nm(st.it)} in orbit</span><span><b>${c.have}</b> / ${st.need}</span></div><div class="bar"><i style="width:${c.have/st.need*100}%"></i></div>
   <div class="muted">${ls.length?`${ls.length} Sphere Launcher${ls.length>1?'s':''}: one ${IT[st.it].n} every ${DYSON.fire} s each while powered.`:(S.w||'home')==='home'?`Build a Sphere Launcher (Transport tab) and belt ${IT[st.it].n}s into it.`:'Sphere Launchers stand on Home.'}</div>`;}
  if(st.b&&st.b.length&&!done)h+=`<div class="muted" style="margin-top:4px">Unlocks: ${st.b.map(b=>B[b].n).join(', ')}</div>`;h+=`</div>`;});
 return h;}
function launcherDyn(e){if(e.k!=='slaunch')return'';const c=dysonStage(),it=dysonItem(),n=e.store[it]||0;
 return`<div class="row"><span>${nm(it)} loaded</span><span>${n}/${DYSON.store}</span></div><div class="row"><span>Charging</span><span>${c.done||c.soon?'stage complete':n?Math.round(e.ch/DYSON.fire*100)+'%':'waiting for '+IT[it].n+'s'}</span></div><div class="bar"><i style="width:${e.ch/DYSON.fire*100}%"></i></div>
  <div class="row"><span>Sphere in orbit</span><span>${dyS().f} pieces${c.st&&c.st.need?` · stage ${c.i+1}: ${c.have}/${c.st.need}`:''}</span></div>`;}

/* ---------- 2D: charge glow and a launch streak ---------- */
function drawLaunchers(sx,sy,s){for(const e of ents.values()){if(e.k!=='slaunch')continue;const X=sx(e.x+4),Y=sy(e.y+4);if(X<-10*s||Y<-20*s||X>cv.width+10*s||Y>cv.height+10*s)continue;
  if(e.ch>0)glow(X,Y,s*(1.2+e.ch/DYSON.fire*2),'#7fd6ff',0.3+0.5*e.ch/DYSON.fire);
  if(e.fl!=null&&S.t-e.fl<1.2){const t=(S.t-e.fl)/1.2,len=s*30*t;const g=ctx.createLinearGradient(X,Y,X,Y-len);g.addColorStop(0,'rgba(255,240,200,0)');g.addColorStop(1,'rgba(255,220,140,'+(1-t)+')');ctx.strokeStyle=g;ctx.lineWidth=s*0.35;ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X,Y-len);ctx.stroke();glow(X,Y-len,s*1.2,'#ffd27a',1-t);}}}

/* ---------- 3D: the sun and the growing frame ring in the sky ---------- */
function v3Dyson(){if(!V3.scene)return;const f=dysonFrac();if(!V3.dy){const g=new T3.Group();
  const sc=document.createElement('canvas');sc.width=sc.height=128;const c=sc.getContext('2d'),gr=c.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,250,230,1)');gr.addColorStop(0.25,'rgba(255,230,160,0.9)');gr.addColorStop(1,'rgba(255,200,100,0)');c.fillStyle=gr;c.fillRect(0,0,128,128);
  const sun=new T3.Sprite(new T3.SpriteMaterial({map:new T3.CanvasTexture(sc),fog:false,depthWrite:false,transparent:true}));sun.scale.set(70,70,1);g.add(sun);
  const N=48,seg=[];for(let k=0;k<N;k++){const m=new T3.Mesh(new T3.BoxGeometry(1,1,1),new T3.MeshBasicMaterial({color:'#e8a030',fog:false}));const a=k/N*Math.PI*2;m.position.set(Math.cos(a)*55,Math.sin(a)*55,0);m.rotation.z=a+Math.PI/2;m.scale.set(7.5,2.2,2.2);g.add(m);seg.push(m);}
  const N2=24,seg2=[];for(let k=0;k<N2;k++){const m=new T3.Mesh(new T3.BoxGeometry(1,1,1),new T3.MeshBasicMaterial({color:'#d89428',fog:false}));const a=k/N2*Math.PI*2;m.position.set(Math.cos(a)*55,0,Math.sin(a)*55);m.rotation.y=-a;m.scale.set(1.8,1.8,14.6);g.add(m);seg2.push(m);}
  const pan=[];for(let r=0;r<4;r++){const n=12+r*6,rad=40-r*8;for(let k=0;k<n;k++){const m=new T3.Mesh(new T3.BoxGeometry(1,1,1),new T3.MeshBasicMaterial({color:r%2?'#ffcf5a':'#f0b840',fog:false,transparent:true,opacity:0.85}));const a=(k+r*0.5)/n*Math.PI*2;
   m.position.set(Math.cos(a)*rad,Math.sin(a)*rad,1);m.rotation.z=a;m.scale.set(6.5,2*Math.PI*rad/n*0.8,0.6);g.add(m);pan.push(m);}}   /* stage 2 (Session 64): panel tiles in rings inside the frame */
  g.renderOrder=-9;g.traverse(o=>{o.renderOrder=-9;});V3.dy={g,seg,seg2,pan};V3.scene.add(g);}
 const D=V3.dy,cp=V3.camera.position,k=(V3.camera.far||1500)/1500,dir=new T3.Vector3(-40,-0.5,-28).normalize();   /* low in the north-west sky, so the camera can see it */
 D.g.position.set(cp.x+dir.x*700*k,cp.y+dir.y*700*k,cp.z+dir.z*700*k);D.g.scale.setScalar(k*0.9);D.g.lookAt(cp);D.g.rotateZ(animT*0.02);
 D.seg.forEach((m,i)=>{m.visible=i<Math.round(f*D.seg.length*1.0001)&&f>0;});D.seg2.forEach((m,i)=>{m.visible=f>=0.5&&i<Math.round((f-0.5)*2*D.seg2.length);});
 const f2=dysonFrac2();D.pan.forEach((m,i)=>{m.visible=f2>0&&i<Math.round(f2*D.pan.length*1.0001);});
 D.g.children[0].visible=f>0||(S.w||'home')!=='home';}
