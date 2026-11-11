'use strict';

// CARGO SPILL (v2080)
//
// A Free Traders job: a hauler took a hit and dumped its cargo across a lane. The pods
// drift ahead in a few loose clusters, spread across the heading at the start. Fly
// through a pod (within REACH) to scoop it. A few seconds in, pirate scavengers arrive.
// They go for the pods, not the drone, and any pod one reaches is gone, until the drone
// shoots that scavenger, which then fights back. Pods that drift past behind are lost.
// Once no pod is left free, any scavenger still flying turns on the drone. Pay and
// Free Traders standing follow the share of pods brought home.
// Hooks: route-diversion.js begin / update / onFightCleared / hudLeft / appendScene /
// drawMarker / reset, for the route_diversion stage with diversion:'spill'.
const AgentXCargoSpill={
  REACH:8,SCAV_AT:5,
  pods:[],state:'idle',t:0,got:0,stolen:0,total:0,scavsIn:false,scavsDone:false,lastTake:0,last:null,
  begin(stage,risk){
    risk=Math.max(1,Number(risk)||1);this.risk=risk;
    const n=Math.max(12,Math.min(20,11+Math.round(risk))),clusters=Math.ceil(n/4);
    this.pods=[];this.t=0;this.got=0;this.stolen=0;this.total=n;this.scavsIn=false;this.scavsDone=false;this.lastTake=-9;this.state='spill';this.last=null;
    for(let c=0;c<clusters;c++){
      // Each cluster is a short trail of pods tumbling out along the lane, so a steady
      // pilot can string a few together. The trails sit at different places across it.
      const cu=(Math.random()-.5)*44,cw=(Math.random()-.5)*26,ca=170+c*180+Math.random()*30,su=(Math.random()-.5)*.25,sw=(Math.random()-.5)*.15;
      for(let i=0;i<4&&this.pods.length<n;i++){
        const al=i*32+Math.random()*10,w=cameraPointToWorld([cu+su*al+(Math.random()-.5)*6,cw+sw*al+(Math.random()-.5)*5,ca+al]);
        this.pods.push({x:w[0],y:w[1],z:w[2],s:1.5,mx:1,my:.7,mz:1.4,rot:[Math.random()*6,Math.random()*6,0],spin:[(Math.random()-.5)*1.4,(Math.random()-.5)*1.6],
          drift:[(Math.random()-.5)*1.4,(Math.random()-.5)*1],state:'free',flash:0})
      }
    }
    return true
  },
  free(){return this.pods.filter(p=>p.state==='free')},
  live(){return typeof fighters==='undefined'?[]:fighters.filter(f=>!f.dead&&!f.dying&&f.t>=0)},
  // Called each frame. Returns 'scavengers' once when they should be sent in, 'done'
  // when every pod is settled and no scavenger is left, otherwise null.
  update(dt){
    if(this.state!=='spill')return null;
    this.t+=dt;const k=OPEN_SPACE_CRUISE*dt;
    for(const p of this.pods){
      p.flash=Math.max(0,p.flash-dt);if(p.state!=='free')continue;
      p.x-=spaceMoveX*k;p.y-=spaceMoveY*k;p.z-=spaceMoveZ*k;
      p.x+=p.drift[0]*dt;p.y+=p.drift[1]*dt;p.rot[0]+=p.spin[0]*dt;p.rot[1]+=p.spin[1]*dt;
      const d=Math.hypot(p.x-shipX,p.y-shipY,p.z);
      if(d<this.REACH){p.state='got';this.got++;
        callout(`POD RECOVERED · ${this.got} OF ${this.total}`,1.1,false);SoundFX.relayCalibrated?.();continue}
      // Drifted past behind the view, or left far off course: lost.
      if(camPoint([p.x,p.y,p.z])[2]<-15||d>1400){p.state='missed'}
    }
    // Scavengers that have not been shot go for the nearest free pod and take it.
    const scavs=this.live(),left=this.free();
    for(const f of scavs){
      if(f.provoked||!left.length)continue;
      f.shotsLeft=0;let best=null,bd=1e9;for(const p of left){const dd=Math.hypot(p.x-f.x,p.y-f.y,p.z-f.z);if(dd<bd){bd=dd;best=p}}
      if(!best)continue;const g=Math.min(1,dt*.8);f.x+=(best.x-f.x)*g;f.y+=(best.y-f.y)*g;f.z+=(best.z-f.z)*g;
      if(bd<6&&best.state==='free'){best.state='stolen';this.stolen++;
        if(this.t-this.lastTake>2.5){this.lastTake=this.t;callout(`SCAVENGER TOOK A POD · ${this.stolen} STOLEN`,1.3,false)}}
    }
    if(!this.scavsIn&&(this.t>=this.SCAV_AT||this.got>=2)){this.scavsIn=true;return 'scavengers'}
    if(!this.free().length){
      // Nothing left to take: whoever is still here comes for the drone.
      for(const f of scavs)if(!f.provoked){f.provoked=true;if(!(f.shotsLeft>0))f.shotsLeft=3}
      if(this.scavsIn&&!scavs.length)return 'done'
    }
    return null
  },
  scavengerCount(){return Math.max(2,Math.min(5,2+Math.round(this.risk*.3)))},
  share(){return this.total?this.got/this.total:0},
  hud(def){return `${def.hud} · RECOVERED ${this.got}/${this.total}${this.stolen?` · STOLEN ${this.stolen}`:''}`},
  appendScene(scene){
    if(this.state!=='spill')return;
    for(const p of this.pods){if(p.state!=='free')continue;const q=camPoint([p.x,p.y,p.z]);
      if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(p,courierFixtureBoxMesh,C.y,.98)})}
  },
  // The nearest free pod ahead gets a label, or an edge arrow when it is off screen.
  drawMarker(){
    if(this.state!=='spill')return;
    let best=null,bz=1e9;for(const p of this.free()){const q=camPoint([p.x,p.y,p.z]);if(q[2]>4&&q[2]<bz){bz=q[2];best={p,q}}}
    if(!best)return;const{p,q}=best,pp=projectCam(q),d=Math.round(Math.hypot(p.x-shipX,p.y-shipY,p.z));
    ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=C.y;
    if(!pp||pp.x<0||pp.x>W||pp.y<0||pp.y>viewH){const e=hudEdgeCue(q,0),tx=-e.dy,ty=e.dx;
      line(e.x,e.y,e.x-e.dx*10+tx*7,e.y-e.dy*10+ty*7,C.y,1.25,.9);line(e.x,e.y,e.x-e.dx*10-tx*7,e.y-e.dy*10-ty*7,C.y,1.25,.9);
      const t='CARGO POD',hw=ctx.measureText(t).width/2+4;ctx.strokeText(t,clamp(e.x-e.dx*26,hw,W-hw),clamp(e.y-e.dy*26,24,viewH-8))}
    else ctx.strokeText(`POD ${d}`,pp.x,pp.y-Math.max(14,p.s*pp.k*1.6));
    ctx.restore()
  },
  reset(){this.pods=[];this.state='idle';this.t=0;this.got=0;this.stolen=0;this.scavsIn=false}
};
globalThis.AgentXCargoSpill=AgentXCargoSpill;
