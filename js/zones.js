/* ---------- Factory zones (Session 38) ----------
   A zone is an area the player draws to say "this is one factory". Stored per tile: zoneMap (Uint16, 0 = no zone, else zone id), saved in
   S.zmap as run-length text "id:count,…"; S.zones = [{id, name, c (colour index)}]. Zones never overlap. Drawing a rectangle that touches
   one zone extends it, touching none starts a new zone, touching two is refused. "Cut area" removes tiles. Drawn as a coloured fence along
   the outline with a faint tint and a name tag; nothing is blocked (belts pass through). The dashboard (counting what crosses the fence)
   builds on this. */
let zoneMap=null,zoneVer=0,zoneEdges=[],zoneRuns=[],zonePrev=null;
const ZONE_COL=['#ffb547','#4fc3f7','#7ee07a','#ff7a8a','#b48cff','#f0e06a','#5ee0c8','#ff9a5a'];
function zones(){return S.zones||(S.zones=[]);}
function zoneById(id){return zones().find(z=>z.id===id)||null;}
function zoneCol(z){return ZONE_COL[(z&&z.c||0)%ZONE_COL.length];}
function zoneAt(x,y){return zoneMap&&x>=0&&y>=0&&x<MW&&y<MH?zoneMap[y*MW+x]:0;}
function zoneInit(){zoneMap=new Uint16Array(MW*MH);const s=S&&S.zmap;
 if(s){let i=0;for(const part of String(s).split(',')){const [v,c]=part.split(':').map(Number);if(!(c>0))continue;if(v)zoneMap.fill(v,i,Math.min(zoneMap.length,i+c));i+=c;}}
 zoneRebuild();}
function zoneSave(){const m=zoneMap,out=[];let cur=m[0],cnt=0;for(let i=0;i<m.length;i++){if(m[i]===cur)cnt++;else{out.push(cur+':'+cnt);cur=m[i];cnt=1;}}out.push(cur+':'+cnt);S.zmap=out.join(',');}
function zoneRebuild(){zoneEdges=[];zoneRuns=[];const cnt={},lab={};const m=zoneMap;
 for(let y=0;y<MH;y++){let run=null;for(let x=0;x<MW;x++){const v=m[y*MW+x];
  if(v){cnt[v]=(cnt[v]||0)+1;if(!lab[v])lab[v]={x,y};
   if(y===0||m[(y-1)*MW+x]!==v)zoneEdges.push([x,y,x+1,y,v]);
   if(y===MH-1||m[(y+1)*MW+x]!==v)zoneEdges.push([x,y+1,x+1,y+1,v]);
   if(x===0||m[y*MW+x-1]!==v)zoneEdges.push([x,y,x,y+1,v]);
   if(x===MW-1||m[y*MW+x+1]!==v)zoneEdges.push([x+1,y,x+1,y+1,v]);}
  if(run&&v&&run[3]===v)run[2]++;else{run=v?[x,y,1,v]:null;if(run)zoneRuns.push(run);}}}
 if(S)S.zones=zones().filter(z=>(cnt[z.id]||0)>0);for(const z of zones()){z.n=cnt[z.id];z.lab=lab[z.id];}zoneVer++;}
function zoneRect(a,b){return{x0:Math.max(0,Math.min(a.x,b.x)),y0:Math.max(0,Math.min(a.y,b.y)),x1:Math.min(MW-1,Math.max(a.x,b.x)),y1:Math.min(MH-1,Math.max(a.y,b.y))};}
/* what a drag from a to b would do: {r, id (zone to extend, 0 = new), why (refused)} */
function zoneCheck(a,b,cut){const r=zoneRect(a,b);if(cut)return{r,id:cut};const touch=new Set();
 for(let y=r.y0-1;y<=r.y1+1;y++)for(let x=r.x0-1;x<=r.x1+1;x++){const v=zoneAt(x,y);if(!v)continue;const ix=x>=r.x0&&x<=r.x1,iy=y>=r.y0&&y<=r.y1;if(ix||iy)touch.add(v);}   // inside or side neighbour (not diagonal)
 if(touch.size>1)return{r,why:'It touches '+[...touch].map(id=>(zoneById(id)||{}).name).join(' and ')+'. Draw it touching only one zone'};
 return{r,id:touch.size?[...touch][0]:0};}
function zoneDrop(a,b,cut){const c=zoneCheck(a,b,cut);zonePrev=null;if(c.why){toast(c.why);return;}const r=c.r;
 if(cut){let n=0;for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++)if(zoneMap[y*MW+x]===cut){zoneMap[y*MW+x]=0;n++;}zoneSave();zoneRebuild();
  const z=zoneById(cut);toast(z?`Cut ${n} tiles from ${z.name}`:'Zone removed');if(z)openPanel('zone',cut);else if(UI.panel&&UI.panel.kind==='zone')closePanel();return;}
 let id=c.id,fresh=false;if(!id){id=zones().reduce((m,z)=>Math.max(m,z.id),0)+1;const used=new Set(zones().map(z=>z.c));let ci=0;while(used.has(ci)&&ci<ZONE_COL.length)ci++;
  zones().push({id,name:'Factory '+(zones().length+1),c:ci%ZONE_COL.length});fresh=true;}
 for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++)zoneMap[y*MW+x]=id;zoneSave();zoneRebuild();
 openPanel('zone',id);if(fresh){toast('New factory zone: give it a name');setTimeout(()=>{const i=document.getElementById('zoneName');if(i){i.focus();i.select();}},60);}}
function zoneBuildings(id){let n=0;for(const e of ents.values())if(zoneAt(e.x,e.y)===id)n++;return n;}
function zoneHtml(id){const z=zoneById(id);if(!z)return'<div class="muted">This zone no longer exists.</div>';
 return`<div class="muted">A factory zone marks which buildings belong to one factory. The fence blocks nothing: belts and pipes pass through.
  Drag with the Factory Zone tool next to it to make it bigger.</div><h4>Name</h4><input type="text" id="zoneName" class="signtxt" data-act="zoneName" maxlength="30" value="${(z.name||'').replace(/"/g,'&quot;')}">
  <h4>Colour</h4><div class="chips">${ZONE_COL.map((c,i)=>`<button class="btn chip signcol ${z.c===i?'on':''}" data-act="zoneColor" data-v="${i}" style="background:${c}">&nbsp;</button>`).join('')}</div>
  <h4>Size</h4><div class="row"><span>Area</span><span>${z.n} tiles</span></div><div class="row"><span>Buildings inside</span><span>${zoneBuildings(id)}</span></div>
  <h4>&nbsp;</h4><button class="btn" data-act="zoneCutStart">✂ Cut area</button> <button class="btn del" data-act="zoneDel">🗑 Delete zone</button>`;}
Object.assign(ACT,{
 zoneColor:v=>{const z=UI.panel&&zoneById(UI.panel.arg);if(z){z.c=+v;zoneVer++;renderPanel(true);}},
 zoneCutStart:()=>{const z=UI.panel&&zoneById(UI.panel.arg);if(!z)return;UI.zoneCut=z.id;setTool(null);toast(`Drag over the part of ${z.name} to remove`);updInfo();},
 zoneDel:()=>{const z=UI.panel&&zoneById(UI.panel.arg);if(!z||!confirm(`Delete the zone “${z.name}”? Buildings stay where they are.`))return;
  for(let i=0;i<zoneMap.length;i++)if(zoneMap[i]===z.id)zoneMap[i]=0;zoneSave();zoneRebuild();closePanel();toast('Zone deleted');}});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.act==='zoneName'&&UI.panel&&UI.panel.kind==='zone'){const z=zoneById(UI.panel.arg);if(z){z.name=el.value.slice(0,30)||'Factory';zoneVer++;}}});
/* 2D drawing: tint under everything placed, fence + name tags on top */
function drawZoneTint(sx,sy,s){if(!zoneRuns.length)return;const W=cv.width,H=cv.height;
 for(const [x,y,n,v] of zoneRuns){const X=sx(x),Y=sy(y);if(Y>H||Y+s<0||X>W||X+n*s<0)continue;ctx.fillStyle=zoneCol(zoneById(v));ctx.globalAlpha=0.08;ctx.fillRect(X,Y,n*s,s);}ctx.globalAlpha=1;}
function drawZoneFence(sx,sy,s){if(!zoneEdges.length&&!zonePrev)return;const W=cv.width,H=cv.height,lw=Math.max(1.5,s*0.07);
 for(const [x0,y0,x1,y1,v] of zoneEdges){const X0=sx(x0),Y0=sy(y0),X1=sx(x1),Y1=sy(y1);if(Math.max(X0,X1)<-s||Math.min(X0,X1)>W+s||Math.max(Y0,Y1)<-s||Math.min(Y0,Y1)>H+s)continue;
  const c=zoneCol(zoneById(v)),hl=UI.hlZone&&UI.hlZone.id===v&&performance.now()-UI.hlZone.t<6000;if(hl){ctx.strokeStyle=c;ctx.globalAlpha=0.35+0.3*Math.sin(performance.now()/150);ctx.lineWidth=lw*5;ctx.beginPath();ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);ctx.stroke();ctx.globalAlpha=1;}
  ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=lw*1.8;ctx.beginPath();ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);ctx.stroke();
  ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);ctx.stroke();
  if(s>=10){const p=Math.max(2,s*0.11);ctx.fillStyle='#3a3226';ctx.fillRect(X0-p/2,Y0-p/2,p,p);}}
 for(const z of zones()){if(!z.lab)continue;const X=sx(z.lab.x),Y=sy(z.lab.y);if(X>W||Y>H+40||X<-400||Y<-40)continue;const fs=Math.round(11*DPR);ctx.font=`700 ${fs}px Inter,system-ui,sans-serif`;
  const w=ctx.measureText(z.name).width+fs*1.2,h=fs*1.6,x=X+2,y=Y-h-2;ctx.fillStyle='rgba(10,14,18,0.82)';rr(x,y,w,h,h/2);ctx.fill();ctx.strokeStyle=zoneCol(z);ctx.lineWidth=Math.max(1,fs*0.12);ctx.stroke();
  ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.fillText(z.name,x+fs*0.6,y+h/2+0.5);}
 if(zonePrev){const p=zonePrev,r=p.r,X=sx(r.x0),Y=sy(r.y0),w=(r.x1-r.x0+1)*s,h=(r.y1-r.y0+1)*s,col=p.why?'#ff5a46':p.cut?'#ff9a5a':p.id?zoneCol(zoneById(p.id)):'#6ef08a';
  ctx.fillStyle=col;ctx.globalAlpha=0.15;ctx.fillRect(X,Y,w,h);ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=2*DPR;ctx.setLineDash([6*DPR,4*DPR]);ctx.strokeRect(X,Y,w,h);ctx.setLineDash([]);}}
/* ---------- Factory dashboard (Session 38b) ----------
   Per-second buckets over the last 60 s (like stat.hist). Keys: 'p|z|item' made, 'c|z|item' used, 'k|z|item' delivered to the Base Core,
   's|z|item' put into crates, 'b|z|item' burned in incinerators, 'x|from|to|item' crossed from zone `from` to zone `to` (0 = outside any zone).
   Crossings are counted wherever an item moves between tiles of different zones (belts, splitters, crossings, building outputs, drones);
   pipes: per network and second, what each zone put in and took out is netted and split between zones. */
const ZS={acc:0,cur:{},hist:[]};
const zOf=e=>zoneMap?zoneMap[e.y*MW+e.x]:0;
function zc(key,n){ZS.cur[key]=(ZS.cur[key]||0)+n;}
function zStat(t,e,item,n){if(zoneMap&&n)zc(t+'|'+zOf(e)+'|'+item,n);}
/* items on belts, splitters and crossings remember the zone they last came from (oz; crossings per lane), so a strip of no-man's-land between two
   fences doesn't hide the connection: a crossing is counted when the item enters another zone, or is used/stored outside every zone */
function zMove(src,soz,t,item,dir){if(!zoneMap||!t)return;const zs=zOf(src),org=zs||soz||0,zt=zOf(t);
 if(t.k==='belt'||t.k==='router')t.oz=zt||org;else if(t.k==='cross'){if(dir===0||dir===2)t.hoz=zt||org;else t.voz=zt||org;}
 else{if(zt!==org)zc('x|'+org+'|'+zt+'|'+item,1);return;}
 if(zt&&zt!==org)zc('x|'+org+'|'+zt+'|'+item,1);}
function zFlow(a,b,item,n){if(!zoneMap||!a||!b)return;const za=zOf(a),zb=zOf(b);if(za!==zb)zc('x|'+za+'|'+zb+'|'+item,n||1);}
function zNetFlow(net,b,amt,dirIn){if(!zoneMap||!amt)return;const z=zOf(b),m=dirIn?(net.zi||(net.zi={})):(net.zo||(net.zo={}));m[z]=(m[z]||0)+amt;}
function zTick(dt){ZS.acc+=dt;if(ZS.acc<1)return;ZS.acc-=1;
 for(const n of nets){if(!n.zi&&!n.zo)continue;const zi=n.zi||{},zo=n.zo||{},ex=[],im=[];let E=0,I=0;
  for(const z of new Set([...Object.keys(zi),...Object.keys(zo)])){const d=(zi[z]||0)-(zo[z]||0);if(d>0){ex.push([z,d]);E+=d;}else if(d<0){im.push([z,-d]);I+=-d;}}
  if(E&&I&&n.fluid){const T=Math.min(E,I);for(const [a,ea] of ex)for(const [b,ib] of im)zc('x|'+a+'|'+b+'|'+n.fluid,T*(ea/E)*(ib/I));}n.zi=n.zo=null;}
 ZS.hist.push(ZS.cur);ZS.cur={};if(ZS.hist.length>60)ZS.hist.shift();}
function zRates(){const out={};for(const h of ZS.hist)for(const k in h)out[k]=(out[k]||0)+h[k];const m=60/Math.max(1,ZS.hist.length);for(const k in out)out[k]*=m;return out;}
/* spare capacity (machines held up by full output) and shortages (machines waiting for an input), from the efficiency measurements */
function zMachines(z){const spare={},short={},design={};let mw=0,n=0,ew=0,ef=0;const dz=(k,v)=>{design[k]=(design[k]||0)+v;};
 for(const e of ents.values()){if(zOf(e)!==z||e.k==='core')continue;if(!e.off&&e._efT>=3&&(e.k==='mach'&&e.r||e.k==='drill'||e.k==='pump')){const w=Math.max(1,(B[e.d].pw||0)*Math.pow(e.clock||1,1.6));ew+=w;ef+=w*(e._ef||0);}n++;if(B[e.d].pw)mw+=drawMW(e);const w=e._efw||{};
  if(e.k==='mach'&&e.r&&!e.off){const r0=RC[e.r],c0=(e.clock||1)*60/r0.t;for(const k in r0.o)dz(k,r0.o[k]*c0);for(const k in r0.i)dz(k,-r0.i[k]*c0);}
  if((e.k==='drill'||e.k==='pump')&&e.item&&!e.off){const d=B[e.d];dz(e.item,(d.water?d.rate:d.rate*(e.node?PUR[e.node.p][0]:0))*60*(e.clock||1));}
  if(e.k==='mach'&&e.r){const r=RC[e.r],c=(e.clock||1)*60/r.t;if(w.out>0.02)for(const k in r.o)spare[k]=(spare[k]||0)+r.o[k]*c*w.out;
   for(const k in w)if(k.startsWith('in:')&&w[k]>0.02){const it=k.slice(3);short[it]=(short[it]||0)+(r.i[it]||0)*c*w[k];}}
  else if((e.k==='drill'||e.k==='pump')&&e.item&&w.out>0.02){const d=B[e.d],max=(d.water?d.rate:d.rate*(e.node?PUR[e.node.p][0]:0))*60*(e.clock||1);spare[e.item]=(spare[e.item]||0)+max*w.out;}}
 return{spare,short,design,mw,n,eff:ew?ef/ew:null};}
/* design list: net full-speed output per item (positive only), with what the zone makes of it now (made − used inside) */
function zDesign(des,d){const ks=Object.keys(des).filter(k=>des[k]>=0.05).sort((a,b)=>des[b]-des[a]);if(!ks.length)return'<div class="muted">No machines with a recipe</div>';
 return ks.map(k=>{const now=Math.max(0,(d.p[k]||0)-(d.c[k]||0)),f=now/des[k];return`<div class="row"><span>${nm(k)}</span><span>${fmt(des[k])}/min <small style="color:${f>=0.95?'#7ee07a':f>=0.6?'#ffd34a':'#ff8a6a'}">(now ${fmt(now)})</small></span></div>`;}).join('');}
const zName=z=>+z?((zoneById(+z)||{}).name||'Removed zone'):'Outside zones';
const zList=(o,cls)=>{const ks=Object.keys(o).filter(k=>o[k]>=0.05).sort((a,b)=>o[b]-o[a]);return ks.length?ks.map(k=>`<div class="row ${cls||''}"><span>${nm(k)}</span><span>${fmt(o[k])}/min</span></div>`).join(''):'<div class="muted">—</div>';};
function zoneDashHtml(){const R=zRates(),zs=zones();
 if(!zs.length)return`<div class="muted">No factory zones yet. Draw them with the Factory Zone tool (Signs tab), then this page shows what each factory makes, sends to the others and could still make.</div>`;
 const per={};const get=z=>per[z]||(per[z]={p:{},c:{},k:{},s:{},b:{},out:{},inn:{}});
 for(const key in R){const v=R[key],a=key.split('|');if(a[0]==='x'){const o=get(a[1]).out,i=get(a[2]).inn;(o[a[2]]||(o[a[2]]={}))[a[3]]=((o[a[2]]||{})[a[3]]||0)+v;(i[a[1]]||(i[a[1]]={}))[a[3]]=((i[a[1]]||{})[a[3]]||0)+v;}else get(a[1])[a[0]][a[2]]=(get(a[1])[a[0]][a[2]]||0)+v;}
 const flows=(m,arrow)=>{const parts=[];for(const z in m)for(const it in m[z])if(m[z][it]>=0.05)parts.push(`<div class="row"><span>${arrow==='→'?'→ '+zName(z):'← '+zName(z)}: ${nm(it)}</span><span>${fmt(m[z][it])}/min</span></div>`);return parts.join('');};
 let h=`<div class="muted">Last ${ZS.hist.length} s. Counted where items cross a zone’s fence (belts, pipes, drones). Tap a name to show it on the map.</div>`;
 const ids=[...zs.map(z=>z.id),0];
 for(const z of ids){const d=get(z),M=zMachines(z);if(z===0&&!M.n&&!Object.keys(d.p).length&&!Object.keys(d.out).length)continue;
  const zz=zoneById(z);h+=`<div class="card zcard" style="border-left:4px solid ${z?zoneCol(zz):'#6c7680'}"><div class="row"><b>${z?`<button class="btn chip zlink" data-act="zoneShow" data-v="${z}" title="Show on the map" style="border-color:${zoneCol(zz)}">${zName(z)} ⌖</button>`:zName(z)}</b><span class="muted">${M.eff!=null?`<span class="zeff" style="border-color:${effCol(Math.round(M.eff*100))};color:${effCol(Math.round(M.eff*100))}" title="Average efficiency of its machines (bigger machines count more)">${Math.round(M.eff*100)}%</span> `:''}${M.n} buildings · ${fmt(M.mw)} MW</span></div>
   <div class="plsub">Designed to make <span class="muted" style="text-transform:none;letter-spacing:0">· at full speed, after its own use (now)</span></div>${zDesign(M.design,d)}
   ${(f=>f?`<div class="plsub">Sends to other factories</div>${f}`:'')(flows(d.out,'→'))}${(f=>f?`<div class="plsub">Gets from other factories</div>${f}`:'')(flows(d.inn,'←'))}
   ${Object.keys(d.k).length?`<div class="plsub">Into your stock (Base Core)</div>${zList(d.k)}`:''}${Object.keys(d.s).length?`<div class="plsub">Into crates</div>${zList(d.s)}`:''}${Object.keys(d.b).length?`<div class="plsub">Burned</div>${zList(d.b,'plbad')}`:''}
${Object.keys(M.short).length?`<div class="plsub">Short of (machines waiting)</div>${zList(M.short,'plbad')}`:''}</div>`;}
 return h;}
Object.assign(ACT,{zoneShow:v=>{const z=zoneById(+v);if(!z||!z.lab)return;UI.hlZone={id:z.id,t:performance.now()};let sx=0,sy=0,n=0;for(const r of zoneRuns)if(r[3]===z.id){sx+=(r[0]+r[2]/2)*r[2];sy+=(r[1]+0.5)*r[2];n+=r[2];}
 if(n){camT.x=sx/n;camT.y=sy/n;if(V3.on){C3.x=camT.x;C3.y=camT.y;}}autoClose();}});
