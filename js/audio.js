/* ---------- Sound (Session 39) ----------
   Everything is synthesised with the Web Audio API: no sound files, all original. Mixer: master → compressor → speakers, with buses
   music / sfx / mach (volumes in OPT.vol, OPT.mute; per device). The audio context starts on the first tap or key press (browser rule).
   Step 1: effects for building, belts, dismantling, eraser, rotating, moving, buttons, goals and fuse trips. Step 2: machine sounds (below). */
const AU={ctx:null,master:null,bus:{},noise:null,last:{}};
OPT.vol=Object.assign({music:0.5,sfx:0.7,mach:0.6},OPT.vol||{});
OPT.son=Object.assign({music:true,sfx:true,mach:true},OPT.son||{});   /* per-part on/off tick boxes (Session 39o); the slider keeps its volume */
const auOn=k=>!OPT.mute&&OPT.son[k]!==false&&OPT.vol[k]>0;
function auStart(){if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume().catch(()=>{});return true;}
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 try{const c=new AC();AU.ctx=c;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(c.destination);
  AU.master=c.createGain();AU.master.connect(comp);for(const k of ['music','sfx','mach']){const g=c.createGain();g.connect(AU.master);AU.bus[k]=g;}
  const n=c.createBuffer(1,c.sampleRate,c.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=n;auApply();return true;}catch(e){AU.ctx=null;return false;}}
function auApply(){if(!AU.ctx)return;const t=AU.ctx.currentTime;AU.master.gain.setTargetAtTime(OPT.mute?0:0.9,t,0.03);for(const k in AU.bus)AU.bus[k].gain.setTargetAtTime(OPT.son[k]===false?0:OPT.vol[k],t,0.03);}
for(const ev of ['pointerdown','keydown','touchend'])addEventListener(ev,()=>auStart(),{passive:true});
/* coming back to the app (or after a phone call / screen lock): resume the audio by itself, and keep trying every 2 s while it isn't running */
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AU.ctx&&AU.ctx.state!=='running')AU.ctx.resume().catch(()=>{});});
setInterval(()=>{if(AU.ctx&&!document.hidden&&AU.ctx.state!=='running'&&!OPT.mute)AU.ctx.resume().catch(()=>{});},2000);
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
function sfx(name){if(!auOn('sfx'))return;if(!AU.ctx||AU.ctx.state!=='running'){auStart();if(!AU.ctx||AU.ctx.state!=='running')return;}
 const t=AU.ctx.currentTime,g=SFX_GAP[name]||0;if(g&&AU.last[name]&&t-AU.last[name]<g)return;AU.last[name]=t;try{SFX[name](t+0.005);}catch(e){}}
/* Menu controls */
function audioMenu(){const sl=(k,lbl)=>`<div class="row"><span><button class="btn chip autog ${OPT.son[k]!==false?'on':''}" data-act="auOnOff" data-v="${k}" title="Turn ${lbl.toLowerCase()} on or off">${OPT.son[k]!==false?'☑':'☐'}</button> ${lbl}</span><span><input type="range" min="0" max="100" step="5" value="${Math.round(OPT.vol[k]*100)}" data-act="auVol" data-v="${k}" class="auvol"></span></div>`;
 return`<h4>Sound</h4><div class="chips" style="margin-bottom:6px"><button class="btn chip ${OPT.mute?'':'on'}" data-act="auMute" data-v="0">🔊 On</button><button class="btn chip ${OPT.mute?'on':''}" data-act="auMute" data-v="1">🔇 Muted</button></div>
  ${sl('sfx','Effects')}${sl('mach','Machines')}${sl('music','Music')}`;}
Object.assign(ACT,{auOnOff:v=>{OPT.son[v]=OPT.son[v]===false;saveOpt();auStart();auApply();renderPanel(true);if(v==='sfx'&&OPT.son.sfx)sfx('click');},
 auMute:v=>{OPT.mute=v==='1';saveOpt();auStart();auApply();renderPanel(true);if(!OPT.mute)sfx('click');}});
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
 {const g=mk('assembler');tone(g,'sine',58,0.1);const w=loopNoise(g,'bandpass',300,0.6,0.22);lfo(w.gain,0.25,0.07);}   /* Session 39g: pure deep 58 Hz (the 92 Hz triangle's overtones were what small speakers played, and they sounded intrusive) */   /* calm: low hum + soft muffled whir (Session 39e; the buzzy wobbling sawtooth and high ticks were annoying) */
 {const g=mk('refinery');loopNoise(g,'lowpass',260,0.9,0.3);tone(g,'sine',41,0.18);}
 {const g=mk('drill');const n=loopNoise(g,'bandpass',190,1.4,0.6);lfo(n.gain,9,0.3);tone(g,'square',62,0.05);}
 {const g=mk('gen');tone(g,'sine',50,0.32);tone(g,'sine',100,0.12);tone(g,'triangle',150,0.03);loopNoise(g,'bandpass',900,0.8,0.05);}
 mk('belt');   /* belts: no steady bed (the hiss sounded like a whoosh), only the rattle clicks below */
 MV.on=true;}
/* rhythmic parts, scheduled about 0.25 s ahead, only while their kind is audible */
const MV_EVT={
 press:(t,l)=>{auOsc('sine',95,48,t,0.22,0.5*l,0,'mach');auNoise(t,0.06,0.25*l,'bandpass',900,500,1.2,'mach');auNoise(t+0.18,0.05,0.12*l,'highpass',3000,3000,0.8,'mach');return 1.15+Math.random()*0.15;},
 furnace:(t,l)=>{auNoise(t,0.02,0.12*l,'highpass',2500+Math.random()*2000,3000,0.8,'mach');return 0.08+Math.random()*0.35;},
 refinery:(t,l)=>{const f=180+Math.random()*420;auOsc('sine',f,f*1.6,t,0.07,0.09*l,0,'mach');return 0.12+Math.random()*0.4;},
 belt:(t,l)=>{const f=2200+Math.random()*1800;auNoise(t,0.012,(0.5+Math.random()*0.5)*0.5*l,'bandpass',f,f,2.5,'mach');if(Math.random()<0.15)auOsc('sine',220,150,t,0.03,0.25*l,0,'mach');return 0.05+Math.random()*0.07;},
 assembler:(t,l)=>{auOsc('sine',120,80,t,0.18,0.22*l,0,'mach');auNoise(t,0.07,0.08*l,'lowpass',900,400,0.8,'mach');return 1.6+Math.random()*1.4;}};   /* occasional soft set-down clunk */
const MV_BASE={furnace:0.45,press:0.4,assembler:0.9,refinery:0.75,drill:1.0,gen:0.4,belt:0.3};   /* balanced from an offline render so each kind is about equally present */
function mvUpdate(){if(!AU.ctx||AU.ctx.state!=='running'||!S||!ents)return;if(!MV.on)mvBuild();
 const quiet=!auOn('mach')||document.hidden;const sum={};
 if(!quiet){const v3=typeof V3!=='undefined'&&V3.on,cx=v3?C3.x:cam.x,cy=v3?C3.y:cam.y,
   zoom=v3?Math.max(0.12,Math.min(1,14/(C3.dist||30))):Math.max(0.12,Math.min(1,cam.z/1.6)),R=v3?Math.max(10,(C3.dist||30)*0.8):Math.max(10,innerWidth/(TS*cam.z)/2);
  for(const e of ents.values()){const dx=e.x+e.w/2-cx,dy=e.y+e.h/2-cy;if(dx>R||dx<-R||dy>R||dy<-R)continue;let k=null,act=false;
   if(e.k==='belt'){k='belt';act=true;}   /* belts rattle whether they carry items or not */else{k=mvKind(e);if(!k)continue;act=mvActive(e);}if(!act)continue;
   const d=Math.hypot(dx,dy)/R,w=Math.max(0,1-d*d)*(k==='belt'?0.08:1);sum[k]=(sum[k]||0)+w;}
  MV.zoom=zoom;}
 const t=AU.ctx.currentTime;
 for(const k in MV.v){const lvl=quiet?0:(1-Math.exp(-(sum[k]||0)*0.9))*(MV.zoom||1);   /* zoom = overall volume: far out is always softer, however many machines are visible */MV.lvl[k]=lvl;MV.v[k].gain.setTargetAtTime(lvl*MV_BASE[k],t,0.35);
  const ev=MV_EVT[k];if(ev&&lvl>0.03){if(!MV.next[k]||MV.next[k]<t)MV.next[k]=t+0.05;while(MV.next[k]<t+0.3)MV.next[k]+=ev(MV.next[k],lvl*MV_BASE[k]*2)||0.5;}}}
setInterval(()=>{try{mvUpdate();}catch(e){}},150);
/* ---------- Music (Session 39f) ----------
   Generative, original: slow pads, a soft plucked arpeggio with echo, a quiet bass and now and then a metallic swell with a bell ring.
   ~80 BPM, D minor family. Sections of 32–64 beats; the progression, arpeggio pattern and which layers play change per section; after a few
   minutes the other track follows after a ~3 s pause (Session 39n; was a 25–60 s silence). Scheduled ~0.6 s ahead every 100 ms on the 'music' bus, through a soft reverb. Stops in the background. */
const MU={on:false,t:0,step:0,sec:null,rest:0,played:0,rev:null,dly:null,track:0};
const MU_BPM=80,MU_PROG=[[[50,57,60,65],[46,53,57,62],[41,48,53,57],[48,55,58,64]],[[50,57,60,65],[45,52,57,60],[46,53,58,62],[43,50,55,58]],
 [[50,53,57,62],[55,58,62,65],[46,50,53,58],[45,49,52,57]],[[41,48,52,57],[43,50,53,58],[50,57,60,65],[45,52,55,60]]];
const mf=m=>440*Math.pow(2,(m-69)/12);
function muInit(){const c=AU.ctx;if(MU.rev)return;const len=c.sampleRate*3.2,ir=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}
 const cv=c.createConvolver();cv.buffer=ir;const rg=c.createGain();rg.gain.value=0.55;cv.connect(rg);rg.connect(AU.bus.music);MU.rev=cv;
 const dl=c.createDelay(1.5);dl.delayTime.value=60/MU_BPM*0.75;const fb=c.createGain();fb.gain.value=0.38;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
 dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(AU.bus.music);lp.connect(cv);MU.dly=dl;}
/* one voice: oscillators → lowpass → envelope → dry + reverb (+ echo) */
function muNote(type,freqs,t,a,hold,r,vol,cut,echo){const c=AU.ctx,f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=cut;f.Q.value=0.5;
 g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setValueAtTime(vol,t+a+hold);g.gain.exponentialRampToValueAtTime(0.0001,t+a+hold+r);
 for(const fr of freqs){const o=c.createOscillator();o.type=type;o.frequency.value=fr;o.connect(f);o.start(t);o.stop(t+a+hold+r+0.1);}
 f.connect(g);g.connect(AU.bus.music);const sg=c.createGain();sg.gain.value=0.6;g.connect(sg);sg.connect(MU.rev);if(echo){const eg=c.createGain();eg.gain.value=echo;g.connect(eg);eg.connect(MU.dly);}}
function muSection(){const r=Math.random;MU.sec={prog:MU_PROG[(r()*MU_PROG.length)|0],len:[32,48,64][(r()*3)|0],start:MU.step,arp:r()<0.75,bass:r()<0.8,
 pat:[[0,1,2,3,2,1,0,1],[0,2,1,3,0,2,3,1],[0,1,2,3,4,3,2,1],[2,1,0,1,2,3,2,3]][(r()*4)|0],oct:r()<0.5?12:24};}
/* Two tracks (Session 39h): 0 = "Drift" (calm, 80 BPM, pads + arpeggio), 1 = "Pulse" (110 BPM, beat + bass line). After 2–3 minutes of a
   track a ~3 s pause, then the other track, forever. */
/* Session 43: a third track, 2 "Night Shift" (92 BPM); the order is Drift → Pulse → Night Shift → Drift … */
const muBpm=()=>[MU_BPM,110,92][MU.track]||MU_BPM,muB=()=>60/muBpm()/2;
function muSwitch(){MU.track=(MU.track+1)%3;MU.sec=null;MU.step=0;if(MU.dly)MU.dly.delayTime.setValueAtTime(60/muBpm()*0.75,AU.ctx.currentTime);}
function muStep(t){const b=muB();   /* one step = an eighth note */
 if(MU.rest>0){MU.rest--;if(MU.rest===0)muSwitch();return;}if(!MU.sec||MU.step-MU.sec.start>=MU.sec.len*2){if(MU.played>120+Math.random()*60){MU.played=0;MU.rest=Math.max(1,Math.round((2.5+Math.random()*1.5)/b));MU.sec=null;return;}   /* Session 39n: 2–3 min per track, then a ~3 s pause and the other track: loops forever */MU.track===1?muSection2():MU.track===2?muSection3():muSection();}
 if(MU.track===1)return muPlay2(t,b);
 if(MU.track===2)return muPlay3(t,b);
 const s=MU.sec,i=MU.step-s.start,bar=Math.floor(i/16),ch=s.prog[bar%s.prog.length],pos=i%16;
 if(pos===0){muNote('sawtooth',ch.map(m=>mf(m+12)).flatMap(f=>[f*0.997,f*1.003]),t,1.6,b*16-2.2,2.6,0.045,900);
  if(s.bass)muNote('triangle',[mf(ch[0]-12)],t,0.05,b*6,1.2,0.2,500);}
 if(s.bass&&pos===8)muNote('triangle',[mf(ch[0]-12)],t,0.05,b*4,1,0.15,500);
 if(s.arp&&i>=16){const nts=[...ch,ch[1]+12],m=nts[s.pat[pos%8]%nts.length]+s.oct;muNote('triangle',[mf(m)],t,0.005,0.02,0.55,0.09,2600,0.45);}
 if(pos===0&&bar%4===2&&Math.random()<0.5){auNoise(t,3.5,0.09,'bandpass',180,900,1.5,'music');const f0=mf(ch[0]+24);muNote('sine',[f0,f0*2.76],t+0.4,0.01,0.05,4,0.065,4000,0.3);}}
/* track 2 "Pulse": A minor family, soft kick on 1 and 3, ticking hats, soft clap on 2 and 4, a pulsing filtered bass line, light pads,
   the plucked arpeggio now and then, and an occasional metallic clank in the groove */
const MU_PROG2=[[[48,55,60,64],[53,57,60,65],[55,59,62,67],[45,52,57,60]],[[45,52,57,60],[53,57,60,65],[48,55,60,64],[55,59,62,67]],
 [[48,52,55,60],[55,59,62,67],[45,48,52,57],[53,57,60,65]]];   /* Session 39l: major-key (C) progressions for a more upbeat feel */
function muSection2(){const r=Math.random;MU.sec={prog:MU_PROG2[(r()*MU_PROG2.length)|0],len:[32,48,64][(r()*3)|0],start:MU.step,arp:true,hats:true,
 bp:[[0,12,0,12,0,12,7,12],[0,12,0,7,0,12,0,7],[0,0,12,0,7,0,12,12]][(r()*3)|0],pat:[[0,1,2,3,2,1,0,1],[0,2,1,3,0,2,3,1]][(r()*2)|0]};}
/* drums (Session 39k: four-on-the-floor kick with a click small speakers can play; louder hats; a real 3-burst clap) */
function muKick(t,v){auOsc('sine',170,50,t,0.3,v,0,'music');auOsc('triangle',110,60,t,0.1,v*0.7,0,'music');auNoise(t,0.015,v*0.9,'bandpass',2200,2200,1,'music');auNoise(t,0.006,v*0.6,'highpass',5000,5000,0.7,'music');}
function muHat(t,v,open){auNoise(t,open?0.18:0.04,v,'highpass',7500,7500,0.9,'music');auNoise(t,open?0.12:0.03,v*0.5,'bandpass',10000,10000,2,'music');}
function muClap(t,v){for(let k=0;k<3;k++)auNoise(t+k*0.011,0.03,v*(k===2?1:0.7),'bandpass',1300,1300,1.4,'music');auNoise(t+0.033,0.16,v*0.5,'bandpass',1200,900,1,'music');}
function muPlay2(t,b){const s=MU.sec,i=MU.step-s.start,bar=Math.floor(i/16),ch=s.prog[bar%s.prog.length],pos=i%16,beatsIn=i>=16;
 if(pos===0)muNote('sawtooth',ch.map(m=>mf(m+12)).flatMap(f=>[f*0.996,f*1.004]),t,0.8,b*16-1.4,1.6,0.012,800);   /* pads in the background */
 if(beatsIn){if(pos%2===0)muKick(t,0.85);                         /* bass drum on every beat */
  if(pos%4===2)muClap(t,0.95);                                       /* clap on 2 and 4 */
  if(pos%2===1)muHat(t,pos%4===3?0.75:0.55,pos===15&&bar%2===1);    /* hats on every off-beat */
  if(pos===14&&bar%2===1&&Math.random()<0.6){const f0=mf(ch[0]+31);muNote('sine',[f0,f0*2.76,f0*5.4],t,0.002,0.01,0.5,0.05,6000,0.35);}}
 const bn=s.bp[pos%8];if(i>=8){const f=mf(ch[0]-12+bn);muNote('sawtooth',[f],t,0.005,b*0.5,0.1,0.075,500+(pos%4===0?300:0));}
 if(beatsIn){const nts=[...ch,ch[1]+12,ch[2]+12],m=nts[s.pat[pos%8]%nts.length]+12;muNote('triangle',[mf(m)],t,0.004,0.02,0.32,0.05,3600,0.35);}}
/* track 3 "Night Shift" (Session 43): slower (92 BPM) laid-back groove in E minor with seventh chords. A boom-bap beat (kick on 1 and
   after 2, snappy snare on 2 and 4, swung shaker sixteenths), a round sub bass with walking approach notes, warm electric-piano stabs
   on the off-beats, now and then a whistled hook that answers itself, an anvil ring at the end of phrases and faint vinyl crackle.
   One step = an eighth note; 16 steps = two 4/4 bars; the swung sixteenth sits at 58 % of a step. */
const MU_PROG3=[[[40,55,59,62],[45,52,55,60],[48,52,55,59],[47,51,54,57]],    /* Em7 · Am7 · Cmaj7 · B7 */
 [[40,55,59,62],[48,52,55,59],[43,50,52,55],[42,50,54,57]],                     /* Em7 · Cmaj7 · G6 · D/F# */
 [[45,52,55,60],[50,54,60,64],[43,50,54,59],[47,50,54,57]]];                    /* Am7 · D9 · Gmaj7 · Bm7 */
const MU3_PENTA=[64,67,69,71,74,76,79];   /* E minor pentatonic for the hook */
function muSection3(){const r=Math.random,pick=a=>a[(r()*a.length)|0];
 const rhythm=pick([[0,2,3,6],[1,3,4,6,7],[0,3,5,6]]),motif=rhythm.map(()=>(r()*5)|0);
 MU.sec={prog:pick(MU_PROG3),len:[32,48,64][(r()*3)|0],start:MU.step,np:1,
  kick:pick([[0,3,8,11],[0,3,5,8,11,13],[0,5,8,10,11]]),   /* positions in 16 eighth steps */
  keys:pick([[1,3,6],[0,3,5],[2,5,7]]),                     /* electric piano stabs per 4/4 bar */
  hook:r()<0.6,rhythm,motif,swing:0.58};}
function muSnare(t,v){auNoise(t,0.09,v,'bandpass',1900,1500,0.9,'music');auOsc('triangle',210,150,t,0.08,v*0.55,0,'music');auNoise(t,0.02,v*0.6,'highpass',6000,6000,0.7,'music');}
function muPlay3(t,b){const s=MU.sec,i=MU.step-s.start,bar=Math.floor(i/16),ch=s.prog[bar%s.prog.length],pos=i%16,half=pos%8,sw=b*s.swing,r=Math.random;
 const drums=i>=16,last=bar%4===3;
 /* vinyl crackle, always: a few tiny clicks */
 if(r()<0.35)auNoise(t+r()*b,0.004,0.025+r()*0.03,'highpass',3500,3500,0.7,'music');
 /* electric piano: soft sine chord with a quiet bell-like octave, on the pattern's off-beat steps (the odd ones swung) */
 if(s.keys.includes(half)){const tt=t+(half%2?b*0.08:0),fr=ch.slice(1).map(m=>mf(m+12));
  muNote('sine',fr,tt,0.006,b*(half===s.keys[0]?1.4:0.7),1.2,0.05,2600,0.18);muNote('triangle',fr.map(f=>f*2),tt,0.003,0.03,0.6,0.012,4000,0.25);}
 /* sub bass: root on 1, octave on the "and" of 2, fifth on 3, approach note into the next chord on the last eighth */
 if(i>=8){const nx=s.prog[(bar+1)%s.prog.length][0],root=ch[0]-12;let m=null,len=b*0.8;
  if(pos===0||pos===8){m=root;len=b*2.2;}else if(pos===3||pos===11){m=root+12;len=b*0.5;}else if(pos===5||pos===13){m=root+7;}else if(pos===15){m=nx-12+(nx>ch[0]?-1:1);len=b*0.6;}
  if(m!=null){const f=mf(m);muNote('sine',[f],t,0.008,len,0.25,0.2,400);muNote('triangle',[f*2],t,0.006,len*0.6,0.18,0.03,900);}}   /* the octave lets phone speakers hear it */
 if(drums){
  if(s.kick.includes(pos))muKick(t,pos===0||pos===8?0.9:0.7);
  if(half===2||half===6)muSnare(t,0.8);                                                           /* backbeat on 2 and 4 */
  muHat(t,0.32+(half%2?0:0.08),false);muHat(t+sw,0.2,half===7&&last);                              /* swung shaker sixteenths */
  if(last&&pos>=13)muSnare(t+sw,0.35+0.1*(pos-13));                                                /* small fill into the next phrase */
  if(pos===15&&last&&r()<0.7){const f0=mf(ch[0]+19);muNote('sine',[f0,f0*2.76,f0*5.4],t+sw,0.002,0.02,1.4,0.045,5000,0.5);}}   /* anvil ring */
 /* the hook: a soft whistle in the first bar of each two-bar unit; every second time it answers (last note moved up) */
 if(s.hook&&i>=32&&pos<8){const j=s.rhythm.indexOf(pos);if(j>=0){const ans=bar%2===1&&j===s.rhythm.length-1,deg=(s.motif[j]+(ans?2:0))%MU3_PENTA.length;
   const tt=t+(pos%2?b*0.08:0);muNote('square',[mf(MU3_PENTA[deg]),mf(MU3_PENTA[deg])*1.004],tt,0.03,b*0.6,0.4,0.02,1500,0.45);}}}
function muTick(){if(!AU.ctx||AU.ctx.state!=='running')return;const play=auOn('music')&&!document.hidden;const c=AU.ctx;
 if(!play){MU.on=false;return;}muInit();if(!MU.on){MU.on=true;MU.t=c.currentTime+0.3;}
 while(MU.t<c.currentTime+0.6){const b=muB();muStep(MU.t);MU.step++;MU.played+=b;MU.t+=b;}}
setInterval(()=>{try{muTick();}catch(e){}},100);
