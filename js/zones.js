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
  const c=zoneCol(zoneById(v));ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=lw*1.8;ctx.beginPath();ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);ctx.stroke();
  ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);ctx.stroke();
  if(s>=10){const p=Math.max(2,s*0.11);ctx.fillStyle='#3a3226';ctx.fillRect(X0-p/2,Y0-p/2,p,p);}}
 for(const z of zones()){if(!z.lab)continue;const X=sx(z.lab.x),Y=sy(z.lab.y);if(X>W||Y>H+40||X<-400||Y<-40)continue;const fs=Math.round(11*DPR);ctx.font=`700 ${fs}px Inter,system-ui,sans-serif`;
  const w=ctx.measureText(z.name).width+fs*1.2,h=fs*1.6,x=X+2,y=Y-h-2;ctx.fillStyle='rgba(10,14,18,0.82)';rr(x,y,w,h,h/2);ctx.fill();ctx.strokeStyle=zoneCol(z);ctx.lineWidth=Math.max(1,fs*0.12);ctx.stroke();
  ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.fillText(z.name,x+fs*0.6,y+h/2+0.5);}
 if(zonePrev){const p=zonePrev,r=p.r,X=sx(r.x0),Y=sy(r.y0),w=(r.x1-r.x0+1)*s,h=(r.y1-r.y0+1)*s,col=p.why?'#ff5a46':p.cut?'#ff9a5a':p.id?zoneCol(zoneById(p.id)):'#6ef08a';
  ctx.fillStyle=col;ctx.globalAlpha=0.15;ctx.fillRect(X,Y,w,h);ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=2*DPR;ctx.setLineDash([6*DPR,4*DPR]);ctx.strokeRect(X,Y,w,h);ctx.setLineDash([]);}}
