'use strict';
/* ================= CALCULATOR (Session 53) =================
   A small floating calculator that stays on screen while you play (toolbar button or ☰ Menu → Tools). Drag it by its title bar.
   Keys: digits, + − × ÷, brackets, %, Enter (=), Backspace when it is open. Position and open state are kept per device (OPT.calc). */
const CALC={ex:'',done:false};
/* Safe parser (no eval): numbers, + - * / %, brackets, unary minus. Returns a number, or null while the expression is unfinished. */
function calcEval(s){const t=s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/,/g,'').match(/\d*\.?\d+(?:e[+-]?\d+)?|[-+*/%()]/gi);if(!t)return null;let i=0;
 const num=()=>{const x=t[i];if(x==='('){i++;const v=add();if(t[i]===')')i++;return v;}if(x==='-'){i++;const v=num();return v==null?null:-v;}if(x==='+'){i++;return num();}
  if(x==null||!/\d/.test(x))return null;i++;let v=parseFloat(x);if(t[i]==='%'){i++;v/=100;}return v;};
 const mul=()=>{let v=num();while(v!=null&&(t[i]==='*'||t[i]==='/')){const op=t[i++],w=num();if(w==null)return null;v=op==='*'?v*w:v/w;}return v;};
 const add=()=>{let v=mul();while(v!=null&&(t[i]==='+'||t[i]==='-')){const op=t[i++],w=mul();if(w==null)return null;v=op==='+'?v+w:v-w;}return v;};
 const v=add();return v!=null&&i===t.length&&isFinite(v)?v:null;}
const calcFmt=v=>v==null?'':Math.abs(v)>=1e15||(v!==0&&Math.abs(v)<1e-6)?v.toExponential(6):(+v.toPrecision(12)).toLocaleString('en-US',{maximumFractionDigits:8});
const CALC_KEYS=['C','(',')','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='];
function calcEl(){let el=$('calc');if(el)return el;el=document.createElement('div');el.id='calc';el.className='glass';
 el.innerHTML=`<div class="calhd" id="calhd"><span>🧮 Calculator</span><button class="btn chip" data-act="calcClose" title="Close">✕</button></div><div class="calex" id="calex"></div><div class="calres" id="calres"></div>
  <div class="calkeys">${CALC_KEYS.map(k=>`<button class="btn ${k==='='?'on':/[÷×−+]/.test(k)?'op':k==='C'||k==='⌫'?'fn':''}" data-act="calcKey" data-v="${k}">${k}</button>`).join('')}</div>`;
 document.body.appendChild(el);calcDrag(el);return el;}
function calcShow(){const el=$('calc');if(!el)return;$('calex').textContent=CALC.ex||'0';const v=calcEval(CALC.ex);$('calres').textContent=CALC.ex&&!CALC.done&&v!=null?'= '+calcFmt(v):'';}
function calcPlace(el){const p=OPT.calcPos,w=el.offsetWidth||220,h=el.offsetHeight||300;let x=p?p[0]:innerWidth-w-16,y=p?p[1]:90;
 x=Math.max(4,Math.min(innerWidth-w-4,x));y=Math.max(4,Math.min(innerHeight-h-4,y));el.style.left=x+'px';el.style.top=y+'px';}
function calcOpen(on){const el=calcEl();if(on==null)on=!el.classList.contains('on');el.classList.toggle('on',on);OPT.calc=on;saveOpt();if(on){calcPlace(el);calcShow();}}
function calcKey(k){let s=CALC.ex;
 if(k==='C'){s='';}else if(k==='⌫'){s=CALC.done?'':s.slice(0,-1);}
 else if(k==='='){const v=calcEval(s);if(v==null)return;CALC.ex=calcFmt(v).replace(/,/g,'');CALC.done=true;calcShow();return;}
 else{if(CALC.done&&/[\d.(]/.test(k))s='';if(/[÷×−+]/.test(k)&&/[÷×−+]$/.test(s))s=s.slice(0,-1);s+=k;}
 CALC.ex=s.slice(0,80);CALC.done=false;calcShow();}
/* drag by the title bar (pointer events: mouse, finger, pen) */
function calcDrag(el){const hd=el.querySelector('#calhd');let d=null;
 hd.addEventListener('pointerdown',ev=>{if(ev.target.closest('button'))return;d={x:ev.clientX-el.offsetLeft,y:ev.clientY-el.offsetTop};hd.setPointerCapture(ev.pointerId);ev.preventDefault();});
 hd.addEventListener('pointermove',ev=>{if(!d)return;OPT.calcPos=[ev.clientX-d.x,ev.clientY-d.y];calcPlace(el);});
 const end=()=>{if(d){d=null;saveOpt();}};hd.addEventListener('pointerup',end);hd.addEventListener('pointercancel',end);
 addEventListener('resize',()=>{if(el.classList.contains('on'))calcPlace(el);});}
/* keyboard: only while it is open, and only calculator keys (game keys like R, X, C still work) */
function calcKeyboard(e){const el=$('calc');if(!el||!el.classList.contains('on')||e.ctrlKey||e.metaKey||e.altKey)return false;
 const m={'*':'×','/':'÷','-':'−','+':'+','Enter':'=','=':'=','Backspace':'⌫','(':'(',')':')','.':'.',',':'.','%':'%'};const k=/^\d$/.test(e.key)?e.key:m[e.key];if(!k)return false;
 if(k==='%'){CALC.ex+='%';CALC.done=false;calcShow();}else calcKey(k);e.preventDefault();return true;}
Object.assign(ACT,{calcOpen:()=>calcOpen(),calcClose:()=>calcOpen(false),calcKey:v=>calcKey(v)});
if(OPT.calc)setTimeout(()=>calcOpen(true),0);
