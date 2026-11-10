"use strict";
/* ============================================================
   app.js: SHARED APP LOGIC (no DOM access)
   Loaded after plan.js by index.html and by test.html.
   test.html sets window.WTA_KEY to a throwaway key before loading this file,
   so tests never touch your real data ('hybrid15.v1').
   ============================================================ */
const APP_VERSION = '2.0.0';   // bump this AND CACHE_VERSION in sw.js on every upload
const WHATS_NEW = [
  'Works offline and can be installed to the Home Screen.',
  'Safer data: backup reminders, import preview, an automatic copy before every import, and Undo Last Import.',
  'Equipment Profile: targets round to your dumbbells, cable stack and plates, with a plate calculator under barbell targets.',
  'Optional RPE on every set: easy sets can take a bigger step, very hard sets hold.',
  'Alternates learn your personal load ratio after 2+ sessions.',
  'Early deload suggestion when fatigue signs stack up.',
  'Shift Plan Forward 1 Week and Repeat This Week.',
  'Heart-rate zones in bpm and a 10K prediction.',
  'Focus Mode, a session clock, and a rest timer that survives screen locks.',
  'Estimated-max charts, weekly sets per muscle group, and PR badges.'
];
 
/* ---------------- small helpers ---------------- */
const pad = n=>String(n).padStart(2,'0');
const fmtKey = d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pk = k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const addDays = (d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const dateAt = (wi,di)=>addDays(START,wi*7+di);
const keyAt = (wi,di)=>fmtKey(dateAt(wi,di));
const fmtLong = d=>d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
const fmtShort = d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
const fmtShortY = d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const esc = s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v=>{if(v===''||v==null)return null;const n=parseFloat(v);return isFinite(n)?n:null};
const roundTo=(v,inc)=>Math.round(v/inc)*inc;
const floorTo=(v,s)=>Math.floor(v/s+1e-9)*s;
const ceilTo=(v,s)=>Math.ceil(v/s-1e-9)*s;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=a=>a.length?a.reduce((p,c)=>p+c,0)/a.length:null;
const trim=n=>String(Math.round(n*10)/10);
const isKey=k=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&fmtKey(pk(k))===k;
 
/* ---------------- storage ---------------- */
const KEY=(typeof window!=='undefined'&&window.WTA_KEY)||'hybrid15.v1';   // kept so earlier saved data still loads
const KEYS={pre:KEY+'.preimport',ver:KEY+'.appver',timer:KEY+'.timer',bk:KEY+'.bkdismiss'};
const LS={
  get(k){try{return localStorage.getItem(k)}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
const PLATE_OPTS=[45,35,25,10,5,2.5];
function defEquip(){return {dbMax:80,dbStep:5,stackStep:5,bar:45,smithBar:15,plates:PLATE_OPTS.slice()}}
/* Every field added after v2 is optional; normalize() fills defaults so old data and old backups load. */
function defaults(){return {v:3,logs:{},baselines:{},body:[],extra:0,
  settings:{units:'mi',autoTimer:true,wake:false,altOff:{},equip:defEquip(),altRatios:{},maxHR:'',restHR:'',age:''},
  deloadOverride:{},inserts:[],hiddenLogs:[]}}
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
/* Versioned migrations. v2 → v3 adds only optional fields, so no logs are rewritten. */
function migrate(s){
  if(!s.v||s.v<3){/* nothing to convert: new fields are optional and defaulted in normalize() */}
  s.v=3;return s;
}
function normalize(s){
  s.extra=Math.max(0,Math.min(60,parseInt(s.extra)||0));
  s.body=Array.isArray(s.body)?s.body:[];s.baselines=isObj(s.baselines)?s.baselines:{};
  if(!isObj(s.logs))s.logs={};
  for(const k in s.logs){
    const l=s.logs[k];
    if(!isObj(l)){delete s.logs[k];continue}
    if(l.short&&!l.dur)l.dur='40';delete l.short;
    if(l.ex)for(const id in l.ex){
      const x=l.ex[id];
      if(!isObj(x)){delete l.ex[id];continue}
      if(!x.sets){
        const arr=Array.isArray(x.s)?x.s:[];
        x.sets=arr.map(d=>({w:x.w==null?'':x.w,r:'',d:!!d}));
        if(!x.sets.length&&x.w!=null&&x.w!=='')x.sets=[{w:x.w,r:'',d:false}];
        delete x.s;delete x.w;
      }else x.sets=(Array.isArray(x.sets)?x.sets:[]).map(v=>v||{});
    }
  }
  const st=s.settings=isObj(s.settings)?s.settings:{};
  st.altOff=isObj(st.altOff)?st.altOff:{};
  st.altRatios=isObj(st.altRatios)?st.altRatios:{};
  const e=Object.assign(defEquip(),isObj(st.equip)?st.equip:{}),de=defEquip();
  ['dbMax','dbStep','stackStep','bar','smithBar'].forEach(f=>{const n=num(e[f]);e[f]=(n==null||n<0||(f!=='smithBar'&&f!=='bar'&&n===0))?de[f]:n});
  e.plates=(Array.isArray(e.plates)?e.plates:de.plates).map(Number).filter(p=>PLATE_OPTS.includes(p));
  st.equip=e;
  ['maxHR','restHR','age'].forEach(f=>{if(st[f]==null)st[f]=''});
  s.deloadOverride=isObj(s.deloadOverride)?s.deloadOverride:{};
  s.inserts=(Array.isArray(s.inserts)?s.inserts:[]).filter(x=>isObj(x)&&(x.kind==='pause'||x.kind==='repeat')&&parseInt(x.after)>=1);
  let mx=0;s.inserts.forEach(x=>{x.after=parseInt(x.after);if(x.kind==='repeat')x.of=parseInt(x.of)||x.after;mx=Math.max(mx,parseInt(x.seq)||0)});
  s.inserts.forEach(x=>{x.seq=parseInt(x.seq)||++mx});
  s.hiddenLogs=Array.isArray(s.hiddenLogs)?s.hiddenLogs:[];
  return migrate(s);
}
function parseState(s){const d=defaults();return normalize(Object.assign(d,s,{settings:Object.assign(d.settings,(s&&s.settings)||{})}))}
function load(){
  try{const s=JSON.parse(LS.get(KEY));if(s&&s.logs)return parseState(s)}catch(e){}
  return defaults();
}
function save(){LS.set(KEY,JSON.stringify(state))}
const L = key=>(state.logs[key]=state.logs[key]||{});
function hasData(){return Object.keys(state.logs).some(k=>logHasData(state.logs[k]))}
function logHasData(l){
  if(!l)return false;
  return Object.keys(l).some(f=>{const v=l[f];if(v==null||v===''||v===false)return false;if(typeof v==='object')return Object.keys(v).length>0;return true});
}
 
/* Backup file check before import: returns {ok, err, n, first, last} */
function validateBackup(s){
  if(!isObj(s))return {ok:false,err:'That file is not a valid backup (not a JSON object).'};
  if(!isObj(s.logs))return {ok:false,err:'That file is not a valid backup: it has no "logs" section.'};
  const keys=Object.keys(s.logs);
  const bad=keys.filter(k=>!isKey(k)||!isObj(s.logs[k]));
  if(bad.length)return {ok:false,err:`That file is not a valid backup: ${bad.length} log entr${bad.length>1?'ies have':'y has'} an invalid date (e.g. "${String(bad[0]).slice(0,20)}").`};
  if(s.body!=null&&!Array.isArray(s.body))return {ok:false,err:'That file is not a valid backup: "body" is not a list.'};
  if(s.settings!=null&&!isObj(s.settings))return {ok:false,err:'That file is not a valid backup: "settings" is not an object.'};
  const days=keys.filter(k=>logHasData(s.logs[k])).sort();
  return {ok:true,n:days.length,first:days[0]||null,last:days[days.length-1]||null};
}
 
/* ============================================================
   CALENDAR: plan weeks + inserted pause/repeat weeks + early deloads
   CAL[ci] = one calendar week starting START + ci*7 days.
   w.n = the PLAN week number used by progression rules (a repeat of Week 8 has n=8).
   ============================================================ */
let CAL=[],WEEKS=15,PLAN_WEEKS=15,END=null;
const _pw={};
function planWeek(n){return n<=15?BASE_PLAN[n-1]:(_pw[n]||(_pw[n]=genWeek(n)))}
const overrideOn=wid=>!!(state.deloadOverride||{})[wid];
function isEarly(n){return overrideOn(String(n))&&!planWeek(n).deload}
function isDeloadN(n){return !!planWeek(n).deload||isEarly(n)}
function deloadify(w){
  const run=d=>{
    if(d.t==='LIFT2')return D('OFF',{note:'No Lift 2 in a deload week. Off, or an easy walk.'});
    if(d.t==='QA'||d.t==='QB'||d.t==='TEST10K')return D('EASY',{min:'30',note:'Early deload: easy run instead of the planned quality session.'});
    if(d.t==='LONG')return D('Z2',{min:'35',note:'Early deload: shorter Zone 2 instead of the long run.'});
    if(d.t==='Z2')return D('Z2',{min:'35'});
    return d.fin?Object.assign({},d,{fin:null}):d;
  };
  return Object.assign({},w,{deload:true,early:true,rpe:'Deload',test:false,
    focus:'Early deload (your choice after fatigue signs): 90% loads, sets cut by a third, no finishers, no Lift 2, easy runs only.',days:w.days.map(run)});
}
function calPlan(n){
  let w=Object.assign({},planWeek(n),{kind:'plan',wid:String(n),label:`Week ${n}`});
  if(!w.deload&&overrideOn(w.wid))w=deloadify(w);
  return w;
}
function calInsert(x){
  const wid='i'+x.seq;
  if(x.kind==='pause'){
    const src=planWeek(x.after);
    return {n:x.after,kind:'pause',pause:true,wid,seq:x.seq,label:'Pause Week',block:src.block,rpe:'Easy',lifts:src.lifts,
      focus:`Pause week after Week ${x.after} (illness or travel): rest, mobility and optional easy cardio. The plan resumes next week.`,days:PAUSE_DAYS};
  }
  const src=planWeek(x.of);
  let w=Object.assign({},src,{n:x.of,kind:'repeat',repeat:true,wid,seq:x.seq,label:`Week ${x.of} (Repeat)`,test:false,
    focus:`Repeat of Week ${x.of}: same sessions and the same loads, no increase.`});
  if(!w.deload&&overrideOn(wid))w=deloadify(w);
  return w;
}
function rebuildPlan(){
  PLAN_WEEKS=15+(state.extra||0);CAL=[];
  const ins=state.inserts||[];
  for(let n=1;n<=PLAN_WEEKS;n++){
    CAL.push(calPlan(n));
    ins.filter(x=>x.after===n).forEach(x=>CAL.push(calInsert(x)));
  }
  CAL.forEach((w,i)=>w.ci=i);
  WEEKS=CAL.length;END=addDays(START,WEEKS*7-1);
}
function locate(key){
  const diff=Math.round((pk(key)-START)/86400000);
  if(diff<0||diff>=WEEKS*7)return null;
  return {wi:Math.floor(diff/7),di:diff%7};
}
function entry(key){
  const loc=locate(key);if(!loc)return null;
  const week=CAL[loc.wi],day=week.days[loc.di],log=state.logs[key]||{};
  return {key,loc,week,day,type:log.type||day.t,log,date:pk(key)};
}
function status(e){return e.type==='SKIP'?'skipped':(e.log.status||'')}
function modeOf(e){return e.log.dur||'full'}
const weekLabel=w=>w.label||`Week ${w.n}`;
 
/* Logged days on or after calendar week ci */
function loggedFrom(ci){const k0=keyAt(ci,0);return Object.keys(state.logs).filter(k=>k>=k0&&logHasData(state.logs[k])).sort()}
/* Insert a pause or repeat week right after calendar week ci. Returns {ok} or {err}. */
function insertAfter(ci,kind){
  const w=CAL[ci];if(!w)return {err:'That week is outside the plan.'};
  if(kind==='repeat'&&w.pause)return {err:'A pause week cannot be repeated.'};
  const later=loggedFrom(ci+1);
  if(later.length)return {err:`You already have ${later.length} logged day${later.length>1?'s':''} after ${weekLabel(w)} (first: ${fmtShort(pk(later[0]))}). Inserting a week would move those logs to different plan weeks, so this is blocked. Use it on the current week instead.`};
  const ins=state.inserts=state.inserts||[];
  const seq=1+ins.reduce((m,x)=>Math.max(m,x.seq||0),0);
  const rec={after:w.n,kind,seq};if(kind==='repeat')rec.of=w.n;
  let idx;
  if(w.kind==='plan'){idx=ins.findIndex(x=>x.after===w.n);if(idx<0)idx=ins.length}
  else idx=ins.findIndex(x=>x.seq===w.seq)+1;
  ins.splice(idx,0,rec);
  rebuildPlan();
  return {ok:true,rec};
}
function lastInsert(){const ins=state.inserts||[];if(!ins.length)return null;return ins.reduce((a,b)=>(b.seq>a.seq?b:a))}
function undoInsertInfo(){
  const x=lastInsert();if(!x)return null;
  const ci=CAL.findIndex(w=>w.wid==='i'+x.seq);
  const days=[0,1,2,3,4,5,6].map(d=>keyAt(ci,d)).filter(k=>logHasData(state.logs[k]));
  return {x,ci,label:weekLabel(CAL[ci]),days,later:loggedFrom(ci+1)};
}
function undoInsert(){
  const u=undoInsertInfo();if(!u)return {err:'Nothing to undo.'};
  if(u.later.length)return {err:`Can't undo: you have ${u.later.length} logged day${u.later.length>1?'s':''} after the ${u.label}. Undoing would move them to different plan weeks.`};
  const today=fmtKey(new Date());
  u.days.forEach(k=>{state.hiddenLogs.push({date:k,from:u.label,hiddenOn:today,log:state.logs[k]});delete state.logs[k]});
  state.inserts=state.inserts.filter(x=>x.seq!==u.x.seq);
  delete state.deloadOverride['i'+u.x.seq];
  rebuildPlan();
  return {ok:true,hidden:u.days.length};
}
 
/* ============================================================
   EQUIPMENT PROFILE: what your gym can actually load
   ============================================================ */
const EQ=()=>state.settings.equip;
function plateList(){return (EQ().plates||[]).map(Number).filter(p=>p>0).sort((a,b)=>b-a)}
function minPlate(){const p=plateList();return p.length?p[p.length-1]:null}
let _pl={sig:null,best:null};
/* Fewest-plates breakdown for every per-side load up to 400 lb (0.25 lb resolution).
   Assumes you have enough pairs of each ticked plate. */
function plateDP(){
  const p=plateList(),sig=p.join(',');if(_pl.sig===sig)return _pl.best;
  const U=4,MAX=400*U,best=new Array(MAX+1).fill(null);best[0]=[];
  const pi=p.map(q=>Math.round(q*U));
  for(let s=1;s<=MAX;s++){for(let j=0;j<pi.length;j++){const q=pi[j];if(q<=s&&best[s-q]&&(!best[s]||best[s-q].length+1<best[s].length))best[s]=best[s-q].concat([p[j]])}}
  best.forEach(b=>b&&b.sort((x,y)=>y-x));
  _pl={sig,best};return best;
}
function sidePlates(total,bar){
  const side=(total-bar)/2,U=4,i=Math.round(side*U);
  if(side<-1e-9||Math.abs(side*U-i)>1e-6)return null;
  const b=plateDP();return i<b.length?b[i]:null;
}
function floorLoadable(w,bar){
  if(w<=bar+1e-9)return bar;
  const b=plateDP();let i=Math.min(b.length-1,Math.floor((w-bar)/2*4+1e-6));
  while(i>0&&!b[i])i--;return bar+2*i/4;
}
function ceilLoadable(w,bar){
  if(w<=bar+1e-9)return bar;
  const b=plateDP();let i=Math.ceil((w-bar)/2*4-1e-6);
  while(i<b.length&&!b[i])i++;return i<b.length?bar+2*i/4:floorLoadable(w,bar);
}
/* "45 + 25 + 5 per side" for a total load */
function plateText(total,bar){
  if(total==null)return null;
  if(Math.abs(total-bar)<1e-9)return 'Bar only';
  const s=sidePlates(total,bar);
  return s&&s.length?s.map(trim).join(' + ')+' per side':null;
}
function eqOf(it){return it.eq||'other'}
function barOf(it){return eqOf(it)==='smith'?EQ().smithBar:EQ().bar}
const isPlateLoaded=it=>eqOf(it)==='bb'||eqOf(it)==='smith';
/* Progression step for an item, given the profile */
function stepOf(it){
  const q=eqOf(it),inc=it.inc||2.5,e=EQ(),mp=minPlate()||2.5;
  if(q==='bb'||q==='smith')return Math.max(inc,5,2*mp);
  if(q==='db')return Math.max(inc,e.dbStep);
  if(q==='stack')return Math.max(inc,e.stackStep);
  if(q==='added')return Math.max(inc,mp);
  return inc;
}
/* Largest load the equipment can produce that is ≤ w (never rounds up past a ceiling) */
function fitDown(it,w){
  if(w==null)return w;
  const q=eqOf(it),e=EQ();
  if(q==='bb'||q==='smith')return floorLoadable(w,barOf(it));
  if(w<=0)return 0;
  if(q==='db')return Math.min(e.dbMax,Math.max(e.dbStep,floorTo(w,e.dbStep)));
  if(q==='stack')return Math.max(e.stackStep,floorTo(w,e.stackStep));
  if(q==='added')return floorTo(w,minPlate()||2.5);
  return w;
}
/* Smallest producible load ≥ w */
function fitUp(it,w){
  if(w==null)return w;
  const q=eqOf(it),e=EQ();
  if(q==='bb'||q==='smith')return ceilLoadable(w,barOf(it));
  if(q==='db')return Math.min(e.dbMax,ceilTo(w,e.dbStep));
  if(q==='stack')return ceilTo(w,e.stackStep);
  if(q==='added')return ceilTo(w,minPlate()||2.5);
  return w;
}
 
/* ============================================================
   HISTORY LOOKUPS (progression engine)
   ============================================================ */
function sortedKeys(){return Object.keys(state.logs).filter(k=>locate(k)).sort()}
/* Sets that count for a main exercise's progression. When an alternate was used,
   each alternate set stands in for the main lift at the main-lift target it was matched to
   (eqW/eqR saved when the set was tapped done). Missing the alternate's reps counts as a missed set. */
function mainSets(l,id){
  if(!l||!l.ex)return null;
  const ak=l.alt&&l.alt[id];
  if(ak){
    const x=l.ex[id+'__'+ak];if(!x||!x.sets)return null;
    return x.sets.map(s=>{s=s||{};const r=num(s.r),tr=num(s.tr),er=num(s.eqR);
      return {w:s.d?s.eqW:'',r:s.d&&er!=null?((r==null||tr==null||r>=tr)?er:er-1):'',d:!!s.d,rpe:s.rpe,alt:true}});
  }
  const x=l.ex[id];return x&&x.sets?x.sets:null;
}
function topW(l,id){
  const sets=mainSets(l,id);
  if(!sets||(l.skip&&l.skip[id]))return null;
  let best=null,bestDone=null;
  sets.forEach(s=>{s=s||{};const w=num(s.w);if(w==null)return;if(best==null||w>best)best=w;if(s.d&&(bestDone==null||w>bestDone))bestDone=w});
  return bestDone!=null?bestDone:best;
}
/* Latest logged sets of exercise id in plan week wk, looking only at calendar weeks before `before` */
function setsInWeek(id,wk,before){
  const ks=sortedKeys().filter(k=>{const ci=locate(k).wi,w=CAL[ci];return w.n===wk&&!w.pause&&(before==null||ci<before)}).reverse();
  for(const k of ks){
    const l=state.logs[k];if(l.skip&&l.skip[id])continue;
    const ms=mainSets(l,id);if(!ms)continue;
    const sets=ms.map(s=>(s=s||{},{w:num(s.w),r:num(s.r),d:!!s.d,rpe:num(s.rpe)}));
    if(sets.some(s=>s.d||s.w!=null||s.r!=null))return sets;
  }
  return null;
}
function findRef(id,from,before){
  for(let wk=from;wk>=1;wk--){
    if(wk!==from&&isDeloadN(wk))continue;
    const s=setsInWeek(id,wk,before);if(s)return {sets:s,wk};
  }
  return null;
}
/* Progression rule for a CALENDAR week (handles pause, repeat and early-deload weeks) */
function ruleFor(cw){
  if(cw.pause)return {from:cw.n,mode:'hold'};
  if(cw.repeat&&!cw.early)return {from:cw.n,mode:'hold',repeat:true};
  const r=cw.repeat?{from:cw.n,mode:'hold'}:baseRule(cw.n);if(!r)return null;
  if(cw.early)return {from:effFrom(r.from),mode:'pct',pct:.9,early:true};
  return Object.assign({},r,{from:effFrom(r.from)});
}
/* If the reference week was turned into an early deload, reference the week before it instead */
function effFrom(m){let g=0;while(m>=1&&isEarly(m)&&g++<60){const b=baseRule(m);if(!b)break;m=b.from}return m}
function repRange(it,week){
  if(it.rng)return it.rng;
  if(it.main){const R=Number(week.lifts.split('x')[1]);return [R,R]}
  const m=String(it.reps).match(/\d+/g)||['8'];
  return [Number(m[0]),Number(m[m.length-1])];
}
/* Week RPE used for alternate conversion: first number of the range (unchanged from v1) */
function weekRPE(w){if(w.deload)return 6.5;const m=String(w.rpe).match(/\d+(\.\d+)?/);return m?Number(m[0]):8}
/* Planned RPE "T" for effort-based progression: TOP of the range ("7.5–8" → 8); Deload → 6.5 */
function topRPE(s){if(/deload/i.test(String(s)))return 6.5;const m=String(s).match(/\d+(\.\d+)?/g);return m?Number(m[m.length-1]):8}
function plannedT(n){return isDeloadN(n)?6.5:topRPE(planWeek(n).rpe)}
function suggestL2(it,e){
  const mk=keyAt(e.loc.wi,it.l2==='squat'?0:2);
  let base=topW(state.logs[mk],it.l2),src=it.l2==='squat'?"this week's Monday squat":"this week's Wednesday bench";
  if(base==null){
    for(const k of sortedKeys().filter(k=>k<e.key).reverse()){
      if(CAL[locate(k).wi].deload)continue;
      const w=topW(state.logs[k],it.l2);if(w!=null){base=w;src='your latest '+it.l2;break}
    }
  }
  if(base==null)return null;
  const inc=stepOf(it),w=fitDown(it,roundTo(base*it.pct,inc)),cap=Math.max(w,fitDown(it,floorTo(base*.75,inc)));
  return {sets:Array.from({length:it.sets},()=>({w,r:5,cap})),why:`70% of ${src} (${trim(base)}); ceiling 75%. RPE 6, never grindy.`};
}
/* "sets 1–2, 4" style list */
function setList(a){
  const g=[];a.forEach(n=>{const l=g[g.length-1];if(l&&n===l[1]+1)l[1]=n;else g.push([n,n])});
  return (a.length>1?'sets ':'set ')+g.map(([x,y])=>x===y?x:`${x}–${y}`).join(', ');
}
/* ---------- Week-to-week ceiling ("Do Not Exceed") ----------
   Based on ACSM 2009 position stand (2–10% load increase once the target is exceeded)
   and NSCA guidance (upper body ≈ +5–10 lb, lower body ≈ +10–15 lb per jump for trained lifters).
   Ceiling = last week's weight + the smaller of 10% or the exercise's absolute cap (it.cap),
   never less than one increment, then rounded DOWN to a load your equipment can produce.
   Isolation work (it.iso) and hold / deload / re-entry weeks: the target IS the ceiling. */
function rawCeiling(it,refW){
  const inc=stepOf(it),abs=it.cap!=null?it.cap:inc*2;
  return fitDown(it,floorTo(refW+Math.max(inc,Math.min(refW*0.10,abs)),inc));
}
function ceilingFor(it,refW,target,increasing){
  if(target==null)return null;
  if(!increasing||it.iso)return target;
  return Math.max(target,rawCeiling(it,refW));
}
function suggest(it,e){
  const wk=e.week;
  if((wk.kind==='plan'&&wk.n===1)||(it.noW&&it.noR))return null;
  if(it.l2)return suggestL2(it,e);
  const rule=ruleFor(wk);if(!rule)return null;
  const ref=findRef(it.id,rule.from,e.loc.wi);if(!ref)return null;
  const inc=stepOf(it);
  const gap=rule.mode==='inc'&&ref.wk!==rule.from;          // skipped week: hold, no increase
  const mode=gap?'hold':rule.mode;
  const [lo,hi]=repRange(it,wk),refWk=planWeek(ref.wk);
  const refHi=it.main?Number(refWk.lifts.split('x')[1]):hi;
  const T=plannedT(ref.wk),ranged=!it.main&&lo!==hi;
  const hit=s=>s.r==null||s.r>=refHi;
  const done=ref.sets.filter(s=>s.d);
  const noDone=done.length===0;
  const allClean=!noDone&&done.every(hit);
  const setClean=i=>(i<ref.sets.length&&ref.sets[i].d)?hit(ref.sets[i]):allClean;
  const fw=(ref.sets.find(s=>s.w!=null)||{}).w;
  const sets=[],up=[],held=[],ez=[],rh=[];let atMax=false;
  for(let i=0;i<it.sets;i++){
    const rs=ref.sets[Math.min(i,ref.sets.length-1)];
    const own=i<ref.sets.length&&ref.sets[i].d,rp=own?ref.sets[i].rpe:null;
    const cl=mode==='inc'&&setClean(i);
    let hard=false,easy=false;
    if(mode==='inc'&&rp!=null){
      if(rp>=T+1||rp>=10)hard=true;
      else if(cl&&rp<=T-1.5&&!it.iso&&!ranged&&!it.noW)easy=true;
    }
    if(mode==='inc'){
      if(hard&&(cl||ranged))rh.push(i+1);
      else if(!cl)held.push(i+1);
      else if(easy)ez.push(i+1);
      else up.push(i+1);
    }
    const c=cl&&!(hard&&(cl||ranged));
    let w=rs.w!=null?rs.w:(fw!=null?fw:null),r=null,cap=null;
    if(it.noW)w=null;
    else if(w!=null){
      const refW=w;
      if(mode==='pct'){w=fitDown(it,Math.max(0,roundTo(w*rule.pct,inc)));cap=w}
      else if(c){
        let cand=fitDown(it,refW+(easy?2*inc:inc));
        if(!(cand>refW+1e-9))cand=fitUp(it,refW+1e-6);
        if(!(cand>refW+1e-9)){w=fitDown(it,refW);cap=w;atMax=true}
        else{
          const rc=it.iso?cand:rawCeiling(it,refW);
          w=easy?Math.max(fitDown(it,Math.min(cand,rc)),Math.min(cand,fitUp(it,refW+1e-6))):cand;
          cap=ceilingFor(it,refW,w,true);
        }
      }else{w=fitDown(it,refW);cap=w}
      if(eqOf(it)==='db'&&w>=EQ().dbMax)atMax=atMax||w>=EQ().dbMax&&refW>=EQ().dbMax;
    }
    if(!it.noR){
      const rr=rs.r;
      if(it.main||lo===hi)r=lo;
      else if(mode==='pct')r=lo;
      else if(mode==='hold'||noDone)r=Math.min(hi,rr!=null?rr:lo);
      else if(hard)r=Math.min(hi,rr!=null?rr:lo);
      else r=c?(it.noW?hi:lo):Math.min(hi,(rr!=null?rr:lo-1)+1);
    }
    sets.push({w,r,cap});
  }
  let why;
  const fb=ref.wk!==rule.from?' (nearest logged week)':'';
  const reset=lo!==hi&&!it.main?' and reps reset':'';
  const adds=!it.main&&lo!==hi;
  const mr=a=>trim(Math.max(...a.map(i=>ref.sets[i-1].rpe)));
  const nr=a=>trim(Math.min(...a.map(i=>ref.sets[i-1].rpe)));
  const all=a=>a.length===it.sets;
  if(gap)why=`Week ${rule.from} wasn't logged, so starting from your Week ${ref.wk} weights (no increase after a gap)`;
  else if(mode==='pct')why=`${rule.early?'Early deload: ':(wk.deload?'Deload: ':'')}${Math.round(rule.pct*100)}% of your Week ${ref.wk} weights${fb}`;
  else if(mode==='hold')why=rule.repeat?`Repeat week: same loads as your Week ${ref.wk}${fb}, no increase`:(wk.pause?`Pause week: your Week ${ref.wk} weights, no increase`:`Starting from your Week ${ref.wk} weights${fb}`);
  else if(noDone)why=`Week ${ref.wk} had no sets marked done, so the ${it.noW?'reps are':'weight is'} held. Tap each set as done to progress.`;
  else if(!ez.length&&!rh.length){
    if(!held.length)why=it.noW?`Week ${ref.wk}: every rep hit, building toward ${hi}`:`Week ${ref.wk}: every set clean, +${trim(inc)} lb${reset}`;
    else if(!up.length)why=`Week ${ref.wk}: not every rep was hit, so ${it.noW?'adding a rep':'same weight'}`;
    else why=it.noW?`Week ${ref.wk}: ${setList(up)} hit every rep, building toward ${hi}; ${setList(held)} adding a rep`
      :`Week ${ref.wk}: ${setList(up)} clean, +${trim(inc)} lb${reset}; ${setList(held)} held${adds?' (+1 rep)':''}`;
  }else{
    const seg=[];
    if(up.length)seg.push(it.noW?`${setList(up)} hit every rep`:`${all(up)?'every set':setList(up)} clean, +${trim(inc)} lb${reset}`);
    if(ez.length)seg.push(`${all(ez)?'':setList(ez)+' '}clean at RPE ${nr(ez)} (felt easy), bigger step up to the ceiling`);
    if(rh.length)seg.push(ranged?`${all(rh)?'':setList(rh)+' '}RPE ${mr(rh)}, holding reps`:`${all(rh)?'':setList(rh)+' '}clean but RPE ${mr(rh)}, holding`);
    if(held.length)seg.push(`${setList(held)} missed reps, ${it.noW?'adding a rep':'same weight'}${adds&&!it.noW?' (+1 rep)':''}`);
    why=`Week ${ref.wk}: ${seg.join('; ')}`;
  }
  if(atMax)why+=`. At your heaviest dumbbell (${trim(EQ().dbMax)} lb): add reps within the range or slow the lowering`;
  return {sets,why};
}
 
/* ============================================================
   SESSION BUILDERS
   ============================================================ */
const chk=(id,name,note)=>({check:true,id,name,note});
const ex=(id,name,sets,reps,o)=>Object.assign({id,name,sets,reps,rest:0,restLabel:'',inc:2.5,wl:'lb',eq:EX_EQ[id]||'other'},o||{});
 
/* ---------- alternates ---------- */
const altOn=a=>!((state.settings.altOff||{})['lift:'+a.k]);
const altsFor=id=>(ALTS[id]||[]).filter(altOn);
function altByKey(k){for(const g in ALTS)for(const a of ALTS[g])if(a.k===k)return a;return null}
function altItem(x,a){
  return Object.assign({},x,{id:x.id+'__'+a.k,name:a.name,wl:a.wl||x.wl,inc:a.inc||x.inc,eq:a.eq||'other',warm:null,gen:false,l2:null,
    alt:a,base:x,note:a.note||'',reps:a.repsLabel||x.reps,noW:a.noW!=null?a.noW:x.noW,noR:a.noR!=null?a.noR:x.noR});
}
function useAlts(items,e){
  const sel=e.log.alt||{};
  return items.map(x=>{if(x.check||!sel[x.id])return x;const a=altsFor(x.id).find(a=>a.k===sel[x.id]);return a?altItem(x,a):x});
}
function latestBW(){const b=state.body.filter(b=>b.bw!=null).sort((a,b)=>a.date<b.date?-1:1);return b.length?b[b.length-1].bw:null}
const altMax=a=>a.eq==='db'?EQ().dbMax:(a.max||null);
/* Learned ratio: after 2+ sessions the default is blended with your own (50% at 2, 75% at 3, 100% from 4),
   kept within 0.5×–1.5× of the default. Stored in settings.altRatios[k] = {n, personal, ratio, reset?}. */
function altRatio(a){
  const r=(state.settings.altRatios||{})[a.k];
  if(r&&r.n>=2&&r.ratio>0)return {ratio:r.ratio,personal:true,n:r.n};
  return {ratio:a.ratio,personal:false,n:r&&r.n||0};
}
function learnRatio(k){
  const a=altByKey(k);if(!a||a.rpeOnly||!a.ratio)return null;
  const store=state.settings.altRatios=state.settings.altRatios||{};
  const reset=(store[k]&&store[k].reset)||'';
  const sess=[];
  for(const key of sortedKeys()){
    if(reset&&key<=reset)continue;
    const l=state.logs[key];if(!l.alt)continue;
    for(const mid in l.alt){
      if(l.alt[mid]!==k)continue;
      const x=l.ex&&l.ex[mid+'__'+k];if(!x||!x.sets)continue;
      const e=entry(key),rirM=clamp(10-weekRPE(e.week),0,5),bw=a.bw?latestBW():0;
      if(a.bw&&bw==null)continue;
      const rs=[];
      for(const s of x.sets){
        if(!s||!s.d)continue;
        const w=num(s.w),r=num(s.r),rp=num(s.rpe),ew=num(s.eqW),er=num(s.eqR);
        if(w==null||w<=0||r==null||r<=0||rp==null||ew==null||er==null)continue;
        const mainE1=(ew+bw)*(1+(er+rirM)/30);if(mainE1<=0)continue;
        rs.push(w*(1+(r+clamp(10-rp,0,5))/30)/mainE1);
      }
      if(rs.length)sess.push(avg(rs));
    }
  }
  const n=sess.length;
  if(!n){if(reset)store[k]={reset};else delete store[k];return null}
  const pers=clamp(avg(sess.slice(-6)),.5*a.ratio,1.5*a.ratio);
  const wt=n>=4?1:n===3?.75:n===2?.5:0;
  const rec={n,personal:Math.round(pers*1000)/1000,ratio:Math.round((a.ratio*(1-wt)+pers*wt)*1000)/1000};
  if(reset)rec.reset=reset;
  store[k]=rec;return rec;
}
function resetRatio(k){const store=state.settings.altRatios=state.settings.altRatios||{};store[k]={reset:fmtKey(new Date())}}
/* Same-effort conversion (Epley with reps-in-reserve): est. max = load × (1 + (reps + RIR)/30) */
function convertAlt(a,base,ms,mr,rpe){
  if(a.rpeOnly||ms.w==null)return {w:null,r:a.noR?null:mr,cap:null};
  let mw=ms.w,mc=ms.cap!=null?ms.cap:ms.w,bw=null;
  if(a.bw){bw=latestBW();if(bw==null)return {w:null,r:mr,cap:null,needBW:true};mw+=bw;mc+=bw}
  const ai={eq:a.eq||'other',inc:a.inc},inc=stepOf(ai),mx=altMax(a),ratio=altRatio(a).ratio;
  const rir=Math.max(0,Math.min(5,10-rpe)),f=r=>1+(r+rir)/30;
  const dn=v=>fitDown(ai,floorTo(v,inc)),near=v=>fitDown(ai,roundTo(v,inc));
  if(base.noR||mr==null){
    let w=near(mw*ratio),cap=Math.max(w,dn(mc*ratio));
    if(mx){w=Math.min(w,mx);cap=Math.min(cap,mx)}
    return {w,r:null,cap};
  }
  const e1=mw*f(mr)*ratio,e1c=mc*f(mr)*ratio;
  let r=mr,w=e1/f(r),cap=e1c/f(r),maxed=false,short=false;
  if(mx&&w>mx){
    maxed=true;const need=Math.round(30*(e1/mx)-30-rir);
    short=need>20;r=Math.min(20,Math.max(mr,need));w=mx;cap=mx;
  }
  w=near(w);cap=Math.max(w,dn(cap));
  if(mx){w=Math.min(w,mx);cap=Math.min(cap,mx)}
  return {w,r,cap:Math.max(cap,w),maxed,short};
}
const unitWord=wl=>({'lb':'lbs','lb each':'lbs each','added lb':'lbs added','lb total':'lbs total'})[wl]||wl;
function altSuggest(it,e){
  const base=it.base,a=it.alt,ms=suggest(base,e),rpe=weekRPE(e.week),[lo]=repRange(base,e.week);
  const bn=base.name.replace(/ \(.*\)$/,'').replace(/ @.*$/,'');
  if(!ms||!ms.sets.length){
    return {none:true,sets:Array.from({length:it.sets},()=>({w:null,r:it.noR?null:lo,cap:null})),
      why:`No ${bn} target yet, so pick a weight that lands at RPE ${rpe}. This set does not move ${bn} progression.`};
  }
  let maxed=false,short=false,needBW=false;
  const sets=[];
  for(let i=0;i<it.sets;i++){
    const m=ms.sets[Math.min(i,ms.sets.length-1)],mr=base.noR?null:(m.r!=null?m.r:lo);
    const c=convertAlt(a,base,m,mr,rpe);
    if(c.maxed)maxed=true;if(c.short)short=true;if(c.needBW)needBW=true;
    sets.push(Object.assign(c,{eqW:m.w,eqR:mr}));
  }
  const m0=ms.sets[0],u=unitWord(base.wl),pr=a.rpeOnly?{personal:false}:altRatio(a);
  let why=a.rpeOnly
    ?`Same sets and reps as ${bn}. Pick the load that lands at RPE ${rpe}.`
    :`Matched to this week's ${bn} target (${m0.w!=null?trim(m0.w)+' '+u:'–'}${m0.r!=null?' × '+m0.r:''}) at the same effort, RPE ${rpe}.`;
  if(pr.personal)why+=` Personalized ratio ×${pr.ratio} from ${pr.n} of your sessions (default ×${a.ratio}).`;
  if(needBW)why+=' Add your bodyweight in Progress → Body to get a number.';
  if(maxed)why+=` The matched load is heavier than ${a.eq==='db'?'your heaviest dumbbell':'the max'} (${trim(altMax(a))} lb), so reps go up to keep the effort equal (volume-matched).`;
  if(short)why+=' Still easier than the main lift at 20 reps: slow the lowering to 3 s.';
  if(!a.rpeOnly&&!pr.personal)why+=' Log an RPE on each set to personalize this ratio.';
  why+=` Counts toward ${bn} progression when every set is tapped done at the target reps.`;
  return {sets,why,alt:true,personal:!!pr.personal};
}
/* Recommendation line under each set: "Target = XX lbs for X reps. Do Not Exceed XX lbs." */
function tgtText(it,sg,e){
  const u=unitWord(it.wl),rpe=weekRPE(e.week);
  if(sg.needBW)return `Target: add your bodyweight in Progress → Body${sg.r!=null?`, then ${sg.r} reps`:''}.`;
  if(sg.w!=null){
    const cap=sg.cap!=null?` Do Not Exceed ${trim(sg.cap)} ${u}.`:'';
    return it.noR||sg.r==null?`Target = ${trim(sg.w)} ${u}.${cap}`:`Target = ${trim(sg.w)} ${u} for ${sg.r} reps.${cap}`;
  }
  if(it.alt&&it.alt.rpeOnly){
    if(it.noR||sg.r==null)return `Target = ${it.reps} at RPE ${rpe}.`;
    return it.noW?`Target = ${sg.r} reps at RPE ${rpe}.`:`Target = RPE ${rpe} for ${sg.r} reps (pick the weight).`;
  }
  if(sg.r!=null)return `Target = ${sg.r} reps.`;
  return '';
}
 
function buildLift(e){
  const {week,day,type}=e,mode=modeOf(e),dl=week.deload;
  const [S,R]=week.lifts.split('x').map(Number);
  const ms=dl?3:S,a=n=>dl?2:n,N=EX_NAMES;
  const M=(id,name,sets,reps,o)=>ex(id,name,sets,reps,Object.assign({main:true},o||{}));
  const wuMin=mode==='full'?6:(mode==='40'?4:3),mobMin=mode==='full'?4:2;
  const wu=t=>chk('wu',`Warm-Up (${wuMin} min)`,t);
  const mob=t=>chk('mob',`Mobility (${mobMin} min)`,t);
  let it=[];
  if(type==='LEGS'){
    it=[wu('2 min easy cardio, ankle rocks 10/side, bodyweight squats, then 2 sets of 3 box jumps (or squat jumps): crisp, low fatigue.'),
      M('squat',N.squat,ms,R,{rest:165,restLabel:'2.5–3 min',inc:5,warm:'squat',s30:3,cap:15}),
      ex('rdl',N.rdl,dl?2:3,'8',{rest:120,restLabel:'2 min',inc:5,warm:'rdl',s30:2,cap:15}),
      ex('split',N.split,dl?2:3,'8/leg',{group:'A',rest:75,restLabel:'60–90 s',inc:5,wl:'lb each',s30:2,cap:5})];
    if(!dl)it.push(ex('calf',N.calf,3,'10–15',{group:'A',rest:75,restLabel:'60–90 s',inc:5,drop:30,rng:[10,15],iso:true}));
    if(!dl)it.push(day.fin==='FARMER'
      ?ex('farmer',N.farmer,5,'30 m',{rest:60,restLabel:'as needed',inc:5,drop:40,wl:'lb each',noR:true,cap:10})
      :ex('sled',N.sled,6,'20 m',{rest:40,restLabel:'40 s',inc:5,drop:40,noR:true,cap:20}));
    it.push(mob('Couch stretch or hip flexor stretch + thoracic spine rotations.'));
  }else if(type==='LEGS_LIGHT'){
    const g={gen:true,bar:0,step:2.5,eq:'other'};
    it=[wu('2 min easy cardio, ankle rocks, bodyweight squats, a few jumps.'),
      M('squat',N.light_squat,3,'5',Object.assign({rest:150,restLabel:'2–3 min',inc:5,warm:'squat',note:'Back squat, goblet squat, DB or KB squat: whatever you have. Work up to a clean RPE 6–7.'},g)),
      ex('rdl',N.light_rdl,2,'8',Object.assign({rest:120,restLabel:'2 min',inc:5,warm:'rdl',note:'RDL, DB or KB deadlift, single-leg RDL. Clean RPE 6–7.'},g)),
      ex('split',N.light_split,2,'8/leg',{rest:75,restLabel:'60–90 s',inc:5,wl:'lb each',gen:true,eq:'other',note:'Split squat, reverse lunge, step-up.'}),
      mob('Couch stretch or hip flexor stretch + thoracic spine rotations.')];
  }else if(type==='PUSH'){
    it=[wu('Shoulder CARs, band pull-aparts, light bench ramp, then 3×4 med-ball chest passes or scoop throws.'),
      M('bench',N.bench,ms,R,{rest:165,restLabel:'2.5–3 min',warm:'bench',s30:3,cap:10}),
      ex('ohp',N.ohp,a(3),'8',{rest:120,restLabel:'2 min',wl:'lb each',warm:'ohp',s30:2,cap:5}),
      ex('incline',N.incline,a(3),'10',{group:'A',rest:70,restLabel:'60–75 s',wl:'lb each',s30:2,cap:5}),
      ex('lat',N.lat,a(3),'12–20',{group:'A',rest:70,restLabel:'60–75 s',wl:'lb each',drop:30,rng:[12,20],iso:true}),
      ex('tri',N.tri,a(2),'10–15',{group:'B',rest:60,restLabel:'60 s',drop:40,rng:[10,15],iso:true,note:'Add a third set if you are ahead of the clock.'}),
      ex('face',N.face,a(2),'12–20',{group:'B',rest:60,restLabel:'60 s',drop:40,rng:[12,20],iso:true}),
      mob('Hip flexors + thoracic spine.')];
  }else if(type==='PULL'){
    it=[wu('Shoulder CARs, scapular pull-ups, band pull-aparts, light pull-up ramp.'),
      M('pullups',N.pullups,ms,R,{rest:150,restLabel:'2.5 min',wl:'added lb',warm:'pull',s30:3,cap:5,note:'Enter 0 for bodyweight.'}),
      ex('row',N.row,a(3),'8',{rest:120,restLabel:'2 min',warm:'row',s30:2,cap:10}),
      ex('cable',N.cable,a(3),'10',{group:'A',rest:70,restLabel:'60–75 s',s30:2,cap:10}),
      ex('rdelt',N.rdelt,a(3),'12–20',{group:'A',rest:70,restLabel:'60–75 s',drop:30,rng:[12,20],iso:true}),
      ex('curl',N.curl,a(2),'8–12',{group:'B',rest:60,restLabel:'60 s',wl:'lb each',drop:40,rng:[8,12],iso:true}),
      ex('knee',N.knee,a(2),'10',{group:'B',rest:60,restLabel:'60 s',noW:true,drop:40}),
      ex('pallof',N.pallof,a(2),'10–15/side',{drop:40,rng:[10,15],iso:true}),
      mob('Hip flexors + thoracic spine.')];
  }else if(type==='LIFT2'){
    it=[chk('wu','Warm-Up (3–4 min)','Easy cardio, a couple of ramp sets.'),
      ex('l2_squat',N.l2_squat,3,'5',{rest:105,restLabel:'90 s–2 min',inc:5,l2:'squat',pct:.7,gen:true,note:'Back squat, goblet, DB or KB squat. RPE 6, never grindy. 3 sets if fresh, 2 if not.'}),
      ex('l2_bench',N.l2_bench,3,'5',{rest:105,restLabel:'90 s–2 min',l2:'bench',pct:.7,note:'RPE 6, never grindy.'}),
      ex('l2_pull',N.l2_pull,3,'5',{rest:105,restLabel:'90 s–2 min',wl:'added lb'}),
      week.n<3
        ?ex('l2_ham',N.l2_ham,2,'10',{noW:true,note:'2–3 min at the end.'})
        :ex('l2_nordic',N.l2_nordic,2,'3–5 → build to 6',{noW:true,rng:[3,6],note:'Band or hands for assistance. Stop when form fails.'})];
  }
  return useAlts(applyMode(it,mode),e);
}
function applyMode(items,mode){
  if(mode==='full')return items;
  const out=[];
  for(const x of items){
    if(x.drop===40||(x.drop===30&&mode==='30'))continue;
    const y=Object.assign({},x);
    if(mode==='30'&&y.s30!=null)y.sets=Math.min(y.sets,y.s30);
    if(y.main){y.rest=mode==='30'?105:135;y.restLabel=mode==='30'?'90 s–2 min':'2–2.5 min'}
    else if(mode==='30'&&y.rest>0){y.rest=45;y.restLabel='45 s'}
    out.push(y);
  }
  return out;
}
function buildMob(){
  return [chk('ankle','Ankle Rocks','2×10/side'),chk('9090','90/90 Hip Transitions','2×6/side'),
    chk('couch','Couch Stretch','2 min/side'),chk('tspine','Thoracic Spine Open-Books','2×8/side'),
    chk('cars','Shoulder CARs','2×5/side'),
    chk('hipstab','Hip Stability','Side plank 2×30 s/side + Copenhagen plank 2×15–20 s/side (bent-knee version first)'),
    chk('walk','Walk 20–30 min (Optional)','Only if you feel like it.')];
}
/* Warm-up ramp rows for a working weight W */
function warmRows(it,e,W){
  const cfg=RAMPS[it.warm];if(!cfg)return null;
  const unit=it.wl==='lb each'?'lb each':'lb';
  let rows=[];
  if(it.warm==='pull'){
    if(W!=null&&W>0)rows=['Bodyweight × 5',`${trim(roundTo(W*.5,2.5))} lb × 3`];
    return rows;
  }
  if(W==null||!(W>0))return null;
  const bar=it.bar!=null?it.bar:(cfg.bar==='bb'?EQ().bar:cfg.bar),step=it.step||(cfg.step==='db'?EQ().dbStep:cfg.step);
  let ramp=cfg.ramp.slice();
  if(cfg.top&&!e.week.deload&&/9/.test(e.week.rpe))ramp.push([.9,1]);
  if(modeOf(e)==='30')ramp=ramp.slice(-2);
  let prev=-1;
  ramp.forEach(([p,r])=>{let w=Math.max(bar,roundTo(W*p,step));if(isPlateLoaded(it))w=floorLoadable(w,bar);if(w<W&&w!==prev){rows.push(`${trim(w)} ${unit} × ${r}`);prev=w}});
  if(!rows.length)rows=['One light feel-out set × 5'];
  return rows;
}
 
/* ============================================================
   CARDIO
   ============================================================ */
const cardioOn=c=>!((state.settings.altOff||{})['cardio:'+c.k]);
const cardioFor=type=>CARDIO.filter(c=>cardioOn(c)&&(!c.z2only||['Z2','EASY','LONG'].includes(type)));
const cardioOf=e=>{const k=e.log.cardio;return k?cardioFor(e.type).find(c=>c.k===k)||null:null};
function altRun(e,r){
  const c=cardioOf(e);if(!c)return r;
  const t=e.type,base=r.title.replace(/^[^·]*· /,'');
  const lines=[`Cardio alternate: same minutes and same effort as the planned run. ${c.ankle}`,c.hr];
  let items=r.items.map(x=>Object.assign({},x));
  if(t==='Z2'||t==='EASY'||t==='LONG')lines.unshift('Talk test: full sentences the whole time (RPE 3–4).');
  if(t==='QA')lines.unshift(`Hard = RPE 8–9 for each 4 min rep, easy recovery between. ${c.hard}.`);
  if(t==='QB')lines.unshift(`Tempo = RPE 7: comfortably hard, short phrases only. ${c.hard}.`);
  if(t==='TEST10K')lines.splice(0,lines.length,`No 10K test on an alternate. Do 45 min steady at RPE 6–7. ${c.ankle}`,c.hr);
  items=items.map(x=>{
    if(x.id==='strides')return Object.assign(x,{name:c.stride?'Finish With 4–6 Surges':'Skip Strides Today',note:c.stride||'Not on a walk.'});
    if(x.id==='qa_int')return Object.assign(x,{name:'Hard Intervals (RPE 8–9)',restLabel:x.restLabel.replace('jog','spin/paddle')});
    return x;
  });
  return {title:`${c.name} · ${t==='TEST10K'?'45 min Steady':base}`,lines,items,mins:t==='TEST10K'?45:r.mins,alt:c};
}
function buildRun(e){
  const r=buildRunPlain(e);
  return TYPES[e.type].kind==='run'?altRun(e,r):r;
}
function buildRunPlain(e){
  const {week,day,type}=e,mode=modeOf(e),n=week.n,dl=week.deload;
  const swapped=e.log.type&&e.log.type!==day.t;
  const planned=(!swapped&&day.min)?day.min:(DEFMIN[type]||'');
  let title='',lines=[],items=[],mins=TYPES[type].mins;
  if(type==='Z2'){
    const mm=mode==='full'?planned.replace('-','–'):(mode==='40'?'30–35':'25');
    mins=mode==='full'?(parseInt(planned)||45):(mode==='40'?33:25);
    title=`Zone 2 · ${mm} min`;
    lines=['Conversational pace: you can speak full sentences (roughly 60–70% max HR, but the talk test wins).','Dark or icy morning: treadmill is the default fallback.'];
    if(n>=2||swapped)items.push(chk('strides',`Finish With ${dl?'4':'4–6'} Strides`,'15 s fast and relaxed (not a sprint), 45 s walk back. The listed duration includes the strides.'));
  }else if(type==='EASY'){
    const p=parseInt(planned)||35;
    const mm=mode==='full'?planned.replace('-','–'):(mode==='40'?(p<=35?planned.replace('-','–'):'30–35'):'25');
    mins=mode==='full'?p:(mode==='40'?Math.min(p,33):25);
    title=`Easy Run · ${mm} min`;lines=[week.pause?'Optional. Easy effort only, and only if you feel well.':'Easy Zone 2 effort. No intervals, no strides.'];
  }else if(type==='LONG'){
    const mm=mode==='full'?planned.replace('-','–'):(mode==='40'?'40':'30');
    mins=mode==='full'?(parseInt(planned)||50):Number(mm);
    title=`Long Run · ${mm} min`;lines=['Easy effort, same as Zone 2. No strides.'];
  }else if(type==='QA'){
    const k=mode==='full'?4:3,warm=mode==='30'?5:10,recMin=mode==='30'?2:3;
    mins=warm+k*4+(k-1)*recMin+5;
    title=`Quality A · ${k}×4 min Hard`;
    lines=[n===3?'First time: hold RPE 8 and do not chase pace.':'Hard = RPE 8–9, about 5K effort (88–95% max HR by the end of each rep).'];
    items=[chk('qa_wu',`${warm} min Easy Warm-Up`,''),ex('qa_int','Hard Intervals',k,'4 min',{rest:recMin*60,restLabel:`${recMin} min easy jog`,noW:true,noR:true}),chk('qa_cd','5 min Cooldown','')];
  }else if(type==='QB'){
    const t=mode==='full'?((!swapped&&day.min)?day.min:'15'):(mode==='40'?'15':'12'),warm=mode==='30'?5:10;
    mins=warm+Number(t)+5;
    title=`Quality B · ${t} min Tempo`;
    lines=['Tempo at RPE 7: 10K pace or slightly slower.'];
    items=[chk('qb_wu',`${warm} min Easy Warm-Up`,''),chk('qb_t',`${t} min Tempo @ RPE 7`,'10K pace or slightly slower.'),chk('qb_cd','5 min Cooldown','')];
  }else if(type==='TEST10K'){
    title='10K';lines=[n===15?'Optional. Easy to steady effort. Compare to your Week 12 time.':(n===12?'Time trial: strong, steady effort.':'Easy to steady effort. Do not race it.'),'Not home? Swap to Lift 2 or the bodyweight circuit using the menu above.'];
  }
  return {title,lines,items,mins};
}
function parseDur(s){
  if(s==null||s==='')return null;s=String(s).trim();
  if(s.includes(':')){const p=s.split(':').map(Number);if(p.some(isNaN))return null;return p.length>=3?p[0]*60+p[1]+p[2]/60:p[0]+p[1]/60}
  const v=parseFloat(s);return isFinite(v)?v:null;
}
function fmtPace(m){if(m==null||!isFinite(m))return '–';let mm=Math.floor(m),ss=Math.round((m-mm)*60);if(ss===60){mm++;ss=0}return `${mm}:${pad(ss)}`}
function fmtDur(m){if(m==null)return '–';const h=Math.floor(m/60),r=m-h*60;let mm=Math.floor(r),ss=Math.round((r-mm)*60);if(ss===60){mm++;ss=0}return h?`${h}:${pad(mm)}:${pad(ss)}`:`${mm}:${pad(ss)}`}
function runLogs(){
  const out=[];
  for(const k of sortedKeys()){
    const e=entry(k);if(TYPES[e.type].kind!=='run')continue;
    const r=e.log.run||{},d=parseDur(r.dur),x=num(r.dist);
    const alt=!!cardioOf(e);
    out.push({key:k,e,alt,dur:d,dist:alt?null:x,hr:num(r.hr),pace:(!alt&&d!=null&&x)?d/x:null});
  }
  return out;
}
 
/* ============================================================
   HEART-RATE ZONES (rules of thumb, estimates only)
   Max HR: your number, else Tanaka estimate 208 − 0.7 × age.
   With resting HR: heart-rate-reserve (Karvonen) method, rest + % × (max − rest). Otherwise % of max HR.
   ============================================================ */
function hrInfo(){
  const s=state.settings;let max=num(s.maxHR),est=false;const age=num(s.age),rest=num(s.restHR);
  if((max==null||max<100||max>230)&&age!=null&&age>=10&&age<=100){max=Math.round(208-0.7*age);est=true}
  if(max==null||max<100||max>230)return null;
  const hrr=rest!=null&&rest>=30&&rest<max-40?rest:null;
  const z=(a,b)=>hrr!=null?[Math.round(hrr+a*(max-hrr)),Math.round(hrr+b*(max-hrr))]:[Math.round(a*max),Math.round(b*max)];
  return {max,est,rest:hrr,method:hrr!=null?'hrr':'max',z2:z(.6,.7),tempo:z(.8,.87),int:z(.88,.95)};
}
 
/* ============================================================
   10K PREDICTION: Riegel formula T2 = T1 × (D2/D1)^1.06 (a rule of thumb; less reliable far from the test distance)
   ============================================================ */
const MI_KM=1.609344;
function riegel(mins,km,toKm){return mins*Math.pow(toKm/km,1.06)}
function parseRace(txt){
  const t=String(txt||'').toLowerCase();
  const tm=t.match(/\b(\d{1,2}:)?\d{1,2}:\d{2}\b/);if(!tm)return null;
  const mins=parseDur(tm[0]);
  let km=null;
  if(/half/.test(t))km=21.0975;else if(/marathon/.test(t))km=42.195;
  else{const dm=t.replace(tm[0],' ').match(/(\d+(?:\.\d+)?)\s*(k|km|mi|mile|miles)\b/);if(dm)km=Number(dm[1])*(/^m/.test(dm[2])?MI_KM:1)}
  if(!km||!mins||km<3)return null;
  return {km,mins};
}
function tenKTests(){
  return runLogs().filter(r=>!r.alt&&r.e.type==='TEST10K'&&r.dur!=null).map(r=>{
    const x=num(r.e.log.run.dist),km=x?x*(state.settings.units==='mi'?MI_KM:1):10;
    return {key:r.key,km,mins:r.dur,pred:riegel(r.dur,km,10)};
  }).filter(t=>t.km>=3);
}
function predict10k(){
  const t=tenKTests(),b=parseRace(state.baselines.race);
  const base=b?{key:null,src:'baseline',km:b.km,mins:b.mins,pred:riegel(b.mins,b.km,10)}:null;
  if(t.length){
    const last=t[t.length-1],prev=t.length>1?t[t.length-2]:base;
    return {pred:last.pred,src:'test',key:last.key,km:last.km,prev:prev?prev.pred:null,prevSrc:prev?(prev.key?'test':'baseline'):null,prevKey:prev&&prev.key};
  }
  if(base)return {pred:base.pred,src:'baseline',km:base.km,prev:null};
  return null;
}
 
/* ============================================================
   EFFORT / FATIGUE (early deload suggestion)
   ============================================================ */
const MAIN_IDS=['squat','bench','pullups'];
function liftSessions(upto){
  return sortedKeys().filter(k=>k<=upto).reverse().map(entry).filter(e=>{
    if(TYPES[e.type].kind!=='lift'||e.week.deload||e.week.pause)return false;
    if(status(e)==='done')return true;
    const ex=e.log.ex||{};return Object.keys(ex).some(id=>(ex[id].sets||[]).some(s=>s&&s.d));
  });
}
function sessMainSets(e){
  const out=[];
  for(const id of MAIN_IDS){const ms=mainSets(e.log,id);if(ms)ms.forEach(s=>s&&out.push(s))}
  return out;
}
function fatigueCheck(upto){
  const all=liftSessions(upto),s=all.filter(e=>['LEGS','PUSH','PULL'].includes(e.type)).slice(0,2),a2=all.slice(0,2);
  const reasons=[];
  const missed=e=>{const R=Number(e.week.lifts.split('x')[1]);return sessMainSets(e).some(x=>(x.d||num(x.r)!=null)&&num(x.r)!=null&&num(x.r)<R)};
  if(s.length===2&&s.every(missed))reasons.push('missed reps on a main lift in both of your last 2 Legs/Push/Pull sessions');
  if(a2.length===2&&a2.every(e=>num(e.log.rpe)>=9&&num(e.log.sleep)!=null&&num(e.log.sleep)<6))reasons.push('session RPE 9+ with under 6 h of sleep in both sessions');
  const d=[];s.forEach(e=>{const T=topRPE(e.week.rpe);sessMainSets(e).forEach(x=>{const r=num(x.rpe);if(x.d&&r!=null)d.push(r-T)})});
  if(s.length===2&&d.length>=2&&avg(d)>=1.5)reasons.push(`main-lift sets averaged ${trim(avg(d))} RPE above plan`);
  return reasons.length?{reasons,key:all[0].key,ci:all[0].loc.wi}:null;
}
/* First non-pause calendar week after ci */
function nextLiftWeek(ci){for(let i=ci+1;i<CAL.length;i++)if(!CAL[i].pause)return CAL[i];return null}
 
/* ============================================================
   ESTIMATED MAX, PRs, MUSCLE-GROUP VOLUME
   ============================================================ */
/* Epley; when a set RPE is logged, reps-in-reserve = 10 − RPE is added to the reps */
function e1rm(w,r,rpe){if(w==null||r==null||r<=0)return null;const rir=rpe!=null?clamp(10-rpe,0,5):0;return w*(1+(r+rir)/30)}
function exName(id){const p=id.split('__');if(p[1]){const a=altByKey(p[1]);return a?a.name:id}return EX_NAMES[id]||id}
/* Walk every log in date order; a done set is a PR when it beats the previous best estimated max or top weight
   for that exact exercise (an alternate is tracked separately from its main lift). First session sets the baseline. */
function computePRs(){
  const best={},bySet={},list=[];
  for(const k of sortedKeys()){
    const l=state.logs[k];if(!l.ex)continue;
    for(const id in l.ex){
      const base=id.split('__')[0];if(l.skip&&l.skip[base])continue;
      const sets=l.ex[id].sets||[];
      sets.forEach((s,i)=>{
        if(!s||!s.d)return;const w=num(s.w),r=num(s.r);if(w==null||w<=0)return;
        const e1=r!=null&&r>0?e1rm(w,r,num(s.rpe)):null,b=best[id];
        if(b){
          const isW=w>b.w+1e-9,isE=e1!=null&&b.e1!=null&&e1>b.e1+1e-9;
          if(isW||isE){(bySet[k]=bySet[k]||{})[id+'#'+i]=true;list.push({key:k,id,i,w,r,e1,kind:isW?'Top Weight':'Est. Max'})}
          b.w=Math.max(b.w,w);if(e1!=null)b.e1=Math.max(b.e1||0,e1);
        }else best[id]={w,e1};
      });
    }
  }
  return {bySet,list};
}
function muscleSets(ci){
  const out={};MUSCLES.forEach(([g])=>out[g]=0);
  for(let di=0;di<7;di++){
    const l=state.logs[keyAt(ci,di)];if(!l||!l.ex)continue;
    for(const id in l.ex){
      const [b,k]=id.split('__'),gs=(k&&ALT_MUSCLE[k])||EX_MUSCLE[b]||[];
      const n=(l.ex[id].sets||[]).filter(s=>s&&s.d).length;
      gs.forEach(g=>out[g]+=n);
    }
  }
  return out;
}
/* Weekly lift series. mode 'top' = top weight, 'e1' = estimated max. Alternate-only weeks are flagged hollow. */
function liftSeries(id,mode){
  const byWeek={};
  for(const k of sortedKeys()){
    const l=state.logs[k];if(l.skip&&l.skip[id])continue;
    const ms=mainSets(l,id);if(!ms)continue;
    const isAlt=!!(l.alt&&l.alt[id]);
    let v=null;
    if(mode==='e1'){
      const bw=id==='pullups'?latestBW():null;
      const dn=ms.filter(s=>s&&s.d),pool=dn.length?dn:ms;
      pool.forEach(s=>{const w=num(s.w),r=num(s.r);if(w==null)return;const x=e1rm(w+(bw||0),r,num(s.rpe));if(x!=null&&(v==null||x>v))v=x});
    }else v=topW(l,id);
    if(v==null)continue;
    const ci=locate(k).wi,cur=byWeek[ci];
    if(!cur)byWeek[ci]={v,alt:isAlt};
    else{if(v>cur.v)cur.v=v;if(!isAlt)cur.alt=false}
  }
  return Object.keys(byWeek).map(Number).sort((a,b)=>a-b).map(ci=>({label:shortLabel(CAL[ci]),v:byWeek[ci].v,hollow:byWeek[ci].alt}));
}
const shortLabel=w=>w.pause?'P':`W${w.n}${w.repeat?'R':''}`;
 
/* ---------------- boot ---------------- */
let state=load();
rebuildPlan();
