/* ---------- Blueprints (Session 48) ----------
   Copy a rectangle of up to BP_MAX×BP_MAX tiles (buildings, belts, pipes and their settings) and build it again elsewhere, turned with
   the Rotate button. Stored per device in localStorage (frontierworks_bp), so they work on every map (and later every world).
   A blueprint = {name, w, h, items:[{d, x, y, dir, s:{settings}}]} with x/y relative to its top-left corner.
   Tools: 'bpcopy' (drag a rectangle) and 'bppaste' (UI.bp = index; first tap shows the outline at UI.bpAt, a tap inside builds it;
   a mouse moves the outline with the pointer). Building pays like normal placing; what can't be afforded or is blocked is reported. */
const BP_KEY='frontierworks_bp',BP_MAX=24,BP_SET=['r','clock','lr','vr','vm','tx','tc','off'];
let BPS=[];try{const v=JSON.parse(localStorage.getItem(BP_KEY)||'[]');if(Array.isArray(v))BPS=v.filter(b=>b&&Array.isArray(b.items));}catch(e){}
function bpSave(){try{localStorage.setItem(BP_KEY,JSON.stringify(BPS));}catch(e){toast('Blueprints could not be stored on this device');}}
const bpTooBig=(a,b)=>Math.abs(a.x-b.x)+1>BP_MAX||Math.abs(a.y-b.y)+1>BP_MAX;
function bpPrevRect(a,b){return{r:zoneRect(a,b),why:bpTooBig(a,b)?'too big':null,id:0};}   /* drawn by the zone preview (2D and 3D) */
function bpCapture(a,b){const r=zoneRect(a,b),w=r.x1-r.x0+1,h=r.y1-r.y0+1;
 if(w>BP_MAX||h>BP_MAX){toast(`A blueprint can be at most ${BP_MAX}×${BP_MAX} tiles (this is ${w}×${h})`);sfx('deny');return null;}
 const items=[],seen=new Set();
 for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){const e=entAt(x,y);if(!e||seen.has(e)||e.k==='core')continue;seen.add(e);
  if(e.x<r.x0||e.y<r.y0||e.x+e.w-1>r.x1||e.y+e.w-1>r.y1)continue;   /* only what lies completely inside */
  const s={};for(const k of BP_SET){const v=e[k];if(v===undefined||v===null||v===false||v==='')continue;if(k==='clock'&&v===1)continue;s[k]=JSON.parse(JSON.stringify(v));}
  items.push({d:e.d,x:e.x-r.x0,y:e.y-r.y0,dir:e.dir||0,s});}
 if(!items.length){toast('Nothing to copy there');return null;}
 let n=BPS.length+1;while(BPS.some(b=>b.name==='Blueprint '+n))n++;
 const bp={name:'Blueprint '+n,w,h,items,t:Date.now()};BPS.unshift(bp);if(BPS.length>40)BPS.length=40;bpSave();
 UI.bp=0;UI.rot=0;UI.rotA=0;setTool('bppaste');sfx('place');toast(`Copied ${items.length} piece${items.length>1?'s':''} (${w}×${h}). Tap where to build it`);return bp;}
/* the blueprint turned by UI.rot quarter turns (clockwise), as absolute tiles around the anchor (its middle) */
function bpLayout(bp,rot,at){let W=bp.w,H=bp.h,it=bp.items.map(o=>Object.assign({},o,{w:(B[o.d]&&B[o.d].w)||1}));
 for(let k=0;k<(rot&3);k++){const h0=H;it=it.map(o=>Object.assign({},o,{x:h0-o.y-o.w,y:o.x,dir:(o.dir+1)&3}));[W,H]=[H,W];}
 const ox=at.x-Math.floor(W/2),oy=at.y-Math.floor(H/2);return{W,H,ox,oy,it:it.map(o=>Object.assign(o,{x:o.x+ox,y:o.y+oy}))};}
/* can this piece go here? true when free, or when the same piece already stands there */
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
/* total cost of a blueprint, for the list */
function bpCost(bp){const c={};for(const o of bp.items){const d=B[o.d];if(!d)continue;for(const k in d.cost)c[k]=(c[k]||0)+d.cost[k];}return c;}
/* map tap while a blueprint tool is active (returns true if handled) */
function bpTap(t){const tool=UI.tool;
 if(tool==='bpcopy'){toast(`Drag over the area to copy (up to ${BP_MAX}×${BP_MAX})`);return true;}
 if(tool!=='bppaste')return false;const bp=BPS[UI.bp];if(!bp){setTool(null);return true;}
 if(UI.bpAt){const L=bpLayout(bp,UI.rot,UI.bpAt);if(t.x>=L.ox&&t.x<L.ox+L.W&&t.y>=L.oy&&t.y<L.oy+L.H){bpPaste(UI.bpAt);return true;}}
 UI.bpAt={x:t.x,y:t.y};toast('Tap inside the outline to build it here · tap elsewhere to move it · ⟳ turns it');return true;}
/* 2D preview of the blueprint at UI.bpAt: the pieces see-through, blocked tiles in red, an outline around it */
function drawBpGhost(sx,sy,s){if(UI.tool!=='bppaste'||!UI.bpAt)return;const bp=BPS[UI.bp];if(!bp)return;const L=bpLayout(bp,UI.rot,UI.bpAt);
 ctx.save();ctx.globalAlpha=0.55;
 for(const q of L.it){const d=B[q.d];if(!d)continue;const X=sx(q.x),Y=sy(q.y),P=q.w*s,f={d:q.d,k:d.k,x:q.x,y:q.y,dir:q.dir,w:q.w,h:q.w,cin:null,lr:q.s.lr,vr:q.s.vr==null?60:q.s.vr,tx:q.s.tx,tc:q.s.tc};
  if(d.k==='sign')drawSign(ctx,f,X,Y,P);else if(isLine(d.k))drawLines([f],sx,sy,s,0.6);else if(d.k==='router'||d.k==='cross')drawRouter(ctx,f,X,Y,s);else if(d.k==='pole')drawPole(ctx,f,X,Y,s);else blit(q.d,X,Y,s,0.6);
  if(!bpFits(q)){ctx.globalAlpha=0.45;ctx.fillStyle='#ff4a3a';ctx.fillRect(X,Y,P,P);ctx.globalAlpha=0.55;}}
 ctx.globalAlpha=1;ctx.strokeStyle='#6ef08a';ctx.lineWidth=2*DPR;ctx.setLineDash([6*DPR,4*DPR]);ctx.strokeRect(sx(L.ox),sy(L.oy),L.W*s,L.H*s);ctx.setLineDash([]);ctx.restore();}
/* 3D preview: one ghost box per piece (same format as the other 3D ghosts) */
function bpGhost3D(gh){if(UI.tool!=='bppaste'||!UI.bpAt)return false;const bp=BPS[UI.bp];if(!bp)return false;const L=bpLayout(bp,UI.rot,UI.bpAt);
 for(const q of L.it){const d=B[q.d];if(!d)continue;gh.push([q.x,q.y,q.w,isLine(d.k)?0.12:Math.min(2.2,(V3.M[q.d]&&V3.M[q.d].h)||1),!bpFits(q)]);}return true;}
/* the Blueprints panel */
function bpHtml(){let h=`<div class="muted">Copy part of your factory (up to ${BP_MAX}×${BP_MAX} tiles) with its recipes and settings, then build it again anywhere: tap where it should go, tap inside the outline to build, ⟳ turns it. Only what you can afford is built.</div>
 <button class="btn" data-act="bpCopy" style="margin:6px 0">＋ Copy an area</button>`;
 if(!BPS.length)return h+'<div class="muted">No blueprints yet.</div>';
 return h+BPS.map((bp,i)=>{const c=bpCost(bp),ok=afford(c);return`<div class="card"><input class="signtxt" data-act="bpName" data-v="${i}" maxlength="30" value="${String(bp.name).replace(/"/g,'&quot;')}">
  <div class="row"><span>${bp.w}×${bp.h} tiles · ${bp.items.length} pieces</span><span class="${ok?'plok':'plbad'}">${ok?'affordable':'not enough materials'}</span></div>
  <div class="chips"><button class="btn chip on" data-act="bpUse" data-v="${i}">Build this</button><button class="btn chip" data-act="bpDel" data-v="${i}">✕ Delete</button></div></div>`;}).join('');}
Object.assign(ACT,{
 openBp:()=>openPanel('bp'),
 bpCopy:()=>{setTool('bpcopy');toast(`Drag over the area to copy (up to ${BP_MAX}×${BP_MAX})`);},
 bpUse:v=>{if(!BPS[+v])return;UI.bp=+v;UI.bpAt=null;setTool('bppaste');toast('Tap where to build it');},
 bpDel:v=>{const i=+v;if(!BPS[i])return;dialog(`<h2>Delete “${String(BPS[i].name).replace(/</g,'&lt;')}”?</h2><button class="btn warn" data-act="bpDelYes" data-v="${i}">Delete</button> <button class="btn" data-act="closeDlg">Keep</button>`);},
 bpDelYes:v=>{const i=+v;BPS.splice(i,1);bpSave();if(UI.tool==='bppaste')setTool(null);closeDlg();if(UI.panel&&UI.panel.kind==='bp')renderPanel(true);}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.act==='bpName'){const bp=BPS[+el.dataset.v];if(bp){bp.name=el.value.slice(0,30)||'Blueprint';bpSave();}}});
