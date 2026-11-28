'use strict';
// v3016 GROUND JOBS IN ANY SETTING (Dave: canyons, forests, swamps should be for all sorts of
// things: delivery, get data, scan wreckage, reconnaissance, rescue; keep unique buildings for
// different environments). The corridor run (forest, swamp, canyon) ends at a site, and the job
// decides what happens there. Each setting keeps its own building: the cabin in the forest, the
// stilt outpost in the swamp, the door in the rock in the canyon.
//   Delivery      cabin_delivery / swamp_relay_delivery           drop a parcel at the building
//   Pickup        the same, with terminalConfig.pickup            the parcel comes up instead
//   Data recovery wreckage_recovery, terminalConfig.dataSite      download from the building
//   Wreck scan    site_work, work 'scan', target 'wreck'          scan a downed hauler
//   Recon         site_work, work 'scan', target 'site'           scan points on the run, then the building
//   Rescue        site_work, work 'rescue', target 'wreck'        lift the survivors at a crash
(()=>{
const Q=CorridorEnvironmentController.prototype;
const cfgOf=c=>c.stage?.terminalConfig||{};
Q.playStageVoice=function(k){if(k&&audio?.hasVoice?.(k))audio.playVoice(k,{once:false,priority:true})};
// The setting's own building at the head of the run, set up as the delivery ending would.
Q.setupSettingBuilding=function(){
  if(this.isSwampVariant())return this.setupRelayDestination();   // the stilt outpost is a relay station already
  if(!this.isCanyonVariant()&&cfgOf(this).facility==='station')return this.setupFieldStation();
  return this.setupCabinDestination()   // the forest cabin, or in the canyon the door in the rock
};
// v3021: the forest's technical site, the field station, set up as the cabin would be.
Q.setupFieldStation=function(){
  this.cabinMesh=globalThis.AgentXFacility.fieldStationMesh();
  this.gladeStartU=Math.max(60,this.length-46);
  const anchor=this.rawPathAtWorld(this.startWorld+this.length+6);
  this.gladeCentreX=anchor.x;this.gladeFloor=anchor.floor;this.cabinYaw=0;
  this.cabin={x:this.gladeCentreX,y:this.gladeFloor,worldZ:this.startWorld+this.length+8,s:1.0,rot:[0,0,0]};
  this.deliveryLocal=this.cabinMesh.deliveryPoint;this.deliveryWorld=this.cabinLocalToWorld(this.deliveryLocal);
  const cp=this.cabinMesh.consolePoint;this.standOffWorld=this.cabinLocalToWorld([cp[0]-.6,1.7,cp[2]-9.2]);
  return true
};
// The middle of the building, for scans and data.
Q.buildingFocus=function(){
  if(this.relayOutpost)return this.relayLocalToWorld([0,2.6,1.4]);
  if(this.cabin)return this.cabinLocalToWorld([0,this.isCanyonVariant()?3.4:2.4,this.isCanyonVariant()?2.6:0]);
  return null
};

// ---------- Data recovery: download from the building's terminal ----------
const baseSetupWreckage=Q.setupWreckageDestination;
Q.setupWreckageDestination=function(){
  if(!cfgOf(this).dataSite)return baseSetupWreckage.call(this);
  this.setupSettingBuilding();
  const at=this.relayOutpost?this.relayConsoleWorld:this.cabinLocalToWorld(this.cabinMesh?.consolePoint||[0,1.6,-1.6]);
  this.recorder={x:at[0],y:at[1],worldZ:at[2],rot:[0,0,0],hidden:true};
  // Park square in front of the terminal, not the pad.
  // Kept well inside the basin's flyable width, or the walls would push the drone off it.
  const cp=this.cabinMesh?.consolePoint;if(this.cabin&&cp)this.standOffWorld=this.cabinLocalToWorld([clamp(cp[0]-.4,-4,4),1.7,cp[2]-9.2]);
  const so=this.standOffWorld;this.recorderStandOff=[so[0],so[1],so[2]];this.standOffWorld=this.recorderStandOff;
  this.wreckage=[];this.dataPackets.length=0;this.dataSpawnT=0;this.dataT=0;this.dataDraining=false;this.dataComplete=false;
  return true
};

// ---------- Pickup: the delivery ending run backwards ----------
for(const name of['cabinCargoState','relayCargoState']){
  const base=Q[name];
  Q[name]=function(){
    if(!cfgOf(this).pickup)return base.call(this);
    const relay=name==='relayCargoState';
    if(relay?this.terminalDestination!=='swamp_relay_delivery':this.terminalDestination!=='cabin_delivery')return null;
    if(!this.deliveryWorld)return null;
    const site=[this.deliveryWorld[0],this.deliveryWorld[1],this.deliveryWorld[2]-travel];
    if(this.deliveryLanded||this.terminalState==='deliveryHold'||this.terminalState==='missionSpeech'||this.terminalState==='departing')return null;   // aboard
    if(this.terminalState!=='delivery')return{point:site,beam:false,landed:true};   // waiting on the pad
    const bay=cameraPointToWorld([0,-.34,1.05]),q=this.deliveryProgress;
    return{point:[lerp(site[0],bay[0],q),lerp(site[1],bay[1],q),lerp(site[2],bay[2],q)],beam:q>.01&&q<.995,landed:false}
  }
}

// ---------- Scan and rescue ----------
Q.setupSiteWork=function(){
  const cfg=cfgOf(this),r=()=>this.rand();
  if(cfg.target==='site'){this.setupSettingBuilding();this.siteFocus=this.buildingFocus()}
  else{
    // A downed hauler with its debris round it, at the head of the run.
    baseSetupWreckage.call(this);
    const rz=this.recorder.worldZ;this.recorder=null;
    const yaw=.6+r()*.5,hull={mesh:longHaulFreighterMesh,s:1.15,x:this.gladeCentreX+(r()<.5?-1:1)*1.2,worldZ:rz+4,rot:[-.035,yaw,0]};
    let lo=Infinity;for(const v of hull.mesh.v){const q=rotate([v[0]*hull.s,v[1]*hull.s,v[2]*hull.s],hull.rot);lo=Math.min(lo,q[1])}
    hull.y=this.gladeFloor-lo-.04;this.siteHull=hull;this.siteFocus=[hull.x,hull.y+.6,hull.worldZ];
    this.standOffWorld=[this.gladeCentreX,this.gladeFloor+1.9,rz-10.5];
    if(cfg.work==='rescue'){
      const n=2+Math.floor(r()*3);
      this.survivors=Array.from({length:n},(_,i)=>{const a=-1.1+i*(2.2/Math.max(1,n-1))+(r()-.5)*.3;return{x:hull.x+Math.sin(a)*4.2,worldZ:rz-1.2+Math.cos(a)*1.6,phase:r()*6,lift:0,aboard:false}})
    }
  }
  // The drone turns to face the site (the delivery steering reads deliveryWorld).
  this.deliveryWorld=this.siteFocus;
  this.siteT=0;this.siteDone=false;
  return true
};
// The scripted end of the run: approach, settle facing the site, do the work, leave.
// Returns true while it owns the frame.
Q.updateSiteWork=function(dt){
  const cfg=cfgOf(this),P=this.stage?.presentation||{},s=this.terminalState;
  if(s==='run'){if(this.gladeBlend(travel+18)>.16){this.terminalState='approach';laserBurstRemaining=0;endLaserTrigger();inputX=inputY=aimX=aimY=0;say(P.autopilot||'AUTOPILOT',.58)}return false}
  if(s==='approach'){
    if((this.standOffWorld[2]-travel)<=.24){travel=this.standOffWorld[2];shipX=this.standOffWorld[0];shipY=this.standOffWorld[1];this.terminalState='settle';this.finishT=0;viewRoll=0;inputX=inputY=aimX=aimY=0}
    return false
  }
  if(s==='settle'){
    this.finishT+=dt;const f=this.siteFocus,dz=Math.max(.1,f[2]-travel),yaw=Math.atan2(f[0]-shipX,dz),pitch=Math.atan2(-(f[1]-shipY),Math.hypot(f[0]-shipX,dz))*.6;
    viewYaw=wrapAngle(viewYaw+clamp(wrapAngle(yaw-viewYaw),-dt*.62,dt*.62));viewPitch=moveToward(viewPitch,pitch,dt*.5);viewRoll=lerp(viewRoll,0,clamp(dt*3.2,0,1));
    if(this.finishT>.62&&Math.abs(wrapAngle(yaw-viewYaw))<.025){this.terminalState='work';this.siteT=0;
      if(cfg.work==='scan'){wreckScannerAudio?.start?.();say(P.workStart||'SCANNING',.7)}else say(P.workStart||'LIFTING SURVIVORS',.7)}
    return true
  }
  if(s==='work'){
    this.siteT+=dt;
    if(cfg.work==='scan'){
      if(this.siteT>=(cfg.scanSeconds||6)){wreckScannerAudio?.stop?.();SoundFX.objectiveComplete();say(P.done||'SCAN COMPLETE',.9);this.playStageVoice(P.doneVoice||'scanComplete');this.terminalState='hold';this.finishT=0}
    }else{
      // One survivor at a time rises up the beam into the drone.
      const each=1.7;let up=0;
      this.survivors.forEach((v,i)=>{v.lift=clamp((this.siteT-i*each)/each,0,1);if(v.lift>=1&&!v.aboard){v.aboard=true;SoundFX.objectiveComplete?.()}if(v.aboard)up++});
      if(up===this.survivors.length){say(P.done||'SURVIVORS RECOVERED',.9);this.playStageVoice(P.doneVoice||'survivorsRecovered');this.terminalState='hold';this.finishT=0}
    }
    return true
  }
  if(s==='hold'){this.finishT+=dt;if(this.finishT>1.1&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){this.terminalState='missionSpeech';this.finishT=0;audio.playVoice('missionComplete',{once:true,priority:true})}return true}
  if(s==='missionSpeech'){this.finishT+=dt;if(this.finishT>.32&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){this.terminalState='departing';this.devExitPending=!this.scenarioMode;beginSurfaceExit({scene:'forest',continueMission:true})}return true}
  return s==='departing'
};
Q.siteHud=function(){
  const cfg=cfgOf(this),P=this.stage?.presentation||{},s=this.terminalState;
  if(s==='run')return null;
  if(s==='approach'||s==='settle')return P.hudAutopilot||'AUTOPILOT';
  if(s==='work'){if(cfg.work==='scan')return`${P.hudWork||'SCANNING'} ${Math.round(clamp(this.siteT/(cfg.scanSeconds||6),0,1)*100)}%`;return`${P.hudWork||'RESCUED'} ${this.survivors.filter(v=>v.aboard).length}/${this.survivors.length}`}
  if(s==='hold')return P.hudDone||(cfg.work==='scan'?'SCAN COMPLETE':'SURVIVORS ABOARD');
  return'MISSION COMPLETE'
};
Q.appendSiteItems=function(items){
  const h=this.siteHull;
  if(h){const z=h.worldZ-travel,q=camPoint([h.x,h.y+.5,z]);if(q[2]>.18&&q[2]<160)items.push({d:q[2],draw:()=>drawMesh({type:'downedHauler',x:h.x,y:h.y,z:h.worldZ-travel,s:h.s,rot:h.rot},h.mesh,C.w,.95)})}
  for(const v of this.survivors||[]){if(v.aboard)continue;const z=v.worldZ-travel,q=camPoint([v.x,this.gladeFloor+.8,z]);if(q[2]>.18&&q[2]<120)items.push({d:q[2]-.2,draw:()=>this.drawSurvivor(v)})}
  for(const p of this.scanPoints||[]){const z=p.worldZ-travel,q=camPoint([p.x,p.y+1.6,z]);if(q[2]>.18&&q[2]<110)items.push({d:q[2],draw:()=>this.drawScanPoint(p)})}
};
// A survivor: a stick figure on the ground waving, then rising up the beam when lifted.
Q.drawSurvivor=function(v){
  const t=(this.navPulse||performance.now()/1000)+v.phase,bay=cameraPointToWorld([0,-.34,1.05]),u=ease(v.lift);
  if(u>.9)return;   // in through the hatch
  const k=1-.82*u,gx=lerp(v.x,bay[0],u),gy=lerp(this.gladeFloor,bay[1]-.3,u),gz=lerp(v.worldZ-travel,bay[2]+.6,u),P=(x,y)=>proj([gx+x*k,gy+y*k,gz]);
  const head=P(0,1.55),neck=P(0,1.35),hip=P(0,.75),fl=P(-.22,0),fr=P(.22,0),wave=Math.sin(t*6)*.25,hl=P(-.42,1.15+(v.lift?0:.1)),hr=P(.4,1.65+wave);
  if(!head||!hip)return;ctx.save();ctx.strokeStyle=C.y;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.95;ctx.beginPath();
  const r=clamp(Math.abs((P(0,1.7)?.y??head.y)-head.y),1.5,10);ctx.moveTo(head.x+r,head.y);ctx.arc(head.x,head.y,r,0,Math.PI*2);
  ctx.moveTo(neck.x,neck.y);ctx.lineTo(hip.x,hip.y);if(fl&&fr){ctx.moveTo(fl.x,fl.y);ctx.lineTo(hip.x,hip.y);ctx.lineTo(fr.x,fr.y)}
  if(hl&&hr){ctx.moveTo(hl.x,hl.y);ctx.lineTo(neck.x,neck.y);ctx.lineTo(hr.x,hr.y)}ctx.stroke();ctx.restore()
};
// Over the scene: the scan fan sweeping the site, and the rescue beam.
Q.drawSiteOverlay=function(){
  if(this.terminalDestination!=='site_work'||this.terminalState!=='work')return;
  const cfg=cfgOf(this),from=proj(cameraPointToWorld([0,-.40,.80]));if(!from)return;
  ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;
  if(cfg.work==='scan'){
    const f=this.siteFocus,span=cfg.target==='wreck'?6:5.5,h=cfg.target==='wreck'?3.2:5,k=(this.siteT*.55)%1,sweep=lerp(-span,span,k<.5?k*2:2-k*2);
    const a=proj([f[0]+sweep,f[1]-h*.5,f[2]-travel]),b=proj([f[0]+sweep,f[1]+h,f[2]-travel]);
    if(a&&b){ctx.strokeStyle=C.c;ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(from.x,from.y);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=VECTOR_LINE_WIDTH*2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.lineWidth=VECTOR_LINE_WIDTH;
      ctx.globalAlpha=.35;for(let i=1;i<4;i++){const c=proj([f[0]+sweep,f[1]-h*.5+(h*1.5)*i/4,f[2]-travel]);if(c){ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(c.x,c.y);ctx.stroke()}}}
  }else{
    const v=this.survivors.find(x=>!x.aboard&&x.lift>0)||this.survivors.find(x=>!x.aboard);
    if(v){const u=ease(v.lift),bay=cameraPointToWorld([0,-.34,1.05]),p=proj([lerp(v.x,bay[0],u),lerp(this.gladeFloor,bay[1],u)+.7,lerp(v.worldZ-travel,bay[2],u)]);
      if(p){ctx.strokeStyle=C.c;ctx.globalAlpha=.6;const w=Math.max(6,Math.abs(p.x-from.x)*.12+8);for(let i=0;i<5;i++){const t=(i/5+this.siteT*.8)%1,x=lerp(from.x,p.x,t),y=lerp(from.y,p.y,t),hw=lerp(10,w,t);ctx.beginPath();ctx.moveTo(x-hw,y);ctx.lineTo(x+hw,y);ctx.stroke()}
        ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(from.x-10,from.y);ctx.lineTo(p.x-w,p.y);ctx.moveTo(from.x+10,from.y);ctx.lineTo(p.x+w,p.y);ctx.stroke()}}
  }
  ctx.restore()
};

// ---------- Recon: scan points on the run ----------
// Posts with a diamond beacon in the lane. Fly past close to one to scan it. Each scanned
// point pays a share of the fee on top, each missed one is lost (the run only goes forward).
Q.setupScanPoints=function(){
  const n=Math.max(0,Math.round(Number(cfgOf(this).scanPoints)||0));this.scanPoints=[];if(!n)return;
  const u0=70,u1=(this.hasGladeDestination()?this.gladeStartU:this.length)-30;
  for(let i=0;i<n;i++){
    const u=lerp(u0,u1,(i+.5)/n),wz=this.startWorld+u,p=this.pathAtWorld(wz),x=p.x+(i%2?1:-1)*p.half*(.25+this.rand()*.3);
    this.scanPoints.push({x,worldZ:wz,y:this.floorAt(wz,x),done:false,missed:false});
    // Keep the lane round a scan point free of hazards so it can always be reached.
    const clear=t=>!(t.obstacle&&Math.abs(t.worldZ-wz)<12);this.obstacles=this.obstacles.filter(clear);this.trees=this.trees.filter(clear)
  }
};
Q.updateScanPoints=function(){
  for(const p of this.scanPoints){
    if(p.done||p.missed||p.worldZ-travel>0)continue;
    if(Math.abs(shipX-p.x)<1.8){p.done=true;SoundFX.objectiveComplete?.();const n=this.scanPoints.filter(x=>x.done).length;
      if(typeof callout==='function')callout(`SCAN POINT ${n} OF ${this.scanPoints.length} LOGGED`,1.4);this.playStageVoice('scanPointLogged');
      const m=this.scenarioMode?campaign.currentMission:null;if(m)(m.diversions||(m.diversions=[])).push({kind:'reconPoint',outcome:'scanned',text:'Scan point logged',pay:Math.round(m.pay*.05/50)*50,xp:0,rep:0})}
    else{p.missed=true;if(typeof callout==='function')callout('SCAN POINT MISSED',1.2)}
  }
};
Q.drawScanPoint=function(p){
  const z=p.worldZ-travel,g=proj([p.x,p.y,z]),t=proj([p.x,p.y+3.2,z]);if(!g||!t)return;
  const col=p.done?C.g:(p.missed?C.r:C.c),pulse=p.done||p.missed?0:Math.sin(performance.now()/160)*1.5,r=Math.max(4,Math.min(16,(g.y-t.y)*.18))+pulse;
  ctx.save();ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=p.missed?.45:.9;ctx.beginPath();
  ctx.moveTo(g.x,g.y);ctx.lineTo(t.x,t.y);ctx.moveTo(t.x,t.y-r);ctx.lineTo(t.x+r,t.y);ctx.lineTo(t.x,t.y+r);ctx.lineTo(t.x-r,t.y);ctx.closePath();
  if(p.done){ctx.moveTo(t.x,t.y-r*1.6);ctx.lineTo(t.x+r*1.6,t.y);ctx.lineTo(t.x,t.y+r*1.6);ctx.lineTo(t.x-r*1.6,t.y);ctx.closePath()}
  // A ring on the ground marks how close to pass.
  for(let i=0;i<12;i++){const a=i/12*6.2832,b=(i+1)/12*6.2832,q1=proj([p.x+Math.cos(a)*1.8,p.y+.05,z+Math.sin(a)*1.8]),q2=proj([p.x+Math.cos(b)*1.8,p.y+.05,z+Math.sin(b)*1.8]);if(q1&&q2){ctx.moveTo(q1.x,q1.y);ctx.lineTo(q2.x,q2.y)}}
  ctx.stroke();
  if(!p.done&&!p.missed&&z<80){ctx.font='400 9px Consolas,monospace';ctx.textAlign='center';ctx.strokeText('SCAN',t.x,t.y-r-5)}
  ctx.restore()
};
})();
