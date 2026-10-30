'use strict';
// The three promo scenes. Each has t0 (song time it starts), setup(), pilot(dt,t)
// (sets the game's inputs before its frame) and overlay(t) (drawn over the world).
(()=>{
const D=globalThis.PromoDirector;if(!D)return;
const T=D.T,P=globalThis.PromoModels;

// Clear whatever the previous scene left running, without the debrief screens.
function resetGame(){
  try{campaign.currentMission=null;campaign.pendingMission=null;campaign.currentStageIndex=0}catch(_){}
  try{forest.active=false;surfaceDestination.stopForJump();groundAssault?.active&&(groundAssault.active=false);asteroidField.stop?.()}catch(_){}
  fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
  paused=false;document.body.classList.remove('paused');if(campaign.isOpen())campaign.hideHub()
}
function launch(templateId,faction,edit){
  resetGame();
  const m=campaign.makeDevTemplatePreview(templateId,faction);edit(m);
  campaign.launchDevTemplateTest(templateId,faction,{mission:m});
  paused=false;document.body.classList.remove('paused');invulnerable=true;
  // Skip the black mission-transit seconds: open on the planet itself.
  for(let i=0;i<400&&mode==='missionTransit';i++)update(1/30)
}

// ---------- Scene 1: the cabin in the snowy woods ----------
const cabin={name:'cabin',t0:0,seed:1225,
  // Song cues: the descent over the titles, the forest as the strings come in, lift-off to end on the solo.
  marks:[{ev:'plains',at:18},{ev:'forest',at:T.riff},{ev:'glade',at:T.riff+29},{ev:'exit',at:T.solo-6.2},{ev:'done',at:T.solo}],
  event(){if(mode==='victory'||(mode==='surfaceExit'&&modeT>5.9))return'done';if(mode==='surfaceExit')return'exit';
    if(phase==='forest'&&forest.active)return forest.terminalState==='run'?'forest':'glade';
    if(phase==='destinationApproach')return'plains';if(mode==='approach')return'approach';return null},
  setup(){
    D.snow=true;
    launch('forest_cabin_delivery','quickbite',m=>{
      m.planetaryRequirements={landingBody:'planet',landingColour:'green',moonCount:{min:1,max:1}};
      // No orbital ambush: straight to the descent.
      m.modules=m.modules.filter(x=>['planet_descent','surface_destination_approach','forest_corridor'].includes(x.type));m.stages=m.modules.map(x=>x.label);m.routeEncounter=null;
      const approach=m.modules.find(x=>x.type==='surface_destination_approach'),run=m.modules.find(x=>x.type==='forest_corridor');
      approach.routeLength=cabin.routeLength;approach.treeClumps=18;run.length=cabin.forestLength;
    });
    planetStyle='grid';planetRings=null;
    cabin.xmasTreeAdded=false;
    window.update=dt=>{gameUpdate(dt);cabinLiftOff()}
  },
  routeLength:430,forestLength:650,
  pilot(dt){
    if(mode==='play'&&phase==='destinationApproach'&&surfaceDestination.active){
      const e=wrapAngle(surfaceDestination.bearing()-viewYaw);inputX=moveToward(inputX,clamp(e*1.8,-.75,.75),dt*2.2);inputY=moveToward(inputY,.22,dt*2)
    }else if(mode==='play'&&phase==='forest'&&forest.active){
      if(!cabin.xmasTreeAdded&&forest.cabin)addXmasTree();
      if(forest.terminalState==='run'||forest.terminalState==='glade')forestPilot(dt)
    }
  },
  overlay(){if(phase==='forest'||phase==='destinationApproach'||mode==='surfaceExit'||mode==='trenchEntry')D.drawSnowfall(.15)}
};
// Lift-off from the glade: the game climbs 7.2 while pitching up over 2.35s, still flying
// forward, which carries the ship into the trees ahead. Here it climbs harder early and
// pitches up sooner, so it rises clear of the treetops before the zoom.
function cabinLiftOff(){
  if(mode!=='surfaceExit'||D.scene!==cabin)return;
  const early=ease(clamp(modeT/1.3,0,1));
  shipY+=7*early;
  if(modeT<SURFACE_EXIT_PITCH_TIME)viewPitch=lerp(mission.surfaceExitStartPitch,EXIT_VERTICAL_PITCH,Math.max(surfaceExitPitchProgress(),ease(clamp(modeT/1.5,0,1))))
}
// Rolling hills on the snowy plains. The ship rides the ground along its line from where it
// lands to the forest's way in (crests and dips every hundred or so), and the land swells
// into higher hills either side, flattening again far out (so distant trees stand on the
// game's flat horizon band) and at both ends of the run (the landing and the tree line).
function plainsHills(sd){
  const ax=shipX,az=travel,bx=sd.targetX,bz=sd.targetWorldZ,dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz)||1,len2=len*len;
  return(x,wz)=>{
    const u=clamp(((x-ax)*dx+(wz-az)*dz)/len2,0,1),lx=ax+dx*u,lz=az+dz*u,dl=Math.hypot(x-lx,wz-lz),de=Math.hypot(x-bx,wz-bz),along=u*len;
    const ends=ease(clamp(along/50,0,1))*ease(clamp((de-40)/50,0,1));if(ends<=0)return 0;
    const n=.5*Math.sin(x*.034+wz*.011+.4)+.32*Math.sin(wz*.029-x*.019+1.3)+.2*Math.sin(x*.071+wz*.053+.7)+.18*Math.sin(x*.013-wz*.021+2.1);
    const route=2.6*(.5+.5*Math.sin(along*.052+x*.012-1.2))*(.75+.25*Math.sin(along*.13+.4));
    const side=ease(clamp((dl-5)/20,0,1)),far=1-ease(clamp((dl-60)/45,0,1));
    return(route*(1-side)+(route*.5+4.6*clamp(.45+.55*n,0,1.3))*side*far)*ends
  }
}
const gameSdBegin=surfaceDestination.begin.bind(surfaceDestination),gameSdGround=surfaceDestination.drawGround.bind(surfaceDestination);
surfaceDestination.begin=function(stage){
  const r=gameSdBegin(stage);this.promoHills=null;
  if(D.snow&&this.destination==='forest'){
    const H=this.promoHills=plainsHills(this);for(const t of this.trees)t.y+=Math.max(0,H(t.x,t.worldZ)-.3);   // set a little into the slope
    this.entryRadius=5   // carry on to the tree line before the forest takes over
  }
  return r
};
// The ship keeps its height above the ground: the game steers as if the land were flat, and
// the hill under the ship is added on top.
const gameSdSteer=surfaceDestination.updateSteering.bind(surfaceDestination);
surfaceDestination.updateSteering=function(dt,mx,my){
  const H=this.promoHills;if(!H||!D.snow||phase!=='destinationApproach')return gameSdSteer(dt,mx,my);
  shipY-=H(shipX,travel);const r=gameSdSteer(dt,mx,my);shipY+=H(shipX,travel);return r
};
surfaceDestination.drawGround=function(){
  const H=this.promoHills;if(!H||!D.snow)return gameSdGround();
  surfaceMask(this.groundY,560);
  const sp=6,step=3,far=250,gy=this.groundY,x0=Math.floor((shipX-far)/sp)*sp,x1=shipX+far,z0=Math.floor((travel-far)/sp)*sp,z1=travel+far,col=landingWorldColour();
  const seg=(ax,az,bx,bz)=>drawFlatSampledGridLine([ax,gy+H(ax,az),az-travel],[bx,gy+H(bx,bz),bz-travel],1);
  ctx.save();ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.55;ctx.beginPath();
  for(let x=x0;x<=x1;x+=sp)for(let z=z0;z<z1;z+=step)seg(x,z,x,z+step);
  for(let z=z0;z<=z1;z+=sp)for(let x=x0;x<x1;x+=step)seg(x,z,x+step,z);
  ctx.stroke();ctx.restore();
  drawSharedSurfaceHorizon(gy,405,1,col,col)
};
// Steer down the forest path around the standing hazards, and lift over the fallen ones.
function forestPilot(dt){
  const p=forest.pathAtWorld(travel+1.2),reach=Math.max(.55,p.half-.62);
  let tx=p.x,lift=0;
  for(const t of forest.obstacles){
    const z=t.worldZ-travel;if(z<-.5||z>26)continue;const of=t.obstacle||{};
    if(of.kind==='fallen'){if(z<12)lift=1;continue}
    const r=(of.radius||.85)+.65+.55*(t.s||1),pz=forest.pathAtWorld(t.worldZ),left=t.x-r,right=t.x+r;   // clear the branches, not just the trunk
    // Pass on the side with more room; nearer hazards win.
    const goLeft=(left-(pz.x-pz.half))>((pz.x+pz.half)-right);const want=goLeft?left:right;
    if(z<18){tx=want;break}
  }
  const want=clamp((tx-p.x)/reach,-1,1);
  inputX=moveToward(inputX,want,dt*2.6);inputY=moveToward(inputY,lift?-.95:-.15,dt*2.4)
}
// The decorated tree, standing on the cabin's left in the glade.
function addXmasTree(){
  cabin.xmasTreeAdded=true;
  const w=forest.cabinLocalToWorld([-4.3,0,-1.6]);if(!w)return;
  const y=forest.floorAt(w[2],w[0]);
  forest.trees.push({type:'forestTree',id:'promo-xmas',assetId:null,mesh:P.xmasTree,worldZ:w[2],x:w[0],y,z:w[2]-travel,s:1.7,rot:[0,.4,0],col:C.g,dead:false,obstacle:null,passed:true,
    promoDraw:(o,a)=>{P.xmasTree.twinkle(D.clock);drawMesh(o,P.xmasTree,C.g,a)}});
  // And a snowman on the other side, out past the deck, looking back down the lane.
  const m=forest.cabinLocalToWorld([4.6,0,-1.4]);if(!m)return;
  forest.trees.push({type:'forestTree',id:'promo-snowman',assetId:null,mesh:P.snowman,worldZ:m[2],x:m[0],y:forest.floorAt(m[2],m[0]),z:m[2]-travel,s:1.05,rot:[0,-.35,0],col:C.w,dead:false,obstacle:null,passed:true,
    promoDraw:(o,a)=>drawMesh(o,P.snowman,C.w,a)})
}
// Hills. The game's forest preset holds the floor flat; for the promo the route rolls over
// hills and the ground climbs either side of the lane, so the grid shows the contours. Trees
// are seated on floorAt, so they stand on the slopes.
const gameRawPath=forest.rawPathAtWorld.bind(forest),gameFloorAt=forest.floorAt.bind(forest);
forest.rawPathAtWorld=function(worldZ){
  const p=gameRawPath(worldZ);if(!D.snow||this.isSwampVariant())return p;
  const u=worldZ-this.startWorld,gate=ease(clamp(Math.max(0,u)/30,0,1))*hillFade(this,u);
  const hill=(Math.sin(u*.043+.2)*.82+Math.sin(u*.091+1.1)*.38+Math.sin(u*.158+.35)*.18+Math.sin(u*.024+2.0)*.24)*gate*1.7,floor=-3.5+hill;
  return{...p,floor,centerY:floor+1.62}
};
forest.floorAt=function(worldZ,x){
  const y=gameFloorAt(worldZ,x);if(!D.snow||this.isSwampVariant())return y;
  const p=this.pathAtWorld(worldZ),g=this.gladeBlend(worldZ),dx=Math.abs(x-p.x),rise=ease(clamp((dx-(p.half+.6))/12,0,1));
  // Kept below eye height: the game draws each strip of ground as a solid black occluder, and
  // ground above the camera right beside it would black out the screen.
  return y+rise*1.15*(1-g)*hillFade(this,worldZ-this.startWorld)
};
// The hills die away over the run-in to the clearing, so the cabin's glade is level ground.
function hillFade(f,u){return f.hasGladeDestination()?1-ease(clamp((u-(f.gladeStartU-80))/70,0,1)):1}
// The parcel is a present: same flight, same landing spot.
const gameCargo=forest.drawCabinCargo.bind(forest);
forest.drawCabinCargo=function(){
  const state=this.cabinCargoState?.();if(!state||!D.snow)return gameCargo();
  // Out of the cargo bay: the present rises into view from below the screen and the tractor
  // carries it down to the deck (the game's own beam is drawn to wherever it is).
  let point=state.point;
  if(!state.landed){const q=ease(clamp(forest.deliveryProgress||0,0,1)),from=cameraPointToWorld([0,-2.9,2.2]),to=[this.deliveryWorld[0],this.deliveryWorld[1],this.deliveryWorld[2]-travel];
    point=[lerp(from[0],to[0],q),lerp(from[1],to[1],q),lerp(from[2],to[2],q)];const real=this.cabinCargoState;this.cabinCargoState=()=>({...state,point});
    if(state.beam){const keep=drawMesh;window.drawMesh=()=>{};try{gameCargo()}finally{window.drawMesh=keep;this.cabinCargoState=real}}else this.cabinCargoState=real}   // keep the tractor waves, skip the box
  drawMesh({type:'promoPresent',x:point[0],y:point[1]+.2,z:point[2],s:.4,rot:[0,.35+(state.landed?0:D.clock*.8),0]},P.present,C.r,.98)
};

// ---------- Scene 2: reindeer mechs on a rocky world (the guitar solo) ----------
const HERD=7,smoothstep=u=>u*u*(3-2*u);
const herd={name:'reindeer',t0:T.solo,seed:2512,
  marks:[{ev:'dunes',at:T.solo+9}],
  event(){return groundAssault?.active&&mode==='play'&&phase==='surface'?'dunes':null},
  setup(){
    D.snow=false;herd.herdBuilt=false;herd.path=null;herd.wantSpd=0;herd.from=null;herd.hold=null;herd.lastYaw=null;
    launch('dune_armour_clearance','security',m=>{
      m.planetaryRequirements={landingBody:'planet',landingColour:'orange',moonCount:{min:0,max:0}};
      m.modules=m.modules.filter(x=>['planet_descent','dune_assault'].includes(x.type));m.stages=m.modules.map(x=>x.label);m.routeEncounter=null;m.risk=3
    });
    planetStyle='cratered';planetCraters=makeCraters(9);planetRings=null;planetLandingColour=C.c   // an ice world
  },
  pilot(dt,t){
    if(!(groundAssault?.active&&mode==='play'&&phase==='surface'))return;
    if(!herd.herdBuilt)buildHerd();
    const H=herd.path,F=[Math.sin(H.h),Math.cos(H.h)],R=[Math.cos(H.h),-Math.sin(H.h)];
    if(t>=PAN_START){panCamera(t,H,F,R);return}
    // Chase from behind and to the left until the pan takes over.
    const side=-8,back=-27;
    const px=H.x+R[0]*side+F[0]*back,pz=H.z+R[1]*side+F[1]*back;
    const aimX=lerp(px+F[0]*14,H.x+F[0]*4,.8),aimZ=lerp(pz+F[1]*14,H.z+F[1]*4,.8),want=wrapAngle(Math.atan2(aimX-shipX,aimZ-travel)-viewYaw);
    inputX=moveToward(inputX,clamp(want*1.6,-.6,.6),dt*2.2);
    const along=(px-shipX)*Math.sin(viewYaw)+(pz-travel)*Math.cos(viewYaw);
    herd.wantSpd=clamp(H.v+along*.7,4,24);
    inputY=moveToward(inputY,clamp((groundAssault.alt-4)*.35,-.7,.7),dt*3)
  },
  overlay(){}
};
// The pan: the camera leaves the chase and swings round the galloping herd, from behind,
// along their left flank to the front, then holds still low on the ground as the team
// thunders past. It sets the view directly; the drone's own flight is ignored meanwhile.
const PAN_START=T.solo+13,PAN_HOLD=T.breakdown-2.7;
function panCamera(t,H,F,R){
  const G=groundAssault,u=smoothstep(clamp((t-PAN_START)/(PAN_HOLD-PAN_START),0,1));
  let cx,cz,h;
  if(t<PAN_HOLD||!herd.hold){
    const a=lerp(-2.75,-.62,u),r=lerp(27,16,u);h=lerp(4.6,2.3,u);
    cx=H.x+R[0]*Math.sin(a)*r+F[0]*Math.cos(a)*r;cz=H.z+R[1]*Math.sin(a)*r+F[1]*Math.cos(a)*r;
    if(t>=PAN_HOLD)herd.hold={x:cx,z:cz,h}
  }else({x:cx,z:cz,h}=herd.hold);
  const cy=GA_GROUND_Y+G.groundH(cx,cz)+h,ty=GA_GROUND_Y+G.groundH(H.x,H.z)+2.6;
  const lx=H.x+F[0]*3,lz=H.z+F[1]*3,yaw=Math.atan2(lx-cx,lz-cz),pitch=Math.atan2(cy-ty,Math.hypot(lx-cx,lz-cz));
  // Ease out of the chase view over the first second and a half.
  if(!herd.from)herd.from={x:shipX,y:shipY,z:travel,yaw:viewYaw,pitch:viewPitch,roll:viewRoll};
  const b=smoothstep(clamp((t-PAN_START)/1.5,0,1)),f=herd.from;
  shipX=lerp(f.x,cx,b);shipY=lerp(f.y,cy,b);travel=lerp(f.z,cz,b);
  viewYaw=wrapAngle(f.yaw+wrapAngle(yaw-f.yaw)*b);viewPitch=lerp(f.pitch,pitch,b);
  const turn=herd.lastYaw==null?0:wrapAngle(viewYaw-herd.lastYaw);herd.lastYaw=viewYaw;
  viewRoll=lerp(f.roll*(1-b),clamp(-turn*6,-.18,.18),b);inputX=inputY=0;herd.wantSpd=0
}
// The herd's path: one point galloping a wide arc; each reindeer keeps its place in a
// two-by-three team with a leader out in front, like a sleigh team.
const TEAM=[[0,13],[-1.7,6.5],[1.7,6.5],[-1.7,0],[1.7,0],[-1.7,-6.5],[1.7,-6.5]];
function buildHerd(){
  herd.herdBuilt=true;const G=groundAssault;
  G.units.length=0;G.groups.length=0;
  const a=viewYaw+.35,cx=shipX+Math.sin(viewYaw)*48,cwz=travel+Math.cos(viewYaw)*48;
  herd.path={x:cx,z:cwz,h:a,v:10.5,turn:.07};
  const grp={name:'HERD',letter:'H',cx,cwz,navX:cx,navWZ:cwz,radius:40,cleared:false,ids:[]};
  TEAM.forEach(([r,f],j)=>{const x=cx+Math.cos(a)*r*2.1+Math.sin(a)*f,z=cwz-Math.sin(a)*r*2.1+Math.cos(a)*f,u=G.spawn('reindeer',x,z,a,grp);u.team=[r*2.1,f];u.speed=10;grp.ids.push(u.id)});
  G.groups.push(grp);
  scatterRocks(G,herd.path)
}
// Rocks along the herd's run, on either side of their line and clear of the camera's moves
// (the chase and the pan stay within about 28 of the herd, on its left).
function scatterRocks(G,start){
  let rockLo=1e9;for(const v of asteroidMesh.v)rockLo=Math.min(rockLo,v[1]);
  const col=landingWorldColour()===C.o?C.y:C.o,rock=(x,wz,s)=>{const mx=1.05+Math.random()*1.25,my=.45+Math.random()*.62,mz=.95+Math.random()*1.1,bury=.12+Math.random()*.18;
    G.trees.push({kind:'rock',mesh:asteroidMesh,x,wz,s,mx,my,mz,bury,base:rockLo,col,rot:[(Math.random()-.5)*.28,Math.random()*6.28,(Math.random()-.5)*.24],r:s*Math.max(mx,mz)*.85,top:s*my*(1-bury)*.9})};
  let x=start.x,z=start.z,h=start.h;
  for(let i=0;i<34;i++){
    h+=start.turn*1.1;x+=Math.sin(h)*start.v*1.1;z+=Math.cos(h)*start.v*1.1;
    const rx=Math.cos(h),rz=-Math.sin(h),side=(o,f=0)=>[x+rx*o+Math.sin(h)*f,z+rz*o+Math.cos(h)*f];
    for(let k=0;k<2;k++){const[a,b]=side(11+Math.random()*34,(Math.random()-.5)*10);rock(a,b,.9+Math.random()*2.3)}
    if(Math.random()<.7){const[a,b]=side(-(34+Math.random()*30),(Math.random()-.5)*10);rock(a,b,1.2+Math.random()*2.8)}
  }
}
groundAssault.drawMarker=(game=>function(){if(D.scene===herd)return;return game.call(this)})(groundAssault.drawMarker);
const gameThink=groundAssault.think.bind(groundAssault);
groundAssault.think=function(u,dt){
  if(u.kind!=='reindeer'||!herd.path)return gameThink(u,dt);
  const H=herd.path,c=Math.cos(H.h),s=Math.sin(H.h),tx=H.x+c*u.team[0]+s*(u.team[1]+5),tz=H.z-s*u.team[0]+c*(u.team[1]+5);
  const want=Math.atan2(tx-u.x,tz-u.wz),dist=Math.hypot(tx-u.x,tz-u.wz);
  u.h=wrapAngle(u.h+clamp(wrapAngle(want-u.h),-2.2*dt,2.2*dt));u.aggro=false;
  u.speed=moveToward(u.speed,clamp(H.v+(dist-5)*.9,3,15),dt*6)
};
const gameSteer=groundAssault.updateSteering.bind(groundAssault);
groundAssault.updateSteering=function(dt,mx,my){
  // The herd moves first each frame, then the ship holds its own speed beside it.
  if(D.scene===herd&&herd.path&&!this.leadIn){const H=herd.path;H.h=wrapAngle(H.h+H.turn*dt);H.x+=Math.sin(H.h)*H.v*dt;H.z+=Math.cos(H.h)*H.v*dt}
  const r=gameSteer(dt,mx,my);
  if(D.scene===herd&&herd.wantSpd&&!this.leadIn){const extra=herd.wantSpd-this.spd;shipX+=Math.sin(viewYaw)*extra*dt;travel+=Math.cos(viewYaw)*extra*dt;this.spd=herd.wantSpd}
  return r
};
// Reindeer keep their own colours: a red nose, yellow antlers, white cannon barrels, knees and
// feet on a brown (orange) body.
const gameDrawUnit=groundAssault.drawUnit.bind(groundAssault);
const reindeerColours=new WeakMap();
groundAssault.drawUnit=function(u){
  if(u.kind!=='reindeer')return gameDrawUnit(u);
  this.pose(u);
  if(!reindeerColours.has(u.mesh)){const b=gaBuilder(true);this.emit(b,u);u.mesh.edgeColors=P.edgeColours(b,P.reindeerColours(b));reindeerColours.set(u.mesh,true)}
  const wreck=u.state==='wreck',col=wreck?C.x:objectHitColor(u,u.K.col);
  const dist=this.planarToShip(u),haze=clamp((GA_UNIT_SIGHT-dist)/40,0,1),depth=camPoint([u.x,this.ug(u),u.wz-travel])[2];
  drawMesh({x:u.x,y:this.ug(u),z:u.wz-travel,s:u.s,rot:[0,u.h+Math.PI,0],fadeZ:Math.max(0,depth)*.8},u.mesh,col,(wreck?.55:1)*haze)
};

// ---------- Scene 3: the aria in the asteroid field ----------
// This scene is staged rather than flown: the game draws its stars, asteroids and
// cockpit, and the promo moves the camera and the singers itself.
const SONG=PROMO_SONG,V3=(x,y,z)=>[x,y,z],vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],vmul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const vnorm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const smooth=u=>u*u*(3-2*u);
// Catmull-Rom through keyframes [t,[x,y,z]].
function track(keys,t){
  if(t<=keys[0][0])return keys[0][1];if(t>=keys[keys.length-1][0])return keys[keys.length-1][1];
  let i=1;while(keys[i][0]<t)i++;
  const p0=keys[Math.max(0,i-2)][1],p1=keys[i-1][1],p2=keys[i][1],p3=keys[Math.min(keys.length-1,i+1)][1],u=(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]),u2=u*u,u3=u2*u;
  return[0,1,2].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u3))
}
const SINGER=V3(0,1.2,0);
const camKeys=[[T.breakdown,V3(6,3.4,-26)],[T.breakdown+7,V3(2.5,2.4,-13)],[T.verse3,V3(-3.4,2.1,-7.6)],[T.verse3+9,V3(-9,3.6,-5.5)],
  [T.verse3+17,V3(-7,3.4,-15)],[T.verse3+22.5,V3(0,3,-19)],[T.verse3+30,V3(10,3.4,-14)],[T.outro,V3(7,4.5,-20)],[T.end-4,V3(0,6,-28)],[T.end+4,V3(0,6.5,-31)]];
// The band hovers on the stage behind her from the start: two guitarists and a drummer.
const BAND=[{at:V3(-3.4,.4,3.4),play:'guitar',axe:'strat',body:C.g,trim:C.y,s:.9},{at:V3(3.5,.5,3.6),play:'guitar',axe:'lespaul',body:C.o,trim:C.y,s:.9},{at:V3(0,1.5,6.6),play:'drums',body:C.u,trim:C.c,s:.95}];
// The chorus: where each one waits off-stage, its place on stage, when it arrives, and what it sings.
const CHORUS=[
  {from:V3(-46,8,-20),at:V3(-6.6,.9,1.4),arrive:T.verse3+16,sing:'crowd',body:C.g,trim:C.c,s:.85},
  {from:V3(44,-6,-24),at:V3(6.8,1.1,1.6),arrive:T.verse3+16.8,sing:'crowd',body:C.u,trim:C.y,s:.9},
  {from:V3(-30,22,30),at:V3(-9.2,3.0,4.6),arrive:T.verse3+17.8,sing:'harmony',body:C.c,trim:C.m,s:.8},
  {from:V3(34,24,26),at:V3(9.3,2.9,4.4),arrive:T.verse3+18.6,sing:'harmony',body:C.y,trim:C.g,s:.8},
  {from:V3(-20,-26,40),at:V3(-11,-.8,7.2),arrive:T.verse3+19.6,sing:'choir',body:C.o,trim:C.c,s:.75},
  {from:V3(24,-24,42),at:V3(11.2,-.6,7.5),arrive:T.verse3+20.4,sing:'choir',body:C.m,trim:C.y,s:.75}];
const voices={lead:[...SONG.notes,...SONG.aria].sort((a,b)=>a.t-b.t),crowd:SONG.notes.filter(n=>n.crowd),harmony:SONG.notes.filter(n=>n.harmony)};
const VOWEL={a:1,o:.9,u:.6,e:.75,i:.55};
// How far open the jaw is at time t, from the sung notes: a quick opening on each syllable,
// easing to a held shape, shut between syllables.
function jawAt(list,t){
  let lo=0,hi=list.length-1,k=-1;while(lo<=hi){const m=(lo+hi)>>1;if(list[m].t<=t){k=m;lo=m+1}else hi=m-1}
  if(k<0)return 0;const n=list[k],age=t-n.t,end=n.d;if(age>end+.09)return 0;
  const v=VOWEL[(n.syl||'a').replace(/[^aeiou]/g,'').slice(-1)]||.8,peak=(n.legato?.95:.8)*v*(n.stress?1.15:1);
  const open=clamp(age/.05,0,1),close=age>end-.06?clamp((end+.09-age)/.15,0,1):1,hold=lerp(1,.72,clamp((age-.08)/.3,0,1));
  return clamp(peak*open*close*hold,0,1)
}
// The low chorus holds each chord for a bar in the biggest sections: a slow open and close.
function choirJaw(t){const b=(t-SONG.start)/SONG.bar,bar=Math.floor(b),u=b%1;return bar>=88&&bar<104?.32+.12*Math.sin(u*Math.PI):0}

// ---- What the band plays, from the arrangement (bars count from 0 at the song's start) ----
// Breakdown (bars 68-75): the band falls away, a ringing chord a bar from bar 72, soft kick and
// cymbal from 70, a snare build in 74 and a roll in 75. Last verse and outro (76-102): the full
// band, guitars chugging eighths, kick and snare with eighth-note hats, a crash every other bar.
// Bar 103: the last chord and a crash.
const BEAT=SONG.beat,BAR=SONG.bar;
const since=(t,step,off=0)=>{const x=(t-off)/step;return(x-Math.floor(x))*step};   // seconds since the last tick of a grid
const hitEnv=age=>age<0?0:clamp(1-age/.14,0,1)**2;
function bandAt(t){const b=t/BAR,bar=Math.floor(b),inBar=t-bar*BAR;return{bar,k:bar-68,inBar,full:bar>=76&&bar<103,last:bar>=103}}
function guitarPose(t,i){
  const s=bandAt(t);let strum=0,fret=((s.bar*3+i)%5)/4;
  if(s.full)strum=hitEnv(since(t,BEAT/2));
  else if(s.last||(s.k>=4&&s.k<8))strum=hitEnv(s.inBar)*1.2;
  return{strum:clamp(strum,0,1.2),fret,jaw:0,mand:.1+.05*Math.sin(t*2+i)}
}
function drumPose(t){
  const s=bandAt(t),K=P.drumKit.strikes;let L=K.snare,R=K.hat,hl=0,hr=0;
  if(s.full){
    const beatInBar=Math.floor(s.inBar/BEAT);
    hr=hitEnv(since(t,BEAT/2));
    if(beatInBar===1||beatInBar===3)hl=hitEnv(s.inBar-beatInBar*BEAT);
    if(s.bar%2===0&&s.inBar<BEAT/2){R=K.crash;hr=hitEnv(s.inBar)}
    if(s.bar%4===3&&s.inBar>BEAT*2){L=K.tomL;R=K.tomR;const q=since(t,BEAT/4);hl=hitEnv(q);hr=hitEnv(q-BEAT/8)}
  }else if(s.last){R=K.crash;L=K.tomL;hr=hitEnv(s.inBar);hl=hitEnv(s.inBar)}
  else if(s.k>=2&&s.k<6){R=K.hat;hr=hitEnv(since(t,BEAT))*.7}
  else if(s.k===6){const q=since(t,BEAT/2);hl=hitEnv(q);hr=hitEnv(q-BEAT/4)}
  else if(s.k===7){const q=since(t,BEAT/4);hl=hitEnv(q);hr=hitEnv(q-BEAT/8)}
  return{hitL:hl,hitR:hr,leftTarget:L,rightTarget:R,jaw:0,mand:.1}
}

const aria={name:'aria',t0:T.breakdown,seed:2412,
  setup(){
    resetGame();groundAssault?.reset?.();D.snow=false;
    mode='play';phase='asteroids';phaseT=modeT=0;inputX=inputY=aimX=aimY=0;viewRoll=0;
    asteroidField.active=true;asteroidField.ringPlanet={x:-118,y:-13,z:255,r:12.5,spin0:.4,ringRadii:[21,25,30,37]};
    asteroids.length=0;
    // The game's own asteroid look: green, about a quarter yellow, tumbling and drifting.
    const rock=(x,y,z,s,v=[0,0,0],col=Math.random()<.23?C.y:C.g)=>{const a=asteroidField.makeAsteroid({x,y,z,s,hp:9,vx:0,vy:0,vz:0,col,objective:false,missionTarget:false});a.wx=x;a.wy=y;a.wz=z;a.drift=v;asteroids.push(a);return a};
    aria.home=rock(0,-8.2,9,6.2,[0,0,0],C.y);aria.home.spin=[.01,.03,.005];
    // Lines of sight from the camera to the stage, sampled through the scene, so no drifting
    // rock ever passes in front of a singer or a player.
    const marks=[SINGER,...BAND.map(b=>b.at),...CHORUS.map(c=>c.at)],sight=[];
    for(let t=T.breakdown;t<=T.end;t+=.5){const c=track(camKeys,t);sight.push({t,lines:marks.map(q=>[c,q])})}
    const near=(p,a,b,r)=>{const ab=vsub(b,a),ap=vsub(p,a),u=clamp((ap[0]*ab[0]+ap[1]*ab[1]+ap[2]*ab[2])/(ab[0]**2+ab[1]**2+ab[2]**2),0,1);return Math.hypot(...vsub(ap,vmul(ab,u)))<r};
    const blocks=(p0,v,r)=>sight.some(({t,lines})=>{const dt=t-T.breakdown,p=[p0[0]+v[0]*dt,p0[1]+v[1]*dt,p0[2]+v[2]*dt];return lines.some(([a,b])=>near(p,a,b,r))});
    // The field drifts slowly across the view, right to left, each rock at its own pace.
    for(let n=0,i=0;n<80&&i<900;i++){
      const r=12+Math.random()*75,a=Math.random()*Math.PI*2,y=(Math.random()-.5)*36,p=[Math.cos(a)*r,y,8+Math.sin(a)*r],s=.6+Math.random()*2.6;
      const v=[-(.6+Math.random()*1.8),(Math.random()-.5)*.5,(Math.random()-.5)*.8];
      if(blocks(p,v,s*1.5+2.2))continue;rock(p[0],p[1],p[2],s,v);n++}
    aria.singer={mesh:P.makeHornet(C.m,C.y),pos:SINGER,s:1,sing:'lead',body:C.m,trim:C.y,rings:[],lastJaw:0};
    aria.chorus=CHORUS.map(c=>({...c,mesh:P.makeHornet(c.body,c.trim),rings:[],lastJaw:0}));
    aria.band=BAND.map((b,i)=>({...b,pos:b.at,i,mesh:P.makeHornet(b.body,b.trim,b.play,b.axe)}));
    aria.cam=camKeys[0][1];window.update=aria.update;aria.update(0)   // place the camera before the first frame is drawn
  },
  update(dt){
    const t=D.clock,cam=track(camKeys,t),look=vadd(SINGER,vmul(V3(0,.6,4),smooth(clamp((t-T.verse3-14)/8,0,1))));
    aria.cam=cam;shipX=cam[0];shipY=cam[1];travel=cam[2];
    const F=vnorm(vsub(look,cam)),R=vnorm(vcross([0,1,0],F)),U=vcross(F,R);
    spaceForward=F;spaceRight=R;spaceUp=U;viewRoll=Math.sin(t*.21)*.035;
    const age=t-T.breakdown;
    for(const a of asteroids){a.x=a.wx+a.drift[0]*age;a.y=a.wy+a.drift[1]*age;a.z=a.wz+a.drift[2]*age-cam[2];a.rot=a.rot.map((r,i)=>r+a.spin[i]*dt)}
    asteroidField.ringPlanet.z=255-cam[2]*.2;
    time+=dt;phaseT+=dt;modeT+=dt
  },
  pilot(){},
  overlay(){}
};
function singerPos(c,t){
  if(!c.arrive)return vadd(c.pos,V3(0,Math.sin(t*.8+(c.i||0)*2)*.12,0));
  const u=smooth(clamp((t-(c.arrive-5))/5,0,1));
  const mid=vadd(vmul(vadd(c.from,c.at),.5),V3(0,4,-6)),a=vadd(vmul(c.from,(1-u)*(1-u)),vadd(vmul(mid,2*u*(1-u)),vmul(c.at,u*u)));
  return vadd(a,V3(0,Math.sin(t*.8+c.at[0])*.14*u,0))
}
function voiceJaw(c,t){return c.sing==='choir'?choirJaw(t):jawAt(voices[c.sing],t)}
// The trill in the aria: she strains on it (0 to 1, easing in and out at the note's ends).
const TRILLS=SONG.aria.filter(n=>/tr/.test(n.fl||''));
function strainAt(t){let s=0;for(const n of TRILLS)s=Math.max(s,clamp((t-n.t-.08)/.2,0,1)*clamp((n.t+n.d+.12-t)/.25,0,1));return s}
// Everyone on stage turns to face the camera.
function facing(pos){const cam=aria.cam;return Math.atan2(-(cam[0]-pos[0]),-(cam[2]-pos[2]))}
// ---- The dance, in the last verse and the outro ----
// Everyone moves to the beat. The band starts at the key change: the guitarists headbang on
// every beat and bob, the drummer nods on the backbeat. The singer joins in for the refrain,
// each of the choir once it has landed: a bob on every beat, and a lean every two beats,
// mirrored either side of the singer and rippling along the line. In the outro the abdomens
// waggle, one side a beat. On the last chord everyone stops, wings up in a V, and rises; as
// it dies away they all take a bow together (the singer deepest), and straighten up for the titles.
const atBar=b=>SONG.start+b*BAR,ramp=(t,t0,d=BAR)=>smooth(clamp((t-t0)/d,0,1));
function danceAt(c,t){
  const ph=(t-SONG.start)/BEAT,u=ph-Math.floor(ph),fin=ramp(t,atBar(103),.5),go=1-fin,x=(c.at||c.pos)[0];
  const bow=ramp(t,atBar(103)+1.15,.6)*(1-ramp(t,atBar(103)+2.45,.7));
  const d={bob:0,sway:0,waggle:0,nod:bow*.3,spread:fin*(1-.6*bow),rise:fin*.4*(1-.6*bow),bow:bow*(c.sing==='lead'?.7:.55)};
  if(c.play==='drums'){d.rise=0;d.nod+=go*ramp(t,atBar(76),.3)*(Math.floor(ph)%2?.22:.06)*(1-u)**2;return d}
  if(c.play){const k=go*ramp(t,atBar(76),.3);d.nod+=k*.34*(1-u)**2;d.bob=k*.08*Math.abs(Math.sin(Math.PI*ph));return d}
  const k=go*(c.arrive?ramp(t,c.arrive+.3):ramp(t,atBar(88))),side=x<-.5?1:x>.5?-1:1;
  d.bob=k*.14*Math.abs(Math.sin(Math.PI*ph));
  d.sway=k*.13*side*Math.sin(Math.PI*ph/2-Math.abs(x)*.12);
  d.waggle=k*ramp(t,atBar(96))*.32*Math.sin(Math.PI*ph+x*.1);
  return d
}
function drawSinger(c,t){
  const d=danceAt(c,t),pos=vadd(singerPos(c,t),V3(0,d.bob+d.rise,0)),cam=aria.cam,jaw=voiceJaw(c,t);
  c.mesh.pose({jaw,mand:jaw,t:t+(c.at?c.at[0]:0),strain:c.sing==='lead'?strainAt(t):0,waggle:d.waggle,nod:d.nod,spread:d.spread});
  drawMesh({x:pos[0],y:pos[1],z:pos[2]-cam[2],s:c.s,rot:[-d.bow,facing(pos),d.sway]},c.mesh,c.body,1);
  // Sound rings from the mouth on every new syllable.
  if(jaw>.35&&c.lastJaw<=.35)c.rings.push({t0:t});c.lastJaw=jaw;
  const mouth=[pos[0],pos[1]+1.45*c.s,pos[2]-cam[2]],mp=proj(mouth);c.rings=c.rings.filter(r=>t-r.t0<1.3);
  if(mp)for(const r of c.rings){const age=t-r.t0,rad=mp.k*c.s*(.3+age*1.5);ctx.save();ctx.globalAlpha=.55*(1-age/1.3);ctx.strokeStyle=c.trim;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();ctx.ellipse(mp.x,mp.y,rad,rad*.62,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  // Arrival: propulsion waves trailing behind while they fly in.
  if(c.arrive&&t<c.arrive){const p=proj([pos[0],pos[1]-2.2*c.s,pos[2]-cam[2]]);if(p)for(let j=0;j<3;j++){const u=(t*2.2+j/3)%1;ctx.save();ctx.globalAlpha=(1-u)*.5;ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();ctx.ellipse(p.x,p.y+u*p.k*.8,p.k*(.25+u*.4),p.k*(.12+u*.2),0,0,Math.PI*2);ctx.stroke();ctx.restore()}}
}
function drawPlayer(b,t){
  const d=danceAt(b,t),pos=singerPos(b,t),cam=aria.cam,rot=[-d.bow,facing(pos),0],kitRot=[0,rot[1],0];
  b.mesh.pose({...(b.play==='drums'?drumPose(t):guitarPose(t,b.i)),t:t+b.i*1.3,nod:d.nod,spread:d.spread});
  drawMesh({x:pos[0],y:pos[1]+d.bob+d.rise,z:pos[2]-cam[2],s:b.s,rot},b.mesh,b.body,1);
  if(b.play==='drums')drawMesh({x:pos[0],y:pos[1],z:pos[2]-cam[2],s:b.s,rot:kitRot},P.drumKit,C.r,1)   // the kit stands in front of the drummer
}
// Singers and band go into the game's depth-sorted scene list beside the asteroids.
const gameAppend=routeDiversion.appendScene?.bind(routeDiversion);
routeDiversion.appendScene=function(scene){
  gameAppend?.(scene);
  if(D.scene!==aria||phase!=='asteroids')return;
  const t=D.clock,depth=pos=>camPoint([pos[0],pos[1],pos[2]-aria.cam[2]])[2];
  for(const c of[aria.singer,...aria.chorus]){if(c.arrive&&t<c.arrive-5)continue;const z=depth(singerPos(c,t));if(z>.5)scene.push({z,draw:()=>drawSinger(c,t)})}
  for(const b of aria.band){const z=depth(singerPos(b,t));if(z>.5)scene.push({z,draw:()=>drawPlayer(b,t)})}
};
const gameUpdate=window.update;

D.scenes.push(cabin,herd,aria);
// The flown scenes hand the frame back to the game's own update.
for(const s of[cabin,herd]){const set=s.setup;s.setup=function(){window.update=gameUpdate;asteroidField.active=false;return set.call(this)}}
globalThis.PromoScenes={cabin,herd,aria,resetGame,launch};
})();
