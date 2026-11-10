"use strict";
/* ============================================================
   plan.js: PLAN AND EXERCISE DATA (no app logic, no DOM)
   Loaded before app.js by index.html and test.html.
   Edit numbers here; keep exercise ids and alternate keys (k) unchanged,
   because saved workout data is matched by them.
   ============================================================ */
const START = new Date(2026, 9, 26);            // Mon Oct 26, 2026
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const BLOCKS = {1:'Block 1 · Build',2:'Block 2 · Strength & Engine',3:'Block 3 · Repeat & Peak'};
const blockName = b=>BLOCKS[b]||`Block ${b} · Extension`;
 
const TYPES = {
  LEGS:{label:'Legs',abbr:'LEG',kind:'lift',mins:50,c:'#ff2e97'},
  LEGS_LIGHT:{label:'Legs (Light, General)',abbr:'LEG',kind:'lift',mins:35,c:'#ff6cc0'},
  PUSH:{label:'Push',abbr:'PSH',kind:'lift',mins:50,c:'#ff4fa8'},
  PULL:{label:'Pull',abbr:'PUL',kind:'lift',mins:50,c:'#ff8ad0'},
  LIFT2:{label:'Lift 2',abbr:'L2',kind:'lift',mins:25,c:'#ffb0dc'},
  Z2:{label:'Zone 2 Run',abbr:'Z2',kind:'run',mins:45,c:'#00e5ff'},
  EASY:{label:'Easy Run',abbr:'EZ',kind:'run',mins:35,c:'#7df3ff'},
  QA:{label:'Quality A · 4×4 Intervals',abbr:'Q·A',kind:'run',mins:40,c:'#ffffff'},
  QB:{label:'Quality B · Tempo',abbr:'Q·B',kind:'run',mins:35,c:'#d4f9ff'},
  LONG:{label:'Long Run',abbr:'LR',kind:'run',mins:50,c:'#00bcd4'},
  TEST10K:{label:'10K',abbr:'10K',kind:'run',mins:55,c:'#ff2e97'},
  MOB:{label:'Mobility',abbr:'MOB',kind:'mob',mins:15,c:'#e6d9ff'},
  OFF:{label:'Off',abbr:'OFF',kind:'off',mins:0,c:'#8b86a0'},
  SKIP:{label:'Skipped',abbr:'—',kind:'skip',mins:0,c:'#8b86a0'}
};
const DEFMIN = {Z2:'45',EASY:'30-35',QB:'15',LONG:'50'};
 
const D = (t,o)=>Object.assign({t},o||{});
const PAST = D('SKIP',{note:'Already past before the plan started.'});
const MOB = D('MOB');
 
const BASE_PLAN = [
/* ---------- BLOCK 1 ---------- */
{n:1,block:1,rpe:'7',lifts:'4x5',focus:'Learn the weights and log baselines',days:[
  PAST,PAST,
  D('PUSH',{note:'Start light, about 3 reps in the tank. Enter your own weights and reps.'}),
  D('EASY',{min:'30-35',note:'Zone 2. No intervals this week.'}),
  D('PULL',{note:'About 3 reps in the tank. Enter your own weights and reps.'}),
  D('LEGS_LIGHT',{note:'Weight finder (~35 min). Use any squat, hinge and lunge variation you have access to (barbell, dumbbell, kettlebell). Work up to a clean RPE 6–7.'}),
  MOB]},
{n:2,block:1,rpe:'7.5–8',lifts:'4x5',focus:'Add weight',days:[
  D('LEGS',{fin:'SLED'}),
  D('Z2',{min:'45',note:'Log pace and HR. This is your aerobic baseline.'}),
  D('PUSH'),
  D('QB',{min:'15',note:'Tempo 15 min. Easing into quality.'}),
  D('PULL'),D('LIFT2'),MOB]},
{n:3,block:1,rpe:'8',lifts:'4x5',focus:'Add weight',days:[
  D('LEGS',{fin:'FARMER'}),D('Z2',{min:'45'}),D('PUSH'),
  D('QA',{note:'First time: hold RPE 8 and do not chase pace.'}),
  D('PULL'),D('LIFT2',{note:'Start Nordic curls today.'}),MOB]},
{n:4,block:1,rpe:'8–9',lifts:'4x5',focus:'Hardest week of Block 1',days:[
  D('LEGS',{fin:'SLED'}),D('Z2',{min:'45'}),D('PUSH'),
  D('LONG',{min:'50'}),D('PULL'),D('LIFT2',{note:'Use 2 sets if tired.'}),MOB]},
{n:5,block:1,rpe:'Deload',lifts:'4x5',deload:true,focus:'Cut sets by a third, load −10%, no finishers, no Lift 2',days:[
  D('LEGS'),D('Z2',{min:'35'}),D('PUSH'),
  D('EASY',{min:'30',note:'Thanksgiving. Easy run 30 min, or move it to Sat 11/28 if the gym is closed.'}),
  D('PULL'),D('OFF',{note:'Off, or the moved Thursday run, or an easy walk.'}),MOB]},
{n:6,block:1,rpe:'8',lifts:'4x5',test:true,focus:'Return to Week 3 loads and beat them',days:[
  D('LEGS',{fin:'FARMER'}),D('Z2',{min:'50'}),D('PUSH'),
  D('EASY',{min:'35',note:'Keep legs fresh for Saturday.'}),D('PULL'),
  D('TEST10K',{note:'10K attempt if home, easy to steady effort. Otherwise swap to Lift 2 or the bodyweight circuit.'}),MOB]},
/* ---------- BLOCK 2 ---------- */
{n:7,block:2,rpe:'7.5',lifts:'4x4',focus:'Main lifts drop to 4x4. Start at your Week 4 4x5 weight.',days:[
  D('LEGS',{fin:'SLED'}),D('Z2',{min:'45'}),D('PUSH'),D('QA'),D('PULL'),D('LIFT2'),MOB]},
{n:8,block:2,rpe:'8',lifts:'4x4',focus:'Add weight',days:[
  D('LEGS',{fin:'FARMER'}),D('Z2',{min:'45'}),D('PUSH'),D('QB',{min:'20',note:'Tempo 20 min.'}),D('PULL'),D('LIFT2'),MOB]},
{n:9,block:2,rpe:'8',lifts:'4x4',focus:'Add weight',days:[
  D('LEGS',{fin:'SLED'}),D('Z2',{min:'50'}),D('PUSH'),
  D('LONG',{min:'50',note:'Christmas Eve: gym hours may be short. Shift to Sat if needed.'}),
  D('PULL',{note:'Christmas. Pull if the gym is open, otherwise do it Sat 12/26.'}),
  D('LIFT2',{note:'Do PULL here if you skipped Friday (use the swap menu), otherwise Lift 2.'}),MOB]},
{n:10,block:2,rpe:'8–9',lifts:'4x4',focus:'Hardest week of Block 2',days:[
  D('LEGS',{fin:'FARMER'}),D('Z2',{min:'50'}),D('PUSH'),D('QB',{min:'20',note:'Tempo 20 min.'}),
  D('PULL',{note:"New Year's Day. Pull if the gym is open, otherwise do it Sat 1/2."}),
  D('LIFT2',{note:'Do PULL here if you skipped Friday, otherwise Lift 2 (2 sets).'}),MOB]},
{n:11,block:2,rpe:'Deload',lifts:'4x4',deload:true,focus:'Cut sets by a third, load −10%, no finishers, no Lift 2',days:[
  D('LEGS'),D('Z2',{min:'35'}),D('PUSH'),D('EASY',{min:'30'}),D('PULL'),D('OFF',{note:'Off, or an easy walk.'}),MOB]},
{n:12,block:2,rpe:'8–9',lifts:'4x4',test:true,focus:'Test week: beat Week 10 loads',days:[
  D('LEGS',{fin:'SLED'}),D('Z2',{min:'45'}),D('PUSH'),
  D('EASY',{min:'35',note:'Keep legs fresh for Saturday.'}),D('PULL'),
  D('TEST10K',{note:'10K time trial if home, strong steady effort. Otherwise Lift 2 or the bodyweight circuit.'}),MOB]},
/* ---------- BLOCK 3 ---------- */
{n:13,block:3,rpe:'7.5',lifts:'4x5',focus:'Start about 5–7% under your Week 9 4x4 weights (roughly Week 7–8 loads)',days:[
  D('LEGS',{fin:'SLED'}),D('Z2',{min:'45'}),D('PUSH'),D('QA'),D('PULL'),D('LIFT2'),MOB]},
{n:14,block:3,rpe:'8.5–9',lifts:'4x5',focus:'Add weight only if clean. Hardest week of the program.',days:[
  D('LEGS',{fin:'FARMER'}),D('Z2',{min:'50'}),D('PUSH'),D('QB',{min:'20',note:'Tempo 20 min.'}),D('PULL'),
  D('LIFT2',{note:'2 sets only, or off.'}),MOB]},
{n:15,block:3,rpe:'Deload',lifts:'4x5',deload:true,focus:'Deload and finish. Cut sets by a third, load −10%, no finishers, no Lift 2',days:[
  D('LEGS'),D('Z2',{min:'35'}),D('PUSH'),D('EASY',{min:'30'}),D('PULL'),
  D('TEST10K',{note:'Optional 10K, easy to steady effort. Compare to your 1/16 time.'}),
  D('MOB',{note:'Off day with mobility. Re-test baselines and plan the next block from your Week 14 loads.'})]}
];
 
/* Extension weeks (16+): repeating 4-week cycles = 3 build weeks + 1 deload */
function genWeek(n){
  const k=n-16,pos=k%4,cyc=Math.floor(k/4),block=4+cyc,lifts=cyc%2===0?'4x4':'4x5';
  const prevBuild=n===16?14:n-2;
  if(pos===0)return {n,block,ext:true,rpe:'7.5',lifts,focus:`New cycle. Start from your Week ${prevBuild} weights.`,days:[
    D('LEGS',{fin:'SLED'}),D('Z2',{min:'45'}),D('PUSH'),D('QA'),D('PULL'),D('LIFT2'),MOB]};
  if(pos===1)return {n,block,ext:true,rpe:'8',lifts,focus:'Add weight',days:[
    D('LEGS',{fin:'FARMER'}),D('Z2',{min:'45'}),D('PUSH'),D('QB',{min:'20',note:'Tempo 20 min.'}),D('PULL'),D('LIFT2'),MOB]};
  if(pos===2)return {n,block,ext:true,rpe:'8.5–9',lifts,focus:'Hardest week of the cycle. Add weight only if clean.',days:[
    D('LEGS',{fin:'SLED'}),D('Z2',{min:'50'}),D('PUSH'),D('LONG',{min:'50'}),D('PULL'),D('LIFT2',{note:'2 sets only, or off.'}),MOB]};
  return {n,block,ext:true,rpe:'Deload',lifts,deload:true,focus:'Deload. Cut sets by a third, load −10%, no finishers, no Lift 2',days:[
    D('LEGS'),D('Z2',{min:'35'}),D('PUSH'),D('EASY',{min:'30'}),D('PULL'),D('OFF',{note:'Off, or an easy walk.'}),D('MOB',{note:'Cycle complete. Re-test, then add another cycle if you want to continue.'})]};
}
 
/* Pause week (inserted with "Shift Plan Forward 1 Week"): no lifting, optional easy cardio */
const PAUSE_DAYS = [
  D('OFF',{note:'Pause week. Rest, recover, travel.'}),
  D('EASY',{min:'20-30',note:'Optional: easy cardio only if you feel well. No fever, no chest symptoms.'}),
  D('MOB'),
  D('OFF'),
  D('MOB'),
  D('EASY',{min:'20-30',note:'Optional easy cardio or a walk.'}),
  D('MOB',{note:'Next week the plan picks up where you left off.'})
];
 
/* Weight/rep progression rule for each PLAN week number: which week to reference and how.
   (Inserted pause/repeat weeks and early deloads are handled in app.js ruleFor.) */
const BASE_RULES = {2:{from:1,mode:'inc'},3:{from:2,mode:'inc'},4:{from:3,mode:'inc'},5:{from:4,mode:'pct',pct:.9},
  6:{from:3,mode:'inc'},7:{from:4,mode:'hold'},8:{from:7,mode:'inc'},9:{from:8,mode:'inc'},10:{from:9,mode:'inc'},
  11:{from:10,mode:'pct',pct:.9},12:{from:10,mode:'inc'},13:{from:9,mode:'pct',pct:.94},14:{from:13,mode:'inc'},15:{from:14,mode:'pct',pct:.9}};
function baseRule(n){
  if(n<=15)return BASE_RULES[n]||null;
  const pos=(n-16)%4;
  if(pos===0)return {from:n===16?14:n-2,mode:'hold'};
  if(pos===3)return {from:n-1,mode:'pct',pct:.9};
  return {from:n-1,mode:'inc'};
}
 
/* Lifts shown in Progress charts */
const LIFTS = [
  {id:'squat',name:'Back Squat'},{id:'rdl',name:'Romanian Deadlift'},{id:'bench',name:'Bench Press'},
  {id:'ohp',name:'DB Overhead Press (Per Hand)'},{id:'pullups',name:'Pull-Ups (Added lb)'},{id:'row',name:'Barbell Row'}
];
 
/* Exercise display names (ids must not change) */
const EX_NAMES = {
  squat:'Back Squat',rdl:'Romanian Deadlift',split:'Split Squat',calf:'Calf Raise',farmer:'Farmer Carries',sled:'Sled Push',
  bench:'Bench Press',ohp:'Seated DB Overhead Press',incline:'Incline DB Press',lat:'Lateral Raise',tri:'Triceps Pushdown',face:'Face Pull',
  pullups:'Pull-Ups (Weighted When You Can)',row:'Barbell Row',cable:'Cable or Chest-Supported Row',rdelt:'Rear Delt Fly',curl:'Curls',
  knee:'Hanging Knee Raise or Dead Bug',pallof:'Pallof Press',
  l2_squat:'Squat Variation @ ~70%',l2_bench:'Bench Press @ ~70%',l2_pull:'Pull-Ups (Bodyweight or Light)',
  l2_ham:'Leg Curl or Hip-Bridge Walkout',l2_nordic:'Nordic Curls',
  light_squat:'Squat Variation',light_rdl:'Hip-Hinge Variation',light_split:'Split Squat or Lunge Variation'
};
 
/* Equipment class per exercise (used to round targets to what your gym can load):
   bb = barbell + plates, smith = Smith bar + plates, db = dumbbells, stack = cable/machine stack,
   added = weight added to bodyweight, other = no rounding beyond the exercise's own step. */
const EX_EQ = {squat:'bb',rdl:'bb',bench:'bb',row:'bb',l2_squat:'bb',l2_bench:'bb',
  split:'db',farmer:'db',ohp:'db',incline:'db',lat:'db',rdelt:'db',curl:'db',
  calf:'stack',tri:'stack',face:'stack',cable:'stack',pallof:'stack',
  pullups:'added',l2_pull:'added',sled:'other'};
 
/* Warm-up ramps. bar:'bb' = your barbell weight from the Equipment Profile; step:'db' = your dumbbell step. */
const RAMPS={
  squat:{bar:'bb',step:5,top:true,ramp:[[.4,8],[.6,5],[.8,3]]},
  bench:{bar:'bb',step:5,top:true,ramp:[[.4,8],[.6,5],[.8,3]]},
  rdl:{bar:'bb',step:5,ramp:[[.5,8],[.75,5]]},
  row:{bar:'bb',step:5,ramp:[[.5,8],[.75,5]]},
  ohp:{bar:5,step:'db',ramp:[[.5,8],[.75,4]]},
  pull:{}
};
 
/* ============================================================
   EXERCISE ALTERNATES (busy gym / equipment taken)
   ratio = alternate load ÷ main-lift load for the same reps at the same effort (default; may be personalized).
   eq    = equipment class (see EX_EQ). Every eq:'db' alternate uses your heaviest dumbbell as its max:
           when the matched load is above it, the weight stays at max and reps go up until the effort (RPE) matches.
   eq:'smith' targets are the TOTAL load including the Smith bar from your Equipment Profile.
   bw    = ratio applies to bodyweight + added weight (pull-up → pulldown).
   rpeOnly = no load conversion possible; same sets/reps, pick the weight that hits the week's RPE.
   Alternates do not have their own progression: their targets always come from the main lift.
   ============================================================ */
const A=(k,name,o)=>Object.assign({k,name},o||{});
const SMITH_NOTE='Target is the total load, including the Smith bar weight set in Settings → Equipment Profile.';
const ALTS={
  squat:[A('hack','Hack Squat (Machine)',{ratio:.9,wl:'lb',inc:5,eq:'other',note:'Machines differ. First time: use the target as a starting point and adjust to the RPE.'}),
         A('goblet','Goblet Squat (DB or KB)',{ratio:.5,wl:'lb',inc:5,eq:'db',note:'One dumbbell at the chest. Front-loaded, so the core works harder and the same load feels heavier than on your back. If your heaviest dumbbell is too light, reps go up to keep the effort equal.'})],
  rdl:[A('smithrdl','Smith Machine RDL',{ratio:.95,wl:'lb',inc:5,eq:'smith',note:SMITH_NOTE}),
       A('dbrdl','Dumbbell RDL',{ratio:.42,wl:'lb each',inc:5,eq:'db'})],
  split:[A('lunge','DB Reverse Lunge',{ratio:1,wl:'lb each',inc:5,eq:'db'}),
         A('stepup','DB Step-Up (Knee-Height Box)',{ratio:.85,wl:'lb each',inc:5,eq:'db'})],
  calf:[A('lpcalf','Leg-Press Calf Press',{ratio:1,wl:'lb',inc:5,eq:'other',note:'Machines differ; adjust to the RPE.'}),
        A('smithcalf','Smith Machine Calf Raise',{ratio:1,wl:'lb',inc:5,eq:'smith',note:SMITH_NOTE})],
  farmer:[A('trapcarry','Trap-Bar Carry',{ratio:2,wl:'lb total',inc:5,eq:'other',note:'Total load, both hands combined.'}),
          A('suitcase','Suitcase Carry (One Hand)',{ratio:1,wl:'lb',inc:5,eq:'db',repsLabel:'30 m/side',note:'Same dumbbell, one side at a time. Stay tall.'})],
  sled:[A('bikespr','Air Bike Sprints',{rpeOnly:true,noW:true,repsLabel:'15 s hard',note:'Same 6 rounds, 40 s easy between. RPE 8–9 by the last round.'}),
        A('wlunge','DB Walking Lunge',{rpeOnly:true,wl:'lb each',repsLabel:'20 m',note:'Pick dumbbells that make the last round RPE 8–9.'})],
  bench:[A('dbbench','Dumbbell Bench Press',{ratio:.4,wl:'lb each',inc:5,eq:'db'}),
         A('chestpress','Machine Chest Press',{ratio:.9,wl:'lb',inc:5,eq:'stack',note:'Machines differ; adjust to the RPE.'})],
  ohp:[A('machineohp','Machine Shoulder Press',{ratio:1.7,wl:'lb',inc:5,eq:'stack',note:'Machine total vs. one dumbbell. Machines differ; adjust to the RPE.'}),
       A('arnold','Seated Arnold Press',{ratio:.85,wl:'lb each',inc:2.5,eq:'db'})],
  incline:[A('smithincline','Incline Smith Press',{ratio:2.1,wl:'lb',inc:5,eq:'smith',note:SMITH_NOTE}),
           A('inclinemachine','Incline Machine Press',{ratio:1.7,wl:'lb',inc:5,eq:'stack',note:'Machines differ; adjust to the RPE.'})],
  lat:[A('cablelat','Cable Lateral Raise (One Arm)',{ratio:.6,wl:'lb',inc:2.5,eq:'stack'}),
       A('leanlat','Lean-Away DB Lateral Raise (One Arm)',{ratio:.9,wl:'lb',inc:2.5,eq:'db'})],
  tri:[A('ohext','Overhead Cable Triceps Extension',{ratio:.75,wl:'lb',inc:2.5,eq:'stack'}),
       A('skull','EZ-Bar Skull Crusher',{ratio:.8,wl:'lb',inc:5,eq:'other'})],
  face:[A('rpd','Reverse Pec Deck',{ratio:1,wl:'lb',inc:5,eq:'stack',note:'Machines differ; adjust to the RPE.'}),
        A('yraise','Chest-Supported DB Y-Raise',{ratio:.2,wl:'lb each',inc:2.5,eq:'db'})],
  pullups:[A('pulldown','Lat Pulldown',{ratio:.8,bw:true,wl:'lb',inc:5,eq:'stack',note:'Target uses your latest bodyweight from Progress → Body.'}),
           A('sapulldown','Half-Kneeling 1-Arm Cable Pulldown',{ratio:.42,bw:true,wl:'lb',inc:2.5,eq:'stack',note:'Reps per arm. Uses your latest bodyweight from Progress → Body.'})],
  row:[A('dbrow','One-Arm DB Row',{ratio:.5,wl:'lb each',inc:5,eq:'db',note:'Reps per arm.'}),
       A('tbar','Chest-Supported T-Bar or Machine Row',{ratio:.85,wl:'lb',inc:5,eq:'other',note:'Machines differ; adjust to the RPE.'})],
  cable:[A('csdb','Chest-Supported DB Row',{ratio:.4,wl:'lb each',inc:5,eq:'db'}),
         A('machinerow','Seated Machine Row',{ratio:1,wl:'lb',inc:5,eq:'stack'})],
  rdelt:[A('rpd2','Reverse Pec Deck',{ratio:2,wl:'lb',inc:5,eq:'stack',note:'Assumes you log the rear delt fly as one dumbbell. Machines differ; adjust to the RPE.'}),
         A('cablerd','Cable Rear Delt Fly (Cross-Over)',{ratio:.6,wl:'lb',inc:2.5,eq:'stack'})],
  curl:[A('ezcurl','EZ-Bar Curl',{ratio:1.8,wl:'lb',inc:5,eq:'other'}),
        A('cablecurl','Cable Curl (Straight Bar)',{ratio:1.6,wl:'lb',inc:2.5,eq:'stack'})],
  knee:[A('revcrunch','Reverse Crunch',{rpeOnly:true}),
        A('captain',"Captain's Chair Knee Raise",{rpeOnly:true})],
  pallof:[A('bandpallof','Band Pallof Press',{rpeOnly:true,noW:true,note:'Pick a band that makes the last rep about RPE 8.'}),
          A('sideplank','Side Plank',{rpeOnly:true,noW:true,noR:true,repsLabel:'30–45 s/side'})],
  l2_nordic:[A('legcurl','Seated or Lying Leg Curl',{rpeOnly:true,wl:'lb',repsLabel:'8–10',note:'Heavy enough for RPE 8 with a slow 3 s lowering.'}),
             A('slcurl','Slider or Stability-Ball Leg Curl',{rpeOnly:true,noW:true,repsLabel:'8–12'})]
};
ALTS.l2_bench=ALTS.bench;ALTS.l2_pull=ALTS.pullups;
const ALT_GROUPS=[['squat','Back Squat'],['rdl','Romanian Deadlift'],['split','Split Squat'],['calf','Calf Raise'],['farmer','Farmer Carries'],['sled','Sled Push'],
  ['bench','Bench Press (Also Lift 2)'],['ohp','Seated DB Overhead Press'],['incline','Incline DB Press'],['lat','Lateral Raise'],['tri','Triceps Pushdown'],['face','Face Pull'],
  ['pullups','Pull-Ups (Also Lift 2)'],['row','Barbell Row'],['cable','Cable or Chest-Supported Row'],['rdelt','Rear Delt Fly'],['curl','Curls'],['knee','Hanging Knee Raise'],['pallof','Pallof Press'],['l2_nordic','Nordic Curls (Lift 2)']];
 
/* ============================================================
   CARDIO ALTERNATES (injury such as a rolled ankle, or no safe place to run)
   Same minutes and same effort (RPE / talk test) as the planned run.
   ============================================================ */
const CARDIO=[
  {k:'bike',name:'Stationary or Air Bike',ankle:'Very low ankle load. Pedal with the arch or heel if the ankle is sore.',
   hr:'Expect HR about 5–15 bpm lower than running at the same effort.',stride:'15 s fast spin-up (high cadence), 45 s easy',hard:'High resistance, cadence 80–95'},
  {k:'row',name:'Rowing Machine',ankle:'Moderate ankle bend at the catch. Skip it if that position hurts.',
   hr:'Expect HR about 5–10 bpm lower than running.',stride:'10 strong strokes, then 45 s easy paddling',hard:'Damper 4–6, about 24–30 strokes/min, drive with the legs'},
  {k:'walk',name:'Incline Treadmill Walk',z2only:true,ankle:'Still loads the ankle on every step. Only for a mild tweak with pain-free walking.',
   hr:'Use HR and the talk test as usual.',stride:'',hard:''}
];
 
/* ============================================================
   MUSCLE GROUPS (Weekly Sets per Muscle Group chart)
   Each exercise lists its PRIMARY groups; a done set counts as 1 set for each listed group.
   Alternates use their main exercise's groups unless listed in ALT_MUSCLE.
   ============================================================ */
const MUSCLES=[['quads','Quads'],['hams','Hams/Glutes'],['chest','Chest'],['back','Back'],['shoulders','Shoulders'],['arms','Arms'],['calves','Calves'],['core','Core']];
const EX_MUSCLE={squat:['quads','hams'],rdl:['hams'],split:['quads','hams'],calf:['calves'],farmer:['core'],sled:['quads'],
  bench:['chest'],ohp:['shoulders'],incline:['chest'],lat:['shoulders'],tri:['arms'],face:['shoulders'],
  pullups:['back'],row:['back'],cable:['back'],rdelt:['shoulders'],curl:['arms'],knee:['core'],pallof:['core'],
  l2_squat:['quads','hams'],l2_bench:['chest'],l2_pull:['back'],l2_ham:['hams'],l2_nordic:['hams']};
const ALT_MUSCLE={bikespr:[],sideplank:['core'],dbrdl:['hams'],smithrdl:['hams']};
