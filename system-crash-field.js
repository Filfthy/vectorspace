'use strict';
// v3019 CRASH FIELD (Dave: crash recovery without the city; potential ground units that need
// taking out before scanning; a wider area). The Crash Recovery job lands on open rolling ground
// (the dune engine, system-ground-assault.js) with two to four downed craft spread far apart.
// Each has a nav point on the wreck. Some are guarded by a few armour units, more often as the
// risk rises: those must be destroyed before the wreck can be scanned. Fly low over each wreck to
// pull its recorder. With every recorder aboard the drone launches and the job goes on to upload
// them at the depot.
(()=>{
const G=GroundAssaultController.prototype;
// ---- Scavenger units (Dave: more like technicals than tanks, plus ground drones). Red, so they
// read on any world. Light and quick: they die fast but hunt in packs and shoot in bursts.
{
  // A wheel in the y-z plane at (x,y,z).
  const wheel=(m,x,y,z,r,w,n=8)=>{const ring=xx=>Array.from({length:n},(_,i)=>{const t=2*Math.PI*i/n;return[xx,y+Math.cos(t)*r,z+Math.sin(t)*r]});m.loft([ring(x-w/2),ring(x+w/2)])};
  // TECHNICAL: a pickup truck with a pintle machine gun in the bed.
  GA_KINDS.technical={label:'TECHNICAL',tank:true,s:.85,hp:3,speed:6.5,turn:1.3,range:60,fire:[.9,1.3],volley:3,volleyGap:.11,minRange:10,turretZ:1.05,
    radius:1.6,bodyBottom:0,top:2.5,muzzles:[[0,2.05,-1.0]],spheres:[[0,1.0,0,1.6]],col:C.r,score:300,
    body(m){
      m.box([0,.78,0],[1.7,.36,4.1]);                                    // chassis and bed floor
      m.loft([[[-.82,.96,-2.05],[.82,.96,-2.05],[.82,1.42,-2.0],[-.82,1.42,-2.0]],[[-.82,.96,-.95],[.82,.96,-.95],[.82,1.5,-.95],[-.82,1.5,-.95]]]);   // bonnet
      m.loft([[[-.8,1.5,-.95],[.8,1.5,-.95],[.7,2.15,-.55],[-.7,2.15,-.55]],[[-.8,1.5,.05],[.8,1.5,.05],[.72,2.18,.0],[-.72,2.18,.0]]]);              // cab
      for(const sx of[-1,1])m.box([sx*.8,1.18,1.05],[.1,.44,2.0]);      // bed sides
      m.box([0,1.18,2.02],[1.6,.44,.1]);                                 // tailgate
      for(const sx of[-1,1])for(const z of[-1.35,1.3])wheel(m,sx*.95,.45,z,.45,.32);
      gaLine(m,[[-.7,1.62,-.94],[.7,1.62,-.94]]);gaLine(m,[[.55,2.15,-.2],[.75,3.0,.2]]);   // windscreen bar, whip aerial
    },
    turret(m){
      m.beam([0,1.0,1.05],[0,1.95,1.05],.12,.12);                        // pintle post
      m.box([0,2.05,.75],[.26,.26,.75]);m.barrel(0,2.05,.35,-1.0,.06);   // gun and barrel
      m.loft([[[-.42,1.85,.4],[.42,1.85,.4],[.42,2.45,.4],[-.42,2.45,.4]],[[-.42,1.85,.46],[.42,1.85,.46],[.42,2.45,.46],[-.42,2.45,.46]]]);   // gun shield
    }};
  // SCAV DRONE: a low six-wheeled ground drone with a sensor mast and a twin gun pod.
  const hull=(y,w,l)=>[[-w*.6,y,-l],[w*.6,y,-l],[w,y,-l*.4],[w,y,l],[-w,y,l],[-w,y,-l*.4]];
  GA_KINDS.scavDrone={label:'SCAV DRONE',tank:true,s:.8,hp:2,speed:5.5,turn:1.8,range:48,fire:[.55,.85],volley:2,volleyGap:.12,minRange:8,turretZ:0,
    radius:1.1,bodyBottom:0,top:1.4,muzzles:[[-.18,.98,-1.05],[.18,.98,-1.05]],spheres:[[0,.6,0,1.1]],col:C.r,score:200,
    body(m){
      m.loft([hull(.32,.7,1.0),hull(.62,.78,1.1),hull(.78,.6,.9)]);
      for(const sx of[-1,1])for(const z of[-.75,0,.75])wheel(m,sx*.82,.28,z,.28,.2,6);
      gaLine(m,[[.3,.78,.6],[.3,1.55,.75]]);m.box([.3,1.6,.76],[.14,.14,.14]);
    },
    turret(m){
      m.loft([m.ringXZ(0,.78,0,.38,.38,6),m.ringXZ(0,1.08,0,.3,.3,6)]);
      for(const x of[-.18,.18])m.barrel(x,.98,-.2,-1.05,.05);
    }};
}
const NAMES=['ALPHA','BRAVO','CHARLIE','DELTA','ECHO'];
const CAPTURE_R=30,SCAN_SECONDS=2.4;
G.beginCrashField=function(opts={}){
  this.begin({...opts,noGroups:true});this.variant='crash';
  const risk=Math.max(1,Number(opts.risk??campaign?.currentMission?.risk)||3),n=clamp(Math.round(Number(opts.sites)||3),1,5);
  const guardChance=clamp(.2+risk*.08,.25,.85),base=Math.random()*6.283;
  // Scavengers: drones and technicals, with a stolen hover tank among them at the top risks.
  const kinds=risk>=7?['technical','technical','scavDrone','scavDrone','wedge']:(risk>=4?['technical','scavDrone','scavDrone']:['scavDrone','scavDrone','technical']);
  let guarded=0;
  for(let i=0;i<n;i++){
    // Spread round the compass and well apart: the first fairly ahead, the rest out wide.
    const a=i?base+i*(6.283/n)+(Math.random()-.5)*.5:(Math.random()-.5)*.5,dist=i?150+Math.random()*130:110+Math.random()*30;
    const cx=Math.sin(a)*dist,cwz=Math.cos(a)*dist,name=NAMES[i];
    const mesh=(typeof pickEnemyFighterMesh==='function'?pickEnemyFighterMesh():null)||routeDiversion?.CIV_MESH,s=3.2+Math.random()*.8;
    const site={x:cx,wz:cwz,mesh,s,rot:[-.3-Math.random()*.15,Math.random()*6.283,-.45+Math.random()*.2],scanned:false,smoke:Math.random()*6};
    const grp={name,letter:name[0],cx,cwz,navX:cx,navWZ:cwz,radius:32,cleared:true,ids:[],site,guarded:false};
    // Guards stand off the wreck, not on it, so the scan pass is clear once they are down.
    if(i===n-1&&!guarded&&risk>=3||Math.random()<guardChance){
      const count=Math.min(5,2+Math.floor(risk/3)+(Math.random()<.4?1:0));grp.guarded=true;grp.cleared=false;guarded++;
      for(let j=0;j<count;j++){const ua=j*2.1+Math.random(),ur=12+Math.random()*10;const u=this.spawn(kinds[Math.floor(Math.random()*kinds.length)],cx+Math.sin(ua)*ur,cwz+Math.cos(ua)*ur,Math.random()*6.283,grp);grp.ids.push(u.id)}
    }
    this.groups.push(grp)
  }
  this.seedTerrain();this.lastTravel=travel;this.alt=1.9;
  for(const u of this.units)this.seat(u,1,true);
  for(const g of this.groups){const s=g.site;let lo=Infinity,hi=-Infinity;for(const v of s.mesh?.v||[]){const q=rotate([v[0]*s.s,v[1]*s.s,v[2]*s.s],s.rot);lo=Math.min(lo,q[1]);hi=Math.max(hi,q[1])}s.y=GA_GROUND_Y+this.groundH(s.x,s.wz)-(Number.isFinite(lo)?lo:0)-.05;s.midY=s.y+((Number.isFinite(lo)?lo:0)+(Number.isFinite(hi)?hi:0))/2}
  this.startTotal=this.units.length;this.scanHintT=0;this.scan=null;
  audio.resetMissionVoices?.();audio.music.setMode(guarded?'combat':'calm');
  say(guarded?'CRASH SITES · SCAVENGERS AT SOME':'CRASH SITES · FLY LOW OVER EACH WRECK',1.4);
  this.crashVoice(guarded?'scavengersAtTheCrashSites':'findTheCrashSites',true)
};
G.crashVoice=function(k,priority=false){if(k&&audio?.hasVoice?.(k))audio.playVoice(k,{once:false,priority})};
G.crashScanned=function(){const s=this.groups.filter(g=>g.site);return{got:s.filter(g=>g.site.scanned).length,total:s.length}};
// Every frame on the crash field: pull a recorder when the drone passes low over a wreck whose
// guards are down; say so when they are not.
// v3020 (Dave: scanning a wreck should be a pause to use the scanner, as in other missions).
// Close to a cleared wreck the drone brakes to a hover, turns to frame the wreck, and the
// salvage scanner sweeps it (the fan, the contact line on the hull, the scanner's sound).
G.updateCrashField=function(dt){
  this.scanHintT=Math.max(0,(this.scanHintT||0)-dt);
  const S=this.scan;
  if(S){
    S.t+=dt;
    if(S.phase==='scan'&&S.t>=SCAN_SECONDS){
      wreckScannerAudio?.stop?.();const s=S.g.site;s.scanned=true;this.scan=null;const c=this.crashScanned();SoundFX.objectiveComplete?.();
      say(c.got<c.total?`RECORDER ${c.got} OF ${c.total} RECOVERED`:'ALL RECORDERS RECOVERED',1);
      this.crashVoice(c.got<c.total?'recorderRecovered':'allRecordersRecovered')
    }
    return
  }
  for(const g of this.groups){
    const s=g.site;if(!s||s.scanned)continue;
    const d=Math.hypot(s.x-shipX,s.wz-travel);if(d>CAPTURE_R)continue;
    if(!g.cleared){if(this.scanHintT<=0&&typeof callout==='function'&&callout('SCAVENGERS AT THE WRECK · CLEAR THEM FIRST',1.6)){this.scanHintT=5;this.crashVoice('clearTheScavengersFirst')}continue}
    this.scan={g,phase:'framing',t:0};say('HOLDING · SCANNING WRECK',.8);break
  }
};
// While scanning the drone hovers: it brakes to a stop, then turns and tips to centre the wreck.
const baseSteer=G.updateSteering;
G.updateSteering=function(dt,magX,magY){
  const S=this.active&&this.variant==='crash'?this.scan:null;
  if(!S)return baseSteer.call(this,dt,magX,magY);
  const s=S.g.site,cy=s.midY??s.y,dx=s.x-shipX,dz=s.wz-travel,dist=Math.max(.5,Math.hypot(dx,dz));
  this.spd=moveToward(this.spd,0,dt*42);const fx=Math.sin(viewYaw),fz=Math.cos(viewYaw);
  shipX+=fx*this.spd*dt;travel+=fz*this.spd*dt;surfaceVX=fx*this.spd;surfaceVY=0;
  const g0=this.groundH(shipX,travel);shipY=lerp(shipY,GA_GROUND_Y+g0+Math.max(this.alt,2.6),1-Math.exp(-dt*3));
  const yaw=Math.atan2(dx,dz),pitch=Math.atan2(shipY-cy,dist);
  viewYaw=wrapAngle(viewYaw+clamp(wrapAngle(yaw-viewYaw),-dt*1.4,dt*1.4));viewPitch=moveToward(viewPitch,pitch,dt*.9);viewRoll=moveToward(viewRoll,0,dt*2.5);
  if(S.phase==='framing'&&this.spd<.3&&Math.abs(wrapAngle(yaw-viewYaw))<.02&&Math.abs(viewPitch-pitch)<.02&&S.t>.4){S.phase='scan';S.t=0;wreckScannerAudio?.start?.()}
};
// The salvage scanner's fan and the contact line it draws on the hull.
G.scanParts=function(s){
  const m=s.mesh;s.scanMesh??={v:m.v,e:m.e,faces:m.faces||(typeof meshFaces!=='undefined'?meshFaces.get(m):null)||[]};
  return[{obj:{x:s.x,y:s.y,z:s.wz-travel,s:s.s,rot:s.rot},mesh:s.scanMesh}]
};
G.drawCrashScan=function(){
  const S=this.scan;if(!S||S.phase!=='scan'||typeof salvageRecovery==='undefined')return;
  const s=S.g.site,parts=this.scanParts(s),bounds=salvageRecovery.wreckProjectedBounds(parts);if(!bounds)return;
  const q=ease(clamp(S.t/SCAN_SECONDS,0,1)),col=(Math.floor(S.t*12)%2)?C.m:C.c;
  const pad=Math.max(34,(bounds.maxY-bounds.minY)*.18),scanY=lerp(bounds.minY-pad,bounds.maxY+pad,q),scanX=(bounds.minX+bounds.maxX)*.5;
  const emitter=[0,-.82,1.15],ep=projectCam(emitter);if(!ep)return;
  const farDepth=Math.max(bounds.depth+5.2*s.s,bounds.depth*1.08),f=ep.k*ep.z,unproject=(sx,sy,z)=>[(sx-W*.5)*z/f,(viewH*.48-sy)*z/f,z];
  const farPx=Math.max((bounds.maxX-bounds.minX)*.82,clamp(W*.24,260,480));
  const nl=unproject(ep.x-1.5,ep.y,emitter[2]),nr=unproject(ep.x+1.5,ep.y,emitter[2]),fl=unproject(scanX-farPx,scanY,farDepth),fr=unproject(scanX+farPx,scanY,farDepth);
  const a=projectCam(nl),b=projectCam(nr),c=projectCam(fl),d=projectCam(fr);
  if(a&&b&&c&&d){line(a.x,a.y,c.x,c.y,col,VECTOR_LINE_WIDTH,.94);line(b.x,b.y,d.x,d.y,col,VECTOR_LINE_WIDTH,.94)}
  salvageRecovery.drawWreckScanContact(parts,nl,nr,fl,fr,col)
};
// The engine's own update, with the crash field's rules round it.
const baseUpdate=G.update;
G.update=function(dt){
  if(this.active&&this.variant==='crash'&&this.state==='hunt'){
    for(const g of this.groups){if(g.cleared||!g.guarded)continue;if(g.ids.every(id=>{const u=this.units.find(x=>x.id===id);return!u||u.state!=='alive'})){g.cleared=true;score+=1000;SoundFX.objectiveComplete?.();say(`SCAVENGERS DOWN · SCAN WRECK ${g.letter}`,.9);this.crashVoice('scavengersDownScanTheWreck')}}
    this.updateCrashField(dt);
    // The field is clear only with every recorder in, not just every guard down.
    if(this.groups.every(g=>g.cleared&&(!g.site||g.site.scanned))){this.state='clear';this.clearT=0;say('RECORDERS RECOVERED · LAUNCHING',1.2);if(audio?.music)audio.music.setMode('calm')}
  }
  return baseUpdate.call(this,dt)
};
const baseActive=G.activeGroup;
G.activeGroup=function(){
  if(this.variant!=='crash')return baseActive.call(this);
  let best=null,bd=1e9;for(const g of this.groups){if(g.site?.scanned)continue;const d=this.navDistance(g);if(d<bd){bd=d;best=g}}return best
};
// Wrecks with smoke over them until their recorder is pulled.
const baseAppend=G.appendScene;
G.appendScene=function(scene){
  baseAppend.call(this,scene);
  if(!this.active||this.variant!=='crash'||phase!=='surface')return;
  for(const g of this.groups){const s=g.site;if(!s)continue;const d=Math.hypot(s.x-shipX,s.wz-travel);if(d>GA_UNIT_SIGHT+40)continue;
    const q=camPoint([s.x,s.y,s.wz-travel]);if(q[2]<=.2-6)continue;
    scene.push({z:Math.max(.19,q[2]),draw:()=>{drawMesh({type:'crashWreck',x:s.x,y:s.y,z:s.wz-travel,s:s.s,rot:s.rot,fadeZ:Math.max(0,q[2])*.6},s.mesh,C.w,clamp(1.15-d/220,.35,.92));if(!s.scanned)this.drawCrashSmoke(s,d)}})}
};
G.drawCrashSmoke=function(s,d){
  const t=this.navPulse+s.smoke,al=clamp(1.1-d/240,.25,.8);
  ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=C.w;
  for(let k=0;k<7;k++){const u=(t*.22+k/7)%1,q=camPoint([s.x+u*u*6,s.y+1.2+u*16,s.wz-travel+u*2]);if(q[2]<=.3)continue;const p=projectCam(q);if(!p)continue;
    const r=Math.max(1.5,p.k*(.5+u*2.2));ctx.globalAlpha=al*(1-u)*.6;ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.45,0,0,Math.PI*2);ctx.stroke()}
  ctx.restore()
};
// Nav markers: each unscanned wreck, named as a crash site, marked GUARDED while its guards stand.
const baseMarker=G.drawMarker;
G.drawMarker=function(){
  if(!(this.active&&this.variant==='crash'))return baseMarker.call(this);
  this.drawCrashScan();
  // Draw through the engine with the cleared flags standing in for "scanned", then restore.
  const saved=this.groups.map(g=>[g,g.cleared,g.name]);
  for(const g of this.groups){g.cleared=!!g.site?.scanned;g.name=`WRECK ${g.letter}${g.guarded&&!saved.find(x=>x[0]===g)[1]?' · GUARDED':''}`}
  try{baseMarker.call(this)}finally{for(const[g,c,n]of saved){g.cleared=c;g.name=n}}
};
const baseLeft=G.hudLeft,baseRight=G.hudRight;
G.hudLeft=function(){return this.active&&this.variant==='crash'&&phase==='surface'?'CRASH RECOVERY':baseLeft.call(this)};
G.hudRight=function(){
  if(!(this.active&&this.variant==='crash'&&phase==='surface'))return baseRight.call(this);
  const c=this.crashScanned(),g=this.activeGroup(),left=this.units.filter(u=>u.state==='alive').length;
  if(this.scan)return this.scan.phase==='scan'?`SCANNING WRECK ${this.scan.g.letter} ${Math.round(clamp(this.scan.t/SCAN_SECONDS,0,1)*100)}%`:`HOLDING · WRECK ${this.scan.g.letter}`;
  return`RECORDERS ${c.got}/${c.total}${g?` · SITE ${g.letter} ${Math.round(this.navDistance(g))}`:''}${left?` · GUARDS ${left}`:''}`
};
// With every recorder aboard the job is not over: after the launch it goes on to the depot.
const baseFinish=G.finish;
G.finish=function(success=true,opts={}){
  if(this.scan){wreckScannerAudio?.stop?.();this.scan=null}
  const m=campaign.currentMission;
  if(this.variant==='crash'&&success&&!opts.droneLost&&m&&campaign.currentStageIndex<(m.modules?.length||1)-1){
    this.reset();fighters.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    mode='idle';phase='space';inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;
    scenarioFlow.completeCurrentStage();return
  }
  return baseFinish.call(this,success,opts)
};
})();
