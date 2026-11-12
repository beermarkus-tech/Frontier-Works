/* ---------- Cloud save: one game on all devices, via a private GitHub Gist ----------
   Gist files: fw-save.txt (FW2 export text), fw-meta.json {ver,dev,name,time,tier,n,t}, fw-live.json {dev,name,time,closed} ("playing now"),
   fw-backup.txt (the cloud save a forced upload replaced).
   Rules (agreed with Markus, see docs/BUILD_LOG.md):
   - A device uploads only if the cloud still holds the version it started from (its base: SC.base = meta.ver, SC.baseDev = meta.dev).
   - Cloud newer + this device not played since its base → load automatically (a local copy is kept for "Undo last sync").
   - Both played, first connection to a non-empty cloud, or a cloud save that looks older (lower tier / far fewer buildings) → ask.
   - Another device played in the last 3 minutes and didn't close → ask before taking over.
   - After Undo or a "this device only" import, sync pauses; Resume asks which game to keep (as on first connection). */
const SYNC_KEY='frontierworks_sync',GH='https://api.github.com',GIST_DESC='Frontier Works save (managed by the game, do not edit)';
const SY={st:'',busy:false,asking:false,hold:false,liveOk:false,lastUp:0,lastBeat:0,pend:null,ans:null,undo:false};
let SC={};try{SC=JSON.parse(localStorage.getItem(SYNC_KEY)||'{}')||{};}catch(e){SC={};}
if(!SC.dev){SC.dev=Math.random().toString(36).slice(2,10);try{localStorage.setItem(SYNC_KEY,JSON.stringify(SC));}catch(e){}}
function scSave(){try{localStorage.setItem(SYNC_KEY,JSON.stringify(SC));}catch(e){}}
function devGuess(){const u=navigator.userAgent;return /iPad|Tablet/i.test(u)||(/Android/i.test(u)&&!/Mobile/i.test(u))?'Tablet':/Mobi|iPhone|Android/i.test(u)?'Phone':'Computer';}
const syncAgo=t=>{const s=(Date.now()-t)/1000;return s<60?'just now':s<3600?`${Math.round(s/60)} min ago`:s<86400?`${Math.round(s/3600)} h ago`:`${Math.round(s/86400)} days ago`;};
const playStr=t=>{const m=Math.round((t||0)/60);return m<60?`${m} min`:`${Math.floor(m/60)} h ${m%60} min`;};
const syncSum=()=>({tier:S.ms||0,n:ents.size,t:Math.round(S.t||0)});
const syncDirty=()=>!SC.base||((S.t||0)-(SC.baseT||0))>20;          // played more than 20 s of game time since the last sync
const syncIsBase=m=>!!SC.base&&m.ver===SC.base&&m.dev===SC.baseDev;
const syncOlder=m=>m.tier<(S.ms||0)||(ents.size>30&&m.n<ents.size*0.7);
async function gh(path,opt){opt=opt||{};const r=await fetch(GH+path,{method:opt.method||'GET',cache:'no-cache',body:opt.body,
  headers:Object.assign({Authorization:'Bearer '+SC.token,Accept:'application/vnd.github+json'},opt.body?{'Content-Type':'application/json'}:{})});
 if(r.status===401||r.status===403)throw Object.assign(new Error('GitHub refused the key. Check that it has the “gist” permission.'),{auth:1});
 if(r.status===404)throw Object.assign(new Error('not found'),{nf:1});
 if(!r.ok)throw new Error('GitHub error '+r.status);return r.json();}
async function syncFile(f){if(!f)return null;if(f.truncated){const r=await fetch(f.raw_url,{cache:'no-cache'});return r.text();}return f.content;}
async function cloudGet(){
 if(!SC.gist){const list=await gh('/gists?per_page=100');const g=list.find(g=>g.description===GIST_DESC);if(!g)return null;SC.gist=g.id;scSave();}
 let g;try{g=await gh('/gists/'+SC.gist);}catch(e){if(e.nf){SC.gist=null;SC.base=null;scSave();return null;}throw e;}
 const f=g.files||{},js=async n=>{const t=await syncFile(f[n]);try{return t?JSON.parse(t):null;}catch(e){return null;}};
 return{meta:await js('fw-meta.json'),live:await js('fw-live.json'),save:f['fw-save.txt']};}
const liveFile=closed=>({content:JSON.stringify({dev:SC.dev,name:SC.name,time:Date.now(),closed:!!closed})});
async function cloudPut(c,force,closed){
 const txt=await exportText(),ver=((c&&c.meta&&c.meta.ver)||0)+1,meta=Object.assign({ver,dev:SC.dev,name:SC.name,time:Date.now()},syncSum());
 const files={'fw-save.txt':{content:txt},'fw-meta.json':{content:JSON.stringify(meta)},'fw-live.json':liveFile(closed)};
 if(force&&c&&c.save){const old=await syncFile(c.save);if(old)files['fw-backup.txt']={content:old};}
 if(SC.gist)await gh('/gists/'+SC.gist,{method:'PATCH',body:JSON.stringify({files})});
 else{const g=await gh('/gists',{method:'POST',body:JSON.stringify({description:GIST_DESC,public:false,files})});SC.gist=g.id;}
 SC.base=ver;SC.baseDev=SC.dev;SC.baseT=S.t||0;SC.last=Date.now();scSave();SY.lastUp=SY.lastBeat=Date.now();}
async function cloudLoad(c){const txt=await syncFile(c.save);if(!txt)throw new Error('The cloud save is empty');
 try{await idbPut('presync',{data:serialize(),t:Date.now()});SY.undo=true;}catch(e){}
 load(txt.startsWith('FW2:')?await gunz(unb64(txt.slice(4))):txt);await save();
 SC.base=c.meta.ver;SC.baseDev=c.meta.dev;SC.baseT=S.t||0;SC.last=Date.now();scSave();}
/* questions: a promise that the dialog buttons resolve */
function syncAsk(html){SY.asking=true;dialog(html);return new Promise(res=>{SY.ans=v=>{SY.ans=null;SY.asking=false;closeDlg();res(v);};});}
const sumLine=(who,s,when)=>`<div class="syncside"><b>${who}</b><br>Tier ${s.tier}, ${s.n} buildings, ${playStr(s.t)} played${when?` · ${when}`:''}</div>`;
async function syncConflict(c,why){const m=c.meta,head={first:'A cloud save already exists',down:'The cloud save looks older',both:'Both devices have new progress'}[why];
 const v=await syncAsk(`<h2>☁ ${head}</h2><p>Which game do you want to keep? The other one is kept as a backup.</p>
  ${sumLine('This device ('+(SC.name||'this device')+')',syncSum())}${sumLine('Cloud (from '+(m.name||'another device')+')',m,'saved '+syncAgo(m.time))}
  <div class="syncbtns"><button class="btn pri" data-act="syncAns" data-v="local">Keep this device’s game</button>
  <button class="btn" data-act="syncAns" data-v="cloud">Use the cloud game</button><button class="btn" data-act="syncAns" data-v="later">Decide later</button></div>`);
 SY.busy=true;   // loading/uploading now: keep timed syncs out until syncNow's finally
 if(v==='local'){await cloudPut(c,true);toast('☁ This device’s game is now the cloud save (the old one is kept as a backup)');}
 else if(v==='cloud'){await cloudLoad(c);toast(`☁ Loaded the cloud game from ${m.name||'another device'}`);}
 else{SY.hold=true;SY.st='hold';}}
function syncRedraw(){if(!(UI.panel&&UI.panel.kind==='menu'))return;const b=$('pbody'),y=b.scrollTop;renderPanel(true);b.scrollTop=y;}
function syncSt(s){SY.st=s;syncRedraw();}
async function syncNow(manual){
 if(!SC.token||SY.busy||SY.asking)return;if(SC.paused){if(manual)toast('Cloud sync is paused on this device');return;}
 if(manual)SY.hold=false;if(SY.hold)return;
 SY.busy=true;syncSt('busy');
 try{const c=await cloudGet();
  if(!c||!c.meta){await cloudPut(c,false);syncSt('ok');toast('☁ Game saved to the cloud');return;}
  const m=c.meta,L=c.live;
  if(!SY.liveOk&&L&&L.dev!==SC.dev&&!L.closed&&Date.now()-L.time<180000){SY.busy=false;
   const go=await syncAsk(`<h2>☁ ${L.name||'Another device'} is playing</h2><p>Your ${L.name||'other device'} was playing ${syncAgo(L.time)}. Continue here anyway?
    If you do, close the game there first so both don’t change the same factory.</p><div class="syncbtns"><button class="btn pri" data-act="syncAns" data-v="1">Continue here</button><button class="btn" data-act="syncAns" data-v="">Not now</button></div>`);
   SY.busy=true;if(!go){SY.hold=true;syncSt('hold');return;}SY.liveOk=true;}
  if(syncIsBase(m)){
   if(syncDirty())await cloudPut(c,false);
   else if(!document.hidden&&Date.now()-SY.lastBeat>120000){await gh('/gists/'+SC.gist,{method:'PATCH',body:JSON.stringify({files:{'fw-live.json':liveFile(false)}})});SY.lastBeat=Date.now();}
   SC.last=Date.now();scSave();syncSt('ok');if(manual)toast('☁ Up to date');return;}
  SY.busy=false;
  if(!SC.base)await syncConflict(c,'first');
  else if(!syncDirty()){if(syncOlder(m))await syncConflict(c,'down');else{SY.busy=true;await cloudLoad(c);toast(`☁ Loaded newer game from ${m.name||'another device'} (Tier ${m.tier}, ${m.n} buildings)`);}}
  else await syncConflict(c,'both');
  if(SY.st!=='hold')syncSt('ok');
 }catch(e){SY.asking=false;syncSt(e.auth?'⚠ '+e.message:(navigator.onLine===false||e instanceof TypeError)?'offline':'⚠ '+e.message);}
 finally{SY.busy=false;syncRedraw();}}
/* leaving the app: upload if changed, mark "closed" so the other device doesn't warn */
async function syncLeave(){if(!SC.token||SC.paused||SY.busy||SY.asking||SY.hold)return;
 try{SY.busy=true;const c=await cloudGet();if(c&&c.meta&&syncIsBase(c.meta)){if(syncDirty())await cloudPut(c,false,true);
  else await gh('/gists/'+SC.gist,{method:'PATCH',body:JSON.stringify({files:{'fw-live.json':liveFile(true)}})});}}catch(e){}finally{SY.busy=false;}}
function syncMenu(){
 if(!SC.token)return`<h4>Cloud save (GitHub)</h4><div class="muted">Keep one game on all your devices. It needs a GitHub key that can only use Gists:
  github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token, tick only <b>gist</b>.</div>
  <input type="password" id="syncTok" class="signtxt" placeholder="GitHub key (ghp_…)" autocomplete="off"> <input id="syncName" class="signtxt" value="${SC.name||devGuess()}" placeholder="Name of this device">
  <button class="btn pri" data-act="syncConnect">☁ Connect</button>`;
 const st=SC.paused?'⏸ Paused on this device':SY.st==='busy'?'☁ Syncing…':SY.st==='offline'?'☁ Offline, will sync when online':SY.st==='hold'?'☁ Waiting for your decision (Sync now asks again)':
  SY.st&&SY.st[0]==='⚠'?SY.st:SC.last?`☁ Synced ${syncAgo(SC.last)} · ${SC.name}`:'☁ Connected';
 return`<h4>Cloud save (GitHub)</h4><div class="muted">${st}</div><button class="btn" data-act="syncNowBtn">☁ Sync now</button>
  ${SC.paused?'<button class="btn" data-act="syncResume">▶ Resume</button>':'<button class="btn" data-act="syncPause">⏸ Pause here</button>'}
  ${SY.undo?'<button class="btn" data-act="syncUndo">↶ Undo last sync</button>':''} <button class="btn" data-act="syncOff">Disconnect</button>`;}
Object.assign(ACT,{
 syncAns:v=>{if(SY.ans)SY.ans(v);},
 syncConnect:()=>{const t=($('syncTok').value||'').trim(),n=($('syncName').value||'').trim()||devGuess();if(!t)return toast('Paste your GitHub key first');
  Object.assign(SC,{token:t,name:n,base:null,baseDev:null,paused:false,gist:null});scSave();SY.liveOk=false;SY.hold=false;syncNow(true);},
 syncNowBtn:()=>{SY.liveOk=false;syncNow(true);},
 syncPause:()=>{SC.paused=true;scSave();renderPanel(true);toast('Cloud sync paused on this device');},
 syncResume:()=>{SC.paused=false;SC.base=null;scSave();SY.hold=false;syncNow(true);},     // after a pause we can't know which game is right: ask
 syncUndo:async()=>{let r=null;try{r=await idbGet('presync');}catch(e){}if(!r)return toast('Nothing to undo');load(r.data);await save();SY.undo=false;
  SC.paused=true;scSave();renderPanel(true);toast('Restored the game from before the last sync. Sync is paused here; Resume asks which game to keep');},
 syncOff:()=>{SC={dev:SC.dev};scSave();SY.st='';renderPanel(true);toast('Disconnected from the cloud save (the Gist stays on GitHub)');}});
/* import: all devices or only here */
{const imp=ACT.importSave;ACT.importSave=async()=>{await imp();if(!SC.token||SC.paused)return;
 const v=await syncAsk(`<h2>☁ Use this save everywhere?</h2><p>You loaded a save. Should it replace the cloud game, so your other devices get it too? (The current cloud game is kept as a backup.)</p>
  <div class="syncbtns"><button class="btn pri" data-act="syncAns" data-v="all">All devices</button><button class="btn" data-act="syncAns" data-v="here">Only this device (pause sync here)</button></div>`);
 if(v==='all'){try{SY.busy=true;const c=await cloudGet();await cloudPut(c,true);toast('☁ This save is now the cloud game');}catch(e){toast('⚠ Cloud upload failed: '+e.message);}finally{SY.busy=false;}}
 else{SC.paused=true;scSave();toast('Sync paused on this device');}};}
/* automatic: on start, when coming back to the app, every 3 minutes; on leaving */
function syncBoot(){if(!SC.token)return;try{idbGet('presync').then(r=>{SY.undo=!!r;}).catch(()=>{});}catch(e){}setTimeout(()=>syncNow(false),1200);}
setInterval(()=>{if(SC.token&&!document.hidden&&navigator.onLine!==false)syncNow(false);},180000);
document.addEventListener('visibilitychange',()=>{if(!SC.token)return;if(document.hidden)syncLeave();else{SY.liveOk=false;SY.hold=false;syncNow(false);}});
addEventListener('online',()=>{if(SC.token)syncNow(false);});
