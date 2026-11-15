/* ---------- Blueprints (Session 48, reworked 48b) ----------
   A Blueprint Station (k 'bpst', 12×12, needs power; Signs tab) is a design table on the map. Building and belt tools used inside it
   place free DESIGN PIECES (st.dsg = [{d, x, y, dir, s:{settings}}], x/y relative to the station) that don't run and cost nothing.
   Tap a piece to set its recipe / splitter rules / valve limit / sign text, rotate or remove it; Dismantle inside the station removes pieces.
   The station's panel saves the design as a named blueprint, loads one back in to change it, and starts building one elsewhere.
   Blueprints are stored per device in localStorage (frontierworks_bp), so they work on every map (and later every world).
   A blueprint = {name, w, h, items:[{d, x, y, dir, s}]} trimmed to its pieces. Building from one ('bppaste', UI.bp): the outline (UI.bpAt) starts in the middle
   of the view; tap / long-press-drag moves it, ⟳ (UI.rot) turns it, the bar's Build here builds it (pays, reports what's missing), Cancel stops. */
const BP_KEY='frontierworks_bp',BP_SET=['r','clock','lr','vr','vm','tx','tc','off'];
let BPS=[];try{const v=JSON.parse(localStorage.getItem(BP_KEY)||'[]');if(Array.isArray(v))BPS=v.filter(b=>b&&Array.isArray(b.items));}catch(e){}
function bpSave(){try{localStorage.setItem(BP_KEY,JSON.stringify(BPS));}catch(e){toast('Blueprints could not be stored on this device');}}
const bpEsc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ----- design pieces inside a station ----- */
const pw1=q=>(B[q.d]&&B[q.d].w)||1;
function stOf(x,y){const e=entAt(x,y);return e&&e.k==='bpst'?e:null;}
function dsgAt(st,x,y){const lx=x-st.x,ly=y-st.y;return (st.dsg||[]).findIndex(q=>{const w=pw1(q);return lx>=q.x&&lx<q.x+w&&ly>=q.y&&ly<q.y+w;});}
function dsgPlace(st,id,x,y,dir){const d=B[id];if(!d||d.k==='bpst'||d.k==='core'||d.k==='zonetool')return 'That can’t go into a design';if(!ub(id))return 'Not unlocked yet';
 const w=d.w,lx=x-st.x,ly=y-st.y;if(lx<0||ly<0||lx+w>st.w||ly+w>st.w)return 'Outside the design area';st.dsg=st.dsg||[];
 for(let j=0;j<w;j++)for(let i=0;i<w;i++){const k=dsgAt(st,x+i,y+j);if(k<0)continue;const o=st.dsg[k];
  if(w===1&&isLine(d.k)&&B[o.d]&&B[o.d].k===d.k){st.dsg.splice(k,1);continue;}   /* drawing a belt over a belt replaces it (new direction / tier) */
  return 'Blocked';}
 st.dsg.push({d:id,x:lx,y:ly,dir:dir||0,s:{}});return '';}
function dsgDelAt(t){const st=stOf(t.x,t.y);if(!st)return false;const k=dsgAt(st,t.x,t.y);if(k>=0){st.dsg.splice(k,1);sfx('del');}return true;}
/* belt/pipe curves between design pieces, so designs look like the real thing */
function dsgLines(st){const L=(st.dsg||[]).filter(q=>B[q.d]&&isLine(B[q.d].k)),at=new Map(L.map(q=>[q.x+','+q.y,q]));
 return L.map(q=>{const k=B[q.d].k,bk=at.get((q.x-DX[q.dir])+','+(q.y-DY[q.dir]));let cin=null;
  if(!(bk&&B[bk.d].k===k&&bk.dir===q.dir)){let c=0,f=null;for(const o of [(q.dir+1)&3,(q.dir+3)&3]){const sd=at.get((q.x+DX[o])+','+(q.y+DY[o]));if(sd&&B[sd.d].k===k&&sd.dir===((o+2)&3)){f=(o+2)&3;c++;}}if(c===1)cin=f;}
  return{d:q.d,k,x:st.x+q.x,y:st.y+q.y,dir:q.dir,w:1,h:1,cin,spd:B[q.d].spd||1};});}
/* one piece drawn the way the game draws the real building, see-through */
function drawPiece(q,X,Y,s){const d=B[q.d];if(!d)return;const w=pw1(q),f={d:q.d,k:d.k,x:q.x,y:q.y,dir:q.dir,w,h:w,cin:null,lr:q.s&&q.s.lr,vr:q.s&&q.s.vr!=null?q.s.vr:60,tx:q.s&&q.s.tx,tc:q.s&&q.s.tc};
 if(d.k==='sign')drawSign(ctx,f,X,Y,w*s);else if(d.k==='router'||d.k==='cross')drawRouter(ctx,f,X,Y,s);else if(d.k==='pole')drawPole(ctx,f,X,Y,s);else if(!isLine(d.k))blit(q.d,X,Y,s,ctx.globalAlpha);}
/* the station: a blueprint-blue table with a grid, its name, and the design on top */
function drawStation(e,X,Y,s){const P=e.w*s,on=e.pw>0;ctx.save();
 ctx.fillStyle=on?'#163d6b':'#1c2a3a';ctx.fillRect(X,Y,P,P);ctx.strokeStyle='rgba(160,205,255,0.16)';ctx.lineWidth=1;ctx.beginPath();
 for(let i=1;i<e.w;i++){ctx.moveTo(X+i*s,Y);ctx.lineTo(X+i*s,Y+P);ctx.moveTo(X,Y+i*s);ctx.lineTo(X+P,Y+i*s);}ctx.stroke();
 ctx.strokeStyle=on?'#8fc6ff':'#5a6a7a';ctx.lineWidth=Math.max(1.5,s*0.08);ctx.strokeRect(X+1,Y+1,P-2,P-2);
 if(s>=10){ctx.fillStyle=on?'rgba(200,228,255,0.75)':'rgba(255,120,100,0.85)';ctx.font=`700 ${Math.max(9,Math.round(s*0.42))}px Rajdhani,Inter,sans-serif`;ctx.textBaseline='bottom';
  ctx.fillText((on?'BLUEPRINT':'BLUEPRINT · NO POWER')+(e.dn?' · '+e.dn:''),X+s*0.3,Y+P-s*0.2);}
 if(e.dsg&&e.dsg.length){ctx.globalAlpha=on?0.85:0.5;const sx=x=>X+(x-e.x)*s,sy=y=>Y+(y-e.y)*s;const ln=dsgLines(e);if(ln.length)drawLines(ln,sx,sy,s,ctx.globalAlpha);
  for(const q of e.dsg)if(!isLine(B[q.d]?B[q.d].k:''))drawPiece(q,X+q.x*s,Y+q.y*s,s);}
 ctx.restore();}
/* save the station's design as a blueprint (trimmed to its pieces); same name = replace */
function stSave(st,name){if(!st.dsg||!st.dsg.length){toast('The design is empty');return null;}
 let x0=1e9,y0=1e9,x1=-1,y1=-1;for(const q of st.dsg){const w=pw1(q);x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x+w-1);y1=Math.max(y1,q.y+w-1);}
 const bp={name:String(name||'Blueprint').slice(0,30),w:x1-x0+1,h:y1-y0+1,ox:x0,oy:y0,items:st.dsg.map(q=>({d:q.d,x:q.x-x0,y:q.y-y0,dir:q.dir,s:JSON.parse(JSON.stringify(q.s||{}))})),t:Date.now()};
 const i=BPS.findIndex(b=>b.name===bp.name);if(i>=0)BPS[i]=bp;else{BPS.unshift(bp);if(BPS.length>40)BPS.length=40;}bpSave();return bp;}
function stLoad(st,bp){if(bp.w>st.w||bp.h>st.w)return 'Too big for this station';
 /* back where it was saved (Session 48d); if that doesn't fit this station, as far in as possible */
 const ox=Math.max(0,Math.min(st.w-bp.w,bp.ox|0)),oy=Math.max(0,Math.min(st.w-bp.h,bp.oy|0));
 st.dsg=bp.items.map(o=>({d:o.d,x:o.x+ox,y:o.y+oy,dir:o.dir,s:JSON.parse(JSON.stringify(o.s||{}))}));st.dn=bp.name;return '';}
/* ----- building from a blueprint ----- */
function bpLayout(bp,rot,at){let W=bp.w,H=bp.h,it=bp.items.map(o=>Object.assign({},o,{w:(B[o.d]&&B[o.d].w)||1}));
 for(let k=0;k<(rot&3);k++){const h0=H;it=it.map(o=>Object.assign({},o,{x:h0-o.y-o.w,y:o.x,dir:(o.dir+1)&3}));[W,H]=[H,W];}
 const ox=at.x-Math.floor(W/2),oy=at.y-Math.floor(H/2);return{W,H,ox,oy,it:it.map(o=>Object.assign(o,{x:o.x+ox,y:o.y+oy}))};}
function bpFits(q){const ex=entAt(q.x,q.y);if(ex&&ex.d===q.d&&ex.x===q.x&&ex.y===q.y)return true;if(B[q.d]&&isLine(B[q.d].k)&&ex&&ex.k===B[q.d].k)return true;return canPlace(q.d,q.x,q.y)==='';}
function bpPaste(at){const bp=BPS[UI.bp];if(!bp)return;const L=bpLayout(bp,UI.rot,at);let ok=0,have=0,blocked=0,locked=0;const miss={};
 const order=L.it.slice().sort((a,b)=>(isLine(B[a.d]?B[a.d].k:'')?1:0)-(isLine(B[b.d]?B[b.d].k:'')?1:0));   /* buildings first, then belts and pipes */
 for(const q of order){if(!B[q.d]||!ub(q.d)){locked++;continue;}
  const ex=entAt(q.x,q.y);if(ex&&ex.d===q.d&&ex.x===q.x&&ex.y===q.y&&(ex.dir===q.dir||!isLine(ex.k))){have++;continue;}
  const why=placeEnt(q.d,q.x,q.y,q.dir);
  if(!why||why==='same'){const e=entAt(q.x,q.y);if(e)for(const k in q.s){if(k==='r'&&!(RC[q.s.r]&&ur(q.s.r)))continue;e[k]=JSON.parse(JSON.stringify(q.s[k]));}ok++;}
  else if(why==='Not enough materials')miss[q.d]=(miss[q.d]||0)+1;else blocked++;}
 topoDirty=true;refreshTools();updInfo();sfx(ok?'place':'deny');
 const ms=Object.keys(miss),parts=[`Built ${ok} of ${L.it.length}`];if(have)parts.push(`${have} already there`);
 if(ms.length)parts.push('not enough materials for '+ms.map(d=>`${B[d].n} ×${miss[d]}`).join(', '));if(blocked)parts.push(`${blocked} blocked`);if(locked)parts.push(`${locked} not unlocked yet`);
 toast(parts.join(' · '));return{ok,have,blocked,locked,miss};}
function bpCost(bp){const c={};for(const o of bp.items){const d=B[o.d];if(!d)continue;for(const k in d.cost)c[k]=(c[k]||0)+d.cost[k];}return c;}
/* placing (Session 48c): the outline starts in the middle of the view; a tap moves it there, a long press inside it (mouse: just drag)
   slides it, and nothing is built until "Build here" in the bar (#bpbar: Rotate · Build here · Cancel) */
function bpInside(t){const bp=BPS[UI.bp];if(!bp||!UI.bpAt||!t)return false;const L=bpLayout(bp,UI.rot,UI.bpAt);return t.x>=L.ox&&t.x<L.ox+L.W&&t.y>=L.oy&&t.y<L.oy+L.H;}
function bpGrab(g){g.type='bpmove';g.off={x:g.t0.x-UI.bpAt.x,y:g.t0.y-UI.bpAt.y};}
function bpArm(g,t,mouse){if(UI.tool!=='bppaste'||!bpInside(t))return;g.bpIn=true;if(mouse)return;
 g.lp=setTimeout(()=>{if(g.type!=='pending')return;bpGrab(g);try{navigator.vibrate&&navigator.vibrate(18);}catch(_){}sfx('click');},380);}
function bpDrag(g,t){if(t)UI.bpAt={x:t.x-g.off.x,y:t.y-g.off.y};}
function bpTap(t){if(UI.tool!=='bppaste')return false;const bp=BPS[UI.bp];if(!bp){setTool(null);return true;}
 if(!bpInside(t))UI.bpAt={x:t.x,y:t.y};return true;}
function bpBar(){const el=document.getElementById('bpbar');if(el)el.classList.toggle('show',UI.tool==='bppaste'&&!!BPS[UI.bp]);}
function bpViewMid(){const x=V3.on?C3.x:cam.x,y=V3.on?C3.y:cam.y;return{x:Math.max(0,Math.min(MW-1,Math.floor(x))),y:Math.max(0,Math.min(MH-1,Math.floor(y)))};}
function drawBpGhost(sx,sy,s){if(UI.tool!=='bppaste'||!UI.bpAt)return;const bp=BPS[UI.bp];if(!bp)return;const L=bpLayout(bp,UI.rot,UI.bpAt);
 ctx.save();ctx.globalAlpha=0.55;const ln=[];
 for(const q of L.it){const d=B[q.d];if(!d)continue;if(isLine(d.k))ln.push({d:q.d,k:d.k,x:q.x,y:q.y,dir:q.dir,w:1,h:1,cin:null,spd:d.spd||1});else drawPiece(q,sx(q.x),sy(q.y),s);}
 if(ln.length)drawLines(ln,sx,sy,s,0.55);
 for(const q of L.it)if(!bpFits(q)){ctx.globalAlpha=0.45;ctx.fillStyle='#ff4a3a';ctx.fillRect(sx(q.x),sy(q.y),q.w*s,q.w*s);}
 ctx.globalAlpha=1;ctx.strokeStyle='#6ef08a';ctx.lineWidth=2*DPR;ctx.setLineDash([6*DPR,4*DPR]);ctx.strokeRect(sx(L.ox),sy(L.oy),L.W*s,L.H*s);ctx.setLineDash([]);ctx.restore();}
function bpGhost3D(gh){if(UI.tool!=='bppaste'||!UI.bpAt)return false;const bp=BPS[UI.bp];if(!bp)return false;const L=bpLayout(bp,UI.rot,UI.bpAt);
 for(const q of L.it){const d=B[q.d];if(!d)continue;gh.push([q.x,q.y,q.w,isLine(d.k)?0.12:Math.min(2.2,(V3.M[q.d]&&V3.M[q.d].h)||1),!bpFits(q)]);}return true;}
/* 3D: design pieces of stations near the camera as ghost boxes */
function stGhost3D(gh){for(const e of ents.values()){if(e.k!=='bpst'||!e.dsg||Math.abs(e.x+6-C3.x)>C3.dist*1.5+20||Math.abs(e.y+6-C3.y)>C3.dist*1.5+20)continue;
 for(const q of e.dsg){const d=B[q.d];if(!d||gh.length>900)continue;gh.push([e.x+q.x,e.y+q.y,pw1(q),isLine(d.k)?0.12:Math.min(2.2,(V3.M[q.d]&&V3.M[q.d].h)||1),false]);}}}
/* ----- panels ----- */
/* the Blueprint List (Blueprints tab): works without a station */
function bplibHtml(){let h='<div class="muted">Your saved blueprints. Build one anywhere, or delete it. To design a new one or change one, use a Blueprint Station (also in the Blueprints tab).</div>';
 if(!BPS.length)return h+'<div class="muted" style="margin-top:6px">None yet.</div>';
 return h+BPS.map((bp,i)=>{const ok=afford(bpCost(bp));return`<div class="card"><div class="row"><b>${bpEsc(bp.name)}</b><span>${bp.w}×${bp.h} · ${bp.items.length} pieces</span></div>${costHtml(bpCost(bp))}
  <div class="chips" style="margin-top:4px"><button class="btn chip on" data-act="bpUse" data-v="${i}">Build</button><button class="btn chip" data-act="bpDel" data-v="${i}">✕ Delete</button></div>${ok?'':'<div class="muted">Not enough materials to build it all right now.</div>'}</div>`;}).join('');}
function stHtml(e){const on=e.pw>0,c=bpCost({items:e.dsg||[]});let h=`<h4>Design</h4>`;
 if(!on)h+=`<div class="plbad" style="margin:2px 0 6px">⚠ No power: connect the station to a pole to save or load blueprints.</div>`;
 h+=`<div class="muted">Pick a building or belt below and place it inside the blue area: it becomes a free design piece that doesn't run. Tap a piece to set its recipe or rules. Dismantle removes pieces.</div>
  <input class="signtxt" data-act="stName" maxlength="30" placeholder="Name of this blueprint" value="${bpEsc(e.dn||'')}">
  <div class="row"><span>${(e.dsg||[]).length} pieces</span><span>${costHtml(c)}</span></div>
  <div class="btnrow"><button class="btn" data-act="stSave" ${on?'':'disabled'}>💾 Save blueprint</button><button class="btn" data-act="stClear">Clear design</button></div>`;
 h+=`<h4>Your blueprints</h4>`;
 if(!BPS.length)return h+'<div class="muted">None yet. Design something above and save it.</div>';
 return h+BPS.map((bp,i)=>{const fits=bp.w<=e.w&&bp.h<=e.w,ok=afford(bpCost(bp));return`<div class="card"><div class="row"><b>${bpEsc(bp.name)}</b><span>${bp.w}×${bp.h} · ${bp.items.length} pieces</span></div>
  <div class="chips"><button class="btn chip on" data-act="bpUse" data-v="${i}">Build elsewhere</button><button class="btn chip" data-act="stLoad" data-v="${i}" ${on&&fits?'':'disabled'} title="${fits?'':'Too big for this station'}">Load to change</button><button class="btn chip" data-act="bpDel" data-v="${i}">✕ Delete</button></div>
  ${ok?'':'<div class="muted">Not enough materials to build it all right now.</div>'}</div>`;}).join('');}
function dsgHtml(a){const st=ents.get(a.st),q=st&&st.dsg&&st.dsg[a.i];if(!q)return'<div class="muted">This piece is gone.</div>';const d=B[q.d];q.s=q.s||{};
 let h=`<div class="muted">A design piece in ${bpEsc(st.dn||'the Blueprint Station')}: it doesn't run. Its settings are saved with the blueprint.</div>
  <div class="btnrow"><button class="btn" data-act="dsgRot">⟳ Rotate</button><button class="btn" data-act="dsgDel">✕ Remove</button></div>`;
 if(d.k==='mach'){const rs=RL.filter(r=>r.m===q.d&&ur(r.id));h+=`<h4>Recipe</h4><select class="wide" data-dsg="r"><option value="">— none —</option>${rs.map(r=>`<option value="${r.id}" ${q.s.r===r.id?'selected':''}>${bpEsc(r.n)}</option>`).join('')}</select>`;}
 if(d.k==='router'&&d.sub==='logic'){const L=q.s.lr||{l:['any'],f:['any'],r:['any']},items=Object.keys(IT).filter(k=>!IT[k].f).sort((x,y)=>IT[x].n.localeCompare(IT[y].n));
  const opt=(k)=>{const v=(L[k]&&L[k][0])||'';return`<option value="" ${v===''?'selected':''}>Blocked</option><option value="any" ${v==='any'?'selected':''}>Any</option><option value="rest" ${v==='rest'?'selected':''}>Any other</option><option value="over" ${v==='over'?'selected':''}>Overflow</option>${items.map(x=>`<option value="${x}" ${v===x?'selected':''}>${bpEsc(IT[x].n)}</option>`).join('')}`;};
  h+=`<h4>Splitter rules</h4>`+[['l','Left'],['f','Front'],['r','Right']].map(([k,n])=>`<div class="row"><span>${n}</span><select data-dsg="lr.${k}">${opt(k)}</select></div>`).join('');}
 if(d.k==='router'&&d.sub==='valve')h+=`<h4>Flow limit</h4><div class="row"><span>m³/min</span><select data-dsg="vr">${[0,30,60,120,180,240,300,450,600].map(v=>`<option value="${v}" ${(q.s.vr==null?60:q.s.vr)===v?'selected':''}>${v}${v?'':' (shut)'}</option>`).join('')}</select></div><div class="row"><span>Mode</span><select data-dsg="vm"><option value="0" ${q.s.vm?'':'selected'}>Fixed limit</option><option value="1" ${q.s.vm?'selected':''}>Top up</option></select></div>`;
 if(d.k==='sign')h+=`<h4>Text</h4><input class="signtxt" data-act="dsgText" maxlength="60" value="${bpEsc(q.s.tx||'')}">`;
 return h;}
const dsgCur=()=>{const a=UI.panel&&UI.panel.kind==='dsg'&&UI.panel.arg,st=a&&ents.get(a.st);return st&&st.dsg&&st.dsg[a.i]?{st,q:st.dsg[a.i]}:null;};
Object.assign(ACT,{
 bpUse:v=>{if(!BPS[+v])return;UI.bp=+v;UI.rot=0;UI.rotA=0;setTool('bppaste');UI.bpAt=bpViewMid();closePanel();toast('Move it into place, then Build here');},
 bpRot:()=>{ACT.rotate();},
 bpGo:()=>{if(UI.tool==='bppaste'&&UI.bpAt)bpPaste(UI.bpAt);},
 bpCancel:()=>{setTool(null);},
 bpDel:v=>{const i=+v;if(!BPS[i])return;dialog(`<h2>Delete “${bpEsc(BPS[i].name)}”?</h2><button class="btn warn" data-act="bpDelYes" data-v="${i}">Delete</button> <button class="btn" data-act="closeDlg">Keep</button>`);},
 bpDelYes:v=>{const i=+v;BPS.splice(i,1);bpSave();if(UI.tool==='bppaste')setTool(null);closeDlg();if(UI.panel)renderPanel(true);},
 stSave:()=>{const e=ents.get(UI.panel.arg);if(!e||e.k!=='bpst')return;if(!(e.pw>0)){toast('The station needs power');return;}let n=(e.dn||'').trim();
  if(!n){let k=BPS.length+1;while(BPS.some(b=>b.name==='Blueprint '+k))k++;n='Blueprint '+k;e.dn=n;}
  const had=BPS.some(b=>b.name===n),bp=stSave(e,n);if(bp){toast(`${had?'Updated':'Saved'} “${bp.name}” (${bp.w}×${bp.h}, ${bp.items.length} pieces)`);sfx('place');}renderPanel(true);},
 stClear:()=>{const e=ents.get(UI.panel.arg);if(!e||!e.dsg||!e.dsg.length)return;dialog(`<h2>Clear the design?</h2><p>Saved blueprints are not affected.</p><button class="btn warn" data-act="stClearYes">Clear</button> <button class="btn" data-act="closeDlg">Keep</button>`);},
 stClearYes:()=>{const e=UI.panel&&ents.get(UI.panel.arg);if(e&&e.k==='bpst'){e.dsg=[];e.dn='';}closeDlg();if(UI.panel)renderPanel(true);},
 stLoad:v=>{const e=ents.get(UI.panel.arg),bp=BPS[+v];if(!e||!bp)return;if(!(e.pw>0)){toast('The station needs power');return;}const go=()=>{const why=stLoad(e,bp);toast(why||`Loaded “${bp.name}”: change it and save again`);closeDlg();renderPanel(true);};
  if(e.dsg&&e.dsg.length){ACT._stLoadGo=go;dialog(`<h2>Replace the current design?</h2><button class="btn warn" data-act="stLoadYes">Load “${bpEsc(bp.name)}”</button> <button class="btn" data-act="closeDlg">Keep</button>`);}else go();},
 stLoadYes:()=>{if(ACT._stLoadGo)ACT._stLoadGo();ACT._stLoadGo=null;},
 dsgRot:()=>{const c=dsgCur();if(!c)return;const {st,q}=c,w=pw1(q);if(w===1){q.dir=(q.dir+1)&3;}else q.dir=(q.dir+1)&3;sfx('rotate');renderPanel(true);},
 dsgDel:()=>{const c=dsgCur();if(!c)return;c.st.dsg.splice(c.st.dsg.indexOf(c.q),1);sfx('del');closePanel();}
});
document.addEventListener('input',ev=>{const el=ev.target;if(!el.dataset)return;
 if(el.dataset.act==='stName'&&UI.panel&&UI.panel.kind==='ent'){const e=ents.get(UI.panel.arg);if(e&&e.k==='bpst')e.dn=el.value.slice(0,30);}
 if(el.dataset.act==='dsgText'){const c=dsgCur();if(c)c.q.s.tx=el.value.slice(0,60);}});
document.addEventListener('change',ev=>{const el=ev.target,k=el.dataset&&el.dataset.dsg;if(!k)return;const c=dsgCur();if(!c)return;const s=c.q.s,v=el.value;
 if(k==='r'){if(v)s.r=v;else delete s.r;}else if(k==='vr')s.vr=+v;else if(k==='vm'){if(v==='1')s.vm=1;else delete s.vm;}
 else if(k.startsWith('lr.')){s.lr=s.lr||{l:['any'],f:['any'],r:['any']};s.lr[k.slice(3)]=v?[v]:[];}
 renderPanel(true);});
