'use strict';
// The teaser: one unbroken run across one world to "Stampede Across the Stars".
// It opens on the ground under the titles, then flies herd to herd along a single long route
// with no cuts: horses, kangaroos, camels, elephants, giraffes and zebras, llamas,
// bison, and penguins under an aurora. The ground's colour and roll shift gradually from herd
// to herd; a few landmarks stand far off the route (Stonehenge, Uluru, the pyramids...).
// At the end the camera tilts up to the aurora over the penguins and holds there.
//   0:00 the horses gallop past the camera   0:14 horses     0:35 kangaroos   0:56 camels
//   1:18 elephants   1:39 giraffes and zebras   2:00 llamas   2:21 bison   2:43 penguins
//   2:57 up to the aurora
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
  {sec:'england',kind:'horse',n:7,v:11,tints:Array(7).fill('#C8763A'),ground:C.g,amp:.55,rock:C.w,K:1,
    land:{mesh:M.stonehenge,col:C.w,s:2.4,dist:210,foot:[[0,0,15],[2,-28,4]]}},
  {sec:'australia',crit:'kangaroo',n:7,v:9.5,critCol:C.o,critS:1.3,ground:C.o,amp:.35,rock:C.y,K:1,
    land:{mesh:M.uluru,col:C.r,s:1.4,dist:240,yaw:PI/2,foot:[[-30,0,17],[0,0,19],[30,0,17]]}},
  {sec:'egypt',kind:'camel',n:6,v:5.5,space:1.4,ground:C.y,amp:.75,rock:C.o,K:1.2,lookY:2.5,
    land:{mesh:M.giza,col:C.w,s:1.15,dist:290,yaw:.5,foot:[[0,0,30],[-46,30,28],[-78,58,15],[-86,74,9],[30,-38,10]]}},
  {sec:'india',kind:'elephant',n:5,v:3.6,space:2,ground:C.u,amp:.3,rock:C.w,K:1.5,lookY:2.4,
    land:{mesh:M.taj,col:C.w,s:1.3,dist:280,yaw:-PI/2,foot:[[0,0,28],[0,-50,9],[0,-72,9]]}},
  {sec:'kenya',kind:'giraffe',n:4,mix:{kind:'zebra',n:6},v:6.5,space:1.5,ground:C.o,amp:.35,rock:C.y,K:1.3,lookY:3,
    land:{mesh:M.kilimanjaro,col:C.u,s:1.4,dist:500,sight:420,foot:[[0,0,170]]}},
  {sec:'peru',kind:'llama',n:7,v:4.6,space:1.2,ground:C.g,amp:.9,rock:C.w,K:1.2,
    land:{mesh:M.machuPicchu,col:C.g,s:1.3,dist:270,yaw:PI,foot:[[0,-6,64],[2,34,34]]}},
  {sec:'usa',kind:'bison',n:12,v:11,space:1.25,ground:C.y,amp:.45,rock:C.o,K:1.15,
    land:{mesh:M.monumentValley,col:C.o,s:1.4,dist:290,yaw:.2,foot:[[-50,0,24],[14,14,24],[80,-14,36],[40,-34,6],[-16,-38,6],[-96,-26,8]]}},
  {sec:'antarctica',crit:'penguin',n:11,v:1.3,walk:.8,space:.6,critCol:C.w,critS:1.25,ground:C.c,amp:.25,rock:C.w,K:.8,lookY:.9,aurora:true,
    bergs:[[140,25,1.4],[-160,70,1.8],[180,130,2],[-200,10,2.2],[150,-60,1.6],[-170,-110,1.8]]},
];
const SHOTS=['flank','wide','high','flank','wide','high','flank','flank'];
HERDS.forEach((H,i)=>{H.i=i;H.K*=1.35;H.T=T[H.sec];H.Tn=i<HERDS.length-1?T[HERDS[i+1].sec]:Infinity;H.side=i%2?1:-1;H.shot=SHOTS[i];
  H.walk=i===0?H.v:H.walk??Math.min(1.2,H.v*.25)});   // the horses are already galloping when the video opens

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
// Three styles, so the shots vary from herd to herd: in close along the flank, a wide pan from
// further out and higher up, and a high sweeping shot looking down on the herd.
const SHOT_KEYS={
  flank:[[0,9,-30,5,8],[5,11,-12,3.2,5],[10,12,2,2.6,3],[15,13,14,2.8,0],[19.5,16,6,3.6,4]],
  wide:[[0,14,-42,8,10],[6,22,-22,7,6],[12,27,0,6.5,3],[17,25,16,7,0],[19.5,23,10,7.5,4]],
  high:[[0,6,-38,12,14],[6,14,-16,9.5,6],[12,20,4,8,2],[17,19,18,7,-2],[19.5,21,12,7.5,3]]};
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
  const K=H.K,[sd,al,hh,lf]=camKey(SHOT_KEYS[H.shot||'flank'],t-H.T),side=(sd*K+3)*H.side,along=al*K;
  const x=c.x+R[0]*side+F[0]*along,z=c.z+R[1]*side+F[1]*along;
  return look(x,camGround(x,z)+hh*Math.sqrt(K),z,c.x+F[0]*lf*K,ty,c.z+F[1]*lf*K)
}
// The opening: the camera waits low beside the route as the horses gallop up and thunder past
// it, following them round, then speeds up and falls in behind them for the chase.
const PASS=7;
function introCam(t){
  const H=run.herds[0],c=routeAt(sAt(H,PASS)),{R}=frameOf(c.h),l=15*H.side,x=c.x+R[0]*l,z=c.z+R[1]*l,h=routeAt(sAt(H,t)),{F}=frameOf(h.h);
  return look(x,camGround(x,z)+1.7,z,h.x+F[0]*3,ground(h.x,h.z)+2.2,h.z+F[1]*3)}
const blendCam=(a,c,b)=>({x:lerp(a.x,c.x,b),y:lerp(a.y,c.y,b),z:lerp(a.z,c.z,b),yaw:a.yaw+wrapAngle(c.yaw-a.yaw)*b,pitch:lerp(a.pitch,c.pitch,b)});
// Between herds the camera lifts and flies on to the next one, turning to it as it goes.
const FLY0=3.2,FLY1=1.3;
function cameraAt(t){
  const Hs=run.herds;
  if(!run.studio&&t<Hs[0].T+1.5){const a=introCam(t),b=ease(t,PASS+2.5,Hs[0].T+1.5);return b>0?blendCam(a,herdCam(Hs[0],t),b):a}
  let i=0;while(i<Hs.length-1&&t>=Hs[i+1].T+FLY1)i++;
  const a=herdCam(Hs[i],t);if(i>=Hs.length-1||t<=Hs[i+1].T-FLY0)return a;
  const b=ease(t,Hs[i+1].T-FLY0,Hs[i+1].T+FLY1),c=herdCam(Hs[i+1],t),arc=Math.sin(PI*b);
  const by=ease(t,Hs[i+1].T-FLY0,Hs[i+1].T-FLY0+(FLY0+FLY1)*.6);
  return{x:lerp(a.x,c.x,b),y:lerp(a.y,c.y,b)+4.5*arc,z:lerp(a.z,c.z,b),yaw:a.yaw+wrapAngle(c.yaw-a.yaw)*by,pitch:lerp(a.pitch,c.pitch,by)+.06*arc}
}
// The end: the camera stops by the penguins and tilts slowly up to the aurora, rising a little,
// and stays on it to the end.
function liftOff(t){
  if(run.studio||t<LIFT)return null;
  const base=cameraAt(LIFT),k=t-LIFT,a=ease(k,0,7);
  return{x:base.x,y:base.y+a*2.5,z:base.z,yaw:wrapAngle(base.yaw+wrapAngle(run.H0-base.yaw)*a),pitch:lerp(base.pitch,-.42,a)}
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
  if(!opt.studio){scatterRocks(rand);buildSky()}else run.sky=null;
  run.built=true
}
// Rocks all along the route, both sides, coloured for each stretch; never in the herds' lane,
// on a landmark, or anywhere the camera flies.
function scatterRocks(rand){
  const G=groundAssault,Hs=run.herds;let rockLo=1e9;for(const v of asteroidMesh.v)rockLo=Math.min(rockLo,v[1]);
  const cams=new Map(),key=(x,z)=>Math.floor(x/12)+','+Math.floor(z/12);
  for(let t=0;t<LIFT+1;t+=.2){const c=cameraAt(t),k=key(c.x,c.z);(cams.get(k)||cams.set(k,[]).get(k)).push(c)}
  const nearCam=(x,z,r)=>{const i=Math.floor(x/12),j=Math.floor(z/12);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const c of cams.get((i+a)+','+(j+b))||[])if(Math.hypot(c.x-x,c.z-z)<r)return true;return false};
  const s0=Hs[0].anchor-260,s1=sAt(Hs[Hs.length-1],LIFT)+160;
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
function slotOf(H,i,rand){if(run&&run.studio&&H.n===1)return{r:0,f:0,ph1:0,ph2:0};const sp=H.space||1,row=Math.floor(i/3),col=i%3-1,rows=Math.ceil((H.n+(H.mix?.n||0))/3);
  return{r:(col*4.6+(rand()-.5)*2+(row%2)*1.8)*sp,f:((rows-1)*3.6-row*7.2+(rand()-.5)*2.6)*sp,ph1:rand()*6.3,ph2:rand()*6.3}}
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
// A herd stays unseen while the camera is still on the one before it, and fades in as the
// camera turns to fly to it.
const seen=H=>run.studio||H.i===0?1:ease(D.clock,H.T-FLY0,H.T-FLY0+1.2);
function herdsTick(t){for(const H of run.herds){if(!H.live&&t>=H.spawnAt&&t<H.removeAt)spawnHerd(H,t);else if(H.live&&t>=H.removeAt)removeHerd(H)}}

// ---------- The scene ----------
const scene={name:'run',t0:0,seed:301,
  setup(){
    D.snow=false;run=null;scene.from=null;scene.lastYaw=null;
    launch(m=>{
      m.planetaryRequirements={landingBody:'planet',landingColour:'green',moonCount:{min:1,max:2}};
      m.modules=m.modules.filter(x=>x.type==='dune_assault')
    });
    planetRings=null;planetLandingColour=C.g;
    terrainOn();buildRun({x:shipX,z:travel,h:viewYaw})
  },
  pilot(dt,t){if(run&&run.built)herdsTick(t);inputX=inputY=0},
  // In from black at the start; out to black over the song's last bars.
  overlay(t){black(1-ease(t,0,1.5));black(ease(t,PROMO_SONG.length-4,PROMO_SONG.length-.4))}
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
  const vis=seen(un.teaser.H);if(vis<=0)return;
  drawMesh({x:un.x,y:this.ug(un),z:un.wz-travel,s:un.s,rot:[0,un.h+PI,0],fadeZ:Math.max(0,depth)*.8},un.mesh,un.tint||un.K.col,haze*vis)
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
      if(H.crit==='kangaroo'){const rate=1.2*q.rate*clamp(v/H.v,.35,1),d=v/rate,o=d*(M.hopX(q.ph)-q.ph);q.x+=F[0]*o;q.z+=F[1]*o}
      q.ph=(q.ph+dt*(H.crit==='kangaroo'?1.2*q.rate*clamp(v/H.v,.35,1):1.6*q.rate))%1}}
}
function drawCrit(H,q){
  const gy=ground(q.x,q.z),z=q.z-travel,vis=seen(H);if(vis<=0)return;
  if(H.crit==='kangaroo'){M.kangaroo.pose({u:q.ph});drawMesh({x:q.x,y:gy+M.hopH(q.ph)*H.critS,z,s:H.critS,rot:[0,q.h+PI,0]},M.kangaroo,H.critCol,vis);return}
  const wph=q.ph*PI*2;M.penguin.pose({w:wph});drawMesh({x:q.x,y:gy,z,s:H.critS,rot:[0,q.h+PI,Math.sin(wph)*.2]},M.penguin,H.critCol,vis)
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
  if(run.sky)appendSky(scn)
};
// The stars and the aurora are drawn before the horizon, so the mountains stand in front of them.
const gameHorizon=window.drawSharedSurfaceHorizon;
window.drawSharedSurfaceHorizon=function(...args){
  if(active()&&!run.studio){const t=D.clock,last=run.herds[run.herds.length-1],au=last.aurora?ease(t,last.T-FLY0,last.T+FLY1+2):0,big=ease(t,LIFT,LIFT+7);
    if(big>0)drawStars(big*.9);if(au>0)drawAurora(au,big)}
  return gameHorizon.apply(this,args)};
const gameUpdateGA=groundAssault.update?.bind(groundAssault);
if(gameUpdateGA)groundAssault.update=function(dt){const r=gameUpdateGA(dt);if(active())moveCrits(dt);return r};

// The aurora: green and cyan curtains hanging over the ice, rippling slowly.
// At the end (big 0..1) the curtains grow taller and brighter, filling the sky the camera looks up to.
function drawAurora(alpha,big=0){
  const t=D.clock,SPAN=3.6,n=Math.round(140+140*big),step=SPAN/n;ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;
  for(let band=0;band<3;band++)for(let i=0;i<n;i++){
    if(band===2&&big<=0)break;
    const az=run.H0-SPAN/2+i*step+band*.12+Math.sin(i*step*3+t*.15+band)*.08*big,el0=.1+band*(.05+.12*big)+Math.sin(i*step*12+t*.4+band)*(.03+.04*big),el1=el0+(.12+.07*Math.sin(i*step*6.5-t*.6+band*2))*(1+1.8*big);
    const dir=(el)=>[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)],R=3000;
    const a=dir(el0),b=dir(el1),pa=proj([shipX+a[0]*R,shipY+a[1]*R,a[2]*R]),pb=proj([shipX+b[0]*R,shipY+b[1]*R,b[2]*R]);
    if(!pa||!pb)continue;
    ctx.globalAlpha=Math.min(1,(.3+.2*Math.sin(i*step*19+t*1.3+band))*(band?.7:1)*alpha*(1+1.1*big));ctx.strokeStyle=band===1?C.c:band===2?C.m:C.g;
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
// No guns: in the teaser the drone is only a camera.
const gameDrawGun=window.drawGun;
window.drawGun=function(g){if(teaserScene())return;return gameDrawGun(g)};
D.drawTitles=()=>{};   // no title text: the video opens straight on the horses

// ---------- The sky: birds for each place, a few ships passing, fireworks over the elephants ----------
// Everything is placed from where the camera will be at the time (cameraAt is fixed in advance),
// so each flock, ship and firework crosses the view without ever being framed on purpose.
function seeded(seed){let s=seed%2147483647||1;return()=>(s=s*16807%2147483647)/2147483647}
const BIRDS={
  england:{n:12,span:.9,col:C.w,form:'loose',v:9},        // rooks
  australia:{n:10,span:.8,col:C.w,form:'loose',v:10},      // cockatoos
  egypt:{n:3,span:1.7,col:C.y,form:'circle',v:7},          // vultures, circling
  kenya:{n:9,span:1.4,col:C.m,form:'vee',v:11},            // flamingos
  peru:{n:1,span:3.2,col:C.w,form:'circle',v:8},           // a condor
  usa:{n:9,span:.95,col:C.w,form:'loose',v:10},             // crows
  antarctica:{n:2,span:2.4,col:C.w,form:'glide',v:9}};     // albatrosses
const camFrame=t=>{const c=cameraAt(t);return{c,F:[Math.sin(c.yaw),Math.cos(c.yaw)],R:[Math.cos(c.yaw),-Math.sin(c.yaw)]}};
// Height for something D ahead to sit in the upper part of the frame, whatever the camera's pitch.
const skyY=(c,D,e)=>c.y+D*Math.tan(Math.max(.05,-c.pitch+e));
function buildSky(){
  const r=seeded(4242),sky=run.sky={flocks:[],ships:[],bursts:[]};
  for(const H of run.herds){const B=BIRDS[H.sec];if(!B)continue;
    const times=B.form==='circle'?[H.T+1]:B.form==='glide'?[H.T+3]:[H.T+2,H.T+11];
    for(const ts of times){const sg=r()<.5?-1:1;
      const f={B,ts,te:B.form==='circle'?Math.min(H.Tn,LIFT)+2:ts+16,members:[]};
      if(B.form==='circle'){const{c,F,R}=camFrame(ts+6),D=70;f.cx=c.x+F[0]*D+R[0]*sg*12;f.cz=c.z+F[1]*D+R[1]*sg*12;f.cy=skyY(c,D,.16);f.rad=18+r()*8}
      else{const tm=ts+7,{c,F,R}=camFrame(tm),D=45+r()*25,mid=[c.x+F[0]*D+R[0]*(r()-.5)*20,skyY(c,D,.1+r()*.08),c.z+F[1]*D+R[1]*(r()-.5)*20];
        const d=[R[0]*sg+F[0]*.2,R[1]*sg+F[1]*.2],k=Math.hypot(...d);f.d=[d[0]/k,0,d[1]/k];f.p0=[mid[0]-f.d[0]*B.v*7,mid[1],mid[2]-f.d[2]*B.v*7]}
      for(let k=0;k<B.n;k++){const row=Math.ceil(k/2),side=k%2?1:-1;
        f.members.push(B.form==='vee'?{a:-row*2.6,l:side*row*2.2,u:0,ph:r()*6.3}:{a:(r()-.5)*9,l:(r()-.5)*16,u:(r()-.5)*5,ph:r()*6.3,ang:k/B.n*2*PI,dr:(r()-.5)*6})}
      sky.flocks.push(f)}}
  // Ships: a pair of fighters streaking low over the camera, over the camels and again over the
  // bison, and a freighter crossing slowly above the llamas.
  for(const ts of[T.egypt+6,T.usa+9]){const{c,F,R}=camFrame(ts+2.2),sg=r()<.5?-1:1;
    for(const k of[0,1]){const lat=sg*(5+k*8),h=c.y+9+k*2.5;
      sky.ships.push({mesh:fighterMesh,s:2.6,col:C.c,ts,te:ts+5,p0:[c.x-F[0]*(95+k*7)+R[0]*lat,h,c.z-F[1]*(95+k*7)+R[1]*lat],d:[F[0],0,F[1]],v:55,bank:sg*.45})}}
  {const ts=T.peru+3,tm=ts+12,{c,F,R}=camFrame(tm),sg=r()<.5?-1:1,D=200,mid=[c.x+F[0]*D,skyY(c,D,.17),c.z+F[1]*D],d=[R[0]*sg,0,R[1]*sg],v=12;
    sky.ships.push({mesh:M.freighter,s:1.6,col:C.w,ts,te:ts+26,p0:[mid[0]-d[0]*v*12,mid[1],mid[2]-d[2]*v*12],d,v,bank:0})}
  // Fireworks over the elephants, launched every second or so from beyond the herd.
  const H4=run.herds.find(h=>h.sec==='india');
  for(let tl=H4.T+.5;tl<H4.Tn-2.5;tl+=.8+r()*.8){const{c,F,R}=camFrame(tl+1.5),D=85+r()*55,lx=(r()-.5)*D*.9,x=c.x+F[0]*D+R[0]*lx,z=c.z+F[1]*D+R[1]*lx,gy=ground(x,z);
    const pal=[C.m,C.y,C.c,C.r,C.g,C.w],col=pal[Math.floor(r()*pal.length)],col2=r()<.4?pal[Math.floor(r()*pal.length)]:col;
    const parts=Array.from({length:60},()=>{const u=r()*2-1,a=r()*2*PI,k=Math.sqrt(1-u*u);return{d:[Math.cos(a)*k,u,Math.sin(a)*k],v:26+r()*8}});
    sky.bursts.push({tl,tb:tl+.9,x,z,gy,by:skyY(c,D,.16+r()*.1),col,col2,parts})}
}
function birdAt(f,m,t){
  const B=f.B,u=t-f.ts;
  if(B.form==='circle'){const w=B.v/f.rad,a=m.ang+u*w,r=f.rad+m.dr;return{p:[f.cx+Math.cos(a)*r,f.cy+m.u+Math.sin(a*2)*1.5,f.cz+Math.sin(a)*r],d:[-Math.sin(a),0,Math.cos(a)]}}
  const d=f.d,lat=[d[2],0,-d[0]],c=[f.p0[0]+d[0]*B.v*u,f.p0[1],f.p0[2]+d[2]*B.v*u];
  return{p:[c[0]+d[0]*m.a+lat[0]*m.l,c[1]+m.u+Math.sin(u*.7+m.ph)*.6,c[2]+d[2]*m.a+lat[2]*m.l],d}
}
// A bird: a five-point wing line, the tips flapping (slowly for the big birds, barely for a glider).
function drawBird(f,m,t,alpha){
  const B=f.B,{p,d}=birdAt(f,m,t),w=B.span,lat=[d[2],0,-d[0]];
  const hz=B.form==='glide'?0:B.span>1.5?1.3:3.2,flap=B.form==='glide'?.15*Math.sin(t*.5+m.ph):Math.sin(t*hz*2*PI+m.ph);
  const P=(s,k,up)=>proj([p[0]+lat[0]*s*w*k-d[0]*.15*w*k,p[1]+up,p[2]+lat[2]*s*w*k-d[2]*.15*w*k-travel]);
  const pts=[P(-1,1,flap*.5*w),P(-1,.45,flap*.15*w+.08*w),P(0,0,0),P(1,.45,flap*.15*w+.08*w),P(1,1,flap*.5*w)];
  for(let i=1;i<5;i++)if(pts[i-1]&&pts[i])line(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,B.col,.8,alpha)
}
function appendSky(scn){
  const t=D.clock,sky=run.sky;
  for(const f of sky.flocks){if(t<f.ts||t>f.te)continue;const a=Math.min(1,(t-f.ts)/1.5,(f.te-t)/1.5);
    for(const m of f.members){const q=camPoint([...birdAt(f,m,t).p.slice(0,2),birdAt(f,m,t).p[2]-travel]);if(q[2]<1||q[2]>380)continue;
      scn.push({z:q[2],draw:()=>drawBird(f,m,t,a*.9)})}}
  for(const sh of sky.ships){if(t<sh.ts||t>sh.te)continue;const u=t-sh.ts,x=sh.p0[0]+sh.d[0]*sh.v*u,y=sh.p0[1],z=sh.p0[2]+sh.d[2]*sh.v*u;
    const q=camPoint([x,y,z-travel]);if(q[2]<1||q[2]>700)continue;const a=Math.min(1,u/1,(sh.te-t)/1);
    scn.push({z:q[2],draw:()=>drawMesh({x,y,z:z-travel,s:sh.s,rot:[0,Math.atan2(sh.d[0],sh.d[2])+PI,sh.bank]},sh.mesh,sh.col,a)})}
  for(const b of sky.bursts){if(t<b.tl||t>b.tb+2.4)continue;const q=camPoint([b.x,b.by,b.z-travel]);if(q[2]<1)continue;
    scn.push({z:q[2],draw:()=>drawBurst(b,t)})}
}
// A firework: the rocket's trail climbing, then a burst of sparks flying out, slowing, drooping and fading.
function drawBurst(b,t){
  if(t<b.tb){const k=(t-b.tl)/(b.tb-b.tl),y=lerp(b.gy,b.by,1-(1-k)*(1-k)),y0=lerp(b.gy,b.by,1-Math.pow(1-Math.max(0,k-.15),2));
    const p=proj([b.x,y,b.z-travel]),p0=proj([b.x,y0,b.z-travel]);if(p&&p0)line(p0.x,p0.y,p.x,p.y,C.y,.8,.7);return}
  const u=t-b.tb,life=2.4,fade=Math.pow(Math.max(0,1-u/life),1.2),at=(pt,s)=>{const g=(1-Math.exp(-2.2*s))/2.2;return[b.x+pt.d[0]*pt.v*g,b.by+pt.d[1]*pt.v*g-1.7*s*s,b.z+pt.d[2]*pt.v*g]};
  b.parts.forEach((pt,i)=>{const p1=at(pt,u),p0=at(pt,Math.max(0,u-.14)),a=proj([p1[0],p1[1],p1[2]-travel]),c=proj([p0[0],p0[1],p0[2]-travel]);
    if(a&&c)line(c.x,c.y,a.x,a.y,i%2?b.col2:b.col,.9,fade)});
}

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
