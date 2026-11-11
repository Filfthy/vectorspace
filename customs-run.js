'use strict';

// CUSTOMS RUN (v2040)
//
// A Jackals job: carry unmanifested cargo through a Customs Authority scanner picket.
// The picket is a line of scanner rings, one at a time, each set across the drone's
// heading as the last one passes. Lit scanner arms sweep round each ring. Cross the
// ring's plane inside the ring and in a dark gap between the arms and the cargo is never
// read. Cross on an arm, or outside the ring (the buoy's wide scan reads anything that
// goes round), and the drone is flagged. A clean run pays a bonus. A flagged run ends with
// Customs interceptors (the 'customs' fighter profile) coming for the drone, less pay and
// less standing. Risk adds rings, arms and sweep speed.
// Hooks: route-diversion.js begin / update / onFightCleared / hudLeft / appendScene /
// drawMarker / reset, for the route_diversion stage with diversion:'customs'.
const AgentXCustomsRun={
  RADIUS:30,SPACING:270,ARM_HALF:.3,HUB:3,
  rings:[],passed:0,total:0,scans:0,state:'idle',lastResult:null,lastScans:0,
  begin(stage,risk){
    risk=Math.max(1,Number(risk)||1);
    this.risk=risk;this.total=Math.max(3,Math.min(7,3+Math.round(risk*.45)));
    this.arms=risk<4?2:(risk<7?3:4);
    // v2070: a gentler sweep (was .75+.07 per risk, 1.38 rad/s at risk 9, faster than the
    // drone can follow a gap). Now .81 at risk 9: still needs reading ahead, but fair.
    this.speed=.45+.04*risk;
    this.rings=[];this.passed=0;this.scans=0;this.state='picket';this.lastResult=null;this.lastScans=0;
    this.place(this.SPACING+60);
    // A Codex flag, the same way the old minefield opens its entry.
    if(campaign.state&&campaign.statsLive?.())(campaign.state.mailFlags||(campaign.state.mailFlags={})).metCustomsPicket=true;
    return true
  },
  // A ring straight across the current heading, a little off centre so no two are alike.
  // v2050: each ring keeps the frame it was placed in (f forward through it, rt and up
  // across it), so it is drawn, judged and crossed in its own plane whichever way the
  // drone has turned since.
  place(dist){
    const n=this.rings.length,c=cameraPointToWorld([(Math.random()-.5)*10,(Math.random()-.5)*8,dist]);
    const f=cameraVectorToWorld([0,0,1]),rt=cameraVectorToWorld([1,0,0]),up=cameraVectorToWorld([0,1,0]);
    this.rings.push({x:c[0],y:c[1],z:c[2],f,rt,up,a:Math.random()*6.283,dir:n%2?-1:1,done:false,scanned:false,qz:null,along:null})
  },
  // A point on the ring's own plane: rad out from the hub at angle a.
  point(r,rad,a){const c=Math.cos(a)*rad,s=Math.sin(a)*rad;return[r.x+r.rt[0]*c+r.up[0]*s,r.y+r.rt[1]*c+r.up[1]*s,r.z+r.rt[2]*c+r.up[2]*s]},
  // Where the drone is relative to the ring: how far through its plane (along, below
  // zero while still in front), and across it (u, w).
  rel(r){const v=[shipX-r.x,shipY-r.y,-r.z],d=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];return{along:d(v,r.f),u:d(v,r.rt),w:d(v,r.up),dist:Math.hypot(v[0],v[1],v[2])}},
  armHit(r){
    const{u,w}=this.rel(r),d=Math.hypot(u,w);
    if(d>this.RADIUS)return 'outside';
    if(d<this.HUB)return 'arm';
    const th=Math.atan2(w,u),step=6.283/this.arms;
    for(let i=0;i<this.arms;i++){let a=(th-(r.a+i*step))%6.283;if(a<0)a+=6.283;if(a>3.1416)a=6.283-a;if(a<this.ARM_HALF)return 'arm'}
    return ''
  },
  update(dt){
    if(this.state!=='picket')return null;
    const k=OPEN_SPACE_CRUISE*dt;
    for(const r of this.rings){
      r.x-=spaceMoveX*k;r.y-=spaceMoveY*k;r.z-=spaceMoveZ*k;r.a+=r.dir*this.speed*dt;
      const o=this.rel(r),before=r.along??o.along;r.along=o.along;r.qz=camPoint([r.x,r.y,r.z])[2];
      if(r.done)continue;
      // Crossed when the drone passes through the ring's plane. Turning away cannot leave
      // the job waiting for good: a ring that falls behind the view uncrossed, or is left
      // far off course, counts as gone round, which the buoy reads like any other.
      const crossed=before<0&&o.along>=0,lost=!crossed&&(r.qz<-40||o.dist>this.SPACING*3.2);
      if(crossed||lost){
        r.done=true;this.passed++;const hit=lost?'outside':this.armHit(r);
        if(hit){r.scanned=true;this.scans++;
          callout(hit==='outside'?'SCANNED · STAY INSIDE THE RING':'SCANNED · CUSTOMS ALERTED',1.6,false);
          SoundFX.terminalRed?.();if(this.scans===1&&audio?.hasVoice?.('customsScanned'))audio.playVoice('customsScanned',{once:false,priority:false})}
        else{callout(this.passed<this.total?`RING ${this.passed} CLEAR · ${this.total-this.passed} TO GO`:'LAST RING CLEAR',1.3,false);SoundFX.relayCalibrated?.()}
        if(this.passed<this.total)this.place(this.SPACING)
      }
    }
    this.rings=this.rings.filter(r=>!r.done||r.qz>-40);
    if(this.passed>=this.total&&!this.rings.some(r=>!r.done))return this.scans?'flagged':'clean';
    return null
  },
  // Interceptors after a flagged run: more for every ring that read the drone.
  cutterCount(){return Math.max(3,Math.min(7,2+this.scans+Math.round(this.risk*.25)))},
  hud(def){
    if(this.state==='picket')return `${def.hud} · RING ${Math.min(this.total,this.passed+1)}/${this.total}${this.scans?` · SCANNED ${this.scans}`:' · UNSCANNED'}`;
    return 'CUSTOMS INTERCEPT'
  },
  appendScene(scene){
    if(this.state!=='picket')return;
    for(const r of this.rings){const q=camPoint([r.x,r.y,r.z]);if(q[2]>.18)scene.push({z:q[2],draw:()=>this.drawRing(r)})}
  },
  drawRing(r){
    const R=this.RADIUS,pt=(rad,a)=>proj(this.point(r,rad,a)),col=C.u,fade=r.done?.35:1;
    // The ring itself, then the hub.
    let prev=pt(R,0);for(let i=1;i<=40;i++){const p=pt(R,i/40*6.283);if(prev&&p)line(prev.x,prev.y,p.x,p.y,col,1,.75*fade);prev=p}
    prev=pt(this.HUB,0);for(let i=1;i<=10;i++){const p=pt(this.HUB,i/10*6.283);if(prev&&p)line(prev.x,prev.y,p.x,p.y,col,1,fade);prev=p}
    // Each lit arm: both edges, a centre line and its arc at the rim, so the dark gaps read.
    const step=6.283/this.arms;
    for(let i=0;i<this.arms;i++){const a=r.a+i*step,a0=a-this.ARM_HALF,a1=a+this.ARM_HALF;
      for(const[e,al]of[[a0,.9],[a1,.9],[a,.55],[a-this.ARM_HALF*.5,.35],[a+this.ARM_HALF*.5,.35]]){const p=pt(this.HUB,e),q=pt(R,e);if(p&&q)line(p.x,p.y,q.x,q.y,col,1,al*fade)}
      let pa=pt(R,a0);for(let j=1;j<=6;j++){const p=pt(R,a0+(a1-a0)*j/6);if(pa&&p)line(pa.x,pa.y,p.x,p.y,col,1,fade);pa=p}
      let pm=pt(R*.62,a0);for(let j=1;j<=6;j++){const p=pt(R*.62,a0+(a1-a0)*j/6);if(pm&&p)line(pm.x,pm.y,p.x,p.y,col,1,.45*fade);pm=p}}
  },
  drawMarker(){
    if(this.state!=='picket')return;
    const r=this.rings.find(o=>!o.done);if(!r)return;
    const q=camPoint([r.x,r.y,r.z]),p=q[2]>.18?projectCam(q):null;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=C.u;
    // Off screen: an edge arrow back to the ring, as the convoy freighter has.
    if(!p||p.x<0||p.x>W||p.y<0||p.y>viewH){const e=hudEdgeCue(q,0),tx=-e.dy,ty=e.dx;
      line(e.x,e.y,e.x-e.dx*10+tx*7,e.y-e.dy*10+ty*7,C.u,1.25,.9);line(e.x,e.y,e.x-e.dx*10-tx*7,e.y-e.dy*10-ty*7,C.u,1.25,.9);
      const t='SCANNER RING',hw=ctx.measureText(t).width/2+4;ctx.strokeText(t,clamp(e.x-e.dx*26,hw,W-hw),clamp(e.y-e.dy*26,24,viewH-8));ctx.restore();return}
    // Label above the ring as drawn on screen, with the range to its hub.
    let top=p.y;for(let i=0;i<8;i++){const e=proj(this.point(r,this.RADIUS,i/8*6.283));if(e&&e.y<top)top=e.y}
    const o=this.rel(r),hit=q[2]<120?this.armHit(r):null;
    ctx.strokeText(`SCANNER RING · ${Math.round(o.dist)}`,p.x,top-8);
    if(hit!==null){ctx.strokeStyle=hit?C.o:C.g;ctx.strokeText(hit==='outside'?'OUTSIDE THE RING':(hit?'IN THE BEAM':'IN A GAP'),p.x,top+6)}
    ctx.restore()
  },
  reset(){this.rings=[];this.state='idle';this.passed=0;this.scans=0}
};
globalThis.AgentXCustomsRun=AgentXCustomsRun;
