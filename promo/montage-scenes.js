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
// Top-grade kit on the promo save: the Apex frame, and the best guns in turn (shots that
// name a weapon keep theirs).
const KIT=['laser5','scatter5','rail5','laser4','scatter4','rail4'];
try{const st=campaign.state;if(!st.ownedFrames.includes('AX-5A'))st.ownedFrames.push('AX-5A');st.frameLoadouts['AX-5A']=st.frameLoadouts['AX-5A']||campaign.blankFrameProfile();st.drone='AX-5A';st.xp=Math.max(st.xp||0,campaign.xpForLevel?.(20)||0)}catch(_){}
function launch(id,faction,{stage,edit,world,weapon=null,risk=4,jump=null}={}){
  weapon=weapon||KIT[((D.scene?.seed||9000)-9000)%KIT.length];   // fixed per shot, so every play and render match
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
  if(jump)mission.jumpTo(jump);
  campaign.activeWeapon=weapon
}
// Fly a few seconds with the shot's pilot before the cut, then hold the stage where it is:
// no job finishes or moves on while it is on camera.
function warm(shot,secs){const n=Math.round(secs*30);for(let i=0;i<n;i++){if(i>n-4)D.readHud?.();shot.pilot?.(1/30);update(1/30)}scenarioFlow.completeCurrentStage=()=>{};shot.stage?.();invulnerable=false}

// On camera the drone takes hits for real (the shield bar drops, rebuilds, the low-shield
// warnings come), but a hit never takes the last shield point, so no shot ends in a loss.
{const realDamage=game.damage.bind(game);game.damage=function(msg){if(shield<=1)return;return realDamage(msg)}}

// No ghost jammers in the montage (Dave): their display static reads as a fault in a short
// cut with no context. Every ghost is a lance here; the game itself is unchanged.
{const G=globalThis.AgentXGhosts;if(G){const kf=G.kindFor.bind(G);G.kindFor=function(){const k=kf();return k==='jammer'?'lance':k};G.jammed=()=>false}}

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
  travel=g.worldZ-dist;shipX=g.x+(g.x>0?-5:5);inputX=inputY=0;viewRoll=0   // lined up beside its tower, not on it
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
// Bring the gunsight (not the screen centre: it swings off centre in a bank) onto p. The
// point the pilot steers for glides towards the target rather than jumping, so the sight
// sweeps from target to target the way a hand on a mouse does.
let sp=null,lockKind=null,lockT=0;
function aimAt(p,radius,dt){
  const a=aimScreen(),k=Math.min(1,(dt||1/30)*5);
  sp=sp?{x:sp.x+(p.x-sp.x)*k,y:sp.y+(p.y-sp.y)*k}:{x:a.x,y:a.y};
  // A player rarely holds the stick at full lock: the sight stays within the middle of the
  // screen and moves at a hand's pace.
  steer(clamp(inputX+(sp.x-a.x)/(W*.5),-.7,.7),clamp(inputY+(sp.y-a.y)/(viewH*.5),-.7,.7),dt,1.8);
  // Fire when the sight is close, as a player does: some shots land, some just miss.
  trigger(Math.hypot(a.x-p.x,a.y-p.y)<Math.max(radius*1.5,30*W/1280))
}
const nestQuiet=()=>xenoNest?.active&&(xenoNest.state==='approach'||xenoNest.state==='observationRun');
// Incoming projectiles: the nearest one heading in, if the sight can get to it.
function boltTarget(){
  let best=null,bs=-1e9;
  for(const b of bolts){if(b.dead)continue;const p=boltScreenPoint(b);if(!p)continue;
    const off=Math.hypot(p.x-W*.5,p.y-viewH*.48);if(off>W*.42)continue;const r=boltVisualRadius(b,p),sc=r*3-off*.4;if(sc>bs){bs=sc;best={p,r,urgent:r>W*.035}}}
  return best?{p:best.p,r:clamp(best.r*.9+12,34,82)*(campaign.boltToleranceMultiplier?.()||1)*.9,urgent:best.urgent,kind:'bolt'}:null
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
    return groundTargets.filter(g=>g.doorPylon&&!g.dead&&!g.capDead&&!g.capDying).map(g=>({src:g,cap:true,x:g.x,y:towerCapY(g),z:g.worldZ-travel,s:g.s||1}));
  if(phase==='trench'||phase==='reactor'||phase==='escape')
    return groundTargets.filter(g=>!g.dead&&!g.dying&&(g.type==='reactor'?g.active:g.type==='wallgun')).map(g=>({src:g,x:g.x,y:g.y+(g.yOff||0),z:g.worldZ-travel,s:g.s||1})).filter(o=>o.z>2&&o.z<120);
  // Swamp spitters spit at the drone: shoot the ones on the path ahead.
  if(forest?.active&&forest.spitters)
    return forest.spitters.filter(pl=>!pl.dead&&!pl.dying).map(pl=>({pl,h:forest.swampSpitterHeadWorld(pl)})).map(({pl,h})=>({src:pl,x:h.x,y:h.y,z:h.z,s:1.4})).filter(o=>o.z>8&&o.z<80);
  return[]
}
// The hostile to fight: the one already being fought while it lives and stays in front,
// else the nearest in front. With only one behind, a turn to bring it round.
let curHost=null;
function hostTarget(){
  const list=hostiles();if(!list.length){curHost=null;return null}
  // A pylon top too close to shoot is let go (flying on at it means flying over its tower).
  const front=x=>{const q=camPoint([x.x,x.y,x.z]);return q[2]>(x.cap?16:2)&&q[2]<180?q:null};
  let x=null,q=null;
  if(curHost){const same=list.find(o=>o===curHost||(o.src&&o.src===curHost.src));if(same){const f=front(same);if(f){x=same;q=f}}}
  if(!x){let bd=1e9;for(const o of list){const f=front(o);if(!f)continue;const d=Math.hypot(f[0],f[1],f[2]);if(d<bd){bd=d;x=o;q=f}}}
  if(!x){const o=list[0],c=camPoint([o.x,o.y,o.z]);curHost=null;
    return{turn:[clamp(c[0]/(Math.abs(c[2])+8)*2+(c[2]<0?Math.sign(c[0]||1):0),-1,1),clamp(-c[1]/(Math.abs(c[2])+8)*2,-1,1)],kind:'host'}}
  curHost=x;const pp=projectCam(q);if(!pp)return null;
  return{p:pp,r:x.cap?clamp(.68*x.s*pp.k,12,48)*1.4:Math.max(16*W/1280,(x.s||1)*pp.k*.85),kind:'host'}
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
  const trig=(stationHack?.active?stationHack.triggerRadius:0)||8,clear=trig+5,ahead=120;
  for(const m of mines){if(m.dead||m.dying||m.retired||m.exitScenery||m.deactivated)continue;const q=camPoint([m.x,m.y,m.z]);if(q[2]<-trig||q[2]>ahead)continue;
    const lat=Math.hypot(q[0],q[1]);if(lat>clear)continue;const w=(1-lat/clear)*(1-Math.max(0,q[2])/ahead)*2.4;ax-=Math.sign(q[0]||1)*w;ay+=Math.sign(q[1]||1)*w*.8}
  // Towers, guns and bunkers on a deep-core surface: flying straight over one is a collision.
  if(phase==='surface'&&!groundAssault?.active)for(const g of groundTargets){if(g.dead)continue;const dz=g.worldZ-travel,dx=g.x-shipX;if(dz<.2||dz>24||Math.abs(dx)>3.2)continue;ax-=Math.sign(dx||1)*(1-Math.abs(dx)/3.2)*(1-dz/24)*3}
  // Rocks in the flight line.
  for(const a of asteroids){if(!a||a.dead||a.dying)continue;const q=camPoint([a.x,a.y,a.z]);if(q[2]<1||q[2]>45)continue;
    const lat=Math.hypot(q[0],q[1]),clear=(a.s||1)*1.6+2.5;if(lat>clear)continue;const w=(1-lat/clear)*(1-q[2]/45)*2.6;ax-=Math.sign(q[0]||1)*w;ay+=Math.sign(q[1]||1)*w*.8}
  // City traffic: civilians, never shot, flown round.
  if(jackalDelivery?.active)for(const v of jackalDelivery.traffic||[]){if(v.dead)continue;const q=camPoint([v.x,v.y,v.worldZ-travel]);if(q[2]<3||q[2]>55)continue;
    const lat=Math.hypot(q[0],q[1]*1.4),clear=3.2;if(lat>clear)continue;const w=(1-lat/clear)*(1-q[2]/55)*2.2;ax-=Math.sign(q[0]||1)*w;ay+=Math.sign(q[1]||1)*w*.5}
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
// A corridor run (forest or swamp): the lane is the job. Hold the clear path, ease away from
// obstacle trees ahead, and fire only when the sight comes across a spitter or a projectile,
// never steering off the path to chase one.
function corridorRun(dt){
  wt+=dt||1/30;const k=(D.scene?.seed||1)%17;
  const p=forest.pathAtWorld?.(travel+12);let want=p?p.x+.35*Math.sin(wt*.7+k):shipX,ty=.04*Math.sin(wt*.8+k);
  // The next obstacle in the lane: a standing trunk is passed on the side nearer the middle
  // of the path, a fallen one is hopped over.
  let next=null,nz=1e9;for(const o of forest.obstacles||[]){if(o.passed)continue;const dz=o.worldZ-travel;if(dz>.1&&dz<48&&dz<nz){nz=dz;next=o}}
  if(next){const of=next.obstacle||{};
    if(of.kind==='fallen'){if(nz<22)ty=-.75}
    else{const r=(of.radius||.85)+1.6;if(next._montageSide||Math.abs(want-next.x)<r){const pc=p?p.x:shipX;next._montageSide=next._montageSide||(pc>=next.x?1:-1);want=next.x+next._montageSide*r}}}   // the side is chosen once and kept
  const tx=clamp((want-shipX)*1.1,-1,1);
  steer(tx,clamp(ty,-.8,.4),dt,4.5);
  const a=aimScreen();let on=false;
  for(const x of hostiles()){const q=camPoint([x.x,x.y,x.z]);if(q[2]<4)continue;const pp=projectCam(q);if(pp&&Math.hypot(pp.x-a.x,pp.y-a.y)<Math.max(26*W/1280,(x.s||1)*pp.k*.8))on=true}
  for(const b of bolts){if(b.dead)continue;const pp=boltScreenPoint(b);if(pp&&Math.hypot(pp.x-a.x,pp.y-a.y)<clamp(boltVisualRadius(b,pp)*.9+12,34,82)*.8)on=true}
  trigger(on)
}
// Tunnel bars: pass over or under the next one (whichever side the drone is already on),
// holding that line until it is behind. Returns the vertical steer, or null with no bar near.
function barDodge(){
  let next=null,nz=1e9;for(const h of hazards){if(h.dead||h.dying||h.passed||h.factoryBar)continue;if(h.z>.3&&h.z<34&&h.z<nz){nz=h.z;next=h}}
  if(!next)return null;
  const c=tunnelCenter(next.z),off=shipY-c.y;next._montageSide=next._montageSide||(off>=next.y?1:-1);
  const want=next.y+next._montageSide*(next.clearance+.55);return clamp(-(want-off)*1.4,-1,1)
}
// A target, once chosen, is held for at least half a second: a projectile only breaks off a
// fight sooner when it is about to hit.
function player(dt){
  frameNo++;lockT+=dt||1/30;
  if(routeDiversion?.active&&routeDiversion.state==='customs')return customs(dt);
  if(phase==='forest'&&forest?.active)return corridorRun(dt);
  if(groundAssault?.active&&ground(dt))return;
  const bolt=nestQuiet()?null:boltTarget(),host=hostTarget();
  let pick=null;
  if(bolt&&(lockKind==='bolt'||lockT>.55||bolt.urgent||!host))pick=bolt;
  else if(host)pick=host;
  const dodge=(phase==='trench'||phase==='escape'||phase==='reactor')?barDodge():null;
  if(pick){if(pick.kind!==lockKind){lockKind=pick.kind;lockT=0}
    if(pick.turn){steer(pick.turn[0],pick.turn[1],dt,2.2);trigger(false);sp=null}
    else aimAt(pick.p,pick.r,dt);
    if(dodge!=null)steer(inputX,dodge,dt,4);   // a bar ahead comes first: the vertical line is the dodge
    const[ax,ay]=avoidMines();if(ax||ay){inputX=clamp(inputX+ax*(dt||1/30)*5,-1,1);inputY=clamp(inputY+ay*(dt||1/30)*5,-1,1)}   // and nothing is flown into while fighting
    return}
  lockKind=null;sp=null;navigate(dt);
  if(dodge!=null)steer(inputX,dodge,dt,4)
}

// ---------- The shots ----------
// Each: song time it cuts in, a seed, and how it is set up. A shot lasts until the next one.
const fightJob=(profile,{weapon='laser1',target=60,hp=12,risk=5}={})=>({setup(){launch('fighters','security',{stage:'fighters',weapon,risk,edit:m=>{const f=m.modules.find(x=>x.type==='fighters');if(f){f.profile=profile;f.target=target;f.fighterHp=hp;f.encounterChance=1}}})},pilot:player,warm:3.5,stage:()=>stageFighters()});
const SHOTS=[
  // The tutti: the five bass drum strokes, one shot each
  {t:0,    ...fightJob('pirate',{weapon:'jackalsCrown'}),warm:4},   // opens on the first note (PROMO_SONG.start)
  {t:2.50, setup(){launch('dune_armour_clearance','security',{stage:'dune_assault',world:C.y,weapon:'ripper'})},pilot:player,stage:()=>stageGround(),warm:9},
  {t:3.35, setup(){launch('asteroids','trade',{stage:'asteroids'})},pilot:player,stage:()=>stageRocks(),warm:4},
  {t:4.15, ...fightJob('xeno'),warm:4},
  {t:4.95, setup(){launch('deep_core','security',{stage:'deep_core_surface',world:C.o})},pilot:player,stage:()=>stagePylons(),warm:7},
  {t:5.85, ...fightJob('hijacked',{weapon:'jackalsCrown'}),warm:5},
  {t:8.20, setup(){launch('swamp_relay_delivery','trade',{stage:'forest_corridor'})},pilot:player,warm:6},
  {t:17.24,setup(){launch('ice_field_armour','security',{stage:'dune_assault',world:C.c})},pilot:player,stage:()=>stageGround(),warm:10},
  {t:20.04,setup(){launch('taco_run','quickbite',{stage:'taco_asteroid_delivery'})},pilot:player,stage:()=>stageFighters(),warm:6},
  {t:22.99,...fightJob('ghost'),warm:6},
  {t:29.80,setup(){launch('penthouse_delivery','jackals',{stage:'urban_penthouse_delivery',world:C.m})},pilot:player,warm:5},   // the traffic run
  {t:34.83,setup(){launch('convoy_escort','security',{stage:'route_diversion'})},pilot:player,stage:()=>stageFighters(),warm:9},
  {t:38.48,setup(){launch('station_defence','trade',{stage:'station_defence_recovery',edit:m=>{m.modules[0].relayVariant='hab'}})},pilot:player,stage:()=>stageStation(),warm:5},
  {t:40.73,setup(){launch('customs_run','jackals',{stage:'route_diversion'})},pilot:player,warm:6},
  {t:42.58,...fightJob('rogue',{weapon:'jackalsCrown'}),warm:4},
  {t:46.88,setup(){launch('factory_strike','security',{stage:'factory_assault',world:C.o})},pilot:player,stage:()=>stageGround(),warm:9},
  {t:51.18,setup(){launch('dune_armour_clearance','jackals',{stage:'dune_assault',world:C.y,weapon:'jackalsCrown'})},pilot:player,stage:()=>stageGround(),warm:14},
  {t:54.03,setup(){launch('deep_core','security',{stage:'deep_core_surface',world:C.o,jump:'trench'})},pilot:player,warm:5},
  {t:57.32,setup(){launch('cargo_spill','trade',{stage:'route_diversion'})},pilot:player,stage:()=>stageFighters(),warm:12},
  {t:59.47,setup(){launch('station_defence','security',{stage:'station_defence_recovery',edit:m=>{m.modules[0].relayVariant='fuel'}})},pilot:player,stage:()=>stageStation(),warm:6},
  // The xeno queen in her chamber, spitting from every wall (her real hull, and a gun that
  // cannot finish her in the shot).
  {t:62.32,setup(){launch('nest_clearance','helix',{stage:'xeno_nest',weapon:'laser5'});xenoNest.beginCore();xenoNest.beginRegulatorChamber()},pilot:player,warm:2.5},
  {t:64.77,setup(){launch('asteroids','jackals',{stage:'asteroids'})},pilot:player,stage:()=>stageRocks(),warm:8},
  {t:68.47,setup(){launch('deep_core','jackals',{stage:'deep_core_surface',world:C.o,jump:'reactor',weapon:'ripper'})},pilot:player,warm:.3},
  {t:71.27,setup(){launch('deep_core','helix',{stage:'deep_core_surface',world:C.c})},pilot:player,stage:()=>stagePylons(),warm:10},
  {t:77.12,...fightJob('ghost',{weapon:'jackalsCrown'}),warm:8},
  // The hush: fewer, longer, tenser shots
  {t:79.60,setup(){launch('secure_terminal_intrusion','security',{stage:'station_minefield_approach'})},pilot:player,warm:4},
  {t:88.50,setup(){launch('nest_clearance','helix',{stage:'xeno_nest'})},pilot:player,warm:22},
  {t:97.00,setup(){launch('lattice_survey','helix',{stage:'route_diversion'})},pilot:player,warm:14},
  {t:105.0,setup(){launch('forest_cabin_delivery','trade',{stage:'forest_corridor'})},pilot:player,warm:5},
  {t:113.0,setup(){launch('wreck_recovery','trade',{stage:'asteroid_wreck_recovery'})},pilot:player,warm:4},
  // Out of the nest to the observation point with the swarm turned hostile, into the finale.
  {t:121.0,setup(){launch('nest_clearance','helix',{stage:'xeno_nest'});xenoNest.beginObservationRun()},pilot:player,warm:1.5},
  // The finale: the xeno hive torn apart by its own swarm, watched from the observation point.
  // As in the game: out of the nest mouth, the run to the observation point with the swarm
  // turned hostile, the autopilot turn to face the hive, then the hold as it is torn apart.
  {t:125.6,setup(){launch('nest_clearance','helix',{stage:'xeno_nest'});xenoNest.beginObservationRun();
    for(let i=0;i<60*30&&xenoNest.state==='observationRun';i++){player(1/30);update(1/30)}},pilot:()=>{},warm:2.4}
];
SHOTS.forEach((s,i)=>{
  const shot={name:`shot${i+1}`,t0:s.t,seed:9000+i,
    stage(){sp=null;lockKind=null;curHost=null;try{s.stage?.()}catch(e){D.log.push(`${shot.name} staging failed: ${e.message}`)}},
    setup(){try{s.setup();warm(shot,s.warm||3)}catch(e){D.log.push(`${shot.name} setup failed: ${e.message}`)}},
    pilot(dt){s.pilot?.(dt)},
    overlay(t){
      // Fade in from black at the start and out at the end.
      const a=Math.max(clamp(1-(t-PROMO_SONG.start)/.25,0,1),clamp((t-(PROMO_SONG.end-4))/3.6,0,1));
      if(a>0){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.restore()}
    }};
  D.scenes.push(shot)
});
D.montageShots=SHOTS;
})();
