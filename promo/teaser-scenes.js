'use strict';
// The teaser: eight worlds to "Stampede Across the Stars", one twelve-bar stop each.
//   0:00  the descent to a green world (titles)      0:14  England: horses past Stonehenge
//   0:35  Australia: kangaroos bounding past Uluru   0:56  Egypt: camels below the pyramids
//   1:18  India: festival elephants and the Taj Mahal 1:39  Kenya: giraffes and zebras under Kilimanjaro
//   2:00  Peru: llamas below Machu Picchu            2:21  USA: a bison stampede in Monument Valley
//   2:43  Antarctica: penguins among the icebergs, an aurora   2:57  lift-off, and the fade to the stars
// Each world is a real dune-assault surface; its herd runs a fixed path and the camera is flown
// on keyframes set relative to the herd, swinging wide to put the landmark behind the animals.
(()=>{
const D=globalThis.PromoDirector;if(!D||!PROMO_SONG.teaser)return;
const T=D.T,M=globalThis.TeaserModels,P=globalThis.PromoModels,PI=Math.PI,BAR=PROMO_SONG.bar;
const smooth=u=>u*u*(3-2*u),ease=(t,a,b)=>smooth(clamp((t-a)/(b-a),0,1));

function resetGame(){
  try{campaign.currentMission=null;campaign.pendingMission=null;campaign.currentStageIndex=0}catch(_){}
  try{forest.active=false;surfaceDestination.stopForJump();groundAssault?.active&&(groundAssault.active=false);asteroidField.stop?.()}catch(_){}
  fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
  paused=false;document.body.classList.remove('paused');if(campaign.isOpen())campaign.hideHub()
}
function launch(edit){
  resetGame();
  const m=campaign.makeDevTemplatePreview('dune_armour_clearance','security');edit(m);m.routeEncounter=null;m.risk=3;m.stages=m.modules.map(x=>x.label);
  campaign.launchDevTemplateTest('dune_armour_clearance','security',{mission:m});
  paused=false;document.body.classList.remove('paused');invulnerable=true;
  for(let i=0;i<400&&mode==='missionTransit';i++)update(1/30)
}

// ---------- The worlds ----------
// cam keyframes: [u (s into the world), side (- left of the herd), along (+ ahead of its centre),
// height, look ahead of the herd, look towards the landmark 0..1]. mirror swaps left and right.
const CAM={
  chase:[[0,-8,-44,9,8,0],[5.5,-14,-21,4.4,5,0],[10.5,-16,-3,3.3,3,0],[15.5,-23,11,4.8,0,.38],[21.6,-31,21,7,-2,.5]],
  front:[[0,4,46,6,0,0],[5,3,24,2.4,0,0],[10,-8,8,2.2,0,0],[15.5,-18,-2,4.5,0,.42],[21.6,-26,-14,7,0,.55]],
  slow:[[0,-5,-28,6,5,0],[5.5,-7,-11,3,3,0],[10.5,-8,-1,2.4,2,0],[15.5,-13,8,3.6,0,.42],[21.6,-19,14,5.5,-1,.55]],
  close:[[0,4,26,4.2,0,0],[4.5,2.5,13,1.9,0,0],[9.5,-4,7,1.5,0,0],[14.1,-8,1,2.4,0,.3]],
};
const WORLDS=[
  {name:'england',col:C.g,amp:.55,seed:301,herd:{kind:'horse',n:7,v:11,tints:[C.o,C.w,C.y,C.o,C.o,C.w,C.y]},cam:CAM.chase,
    land:{mesh:M.stonehenge,col:C.w,s:1.7,at:17.5,side:36,ahead:6,r:26},props:{mesh:M.oak,col:C.g,n:26,s:[.8,1.3]}},
  {name:'australia',col:C.o,amp:.35,seed:302,crit:{type:'kangaroo',n:7,v:9.5,col:C.o,s:1.3},cam:CAM.front,mirror:true,
    land:{mesh:M.uluru,col:C.r,s:1.4,at:16,side:95,ahead:-10,r:70},props:{mesh:M.spinifex,col:C.y,n:40,s:[.8,1.4]}},
  {name:'egypt',col:C.y,amp:1.25,seed:303,herd:{kind:'camel',n:6,v:5.5,space:1.4},camK:1.25,cam:CAM.slow,
    land:{mesh:M.giza,col:C.w,s:1.15,at:17,side:80,ahead:20,r:80,yaw:.5},props:{mesh:M.palm,col:C.g,n:10,s:[1,1.4]}},
  {name:'india',col:C.u,amp:.3,seed:304,herd:{kind:'elephant',n:5,v:3.6,space:2},camK:1.7,cam:CAM.slow,mirror:true,
    land:{mesh:M.taj,col:C.w,s:1.2,at:16,side:70,ahead:4,r:40,yaw:-PI/2},props:{mesh:M.palm,col:C.g,n:22,s:[1,1.5]}},
  {name:'kenya',col:C.o,amp:.35,seed:305,herd:{kind:'giraffe',n:4,v:6.5,space:1.5,mix:{kind:'zebra',n:6}},camK:1.3,cam:CAM.chase,
    land:{mesh:M.kilimanjaro,col:C.u,s:1.4,at:16,side:330,ahead:120,r:0},props:{mesh:M.acacia,col:C.g,n:22,s:[1,1.5]}},
  {name:'peru',col:C.g,amp:.9,seed:306,herd:{kind:'llama',n:7,v:4.6},cam:CAM.slow,mirror:true,
    land:{mesh:M.machuPicchu,col:C.g,s:1.3,at:16,side:95,ahead:30,r:60,yaw:PI},props:{mesh:M.iceBlock,col:C.w,n:0}},
  {name:'usa',col:C.y,amp:.45,seed:307,herd:{kind:'bison',n:12,v:11,space:1.25},camK:1.15,cam:CAM.chase,
    land:{mesh:M.monumentValley,col:C.o,s:1.4,at:17,side:110,ahead:20,r:90,yaw:.2},props:{mesh:M.saguaro,col:C.g,n:24,s:[.9,1.4]}},
  {name:'antarctica',col:C.c,amp:.25,seed:308,crit:{type:'penguin',n:11,v:1.3,col:C.w,s:1.25},cam:CAM.close,aurora:true,
    land:{mesh:M.iceberg,col:C.w,s:3.2,at:9,side:85,ahead:70,r:0,many:[[60,90,2.4],[105,140,4],[150,50,3],[-80,190,3.4]]},props:{mesh:M.iceBlock,col:C.w,n:12,s:[.7,1.4]}},
];
const LEN=BAR*12;

// ---------- Herd path: a gentle arc at constant speed ----------
function pathAt(w,u){const p=w.path,h=p.h+p.turn*u,v=p.v;
  if(Math.abs(p.turn)<1e-4)return{x:p.x+Math.sin(p.h)*v*u,z:p.z+Math.cos(p.h)*v*u,h};
  return{x:p.x+v/p.turn*(Math.cos(p.h)-Math.cos(h)),z:p.z+v/p.turn*(Math.sin(h)-Math.sin(p.h)),h}}
const frameOf=h=>({F:[Math.sin(h),Math.cos(h)],R:[Math.cos(h),-Math.sin(h)]});
const ground=(x,z)=>GA_GROUND_Y+groundAssault.groundH(x,z);

// Catmull-Rom through the keyframes (each value separately), so the camera never stops at a key.
function camKey(keys,u){
  const n=keys.length;if(u<=keys[0][0])return keys[0].slice(1);if(u>=keys[n-1][0])return keys[n-1].slice(1);
  let i=0;while(i<n-2&&u>keys[i+1][0])i++;
  const k0=keys[Math.max(0,i-1)],k1=keys[i],k2=keys[i+1],k3=keys[Math.min(n-1,i+2)],t=(u-k1[0])/(k2[0]-k1[0]),t2=t*t,t3=t2*t;
  return k1.slice(1).map((_,j)=>{const p0=k0[j+1],p1=k1[j+1],p2=k2[j+1],p3=k3[j+1];return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)})
}
function cameraAt(w,u){
  const K=w.def.camK||1,[s0,a0,h0,lookF,lookL]=camKey(w.def.cam,u),side=s0*K*(w.def.mirror?-1:1),along=a0*K,hgt=h0*Math.sqrt(K);
  const c=pathAt(w,u),{F,R}=frameOf(c.h);
  const x=c.x+R[0]*side+F[0]*along,z=c.z+R[1]*side+F[1]*along;
  // Height over a smoothed ground, so the camera never jolts over a ridge.
  let g=0;for(const[a,b]of[[0,0],[4,0],[-4,0],[0,4],[0,-4]])g+=ground(x+a,z+b);g/=5;
  const y=g+hgt;
  let tx=c.x+F[0]*lookF,tz=c.z+F[1]*lookF,ty=ground(c.x,c.z)+(w.lookY||1.8);
  if(lookL>0&&w.land){const L=w.land;tx=lerp(tx,L.x,lookL);tz=lerp(tz,L.z,lookL);ty=lerp(ty,ground(L.x,L.z)+L.top*.35,lookL*.5)}
  return{x,y,z,yaw:Math.atan2(tx-x,tz-z),pitch:Math.atan2(y-ty,Math.hypot(tx-x,tz-z))}
}

// ---------- Building a world ----------
function scatter(w,rand){
  const pr=w.def.props;w.props=[];if(!pr||!pr.n)return;
  for(let i=0;i<pr.n;i++){
    const u=-4+rand()*28,c=pathAt(w,u),{F,R}=frameOf(c.h),s=(rand()<.5?-1:1)*(w.def.mirror?-1:1),off=s<0?32+rand()*40:13+rand()*55;
    const x=c.x+R[0]*s*off+F[0]*(rand()-.5)*8,z=c.z+R[1]*s*off+F[1]*(rand()-.5)*8;
    if(w.land&&w.land.r&&Math.hypot(x-w.land.x,z-w.land.z)<w.land.r*1.1)continue;
    w.props.push({x,z,s:pr.s[0]+rand()*(pr.s[1]-pr.s[0]),yaw:rand()*PI*2})
  }
}
function buildWorld(w,origin){
  const G=groundAssault,d=w.def,rand=Math.random;
  G.units.length=0;G.groups.length=0;G.trees.length=0;G.state='promo';
  w.path={x:origin.x,z:origin.z,h:origin.h,v:(d.herd||d.crit).v,turn:d.turn??.012};
  // The landmark: beside the herd's path where it will be at u = at.
  if(d.land){const L=d.land,c=pathAt(w,L.at),{F,R}=frameOf(c.h),s=w.def.mirror?-1:1;
    w.land={...L,x:c.x+R[0]*L.side*s+F[0]*L.ahead,z:c.z+R[1]*L.side*s+F[1]*L.ahead,yaw:(L.yaw||0)+c.h,top:L.top||25*L.s};
    if(L.many)w.extra=L.many.map(([sd,ah,sc])=>({x:c.x+R[0]*sd*s+F[0]*ah,z:c.z+R[1]*sd*s+F[1]*ah,s:sc,yaw:rand()*6.3}))}
  // The ground: this world's roll, levelled under the landmark.
  const amp=d.amp,base=Object.getPrototypeOf(G).rawDune;
  G.flats=(G.flats||[]).filter(f=>!f.promo);if(w.land&&w.land.r)G.flats.push({x:w.land.x,z:w.land.z,r0:w.land.r,r1:w.land.r+35,promo:true});
  G.rawDune=function(x,z){return base.call(this,x,z)*amp};G.hCache.clear();
  scatter(w,rand);
  const grp={name:'HERD',letter:'H',cx:1e7,cwz:1e7,navX:1e7,navWZ:1e7,radius:1,cleared:false,ids:[]};
  w.slots=[];
  const sp=(d.herd||d.crit).space||1,slot=(i,n)=>{const row=Math.floor(i/3),col=i%3-1;return{r:(col*3.2+(rand()-.5)*1.4+(row%2)*1.2)*sp,f:(-row*5.5+(rand()-.5)*2)*sp}};
  if(d.herd){
    const list=[...Array(d.herd.n).fill(d.herd.kind),...(d.herd.mix?Array(d.herd.mix.n).fill(d.herd.mix.kind):[])];
    list.forEach((kind,i)=>{const sl=slot(i,list.length),c=pathAt(w,0),{F,R}=frameOf(c.h),x=c.x+R[0]*sl.r+F[0]*sl.f,z=c.z+R[1]*sl.r+F[1]*sl.f;
      const u=G.spawn(kind,x,z,c.h,grp);u.teaser=sl;u.speed=w.path.v;u.tint=d.herd.tints?.[i]||null;grp.ids.push(u.id)});
    G.groups.push(grp)
  }
  if(d.crit){w.crits=[];for(let i=0;i<d.crit.n;i++){const sl=slot(i,d.crit.n);w.crits.push({...sl,ph:rand(),rate:.9+rand()*.25,x:0,z:0,h:w.path.h,slide:d.crit.type==='penguin'&&i%4===3})}}
  w.built=true
}

// ---------- The scenes ----------
const scenes=WORLDS.map((def,i)=>{
  const w={name:def.name,t0:i===0?0:T[def.name],seed:def.seed,def,built:false,
    setup(){
      D.snow=false;w.built=false;w.crits=null;w.land=null;w.extra=null;
      launch(m=>{
        m.planetaryRequirements={landingBody:'planet',landingColour:{[C.g]:'green',[C.o]:'orange',[C.y]:'yellow',[C.u]:'blue',[C.c]:'cyan'}[def.col]||'green',moonCount:{min:1,max:2}};
        m.modules=m.modules.filter(x=>(i===0&&x.type==='planet_descent')||x.type==='dune_assault')
      });
      planetRings=null;planetLandingColour=def.col;
      if(i>0)buildWorld(w,{x:shipX,z:travel+30,h:viewYaw});
    },
    // The first world: the game's own descent, until the drone is down on the surface.
    marks:i===0?[{ev:'surface',at:T.england-.4}]:null,
    event(){return groundAssault?.active&&mode==='play'&&phase==='surface'?'surface':null},
    pilot(dt,t){
      if(!(groundAssault?.active&&phase==='surface'))return;
      if(!w.built){const yaw=viewYaw;buildWorld(w,{x:shipX+Math.sin(yaw)*34,z:travel+Math.cos(yaw)*34,h:yaw+.12});w.from={x:shipX,y:shipY,z:travel,yaw:viewYaw,pitch:viewPitch,t}}
      inputX=inputY=0
    },
    overlay(t){drawFade(w,t)}
  };
  w.u=t=>t-(i===0?T.england:w.t0);
  return w
});
const byName=Object.fromEntries(scenes.map(s=>[s.name,s]));
const teaserScene=()=>scenes.includes(D.scene)?D.scene:null;

// The camera owns the view: after the game's own steering, every frame.
const gameSteer=groundAssault.updateSteering.bind(groundAssault);
groundAssault.updateSteering=function(dt,mx,my){
  const r=gameSteer(dt,mx,my),w=teaserScene();
  if(!w||!w.built||mode!=='play')return r;
  const u=w.u(D.clock),c=liftOff(w,u)||cameraAt(w,u);
  let b=1;if(w.from)b=ease(D.clock,w.from.t,w.from.t+1.8);
  const f=w.from||c;
  shipX=lerp(f.x,c.x,b);shipY=lerp(f.y,c.y,b);travel=lerp(f.z,c.z,b);
  const yaw=wrapAngle(f.yaw+wrapAngle(c.yaw-f.yaw)*b);
  const turn=w.lastYaw==null?0:wrapAngle(yaw-w.lastYaw);w.lastYaw=yaw;
  viewYaw=yaw;viewPitch=lerp(f.pitch,c.pitch,b);viewRoll=moveToward(viewRoll,clamp(-turn*5,-.12,.12),dt*.8);
  this.spd=0;surfaceVY=0;return r
};
// Antarctica's last part: the drone climbs away, pitching up into the stars.
function liftOff(w,u){
  if(w.name!=='antarctica')return null;const L=T['lift-off']-w.t0;if(u<L)return null;
  // Rise straight up over the colony looking down on it, then tip back into the stars.
  const base=cameraAt(w,L),k=u-L,up=Math.pow(k,1.6)*2.6,c=pathAt(w,u);
  const x=base.x,z=base.z,y=base.y+up,cy=ground(c.x,c.z)+.8;
  const yawC=Math.atan2(c.x-x,c.z-z),pitchC=Math.atan2(y-cy,Math.max(1,Math.hypot(c.x-x,c.z-z)));
  const a=ease(k,0,1.6),yaw=wrapAngle(base.yaw+wrapAngle(yawC-base.yaw)*a);
  const pitch=k<3.6?lerp(base.pitch,pitchC,a):lerp(pitchC,-1.1,ease(k,3.6,7.6));
  return{x,y,z,yaw,pitch}
}

// The herd: every animal keeps its place on the path, galloping to catch up when behind.
const gameThink=groundAssault.think.bind(groundAssault);
groundAssault.think=function(un,dt){
  const w=teaserScene();if(!un.teaser||!w||!w.path)return gameThink(un,dt);
  const u=w.u(D.clock),c=pathAt(w,u+.5),{F,R}=frameOf(c.h),sl=un.teaser;
  const tx=c.x+R[0]*sl.r+F[0]*sl.f,tz=c.z+R[1]*sl.r+F[1]*sl.f,want=Math.atan2(tx-un.x,tz-un.wz),dist=Math.hypot(tx-un.x,tz-un.wz);
  un.h=wrapAngle(un.h+clamp(wrapAngle(want-un.h),-1.8*dt,1.8*dt));un.aggro=false;un.fireCD=99;
  un.speed=moveToward(un.speed,clamp(w.path.v+(dist-w.path.v*.5)*.9,w.path.v*.4,w.path.v*1.5),dt*5)
};
const gameDrawUnit=groundAssault.drawUnit.bind(groundAssault),coloured=new WeakSet();
groundAssault.drawUnit=function(un){
  if(!un.teaser)return gameDrawUnit(un);
  this.pose(un);
  if(!coloured.has(un.mesh)){const b=gaBuilder(true);this.emit(b,un);un.mesh.edgeColors=P.edgeColours(b,M.kindColours(un.kind,b));coloured.add(un.mesh)}
  const dist=this.planarToShip(un),haze=clamp((GA_UNIT_SIGHT-dist)/40,0,1),depth=camPoint([un.x,this.ug(un),un.wz-travel])[2];
  drawMesh({x:un.x,y:this.ug(un),z:un.wz-travel,s:un.s,rot:[0,un.h+PI,0],fadeZ:Math.max(0,depth)*.8},un.mesh,un.tint||un.K.col,haze)
};

// No game HUD on the surface (the altimeter and nav labels).
const gameMarker=groundAssault.drawMarker.bind(groundAssault);
groundAssault.drawMarker=function(){if(teaserScene())return;return gameMarker()};

// ---------- Kangaroos and penguins ----------
function moveCrits(w,dt){
  if(!w.crits)return;const u=w.u(D.clock),d=w.def.crit;
  for(const k of w.crits){const c=pathAt(w,u),{F,R}=frameOf(c.h);
    k.x=c.x+R[0]*k.r+F[0]*(k.f+(k.slide?Math.min(9,u*.8):0));k.z=c.z+R[1]*k.r+F[1]*(k.f+(k.slide?Math.min(9,u*.8):0));k.h=c.h+(d.type==='penguin'?Math.sin(u*1.3+k.ph*6)*.12:0);
    k.ph=(k.ph+dt*(d.type==='kangaroo'?1.7*k.rate:1.6*k.rate))%1}
}
function drawCrit(w,k){
  const d=w.def.crit,gy=ground(k.x,k.z),z=k.z-travel;
  if(d.type==='kangaroo'){M.kangaroo.pose({u:k.ph});drawMesh({x:k.x,y:gy+M.hopH(k.ph)*d.s,z,s:d.s,rot:[0,k.h+PI,0]},M.kangaroo,d.col,1);return}
  const wph=k.ph*PI*2;
  if(k.slide){M.penguin.pose({w:0});drawMesh({x:k.x,y:gy+.35*d.s,z,s:d.s,rot:[-1.35,k.h+PI,0]},M.penguin,d.col,1);return}
  M.penguin.pose({w:wph});drawMesh({x:k.x,y:gy,z,s:d.s,rot:[0,k.h+PI,Math.sin(wph)*.2]},M.penguin,d.col,1)
}

// ---------- Landmarks, props, aurora: into the game's depth-sorted scene ----------
const gameTrees=groundAssault.appendTrees.bind(groundAssault);
groundAssault.appendTrees=function(scene){
  gameTrees(scene);const w=teaserScene();if(!w||!w.built)return;
  const put=(x,z,mesh,col,s,yaw,top,sight,alpha=1)=>{
    const dist=Math.hypot(x-shipX,z-travel);if(dist>sight)return;
    const gy=ground(x,z),q=camPoint([x,gy+top*.4,z-travel]);if(q[2]<-top)return;
    const haze=clamp((sight-dist)/(sight*.3),0,1)*alpha;
    scene.push({z:Math.max(.3,q[2]),draw:()=>drawMesh({x,y:gy-.15,z:z-travel,s,rot:[0,yaw,0],fadeZ:Math.max(0,q[2])*.7},mesh,col,haze)})};
  if(w.land)put(w.land.x,w.land.z,w.land.mesh,w.land.col,w.land.s,w.land.yaw,w.land.top,w.land.mesh===M.kilimanjaro?900:520,.95);
  for(const e of w.extra||[])put(e.x,e.z,w.land.mesh,w.land.col,e.s,e.yaw,12*e.s,420,.9);
  const pr=w.def.props;for(const p of w.props||[])put(p.x,p.z,pr.mesh,pr.col,p.s,p.yaw,5*p.s,150,.9);
  for(const k of w.crits||[]){const q=camPoint([k.x,ground(k.x,k.z)+1,k.z-travel]);if(q[2]>.4&&q[2]<150)scene.push({z:q[2],draw:()=>drawCrit(w,k)})}
  if(w.def.aurora)scene.push({z:1e5,draw:()=>drawAurora(w)})
};
const gameUpdateGA=groundAssault.update?.bind(groundAssault);
if(gameUpdateGA)groundAssault.update=function(dt){const r=gameUpdateGA(dt);const w=teaserScene();if(w&&w.built)moveCrits(w,dt);return r};

// The aurora: green and cyan curtains hanging over the ice, rippling slowly.
function drawAurora(w){
  const t=D.clock;ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;
  for(let band=0;band<2;band++)for(let i=0;i<70;i++){
    const az=w.path.h-.9+i*.026+band*.12,el0=.1+band*.05+Math.sin(i*.31+t*.4+band)*.03,el1=el0+.12+.07*Math.sin(i*.17-t*.6+band*2);
    const dir=(el)=>[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)],R=3000;
    const a=dir(el0),b=dir(el1),pa=proj([shipX+a[0]*R,shipY+a[1]*R,a[2]*R]),pb=proj([shipX+b[0]*R,shipY+b[1]*R,b[2]*R]);
    if(!pa||!pb)continue;
    ctx.globalAlpha=(.3+.2*Math.sin(i*.5+t*1.3+band))*(band?.7:1);ctx.strokeStyle=band?C.c:C.g;
    ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke()}
  ctx.restore()
}

// ---------- Fades between worlds, and the starfield at the end ----------
const STARS=(()=>{let s=1234567;const r=()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0)>>>0)/4294967296;
  return Array.from({length:1800},()=>{const z=r()*2-1,a=r()*PI*2,k=Math.sqrt(1-z*z);return{d:[Math.cos(a)*k,z,Math.sin(a)*k],b:.25+r()*.75,tw:r()*6.3}})})();
function drawStars(alpha){
  if(alpha<=0)return;ctx.save();const R=2000;
  for(const s of STARS){const p=proj([shipX+s.d[0]*R,shipY+s.d[1]*R,s.d[2]*R]);if(!p||p.x<0||p.x>W||p.y<0||p.y>viewH)continue;
    const sz=s.b>.93?2.8:s.b>.7?2:1.4;ctx.globalAlpha=Math.min(1,alpha*(.35+s.b)*(.85+.15*Math.sin(D.clock*2+s.tw)));ctx.fillStyle=s.b>.95?C.c:C.w;ctx.fillRect(p.x-sz/2,p.y-sz/2,sz,sz)}
  ctx.restore()
}
function black(a){if(a<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,a);ctx.fillStyle='#000';ctx.fillRect(-20,-20,W+40,H+40);ctx.restore()}
function drawFade(w,t){
  const idx=scenes.indexOf(w),next=scenes[idx+1];
  // Out of each world into black over its last half second, in from black over the first.
  if(idx>0)black(1-ease(t,w.t0,w.t0+.55));
  if(next)black(ease(t,next.t0-.45,next.t0));
  if(w.name==='antarctica'){const L=T['lift-off'];black(ease(t,L+6,L+9.5));drawStars(ease(t,L+4.5,L+9.5)*(1-ease(t,T.end+3.5,PROMO_SONG.length-.3)))}
}
// Once the world has faded out to the stars, the drone's guns go too.
const gameDrawGun=window.drawGun;
window.drawGun=function(g){const w=teaserScene();if(w&&w.name==='antarctica'&&D.clock>T['lift-off']+7.5)return;return gameDrawGun(g)};
D.drawTitles=t=>{
  const a=D.window01(t,1.2,9.6,1.2);
  if(a>0){D.vtext('Vector Space',W*.5,viewH*.16,Math.round(W/22),C.g,a);D.vtext('Agent X',W*.5,viewH*.16+W/22,Math.round(W/40),C.w,a*.9)}
};

D.scenes.push(...scenes);
D.T.videoEnd=PROMO_SONG.length;
globalThis.TeaserScenes={scenes,byName,cameraAt,pathAt,WORLDS};
})();
