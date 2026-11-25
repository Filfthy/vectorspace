'use strict';

// Missing Manifest finale: a reusable Free Traders Compact orbital freight depot.
// The depot is deliberately a flat-roofed industrial warehouse rather than a
// terrestrial pitched-roof shed.  Its bird mark is generated at runtime from the
// canonical AgentXNetworkLogos.trade SVG path data, preserving the approved logo
// exactly rather than baking a hand-redrawn approximation into this asset.
// v2420 (Dave: the depot is a bit too boxy). The freight hall is now a curved-roof hangar:
// the front wall stays flat (so the loading bays, the logo fascia and the exterior terminal
// keep their exact places) and the roof sweeps over in one curve to the back. Ribs follow
// the curve. The docked freighters have rounded hulls and engine bells, and the roof carries
// round tanks, a radar dome, a pipe run and the mast and dishes rather than boxes.
function buildFreeTradersFreightDepotMesh(){
  const m=gaBuilder(true),PI=Math.PI,line=(p,c)=>gaLine(m,p,c),cols=[];
  const mark=(col,fn)=>{const a=m.e.length;fn();cols.push([a,m.e.length,col])};
  const box=(x0,y0,z0,x1,y1,z1)=>m.box([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],[x1-x0,y1-y0,z1-z0]);
  const rect=(x0,y0,x1,y1,z,diag=false)=>{line([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],true);if(diag){line([[x0,y0,z],[x1,y1,z]]);line([[x1,y0,z],[x0,y1,z]])}};
  const ringX=(x,cy,cz,ry,rz,n)=>Array.from({length:n},(_,i)=>{const t=2*PI*i/n;return[x,cy+Math.sin(t)*ry,cz+Math.cos(t)*rz]});
  const ringZ=(cx,cy,z,rx,ry,n)=>Array.from({length:n},(_,i)=>{const t=2*PI*i/n;return[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,z]});
  // Hall profile in (z,y): flat front wall up to the fascia, then one curve over to the back.
  const P=[[-1.6,-1.0],[-1.6,.72],[-1.5,.96],[-1.22,1.16],[-.72,1.31],[0,1.37],[.72,1.31],[1.22,1.15],[1.56,.9],[1.76,.5],[1.8,0],[1.8,-1.0],[1.55,-1.2],[.45,-1.32],[-.8,-1.29],[-1.5,-1.12]];
  const roofY=z=>{for(let i=1;i<P.length-2;i++){const a=P[i],b=P[i+1];if(z>=a[0]&&z<=b[0])return a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0])}return .72};
  mark(C.y,()=>{
    // Rounded ends: the profile shrinks towards its centre past each end of the hall, so the
    // corners curve back instead of ending in flat walls. One span between, so no seams cross
    // the bays or the fascia on the front.
    const ends=[[3.3,.28],[3.16,.6],[2.98,.86],[2.8,1]],ring=(x,k)=>P.map(([z,y])=>[x,.1+(y-.1)*k,.1+(z-.1)*k]);
    m.loft([...ends.map(([x,k])=>ring(-x,k)),...ends.slice().reverse().map(([x,k])=>ring(x,k))],true,true);
    // Roof ribs, standing just proud of the skin so they read as structure on the curve.
    for(let x=-2.45;x<=2.46;x+=.7)line(P.slice(1).map(([z,y])=>{const k=1.012;return[x,-1+(y+1)*k,z*k]}));
  });
  // Corrugation on the flat front wall, broken round the bays, the fascia and the terminal.
  const frontProtected=[{x0:-2.28,x1:-1.22,y0:-.86,y1:.04},{x0:-.94,x1:.18,y0:-.86,y1:.04},{x0:.43,x1:1.53,y0:-.86,y1:.04},{x0:-.84,x1:.84,y0:.04,y1:.66},{x0:1.80,x1:2.52,y0:-.22,y1:.35}];
  mark(C.y,()=>{for(let x=-2.45;x<=2.46;x+=.35){let spans=[[-.94,.65]];
    for(const r of frontProtected){if(x<r.x0||x>r.x1)continue;const next=[];for(const[a,b]of spans){if(r.y1<=a||r.y0>=b){next.push([a,b]);continue}if(r.y0>a+.001)next.push([a,Math.min(b,r.y0)]);if(r.y1<b-.001)next.push([Math.max(a,r.y1),b])}spans=next}
    for(const[a,b]of spans)if(b-a>.025)line([[x,a,-1.615],[x,b,-1.615]])}});
  // Loading bays.
  const bay=(cx,w,h)=>{mark(C.w,()=>rect(cx-w/2,-.82,cx+w/2,-.82+h,-1.635));mark(C.y,()=>{rect(cx-w/2+.09,-.73,cx+w/2-.09,-.13,-1.646);line([[cx,-.73,-1.648],[cx,-.13,-1.648]])})};
  bay(-1.75,1.02,.82);bay(-.38,1.05,.82);bay(.98,1.02,.82);
  // Logo fascia and the exterior terminal (same places as before; the controller uses them).
  mark(C.w,()=>{box(-.78,.08,-1.705,.78,.63,-1.615);box(1.84,-.18,-1.785,2.48,.31,-1.615);line([[2.16,-.18,-1.80],[2.16,-.43,-1.66]])});
  mark(C.c,()=>rect(1.93,-.08,2.39,.21,-1.797));
  // Roof: a pipe run along the crown, two round tanks, a radar dome, radiator fins, mast and dishes.
  mark(C.w,()=>{
    m.loft([ringX(-2.3,1.47,.35,.09,.09,8),ringX(2.3,1.47,.35,.09,.09,8)],true,true);
    for(const x of[-1.6,-.4,.8,2.0])m.beam([x,1.33,.35],[x,1.4,.35],.08,.08);
    for(const[x,z,r,h]of[[-1.62,.82,.27,.42],[-.98,.86,.23,.3]]){const y0=roofY(z)-.05;
      m.loft([[0,r],[h,r],[h+r*.5,r*.86],[h+r*.85,r*.5],[h+r*.98,r*.15]].map(([dy,rr])=>m.ringXZ(x,y0+dy,z,rr,rr,10)),false,true)}
    {const x=1.0,z=.95,y0=roofY(z)-.03;m.loft([0,.3,.6,.85].map(k=>m.ringXZ(x,y0+.32*Math.sin(k*PI/2),z,.3*Math.cos(k*PI/2),.3*Math.cos(k*PI/2),12)),false,true)}
    for(const sx of[-1,1])m.beam([sx*2.3,1.15,.2],[sx*2.3,1.15,1.05],.03,.03);
    line([[1.62,roofY(.7)-.02,.7],[1.62,2.2,.7]]);line([[1.62,1.75,.7],[1.98,1.9,.58]]);line([[1.62,1.98,.7],[1.38,2.18,.87]]);
  });
  mark(C.c,()=>{
    for(const sx of[-1,1])line([[sx*2.3,1.15,.2],[sx*2.3,1.62,.2],[sx*2.3,1.62,1.05],[sx*2.3,1.15,1.05],[sx*2.3,1.62,.2]]);
    const dish=(cx,cy,cz,r,ax,ay)=>{const pts=Array.from({length:13},(_,i)=>{const t=2*PI*i/12,p=[Math.cos(t)*r,Math.sin(t)*r,0];const y1=p[1]*Math.cos(ax)-p[2]*Math.sin(ax),z1=p[1]*Math.sin(ax)+p[2]*Math.cos(ax),x2=p[0]*Math.cos(ay)+z1*Math.sin(ay),z2=-p[0]*Math.sin(ay)+z1*Math.cos(ay);return[cx+x2,cy+y1,cz+z2]});line(pts);line([pts[0],pts[6]]);line([pts[3],pts[9]])};
    dish(2.0,1.92,.56,.17,-.5,.6);dish(1.32,2.24,.9,.14,-.3,-.7)});
  // Docking arms and the two docked freighters: rounded hulls, a spine pod, engine bells.
  const freighter=(cx)=>{
    mark(C.g,()=>{
      m.loft([[-1.02,.04,.03],[-.8,.2,.13],[-.45,.4,.24],[-.1,.48,.29],[1.25,.48,.29],[1.55,.42,.25],[1.7,.34,.2]].map(([z,rx,ry])=>ringZ(cx,-.28,z,rx,ry,10)),true,true);
      m.loft([[.15,.08,.05],[.3,.2,.12],[1.1,.2,.12],[1.25,.08,.05]].map(([z,rx,ry])=>ringZ(cx,-.02,z,rx,ry,8)),true,true);
    });
    mark(C.c,()=>{for(const ex of[-.2,.2])m.loft([ringZ(cx+ex,-.3,1.68,.08,.08,8),ringZ(cx+ex,-.3,1.82,.11,.11,8),ringZ(cx+ex,-.3,2.0,.16,.16,8)],true,false)});
  };
  mark(C.w,()=>{m.beam([-3.0,-.18,.56],[-3.66,-.18,.56],.13,.13);m.beam([3.0,-.18,.72],[3.66,-.18,.72],.13,.13);
    for(const sx of[-1,1])m.loft([ringX(sx*3.0,-.18,sx<0?.56:.72,.17,.17,8),ringX(sx*3.14,-.18,sx<0?.56:.72,.12,.12,8)],false,false)});
  freighter(-4.12);freighter(4.12);
  // The exact Free Traders Compact bird, from the canonical SVG path data.
  const logo=globalThis.AgentXNetworkLogos?.trade;
  if(logo?.paths?.length)mark(C.w,()=>{
    const vb=String(logo.viewBox||'0 0 1 1').trim().split(/[ ,]+/).map(Number),vx=vb[0]||0,vy=vb[1]||0,vw=Math.max(.001,vb[2]||1),vh=Math.max(.001,vb[3]||1);
    const sc=.46/vh,cy=.355,cz=-1.718;
    for(const d of logo.paths){
      const tokens=String(d).match(/[MLZmlz]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)||[];let i=0,cmd='',first=null,prev=null;
      const P2=(x,y)=>{m.v.push([(x-(vx+vw*.5))*sc,cy-(y-(vy+vh*.5))*sc,cz]);return m.v.length-1};
      while(i<tokens.length){const t=tokens[i++];
        if(/^[MLZ]$/i.test(t)){cmd=t.toUpperCase();if(cmd==='Z'){if(prev!=null&&first!=null&&prev!==first)m.e.push([prev,first]);prev=first;continue}}else{i--}
        if(cmd!=='M'&&cmd!=='L')continue;if(i+1>=tokens.length)break;
        const x=Number(tokens[i++]),y=Number(tokens[i++]);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        const idx=P2(x,y);if(cmd==='M'){first=idx;prev=idx;cmd='L'}else{if(prev!=null)m.e.push([prev,idx]);prev=idx}}
    }
  });
  const edgeColors=m.e.map((_,i)=>{for(const[a,b,c]of cols)if(i>=a&&i<b)return c;return C.y});
  return{name:'Free Traders Freight Depot, curved hall 02',v:m.v,e:m.e,faces:m.faces,edgeColors};
}

class FreeTradersDepotController{
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.state='idle';this.t=0;this.stateT=0;this.depot=null;this.mesh=null;
    this.turnRate=0;this.transferT=0;this.dataPackets=[];this.dataSpawnT=0;this.dataDraining=false;
    this.holdT=0;this.turnT=0;this.turnStart=null;this.clearDistance=0;this.navPulse=0
  }
  prepare(stage){this.reset();this.active=true;this.stage=stage||{};this.mesh=buildFreeTradersFreightDepotMesh();return true}
  begin(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    this.active=true;this.stage=stage||{};this.state='approach';this.t=0;this.stateT=0;this.navPulse=0;
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;asteroids.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    shipX=shipY=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;viewYaw=viewPitch=viewRoll=0;
    resetPlanetBearing();resetSpaceDogfightDirector();resetSpaceMotion();
    const distance=Math.max(260,Number(this.stage?.spawnDistance)||430);
    const spawnX=Number(this.stage?.spawnX)||0,spawnY=Number.isFinite(Number(this.stage?.spawnY))?Number(this.stage.spawnY):-4;
    const w=cameraPointToWorld([spawnX,spawnY,distance]);
    this.depot={
      x:w[0],y:w[1],z:w[2],s:Math.max(12,Number(this.stage?.scale)||26),
      rot:[Number(this.stage?.pitch)||0,Number(this.stage?.yaw)||.075,Number(this.stage?.roll)||0]
    };
    audio.music.setMode(campaign.currentMission?.musicMode||'calm');
    say(String(this.stage?.startMessage||'FREE TRADERS FREIGHT DEPOT AHEAD').toUpperCase(),.82);return true
  }
  stop(){this.reset()}
  autopilotActive(){return !!(this.active&&['terminalApproach','terminalTransfer','terminalHold','terminalTurn','terminalClear'].includes(this.state))}
  localToWorld(p){
    if(!this.depot||!p)return null;const q=rotate([p[0]*this.depot.s,p[1]*this.depot.s,p[2]*this.depot.s],this.depot.rot);
    return[this.depot.x+q[0],this.depot.y+q[1],this.depot.z+q[2]]
  }
  terminalPoint(){return this.localToWorld([2.16,.065,-1.815])}
  terminalNormal(){return v3norm(rotate([0,0,-1],this.depot?.rot||[0,0,0]))}
  terminalUp(){return v3norm(rotate([0,1,0],this.depot?.rot||[0,0,0]))}
  terminalStopPoint(){
    const p=this.terminalPoint(),n=this.terminalNormal(),d=Math.max(10,Number(this.stage?.terminalStandOff)||15.5);return p?v3add(p,v3scale(n,d)):null
  }
  terminalStagePoint(){
    const p=this.terminalPoint(),n=this.terminalNormal(),d=Math.max(62,Number(this.stage?.terminalStageDistance)||82);return p?v3add(p,v3scale(n,d)):null
  }
  depotNavPoint(){return this.localToWorld([0,0,-2.40])}
  depotMarkerPoint(){return this.localToWorld([0,1.20,-2.40])}
  distanceTo(p){return p?Math.hypot(p[0]-shipX,p[1]-shipY,p[2]):Infinity}
  shiftDepot(delta){if(!this.depot||!delta)return;this.depot.x-=delta[0];this.depot.y-=delta[1];this.depot.z-=delta[2]}
  moveWithPlayer(dt){
    const speed=OPEN_SPACE_CRUISE;this.shiftDepot([spaceMoveX*speed*dt,spaceMoveY*speed*dt,spaceMoveZ*speed*dt])
  }
  alignTo(point,dt,maxRate=1.25){return steerExteriorAutopilot(this,point,dt,maxRate)}
  beginTerminalApproach(){
    if(!this.active)return false;this.state='terminalApproach';this.stateT=0;this.turnRate=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    // v2170: hand over at the speed the drone was already flying, so the autopilot does
    // not open with a dead stop.
    ensureSpaceOrientation();this.autoVel=v3scale(spaceForward,OPEN_SPACE_CRUISE);
    laserBurstRemaining=0;endLaserTrigger();say('AUTOPILOT · EXTERIOR TERMINAL',.68);return true
  }
  updateTerminalApproach(dt){
    const stop=this.terminalStopPoint(),terminal=this.terminalPoint();if(!stop||!terminal)return;
    const auto=updateExteriorTargetAutopilot(this,terminal,stop,d=>this.shiftDepot(d),dt,{smooth:true,maxSpeed:15,minSpeed:4.5,speedScale:1.9});
    if(auto.arrived)this.beginTransfer()
  }
  beginTransfer(){
    this.state='terminalTransfer';this.stateT=0;this.transferT=0;this.dataPackets.length=0;this.dataSpawnT=.08;this.dataDraining=false;
    for(let i=0;i<5;i++)this.dataPackets.push(...stationHack.makeDataPacketGroup(true));
    audio?.hackChirp?.start?.();say('TRANSMITTING FLIGHT RECORDER DATA',.78);return true
  }
  updateTransfer(dt){
    this.transferT+=dt;const seconds=Math.max(1.6,Number(this.stage?.transferSeconds)||3.1);
    for(let i=this.dataPackets.length-1;i>=0;i--){const p=this.dataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.dataPackets.splice(i,1)}
    if(this.transferT>=seconds)this.dataDraining=true;
    if(!this.dataDraining){this.dataSpawnT-=dt;while(this.dataSpawnT<=0&&this.dataPackets.length<18){this.dataPackets.push(...stationHack.makeDataPacketGroup(false));this.dataSpawnT+=.14+Math.random()*.34}}
    // v2170: done at most .6 s after the upload time, not after every packet still in
    // flight has landed (that left the drone sitting there for a second or two more).
    if(!this.dataDraining||(this.dataPackets.length&&this.transferT<seconds+.6))return;this.dataPackets.length=0;
    audio?.hackChirp?.stop?.();SoundFX.relayCalibrated?.();audio.playVoice(this.stage?.completeVoice||'dataTransferComplete',{once:false,priority:true});
    this.state='terminalHold';this.holdT=0;this.stateT=0
  }
  beginTurn(){
    ensureSpaceOrientation();this.state='terminalTurn';this.turnT=0;this.stateT=0;this.turnStart={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp]};return true
  }
  updateTurn(dt){
    this.turnT+=dt;const seconds=Math.max(1.25,Number(this.stage?.turnSeconds)||1.75),u=clamp(this.turnT/seconds,0,1),q=ease(u),st=this.turnStart;
    if(st){spaceForward=rotateAroundAxis(st.f,st.u,Math.PI*q);spaceRight=rotateAroundAxis(st.r,st.u,Math.PI*q);spaceUp=[...st.u];orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=-Math.sin(u*Math.PI)*.08}
    if(u>=1){viewRoll=0;this.state='terminalClear';this.clearDistance=0;this.stateT=0;this.turnStart=null}
  }
  updateClear(dt){
    const speed=OPEN_SPACE_CRUISE,delta=[spaceForward[0]*speed*dt,spaceForward[1]*speed*dt,spaceForward[2]*speed*dt];this.shiftDepot(delta);this.clearDistance+=speed*dt;
    if(this.clearDistance>=Math.max(34,Number(this.stage?.clearDistance)||52)){this.state='complete';SoundFX.objectiveComplete();scenarioFlow.completeCurrentStage()}
  }
  update(dt){
    if(!this.active||mode!=='play')return;this.t+=dt;this.stateT+=dt;this.navPulse+=dt;
    if(this.state==='approach'){
      this.moveWithPlayer(dt);const centre=this.depotNavPoint(),d=this.distanceTo(centre);
      if(d<Math.max(150,Number(this.stage?.depotRevealRadius)||205)){this.state='terminalNav';this.stateT=0;say('PROCEED TO EXTERIOR TERMINAL',.78);SoundFX.objectiveComplete()}
      return
    }
    if(this.state==='terminalNav'){
      this.moveWithPlayer(dt);const stage=this.terminalStagePoint(),centre=this.depotNavPoint(),d=Math.min(this.distanceTo(stage),this.distanceTo(centre));
      if(d<Math.max(58,Number(this.stage?.terminalCaptureRadius)||86))this.beginTerminalApproach();return
    }
    if(this.state==='terminalApproach'){this.updateTerminalApproach(dt);return}
    if(this.state==='terminalTransfer'){this.updateTransfer(dt);return}
    // v2170: turn away after a beat while the confirmation is still being spoken, rather
    // than holding still until the line has finished.
    if(this.state==='terminalHold'){this.holdT+=dt;if(this.holdT>.6)this.beginTurn();return}
    if(this.state==='terminalTurn'){this.updateTurn(dt);return}
    if(this.state==='terminalClear'){this.updateClear(dt);return}
  }
  meshDepth(){
    if(!this.depot||!this.mesh?.v?.length)return null;const d=[];
    for(const p of this.mesh.v){const r=rotate([p[0]*this.depot.s,p[1]*this.depot.s,p[2]*this.depot.s],this.depot.rot),q=camPoint([this.depot.x+r[0],this.depot.y+r[1],this.depot.z+r[2]]);if(q[2]>.18)d.push(q[2])}
    if(!d.length)return null;d.sort((a,b)=>a-b);return d[(d.length/2)|0]
  }
  drawTerminalDisplay(){
    if(!this.depot)return;const z=-1.804,left=1.94,right=2.38,bottom=-.07,top=.20;
    stationHack.drawLineDisplay((x,y)=>proj(this.localToWorld([x,y,z])),{left,right,bottom,top,alarm:false,time:this.t})
  }
  drawTransfer(){
    if(this.state!=='terminalTransfer')return;const p=this.terminalPoint();if(!p)return;const target=camPoint(p);if(target&&target[2]>.2)stationHack.drawDataRamp([0,-.62,.82],target,this.dataPackets,{sourceHalf:.88,targetHalf:.34})
  }
  appendScene(scene){
    if(!this.active||!this.depot||this.state==='complete'||!this.mesh)return;const d=this.meshDepth();if(d==null)return;
    scene.push({z:d,draw:()=>{drawMesh(this.depot,this.mesh,C.y,.96);this.drawTerminalDisplay();this.drawTransfer()}})
  }
  markerTarget(){
    // Keep the depot approach label above the roofline.  The canonical Free
    // Traders bird has a protected fascia and should never have HUD copy written
    // across it as the station fills the screen.
    if(this.state==='approach')return{point:this.depotMarkerPoint(),label:'FREIGHT DEPOT',size:13,grow:true,growRange:230,maxSize:23};
    if(this.state==='terminalNav')return{point:this.terminalStagePoint(),label:'TERMINAL',size:13,grow:true,growRange:120,maxSize:22};
    return null
  }
  drawMarker(){
    if(!this.active||mode!=='play'||this.autopilotActive())return;const t=this.markerTarget();if(!t?.point)return;const q=camPoint(t.point);let r=t.size||13;
    if(t.grow&&q[2]>.15){const d=this.distanceTo(t.point),gr=Math.max(20,t.growRange||120),mx=Math.max(r,t.maxSize||22);r=clamp(r+(gr-d)*(mx-r)/gr,r,mx)}
    let p=null,on=false;if(q[2]>.15){p=projectCam(q);on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH)}if(!on)p=hudEdgeCue(q,r);if(!p)return;
    const col=C.y,x=p.x,y=p.y;line(x-r,y,x,y-r,col,1.2,.96);line(x,y-r,x+r,y,col,1.2,.96);line(x+r,y,x,y+r,col,1.2,.96);line(x,y+r,x-r,y,col,1.2,.96);drawHudMarkerLabel(t.label,x,y,r,col)
  }
  hudLeft(){return this.active?'FREE TRADERS FREIGHT DEPOT':''}
  hudRight(){
    if(!this.active)return'';
    if(this.state==='terminalApproach')return'AUTOPILOT · TERMINAL';
    if(this.state==='terminalTransfer')return`${this.stage?.transferHud||'DATA UPLOAD'} ${Math.round(clamp(this.transferT/Math.max(1.6,Number(this.stage?.transferSeconds)||3.1),0,1)*100)}%`;
    if(this.state==='terminalHold')return this.stage?.receivedHud||'DATA RECEIVED';
    if(this.state==='terminalTurn')return'TURNAROUND';
    if(this.state==='terminalClear')return'CLEARING DEPOT';
    const t=this.markerTarget();return t?.point?`${t.label} ${Math.round(this.distanceTo(t.point))}`:''
  }
}
