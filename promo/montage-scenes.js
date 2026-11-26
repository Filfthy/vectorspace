'use strict';
// The release montage: action only, the game's own HUD on, cut to Verdi's Dies irae.
// Every shot is a real job launched in the game, taken to the right stage, flown for a few
// seconds by a pilot before the cut (so it opens mid-action), then flown on camera. Loud cuts
// land on the drum strokes of the tutti; the hush from 1:19 gets fewer, longer, tenser shots.
// Open with ?promo=montage&play (live) or render with PromoDirector.renderRange.
(()=>{
const D=globalThis.PromoDirector;if(!D||!PROMO_SONG.montage)return;
D.drawTitles=()=>{};

// ---------- Resetting between shots ----------
const realLanding=window.landingWorldColour,realComplete=scenarioFlow.completeCurrentStage.bind(scenarioFlow);
function resetGame(){
  scenarioFlow.completeCurrentStage=realComplete;window.landingWorldColour=realLanding;
  try{if(campaign.currentMission)campaign.currentMission=null;campaign.pendingMission=null;campaign.currentStageIndex=0}catch(_){}
  for(const k of['forest','surfaceDestination','groundAssault','asteroidField','stationDelivery','stationHack','xenoNest','tacoBeaconDelivery','routeDiversion','courier','carrierIntercept','asteroidWreckRun','salvageRecovery'])
    try{const o=globalThis[k]??eval(k);(o?.reset||o?.stop||o?.stopForJump)?.call(o)}catch(_){}
  for(const a of[fighters,asteroids,groundTargets,bolts,hazards,shots,playerMissiles,sparks,fragments])try{a.length=0}catch(_){}
  try{fireHeld=false;endLaserTrigger()}catch(_){}
  inputX=inputY=aimX=aimY=0;paused=false;document.body.classList.remove('paused');if(campaign.isOpen())campaign.hideHub();invulnerable=true
}
// Launch a board job as a dev test with its modules edited, then run to the wanted stage.
function launch(id,faction,{stage,edit,world,weapon='laser1',risk=4}={}){
  resetGame();
  if(world)window.landingWorldColour=()=>world;
  const m=campaign.makeDevTemplatePreview(id,faction);if(!m)throw new Error('no template '+id);
  m.routeEncounter=null;m.risk=risk;m.modules=m.modules.filter(x=>x.type!=='template_encounter'&&!x.routeEncounter);edit?.(m);m.stages=m.modules.map(x=>x.label);
  campaign.launchDevTemplateTest(id,faction,{mission:m});
  campaign.activeWeapon=weapon;paused=false;document.body.classList.remove('paused');invulnerable=true;
  for(let i=0;i<600&&(mode==='missionTransit'||mode==='briefing');i++)update(1/30);
  if(stage)for(let k=0;k<30&&campaign.currentMission&&campaign.currentStage()?.type!==stage;k++){
    for(let i=0;i<20;i++)update(1/30);
    if(campaign.currentStage()?.type!==stage)realComplete()}
  for(let i=0;i<400&&(mode==='missionTransit'||mode==='briefing');i++)update(1/30);
  campaign.activeWeapon=weapon
}
// Fly a few seconds with the shot's pilot before the cut, then hold the stage where it is:
// no job finishes or moves on while it is on camera.
function warm(shot,secs){const n=Math.round(secs*30);for(let i=0;i<n;i++){if(i%4===0||i>n-4)D.readHud?.();shot.pilot?.(1/30);update(1/30)}scenarioFlow.completeCurrentStage=()=>{};shot.stage?.()}

// ---------- Staging: bring the action in front of the camera at the cut ----------
const SPOTS=[[-2,.5,20],[4,-1.5,27],[-1,2.5,34],[-7,-2,42],[8,2,50]];
function stageFighters(n=3,hp=7){
  const live=fighters.filter(f=>!f.dead&&!f.dying&&!(f.t<0)&&!f.ghost);let k=0;
  for(const f of live){if(k>=n)break;const w=cameraPointToWorld(SPOTS[k]);f.x=w[0];f.y=w[1];f.z=w[2];if(hp)f.hp=Math.min(f.hp,hp);k++}
  return k
}
function stageRocks(n=6){
  const live=asteroids.filter(a=>a&&!a.dead&&!a.dying).sort((a,b)=>camPoint([a.x,a.y,a.z])[2]-camPoint([b.x,b.y,b.z])[2]);
  const spots=[[-6,1,20],[7,-2,26],[0,4,32],[-11,-3,38],[12,3,44],[3,-5,52]];
  live.slice(0,n).forEach((a,i)=>{const w=cameraPointToWorld(spots[i]);a.x=w[0];a.y=w[1];a.z=w[2];for(const k of['wx','wy','wz'])if(k in a)a[k]=w['xyz'.indexOf(k[1])]})
}
// Armour: put the drone 40 to 55 units from the nearest live unit, facing it.
function stageGround(dist=32){
  const G=groundAssault,live=G.units.filter(u=>!u.dead&&u.state==='alive');if(!live.length)return;
  let u=live[0],bd=1e9;for(const x of live){const d=G.planarToShip(x);if(d<bd){bd=d;u=x}}
  const h=Math.atan2(u.x-shipX,u.wz-travel);shipX=u.x-Math.sin(h)*dist;travel=u.wz-Math.cos(h)*dist;viewYaw=h;G.lastTravel=travel;gT=u
}
// A station job: the station hangs ahead and to one side, the attackers between it and us.
function stageStation(at=[24,-3,200]){const w=cameraPointToWorld(at);stationDelivery.station={x:w[0],y:w[1],z:w[2]};stageFighters()}
// Shield pylons on a deep-core surface: line up on the nearest one ahead.
function stagePylons(dist=60){
  const P=groundTargets.filter(g=>g.doorPylon&&!g.dead&&!g.capDead);if(!P.length)return;
  let g=P[0],bd=1e9;for(const x of P){const d=Math.abs(x.worldZ-travel-dist)+Math.abs(x.x-shipX)*.5;if(d<bd){bd=d;g=x}}
  travel=g.worldZ-dist;shipX=g.x;inputX=inputY=0;viewRoll=0
}

// ---------- Pilots ----------
// One pilot for every shot, playing the way a player does (rules from the self-test job
// pilot): shoot down incoming projectiles first, then fight the hostiles in front. Rocks
// only on a clearance job's marked targets, pylon tops on a deep-core surface, walkers on an
// armour field. Never shoot mines: steer round them. Hold fire sneaking into a xeno nest.
// Thread the dark gaps of customs rings. With nothing to shoot, steer for the nav marker the
// HUD is showing (it reads the HUD, so it knows only what a player sees).
let trigT=0,wt=0,frameNo=0;const hud={mark:null,edge:null};
{const d0=window.drawHudMarkerLabel,e0=window.hudEdgeCue;
  if(d0)window.drawHudMarkerLabel=function(text,x,y,...r){hud.mark={x,y,f:frameNo};return d0.call(this,text,x,y,...r)};
  if(e0)window.hudEdgeCue=function(q,...r){const v=e0.call(this,q,...r);hud.edge={x:v.x,y:v.y,f:frameNo};return v}}
D.readHud=()=>{frameNo++;try{last=1e6+D.gclock*1000;render(last)}catch(_){}};   // used while warming up, when nothing is drawn
function steer(tx,ty,dt,rate=2.6){const r=rate*(dt||1/30);inputX=clamp(inputX+clamp(tx-inputX,-r,r),-1,1);inputY=clamp(inputY+clamp(ty-inputY,-r,r),-1,1)}
function trigger(on){if(on&&!fireHeld){fireHeld=true;beginLaserBurst()}if(fireHeld&&(++trigT>10||!on)){fireHeld=false;endLaserTrigger();trigT=0}}
const toScreen=([x,y,z])=>{const q=camPoint([x,y,z]);return q[2]>.2?projectCam(q):{x:q[0]<0?-W:2*W,y:viewH*.48}};
// Bring the gunsight (not the screen centre: it swings off centre in a bank) onto p.
function aimAt(p,radius,dt){
  const a=aimScreen();
  steer(clamp((p.x-a.x)/(W*.11),-1,1),clamp((p.y-a.y)/(viewH*.11),-1,1),dt,3.4);
  // Fire when the sight is close, as a player does: some shots land, some just miss.
  trigger(Math.hypot(a.x-p.x,a.y-p.y)<Math.max(radius*1.5,30*W/1280))
}
const nestQuiet=()=>xenoNest?.active&&(xenoNest.state==='approach'||xenoNest.state==='observationRun');
// Incoming projectiles: the nearest one heading in, if the sight can get to it.
function shootBolts(dt){
  let best=null,bs=-1e9;
  for(const b of bolts){if(b.dead)continue;const p=boltScreenPoint(b);if(!p)continue;
    const off=Math.hypot(p.x-W*.5,p.y-viewH*.48);if(off>W*.42)continue;const r=boltVisualRadius(b,p),sc=r*3-off*.4;if(sc>bs){bs=sc;best={p,r}}}
  if(!best)return false;
  aimAt(best.p,clamp(best.r*.9+12,34,82)*(campaign.boltToleranceMultiplier?.()||1)*.9,dt);return true
}
function hostiles(){
  if(nestQuiet())return[];
  if(xenoNest?.active&&xenoNest.state==='coreChamber'&&xenoNest.objective&&!xenoNest.objective.dead)return[xenoNest.objective];
  const pool=fighters.filter(x=>!x.dead&&!x.dying&&!(x.t<0)&&!(x.ghost&&!AgentXGhosts.solid(x)));
  if(pool.length)return pool;
  const st=campaign.currentStage?.()?.type;
  if(phase==='asteroids'&&st==='asteroids'&&asteroidField.active&&!asteroidField.courierMode)
    return asteroids.filter(a=>a&&!a.dead&&!a.dying&&(!asteroidField.markedTargets||a.missionTarget===true));
  if(phase==='surface'&&groundTargets.length&&!groundAssault?.active)
    return groundTargets.filter(g=>g.doorPylon&&!g.dead&&!g.capDead&&!g.capDying).map(g=>({x:g.x,y:towerCapY(g),z:g.worldZ-travel,s:g.s||1}));
  if(phase==='trench'||phase==='reactor'||phase==='escape')
    return groundTargets.filter(g=>!g.dead&&!g.dying&&(g.type==='reactor'?g.active:g.type==='wallgun')).map(g=>({x:g.x,y:g.y+(g.yOff||0),z:g.worldZ-travel,s:g.s||1})).filter(o=>o.z>2&&o.z<120);
  // Swamp spitters spit at the drone: shoot the ones on the path ahead.
  if(forest?.active&&forest.spitters)
    return forest.spitters.filter(pl=>!pl.dead&&!pl.dying).map(pl=>forest.swampSpitterHeadWorld(pl)).map(h=>({x:h.x,y:h.y,z:h.z,s:1.4})).filter(o=>o.z>8&&o.z<80);
  return[]
}
function fight(dt){
  const list=hostiles();let best=null,bd=1e9;
  for(const x of list){const q=camPoint([x.x,x.y,x.z]),d=Math.hypot(q[0],q[1],q[2]);if(q[2]>2&&q[2]<180&&d<bd){bd=d;best={x,q}}}
  if(!best){
    // One behind or beside: turn round towards it, as a player checks behind them.
    const any=list[0];if(!any)return false;const q=camPoint([any.x,any.y,any.z]);
    steer(clamp(q[0]/(Math.abs(q[2])+8)*2+(q[2]<0?Math.sign(q[0]||1):0),-1,1),clamp(-q[1]/(Math.abs(q[2])+8)*2,-1,1),dt);trigger(false);return true}
  const pp=projectCam(best.q);if(!pp)return false;
  aimAt(pp,Math.max(16*W/1280,(best.x.s||1)*pp.k*.85),dt);return true
}
// Armour field: a live unit ahead, its knees first, else its hull.
let gT=null;
function ground(dt){
  const G=groundAssault,live=u=>u&&!u.dead&&u.state==='alive';
  if(G.leadIn)return true;
  const err=u=>wrapAngle(Math.atan2(u.x-shipX,u.wz-travel)-viewYaw);
  if(gT&&(!live(gT)||!G.units.includes(gT)||Math.abs(err(gT))>1.3||G.planarToShip(gT)<10))gT=null;
  if(!gT){let bs=1e9;for(const u of G.units){if(!live(u)||(G.variant==='factory'&&G.shielded?.(u)))continue;const d=G.planarToShip(u),e=Math.abs(err(u));const sc=d+90*e+(d<22?120:0);if(sc<bs){bs=sc;gT=u}}}
  const u=gT;if(!u)return false;
  const e=err(u),d=G.planarToShip(u);let pt=null,r=14;
  if(Math.abs(e)<.9&&d<170&&d>6){G.pose?.(u);
    if(u.knees&&u.knees.some(k=>!k.broken)){const i=u.knees.findIndex(k=>!k.broken);pt=proj(G.worldPoint(u,u.poseKnees[i]));if(pt)r=clamp(u.K.legs[i].t*1.25*u.s*pt.k,12,70)}
    else{const sp=u.K.spheres[0];pt=proj(G.worldPoint(u,G.bodyTransform(u)([sp[0],sp[1],sp[2]])));if(pt)r=clamp(sp[3]*u.s*pt.k,13,160)}}
  if(pt&&d<160)aimAt(pt,r*.9,dt);else{steer(clamp(e*2,-1,1),0,dt);trigger(false)}
  return true
}
// Customs rings: through the dark gap between two scanner arms (the self-test steering).
function customs(dt){
  const X=globalThis.AgentXCustomsRun,r=X?.rings.find(o=>!o.done);let tx=0,ty=0;const o=r&&X.rel(r);
  if(o&&-o.along<240){const t=Math.max(0,-o.along)/Math.max(1,OPEN_SPACE_CRUISE),step=6.283/X.arms,g=r.a+r.dir*X.speed*t+step/2;
    const q=camPoint(X.point(r,X.RADIUS*.6,g));tx=clamp(q[0]/6,-1,1);ty=clamp(-q[1]/6,-1,1)}
  steer(tx,ty,dt,3.6);trigger(false)
}
// Where the job wants the drone to go: the HUD marker or edge arrow, else the objective.
function navPoint(){
  const S=surfaceDestination;
  if(phase==='destinationApproach'&&S?.active){const left=S.surveyLeft().sort((a,b)=>a.worldZ-b.worldZ),t=left[0]?{x:left[0].x,z:left[0].worldZ}:{x:S.targetX,z:S.targetWorldZ};return{yaw:wrapAngle(Math.atan2(t.x-shipX,t.z-travel)-viewYaw)}}
  if(xenoNest?.active){if(xenoNest.state==='approach'&&xenoNest.core)return toScreen([xenoNest.core.x,xenoNest.core.y,xenoNest.core.z]);if(xenoNest.state==='observationRun'&&xenoNest.nav)return toScreen([xenoNest.nav.x,xenoNest.nav.y,xenoNest.nav.z])}
  if(stationDelivery?.active){const sd=stationDelivery,pt=sd.state==='padApproach'?sd.padApproachPoint?.():(((sd.state==='approach'||sd.state==='clearedApproach')&&!sd.docking)?sd.navigationTarget?.():null);if(pt)return toScreen(pt)}
  if(courier?.active&&courier.mine&&!courier.docking&&!courier.navLocked)return toScreen(courier.manualNavigationTarget?.()||[courier.mine.x,courier.mine.y,courier.mine.z]);
  if(asteroidWreckRun?.active&&asteroidWreckRun.state==='exitNav'){const g=asteroidWreckRun.gapPoint?.();if(g)return toScreen([g.x,g.y,g.z])}
  if(phase==='surface'&&typeof surfaceBunkerActive!=='undefined'&&surfaceBunkerActive)return toScreen([entryBunkerX,-2.2,entryBunkerZ()]);
  if(hud.mark&&frameNo-hud.mark.f<=3)return hud.mark;
  if(hud.edge&&frameNo-hud.edge.f<=3)return hud.edge;
  return null
}
// Mines: never shot. Any close to the line of flight push the steering away from them.
function avoidMines(){
  let ax=0,ay=0;const mines=[...(stationHack?.active?stationHack.mines||[]:[]),...(routeDiversion?.active?routeDiversion.mines||[]:[]),...(globalThis.AgentXMinelayers?.mines||[])];
  for(const m of mines){if(m.dead||m.dying||m.retired||m.exitScenery)continue;const q=camPoint([m.x,m.y,m.z]);if(q[2]<4||q[2]>70)continue;
    const lat=Math.hypot(q[0],q[1]),clear=(m.s||1)*3+5;if(lat>clear)continue;const w=(1-lat/clear)*(1-q[2]/70)*1.6;ax-=Math.sign(q[0]||1)*w;ay+=Math.sign(q[1]||1)*w*.6}
  return[ax,ay]
}
function navigate(dt){
  wt+=dt||1/30;const k=(D.scene?.seed||1)%17,sway=.14*Math.sin(wt*.9+k)+.07*Math.sin(wt*2.1+k*1.7),bob=.06*Math.sin(wt*.7+k*.5);
  const nav=navPoint(),[ax,ay]=avoidMines();let tx=sway,ty=bob;
  if(nav?.yaw!=null){tx=clamp(nav.yaw*2.2,-1,1)+sway*.5;ty=bob*.5}
  else if(nav){tx=clamp((nav.x-W*.5)/(W*.42),-1,1)+sway*.4;ty=clamp((nav.y-viewH*.48)/(viewH*.42),-1,1)+bob*.4}
  else if(phase==='forest'&&forest?.active){const p=forest.pathAtWorld?.(travel+16);if(p)tx=clamp((p.x-shipX)*.3,-1,1)+sway*.5;ty=bob*.3}
  steer(clamp(tx+ax,-1,1),clamp(ty+ay,-1,1),dt,1.8);trigger(false)
}
function player(dt){
  frameNo++;
  if(routeDiversion?.active&&routeDiversion.state==='customs')return customs(dt);
  if(groundAssault?.active&&ground(dt))return;
  if(!nestQuiet()&&shootBolts(dt))return;
  if(fight(dt))return;
  navigate(dt)
}

// ---------- The shots ----------
// Each: song time it cuts in, a seed, and how it is set up. A shot lasts until the next one.
const fightJob=(profile,{weapon='laser1',target=60,hp=12,risk=5}={})=>({setup(){launch('fighters','security',{stage:'fighters',weapon,risk,edit:m=>{const f=m.modules.find(x=>x.type==='fighters');if(f){f.profile=profile;f.target=target;f.fighterHp=hp;f.encounterChance=1}}})},pilot:player,warm:3.5,stage:()=>stageFighters()});
const SHOTS=[
  // The tutti: the five bass drum strokes, one shot each
  {t:0,    ...fightJob('pirate',{weapon:'jackalsCrown'}),warm:4},
  {t:1.70, setup(){launch('dune_armour_clearance','security',{stage:'dune_assault',world:C.y,weapon:'ripper'})},pilot:player,stage:()=>stageGround(),warm:9},
  {t:2.50, setup(){launch('asteroids','trade',{stage:'asteroids'})},pilot:player,stage:()=>stageRocks(),warm:4},
  {t:3.35, ...fightJob('xeno'),warm:4},
  {t:4.15, setup(){launch('deep_core','security',{stage:'deep_core_surface',world:C.o})},pilot:player,stage:()=>stagePylons(),warm:7},
  {t:4.95, ...fightJob('hijacked',{weapon:'jackalsCrown'}),warm:5},
  {t:8.20, setup(){launch('swamp_relay_delivery','trade',{stage:'forest_corridor'})},pilot:player,warm:6},
  {t:17.24,setup(){launch('ice_field_armour','security',{stage:'dune_assault',world:C.c})},pilot:player,stage:()=>stageGround(),warm:10},
  {t:20.04,setup(){launch('taco_run','quickbite',{stage:'taco_asteroid_delivery'})},pilot:player,stage:()=>stageFighters(),warm:6},
  {t:22.99,...fightJob('ghost'),warm:6},
  {t:29.80,setup(){launch('crystal_consignment','helix',{stage:'surface_destination_approach',world:C.m})},pilot:player,warm:3},
  {t:34.83,setup(){launch('convoy_escort','security',{stage:'route_diversion'})},pilot:player,stage:()=>stageFighters(),warm:9},
  {t:38.48,setup(){launch('station_defence','trade',{stage:'station_defence_recovery',edit:m=>{m.modules[0].relayVariant='hab'}})},pilot:player,stage:()=>stageStation(),warm:5},
  {t:40.73,setup(){launch('customs_run','jackals',{stage:'route_diversion'})},pilot:player,warm:6},
  {t:42.58,...fightJob('rogue',{weapon:'jackalsCrown'}),warm:4},
  {t:46.88,setup(){launch('factory_strike','security',{stage:'factory_assault',world:C.o})},pilot:player,stage:()=>stageGround(),warm:9},
  {t:51.18,setup(){launch('dune_armour_clearance','jackals',{stage:'dune_assault',world:C.y,weapon:'jackalsCrown'})},pilot:player,stage:()=>stageGround(),warm:14},
  {t:54.03,...fightJob('pirate',{weapon:'ripper'}),warm:6},
  {t:57.32,setup(){launch('cargo_spill','trade',{stage:'route_diversion'})},pilot:player,stage:()=>stageFighters(),warm:12},
  {t:59.47,setup(){launch('station_defence','security',{stage:'station_defence_recovery',edit:m=>{m.modules[0].relayVariant='fuel'}})},pilot:player,stage:()=>stageStation(),warm:6},
  {t:62.32,...fightJob('xeno',{weapon:'jackalsCrown'}),warm:5},
  {t:64.77,setup(){launch('asteroids','jackals',{stage:'asteroids'})},pilot:player,stage:()=>stageRocks(),warm:8},
  {t:68.47,...fightJob('hijacked',{weapon:'ripper'}),warm:7},
  {t:71.27,setup(){launch('deep_core','helix',{stage:'deep_core_surface',world:C.c})},pilot:player,stage:()=>stagePylons(),warm:10},
  {t:77.12,...fightJob('ghost',{weapon:'jackalsCrown'}),warm:8},
  // The hush: fewer, longer, tenser shots
  {t:79.60,setup(){launch('secure_terminal_intrusion','security',{stage:'station_minefield_approach'})},pilot:player,warm:4},
  {t:88.50,setup(){launch('nest_clearance','helix',{stage:'xeno_nest'})},pilot:player,warm:22},
  {t:97.00,setup(){launch('lattice_survey','helix',{stage:'route_diversion'})},pilot:player,warm:14},
  {t:105.0,setup(){launch('swamp_relay_delivery','security',{stage:'surface_destination_approach'})},pilot:player,warm:4},
  {t:113.0,setup(){launch('wreck_recovery','trade',{stage:'asteroid_wreck_recovery'})},pilot:player,warm:4},
  {t:121.0,setup(){launch('station_defence','helix',{stage:'station_defence_recovery',edit:m=>{const s=m.modules[0];s.relayVariant='farm'}})},pilot:dt=>{fighters.length=0;bolts.length=0;player(dt)},warm:1,stage:()=>stageStation([-10,-6,120])},
  {t:129.0,setup(){launch('dune_armour_clearance','trade',{stage:'dune_assault',world:C.y})},pilot:player,warm:2,stage:()=>stageGround(40)}
];
SHOTS.forEach((s,i)=>{
  const shot={name:`shot${i+1}`,t0:s.t,seed:9000+i,
    stage(){try{s.stage?.()}catch(e){D.log.push(`${shot.name} staging failed: ${e.message}`)}},
    setup(){try{s.setup();warm(shot,s.warm||3)}catch(e){D.log.push(`${shot.name} setup failed: ${e.message}`)}},
    pilot(dt){s.pilot?.(dt)},
    overlay(t){
      // Fade in from black at the start and out at the end.
      const a=Math.max(clamp(1-(t-0)/1.2,0,1),clamp((t-(PROMO_SONG.end-4))/3.6,0,1));
      if(a>0){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.restore()}
    }};
  D.scenes.push(shot)
});
D.montageShots=SHOTS;
})();
