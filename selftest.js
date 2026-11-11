'use strict';

// SELF-TEST (v1750) — open the game with ?selftest
//
// Boots on a throwaway save (never the real campaign: campaign.js switches its storage key
// when ?selftest is present and clears it first), then, with the drone invulnerable and
// the sound off in memory only:
//
//   boot        five fresh boots in a row, each with a board (a start-up fault can depend
//               on what the first board rolls)
//   boards      300 contract boards at operator levels 1, 5, 10 and 16
//   templates   every board template launched and stepped through every stage, drawn
//   stories     every story, agent and epilogue mission
//   black       every Black Contract set piece
//   diversions  every route diversion kind
//   simulator   the VOX simulator
//   drawing     every ghost, xeno and walker, and every world type's plains, drawn directly
//   campaign    real flows: finish, fail and abandon a job, level up, buy and fit gear,
//               spend a skill point, save and reload, every mail and hub panel
//   letters     every template for every client: the card, and the done, failed and
//               abandoned letters, checked for unfilled or broken text
//   pilots      the survey land jobs, the Lattice Survey, both armour fields and the factory
//               assault played for real, nothing skipped
//   data        achievements, codex, wire and contact letters evaluate. No semicolons or
//               dashes in written content
//
// A report is drawn over the page and kept in window.__selftest. Loads only with
// ?selftest, otherwise nothing.
(function(){
  const errs=[];window.addEventListener('error',e=>errs.push(`${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`));
  const results=[],T0=performance.now();
  const box=document.createElement('div');
  box.style.cssText='position:fixed;left:12px;top:12px;right:12px;max-height:92vh;overflow:auto;z-index:99999;background:#000;border:1px solid #0f0;color:#0f0;font:13px/1.45 Consolas,monospace;padding:12px 14px;white-space:pre-wrap';
  const paint=(note='')=>{box.textContent='VECTOR SPACE SELF-TEST'+(note?'  ·  '+note:'')+'\n\n'+results.map(r=>`${r.ok?'PASS':'FAIL'}  ${r.name.padEnd(11)} ${r.summary}${r.details.length?'\n'+r.details.map(d=>'        '+d).join('\n'):''}`).join('\n')};
  const pause=()=>new Promise(r=>setTimeout(r,0));
  const reset=()=>{routeDiversion.reset();globalThis.AgentXAsteroidAmbush?.reset();salvageRecovery?.reset?.();fighters.length=0;campaign.currentMission=null;campaign.pendingMission=null;mode='play';phase='space';paused=false;document.body.classList.remove('paused');if(campaign.isOpen())campaign.hideHub();invulnerable=true};
  // A lift-off or exit sequence is not the end of a job: several lift off mid-mission and go
  // on to a fight or a station. Only the last stage's exit (or no mission at all) is the end.
  const exiting=()=>mode==='missionExit'||mode==='surfaceExit';
  const ended=()=>!campaign.currentMission||(exiting()&&campaign.currentStageIndex>=(campaign.currentMission.modules?.length||1)-1);
  // Step a launched mission through every stage, drawing a frame in each.
  const fly=(stages=60,frames=45)=>{
    for(let i=0;i<stages&&campaign.currentMission&&!ended();i++){
      if(exiting()){for(let k=0;k<900&&campaign.currentMission&&exiting();k++)update(1/30);continue}
      const idx=campaign.currentStageIndex;
      for(let k=0;k<frames&&campaign.currentMission&&campaign.currentStageIndex===idx;k++)update(1/30);
      render(performance.now());
      if(campaign.currentMission&&campaign.currentStageIndex===idx&&!exiting())scenarioFlow.completeCurrentStage?.();
      for(let k=0;k<5;k++)update(1/30)
    }
  };
  // v1820 PILOTS. These fly a stage by steering, the way a player has to, with nothing
  // skipped, to prove the stage can actually be finished.
  // Step (and skip) forward until the mission is on the given stage type.
  const toStage=type=>{
    for(let k=0;k<40&&campaign.currentMission&&campaign.currentStage()?.type!==type;k++){
      for(let i=0;i<30;i++)update(1/30);
      if(exiting()){for(let i=0;i<900&&campaign.currentMission&&exiting();i++)update(1/30);continue}
      if(campaign.currentStage()?.type!==type)scenarioFlow.completeCurrentStage?.()
    }
    return campaign.currentStage?.()?.type===type
  };
  // Land approach: turn towards each survey marker in route order, then the destination.
  const flyApproach=(maxSecs=240)=>{
    const S=surfaceDestination;for(let i=0;i<400&&phase!=='destinationApproach';i++)update(1/30);
    const idx=campaign.currentStageIndex,points=S.survey?.length||0;let f=0;
    const flying=()=>campaign.currentMission&&campaign.currentStageIndex===idx&&phase==='destinationApproach';
    for(;f<maxSecs*30&&flying();f++){
      const left=S.surveyLeft().sort((a,b)=>a.worldZ-b.worldZ),t=left[0]?{x:left[0].x,z:left[0].worldZ}:{x:S.targetX,z:S.targetWorldZ};
      inputX=clamp(wrapAngle(Math.atan2(t.x-shipX,t.z-travel)-viewYaw)*2.2,-1,1);inputY=left[0]?.kind==='core'&&Math.hypot(t.x-shipX,t.z-travel)<45?1:0;update(1/30)
    }
    inputX=0;const done=!flying();return{done,secs:Math.round(f/30),points,left:done?0:S.surveyLeft().length}
  };
  // Lattice Survey, one frame of steering: lean away from every core whose line would
  // pass too close (sooner ones count for more), otherwise drift in towards the next
  // core still to scan. Limited hand speed and a little wobble, like the fight bot.
  const latticeSteer=(skill=1)=>{
    const rd=routeDiversion,rate=.09*skill,keep=26+3/skill;let ax=0,ay=0,tgt=null,tz=1e9;
    for(const a of rd.anchors){
      if(a.f.dead)continue;const q=camPoint([a.x,a.y,a.z]),miss=Math.hypot(q[0],q[1]);
      if(q[2]>-18&&q[2]<150&&miss<keep){const w=(keep-miss+4)/keep*60/Math.max(25,q[2]+25),m=Math.max(.01,miss);ax-=q[0]/m*w;ay+=q[1]/m*w}
      if(!a.scanned&&q[2]>10&&q[2]<tz){tz=q[2];tgt={q,miss}}
    }
    let tx=0,ty=0;
    if(!rd.surveyDone){
      if(ax||ay){const m=Math.max(1,Math.hypot(ax,ay));tx=ax/m;ty=ay/m}
      else if(tgt&&tgt.miss>40&&rd.passScanned<rd.KINDS.latticeSurvey.need){tx=tgt.q[0]/tgt.miss*.6;ty=-tgt.q[1]/tgt.miss*.6}
    }
    inputX=clamp(inputX+clamp(tx-inputX,-rate,rate)+(Math.random()-.5)*.03/skill,-1,1);
    inputY=clamp(inputY+clamp(ty-inputY,-rate,rate)+(Math.random()-.5)*.03/skill,-1,1)
  };
  // v2040 Customs Run: aim for the middle of the gap that will be in front of the drone
  // when it reaches the next ring (the arms keep turning on the way in).
  const customsSteer=(skill=1)=>{
    const X=globalThis.AgentXCustomsRun,r=X?.rings.find(o=>!o.done);let tx=0,ty=0;
    const o=r&&X.rel(r);
    if(o&&-o.along<240){const t=Math.max(0,-o.along)/Math.max(1,OPEN_SPACE_CRUISE),step=6.283/X.arms,g=r.a+r.dir*X.speed*t+step/2;
      const q=camPoint(X.point(r,X.RADIUS*.6,g));tx=clamp(q[0]/6,-1,1);ty=clamp(-q[1]/6,-1,1)}
    const rate=.12*skill;inputX=clamp(inputX+clamp(tx-inputX,-rate,rate),-1,1);inputY=clamp(inputY+clamp(ty-inputY,-rate,rate),-1,1)
  };
  // Fly a launched Customs Run to its end: the picket (steered, or held straight when
  // still:true, which flies through the hub and is always flagged), then any interceptors.
  const flyCustoms=(skill=1,{still=false,spin=false,turnFirst=false,maxSecs=240}={})=>{
    const rd=routeDiversion;inputX=inputY=0;for(let i=0;i<900&&rd.state!=='customs';i++)update(1/30);
    if(rd.state!=='customs')return{started:false};
    const m=campaign.currentMission,st={started:true,frames:0};
    for(;st.frames<maxSecs*30&&rd.active&&(rd.state==='customs'||rd.state==='customsFight');st.frames++){
      if(rd.state==='customs'){if(spin||(turnFirst&&st.frames<45)){inputX=1;inputY=0}else if(still)inputX=inputY=0;else customsSteer(skill)}else fightStep(.9);
      update(1/30)}
    inputX=inputY=0;st.secs=Math.round(st.frames/30);st.scans=globalThis.AgentXCustomsRun.lastScans;
    st.outcome=(m?.diversions||[]).find(d=>d.main)?.outcome||'';return st
  };
  // v2080 Cargo Spill: steer for the nearest free pod ahead. With none ahead, fight.
  const spillStep=(skill=1)=>{
    const S=globalThis.AgentXCargoSpill;let best=null,bz=1e9;
    // Only pods still within reach of a gentle turn, nearest and most central first.
    for(const p of S.free()){const q=camPoint([p.x,p.y,p.z]),off=Math.hypot(q[0],q[1]);if(q[2]>4&&q[2]<300&&off<q[2]*.45+3){const score=q[2]+off*4;if(score<bz){bz=score;best=q}}}
    if(!best){fightStep(.9);return}
    const rate=.12*skill,tx=clamp(best[0]/5,-1,1),ty=clamp(-best[1]/5,-1,1);
    inputX=clamp(inputX+clamp(tx-inputX,-rate,rate),-1,1);inputY=clamp(inputY+clamp(ty-inputY,-rate,rate),-1,1)
  };
  const flySpill=(skill=1,{still=false,spin=false,maxSecs=240}={})=>{
    const rd=routeDiversion;inputX=inputY=0;for(let i=0;i<900&&rd.state!=='spill';i++)update(1/30);
    if(rd.state!=='spill')return{started:false};
    const m=campaign.currentMission,st={started:true,frames:0};
    for(;st.frames<maxSecs*30&&rd.active&&rd.state==='spill';st.frames++){
      if(spin&&globalThis.AgentXCargoSpill.free().length){inputX=1;inputY=0}else if(still&&globalThis.AgentXCargoSpill.free().length)inputX=inputY=0;else spillStep(skill);update(1/30)}
    inputX=inputY=0;st.secs=Math.round(st.frames/30);const d=(m?.diversions||[]).find(x=>x.main);
    st.outcome=d?.outcome||'';st.kills=interceptorsDestroyed;st.pods=d?.pods;st.total=d?.podsTotal;st.pay=d?.pay;st.last=globalThis.AgentXCargoSpill.last;return st
  };
  // Fly a launched Lattice Survey to its end. Stops (woke:true) if the lattice wakes.
  const flyLattice=(skill=1,maxSecs=200)=>{
    const rd=routeDiversion;inputX=inputY=0;for(let i=0;i<900&&rd.state!=='lattice';i++)update(1/30);
    if(rd.state!=='lattice')return{started:false};
    const idx=campaign.currentStageIndex,st={started:true,woke:false,frames:0};
    for(;st.frames<maxSecs*30&&campaign.currentMission&&campaign.currentStageIndex===idx;st.frames++){
      if(rd.state==='latticeFight'){st.woke=true;st.at=`${rd.KINDS.latticeSurvey.shells[rd.pass]} after ${rd.passScanned}`;break}
      if(rd.state!=='lattice')break;
      latticeSteer(skill);update(1/30)
    }
    inputX=inputY=0;st.secs=Math.round(st.frames/30);
    st.quiet=!st.woke&&(campaign.currentMission?.diversions||[]).some(d=>d.outcome==='surveyed');return st
  };
  // v1830 JOB PILOT (console only, it takes minutes): plays a whole board job the way a
  // player would. It shoots whatever hostile is nearest in front, and with nothing to
  // shoot it steers at whatever objective marker or edge arrow the HUD last drew (it reads
  // the HUD through drawHudMarkerLabel and hudEdgeCue, so it knows nothing a player does
  // not). On a land approach it uses the approach pilot, and on an armour field the
  // ground-attack one (v1840). A stage it cannot finish inside stageCap seconds is marked
  // STUCK and skipped. It cannot thread a minefield, shoot rocks or work a nest, a
  // bunker interior or the deep core, so those stages always show as stuck. It also shoots sleeping ghost cores, so
  // it plays the "woken" ending of a Lattice Survey (flyLattice plays the quiet one).
  //   __flyJob('station_defence')            one job, returns a line of stage times
  //   await __flyAll()                       every board template
  // One frame of dogfighting: turn towards the nearest live hostile in front (or round
  // towards the nearest one at all) and fire in short bursts while the sight is on it.
  // With nothing to shoot it steers at `mark` (a screen point) if one is given.
  // Returns true while there is something to fight.
  let trigT=0;
  const fightStep=(skill=.9,mark=null)=>{
    const dt=1/30;let best=null,bd=1e9,any=null,ad=1e9,tx=0,ty=0,on=false;
    let pool=fighters.filter(x=>!x.dead&&!x.dying&&!(x.t<0));
    // v1860 Xeno nest: fly at the hive and hold fire on the way in (shooting rouses the
    // swarm), shoot the regulator in its chamber, then follow the observation marker out.
    const nest=typeof xenoNest!=='undefined'&&xenoNest.active?xenoNest:null,toMark=pt=>{const q=camPoint([pt.x,pt.y,pt.z]);return q[2]>.2?projectCam(q):{x:q[0]<0?0:W,y:viewH*.48}};
    if(nest&&nest.state==='approach'&&nest.core){pool=[];mark=toMark(nest.core)}
    else if(nest&&nest.state==='observationRun'&&nest.nav){pool=[];mark=toMark(nest.nav)}
    else if(nest&&nest.state==='coreChamber'&&nest.objective&&!nest.objective.dead)pool=[nest.objective];
    const nestQuiet=!!(nest&&(nest.state==='approach'||nest.state==='observationRun'));
    // v1860: with no hostiles in an asteroid clearance, the rocks are the targets (the
    // marked ones if the job marks them), nearest in front first.
    if(!pool.length&&!nestQuiet&&phase==='asteroids'&&campaign.currentStage?.()?.type==='asteroids'&&typeof asteroidField!=='undefined'&&asteroidField.active&&!asteroidField.courierMode&&asteroidField.state==='active'&&typeof asteroids!=='undefined')
      pool=asteroids.filter(a=>a&&!a.dead&&!a.dying&&(!asteroidField.markedTargets||a.missionTarget===true)).filter(a=>{const z=camPoint([a.x,a.y,a.z])[2];return z>3&&z<260});
    // Deep core: on the surface the targets are the caps of the shield pylons, and in the
    // trench and reactor hall the wall guns and the live reactor.
    if(!pool.length&&!nest&&typeof groundTargets!=='undefined'&&(groundTargets.length||mode==='trenchEntry')&&!(typeof groundAssault!=='undefined'&&groundAssault.active)){
      if(mode==='trenchEntry')pool=bunkerDoorOpen?[]:[{x:entryBunkerX,y:-2.2,z:entryBunkerZ(),s:1.5,near:.2}];   // blast the door (the drone is held 3 units from it, so it counts at point blank)
      else if(phase==='surface'&&!(typeof surfaceBunkerActive!=='undefined'&&surfaceBunkerActive))pool=groundTargets.filter(g=>g.doorPylon&&!g.dead&&!g.capDead&&!g.capDying).map(g=>({x:g.x,y:towerCapY(g),z:g.worldZ-travel,s:g.s||1}));
      else if(phase==='trench'||phase==='reactor'||phase==='escape')pool=groundTargets.filter(g=>!g.dead&&!g.dying&&(g.type==='reactor'?g.active:g.type==='wallgun')).map(g=>({x:g.x,y:g.y+(g.yOff||0),z:g.worldZ-travel,s:g.s||1})).filter(o=>o.z>2&&o.z<120)
    }
    for(const x of pool){const q=camPoint([x.x,x.y,x.z]),d=Math.hypot(q[0],q[1],q[2]);if(d<ad){ad=d;any={x,q}}if(q[2]>(x.near||2)&&d<bd){bd=d;best={x,q}}}
    if(best){const pp=projectCam(best.q);if(pp){tx=clamp((pp.x-W*.5)/(W*.5-22),-1,1);ty=clamp((pp.y-viewH*.48)/(viewH*.46-18),-1,1);const a=aimScreen();on=Math.hypot(a.x-pp.x,a.y-pp.y)<Math.max(14*W/1280,best.x.s*pp.k*.8)}}   // the 14 px floor is for a 1280 wide view
    else if(any){const q=any.q;tx=clamp(q[0]/(Math.abs(q[2])+8)*2+(q[2]<0?Math.sign(q[0]||1):0),-1,1);ty=clamp(-q[1]/(Math.abs(q[2])+8)*2,-1,1)}
    else if(mark){tx=clamp((mark.x-W*.5)/(W*.5)*1.4,-1,1);ty=clamp((mark.y-viewH*.48)/(viewH*.46)*1.4,-1,1)}
    const rate=2.6*skill*dt;inputX=clamp(inputX+clamp(tx-inputX,-rate,rate),-1,1);inputY=clamp(inputY+clamp(ty-inputY,-rate,rate),-1,1);
    // v1990: under autopilot with a free gunsight (the bunker door approach, carrier chase)
    // the mouse moves aimX/aimY, not the steering: move the sight instead. 'On target'
    // also respects the game's largest hit radius (120 px for the door).
    if(best&&typeof freeAutopilotWeaponAim==='function'&&freeAutopilotWeaponAim()){
      const pp=projectCam(best.q);
      if(pp){const wx=clamp((pp.x-W*.5)/(W*.155),-1,1),wy=clamp((pp.y-viewH*.48)/(viewH*.155),-1,1);aimX=clamp(aimX+clamp(wx-aimX,-rate,rate),-1,1);aimY=clamp(aimY+clamp(wy-aimY,-rate,rate),-1,1);
        const a=aimScreen();on=Math.hypot(a.x-pp.x,a.y-pp.y)<Math.min(110,Math.max(14*W/1280,best.x.s*pp.k*.8))}
    }
    if(on&&!fireHeld){fireHeld=true;beginLaserBurst()}if(fireHeld&&(++trigT>10||!on)){fireHeld=false;endLaserTrigger();trigT=0}
    return !!any
  };
  const ceaseFire=()=>{fireHeld=false;try{endLaserTrigger()}catch(_){}inputX=inputY=0;trigT=0};
  // v1840: one frame of ground attack on an armour field. Picks a live unit ahead (not the
  // one it has just flown over), keeps it until it is dead, behind or underneath, turns
  // onto it, and fires bursts at an unbroken knee if it has knees, else at its hull.
  let gTarget=null,gExtend=false;
  const groundStep=(skill=.9)=>{
    const G=groundAssault,dt=1/30,live=u=>u&&!u.dead&&u.state==='alive';let tx=0,ty=0,on=false;
    if(!G.leadIn){
      const errOf=u=>wrapAngle(Math.atan2(u.x-shipX,u.wz-travel)-viewYaw);
      // A target close by but off to the side cannot be turned onto (the drone only orbits
      // it), so fly straight out to 75 and come back, as a pilot would.
      if(gTarget&&live(gTarget)&&!gExtend&&G.planarToShip(gTarget)<45&&Math.abs(errOf(gTarget))>1.1)gExtend=true;
      if(gExtend&&(!live(gTarget)||G.planarToShip(gTarget)>75))gExtend=false;
      if(gExtend){inputX=clamp(inputX+clamp(0-inputX,-.08,.08),-1,1);inputY=clamp(inputY+clamp(0-inputY,-.08,.08),-1,1);if(fireHeld){fireHeld=false;endLaserTrigger();trigT=0}return}
      if(gTarget&&(!live(gTarget)||!G.units.includes(gTarget)||(G.planarToShip(gTarget)<14&&Math.abs(errOf(gTarget))>.5)||Math.abs(errOf(gTarget))>1.5))gTarget=null;
      // In a factory, a unit under a shield dome cannot be hurt: leave it until its dome is down.
      const open=u=>!(G.variant==='factory'&&G.shielded?.(u));
      if(gTarget&&!open(gTarget))gTarget=null;
      if(!gTarget){let bs=1e9;for(const u of G.units){if(!live(u)||!open(u))continue;const d=G.planarToShip(u),e=Math.abs(errOf(u)),sc=d+(e>.7?90*e:0)+(d<22?120:0);if(sc<bs){bs=sc;gTarget=u}}}
      const u=gTarget;
      if(u){
        const err=errOf(u),d=G.planarToShip(u);let pt=null,r=14;
        if(Math.abs(err)<.9&&d<170&&d>6){
          G.pose?.(u);
          if(u.knees&&u.knees.some(k=>!k.broken)){const i=u.knees.findIndex(k=>!k.broken);pt=proj(G.worldPoint(u,u.poseKnees[i]));if(pt)r=clamp(u.K.legs[i].t*1.25*u.s*pt.k,12,70)}
          else{const sp=u.K.spheres[0];pt=proj(G.worldPoint(u,G.bodyTransform(u)([sp[0],sp[1],sp[2]])));if(pt)r=clamp(sp[3]*u.s*pt.k,13,160)}
        }
        if(pt){tx=clamp((pt.x-W*.5)/(W*.5-22),-1,1);ty=clamp((pt.y-viewH*.48)/(viewH*.46-18),-1,1);const a=aimScreen();on=Math.hypot(a.x-pt.x,a.y-pt.y)<r*.8&&d<160}
        else tx=clamp(err*2,-1,1)
      }else if(G.bunkerUnlocked&&G.bunkerNavPoint){
        // Factory cleared: head for the bunker marker (the game's own autopilot takes the last 80 units).
        const n=G.bunkerNavPoint();tx=clamp(wrapAngle(Math.atan2(n.x-shipX,n.wz-travel)-viewYaw)*2,-1,1)
      }
    }
    const rate=2.6*skill*dt;inputX=clamp(inputX+clamp(tx-inputX,-rate,rate),-1,1);inputY=clamp(inputY+clamp(ty-inputY,-rate,rate),-1,1);
    if(on&&!fireHeld){fireHeld=true;beginLaserBurst()}if(fireHeld&&(++trigT>10||!on)){fireHeld=false;endLaserTrigger();trigT=0}
  };
  // Fly a launched armour-field job's ground stage to its end.
  const flyGround=(stageType='dune_assault',maxSecs=600,skill=.9)=>{
    const G=groundAssault;if(!toStage(stageType))return{started:false};
    for(let i=0;i<900&&!(phase==='surface'&&G.active);i++)update(1/30);if(!(phase==='surface'&&G.active))return{started:false};
    const idx=campaign.currentStageIndex,units=G.units.length;let f=0;gTarget=null;gExtend=false;
    const flying=()=>campaign.currentMission&&campaign.currentStageIndex===idx&&phase==='surface';
    for(;f<maxSecs*30&&flying();f++){groundStep(skill);update(1/30)}
    ceaseFire();return{started:true,done:!flying(),secs:Math.round(f/30),units,left:G.units.filter(u=>!u.dead&&u.state==='alive').length}
  };
  const hud={mark:null,edge:null};let hudFrame=0,hudHooked=false;
  const hookHud=()=>{
    if(hudHooked)return;hudHooked=true;const d0=window.drawHudMarkerLabel,e0=window.hudEdgeCue;
    window.drawHudMarkerLabel=function(text,x,y,...r){hud.mark={x,y,f:hudFrame};return d0.call(this,text,x,y,...r)};
    window.hudEdgeCue=function(q,...r){const v=e0.call(this,q,...r);hud.edge={x:v.x,y:v.y,f:hudFrame};return v}
  };
  const flyJob=(id,{maxSecs=900,stageCap=240,skill=.9,weapon='laser5',frame='AX-5A',level=20,prepare=null,launch=null,risk=null,mortal=false}={})=>{
    const c=campaign,T=AgentXMissionData.templates;hookHud();reset();
    c.state.xp=c.xpForLevel(level);if(!c.state.ownedFrames.includes(frame))c.state.ownedFrames.push(frame);c.state.drone=frame;c.state.inventory[weapon]=1;c.state.weaponLoadout=weapon;
    // prepare(mission) may edit a preview before it launches (say, to splice a diversion in).
    // launch() may start any mission itself (a story mission or a Black Contract).
    if(launch)launch();
    // risk: keep rolling previews until one of that risk comes up. mortal: the drone can
    // be hurt and lost, so the line ends with the shield points it cost (v1860).
    else{const fac=(T[id].allowedFactions||['trade'])[0];let pre=null;
      if(risk)for(let k=0;k<300;k++){const x=c.makeDevTemplatePreview(id,fac);if(x&&x.risk===risk){pre=x;break}}
      if(prepare){pre=pre||c.makeDevTemplatePreview(id,fac);prepare(pre);pre.stages=pre.modules.map(x=>x.label)}
      if(risk&&!pre)return `${id} has no risk ${risk} contract at level ${level}`;
      c.launchDevTemplateTest(id,fac,pre?{mission:pre}:{})}
    if(!c.currentMission)return `${id} did not launch`;invulnerable=!mortal;inputX=inputY=0;gTarget=null;gExtend=false;
    const m=c.currentMission,stages=[],dt=1/30;let idx=-1,sf=0,frames=0,ended=false,hits=0,lastShield=shield,died=false;
    for(let f=0;f<maxSecs*30&&c.currentMission;f++){
      if(c.currentStageIndex!==idx){if(stages.length)stages[stages.length-1].secs=Math.round(sf/30);idx=c.currentStageIndex;sf=0;stages.push({type:c.currentStage()?.type})}
      if(exiting()&&c.currentStageIndex>=m.modules.length-1){ended=true;break}
      if(sf>stageCap*30&&!exiting()){stages[stages.length-1].stuck=`${mode}/${phase}`;scenarioFlow.completeCurrentStage?.();for(let k=0;k<5;k++)update(dt);continue}
      if(mode==='dead'){died=true;break}
      // The picture is only needed to read the HUD marker, so not while there is a fight on.
      hudFrame=f;if(f%2===0&&!fighters.some(x=>!x.dead&&!x.dying&&x.t>=0))render(performance.now());
      if(phase==='destinationApproach'&&surfaceDestination.active){
        const S=surfaceDestination,left=S.surveyLeft().sort((a,b)=>a.worldZ-b.worldZ),t=left[0]?{x:left[0].x,z:left[0].worldZ}:{x:S.targetX,z:S.targetWorldZ};
        inputX=clamp(wrapAngle(Math.atan2(t.x-shipX,t.z-travel)-viewYaw)*2.2,-1,1);inputY=left[0]?.kind==='core'&&Math.hypot(t.x-shipX,t.z-travel)<45?1:0   // v1930: dive for core samples
      }else if(phase==='surface'&&groundAssault?.active&&groundAssault.units?.length)groundStep(skill);
      else if(routeDiversion.active&&routeDiversion.state==='customs')customsSteer(1);   // v2040
      else{
        // The asteroid-base marker is drawn without a label while it is on screen, so the
        // HUD hooks never see it there: take its point from the courier directly.
        let mk=(hud.mark&&f-hud.mark.f<=2)?hud.mark:((hud.edge&&f-hud.edge.f<=2)?hud.edge:null);
        if(!mk&&typeof courier!=='undefined'&&courier.mine&&!courier.docking&&!courier.navLocked){const q=camPoint(courier.manualNavigationTarget?.()||courier.doorCentre?.()||[courier.mine.x,courier.mine.y,courier.mine.z]);if(q[2]>.2)mk=projectCam(q)}
        // The station door and pad markers are the same: unlabelled while on screen.
        if(!mk&&typeof stationDelivery!=='undefined'&&stationDelivery.active){const sd=stationDelivery,pt=sd.state==='padApproach'?sd.padApproachPoint?.():(((sd.state==='approach'||sd.state==='clearedApproach')&&!sd.docking)?sd.navigationTarget?.():null);
          if(pt){const q=camPoint(pt);if(q[2]>.2)mk=projectCam(q)}}
        // Leaving a wreck has no marker by design (the torn mouth is the guide): aim for the mouth.
        if(!mk&&typeof asteroidWreckRun!=='undefined'&&asteroidWreckRun.active&&asteroidWreckRun.state==='exitNav'){const g=asteroidWreckRun.gapPoint?.();if(g){const q=camPoint([g.x,g.y,g.z]);if(q[2]>.2)mk=projectCam(q)}}
        // Deep core surface with the pylons down: head for the bunker.
        if(!mk&&phase==='surface'&&typeof surfaceBunkerActive!=='undefined'&&surfaceBunkerActive){const q=camPoint([entryBunkerX,-2.2,entryBunkerZ()]);mk=q[2]>.2?projectCam(q):{x:q[0]<0?0:W,y:viewH*.48}}
        fightStep(skill,mk)
      }
      update(dt);frames++;sf++;if(shield<lastShield)hits+=lastShield-shield;lastShield=shield
    }
    if(stages.length)stages[stages.length-1].secs=Math.round(sf/30);
    ceaseFire();invulnerable=true;
    const finished=!died&&(ended||!c.currentMission);
    const div=(m.diversions||[]).map(d=>`${d.kind}:${d.outcome}`).join(', ');
    return `${id} risk ${m.risk} ${died?'DRONE LOST at '+stages[stages.length-1]?.type:(finished?'finished':'cut off at '+c.currentStage?.()?.type)} in ${Math.round(frames/30)} s${mortal?`, ${Math.round(hits)} shield lost of ${c.maxShield()}`:''} :: ${stages.map(x=>`${x.type} ${x.secs}s${x.stuck?' STUCK('+x.stuck+')':''}`).join(' > ')}${div?' :: diversions '+div:''}`
  };
  window.__flyJob=flyJob;
  // Story and faction missions, and the Black Contracts, under the same pilot.
  window.__flyStory=(contractId,opts={})=>flyJob(contractId,{...opts,launch:()=>{const c=campaign,m=c.storyContract(contractId);if(!m)return;m.id=m.id||contractId;m.implemented=true;m.devTemplateTest=true;c.pendingMission=m;c.launchMission(m.id)}});
  window.__flyBlack=(threat,opts={})=>flyJob('black '+threat,{...opts,launch:()=>{const c=campaign,m=AgentXEndgame.blackContract(threat);m.devTemplateTest=true;c.pendingMission=m;c.launchMission(m.id)}});
  window.__flyAll=async(opts)=>{const out=[];for(const id of Object.keys(AgentXMissionData.templates)){out.push(flyJob(id,opts));console.log(out[out.length-1]);await pause()}return out};
  // From the console, after launching a job: __pilots.toStage('surface_destination_approach'),
  // __pilots.flyApproach(), __pilots.flyLattice(skill).
  window.__pilots={toStage,flyApproach,flyLattice,flyGround,flyCustoms,flySpill};
  async function group(name,items,run){
    const details=[];let n=0;
    for(const it of items){
      const e0=errs.length;let fail=null;
      try{reset();fail=run(it)||null}catch(e){fail='threw: '+e.message}
      if(errs.length>e0)fail=(fail?fail+' · ':'')+errs.slice(e0).join(' · ');
      if(fail)details.push(`${typeof it==='string'?it:(it.label||it.id||it)}: ${fail}`);
      n++;if(n%3===0){paint(`${name} ${n}/${items.length}`);await pause()}
    }
    results.push({name,ok:!details.length,summary:`${items.length-details.length}/${items.length}`,details});paint();await pause()
  }
  async function main(){
    document.body.appendChild(box);paint('starting');
    Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>document.documentElement});document.dispatchEvent(new Event('fullscreenchange'));
    // Sound off for the run, in memory only: the player's mixer settings are not saved over.
    try{AudioMixer.save=()=>{};AudioMixer.setEnabled('master',false)}catch(_){}
    await new Promise(r=>setTimeout(r,600));
    const c=campaign;
    results.push({name:'boot',ok:!!(c&&c.state&&Array.isArray(c.missions)&&c.missions.length&&c.storageKey!=='agentXCampaignV1'),summary:`${BOOTS} fresh boots, ${c?.missions?.length||0} contracts each, key ${c?.storageKey}`,details:errs.splice(0)});paint();
    if(c.storageKey==='agentXCampaignV1'){results.push({name:'abort',ok:false,summary:'refusing to run on the real save',details:[]});paint();return}

    await group('boards',[1,5,10,16],lvl=>{c.state.xp=c.xpForLevel(lvl);for(let i=0;i<75;i++){c.generateContractBoard();for(const m of c.missions)if(!m.modules?.length||!m.title||!(m.xp>0))return `bad contract at level ${lvl}: ${m.templateId}`}});
    c.state.xp=c.xpForLevel(8);

    const T=AgentXMissionData.templates;
    await group('templates',Object.keys(T),id=>{c.launchDevTemplateTest(id,(T[id].allowedFactions||['trade'])[0]);if(!c.currentMission)return 'did not launch';invulnerable=true;fly();if(!ended())return `stuck in ${mode}/${phase} at ${c.currentStage?.()?.type}`});

    await group('stories',AgentXStoryContent.devMailOptions().map(o=>o.contractId),id=>{const m=c.storyContract(id);if(!m)return 'no contract';m.id=m.id||id;m.implemented=true;m.devTemplateTest=true;c.pendingMission=m;c.launchMission(m.id);if(!c.currentMission)return 'did not launch';invulnerable=true;fly(30,120);for(let f=0;f<400&&c.currentMission&&!ended();f++)update(1/30);if(!ended())return `stuck in ${mode}/${phase}`});

    await group('black',AgentXEndgame.MISSIONS.map((d,i)=>({id:d.id,t:i+1})),it=>{const m=AgentXEndgame.blackContract(it.t);m.devTemplateTest=true;c.pendingMission=m;c.launchMission(m.id);if(!c.currentMission)return 'did not launch';invulnerable=true;
      for(let s=0;s<30&&c.currentMission&&!ended();s++){const idx=c.currentStageIndex;for(let f=0;f<150&&c.currentMission&&c.currentStageIndex===idx;f++){update(1/30);if(f%30===0){render(performance.now());for(const x of fighters)if(x.ghost&&!x.dead&&!x.dying&&x.g?.state==='formed'&&x.t>=0){queueObjectDestruction(x,proj([x.x,x.y,x.z]));break}}}if(c.currentMission&&c.currentStageIndex===idx)scenarioFlow.completeCurrentStage?.()}
      if(!ended())return `stuck in ${mode}/${phase}`});

    await group('diversions',Object.keys(routeDiversion.KINDS),kind=>{const m=c.makeDevTemplatePreview('asteroid_delivery','security');m.routeEncounter=null;m.modules=m.modules.filter(x=>x.type!=='route_diversion'&&!x.routeEncounter);m.modules.splice(0,0,{type:'route_diversion',label:'Route Diversion',diversion:kind,difficulty:2,spaceCombat:false,fighterHp:12});m.stages=m.modules.map(x=>x.label);
      c.launchDevTemplateTest('asteroid_delivery','security',{mission:m});invulnerable=true;for(let i=0;i<600&&!routeDiversion.active;i++)update(1/30);if(!routeDiversion.active)return 'never started';
      const secs=kind==='latticeSurvey'||kind==='escort'||kind==='customs'||kind==='spill'?240:90;
      for(let i=0;i<30*secs&&routeDiversion.active;i++){
        // A survey only ends when its shells are scanned, so the pilot flies it. If the
        // pilot wakes it, the other ending is exercised instead: the lattice is cleared.
        if(kind==='latticeSurvey'){if(routeDiversion.state==='lattice')latticeSteer(1);else if(routeDiversion.state==='latticeFight'){routeDiversion.finishLattice(true);break}}
        if(kind==='escort'||kind==='layerCrew'||routeDiversion.state==='customsFight'||(routeDiversion.state==='spill'&&fighters.some(f=>!f.dead&&!f.dying)))fightStep(.9);   // v1910/v2020: these only end when the raiders die
        update(1/30);if(i%60===0)render(performance.now())}
      inputX=inputY=0;
      if(routeDiversion.active)return `still running after ${secs} s in state ${routeDiversion.state}`});

    // Flown for real: no stage is skipped once the pilot has the controls.
    const pilotNotes=[];
    await group('pilots',['survey_run','vent_survey','crash_recovery','relay_repair','crater_cores','lattice_survey','dune_armour_clearance','ice_field_armour','factory_strike','asteroid ambush','city merge edge','convoy_escort','minelayer','customs_run','cargo_spill'],id=>{
      // v2080: Cargo Spill flown twice, once going for the pods and once flying straight
      // past them. Both must end, and going for the pods must bring more home.
      if(id==='cargo_spill'){
        const runs=[];
        for(const still of[false,true]){reset();c.launchDevTemplateTest('cargo_spill','trade');invulnerable=true;const r=flySpill(1,{still});runs.push(r);
          if(!r.started)return 'the pods never appeared';if(!r.outcome)return `the spill did not finish (${routeDiversion.state}, ${r.secs}s)`}
        // v2090: turning away from every pod must not end the job before the scavengers are down.
        {reset();c.launchDevTemplateTest('cargo_spill','trade');invulnerable=true;const S=globalThis.AgentXCargoSpill;let fought=false;const u0=S.update;
          S.update=function(dt){const r=u0.call(this,dt);if(r==='done'&&!this.scavsDone)fought='early';if(this.scavsDone&&fought!=='early')fought=true;return r};
          let r;try{r=flySpill(1,{spin:true})}finally{S.update=u0}
          if(!r.outcome)return `turned away: the spill did not finish (${routeDiversion.state}, ${r.secs}s)`;
          if(fought!==true)return `turned away: the job ended after ${r.secs}s without the scavenger fight`;runs.push(r)}
        pilotNotes.push(`spill ${runs[0].secs}s ${runs[0].pods}/${runs[0].total}, straight ${runs[1].pods}/${runs[1].total}, turned away ${runs[2].secs}s`);
        if(!(runs[0].pods>runs[1].pods))return `going for the pods brought home ${runs[0].pods}, flying straight ${runs[1].pods}`;return
      }
      // v2040: the Customs Run flown twice, once threading the gaps (should come out clean
      // most times) and once held straight through the hubs (always flagged, then a fight).
      if(id==='customs_run'){
        const runs=[];
        // A third run turns hard away from the picket the whole time: the job must still end.
        // v2050: a ring placed after a hard turn must judge arms and gaps where it draws them.
        {reset();c.launchDevTemplateTest('customs_run','jackals');invulnerable=true;for(let i=0;i<900&&routeDiversion.state!=='customs';i++)update(1/30);
          inputX=1;for(let i=0;i<40;i++)update(1/30);inputX=0;const X=globalThis.AgentXCustomsRun;X.rings.length=0;X.place(200);const r=X.rings[0],step=6.283/X.arms;
          const at=a=>{const P=X.point(r,15,a);r.x+=shipX-P[0];r.y+=shipY-P[1];r.z+=0-P[2];return X.armHit(r)};
          const onArm=at(r.a),inGap=at(r.a+step/2),out=(()=>{const P=X.point(r,40,r.a+step/2);r.x+=shipX-P[0];r.y+=shipY-P[1];r.z+=0-P[2];return X.armHit(r)})();
          if(onArm!=='arm'||inGap!==''||out!=='outside')return `turned ring judged wrongly: arm '${onArm}', gap '${inGap}', outside '${out}' (forward ${r.f.map(v=>v.toFixed(2))})`}
        for(const how of['steer','still','spin','turnFirst']){reset();c.launchDevTemplateTest('customs_run','jackals');invulnerable=true;const r=flyCustoms(1,{still:how==='still',spin:how==='spin',turnFirst:how==='turnFirst'});runs.push(r);
          if(!r.started)return 'the picket never appeared';if(!r.outcome)return `${how}: the run did not finish (${routeDiversion.state}, ${r.secs}s)`;
          if((how==='still'||how==='spin')&&r.outcome!=='flagged')return `${how}: never scanned`;
          // Turning for the first 1.5 s loses the rings placed during the turn, at most two. The rest must be threaded.
          if(how==='turnFirst'&&r.scans>3)return `scanned at ${r.scans} rings after turning first, the pilot could not thread turned rings`}
        pilotNotes.push(`customs ${runs[0].secs}s ${runs[0].outcome} ${runs[0].scans} scans, flagged ${runs[1].secs}s, turned away ${runs[2].secs}s, turn then thread ${runs[3].outcome} ${runs[3].scans}`);return
      }
      // v1950: a pirate fight with its minelayer forced: it must lay mines and the fight must end.
      if(id==='minelayer'){
        const ML=globalThis.AgentXMinelayers;if(!ML)return 'minelayers.js is not loaded';let laid=0,marked=false;const seen=new Set();
        const u0=ML.update;ML.update=function(dt){const r=u0.call(this,dt);if(this.live().length)marked=true;if(!laid)for(const f of this.live())f.hp=f.maxHp;   /* v2080: a lucky early kill no longer fails the check */for(const m of this.mines)if(!seen.has(m)){seen.add(m);laid++}return r};
        let line;try{line=flyJob('fighters',{weapon:'laser3',frame:'AX-3B',level:10,risk:5,stageCap:300,maxSecs:400,prepare:m=>{const f=m.modules.find(x=>x.type==='fighters');f.profile='pirate';f.target=10;ML.force=true}})}finally{ML.update=u0;ML.force=false}
        pilotNotes.push(`minelayer ${laid} mines`);if(!marked)return 'no minelayer appeared';if(!laid)return 'the minelayer laid no mines';if(!/finished/.test(line)||/STUCK/.test(line))return line;return
      }
      // v1910: the convoy escort flown by the job pilot: every wave must end and the job finish.
      if(id==='convoy_escort'){
        const line=flyJob('convoy_escort',{weapon:'laser3',frame:'AX-3B',level:10,stageCap:400,maxSecs:500,prepare:m=>{pilotNotes.__m=m}});
        const m=pilotNotes.__m;delete pilotNotes.__m;const out=(m?.diversions||[]).find(d=>d.main);
        const secs=Number((line.match(/in (\d+) s/)||[])[1]||0);pilotNotes.push(`escort ${secs}s ${out?.outcome||'?'}`);
        if(!/finished/.test(line)||/STUCK/.test(line))return line;if(!out)return 'the escort ended without an outcome';return
      }
      // v1890: the city road rejoin after a pickup must hand control back even when a frame
      // stops it within the last .04 of the merge (it used to hang there for good).
      if(id==='city merge edge'){
        c.launchDevTemplateTest('groundside_pickup','trade');invulnerable=true;if(!toStage('urban_exit'))return 'never reached the city exit';
        const J=jackalDelivery;for(let k=0;k<600&&J.state!=='outboundMerge';k++)update(1/30);if(J.state!=='outboundMerge')return `the merge never started (${J.state})`;
        travel=J.outboundMergeEndTravel+.02;for(let k=0;k<30&&J.state==='outboundMerge';k++)update(1/30);
        if(J.state==='outboundMerge')return 'stuck in REJOINING CITY ROAD with the drone .02 short of the end';return
      }
      // v1870: an asteroid clearance with its ambush forced: the fight must start partway
      // through, end, and hand back to the rocks, and the job must finish.
      if(id==='asteroid ambush'){
        const AA=globalThis.AgentXAsteroidAmbush;if(!AA)return 'asteroid-ambush.js is not loaded';
        let fought=false;const s0=AA.start;AA.start=function(){fought=true;return s0.call(this)};
        let line;try{AA.force=true;line=flyJob('asteroids',{weapon:'laser3',frame:'AX-3B',level:10,risk:5,stageCap:240,maxSecs:400})}finally{AA.start=s0;AA.force=false}
        const secs=Number((line.match(/in (\d+) s/)||[])[1]||0);pilotNotes.push(`ambush ${secs}s`);
        if(!fought)return 'the ambush never started';if(/STUCK/.test(line))return line;if(!/finished/.test(line))return line;return
      }
      if(id==='dune_armour_clearance'||id==='ice_field_armour'||id==='factory_strike'){
        c.state.inventory.laser5=1;c.state.weaponLoadout='laser5';c.launchDevTemplateTest(id,(T[id].allowedFactions||['trade'])[0]);invulnerable=true;
        const r=flyGround(id==='factory_strike'?'factory_assault':'dune_assault');if(!r.started)return 'the armour field never started';pilotNotes.push(`${id.split('_')[0]} ${r.units} units ${r.secs}s`);
        if(!r.done)return `${r.left} of ${r.units} units still standing after ${r.secs} s`;return
      }
      if(id==='lattice_survey'){
        const tries=[];
        for(let k=0;k<4;k++){reset();c.launchDevTemplateTest(id,'helix');invulnerable=true;const r=flyLattice(1);tries.push(r);if(!r.started)return 'the lattice never appeared';if(r.quiet){pilotNotes.push(`lattice ${r.secs}s`);
          if(r.secs<20)return `all three shells took only ${r.secs} s`;return}}
        return `the pilot woke it ${tries.length} times of ${tries.length} (${tries.map(r=>r.at||'timed out').join(', ')})`
      }
      c.launchDevTemplateTest(id,(T[id].allowedFactions||['trade'])[0]);invulnerable=true;
      if(!toStage('surface_destination_approach'))return 'never reached the land approach';
      const r=flyApproach();pilotNotes.push(`${id.split('_')[0]} ${r.secs}s`);
      if(!r.points)return 'no markers were placed';
      if(!r.done)return `not finished after ${r.secs} s, ${r.left} of ${r.points} markers left`
    });
    {const r=results[results.length-1];if(r?.name==='pilots'&&pilotNotes.length){r.summary+=`  (${pilotNotes.join(', ')})`;paint()}}

    await group('simulator',['tutorial'],()=>{const m=c.tutorialMission();c.pendingMission=m;c.launchMission(m.id);if(!c.currentMission)return 'did not launch';invulnerable=true;const seen=new Set();
      for(let s=0;s<30&&c.currentMission;s++){const idx=c.currentStageIndex;seen.add(c.currentStage?.()?.type);for(let f=0;f<150&&c.currentMission&&c.currentStageIndex===idx;f++){update(1/30);if(f%50===0)render(performance.now())}if(c.currentMission&&c.currentStageIndex===idx)scenarioFlow.completeCurrentStage?.()}
      if(!seen.has('tutorial_final_run'))return 'never reached the final run'});

    // Draw every enemy and every world directly: the stepped missions above only draw what
    // happens to be in front of the camera.
    await group('drawing',['ghost lance','ghost jammer','xenos','walkers','plains worlds','moon plains'],what=>{
      if(what.startsWith('ghost')){
        const m=c.makeDevTemplatePreview('fighters','security'),fm=m.modules.find(x=>x.type==='fighters');fm.profile='ghost';fm.target=6;
        c.launchDevTemplateTest('fighters','security',{mission:m});invulnerable=true;for(let i=0;i<200&&!fighters.length;i++)update(1/30);for(let i=0;i<40;i++)update(1/30);
        const f=fighters.find(x=>x.ghost===(what==='ghost lance'?'lance':'jammer'));if(!f)return 'none spawned';
        const w=cameraPointToWorld([0,0,20]);f.x=w[0];f.y=w[1];f.z=w[2];f.t=Math.max(0,f.t);
        for(const st of['scattered','gathering','formed']){f.g.state=st;f.g.t=.4;f.g.dur=1;if(st==='gathering')for(const fr of f.g.frags)fr.from=fr.off.slice();AgentXGhosts.draw(f);AgentXGhosts.step(f,1/30)}
        AgentXGhosts.scatter(f);AgentXGhosts.step(f,1/30);AgentXGhosts.draw(f);AgentXGhosts.drawOverlay();render(performance.now())
      }
      if(what==='xenos'){
        c.launchDevTemplateTest('fighters','security');invulnerable=true;for(let i=0;i<60;i++)update(1/30);
        const w=cameraPointToWorld([0,0,18]);
        for(const k of Object.keys(AgentXSpaceBugs.meshes)){const mesh=AgentXSpaceBugs.meshes[k];drawAgentXSpaceBug({x:w[0],y:w[1],z:w[2],s:1.6,rot:[0,.4,0],mesh,bugKind:k,bugAnimPhase:1},C.y)}
      }
      if(what==='walkers'){
        c.launchDevTemplateTest('dune_armour_clearance','security');invulnerable=true;
        for(let i=0;i<30&&!(c.currentStage?.()?.type==='dune_assault'&&phase==='surface');i++){scenarioFlow.completeCurrentStage?.();for(let k=0;k<40;k++)update(1/30)}
        if(!groundAssault.active)return 'the dune assault never started';for(let k=0;k<60;k++)update(1/30);
        const kinds=new Set();for(const u of groundAssault.units){if(u.dead)continue;groundAssault.drawUnit(u);kinds.add(u.kind)}
        if(kinds.size<4)return `only ${kinds.size} kinds of unit present`;render(performance.now())
      }
      if(what==='plains worlds'||what==='moon plains'){
        c.launchDevTemplateTest('groundside_pickup','trade');invulnerable=true;
        for(let i=0;i<30&&!(c.currentStage?.()?.type==='surface_destination_approach'&&surfaceDestination.active);i++){scenarioFlow.completeCurrentStage?.();for(let k=0;k<40;k++)update(1/30)}
        const sd=surfaceDestination;if(!sd.active)return 'the plains approach never started';const mission=c.currentMission,kinds=[];
        const moon=what==='moon plains';if(moon){planetLandingBody='moon';planetLandingMoonIndex=0;if(!planetMoons?.length)planetMoons=[{col:C.g,radiusFactor:.2,axisOffset:0,spin0:0,spinSpeed:.05,craters:[]}]}
        for(const[col,volc]of[[C.g,false],[C.u,false],[C.c,false],[C.m,false],[C.y,false],[C.o,false],[C.o,true]]){
          if(moon)planetMoons[0].col=col;else planetLandingColour=col;mission.volcanicWorld=volc;
          sd.buildScenery();sd.buildFissures();sd.buildTraffic();sd.buildFlocks();sd.forceWeather=true;for(let i=0;i<8&&!sd.weather;i++)sd.chooseWeather();
          for(let k=0;k<6;k++)update(1/30);sd.draw();kinds.push(sd.worldKind);
          // every feature with an effect is drawn once, wherever it stands
          for(const t of sd.trees){const z=t.worldZ-travel;if(t.smoke)sd.drawConeSmoke(t,z);if(t.vent)sd.drawVentFountain(t,z);if(t.geyser)sd.drawGeyser(t,z);if(t.feature==='crystal')sd.drawGlint(t,z,50)}
          sd.drawFissures();sd.drawFlocks();sd.drawRoad();sd.drawWeather();
          // v1820: a spire's star must blink (about an eighth of the time), not stay lit.
          if(col===C.m&&!moon){
            const sp=sd.trees.filter(t=>{if(t.feature!=='crystal')return false;const z=t.worldZ-travel,q=camPoint([t.x,t.y+3.2*t.s*(t.my||1),z]);return q[2]>1&&projectCam(q)}).slice(0,10);
            if(sp.length){let on=0,all=0;const np=sd.navPulse;ctx.stroke=()=>{on++};
              try{for(let k=0;k<40;k++){sd.navPulse=k*.23;for(const t of sp){all++;sd.drawGlint(t,t.worldZ-travel,50)}}}finally{delete ctx.stroke;sd.navPulse=np}
              if(!on)return 'crystal spires never glint';if(on>all*.3)return `crystal spires glint ${Math.round(on/all*100)}% of the time (should be about 12%)`}
          }
        }
        if(new Set(kinds).size<6)return `only ${new Set(kinds).size} world kinds built (${[...new Set(kinds)].join(', ')})`;
        if(moon&&!sd.trees.some(t=>t.feature==='crater'))return 'no craters on a moon';
        planetLandingBody='planet'
      }
    });

    // Real campaign flows on the throwaway save: nothing here is a DEV test.
    const finishReal=m=>{c.launchMission(m.id);if(c.currentMission!==m)return 'did not launch';invulnerable=true;fly();for(let f=0;f<3000&&!c.isOpen();f++)update(1/30);return c.isOpen()?null:`never reached the debrief (${mode}/${phase})`};
    const closeHub=()=>{try{c.closeMissionDebrief?.('missions')}catch(_){}paused=false;document.body.classList.remove('paused')};
    await group('campaign',['finish a real job','level up on the debrief','abandon a job','lose the drone','buy and fit gear','spend a skill point','save and reload','every mail reads','every hub panel draws','request new contracts','a woken lattice survey pays less'],what=>{
      // (reset() above cleared any mission; these use the real board.)
      if(c.isOpen())closeHub();
      if(what==='finish a real job'||what==='level up on the debrief'){
        c.state.xp=what==='level up on the debrief'?c.xpForLevel(c.levelForXP()+1)-40:c.xpForLevel(4)+10;c.generateContractBoard();
        const m=c.missions.find(x=>x.implemented&&!x.private);if(!m)return 'no job on the board';
        const before={xp:c.state.xp,money:c.state.money,done:c.state.completed,level:c.levelForXP(),mail:c.state.mail.length},pay=m.pay,xp=m.xp,id=m.id;
        const f=finishReal(m);if(f)return f;
        if(c.state.completed!==before.done+1)return 'the job was not counted as completed';
        if(c.state.xp<before.xp+xp)return `XP went from ${before.xp} to ${c.state.xp}, the contract was worth ${xp}`;
        if(c.state.money<before.money+pay*.5)return `credits went from ${before.money} to ${c.state.money}, pay was ${pay}`;
        if(c.missions.some(x=>x.id===id))return 'the finished job is still on the board';
        if(c.state.mail.length<=before.mail)return 'no completion mail arrived';
        const rows=[...document.querySelectorAll('.debriefRow')];if(!rows.some(r=>/Next level/.test(r.textContent)))return 'the debrief has no next-level line';
        if(what==='level up on the debrief'){if(c.levelForXP()<=before.level)return 'the level did not rise';if(!document.querySelector('.debriefLevelUp'))return 'the debrief has no LEVEL UP row'}
        closeHub()
      }
      if(what==='abandon a job'){
        c.generateContractBoard();const m=c.missions.find(x=>x.implemented&&!x.private),xp0=c.state.xp;c.launchMission(m.id);for(let k=0;k<60;k++)update(1/30);
        if(!c.abandonCurrentMission('Self-test abandon'))return 'abandon refused';if(c.currentMission)return 'still in a mission';if(c.state.xp!==xp0)return 'XP changed on an abandoned job';closeHub()
      }
      if(what==='lose the drone'){
        c.generateContractBoard();const m=c.missions.find(x=>x.implemented&&!x.private),failed0=c.state.failed;c.launchMission(m.id);for(let k=0;k<60;k++)update(1/30);
        if(!c.failCurrentMission('Drone destroyed'))return 'the failure was refused';if(c.state.failed!==failed0+1)return 'the failure was not counted';
        if(!c.state.pendingInsurance)return 'no insurance claim was opened';if(!/Insurance/.test(document.querySelector('#debriefBox,.debriefBox,[data-panel="debrief"]')?.textContent||''))return 'the insurance screen did not show';
        // v1870: with insured gear fitted, each claim must be paid or declined before Return
        // unlocks. Decline them all (that path costs nothing), then leave.
        for(let k=0;k<12;k++){const d=[...document.querySelectorAll('[data-panel="debrief"] button')].find(b=>/decline/i.test(b.textContent)&&!b.disabled);if(!d)break;d.click()}
        const btn=[...document.querySelectorAll('[data-panel="debrief"] button')].find(b=>/continue|return/i.test(b.textContent)&&!b.disabled);if(!btn)return 'no way to leave the insurance screen';btn.click();
        if(c.state.pendingInsurance)return 'the insurance claim did not close';closeHub()
      }
      if(what==='buy and fit gear'){
        c.state.money=60000;const item=Object.values(c.items).find(i=>i.slot==='consumable'&&!i.free&&c.productAccess(i).ok);if(!item)return 'nothing on sale';
        const m0=c.state.money,have0=c.state.inventory[item.id]||0;if(!c.buyItem(item.id,1))return `could not buy ${item.name}`;
        if(c.state.money>=m0)return 'buying cost nothing';if((c.state.inventory[item.id]||0)<=have0)return 'nothing arrived in stores';
        if(!c.equipItem(item.id,0))return `could not fit ${item.name}`
      }
      if(what==='spend a skill point'){
        c.state.xp=Math.max(c.state.xp,c.xpForLevel(5));const card=c.skillCards.find(k=>c.skillCanBuy(k.id));if(!card)return 'no skill can be bought at level 5';
        const n0=c.state.skills.length;if(!c.purchaseSkill(card.id))return 'the purchase was refused';if(c.state.skills.length!==n0+1)return 'the skill was not recorded'
      }
      if(what==='save and reload'){
        c.save();const raw=localStorage.getItem(c.storageKey);if(!raw)return 'nothing was saved';if(raw.length>900000)return `the save is ${Math.round(raw.length/1024)} KB`;
        const loaded=c.load();for(const k of['xp','money','completed','failed'])if(loaded[k]!==c.state[k])return `${k} changed across a save and load`;
        if(loaded.skills.length!==c.state.skills.length)return 'skills changed across a save and load';if(/_comet|_convoy|"g":\{"state"/.test(raw))return 'runtime state leaked into the save'
      }
      if(what==='every mail reads')for(const msg of c.state.mail){const r=c.resolveMail(msg);if(!r?.subject||!String(r.subject).trim())return `mail ${msg.id} has no subject`;if(!Array.isArray(r.body)||!r.body.join('').trim())return `mail ${msg.id} has no text`}
      if(what==='every hub panel draws'){c.showHub('missions');for(const pnl of['missions','factions','mail','shop','workshop','perks','guide','options']){c.setPanel(pnl);c.render()}closeHub()}
      // v1830: a real Lattice Survey flown both ways. Quiet must be worth more than waking
      // it and shooting it down (it used to be the other way round, because of bounties).
      if(what==='a woken lattice survey pays less'){
        const rd=routeDiversion,start=()=>{reset();c.state.xp=c.xpForLevel(12);c.state.inventory.laser5=1;c.state.weaponLoadout='laser5';
          const m=c.makeTemplateContract(c.missionTemplate('lattice_survey'),0,{faction:'helix'});if(!m)return null;c.missions.push(m);c.launchMission(m.id);if(c.currentMission!==m)return null;invulnerable=true;
          for(let i=0;i<900&&rd.state!=='lattice';i++)update(1/30);return rd.state==='lattice'?m:null};
        const gains=(m,m0,x0)=>{for(let f=0;f<4000&&!c.isOpen();f++)update(1/30);const g={cr:(c.state.money-m0)/m.pay,xp:(c.state.xp-x0)/m.xp,open:c.isOpen()};closeHub();return g};
        let quiet=null;
        for(let k=0;k<5&&!quiet;k++){const m=start();if(!m)return 'a real survey did not start';const m0=c.state.money,x0=c.state.xp,r=flyLattice(1);if(r.quiet)quiet=gains(m,m0,x0);else{c.abandonCurrentMission('Self-test');closeHub()}}
        if(!quiet)return 'the pilot could not finish a survey quietly in five tries';
        const m=start();if(!m)return 'the second survey did not start';const m0=c.state.money,x0=c.state.xp;
        rd.wakeLattice('SELF-TEST');for(let f=0;f<300*30&&c.currentMission&&!exiting();f++){fightStep(.9);update(1/30)}ceaseFire();
        if(c.currentMission&&!exiting())return 'the woken lattice was not cleared in 300 s';
        const woken=gains(m,m0,x0);
        if(!quiet.open||!woken.open)return 'no debrief';
        if(woken.cr>=quiet.cr)return `waking it paid ${woken.cr.toFixed(2)}x the fee, quiet paid ${quiet.cr.toFixed(2)}x`;
        if(woken.xp>=quiet.xp)return `waking it gave ${woken.xp.toFixed(2)}x the XP, quiet gave ${quiet.xp.toFixed(2)}x`
      }
      if(what==='request new contracts'){c.state.money=60000;const ids=c.missions.map(m=>m.id).join();c.refreshContracts();if(c.missions.map(m=>m.id).join()===ids)return 'the board did not change';if(c.missions.length<4)return 'the board is nearly empty'}
    });

    // Every template, every client: build the contract, then read the card and each letter it
    // can send (done, failed, abandoned, personal follow-up) for unfilled or broken text.
    await group('letters',Object.keys(T),id=>{
      const t=T[id],bad=[],check=(what,text)=>{const s=Array.isArray(text)?text.join(' '):String(text??'');if(!s.trim())bad.push(`${what} is empty`);else if(/\{[a-zA-Z]+\}|undefined|NaN|\[object/.test(s))bad.push(`${what}: "${(s.match(/.{0,24}(\{[a-zA-Z]+\}|undefined|NaN|\[object).{0,20}/)||[s.slice(0,50)])[0]}"`)};
      for(const fac of t.allowedFactions||[]){
        const m=c.makeTemplateContract(t,0,{faction:fac,noRouteEncounter:true});if(!m){bad.push(`${fac}: no contract built`);continue}
        check(`${fac} title`,m.title);check(`${fac} description`,m.description);check(`${fac} card`,(c.worldHtml(m)||'ok')+' '+m.stages.join(' '));
        if(!m.stages.length)bad.push(`${fac}: the route list is empty`);
        const before=c.state.mail.length;c.queueContractMail(m,3);c.queueContractFailureMail(m,'failed','Drone destroyed');c.queueContractFailureMail(m,'abandoned','Contract abandoned');
        for(const msg of c.state.mail.slice(before)){const r=c.resolveMail(msg);check(`${fac} mail ${String(msg.id).split('_')[0]} subject`,r.subject);check(`${fac} mail ${String(msg.id).split('_')[0]}`,r.body)}
        if(c.state.mail.length<before+3)bad.push(`${fac}: only ${c.state.mail.length-before} of 3 letters were sent`);
        c.state.mail.length=before
      }
      if(bad.length)return bad.slice(0,4).join(' | ')+(bad.length>4?` (+${bad.length-4} more)`:'')
    });

    await group('data',['achievements','codex','wire','letters','written text','hull follows risk'],what=>{
      // v1810: every board job's fight uses the risk hull band the card promises.
      if(what==='hull follows risk'){
        const xp0=c.state.xp;c.state.xp=c.xpForLevel(20);const bad=new Set();
        for(const id in T)for(let i=0;i<12;i++){const m=c.makeDevTemplatePreview(id,(T[id].allowedFactions||['trade'])[0]);if(!m||m.risk<3)continue;
          for(const x of m.modules||[])if(x.type!=='route_diversion'&&Number(x.target)>0&&Number.isFinite(Number(x.fighterHp))&&Number(x.fighterHp)<12*c.contractToughnessScale(m.risk)-.5)bad.add(`${id} ${x.type} hull ${x.fighterHp} at risk ${m.risk}`)}
        c.state.xp=xp0;if(bad.size)return [...bad].slice(0,5).join(' | ')
      }
      const st=c.stats(),ctx={flags:c.state.mailFlags||{},seen:c.state.seenProfiles||{},stats:st,byFaction:st.contracts?.byFaction||{},bt:st.contracts?.byTemplate||{},state:c.state,level:c.levelForXP()};
      if(what==='achievements'){const d=c.achievementDefs();if(d.some(a=>!a.id||!a.name||typeof a.goal!=='number'||Number.isNaN(Number(a.v))))return 'a malformed achievement';if(new Set(d.map(a=>a.id)).size!==d.length)return 'duplicate achievement id'}
      if(what==='codex')for(const e of AgentXCodex.ENTRIES)e.unlocked(ctx);
      if(what==='wire')for(const h of AgentXVoxWire.HEADLINES)if(h.when)h.when(ctx);
      if(what==='letters'){for(const r of AgentXFactionLore.REACTIONS||[])r.when(ctx);for(const f of Object.values(AgentXFactionLore.LETTERS))for(const l of f)if(!l.subject||!l.body?.length)return 'a letter with no text'}
      if(what==='written text'){
        const bad=[],walk=(v,path)=>{if(typeof v==='string'){if(v.length>24&&/[a-z];\s+[a-zA-Z]|[—–]/.test(v)&&!/[{}=<>]/.test(v))bad.push(`${path}: "${v.slice(0,60)}"`)}else if(Array.isArray(v))v.forEach((x,i)=>walk(x,path))
          else if(v&&typeof v==='object')for(const k in v)if(typeof v[k]!=='function')walk(v[k],path)};
        for(const id in T)walk(T[id].presentation,`template ${id}`);
        walk(AgentXCodex.ENTRIES.map(e=>[e.title,e.body]),'codex');walk(AgentXVoxWire.HEADLINES.map(h=>h.text),'wire');walk(AgentXFactionLore.LETTERS,'letters');walk(AgentXContactNotes.NOTES,'contact notes');walk(AgentXContactNotes.JOBS,'job notes');walk((AgentXFactionLore.REACTIONS||[]).map(r=>r.letter),'reactions');
        walk(Object.values(routeDiversion.KINDS),'diversions');walk(AgentXEndgame.MISSIONS.map(m=>[m.title,m.description,m.stages]),'black contracts');
        if(bad.length)return bad.slice(0,6).join(' | ')+(bad.length>6?` (+${bad.length-6} more)`:'')}
    });

    reset();const ok=results.every(r=>r.ok),secs=((performance.now()-T0)/1000).toFixed(0);
    results.push({name:'TOTAL',ok,summary:`${ok?'ALL PASSED':'FAILURES ABOVE'} in ${secs} s. The real campaign save was not touched.`,details:[]});paint('finished');
    try{localStorage.removeItem(c.storageKey)}catch(_){}
    window.__selftest={ok,results,seconds:Number(secs)}
  }
  // BALANCE BOT (v1800). A simple pilot that plays a fight for real: it tracks the nearest
  // solid target with limited hand speed and a little wobble, fires in bursts when on
  // target, and takes real damage (it never dodges or shoots down incoming fire, so the
  // damage it takes overstates a player's: compare enemy types with it, do not read the
  // numbers as absolute). From the console on the ?selftest page:
  //   __botFight('ghost',{target:6,risk:1,skill:.75})   one fight
  //   await __balance()                                   every enemy type, eight fights each
  window.__botFight=function(profile,{target=6,risk=1,maxSecs=240,skill=1}={}){
    const c=campaign;reset();
    const m=c.makeDevTemplatePreview('fighters','security'),fm=m.modules.find(x=>x.type==='fighters');fm.profile=profile;fm.target=target;m.risk=risk;
    c.launchDevTemplateTest('fighters','security',{mission:m});invulnerable=false;
    for(let i=0;i<300&&!fighters.length;i++)update(1/30);
    const stat={profile,target,kills:0,secs:0,hits:0,minShield:shield,died:false,bursts:0,frames:0};let lastShield=shield,trig=0;const dt=1/30;
    for(let f=0;f<maxSecs*30;f++){
      if(mode==='dead'){stat.died=true;break}
      if(!c.currentMission||c.currentStage?.()?.type!=='fighters'||mode!=='play')break;
      let best=null,bd=1e9,any=null,ad=1e9;
      for(const x of fighters){if(x.dead||x.dying||x.t<0)continue;const q=camPoint([x.x,x.y,x.z]),d=Math.hypot(q[0],q[1],q[2]);if(d<ad){ad=d;any={x,q}}if(x.ghost&&!AgentXGhosts.solid(x))continue;if(q[2]>2&&d<bd){bd=d;best={x,q}}}
      let tx=0,ty=0,on=false;
      if(best){const p=projectCam(best.q);if(p){tx=clamp((p.x-W*.5)/(W*.5-22),-1,1);ty=clamp((p.y-viewH*.48)/(viewH*.46-18),-1,1);const a=aimScreen();on=Math.hypot(a.x-p.x,a.y-p.y)<Math.max(14*W/1280,best.x.s*p.k*.8)}}
      else if(any){const q=any.q;tx=clamp(q[0]/(Math.abs(q[2])+8)*2+(q[2]<0?Math.sign(q[0]||1):0),-1,1);ty=clamp(-q[1]/(Math.abs(q[2])+8)*2,-1,1)}
      const rate=2.6*skill*dt,wob=.035/skill;
      inputX=clamp(inputX+clamp(tx-inputX,-rate,rate)+(Math.random()-.5)*wob,-1,1);inputY=clamp(inputY+clamp(ty-inputY,-rate,rate)+(Math.random()-.5)*wob,-1,1);
      if(on&&!fireHeld){fireHeld=true;beginLaserBurst();stat.bursts++}
      if(fireHeld&&(++trig>10||!on)){fireHeld=false;endLaserTrigger();trig=0}
      update(dt);stat.frames++;
      if(shield<lastShield)stat.hits+=lastShield-shield;lastShield=shield;if(shield<stat.minShield)stat.minShield=shield;
      stat.kills=interceptorsDestroyed
    }
    stat.secs=Math.round(stat.frames/30);stat.cleared=stat.kills>=target;fireHeld=false;try{endLaserTrigger()}catch(_){}
    invulnerable=true;return stat
  };
  window.__balance=async function({runs=8,target=6,risk=1,skill=.75,profiles=['pirate','rogue','hostile','hijacked','xeno','ghost']}={}){
    const table={};
    for(const p of profiles){const rs=[];for(let i=0;i<runs;i++){rs.push(window.__botFight(p,{target,risk,skill}));await pause()}
      const ok=rs.filter(r=>r.cleared),avg=(a,k)=>a.length?+(a.reduce((n,r)=>n+r[k],0)/a.length).toFixed(1):null;
      table[p]={secondsToClear:avg(ok,'secs'),hitsTaken:avg(rs,'hits'),cleared:`${ok.length}/${runs}`,lost:rs.filter(r=>r.died).length}}
    console.table(table);return table
  };
  // Rerun from the console with __selftestRun() (the report starts again).
  window.__selftestRun=()=>{results.length=0;errs.length=0;window.__selftest=null;return main()};
  // Fresh boots first. A start-up fault can depend on what the first contract board rolls
  // (v1610's crash showed on about six boots in ten), so the page boots a fresh save five
  // times before the main run. A dead boot is reported at once.
  const BOOTS=5;
  window.addEventListener('load',()=>setTimeout(()=>{
    let alive=false,why='';try{alive=!!(campaign&&campaign.state&&campaign.missions.length)}catch(e){why=e.message}
    const n=Number(sessionStorage.getItem('selftestBoots')||0)+1;
    if(!alive){sessionStorage.removeItem('selftestBoots');document.body.appendChild(box);
      results.push({name:'boot',ok:false,summary:`the game failed to start on a fresh save (boot ${n} of ${BOOTS})`,details:[why,...errs].filter(Boolean)});paint('failed');window.__selftest={ok:false,results};return}
    if(n<BOOTS){sessionStorage.setItem('selftestBoots',String(n));document.body.appendChild(box);paint(`fresh boot ${n} of ${BOOTS} ok`);setTimeout(()=>location.reload(),150);return}
    sessionStorage.removeItem('selftestBoots');
    main().catch(e=>{results.push({name:'CRASH',ok:false,summary:e.message,details:[String(e.stack||'').split(String.fromCharCode(10))[1]||'']});paint('crashed');window.__selftest={ok:false,results}})
  },900));
})();
