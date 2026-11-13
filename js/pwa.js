'use strict';
/* ---------- PWA: service worker, updates, install ---------- */
// Build number: +1 on every push (= commit count on main). Must match VERSION 'fw-build-N' in sw.js (the test checks).
const BUILD=110;
const PWA={prompt:null,standalone:matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true,
 ios:/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),waiting:null};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();PWA.prompt=e;if(UI.panel&&UI.panel.kind==='menu')renderPanel(true);});
addEventListener('appinstalled',()=>{PWA.prompt=null;PWA.standalone=true;toast('Installed — find Frontier Works on your home screen');});
function installHtml(){
 if(!location.protocol.startsWith('http'))return'<div class="muted">Open the hosted version to install the app.</div>';
 if(PWA.standalone)return'<div class="muted">✓ Running as an installed app. Works offline.</div>';
 if(PWA.prompt)return'<button class="btn pri" data-act="installApp">⬇ Install app</button> <span class="muted">Adds an icon to your home screen; plays offline.</span>';
 if(PWA.ios)return'<div class="muted">On iPhone/iPad: tap <b>Share</b> (□↑) in Safari, then <b>Add to Home Screen</b>.</div>';
 return'<div class="muted">Use your browser menu → <b>Install app</b> / <b>Add to Home screen</b>.</div>';
}
ACT.installApp=async()=>{if(!PWA.prompt)return;PWA.prompt.prompt();try{await PWA.prompt.userChoice;}catch(e){}PWA.prompt=null;renderPanel(true);};
/* ↻ in the Menu header: save, look for a newer build on the server, install it and reload (or just reload if none) */
ACT.forceReload=async()=>{
 await save();PWA.forcing=true;toast('Checking for a new build…');
 const done=()=>location.reload();
 try{const reg='serviceWorker' in navigator&&await navigator.serviceWorker.getRegistration();
  if(reg){await reg.update();const w=reg.waiting||reg.installing;
   if(w){toast('New build found, installing…');
    await new Promise(res=>{if(w.state==='installed'||w.state==='activated')return res();const t=setTimeout(res,20000);w.addEventListener('statechange',()=>{if(w.state==='installed'||w.state==='activated'){clearTimeout(t);res();}});});
    w.postMessage('skipWaiting');setTimeout(done,4000);return;}}   // controllerchange normally reloads first
 }catch(e){}
 done();
};
ACT.applyUpdate=async()=>{await save();if(PWA.waiting)PWA.waiting.postMessage('skipWaiting');};
function showUpdate(w){PWA.waiting=w;if(PWA.forcing)return;dialog(`<h2>Update ready</h2><p>A new version of Frontier Works is available. Your game is saved before reloading.</p><button class="btn pri" data-act="applyUpdate">Update now</button> <button class="btn" data-act="closeDlg">Later</button>`);}
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
 addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js').then(reg=>{
   if(reg.waiting&&navigator.serviceWorker.controller)showUpdate(reg.waiting);
   reg.addEventListener('updatefound',()=>{const w=reg.installing;w&&w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate(w);});});
   setInterval(()=>reg.update().catch(()=>{}),30*60*1000);
  }).catch(()=>{});
  let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
 });
}
