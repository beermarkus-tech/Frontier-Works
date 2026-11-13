/* ---------- Sound (Session 39) ----------
   Everything is synthesised with the Web Audio API: no sound files, all original. Mixer: master → compressor → speakers, with buses
   music / sfx / mach (volumes in OPT.vol, OPT.mute; per device). The audio context starts on the first tap or key press (browser rule).
   Step 1: effects for building, belts, dismantling, eraser, rotating, moving, buttons, goals and fuse trips. Machines and music come next. */
const AU={ctx:null,master:null,bus:{},noise:null,last:{}};
OPT.vol=Object.assign({music:0.5,sfx:0.7,mach:0.6},OPT.vol||{});
function auStart(){if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume().catch(()=>{});return true;}
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 try{const c=new AC();AU.ctx=c;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(c.destination);
  AU.master=c.createGain();AU.master.connect(comp);for(const k of ['music','sfx','mach']){const g=c.createGain();g.connect(AU.master);AU.bus[k]=g;}
  const n=c.createBuffer(1,c.sampleRate,c.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=n;auApply();return true;}catch(e){AU.ctx=null;return false;}}
function auApply(){if(!AU.ctx)return;const t=AU.ctx.currentTime;AU.master.gain.setTargetAtTime(OPT.mute?0:0.9,t,0.03);for(const k in AU.bus)AU.bus[k].gain.setTargetAtTime(OPT.vol[k],t,0.03);}
for(const ev of ['pointerdown','keydown','touchend'])addEventListener(ev,()=>auStart(),{passive:true});
/* building blocks: an envelope-shaped oscillator or filtered noise burst */
function auOsc(type,f0,f1,t0,dur,vol,q,bus){   /* q: optional lowpass cutoff (Hz) */const c=AU.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+dur);
 g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+Math.min(0.012,dur*0.2));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
 let out=g;if(q){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=q;g.connect(f);out=f;}o.connect(g);out.connect(AU.bus[bus||'sfx']);o.start(t0);o.stop(t0+dur+0.05);}
function auNoise(t0,dur,vol,type,f0,f1,Q,bus){const c=AU.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=AU.noise;s.loop=true;
 f.type=type||'bandpass';f.frequency.setValueAtTime(f0,t0);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t0+dur);f.Q.value=Q||1;
 g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+Math.min(0.01,dur*0.2));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
 s.connect(f);f.connect(g);g.connect(AU.bus[bus||'sfx']);s.start(t0,Math.random()*0.5);s.stop(t0+dur+0.05);}
/* sounds; gap = minimum time between two plays of the same sound (belt ticks while dragging) */
const SFX={
 place:t=>{auOsc('sine',95,42,t,0.32,0.55);auNoise(t,0.09,0.28,'bandpass',1400,700,1.2);auOsc('triangle',612,600,t+0.01,0.22,0.07);auOsc('triangle',1347,1330,t+0.01,0.16,0.045);
  for(let i=0;i<3;i++)auNoise(t+0.09+i*0.035,0.025,0.12,'highpass',3500,3500,0.7);},
 belt:t=>{auNoise(t,0.035,0.12,'highpass',3200,3200,0.8);auOsc('sine',330,260,t,0.06,0.08);},
 del:t=>{auNoise(t,0.28,0.25,'lowpass',2600,220,0.9);auOsc('sine',70,38,t+0.02,0.3,0.45);auNoise(t+0.08,0.3,0.1,'bandpass',600,2600,2);},
 erase:t=>{const c=AU.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();s.buffer=AU.noise;s.loop=true;f.type='bandpass';f.frequency.value=2400;f.Q.value=3;
  g.gain.value=0.0001;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.14,t+0.03);g.gain.linearRampToValueAtTime(0.0001,t+0.16);l.frequency.value=38;lg.gain.value=0.06;l.connect(lg);lg.connect(g.gain);
  s.connect(f);f.connect(g);g.connect(AU.bus.sfx);s.start(t);s.stop(t+0.2);l.start(t);l.stop(t+0.2);},
 rotate:t=>{for(let i=0;i<4;i++){auNoise(t+i*0.028,0.02,0.16,'bandpass',2800-i*200,2800-i*200,4);}auOsc('square',180,160,t,0.05,0.03,900);},
 move:t=>{auOsc('sawtooth',160,420,t,0.28,0.09,1600);auOsc('sine',80,60,t+0.24,0.2,0.3);},
 click:t=>{auOsc('sine',1050,900,t,0.035,0.06);auNoise(t,0.012,0.04,'highpass',5000,5000,0.7);},
 deny:t=>{auOsc('square',160,150,t,0.08,0.05,1200);auOsc('square',120,110,t+0.1,0.1,0.05,1200);},
 goal:t=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>{auOsc('triangle',f,f,t+i*0.11,1.4,0.11);auOsc('sine',f*2,f*2,t+i*0.11,0.8,0.03);});auOsc('sine',130.8,130.8,t,1.6,0.18);},
 trip:t=>{for(let i=0;i<2;i++)auOsc('square',110,105,t+i*0.22,0.16,0.09,1400);auNoise(t,0.06,0.2,'highpass',2000,2000,0.7);}};
const SFX_GAP={del:0.05,belt:0.04,erase:0.07,click:0.03,deny:0.2,trip:1};
function sfx(name){if(OPT.mute||!(OPT.vol.sfx>0))return;if(!AU.ctx||AU.ctx.state!=='running'){auStart();if(!AU.ctx||AU.ctx.state!=='running')return;}
 const t=AU.ctx.currentTime,g=SFX_GAP[name]||0;if(g&&AU.last[name]&&t-AU.last[name]<g)return;AU.last[name]=t;try{SFX[name](t+0.005);}catch(e){}}
/* Menu controls */
function audioMenu(){const sl=(k,lbl)=>`<div class="row"><span>${lbl}</span><span><input type="range" min="0" max="100" step="5" value="${Math.round(OPT.vol[k]*100)}" data-act="auVol" data-v="${k}" class="auvol"></span></div>`;
 return`<h4>Sound</h4><div class="chips" style="margin-bottom:6px"><button class="btn chip ${OPT.mute?'':'on'}" data-act="auMute" data-v="0">🔊 On</button><button class="btn chip ${OPT.mute?'on':''}" data-act="auMute" data-v="1">🔇 Muted</button></div>
  ${sl('sfx','Effects')}${sl('mach','Machines <span class="muted">(coming)</span>')}${sl('music','Music <span class="muted">(coming)</span>')}`;}
Object.assign(ACT,{auMute:v=>{OPT.mute=v==='1';saveOpt();auStart();auApply();renderPanel(true);if(!OPT.mute)sfx('click');}});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.act==='auVol'){OPT.vol[el.dataset.v]=(+el.value)/100;saveOpt();auStart();auApply();}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.act==='auVol'&&el.dataset.v==='sfx')sfx('place');});
