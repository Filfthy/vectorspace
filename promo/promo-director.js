'use strict';
// The promo director: flies the real game through three scenes on the song's timeline.
//   Scene 1  0:00-1:35  descent to a green world, a snowy forest run, a present for the cabin
//   Scene 2  1:35-2:04  (guitar solo) a rocky world and a herd of reindeer mechs
//   Scene 3  2:04-end   (aria) the asteroid field, where a xeno sings and more join her
// Everything runs on a fixed frame clock (Promo.D.clock) so a render is repeatable,
// and Math.random is seeded per scene so the same scene always plays the same way.
(()=>{
if(Promo.Q.get('view'))return;
const SONG=PROMO_SONG,FPS=+Promo.Q.get('fps')||30,DT=1/FPS;
const secT=n=>SONG.sections.find(s=>s.name===n).t;
const T={solo:secT('solo'),breakdown:secT('breakdown'),verse3:secT('verse 3'),outro:secT('outro'),riff:secT('riff'),verse2:secT('verse 2'),end:SONG.end+2.6};

// ---- Repeatable randomness and time ----
let seedState=1;
const rand=()=>{seedState|=0;seedState=seedState+0x6D2B79F5|0;let t=Math.imul(seedState^seedState>>>15,1|seedState);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const realRandom=Math.random,realNow=performance.now.bind(performance),realRAF=window.requestAnimationFrame;
const D=Promo.D={clock:0,gclock:0,frame:0,scene:null,log:[],T,FPS,realRAF:realRAF.bind(window),
  seed(n){seedState=n>>>0;Math.random=rand},
  // The game keeps its own animation clocks off performance.now; drive it from the frame clock.
  takeControl(){performance.now=()=>1e6+D.gclock*1000;window.requestAnimationFrame=()=>0;
    AudioMixer.setEnabled('master',false);audio.playVoice=()=>{};audio.voicePlaying=false;
    Object.defineProperty(document,'fullscreenElement',{get:()=>document.documentElement,configurable:true});document.dispatchEvent(new Event('fullscreenchange'));fullscreenGate.classList.add('hidden');
    invulnerable=true},
  release(){performance.now=realNow;Math.random=realRandom;window.requestAnimationFrame=realRAF;realRAF(render)}
};

// ---- Promo-only presentation: no text HUD or reticle; titles and overlays drawn here ----
const gameTopHud=window.topHud,gameReticle=window.reticle;
window.topHud=function(){D.scene?.overlay?.(D.songT());drawTitles(D.songT())};
window.reticle=function(){};
D.songT=()=>D.clock;   // the video starts at song time 0

// ---- Christmas dressing: snow on every tree's upper slopes ----
const gameDrawTree=window.drawLayeredForestTree;
const snowCache=new WeakMap();
// For each pine tier (a pyramid of foliage triangles meeting at one apex), a snow cap
// covering its top with a scalloped lower edge, in model space.
function snowCaps(mesh,assetId){
  if(snowCache.has(mesh))return snowCache.get(mesh);
  const layout=forestTreeLayer(mesh,assetId),caps=[];
  if(layout&&layout.foliageFaces?.length){
    const tris=layout.foliageFaces.map(fi=>mesh.faces[fi]).filter(f=>f&&f.length===3);
    const byApex=new Map();
    for(const f of tris){let top=f[0];for(const i of f)if(mesh.v[i][1]>mesh.v[top][1])top=i;(byApex.get(top)||byApex.set(top,[]).get(top)).push(f)}
    let n=0;
    for(const[apex,fs]of byApex){
      const A=mesh.v[apex];
      for(const f of fs){const[b,c]=f.filter(i=>i!==apex).map(i=>mesh.v[i]),k=.5+.08*((n++)%2),L=(p,u)=>[A[0]+(p[0]-A[0])*u,A[1]+(p[1]-A[1])*u,A[2]+(p[2]-A[2])*u];
        const mid=[(b[0]+c[0])/2,(b[1]+c[1])/2,(b[2]+c[2])/2];
        caps.push([A,L(b,k),L(mid,k*.72),L(c,k)])}
    }
  }
  snowCache.set(mesh,caps);return caps
}
window.drawLayeredForestTree=function(obj,mesh,assetId,alphaScale=1){
  if(obj?.promoDraw)return obj.promoDraw(obj,alphaScale);
  const r=gameDrawTree(obj,mesh,assetId,alphaScale);
  if(!D.snow||!mesh)return r;
  const caps=snowCaps(mesh,assetId);if(!caps.length)return r;
  const rot=obj.rot||[0,0,0],mx=obj.mx||1,my=obj.my||1,mz=obj.mz||1,depth=camPoint([obj.x,obj.y,obj.z])[2],alpha=clamp(1.12-depth/120,.32,.96)*alphaScale;
  const P=v=>{const q=rotate([v[0]*obj.s*mx,v[1]*obj.s*my,v[2]*obj.s*mz],rot),c=camPoint([q[0]+obj.x,q[1]+obj.y,q[2]+obj.z]);return c[2]>1.2?projectCam(c):null};   // a cap brushing the camera would fill the screen
  // Caps are drawn after the tree, back to front by their own depth, only where they face the camera.
  const items=[];
  for(const cap of caps){const pp=cap.map(P);if(pp.some(p=>!p))continue;
    const ax=pp[1].x-pp[0].x,ay=pp[1].y-pp[0].y,bx=pp[3].x-pp[0].x,by=pp[3].y-pp[0].y;if(ax*by-ay*bx>=0)continue;
    items.push({pp,z:(pp[1].z+pp[3].z)/2})}
  items.sort((a,b)=>b.z-a.z);
  ctx.save();ctx.lineJoin='round';ctx.lineWidth=VECTOR_LINE_WIDTH;
  for(const it of items){const p=it.pp;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();
    ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fill();ctx.globalAlpha=alpha;ctx.strokeStyle=C.w;ctx.stroke()}
  ctx.restore();return r
};

// Gentle snowfall: flakes in a box around the camera, drawn as tiny crosses.
const flakes=Array.from({length:650},(_,i)=>({x:(realRandom()-.5)*60,y:realRandom()*14-4,z:realRandom()*60,ph:realRandom()*6.3}));
// The flakes are drawn over the finished frame, so in the forest they only fall in the open
// lane between the trees and not too far down it: a flake can never sit behind a trunk there.
function drawSnowfall(wind=0){
  const inForest=phase==='forest'&&forest.active,depth=inForest?18:60;let n=0;
  ctx.save();ctx.strokeStyle=C.w;ctx.lineWidth=VECTOR_LINE_WIDTH;
  for(const f of flakes){
    if(inForest&&(n++)%3)continue;   // the lane is a small space: a third of the flakes is the same snowfall
    const fall=((f.y-D.clock*1.1+f.ph)%14+14)%14,x=f.x+Math.sin(D.clock*.7+f.ph)*.4+wind*D.clock,z=(((f.z*depth/60)-travel%depth)%depth+depth)%depth+.5;
    let y=fall-4.5;const wx=shipX+(((x%60)+90)%60-30)*(inForest?.22:1);
    if(inForest){const p=forest.pathAtWorld(travel+z);y=p.floor+fall*.32;if(Math.abs(wx-p.x)>p.half-.7||y<forest.floorAt(travel+z,wx)+.1)continue}
    const q=camPoint([wx,y,z]);if(q[2]<.5)continue;const p=projectCam(q);if(!p)continue;
    const s=Math.max(1.3,Math.min(4.5,p.k*.045));ctx.globalAlpha=clamp(1.1-q[2]/(inForest?20:55),.08,.8);
    ctx.beginPath();ctx.moveTo(p.x-s,p.y);ctx.lineTo(p.x+s,p.y);ctx.moveTo(p.x,p.y-s);ctx.lineTo(p.x,p.y+s);ctx.stroke()}
  ctx.restore()
}
D.drawSnowfall=drawSnowfall;

// ---- Titles in the Agent X lettering (the game's Facet display face) ----
// A line too wide for the screen is drawn smaller to fit.
function vtext(s,x,y,size,col,alpha){const F=AgentXVectorFont,w=F.measure(s,size,null,'display');if(w>W*.88)size*=W*.88/w;
  ctx.save();ctx.globalAlpha=alpha;F.draw(ctx,s,x,y,size,{role:'display',align:'center',baseline:'middle',color:col});ctx.restore()}
function window01(t,a,b,fade=.8){return clamp(Math.min((t-a)/fade,(b-t)/fade),0,1)}
function drawTitles(t){
  const a=window01(t,1.0,6.9,1.1);
  if(a>0){vtext('Vector Space',W*.5,viewH*.27,Math.round(W/36),C.g,a);vtext('Agent X wishes you all a Merry Christmas',W*.5,viewH*.27+W/22,Math.round(W/26),C.w,a*.95)}
  const e=window01(t,T.end-9.5,T.end+20,1.4);   // held to the very end, while the bells ring on
  if(e>0){vtext('Vector Space',W*.5,viewH*.15,Math.round(W/16),C.g,e);vtext('Agent X',W*.5,viewH*.15+W/18,Math.round(W/40),C.w,e*.9);
    vtext('Merry Christmas from BugVictim',W*.5,viewH*.92,Math.round(W/50),C.y,e*.85)}
}

// ---- Stepping ----
D.scenes=[];
D.sceneAt=t=>{let s=D.scenes[0];for(const x of D.scenes)if(t>=x.t0)s=x;return s};
// Time map. A scene can list marks {ev, at}: the game event ev (from scene.event()) should
// happen at song time at. A quick silent run of the scene finds when each event happens in
// game time, and the scene's game clock is then stretched piecewise between the marks
// (kept within 0.55x-1.2x of real speed so the game's own motion stays natural).
function calibrate(s){
  if(!s.marks){s.map=[[0,0]];return}
  D.seed(s.seed||1);s.setup();const found={};let g=0,ok=true;
  for(let i=0;i<FPS*240&&s.marks.some(m=>found[m.ev]==null);i++){s.pilot?.(DT,s.t0+g);update(DT);g+=DT;const ev=s.event?.();if(ev&&found[ev]==null)found[ev]=g}
  const pts=[[0,0]];for(const m of s.marks){if(found[m.ev]==null){ok=false;D.log.push(`mark ${m.ev} not reached`);continue}pts.push([m.at-s.t0,found[m.ev]])}
  s.map=pts;s.found=found;D.log.push(`${s.name} map ${pts.map(p=>p.map(x=>x.toFixed(2)).join('>')).join(' ')}${ok?'':' (incomplete)'}`)
}
function gameAt(s,u){const m=s.map;if(!m||m.length<2)return u;
  for(let i=1;i<m.length;i++)if(u<=m[i][0]){const[a0,b0]=m[i-1],[a1,b1]=m[i];return b0+(u-a0)*(b1-b0)/(a1-a0)}
  const[a,b]=m[m.length-1];return b+(u-a)}
// One frame: the scene's pilot sets the inputs, then the game's own frame runs (update and draw).
D.step=(draw=true)=>{
  let s=D.sceneAt(D.clock);
  if(s!==D.scene){calibrate(s);D.scene=s;D.log.push(`${D.clock.toFixed(2)} scene ${s.name}`);D.seed(s.seed||1);s.setup();s.g=0}
  const g=gameAt(s,D.clock+DT-s.t0),dt=Math.max(0,g-s.g);s.g=g;
  s.pilot?.(dt,D.clock);
  D.gclock+=dt;
  if(draw){if((gateVisible()||campaign.isOpen())&&!D.warned){D.warned=true;D.log.push(`${D.clock.toFixed(2)} game frame blocked: gate ${gateVisible()} hub ${campaign.isOpen()}`)}
    last=1e6+(D.gclock-dt)*1000;render(1e6+D.gclock*1000)}else update(dt);
  s.after?.(dt,D.clock);
  const ev=s.event?.();if(ev!==s.lastEv){s.lastEv=ev;if(ev)D.log.push(`${(D.clock+DT).toFixed(2)} ${s.name}:${ev}${draw?' (drawn)':''}`)}
  D.clock+=DT;D.frame++
};
// Jump straight to a song time by simulating from the start of that time's scene (no drawing).
D.seek=t=>{D.scene=null;const s=D.sceneAt(t);D.clock=s.t0;D.gclock=0;D.frame=Math.round(D.clock*FPS);while(D.clock<t-1e-6)D.step(false)};
D.trace=()=>`${D.clock.toFixed(2)} ${mode}/${phase} ${forest?.active?forest.terminalState:''} st=${campaign.currentStage?.()?.type||''} travel=${Math.round(travel)}`;
// Render frames [t0,t1) to promo/out/<folder>/f00000.jpg (frame numbers are absolute).
D.renderRange=async(folder,t0,t1,every=1)=>{
  if(canvas.width!==Promo.CAP.w||canvas.height!==Promo.CAP.h)throw new Error(`canvas is ${canvas.width}x${canvas.height}, not ${Promo.CAP.w}x${Promo.CAP.h}: size the window to 1280x720 and use ?promo&dpr=1.5`);
  D.takeControl();D.seek(t0);let n=0;
  // Several frames upload at once; drawing waits only when too many are still in flight.
  const inflight=[];D.stop=false;
  while(D.clock<t1-1e-6&&!D.stop){
    const f=D.frame,draw=(f%every)===0;D.step(true);
    if(draw){inflight.push(Promo.save(folder,`f${String(f).padStart(5,'0')}.jpg`));n++}
    while(inflight.length>8)await inflight.shift()
  }
  await Promise.all(inflight);
  return n
};
globalThis.PromoDirector=D;
})();
