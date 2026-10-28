'use strict';
// Christmas promo models (only loaded with ?promo). Built with the ground-armour mesh
// builder (gaBuilder) so they share the game's construction and hidden-line drawing.
// Each builder takes a pose and re-emits its vertices in the same order every time,
// so a mesh can be posed per frame by copying the new vertices into it.
(()=>{
const PI=Math.PI,TAU=PI*2;
// Mark ranges -> per-edge colours (null keeps the object's own colour).
function edgeColours(m,map){
  const r=Object.entries(map).map(([k,col])=>[m.marks[k],col]).filter(x=>x[0]);
  return m.e.map(e=>{for(const[[a,b],col]of r)if(e[0]>=a&&e[0]<b&&e[1]>=a&&e[1]<b)return col;return null})
}
// A loose polyline (edges with no faces), used for garlands and antler tines drawn thin.
function polyline(m,pts){const b=m.v.length;for(const p of pts)m.v.push(m.T?m.T(p):[p[0],p[1],p[2]]);if(m.e)for(let i=0;i<pts.length-1;i++)m.e.push([b+i,b+i+1])}
function posedMesh(build,colours){
  const m=gaBuilder(true);build(m,{});
  const mesh={v:m.v,e:m.e,faces:m.faces,edgeColors:colours?edgeColours(m,colours):null};
  mesh.pose=pose=>{const p=gaBuilder(false);build(p,pose||{});for(let i=0;i<p.v.length;i++)mesh.v[i]=p.v[i];return mesh};
  mesh.marks=m.marks;return mesh
}

// ---------- The present: a box with crossed ribbons and a bow ----------
function buildPresent(m){
  m.mark('box',()=>m.box([0,0,0],[1,1,1]));
  m.mark('ribbon',()=>{
    m.box([0,0,0],[1.035,1.035,.17]);m.box([0,0,0],[.17,1.035,1.035]);
    // Bow: two lofted loops and two short tails, with a knot where the ribbons cross.
    for(const sx of[-1,1]){
      const ring=(x,y,h,d)=>[[x,y-h,-d],[x,y-h,d],[x,y+h,d],[x,y+h,-d]];
      m.loft([ring(sx*.05,.56,.04,.05),ring(sx*.2,.69,.1,.09),ring(sx*.33,.7,.075,.075),ring(sx*.38,.6,.03,.04)]);
      m.beam([sx*.05,.54,0],[sx*.3,.52,sx*.22],.12,.02)
    }
    m.box([0,.56,0],[.12,.1,.12])
  })
}
const present=posedMesh(buildPresent,{box:C.r,ribbon:C.y});

// ---------- The decorated tree outside the cabin ----------
// Four eight-sided tiers like the forest pines, a star, baubles and a garland.
const BAUBLE=[C.r,C.c,C.m,C.y,C.u];
function buildXmasTree(m){
  m.mark('trunk',()=>m.box([0,.28,0],[.32,.56,.32]));
  const tiers=[[.5,1.3,1.1],[1.12,1.06,1.0],[1.7,.84,.9],[2.25,.6,.85]];
  m.mark('foliage',()=>{for(const[y,r,h]of tiers)m.loft([m.ringXZ(0,y,0,r,r,8,PI/8),m.ringXZ(0,y+h,0,.04,.04,8,PI/8)])});
  // Snow resting on each tier's upper slope.
  m.mark('snow',()=>{for(const[y,r,h]of tiers){const f=.5,n=16,drip=Array.from({length:n},(_,i)=>{const a=PI/8+i*TAU/n,k=i%2?f*.78:f,rr=r*k*1.05;return[Math.cos(a)*rr,y+h*(1-k),Math.sin(a)*rr]});
    m.loft([drip,m.ringXZ(0,y+h+.01,0,.05,.05,n,PI/8)])}});
  // Star: a five-point outline extruded a little, standing on the top tier.
  m.mark('star',()=>{const pts=z=>Array.from({length:10},(_,i)=>{const a=PI/2+i*PI/5,r=i%2?.11:.27;return[Math.cos(a)*r,3.22+Math.sin(a)*r,z]});m.loft([pts(-.04),pts(.04)])});
  // Baubles hang just below each tier's rim, alternating colours.
  tiers.forEach(([y,r],ti)=>{for(let i=0;i<8;i++){if((i+ti)%2)continue;const a=PI/8+i*TAU/8+.39,x=Math.cos(a)*r*.86,z=Math.sin(a)*r*.86,s=.085;
    m.mark('b'+ti+'_'+i,()=>m.loft([pt4([x,y-.02-s,z]),m.ringXZ(x,y-.02,z,s,s,4),pt4([x,y-.02+s,z])],false,false))}});
  // Garland: a spiral of loose line around the tiers.
  m.mark('garland',()=>{const pts=[];for(let i=0;i<=96;i++){const u=i/96,y=.62+u*2.35,ti=Math.min(3,Math.floor((y-.5)/.6)),[ty,r,h]=tiers[ti];
    const rr=Math.max(.08,r*(1-(y-ty)/h))+.04,a=u*TAU*3.6;pts.push([Math.cos(a)*rr,y,Math.sin(a)*rr])}polyline(m,pts)})
}
const xmasTreeColours={trunk:C.o,foliage:C.g,snow:C.w,star:C.y,garland:C.y};
for(let ti=0;ti<4;ti++)for(let i=0;i<8;i++)xmasTreeColours['b'+ti+'_'+i]=BAUBLE[(ti*3+i)%5];
const xmasTree=posedMesh(buildXmasTree,xmasTreeColours);
// Twinkle: baubles flash white in a slow travelling sequence.
xmasTree.twinkle=t=>{const ec=xmasTree.edgeColors,base=xmasTree._base||(xmasTree._base=ec.slice());
  Object.keys(xmasTree.marks).forEach((k,n)=>{if(k[0]!=='b')return;const[a,b]=xmasTree.marks[k],on=Math.sin(t*2.3+n*1.7)>.82;
    xmasTree.e.forEach((e,ei)=>{if(e[0]>=a&&e[0]<b)ec[ei]=on?C.w:base[ei]})})};

// ---------- The snowman beside the cabin ----------
// Three stacked snowballs, coal eyes and buttons, a carrot nose, stick arms, a scarf and a
// top hat. He faces -z, like the other models.
function buildSnowman(m){
  const ball=(y,r)=>{const rings=[];for(let i=0;i<=8;i++){const a=-Math.PI/2+i*Math.PI/8,rr=Math.max(.02,Math.cos(a)*r);rings.push(m.ringXZ(0,y+Math.sin(a)*r,0,rr,rr,10,PI/10))}m.loft(rings,false,false)};
  m.mark('snow',()=>{ball(.55,.58);ball(1.36,.42);ball(1.95,.29)});
  m.mark('coal',()=>{for(const x of[-.1,.1])m.box([x,2.02,-.27],[.06,.06,.04]);for(const y of[1.22,1.38,1.54])m.box([0,y,-.405],[.07,.07,.04])});
  m.mark('carrot',()=>m.beam([0,1.95,-.28],[0,1.9,-.62],.08,.08,.05));
  m.mark('sticks',()=>{for(const sx of[-1,1]){const a=[sx*.36,1.45,0],b=[sx*.95,1.78,-.05];m.beam(a,b,.04,.04,.6);m.beam([sx*.78,1.7,-.04],[sx*.9,1.95,-.08],.03,.03,.5);m.beam([sx*.84,1.73,-.04],[sx*1.08,1.74,-.02],.03,.03,.5)}});
  m.mark('scarf',()=>{m.loft([m.ringXZ(0,1.7,0,.32,.32,10),m.ringXZ(0,1.79,0,.3,.3,10)]);m.beam([.18,1.72,-.24],[.26,1.38,-.33],.13,.03,.8)});
  m.mark('hat',()=>{m.loft([m.ringXZ(0,2.17,0,.34,.34,10),m.ringXZ(0,2.21,0,.34,.34,10)]);m.loft([m.ringXZ(0,2.21,0,.2,.2,10),m.ringXZ(0,2.56,0,.21,.21,10)])})
}
const snowman=posedMesh(buildSnowman,{snow:C.w,coal:C.x,carrot:C.o,sticks:C.o,scarf:C.r,hat:C.m});

// ---------- Reindeer mech: the HOUND walker's legs and gait, a reindeer's body ----------
(()=>{
  const H=GA_KINDS.hound,Y=1.9;
  GA_KINDS.reindeer={...H,label:'REINDEER',s:1.35,hp:6,col:C.w,score:600,top:4.4,
    muzzles:[[-.22,Y+.62,-1.9],[.22,Y+.62,-1.9]],spheres:[[0,Y,-.3,1.4],[0,Y+1.3,-1.8,.7]],
    body(m){
      // Barrel chest deeper at the front, tucked at the hips.
      m.loft([[[-.42,Y-.42,-1.3],[.42,Y-.42,-1.3],[.5,Y+.3,-1.25],[-.5,Y+.3,-1.25]],
              [[-.52,Y-.36,-.2],[.52,Y-.36,-.2],[.56,Y+.36,-.2],[-.56,Y+.36,-.2]],
              [[-.48,Y-.28,1.1],[.48,Y-.28,1.1],[.5,Y+.32,1.05],[-.5,Y+.32,1.05]]]);
      m.beam([0,Y+.1,-1.15],[0,Y+1.15,-1.7],.36,.42,.8);                 // neck
      m.loft([[[-.2,Y+1.08,-1.58],[.2,Y+1.08,-1.58],[.22,Y+1.45,-1.6],[-.22,Y+1.45,-1.6]],
              [[-.12,Y+.98,-2.32],[.12,Y+.98,-2.32],[.13,Y+1.2,-2.32],[-.13,Y+1.2,-2.32]]]);   // head and muzzle
      m.mark('nose',()=>m.box([0,Y+1.09,-2.4],[.17,.15,.12]));
      for(const sx of[-1,1])m.beam([sx*.18,Y+1.4,-1.62],[sx*.48,Y+1.52,-1.5],.08,.14,.4);   // ears
      // Antlers: a main beam sweeping up and back, three tines off it.
      m.mark('antlers',()=>{for(const sx of[-1,1]){
        const a=[sx*.12,Y+1.45,-1.6],b=[sx*.42,Y+2.05,-1.5],c=[sx*.62,Y+2.6,-1.15],d=[sx*.66,Y+3.0,-.7];
        m.beam(a,b,.08,.08);m.beam(b,c,.07,.07);m.beam(c,d,.06,.06,.5);
        m.beam(b,[sx*.36,Y+2.45,-1.95],.05,.05,.4);m.beam(c,[sx*.5,Y+3.05,-1.5],.05,.05,.4);m.beam([sx*.64,Y+2.82,-.92],[sx*.98,Y+3.12,-.95],.045,.045,.4)}});
      // The mech part: a twin cannon pod on the shoulders, under the antlers' reach.
      m.box([0,Y+.48,-.55],[.6,.28,.8]);for(const x of[-.22,.22])m.barrel(x,Y+.62,-.6,-1.9,.06);
      m.beam([0,Y+.28,1.0],[0,Y+.55,1.25],.14,.14,.5)                       // tail
    }};
})();

// ---------- The singing xeno ----------
// Upright, floating, with a fan frill behind the head and a hinged jaw. pose: jaw (0..1),
// arms (0..1, how far the arms are raised), t (time, for the drifting tail and frill).
function buildXeno(m,p){
  const jaw=p.jaw||0,arms=p.arms||0,t=p.t||0,sway=Math.sin(t*.9)*.05;
  // Thorax and abdomen as one long loft: up through the chest, curling down and back into a tail.
  const spine=[[0,-2.7,.95,.08],[0,-2.25,.75,.24],[0,-1.7,.45,.42],[0,-1.05,.2,.56],[0,-.4,.05,.62],[0,.25,0,.72],[0,.85,-.05,.66],[0,1.25,-.02,.42],[0,1.5,.02,.28]];
  m.mark('body',()=>m.loft(spine.map(([x,y,z,r],i)=>m.ringXZ(x+sway*(1-i/8),y,z,r,r*.86,8,PI/8))));
  // Armour ridges down the back.
  m.mark('ridge',()=>{for(let i=2;i<7;i++){const[,y,z,r]=spine[i];m.beam([0,y-.15,z+r*.8],[0,y+.2,z+r*1.25],.07,.07,.3)}});
  // Head: cranium lofted forward to a narrow snout; the jaw hinges under it.
  // The head is scaled up and tipped back, snout raised, the way a singer lifts her chin,
  // so the open jaw and the lit throat face the audience.
  const hy=1.72,hz=0,open=jaw*1.1,HK=1.55,TILT=.42,ct=Math.cos(TILT),st=Math.sin(TILT),
    headT=q=>{const y=q[1]-hy,z=q[2]-.15;return[q[0]*HK,hy+(y*ct-z*st)*HK,.15+(y*st+z*ct)*HK]};
  m.T=headT;
  m.mark('head',()=>m.loft([
    [[-.3,hy-.02,hz+.36],[.3,hy-.02,hz+.36],[.36,hy+.32,hz+.28],[-.36,hy+.32,hz+.28]],
    [[-.34,hy-.04,hz-.08],[.34,hy-.04,hz-.08],[.32,hy+.36,hz-.12],[-.32,hy+.36,hz-.12]],
    [[-.16,hy+.02-open*.08,hz-.62],[.16,hy+.02-open*.08,hz-.62],[.12,hy+.16,hz-.66],[-.12,hy+.16,hz-.66]]]));
  // Jaw rotates about the hinge (x axis through the back of the head).
  const hinge=[0,hy-.04,hz+.22],ca=Math.cos(open),sa=Math.sin(open);
  const J=q=>{const dy=q[1]-hinge[1],dz=q[2]-hinge[2];return[q[0],hinge[1]+dy*ca-dz*sa,hinge[2]+dy*sa+dz*ca]};
  m.mark('jaw',()=>{m.loft([[[-.28,hy-.06,hz+.2],[.28,hy-.06,hz+.2],[.26,hy-.24,hz+.16],[-.26,hy-.24,hz+.16]],
    [[-.13,hy-.02,hz-.56],[.13,hy-.02,hz-.56],[.1,hy-.12,hz-.54],[-.1,hy-.12,hz-.54]]].map(r=>r.map(J)));
    // Teeth along the jaw's edge, pointing up into the mouth.
    for(const s of[-1,1])for(const u of[.25,.5,.75]){const z=lerp(hz+.1,hz-.5,u),x=s*lerp(.25,.12,u);m.beam(J([x,hy-.05,z]),J([x,hy+.06,z]),.03,.03,.2)}});
  // Upper teeth hanging from the snout, and the throat: a lit palate that shows when she opens up.
  m.mark('teeth',()=>{for(const s of[-1,1])for(const u of[.3,.55,.8]){const z=lerp(hz+.05,hz-.58,u),x=s*lerp(.27,.12,u);m.beam([x,hy-.02,z],[x,hy-.13,z],.035,.035,.15)}});
  m.mark('throat',()=>m.box([0,hy+.03,hz-.12],[.36,.1,.62]));
  // Eyes: small yellow diamonds on the sides of the skull.
  m.mark('eyes',()=>{for(const s of[-1,1])m.loft([pt4([s*.3,hy+.22,hz-.24]),m.ringXY(s*.31,hy+.22,hz-.2,.065,4),pt4([s*.32,hy+.22,hz-.12])],false,false)});
  // Frill: six spines fanning up and back from the skull with membrane between them.
  m.mark('frill',()=>{const base=[0,hy+.25,hz+.3],tips=[];
    for(let i=0;i<6;i++){const a=lerp(-1.05,1.05,i/5),w=Math.sin(t*1.7+i)*.04;tips.push([Math.sin(a)*1.05,hy+.45+Math.cos(a)*.9+w,hz+.85+Math.abs(Math.sin(a))*.15])}
    for(let i=0;i<5;i++)m.loft([[base,base,base],[tips[i],lerp3(tips[i],tips[i+1],.5,[0,.12,.05]),tips[i+1]]],false,false);
    for(const tp of tips)m.beam(base,tp,.04,.04,.3)});
  m.T=null;
  // Arms: shoulder, elbow, a three-clawed hand. Raised for the long notes, like a singer.
  m.mark('arms',()=>{for(const s of[-1,1]){const sh=[s*.62,1.0,-.05],el=[s*lerp(1.25,1.45,arms),lerp(.1,1.0,arms),lerp(-.3,-.35,arms)],hd=[s*lerp(1.45,2.2,arms),lerp(.35,1.9,arms),lerp(-.85,-.7,arms)];
    m.beam(sh,el,.16,.16,.8);m.beam(el,hd,.12,.12,.7);
    for(const c of[-1,0,1])m.beam(hd,[hd[0]+s*.3,hd[1]+.14+c*.16,hd[2]-.16],.05,.05,.2)}});
  // Tail tendrils drifting behind.
  m.mark('tendrils',()=>{for(const s of[-1,0,1]){const pts=[];for(let i=0;i<6;i++){const u=i/5;pts.push([s*.12+Math.sin(t*1.3+u*3+s)*.18*u,-2.65-u*1.3,.95+u*.5+Math.cos(t*1.1+u*2.5)*.12*u])}polyline(m,pts)}})
}
function pt4(p){return[p,p,p,p]}
function lerp3(a,b,u,off=[0,0,0]){return[lerp(a[0],b[0],u)+off[0],lerp(a[1],b[1],u)+off[1],lerp(a[2],b[2],u)+off[2]]}
const xenoColours=(body,frill)=>({body,ridge:body,head:body,jaw:body,teeth:C.w,throat:C.y,eyes:C.y,frill,arms:body,tendrils:frill});
function makeXeno(body=C.m,frill=C.c){return posedMesh(buildXeno,xenoColours(body,frill))}

globalThis.PromoModels={present,xmasTree,snowman,makeXeno,posedMesh,edgeColours};
})();
