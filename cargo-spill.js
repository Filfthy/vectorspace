'use strict';

// CARGO SPILL (v2080, reworked v2530)
//
// A Free Traders job. A hauler took a hit and her hold split open. Her consignment was
// small sealed cases of valuables, and they are now tumbling round her. AX-1 is a small
// drone, not a freighter: it carries HOLD cases at a time. Fly up to a case (within REACH)
// and the drone stops and tractors it aboard. Fly back to the hauler (within DROP of her)
// and it holds station and tractors the hold across to her. A few seconds in, pirate scavengers arrive. They go for the loose cases,
// not the drone, and any case one reaches is gone, until the drone shoots that
// scavenger, which then fights back. Cases keep drifting slowly outward and any that get
// LOST_RANGE from the hauler are gone too. Pay and Free Traders standing follow the share
// of cases delivered.
// Hooks: route-diversion.js begin / update / onFightCleared / hudLeft / appendScene /
// drawMarker / reset, for the route_diversion stage with diversion:'spill'.
const AgentXCargoSpill={
  REACH:14,DROP:58,HOLD:3,SCAV_AT:5,LOST_RANGE:520,
  pods:[],hauler:null,carried:0,picked:0,handover:null,
  state:'idle',t:0,got:0,stolen:0,lost:0,total:0,scavsIn:false,scavsDone:false,lastTake:0,lastFull:-9,lastLost:-9,deliverCue:false,last:null,
  begin(stage,risk){
    risk=Math.max(1,Number(risk)||1);this.risk=risk;
    const n=Math.max(8,Math.min(12,7+Math.round(risk*.5))),clusters=Math.ceil(n/3);
    this.pods=[];this.handover=null;this.t=0;this.got=0;this.stolen=0;this.lost=0;this.carried=0;this.picked=0;this.total=n;
    this.scavsIn=false;this.scavsDone=false;this.lastTake=-9;this.lastFull=-9;this.lastLost=-9;this.deliverCue=false;this.state='spill';this.last=null;
    // The hauler sits ahead in the lane, a little low and turned, so her length reads.
    const side=Math.random()<.5?-1:1,h=cameraPointToWorld([side*18,-6,240]);
    this.hauler={x:h[0],y:h[1],z:h[2],s:4.6,rot:[-.04,side*.55,.06]};
    for(let c=0;c<clusters;c++){
      // Each cluster is a short trail of cases that came out of the split hold together,
      // at its own bearing round the hauler, so the spill is spread all round her.
      const az=(c/clusters)*Math.PI*2+Math.random()*.7,el=(Math.random()-.5)*.6,dist=95+Math.random()*150;
      const dir=[Math.cos(el)*Math.sin(az),Math.sin(el),-Math.cos(el)*Math.cos(az)];
      for(let i=0;i<3&&this.pods.length<n;i++){
        const r=dist+i*16+Math.random()*6,j=()=>(Math.random()-.5)*7;
        const x=this.hauler.x+dir[0]*r+j(),y=this.hauler.y+dir[1]*r+j(),z=this.hauler.z+dir[2]*r+j(),spd=1.6+Math.random()*1.2;
        this.pods.push({x,y,z,s:.62,mx:1,my:.7,mz:1.3,rot:[Math.random()*6,Math.random()*6,0],spin:[(Math.random()-.5)*2,(Math.random()-.5)*2.2],
          drift:[dir[0]*spd+(Math.random()-.5)*.6,dir[1]*spd+(Math.random()-.5)*.5,dir[2]*spd+(Math.random()-.5)*.6],state:'free',flash:0})
      }
    }
    return true
  },
  free(){return this.pods.filter(p=>p.state==='free')},
  live(){return typeof fighters==='undefined'?[]:fighters.filter(f=>!f.dead&&!f.dying&&f.t>=0)},
  haulerDistance(){const h=this.hauler;return h?Math.hypot(h.x-shipX,h.y-shipY,h.z):1e9},
  // Called each frame. Returns 'scavengers' once when they should be sent in, 'done'
  // when every case is settled and no scavenger is left, otherwise null.
  update(dt){
    if(this.state!=='spill')return null;
    this.t+=dt;const h=this.hauler;
    // v2550 (Dave: we always tractor cargo). While the hold is being beamed across the drone
    // holds station, so nothing shifts past it.
    if(this.handover)this.updateHandover(dt);
    const k=this.handover?0:OPEN_SPACE_CRUISE*dt;
    h.x-=spaceMoveX*k;h.y-=spaceMoveY*k;h.z-=spaceMoveZ*k;
    for(const p of this.pods){
      p.flash=Math.max(0,p.flash-dt);if(p.state!=='free')continue;
      p.x-=spaceMoveX*k;p.y-=spaceMoveY*k;p.z-=spaceMoveZ*k;
      p.x+=p.drift[0]*dt;p.y+=p.drift[1]*dt;p.z+=p.drift[2]*dt;p.rot[0]+=p.spin[0]*dt;p.rot[1]+=p.spin[1]*dt;
      if(!this.handover&&Math.hypot(p.x-shipX,p.y-shipY,p.z)<this.REACH){
        // In reach: the drone stops, turns to the case and tractors it aboard, the same
        // recovery pickup used for every other package (system-salvage.js).
        if(this.carried<this.HOLD&&!salvageRecovery.active&&this.beginTractor(p))return null;
        if(this.carried>=this.HOLD&&this.t-this.lastFull>3){this.lastFull=this.t;callout('HOLD FULL · TAKE THE CASES TO THE HAULER',1.2,false)}
      }
      // Drifted out of the hauler's scanner range: gone.
      if(Math.hypot(p.x-h.x,p.y-h.y,p.z-h.z)>this.LOST_RANGE){p.state='lost';this.lost++;
        if(this.t-this.lastLost>3){this.lastLost=this.t;callout('A CASE DRIFTED OUT OF RANGE',1.2,false)}}
    }
    // Alongside the hauler with cases aboard: hold station and tractor them across.
    if(!this.handover&&this.carried>0&&this.haulerDistance()<this.DROP){
      this.handover={t:0,n:this.carried};callout('HOLDING STATION · TRANSFERRING CARGO',1.2,false)
    }
    // Scavengers that have not been shot fly for the nearest loose case (steerScavenger)
    // and take it when they reach it.
    const scavs=this.live();
    for(const f of scavs){
      if(f.provoked)continue;f.shotsLeft=0;const best=f.spillTarget;
      if(best&&best.state==='free'&&Math.hypot(best.x-f.x,best.y-f.y,best.z-f.z)<6){best.state='stolen';this.stolen++;f.spillTarget=null;
        if(this.t-this.lastTake>2.5){this.lastTake=this.t;callout(`SCAVENGER TOOK A CASE · ${this.stolen} STOLEN`,1.3,false)}}
    }
    if(!this.scavsIn&&(this.t>=this.SCAV_AT||this.picked>=2)){this.scavsIn=true;this.scavT=this.t;return 'scavengers'}
    // v3024: every scavenger sent in and none left alive is a won fight, however they died
    // (the kill tally could miss one, and the spill then never finished).
    if(this.scavsIn&&!this.scavsDone&&this.t-(this.scavT||0)>3&&!scavs.length&&typeof fighterReservesRemaining==='function'&&fighterReservesRemaining()===0&&!fighters.some(f=>!f.dead))routeDiversion.onSpillScavengersCleared();
    if(!this.free().length){
      // Nothing left to take: whoever is still here comes for the drone.
      for(const f of scavs)if(!f.provoked){f.provoked=true;if(!(f.shotsLeft>0))f.shotsLeft=3}
      if(this.carried>0){if(!this.deliverCue&&this.scavsDone){this.deliverCue=true;callout('BRING THE LAST CASES TO THE HAULER',1.8)}return null}
      // v2090: done only once the scavenger fight is really over (its kill goal met), not
      // when none happens to be on screen while more are still arriving or in reserve.
      if(this.scavsIn&&this.scavsDone)return 'done'
    }
    return null
  },
  // v2530: called from the fighter loop. An unprovoked scavenger is flown here instead of
  // by the dogfight director: straight for the nearest loose case, carried along with the
  // open-space shift like the cases themselves. Returns true when it has moved the fighter.
  steerScavenger(f,dt){
    if(this.state!=='spill'||f.provoked||!(f.t>=0))return false;
    const left=this.free();if(!left.length)return false;
    let best=null,bd=1e9;for(const p of left){const d=Math.hypot(p.x-f.x,p.y-f.y,p.z-f.z);if(d<bd){bd=d;best=p}}
    f.spillTarget=best;const k=OPEN_SPACE_CRUISE*dt;f.x-=spaceMoveX*k;f.y-=spaceMoveY*k;f.z-=spaceMoveZ*k;
    const spd=Math.min(bd/Math.max(dt,.001),30),u=[(best.x-f.x)/Math.max(bd,.001),(best.y-f.y)/Math.max(bd,.001),(best.z-f.z)/Math.max(bd,.001)];
    f.vx=u[0]*spd;f.vy=u[1]*spd;f.vz=u[2]*spd;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;f.shotsLeft=0;
    if(typeof orientFighter==='function')orientFighter(f);return true
  },
  beginTractor(p){
    const n=this.carried+1;
    const ok=salvageRecovery.beginEmbeddedPickup({package:{x:p.x,y:p.y,z:p.z,rot:[p.rot[0],p.rot[1],0]},
      stage:{recoveryLabel:'cargo case',tractorSeconds:1.15,recoveredMessage:n>=this.HOLD?'HOLD FULL · TAKE THE CASES TO THE HAULER':`CASE ABOARD · HOLD ${n} OF ${this.HOLD}`},
      onComplete:()=>{p.state='carried';this.carried++;this.picked++},restorePhase:'space'});
    if(ok)p.state='tractor';return ok
  },
  HANDOVER_SECONDS:1.6,
  updateHandover(dt){
    const H=this.handover,h=this.hauler;H.t+=dt;inputX=inputY=0;
    this.alignTo([h.x,h.y,h.z],dt);
    if(H.t>=this.HANDOVER_SECONDS){
      this.got+=H.n;this.carried=Math.max(0,this.carried-H.n);let left=H.n;
      for(const p of this.pods)if(left>0&&p.state==='carried'){p.state='got';left--}
      this.handover=null;
      callout(`${H.n} CASE${H.n>1?'S':''} DELIVERED · ${this.got} OF ${this.total} ABOARD THE HAULER`,1.4,false);SoundFX.objectiveComplete?.()
    }
  },
  // Turn the drone smoothly to face a point (as the recovery pickup does for a package).
  alignTo(pt,dt){
    if(typeof ensureSpaceOrientation!=='function')return;
    ensureSpaceOrientation();const d=v3norm([pt[0]-shipX,pt[1]-shipY,pt[2]]);if(v3len(d)<.0001)return;
    const angle=Math.acos(clamp(v3dot(spaceForward,d),-1,1));
    if(angle>.002){let axis=v3cross(spaceForward,d);if(v3len(axis)<.001)axis=spaceUp;axis=v3norm(axis);
      const turn=Math.min(angle,Math.max(.25,angle*3)*dt);
      spaceForward=rotateAroundAxis(spaceForward,axis,turn);spaceRight=rotateAroundAxis(spaceRight,axis,turn);spaceUp=rotateAroundAxis(spaceUp,axis,turn);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()}
    viewRoll=moveToward(viewRoll,0,dt*2.8)
  },
  // The transfer beam: wavefronts flowing out from the drone's bay to the hauler, and the
  // cases riding it across one after another.
  drawHandover(){
    const H=this.handover,h=this.hauler;if(!H||!h)return;
    const hq=camPoint([h.x,h.y,h.z]);if(hq[2]<.5)return;const hp=projectCam(hq);if(!hp)return;
    const sx=W*.5,sy=viewH+Math.max(70,viewH*.18),flow=(H.t*.5)%1;
    ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.7;
    for(let i=0;i<5;i++){const t=(((i/5)+flow)%1),tp=1-Math.pow(1-t,2.05),half=lerp(8,30,tp),x=lerp(sx,hp.x,tp),y=lerp(sy,hp.y,tp),bow=lerp(4,10,tp);
      if(y<-40||y>viewH+60)continue;ctx.beginPath();ctx.moveTo(x-half,y);ctx.quadraticCurveTo(x,y-bow,x+half,y);ctx.stroke()}
    ctx.restore();
    const start=cameraPointToWorld([0,-.95,1.55]);
    for(let i=0;i<H.n;i++){const q=ease(clamp((H.t-i*.22)/(this.HANDOVER_SECONDS-.5),0,1));if(q<=0||q>=1)continue;
      drawMesh({x:lerp(start[0],h.x,q),y:lerp(start[1],h.y,q),z:lerp(start[2],h.z,q),s:.5,mx:1.02,my:.22,mz:.7,rot:[0,H.t*3+i,0]},courierFixtureBoxMesh,C.c,.98)}
  },
  scavengerCount(){return Math.max(2,Math.min(5,2+Math.round(this.risk*.3)))},
  share(){return this.total?this.got/this.total:0},
  hud(def){return `${def.hud} · HOLD ${this.carried}/${this.HOLD} · DELIVERED ${this.got}/${this.total}${this.stolen?` · STOLEN ${this.stolen}`:''}`},
  appendScene(scene){
    if(this.state!=='spill')return;
    const h=this.hauler;if(h){const q=camPoint([h.x,h.y,h.z]);if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(h,routeDiversion.FREIGHTER_MESH,C.c,.95)})}
    for(const p of this.pods){if(p.state!=='free')continue;const q=camPoint([p.x,p.y,p.z]);
      if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(p,courierFixtureBoxMesh,C.y,.98)})}
  },
  // The way to the hauler while the drone has cases aboard, and the nearest loose case
  // while it has room. Each gets a label on screen, or an edge arrow when it is not.
  drawMarker(){
    if(this.state!=='spill')return;
    if(this.handover){this.drawHandover();return}
    const mark=(pt,label,col,lift)=>{
      const q=camPoint(pt),pp=q[2]>.2?projectCam(q):null;
      ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=col;
      if(!pp||pp.x<0||pp.x>W||pp.y<0||pp.y>viewH){const e=hudEdgeCue(q,0),tx=-e.dy,ty=e.dx;
        line(e.x,e.y,e.x-e.dx*10+tx*7,e.y-e.dy*10+ty*7,col,1.25,.9);line(e.x,e.y,e.x-e.dx*10-tx*7,e.y-e.dy*10-ty*7,col,1.25,.9);
        const hw=ctx.measureText(label).width/2+4;ctx.strokeText(label,clamp(e.x-e.dx*26,hw,W-hw),clamp(e.y-e.dy*26,24,viewH-8))}
      else ctx.strokeText(`${label} ${Math.round(Math.hypot(pt[0]-shipX,pt[1]-shipY,pt[2]))}`,pp.x,pp.y-Math.max(14,lift*pp.k));
      ctx.restore()};
    const h=this.hauler,full=this.carried>=this.HOLD;
    if(h&&this.carried>0)mark([h.x,h.y,h.z],'HAULER',C.c,h.s*.9);
    if(full)return;
    let best=null,bd=1e9;for(const p of this.free()){const d=Math.hypot(p.x-shipX,p.y-shipY,p.z);if(d<bd){bd=d;best=p}}
    if(best)mark([best.x,best.y,best.z],'CASE',C.y,best.s*1.6)
  },
  reset(){this.pods=[];this.handover=null;this.hauler=null;this.carried=0;this.picked=0;this.lost=0;this.state='idle';this.t=0;this.got=0;this.stolen=0;this.scavsIn=false}
};
globalThis.AgentXCargoSpill=AgentXCargoSpill;
