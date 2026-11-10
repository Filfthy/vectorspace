'use strict';

// GHOST CONSTRUCTS (v1470) — AGENT_X_WORLD_LORE.txt 3.4
//
// A fourth kind of enemy beside ships, drones and xenos. Partition War area-denial
// systems: a lattice of armoured fragments run by one distributed controller, left lying
// in wreck fields and old lanes as what looks like debris. When something passes, the
// pieces gather into a weapon. Nobody builds them any more and they do not replicate:
// they are simply still there.
//
//   SCATTERED   loose fragments tumbling around a dim red core. Nothing to hit: shots and
//               missiles pass through, and they cannot be locked or fire.
//   GATHERING   about a second: the fragments stream in along faint tethers and light up.
//   FORMED      solid, shootable and firing, for four to six seconds. Then it breaks apart
//               again and re-forms somewhere else, keeping its damage. Hit hard while it
//               is formed, and keep a missile ready: one fired at a scattered ghost
//               circles until it forms.
//
//   LANCE       the common construct: a long spike with four swept blades and a broken
//               halo round its core.
//   JAMMER      a slowly turning ring of panels with two red masts. It never fires. While
//               it lives, and X is within range, missile lock is jammed and the display
//               crackles. It is the priority target.
//
// Fighters are spawned by core-mission.js (profile 'ghost'). Each one keeps its fragments
// in f.g and is drawn by AgentXGhosts.draw (core-renderer.js). The shot, lock and missile
// code asks AgentXGhosts.solid(f) before treating a ghost as a target.
const AgentXGhosts={
  HP:{lance:1.05,jammer:1.5},SCALE:{lance:1.75,jammer:1.6},JAM_RANGE:200,
  defs:null,meshes:{},pending:[],jamCalloutT:0,jammerPlaced:0,spawned:0,profile:'',

  // ---- Models -------------------------------------------------------------------------
  ensureBuilt(){
    if(this.defs)return;
    const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
    const edgesOf=faces=>{const seen=new Set(),e=[];for(const f of faces)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],k=a<b?a+':'+b:b+':'+a;if(!seen.has(k)){seen.add(k);e.push([a,b])}}return e};
    // Each fragment is built in construct coordinates, then re-centred on its own middle so
    // it can tumble about itself while scattered. pos is where that middle sits when formed.
    const piece=(v,faces,col,extra={})=>{
      const c=mul(v.reduce((s,p)=>add(s,p),[0,0,0]),1/v.length);
      return {v:v.map(p=>sub(p,c)),faces,e:edgesOf(faces),pos:c,col,...extra}
    };
    const octa=(c,r,col)=>piece([[c[0]+r,c[1],c[2]],[c[0]-r,c[1],c[2]],[c[0],c[1]+r,c[2]],[c[0],c[1]-r,c[2]],[c[0],c[1],c[2]+r],[c[0],c[1],c[2]-r*1.3]],
      [[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]],col,{core:true});
    // A spike from a to b, widest at fraction t along it.
    const spike=(a,b,w,t,col)=>{
      const d=sub(b,a),L=Math.hypot(...d)||1,u=mul(d,1/L),h=Math.abs(u[1])<.9?[0,1,0]:[1,0,0];
      let p=[u[1]*h[2]-u[2]*h[1],u[2]*h[0]-u[0]*h[2],u[0]*h[1]-u[1]*h[0]];p=mul(p,1/Math.hypot(...p));
      const q=[u[1]*p[2]-u[2]*p[1],u[2]*p[0]-u[0]*p[2],u[0]*p[1]-u[1]*p[0]],m=add(a,mul(d,t));
      return piece([a,b,add(m,mul(p,w)),add(m,mul(q,w)),add(m,mul(p,-w)),add(m,mul(q,-w))],
        [[0,2,3],[0,3,4],[0,4,5],[0,5,2],[1,3,2],[1,4,3],[1,5,4],[1,2,5]],col)
    };
    // A flat plate (any outline) with a little thickness along n.
    const slab=(poly,n,col,extra)=>{
      const k=poly.length,h=mul(n,.5),v=[...poly.map(p=>add(p,h)),...poly.map(p=>sub(p,h))];
      const faces=[Array.from({length:k},(_,i)=>i),Array.from({length:k},(_,i)=>2*k-1-i)];
      for(let i=0;i<k;i++){const j=(i+1)%k;faces.push([i,j,k+j,k+i])}
      return piece(v,faces,col,extra)
    };
    const arc=(a0,a1,r0,r1,z)=>{const pts=[];for(const a of[a0,(a0+a1)/2,a1])pts.push([Math.cos(a)*r1,Math.sin(a)*r1,z]);for(const a of[a1,(a0+a1)/2,a0])pts.push([Math.cos(a)*r0,Math.sin(a)*r0,z]);return pts};
    const W=null,R='#FF0000';   // null = the construct's own colour
    const lance=[
      octa([0,0,0],.32,R),
      spike([0,0,-.5],[0,0,-2.35],.17,.25,W),
      spike([0,0,.45],[0,0,1.65],.12,.3,W),
      ...[[-1,1],[1,1],[-1,-1],[1,-1]].map(([sx,sy])=>slab([[sx*.42,sy*.28,-.3],[sx*1.8,sy*1.0,1.05],[sx*.36,sy*.22,.42]],[0,.07,0],W)),
      ...[Math.PI*.5,Math.PI*7/6,Math.PI*11/6].map(a=>slab(arc(a-.46,a+.46,.72,.98,.1),[0,0,.12],W))
    ];
    const jammer=[
      octa([0,0,0],.4,R),
      ...Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return slab(arc(a-.4,a+.4,1.0,1.38,0),[0,0,.16],W,{spin:true})}),
      spike([0,.45,0],[0,2.15,.1],.1,.22,R),
      spike([0,-.45,0],[0,-2.15,.1],.1,.22,R)
    ];
    // One merged mesh per kind in its formed pose: the hull the explosion breaks up, and
    // the drawing buffer the fragments are written into every frame.
    const merge=(name,pieces)=>{
      const m={name,v:[],e:[],faces:[],edgeColors:[]};
      for(const p of pieces){const b=m.v.length;p.start=b;
        for(const v of p.v)m.v.push(add(v,p.pos));
        for(const e of p.e){m.e.push([e[0]+b,e[1]+b]);m.edgeColors.push(p.col)}
        for(const f of p.faces)m.faces.push(f.map(i=>i+b))}
      return m
    };
    this.defs={lance:{name:'Ghost Lance',pieces:lance},jammer:{name:'Ghost Jammer',pieces:jammer}};
    for(const k in this.defs)this.meshes[k]=merge(this.defs[k].name,this.defs[k].pieces);
    // Two sounds of their own: a rising shimmer as one forms, a falling crackle as it breaks.
    if(typeof SoundFX!=='undefined'&&SoundFX.definitions){
      const D=SoundFX.definitions;
      if(D.relayCalibrated&&!D.ghostForm)D.ghostForm={...D.relayCalibrated,wave_type:2,p_base_freq:.2,p_freq_ramp:.2,p_freq_dramp:0,p_env_sustain:.32,p_env_punch:.2,p_env_decay:.34,p_vib_strength:.4,p_vib_speed:.62,p_arp_mod:0,p_duty_ramp:0,p_pha_offset:.18,p_pha_ramp:-.06,sound_vol:.2};
      if(D.disconnectStatic&&!D.ghostScatter)D.ghostScatter={...D.disconnectStatic,p_base_freq:.5,p_freq_ramp:-.26,p_env_decay:.36,sound_vol:.17};
    }
  },

  // ---- Spawning -----------------------------------------------------------------------
  // Called once per fighter stage start (startFighterStage).
  arm(profile){
    this.profile=profile;this.jammerPlaced=0;this.spawned=0;this.pending=[];
    if(profile!=='ghost')return;
    this.ensureBuilt();
    const first=!campaign?.state?.seenProfiles?.ghost;
    this.pending=[{text:first?'THEY ARE ONLY SOLID WHEN FORMED · FIRE THEN':'GHOST CONSTRUCTS · FIRE WHEN THEY FORM',wait:7}]
  },
  // Which kind the nth fighter of a ghost fight is: the second is a jammer, and a big
  // fight gets a second one later.
  // (Counted here: the spawner's own roster index steps in twos.)
  kindFor(){
    const n=this.spawned++;
    if((n===1||n===6)&&this.jammerPlaced<2&&(typeof interceptorGoal!=='number'||interceptorGoal>=(n===1?3:7))){this.jammerPlaced++;return'jammer'}
    return'lance'
  },
  init(f,kind){
    this.ensureBuilt();
    const def=this.defs[kind],m=this.meshes[kind];
    f.ghost=kind;f.mesh=m;f.hullName=def.name;f.s=this.SCALE[kind];f.col=C.w;
    f.hp=f.maxHp=Math.max(6,Math.round(f.hp*this.HP[kind]));
    const r=()=>Math.random()-.5;
    f.g={state:'scattered',t:0,dur:1.2+Math.random()*1.8,spin:Math.random()*6,flash:0,px:f.x,py:f.y,pz:f.z,
      buf:{name:m.name,v:m.v.map(v=>v.slice()),e:m.e,faces:m.faces,edgeColors:m.edgeColors},
      frags:def.pieces.map(()=>{const d=[r(),r(),r()],l=Math.hypot(...d)||1,k=(8+Math.random()*12)/l;
        return {off:[d[0]*k,d[1]*k,d[2]*k],from:null,vel:[r()*3,r()*3,r()*3],tum:[r()*6,r()*6,r()*6],tv:[r()*3,r()*3,r()*3],jit:0}})};
    f.stunT=Math.max(f.stunT||0,.2);
    if(kind==='jammer')this.pending.push({text:'JAMMER · NO MISSILE LOCK WHILE IT LIVES',wait:9});
    const seen=campaign?.state&&(campaign.state.seenProfiles||(campaign.state.seenProfiles={}));if(seen&&kind==='jammer'&&campaign.statsLive?.())seen.ghostJammer=true
  },

  // ---- State --------------------------------------------------------------------------
  solid(f){return !f?.ghost||!f.g||f.g.state==='formed'},
  // Wake a dormant construct: it gathers at once.
  wake(f){const g=f?.g;if(!g?.dormant)return;g.dormant=false;g.state='scattered';g.t=g.dur=0;f.provoked=true;f.shotsLeft=3},
  live(){return typeof fighters==='undefined'?[]:fighters.filter(f=>f.ghost&&!f.dead&&!f.dying&&f.t>=0)},
  jammed(){
    if(typeof mode==='undefined'||mode!=='play'||phase!=='space')return false;
    return this.live().some(f=>f.ghost==='jammer'&&Math.hypot(f.x-shipX,f.y-shipY,f.z)<this.JAM_RANGE)
  },
  noteJam(){if(this.jamCalloutT<=0&&typeof callout==='function'&&callout('LOCK JAMMED · DESTROY THE JAMMER',1.4))this.jamCalloutT=5},
  // Where fragment i sits when the construct is formed (relative to its middle).
  homeOff(f,i){
    const pc=this.defs[f.ghost].pieces[i],s=f.s,sp=f.g.spin,cs=Math.cos(sp),sn=Math.sin(sp);
    const p=pc.spin?[pc.pos[0]*cs-pc.pos[1]*sn,pc.pos[0]*sn+pc.pos[1]*cs,pc.pos[2]]:pc.pos;
    return rotate([p[0]*s,p[1]*s,p[2]*s],f.rot||[0,0,0])
  },
  scatter(f){
    const g=f.g;g.state='breaking';g.t=0;g.dur=.45;
    g.frags.forEach((s,i)=>{s.off=this.homeOff(f,i)});   // it breaks apart from its formed shape, seen or not
    for(const s of g.frags){const l=Math.hypot(...s.off)||1,sp=15+Math.random()*12,r=()=>Math.random()-.5;
      s.vel=[s.off[0]/l*sp+r()*8,s.off[1]/l*sp+r()*8,s.off[2]/l*sp+r()*8];s.tv=[r()*5,r()*5,r()*5]}
    // A lock held on it stays on the empty middle, and a missile in flight waits for it to form.
    if(camPoint([f.x,f.y,f.z])[2]>0&&Math.hypot(f.x-shipX,f.y-shipY,f.z)<260)SoundFX.play?.('ghostScatter',.8)
  },
  update(dt){
    this.jamCalloutT=Math.max(0,this.jamCalloutT-dt);
    const p=this.pending[0];
    if(p){p.wait-=dt;if(p.wait<=0||(typeof callout==='function'&&callout(p.text,2.4,false)))this.pending.shift()}
    if(typeof fighters==='undefined')return;
    for(const f of fighters)if(f.ghost&&f.g&&!f.dead)this.step(f,dt)
  },
  step(f,dt){
    const g=f.g;g.t+=dt;g.flash=Math.max(0,g.flash-dt);
    // The middle moves with the fighter's own flight. Loose fragments are left partly
    // behind, so a scattered construct streams after its core and re-forms further on.
    if(!g.stepped){g.stepped=true;g.px=f.x;g.py=f.y;g.pz=f.z}   // the spawner moves it after init
    const mx=f.x-g.px,my=f.y-g.py,mz=f.z-g.pz;g.px=f.x;g.py=f.y;g.pz=f.z;
    if(f.dying){g.state='formed';return}
    // v1530: a dormant lattice (route-diversion.js) lies scattered and still until woken.
    if(g.dormant){g.state='scattered';g.t=0;f.stunT=Math.max(f.stunT||0,.2);for(const s of g.frags){for(let i=0;i<3;i++)s.tum[i]+=s.tv[i]*dt*.25}return}
    if(g.state==='scattered'&&g.t>=g.dur){g.state='gathering';g.t=0;g.dur=1.05;for(const s of g.frags)s.from=s.off.slice();
      if(camPoint([f.x,f.y,f.z])[2]>0&&Math.hypot(f.x-shipX,f.y-shipY,f.z)<260)SoundFX.play?.('ghostForm',.75)}
    else if(g.state==='gathering'&&g.t>=g.dur){g.state='formed';g.t=0;g.dur=(f.ghost==='jammer'?5.5:4.2)+Math.random()*2;g.flash=.4}
    else if(g.state==='formed'&&f.hp>0&&g.t>=g.dur)this.scatter(f);
    else if(g.state==='breaking'&&g.t>=g.dur){g.state='scattered';g.t=0;g.dur=1.8+Math.random()*1.8}
    // Only a formed lance can fire. A jammer never does.
    if(g.state!=='formed'||f.ghost==='jammer')f.stunT=Math.max(f.stunT||0,.12);
    if(f.ghost==='jammer')g.spin+=dt*(g.state==='formed'?1.9:.5);
    const loose=g.state==='scattered'||g.state==='breaking';
    for(const s of g.frags){
      if(loose){
        s.off[0]-=mx*.72;s.off[1]-=my*.72;s.off[2]-=mz*.72;
        const damp=Math.exp(-(g.state==='breaking'?1.2:2.2)*dt);s.vel[0]*=damp;s.vel[1]*=damp;s.vel[2]*=damp;
        // A slow wander, and a pull back if a fragment strays too far from its core.
        const l=Math.hypot(...s.off),pull=l>26?(l-26)*2.5/l:0;
        for(let i=0;i<3;i++){s.vel[i]+=((Math.random()-.5)*3-s.off[i]*pull)*dt;s.off[i]+=s.vel[i]*dt}
        for(let i=0;i<3;i++)s.tum[i]+=s.tv[i]*dt
      }
      s.jit=Math.random()<(g.state==='formed'?.012:.05)?.12+Math.random()*.08:Math.max(0,s.jit-dt)
    }
  },

  // ---- Drawing ------------------------------------------------------------------------
  draw(f){
    const g=f.g;if(!g){drawMesh(f,f.mesh,C.w);return}
    const def=this.defs[f.ghost],buf=g.buf,s=f.s,rot=f.rot||[0,0,0];
    const u=g.state==='gathering'?Math.min(1,g.t/g.dur):0,e=u*u*(3-2*u);
    // How much each fragment is still tumbling: fully when loose, easing out as it gathers.
    const tumble=g.state==='formed'?0:(g.state==='gathering'?1-e:1);
    const sp=g.spin,cs=Math.cos(sp),sn=Math.sin(sp),spinZ=p=>[p[0]*cs-p[1]*sn,p[0]*sn+p[1]*cs,p[2]];
    const centres=[];
    def.pieces.forEach((pc,i)=>{
      const fr=g.frags[i],pos=pc.spin?spinZ(pc.pos):pc.pos;
      const home=rotate([pos[0]*s,pos[1]*s,pos[2]*s],rot);
      let off;
      if(g.state==='formed')off=home;
      else if(g.state==='gathering'){const a=fr.from||fr.off;off=[a[0]+(home[0]-a[0])*e,a[1]+(home[1]-a[1])*e,a[2]+(home[2]-a[2])*e];fr.off=off.slice()}
      else off=fr.off;
      if(fr.jit>0){const j=fr.jit*s;off=[off[0]+(Math.random()-.5)*j,off[1]+(Math.random()-.5)*j,off[2]+(Math.random()-.5)*j]}
      centres.push(off);
      const tr=[fr.tum[0]*tumble,fr.tum[1]*tumble,fr.tum[2]*tumble];
      for(let k=0;k<pc.v.length;k++){
        let v=pc.v[k];if(pc.spin)v=spinZ(v);
        const q=rotate(rotate([v[0]*s,v[1]*s,v[2]*s],tr),rot),o=buf.v[pc.start+k];
        o[0]=q[0]+off[0];o[1]=q[1]+off[1];o[2]=q[2]+off[2]
      }
    });
    const formed=g.state==='formed';
    const flick=Math.floor(performance.now()/70+f.id)%3===0;
    const col=formed?objectHitColor(f,f.col):(g.state==='gathering'&&(u>.6||flick)?C.w:C.x);
    const alpha=formed?1:(g.state==='gathering'?.6+.4*e:.75);
    drawMesh({x:f.x,y:f.y,z:f.z,s:1,rot:[0,0,0]},buf,col,alpha);
    // Tethers from the core to each fragment while it gathers and holds together.
    if(g.state==='gathering'||formed){
      const c=proj([f.x,f.y,f.z]);
      if(c){const a=formed?.14+.06*Math.sin(performance.now()/120+f.id):.12+.3*e;
        for(let i=1;i<centres.length;i++){const p=proj([f.x+centres[i][0],f.y+centres[i][1],f.z+centres[i][2]]);if(p)line(c.x,c.y,p.x,p.y,C.w,.6,a)}}
    }
    // A ring flares off the core the moment it forms.
    if(g.flash>0){const c=proj([f.x,f.y,f.z]);if(c){const k=1-g.flash/.4,r=Math.max(4,c.k*s*(.6+k*2.4));
      ctx.save();ctx.globalAlpha=(1-k)*.8;ctx.strokeStyle=C.w;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();ctx.ellipse(c.x,c.y,r,r,0,0,Math.PI*2);ctx.stroke();ctx.restore()}}
  },
  // While a jammer is in range the display crackles: faint broken lines across it.
  drawOverlay(){
    if(!this.jammed())return;
    const n=2+Math.floor(Math.random()*4);
    for(let i=0;i<n;i++){const y=Math.random()*viewH,x0=Math.random()*W*.5,x1=x0+W*(.2+Math.random()*.6);line(x0,y,x1,y+(Math.random()-.5)*3,C.w,.7,.05+Math.random()*.1)}
    if(Math.random()<.08){const y=Math.random()*viewH;line(0,y,W,y,C.r,.7,.12)}
  },

  // ---- Kills --------------------------------------------------------------------------
  onKilled(f){
    if(!f?.ghost)return;
    campaign.bumpStat?.(f.ghost==='jammer'?'kills.jammers':'kills.ghosts');
    if(f.ghost==='jammer'&&!this.live().some(x=>x!==f&&x.ghost==='jammer')&&typeof callout==='function')callout(`JAMMER DOWN · LOCK-ON RESTORED${campaign.bountyTag?.()||''}`,1.8)
  },
  reset(){this.pending=[];this.jammerPlaced=0;this.spawned=0;this.profile=''}
};
globalThis.AgentXGhosts=AgentXGhosts;
