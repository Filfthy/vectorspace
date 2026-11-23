'use strict';
// The teaser: one unbroken run across one world to "Stampede Across the Stars".
// The drone comes down through the titles, lands, and then flies herd to herd along a single
// long route with no cuts: horses, kangaroos, camels, elephants, giraffes and zebras, llamas,
// bison, and penguins under an aurora. The ground's colour and roll shift gradually from herd
// to herd; a few landmarks stand far off the route (Stonehenge, Uluru, the pyramids...).
// Then the lift-off over the penguins and the fade to the stars.
//   0:00 titles and the descent   0:14 horses     0:35 kangaroos   0:56 camels
//   1:18 elephants   1:39 giraffes and zebras   2:00 llamas   2:21 bison   2:43 penguins
//   2:57 lift-off, and the stars
(()=>{
const D=globalThis.PromoDirector;if(!D||!PROMO_SONG.teaser)return;
const T=D.T,M=globalThis.TeaserModels,P=globalThis.PromoModels,PI=Math.PI;
const smooth=u=>u*u*(3-2*u),ease=(t,a,b)=>smooth(clamp((t-a)/(b-a),0,1));
const LIFT=T['lift-off'];

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

// ---------- The herds, in the order the route meets them ----------
// K scales the camera's distances to the animals' size. amp is the ground's roll there.
// Each herd's landmark stands far out on the side away from the camera (dist from the route).
const HERDS=[
  {sec:'england',kind:'horse',n:7,v:11,tints:[C.o,C.w,C.y,C.o,C.o,C.w,C.y],ground:C.g,amp:.55,rock:C.w,K:1,
    land:{mesh:M.stonehenge,col:C.w,s:2.4,dist:210,foot:[[0,0,15],[2,-28,4]]}},
  {sec:'australia',crit:'kangaroo',n:7,v:9.5,critCol:C.o,critS:1.3,ground:C.o,amp:.35,rock:C.y,K:1,
    land:{mesh:M.uluru,col:C.r,s:1.4,dist:240,yaw:PI/2,foot:[[-30,0,17],[0,0,19],[30,0,17]]}},
  {sec:'egypt',kind:'camel',n:6,v:5.5,space:1.4,ground:C.y,amp:1.1,rock:C.o,K:1.2,lookY:2.5,
    land:{mesh:M.giza,col:C.w,s:1.15,dist:290,yaw:.5,foot:[[0,0,30],[-46,30,28],[-78,58,15],[-86,74,9],[30,-38,10]]}},
  {sec:'india',kind:'elephant',n:5,v:3.6,space:2,ground:C.u,amp:.3,rock:C.w,K:1.5,lookY:2.4,
    land:{mesh:M.taj,col:C.w,s:1.3,dist:280,yaw:-PI/2,foot:[[0,0,28],[0,-50,9],[0,-72,9]]}},
  {sec:'kenya',kind:'giraffe',n:4,mix:{kind:'zebra',n:6},v:6.5,space:1.5,ground:C.o,amp:.35,rock:C.y,K:1.3,lookY:3,
    land:{mesh:M.kilimanjaro,col:C.u,s:1.4,dist:500,sight:420,foot:[[0,0,170]]}},
  {sec:'peru',kind:'llama',n:7,v:4.6,space:1.2,ground:C.g,amp:.9,rock:C.w,K:1.2,
    land:{mesh:M.machuPicchu,col:C.g,s:1.3,dist:270,yaw:PI,foot:[[0,-6,64],[2,34,34]]}},
  {sec:'usa',kind:'bison',n:12,v:11,space:1.25,ground:C.y,amp:.45,rock:C.o,K:1.15,
    land:{mesh:M.monumentValley,col:C.o,s:1.4,dist:310,yaw:.2,foot:[[-48,0,30],[10,12,30],[72,-10,42]]}},
  {sec:'antarctica',crit:'penguin',n:11,v:1.3,walk:.8,space:.6,critCol:C.w,critS:1.25,ground:C.c,amp:.25,rock:C.w,K:.8,lookY:.9,aurora:true,
    bergs:[[140,25,1.4],[-160,70,1.8],[180,130,2],[-200,10,2.2],[150,-60,1.6],[-170,-110,1.8]]},
];
HERDS.forEach((H,i)=>{H.i=i;H.T=T[H.sec];H.Tn=i<HERDS.length-1?T[HERDS[i+1].sec]:Infinity;H.side=i%2?1:-1;H.walk=H.walk??Math.min(1.2,H.v*.25)});

// The herd's speed: a slow walk until its turn, up to full speed as the camera arrives,
// on until the camera has left for the next herd, then easing to a stop.
function speedAt(H,t){
  if(H.fixedV!=null)return H.fixedV;
  if(t<H.T-3)return H.walk;
  if(t<H.T-1)return lerp(H.walk,H.v,smooth((t-H.T+3)/2));
  if(t<H.Tn+2)return H.v;
  if(t<H.Tn+5)return H.v*(1-smooth((t-H.Tn-2)/3));
  return 0
}

// ---------- The route ----------
// A long straight line with a gentle sway. s is the distance along it, l the offset to the right.
let run=null;
const SWAY=14,SWAY_L=240;
function routeAt(s){const R=run,X=SWAY*R.sway*Math.sin(s/SWAY_L),dX=SWAY*R.sway/SWAY_L*Math.cos(s/SWAY_L),h=R.H0+Math.atan(dX);
  return{x:R.O.x+R.F0[0]*s+R.R0[0]*X,z:R.O.z+R.F0[1]*s+R.R0[1]*X,h}}
const frameOf=h=>({F:[Math.sin(h),Math.cos(h)],R:[Math.cos(h),-Math.sin(h)]});
function worldAt(s,l){const c=routeAt(s),{R}=frameOf(c.h);return{x:c.x+R[0]*l,z:c.z+R[1]*l,h:c.h}}
const sOf=(x,z)=>(x-run.O.x)*run.F0[0]+(z-run.O.z)*run.F0[1];
const ground=(x,z)=>GA_GROUND_Y+groundAssault.groundH(x,z);
// Where a herd's centre is along the route at song time t (a precomputed table of its speed).
const DT_TAB=.05;
function tabulate(H){
  const n=Math.ceil((PROMO_SONG.length+8)/DT_TAB)+2,cum=new Float64Array(n);
  for(let k=1;k<n;k++)cum[k]=cum[k-1]+speedAt(H,(k-.5)*DT_TAB)*DT_TAB;H.cum=cum
}
function cumAt(H,t){const f=clamp(t/DT_TAB,0,H.cum.length-1.001),k=Math.floor(f);return lerp(H.cum[k],H.cum[k+1],f-k)}
function sAt(H,t){return H.fixedV!=null?H.anchor+H.fixedV*(t-H.t0):H.anchor+cumAt(H,t)-cumAt(H,H.T)}

// ---------- The camera ----------
// Keys per herd: [u (s from the herd's turn), side (out from the herd, on its camera side),
// along (+ ahead of its centre), height, look ahead of the centre]. It comes up behind the herd,
// runs along its flank, gets a little ahead and falls back level with it as it thunders past.
const KEYS=[[0,9,-30,5,8],[5,11,-12,3.2,5],[10,12,2,2.6,3],[15,13,14,2.8,0],[19.5,16,6,3.6,4]];
function camKey(keys,u){
  const n=keys.length;if(u<=keys[0][0])return keys[0].slice(1);if(u>=keys[n-1][0])return keys[n-1].slice(1);
  let i=0;while(i<n-2&&u>keys[i+1][0])i++;
  const k0=keys[Math.max(0,i-1)],k1=keys[i],k2=keys[i+1],k3=keys[Math.min(n-1,i+2)],t=(u-k1[0])/(k2[0]-k1[0]),t2=t*t,t3=t2*t;
  return k1.slice(1).map((_,j)=>{const p0=k0[j+1],p1=k1[j+1],p2=k2[j+1],p3=k3[j+1];return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)})
}
function look(x,y,z,tx,ty,tz){return{x,y,z,yaw:Math.atan2(tx-x,tz-z),pitch:Math.atan2(y-ty,Math.hypot(tx-x,tz-z))}}
// Height over a smoothed ground, so the camera never jolts over a ridge.
function camGround(x,z){let g=0;for(const[a,b]of[[0,0],[4,0],[-4,0],[0,4],[0,-4]])g+=ground(x+a,z+b);return g/5}
function herdCam(H,t){
  const s=sAt(H,t),c=routeAt(s),{F,R}=frameOf(c.h),ty=ground(c.x,c.z)+(H.lookY||1.8);
  if(run.studio){const S=run.studio,x=c.x+R[0]*S.side+F[0]*S.along,z=c.z+R[1]*S.side+F[1]*S.along;return look(x,ground(x,z)+S.h,z,c.x,ground(c.x,c.z)+(S.lookY||1.6),c.z)}
  const K=H.K,[sd,al,hh,lf]=camKey(KEYS,t-H.T),side=sd*K*H.side,along=al*K;
  const x=c.x+R[0]*side+F[0]*along,z=c.z+R[1]*side+F[1]*along;
  return look(x,camGround(x,z)+hh*Math.sqrt(K),z,c.x+F[0]*lf*K,ty,c.z+F[1]*lf*K)
}
// Between herds the camera lifts and flies on to the next one, turning to it as it goes.
const FLY0=3.2,FLY1=1.3;
function cameraAt(t){
  const Hs=run.herds;let i=0;while(i<Hs.length-1&&t>=Hs[i+1].T+FLY1)i++;
  const a=herdCam(Hs[i],t);if(i>=Hs.length-1||t<=Hs[i+1].T-FLY0)return a;
  const b=ease(t,Hs[i+1].T-FLY0,Hs[i+1].T+FLY1),c=herdCam(Hs[i+1],t),arc=Math.sin(PI*b);
  const by=ease(t,Hs[i+1].T-FLY0,Hs[i+1].T-FLY0+(FLY0+FLY1)*.6);
  return{x:lerp(a.x,c.x,b),y:lerp(a.y,c.y,b)+4.5*arc,z:lerp(a.z,c.z,b),yaw:a.yaw+wrapAngle(c.yaw-a.yaw)*by,pitch:lerp(a.pitch,c.pitch,by)+.06*arc}
}
// The end: the drone climbs straight up over the penguins, looking down on them, then tips
// back into the stars.
function liftOff(t){
  if(run.studio||t<LIFT)return null;
  const H=run.herds[run.herds.length-1],base=cameraAt(LIFT),k=t-LIFT,up=Math.pow(k,1.6)*2.6,c=routeAt(sAt(H,t));
  const x=base.x,z=base.z,y=base.y+up,cy=ground(c.x,c.z)+.8;
  const yawC=Math.atan2(c.x-x,c.z-z),pitchC=Math.atan2(y-cy,Math.max(1,Math.hypot(c.x-x,c.z-z)));
  const a=ease(k,0,1.6),yaw=wrapAngle(base.yaw+wrapAngle(yawC-base.yaw)*a);
  const pitch=k<3.6?lerp(base.pitch,pitchC,a):lerp(pitchC,-1.1,ease(k,3.6,7.6));
  return{x,y,z,yaw,pitch}
}

// ---------- The ground: its roll and colour change gently from herd to herd ----------
const hex=c=>[1,3,5].map(k=>parseInt(c.slice(k,k+2),16));
function mixCol(a,b,t){if(t<=0)return a;if(t>=1)return b;const A=hex(a),B=hex(b),m=A.map((v,k)=>lerp(v,B[k],t)),top=Math.max(...m)||1;
  return'#'+m.map(v=>Math.round(v*255/top).toString(16).padStart(2,'0')).join('')}
function groundColourAt(t){let c=run.herds[0].ground;for(const H of run.herds.slice(1))c=mixCol(c,H.ground,ease(t,H.T-FLY0,H.T+FLY1));return c}
function ampAt(x,z){
  if(!run||!run.bounds)return HERDS[0].amp;const s=sOf(x,z);let a=run.herds[0].amp;
  for(let k=1;k<run.herds.length;k++)a=lerp(a,run.herds[k].amp,smooth(clamp((s-run.bounds[k]+30)/60,0,1)));
  return a
}
function zoneOf(s){let k=0;while(k<run.herds.length-1&&s>=run.bounds[k+1])k++;return k}
const baseDune=()=>Object.getPrototypeOf(groundAssault).rawDune;
function terrainOn(){const G=groundAssault,base=baseDune();G.rawDune=function(x,z){return base.call(this,x,z)*ampAt(x,z)};G.hCache.clear()}

// ---------- Building the run ----------
function buildRun(origin,opt={}){
  const G=groundAssault,rand=Math.random;
  G.units.length=0;G.groups.length=0;G.trees.length=0;G.state='promo';
  G.flats=(G.flats||[]).filter(f=>!f.promo);
  run={O:{x:origin.x,z:origin.z},H0:origin.h,F0:[Math.sin(origin.h),Math.cos(origin.h)],R0:[Math.cos(origin.h),-Math.sin(origin.h)],
    sway:opt.studio?0:1,studio:opt.studio||null,herds:opt.herds||HERDS.map(H=>({...H})),lands:[],bergs:[]};
  const Hs=run.herds;
  for(const H of Hs){H.live=false;H.units=[];H.crits=null;if(H.fixedV==null)tabulate(H)}
  // Each herd starts a gap ahead of where the last one is when its turn comes.
  if(opt.studio){Hs[0].anchor=30;Hs[0].t0=D.clock;Hs[0].spawnAt=-1e9;Hs[0].removeAt=1e9}
  else Hs.forEach((H,i)=>{
    H.anchor=i?sAt(Hs[i-1],H.T)+45+30*H.K+6*Hs[i-1].K:40;
    H.spawnAt=i<2?-1e9:Hs[i-1].T-1;H.removeAt=H.Tn+6});
  run.bounds=Hs.map((H,i)=>i?sAt(H,H.T)-30*H.K-25:-1e9);
  // The landmarks: far out on the side away from the camera, where the herd is mid-run.
  if(!opt.studio)for(const H of Hs){
    if(H.land){const L=H.land,s=sAt(H,H.T+12)+40,p=worldAt(s,-H.side*L.dist),yaw=(L.yaw||0)+p.h;
      const e={mesh:L.mesh,col:L.col,s:L.s,x:p.x,z:p.z,yaw,top:L.top||25*L.s,sight:L.sight||430,ext:0};
      const ca=Math.cos(yaw),sa=Math.sin(yaw);
      for(const[fx,fz,fr]of(L.foot||[])){const x=fx*L.s,z=fz*L.s;e.ext=Math.max(e.ext,(Math.hypot(fx,fz)+fr)*L.s*.8);G.flats.push({x:e.x+x*ca+z*sa,z:e.z-x*sa+z*ca,r0:fr*L.s,r1:fr*L.s+30,promo:true})}
      e.keep=Math.max(e.ext,40)+20;run.lands.push(e)}
    for(const[l,ds,sc]of H.bergs||[]){const p=worldAt(sAt(H,H.T)+ds,l);run.bergs.push({mesh:M.iceberg,col:C.w,s:sc,x:p.x,z:p.z,yaw:rand()*6.3,top:12*sc,sight:430,ext:11*sc,keep:11*sc+12});
      G.flats.push({x:p.x,z:p.z,r0:11*sc,r1:11*sc+22,promo:true})}
  }
  terrainOn();
  if(!opt.studio)scatterRocks(rand);
  run.built=true
}
// Rocks all along the route, both sides, coloured for each stretch; never in the herds' lane,
// on a landmark, or anywhere the camera flies.
function scatterRocks(rand){
  const G=groundAssault,Hs=run.herds;let rockLo=1e9;for(const v of asteroidMesh.v)rockLo=Math.min(rockLo,v[1]);
  const cams=new Map(),key=(x,z)=>Math.floor(x/12)+','+Math.floor(z/12);
  for(let t=Hs[0].T-4;t<LIFT+1;t+=.2){const c=cameraAt(t),k=key(c.x,c.z);(cams.get(k)||cams.set(k,[]).get(k)).push(c)}
  const nearCam=(x,z,r)=>{const i=Math.floor(x/12),j=Math.floor(z/12);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const c of cams.get((i+a)+','+(j+b))||[])if(Math.hypot(c.x-x,c.z-z)<r)return true;return false};
  const s0=Hs[0].anchor-90,s1=sAt(Hs[Hs.length-1],LIFT)+160;
  const rock=(s,l,sz)=>{
    const p=worldAt(s,l),mx=1.05+rand()*1.25,my=.45+rand()*.62,mz=.95+rand()*1.1,bury=.12+rand()*.18,r=sz*Math.max(mx,mz)*.85;
    if(nearCam(p.x,p.z,10+r))return;
    for(const e of[...run.lands,...run.bergs])if(Math.hypot(p.x-e.x,p.z-e.z)<e.keep+r)return;
    G.trees.push({kind:'rock',mesh:asteroidMesh,x:p.x,wz:p.z,s:sz,mx,my,mz,bury,base:rockLo,col:Hs[zoneOf(s)].rock,rot:[(rand()-.5)*.28,rand()*6.28,(rand()-.5)*.24],r,top:sz*my*(1-bury)*.9})};
  for(let s=s0;s<s1;s+=10)for(const sg of[-1,1]){
    if(rand()<.8)rock(s+(rand()-.5)*8,sg*(13+rand()*45),.9+rand()*2.3);
    if(rand()<.4)rock(s+(rand()-.5)*8,sg*(58+rand()*60),1.4+rand()*3)}
}
// The herds come and go as the run needs them: each one appears out of sight ahead while the
// camera is still on the one before it, and goes once the camera has left it.
function slotOf(H,i,rand){const sp=H.space||1,row=Math.floor(i/3),col=i%3-1,rows=Math.ceil((H.n+(H.mix?.n||0))/3);
  return{r:(col*3.2+(rand()-.5)*1.4+(row%2)*1.2)*sp,f:((rows-1)*2.75-row*5.5+(rand()-.5)*2)*sp,ph1:rand()*6.3,ph2:rand()*6.3}}
function spawnHerd(H,t){
  const G=groundAssault,rand=Math.random;H.live=true;
  const c=routeAt(sAt(H,t)),{F,R}=frameOf(c.h);
  if(H.kind){
    const grp={name:'HERD',letter:'H',cx:1e7,cwz:1e7,navX:1e7,navWZ:1e7,radius:1,cleared:false,ids:[]};H.grp=grp;
    const list=[...Array(H.n).fill(H.kind),...(H.mix?Array(H.mix.n).fill(H.mix.kind):[])];
    list.forEach((kind,i)=>{const sl=slotOf(H,i,rand),x=c.x+R[0]*sl.r+F[0]*sl.f,z=c.z+R[1]*sl.r+F[1]*sl.f;
      const u=G.spawn(kind,x,z,c.h,grp);u.teaser={...sl,H};u.speed=speedAt(H,t);u.tint=H.tints?.[i]||null;grp.ids.push(u.id);H.units.push(u)});
    G.groups.push(grp)
  }
  if(H.crit){H.crits=[];for(let i=0;i<H.n;i++)H.crits.push({...slotOf(H,i,rand),ph:rand(),rate:.9+rand()*.25,x:0,z:0,h:c.h})}
}
function removeHerd(H){const G=groundAssault;H.live=false;
  if(H.units.length){const gone=new Set(H.units);G.units=G.units.filter(u=>!gone.has(u));G.groups=G.groups.filter(g=>g!==H.grp);H.units=[]}
  H.crits=null}
function herdsTick(t){for(const H of run.herds){if(!H.live&&t>=H.spawnAt&&t<H.removeAt)spawnHerd(H,t);else if(H.live&&t>=H.removeAt)removeHerd(H)}}

// ---------- The scene ----------
const scene={name:'run',t0:0,seed:301,
  setup(){
    D.snow=false;run=null;scene.from=null;scene.lastYaw=null;
    launch(m=>{
      m.planetaryRequirements={landingBody:'planet',landingColour:'green',moonCount:{min:1,max:2}};
      m.modules=m.modules.filter(x=>x.type==='planet_descent'||x.type==='dune_assault')
    });
    planetRings=null;planetLandingColour=C.g;
    terrainOn()
  },
  // The game's own descent, until the drone is down on the surface.
  marks:[{ev:'surface',at:T.england-.4}],
  event(){return groundAssault?.active&&mode==='play'&&phase==='surface'?'surface':null},
  pilot(dt,t){
    if(!(groundAssault?.active&&phase==='surface'))return;
    if(!run||!run.built){const yaw=viewYaw;buildRun({x:shipX,z:travel,h:yaw});scene.from={x:shipX,y:shipY,z:travel,yaw:viewYaw,pitch:viewPitch,t}}
    herdsTick(t);inputX=inputY=0
  },
  overlay(t){
    black(ease(t,LIFT+6,LIFT+9.5));drawStars(ease(t,LIFT+4.5,LIFT+9.5)*(1-ease(t,T.end+3.5,PROMO_SONG.length-.3)))
  }
};
const ours=new Set([scene]);
const teaserScene=()=>ours.has(D.scene)?D.scene:null;
const active=()=>teaserScene()&&run&&run.built;

// The camera owns the view: after the game's own steering, every frame.
const gameSteer=groundAssault.updateSteering.bind(groundAssault);
groundAssault.updateSteering=function(dt,mx,my){
  const r=gameSteer(dt,mx,my),w=teaserScene();
  if(!w||!active()||mode!=='play')return r;
  const t=D.clock,c=liftOff(t)||cameraAt(t);
  let b=1;if(w.from)b=ease(t,w.from.t,w.from.t+1.8);
  const f=w.from||c;
  shipX=lerp(f.x,c.x,b);shipY=lerp(f.y,c.y,b);travel=lerp(f.z,c.z,b);
  const yaw=wrapAngle(f.yaw+wrapAngle(c.yaw-f.yaw)*b);
  const turn=w.lastYaw==null?0:wrapAngle(yaw-w.lastYaw);w.lastYaw=yaw;
  viewYaw=yaw;viewPitch=lerp(f.pitch,c.pitch,b);viewRoll=moveToward(viewRoll,clamp(-turn*5,-.12,.12),dt*.8);
  if(!run.studio)this.groundCol=groundColourAt(t);
  this.spd=0;surfaceVY=0;return r
};

// The herd: every animal keeps its place in the herd, galloping to catch up when behind,
// and drifting slowly about its place at its own rhythm.
const gameThink=groundAssault.think.bind(groundAssault);
groundAssault.think=function(un,dt){
  if(!un.teaser||!active())return gameThink(un,dt);
  const sl=un.teaser,H=sl.H,t=D.clock,v=speedAt(H,t),c=routeAt(sAt(H,t+.5)),{F,R}=frameOf(c.h);
  const sp=H.space||1,k=clamp(v/4,.2,1),dr=Math.sin(t*.42+sl.ph1)*.8*sp*k,df=(Math.sin(t*.29+sl.ph2)*1.8+Math.sin(t*1.1+sl.ph1*2)*.35)*sp*k;
  const tx=c.x+R[0]*(sl.r+dr)+F[0]*(sl.f+df),tz=c.z+R[1]*(sl.r+dr)+F[1]*(sl.f+df),dist=Math.hypot(tx-un.x,tz-un.wz);
  un.aggro=false;un.fireCD=99;
  if(v<.3&&dist<1.5){un.h=wrapAngle(un.h+clamp(wrapAngle(c.h-un.h),-.6*dt,.6*dt));un.speed=moveToward(un.speed,0,dt*4);return}
  const want=Math.atan2(tx-un.x,tz-un.wz);
  un.h=wrapAngle(un.h+clamp(wrapAngle(want-un.h),-1.8*dt,1.8*dt));
  un.speed=moveToward(un.speed,clamp(v+(dist-v*.5)*.9,0,Math.max(v*1.5,3)),dt*5)
};
const gameDrawUnit=groundAssault.drawUnit.bind(groundAssault),coloured=new WeakSet();
groundAssault.drawUnit=function(un){
  if(!un.teaser)return gameDrawUnit(un);
  this.pose(un);
  if(!coloured.has(un.mesh)){const b=gaBuilder(true);this.emit(b,un);un.mesh.edgeColors=P.edgeColours(b,M.kindColours(un.kind,b));coloured.add(un.mesh)}
  const dist=this.planarToShip(un),haze=clamp((GA_UNIT_SIGHT-dist)/40,0,1),depth=camPoint([un.x,this.ug(un),un.wz-travel])[2];
  drawMesh({x:un.x,y:this.ug(un),z:un.wz-travel,s:un.s,rot:[0,un.h+PI,0],fadeZ:Math.max(0,depth)*.8},un.mesh,un.tint||un.K.col,haze)
};

// The teaser's ground: fine cells (no level-of-detail morph) out to 230, coarse cells beyond,
// tiling exactly. The game's morphing grid swims against anything standing on the true ground.
const gameGround=groundAssault.appendGround.bind(groundAssault),gameLod=groundAssault.lodDrawn.bind(groundAssault),FINE_R=230;
groundAssault.lodDrawn=function(level,i,j){if(!this._teaserLod)return gameLod(level,i,j);
  if(level===0)return this.lodDist(4,i>>2,j>>2)<FINE_R;if(level===2){const d=this.lodDist(4,i,j);return d>=FINE_R&&d<GA_HORIZON}return false};
groundAssault.appendGround=function(scene){if(!teaserScene())return gameGround(scene);
  this._teaserLod=true;try{this.appendGroundLevel(scene,0,1,0,FINE_R+GA_CELL*8,1e9,1e9+1,1e9);this.appendGroundLevel(scene,2,4,FINE_R-GA_CELL*8,GA_HORIZON+GA_CELL*4,1e9,1e9+1,1e9)}finally{this._teaserLod=false}};

// No game HUD on the surface (the altimeter and nav labels).
const gameMarker=groundAssault.drawMarker.bind(groundAssault);
groundAssault.drawMarker=function(){if(teaserScene())return;return gameMarker()};

// ---------- Kangaroos and penguins ----------
function moveCrits(dt){
  const t=D.clock;
  for(const H of run.herds){if(!H.crits)continue;const v=speedAt(H,t),c=routeAt(sAt(H,t)),{F,R}=frameOf(c.h),k=clamp(v/4,.2,1);
    for(const q of H.crits){const dr=Math.sin(t*.4+q.ph1)*.6*k,df=Math.sin(t*.27+q.ph2)*1.2*k;
      q.x=c.x+R[0]*(q.r+dr)+F[0]*(q.f+df);q.z=c.z+R[1]*(q.r+dr)+F[1]*(q.f+df);q.h=c.h+(H.crit==='penguin'?Math.sin(t*1.3+q.ph*6)*.12:0);
      q.ph=(q.ph+dt*(H.crit==='kangaroo'?1.7*q.rate*clamp(v/H.v,.35,1):1.6*q.rate))%1}}
}
function drawCrit(H,q){
  const gy=ground(q.x,q.z),z=q.z-travel;
  if(H.crit==='kangaroo'){M.kangaroo.pose({u:q.ph});drawMesh({x:q.x,y:gy+M.hopH(q.ph)*H.critS,z,s:H.critS,rot:[0,q.h+PI,0]},M.kangaroo,H.critCol,1);return}
  const wph=q.ph*PI*2;M.penguin.pose({w:wph});drawMesh({x:q.x,y:gy,z,s:H.critS,rot:[0,q.h+PI,Math.sin(wph)*.2]},M.penguin,H.critCol,1)
}

// ---------- Landmarks, icebergs, crits and the aurora, into the game's depth-sorted scene ----------
// Landmarks sort by their nearest edge but never nearer than 70, so they can't be drawn over
// the animals or rocks in front of them.
const gameTrees=groundAssault.appendTrees.bind(groundAssault);
groundAssault.appendTrees=function(scn){
  gameTrees(scn);if(!active())return;
  const put=e=>{
    const dist=Math.hypot(e.x-shipX,e.z-travel);if(dist>e.sight+e.ext)return;
    const gy=ground(e.x,e.z),q=camPoint([e.x,gy+e.top*.4,e.z-travel]);if(q[2]<-e.top-e.ext)return;
    let near=q[2];if(e.ext)for(let k=0;k<8;k++){const a=k/8*2*PI;near=Math.min(near,camPoint([e.x+Math.cos(a)*e.ext,gy+1,e.z+Math.sin(a)*e.ext-travel])[2])}
    const haze=clamp((e.sight+e.ext-dist)/(e.sight*.3),0,1)*.92;
    scn.push({z:Math.max(70,near),draw:()=>drawMesh({x:e.x,y:gy-.15,z:e.z-travel,s:e.s,rot:[0,e.yaw,0],fadeZ:Math.max(0,q[2])*.7},e.mesh,e.col,haze)})};
  for(const e of run.lands)put(e);for(const e of run.bergs)put(e);
  for(const H of run.herds)for(const q of H.crits||[]){const p=camPoint([q.x,ground(q.x,q.z)+1,q.z-travel]);if(p[2]>.4&&p[2]<150)scn.push({z:p[2],draw:()=>drawCrit(H,q)})}
  const t=D.clock,last=run.herds[run.herds.length-1],au=last.aurora?ease(t,last.T-FLY0,last.T+FLY1+2):0;
  if(au>0)scn.push({z:1e5,draw:()=>drawAurora(au)})
};
const gameUpdateGA=groundAssault.update?.bind(groundAssault);
if(gameUpdateGA)groundAssault.update=function(dt){const r=gameUpdateGA(dt);if(active())moveCrits(dt);return r};

// The aurora: green and cyan curtains hanging over the ice, rippling slowly.
function drawAurora(alpha){
  const t=D.clock;ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;
  for(let band=0;band<2;band++)for(let i=0;i<70;i++){
    const az=run.H0-.9+i*.026+band*.12,el0=.1+band*.05+Math.sin(i*.31+t*.4+band)*.03,el1=el0+.12+.07*Math.sin(i*.17-t*.6+band*2);
    const dir=(el)=>[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)],R=3000;
    const a=dir(el0),b=dir(el1),pa=proj([shipX+a[0]*R,shipY+a[1]*R,a[2]*R]),pb=proj([shipX+b[0]*R,shipY+b[1]*R,b[2]*R]);
    if(!pa||!pb)continue;
    ctx.globalAlpha=(.3+.2*Math.sin(i*.5+t*1.3+band))*(band?.7:1)*alpha;ctx.strokeStyle=band?C.c:C.g;
    ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke()}
  ctx.restore()
}

// ---------- The starfield at the end ----------
const STARS=(()=>{let s=1234567;const r=()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0)>>>0)/4294967296;
  return Array.from({length:1800},()=>{const z=r()*2-1,a=r()*PI*2,k=Math.sqrt(1-z*z);return{d:[Math.cos(a)*k,z,Math.sin(a)*k],b:.25+r()*.75,tw:r()*6.3}})})();
function drawStars(alpha){
  if(alpha<=0)return;ctx.save();const R=2000;
  for(const s of STARS){const p=proj([shipX+s.d[0]*R,shipY+s.d[1]*R,s.d[2]*R]);if(!p||p.x<0||p.x>W||p.y<0||p.y>viewH)continue;
    const sz=s.b>.93?2.8:s.b>.7?2:1.4;ctx.globalAlpha=Math.min(1,alpha*(.35+s.b)*(.85+.15*Math.sin(D.clock*2+s.tw)));ctx.fillStyle=s.b>.95?C.c:C.w;ctx.fillRect(p.x-sz/2,p.y-sz/2,sz,sz)}
  ctx.restore()
}
function black(a){if(a<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,a);ctx.fillStyle='#000';ctx.fillRect(-20,-20,W+40,H+40);ctx.restore()}
// Once the world has faded out to the stars, the drone's guns go too.
const gameDrawGun=window.drawGun;
window.drawGun=function(g){if(teaserScene()===scene&&D.clock>LIFT+7.5)return;return gameDrawGun(g)};
D.drawTitles=t=>{
  const a=D.window01(t,1.2,9.6,1.2);
  if(a>0){D.vtext('Vector Space',W*.5,viewH*.16,Math.round(W/22),C.g,a);D.vtext('Agent X',W*.5,viewH*.16+W/22,Math.round(W/40),C.w,a*.9)}
};

// ---------- Studio: one herd alone on flat ground, filmed from a fixed side, for model work ----------
// TeaserScenes.studio({kind:'horse'} or {crit:'kangaroo'}, v, n, side, along, h, lookY) then
// studioShot(u) steps to u seconds and draws the frame.
const studioScene={name:'studio',t0:0,seed:9};
ours.add(studioScene);
function studio(o){
  D.takeControl();D.seed(9);D.clock=1000;
  launch(m=>{m.planetaryRequirements={landingBody:'planet',landingColour:'green',moonCount:{min:0,max:0}};m.modules=m.modules.filter(x=>x.type==='dune_assault')});
  planetRings=null;planetLandingColour=o.col||C.g;D.scene=studioScene;studioScene.t0=D.clock;studioScene.from=null;studioScene.lastYaw=null;
  const base=o.kind?HERDS.find(h=>h.kind===o.kind||h.mix?.kind===o.kind):HERDS.find(h=>h.crit===o.crit);
  const H={...base,kind:o.kind||null,mix:null,crit:o.crit||null,n:o.n||1,fixedV:o.v??10,tints:null,amp:0,lookY:o.lookY,critS:o.s||base.critS,critCol:o.critCol||base.critCol};
  buildRun({x:shipX,z:travel,h:0},{studio:{side:o.side??-9,along:o.along??0,h:o.h??1.8,lookY:o.lookY},herds:[H]});
  groundAssault.rawDune=function(){return 0};groundAssault.hCache.clear();
  spawnHerd(H,D.clock);
  return studioScene
}
function studioShot(u){const dt=1/30;while(D.clock-studioScene.t0<u-1e-6){D.gclock+=dt;D.clock+=dt;update(dt)}D.gclock+=dt;render(1e6+D.gclock*1000)}

D.scenes.push(scene);
D.T.videoEnd=PROMO_SONG.length;
globalThis.TeaserScenes={scene,cameraAt:t=>cameraAt(t),herdCam,HERDS,get run(){return run},studio,studioShot};
})();
