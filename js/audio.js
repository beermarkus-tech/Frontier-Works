/* ---------- Sound (Session 39) ----------
   Everything is synthesised with the Web Audio API: no sound files, all original. Mixer: master → compressor → speakers, with buses
   music / sfx / mach (volumes in OPT.vol, OPT.mute; per device). The audio context starts on the first tap or key press (browser rule).
   Step 1: effects for building, belts, dismantling, eraser, rotating, moving, buttons, goals and fuse trips. Step 2: machine sounds (below). */
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
  ${sl('sfx','Effects')}${sl('mach','Machines')}${sl('music','Music <span class="muted">(coming)</span>')}`;}
Object.assign(ACT,{auMute:v=>{OPT.mute=v==='1';saveOpt();auStart();auApply();renderPanel(true);if(!OPT.mute)sfx('click');}});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset&&el.dataset.act==='auVol'){OPT.vol[el.dataset.v]=(+el.value)/100;saveOpt();auStart();auApply();}});
document.addEventListener('change',ev=>{const el=ev.target;if(el.dataset&&el.dataset.act==='auVol'&&el.dataset.v==='sfx')sfx('place');});
/* ---------- Machine sounds (Session 39c) ----------
   One continuous voice per kind (furnace, press, assembler, refinery, drill, generator, belt) on the 'mach' bus. Every 150 ms the working
   buildings near the screen centre are summed per kind (closer = more), scaled by zoom (far out = soft), and each voice glides to that level.
   Idle, blocked and switched-off buildings are silent. Rhythmic parts (press thumps, crackle, bubbles, servo ticks) are scheduled ahead. */
const MKIND={smelter:'furnace',foundry:'furnace',press:'press',assembler:'assembler',fabricator:'assembler',refinery:'refinery',blender:'refinery'};
const MV={on:false,v:{},lvl:{},next:{}};
function mvKind(e){if(e.k==='mach')return MKIND[B[e.d].mt]||'assembler';if(e.k==='drill')return'drill';if(e.k==='pump')return'refinery';if(e.k==='gen')return'gen';return null;}
function mvActive(e){if(e.off)return false;if(e.k==='mach')return !!(e.run&&e.pw>0);if(e.k==='drill'||e.k==='pump')return !!(e.want&&e.pw>0);if(e.k==='gen')return (e.load||0)>0.01;return false;}
/* continuous beds: built once, their gain follows the level */
function mvBuild(){const c=AU.ctx,bus=AU.bus.mach,mk=k=>{const g=c.createGain();g.gain.value=0;g.connect(bus);MV.v[k]=g;return g;};
 const loopNoise=(dest,type,f,Q,vol)=>{const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=Q||0.7;const g=c.createGain();g.gain.value=vol;s.connect(fl);fl.connect(g);g.connect(dest);s.start();return g;};
 const tone=(dest,type,f,vol)=>{const o=c.createOscillator();o.type=type;o.frequency.value=f;const g=c.createGain();g.gain.value=vol;o.connect(g);g.connect(dest);o.start();return{o,g};};
 const lfo=(param,rate,depth)=>{const l=c.createOscillator();l.frequency.value=rate;const lg=c.createGain();lg.gain.value=depth;l.connect(lg);lg.connect(param);l.start();};
 {const g=mk('furnace');loopNoise(g,'lowpass',320,0.8,0.55);const t=tone(g,'sine',52,0.25);lfo(t.g.gain,0.3,0.08);}
 {const g=mk('press');loopNoise(g,'lowpass',180,0.7,0.12);}
 {const g=mk('assembler');tone(g,'triangle',92,0.14);tone(g,'sine',184,0.04);const w=loopNoise(g,'bandpass',420,0.6,0.22);lfo(w.gain,0.25,0.07);}   /* calm: low hum + soft muffled whir (Session 39e; the buzzy wobbling sawtooth and high ticks were annoying) */
 {const g=mk('refinery');loopNoise(g,'lowpass',260,0.9,0.3);tone(g,'sine',41,0.18);}
 {const g=mk('drill');const n=loopNoise(g,'bandpass',190,1.4,0.6);lfo(n.gain,9,0.3);tone(g,'square',62,0.05);}
 {const g=mk('gen');tone(g,'sine',50,0.32);tone(g,'sine',100,0.12);tone(g,'triangle',150,0.03);loopNoise(g,'bandpass',900,0.8,0.05);}
 {const g=mk('belt');const n=loopNoise(g,'highpass',1600,0.7,0.25);lfo(n.gain,13,0.12);}
 MV.on=true;}
/* rhythmic parts, scheduled about 0.25 s ahead, only while their kind is audible */
const MV_EVT={
 press:(t,l)=>{auOsc('sine',95,48,t,0.22,0.5*l,0,'mach');auNoise(t,0.06,0.25*l,'bandpass',900,500,1.2,'mach');auNoise(t+0.18,0.05,0.12*l,'highpass',3000,3000,0.8,'mach');return 1.15+Math.random()*0.15;},
 furnace:(t,l)=>{auNoise(t,0.02,0.12*l,'highpass',2500+Math.random()*2000,3000,0.8,'mach');return 0.08+Math.random()*0.35;},
 refinery:(t,l)=>{const f=180+Math.random()*420;auOsc('sine',f,f*1.6,t,0.07,0.09*l,0,'mach');return 0.12+Math.random()*0.4;},
 assembler:(t,l)=>{auOsc('sine',120,80,t,0.18,0.22*l,0,'mach');auNoise(t,0.07,0.08*l,'lowpass',900,400,0.8,'mach');return 1.6+Math.random()*1.4;}};   /* occasional soft set-down clunk */
const MV_BASE={furnace:0.45,press:0.4,assembler:0.9,refinery:0.75,drill:1.0,gen:0.4,belt:0.3};   /* balanced from an offline render so each kind is about equally present */
function mvUpdate(){if(!AU.ctx||AU.ctx.state!=='running'||!S||!ents)return;if(!MV.on)mvBuild();
 const quiet=OPT.mute||!(OPT.vol.mach>0)||document.hidden;const sum={};
 if(!quiet){const v3=typeof V3!=='undefined'&&V3.on,cx=v3?C3.x:cam.x,cy=v3?C3.y:cam.y,
   zoom=v3?Math.max(0.12,Math.min(1,14/(C3.dist||30))):Math.max(0.12,Math.min(1,cam.z/1.6)),R=v3?Math.max(10,(C3.dist||30)*0.8):Math.max(10,innerWidth/(TS*cam.z)/2);
  for(const e of ents.values()){const dx=e.x+e.w/2-cx,dy=e.y+e.h/2-cy;if(dx>R||dx<-R||dy>R||dy<-R)continue;let k=null,act=false;
   if(e.k==='belt'){if(!e.item)continue;k='belt';act=true;}else{k=mvKind(e);if(!k)continue;act=mvActive(e);}if(!act)continue;
   const d=Math.hypot(dx,dy)/R,w=Math.max(0,1-d*d)*(k==='belt'?0.08:1);sum[k]=(sum[k]||0)+w;}
  MV.zoom=zoom;}
 const t=AU.ctx.currentTime;
 for(const k in MV.v){const lvl=quiet?0:(1-Math.exp(-(sum[k]||0)*0.9))*(MV.zoom||1);   /* zoom = overall volume: far out is always softer, however many machines are visible */MV.lvl[k]=lvl;MV.v[k].gain.setTargetAtTime(lvl*MV_BASE[k],t,0.35);
  const ev=MV_EVT[k];if(ev&&lvl>0.03){if(!MV.next[k]||MV.next[k]<t)MV.next[k]=t+0.05;while(MV.next[k]<t+0.3)MV.next[k]+=ev(MV.next[k],lvl*MV_BASE[k]*2)||0.5;}}}
setInterval(()=>{try{mvUpdate();}catch(e){}},150);
