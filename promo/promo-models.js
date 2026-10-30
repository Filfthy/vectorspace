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
  GA_KINDS.reindeer={...H,label:'REINDEER',s:1.35,hp:6,col:C.o,score:600,top:4.4,
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
      m.box([0,Y+.48,-.55],[.6,.28,.8]);m.mark('barrels',()=>{for(const x of[-.22,.22])m.barrel(x,Y+.62,-.6,-1.9,.06)});
      m.beam([0,Y+.28,1.0],[0,Y+.55,1.25],.14,.14,.5)                       // tail
    }};
})();

// The game's leg builder with the feet marked too, so the reindeer can have white feet.
window.gaLeg=function(m,L,t,i){
  m.beam(L.hip,L.knee,t,t*1.3);
  m.mark('knee'+i,()=>m.box(L.knee,[t*1.6,t*1.6,t*1.6]));
  m.beam(L.knee,L.ankle,t*.8,t*1.1);
  m.box(L.ankle,[t*1.25,t*1.25,t*1.25]);
  const f=L.foot;
  m.mark('foot'+i,()=>m.loft([m.ringXZ(f[0],f[1],f[2],t*2.1,t*2.4,6),m.ringXZ(f[0],f[1]+t*.55,f[2],t*1.4,t*1.6,6)]));
  m.beam(L.ankle,[f[0],f[1]+t*.5,f[2]],t*.6,t*.6);
};
const reindeerColours=m=>{const map={nose:C.r,antlers:C.y,barrels:C.w};for(const k of Object.keys(m.marks))if(/^(knee|foot)\d/.test(k))map[k]=C.w;return map};

// ---------- The xenos: the game's Stinger Hornet, standing up to sing ----------
// The hornet's segmented body, its two pairs of buzzing wings and its stinger, hovering
// upright with the head tipped towards the audience. Added for the promo: big compound
// eyes, antennae, mandibles that part and a jaw that drops, and a lit throat inside.
// Band players also get a pair of arms. Model faces -z. pose: jaw (0..1), t (time),
// mand (mandible spread 0..1), waggle (abdomen swing, radians), nod (head,
// radians), spread (wings up, 0..1), strain (0..1, the antennae
// stiffen and quiver with the trill), and for the band: strum (0..1), hitL / hitR (0..1),
// leftTarget / rightTarget (where the drumsticks strike).
const HORNET_SPINE=[[-2.0,.03,.3],[-1.75,.1,.28],[-1.4,.32,.24],[-.95,.46,.16],[-.45,.44,.08],[-.12,.26,.02],[.05,.12,0],[.25,.3,0],[.6,.4,-.02],[.95,.34,-.04],[1.15,.18,-.05],[1.26,.12,-.06]];
function hornetRing(y,w,z){const d=w*.82;return[[-w,y,z],[-w*.55,y,z-d],[w*.55,y,z-d],[w,y,z],[w*.55,y,z+d],[-w*.55,y,z+d]]}
function pt4(p){return[p,p,p,p]}
function pt6(c,s,dx){const p=[c[0]+s*dx,c[1],c[2]];return[p,p,p,p,p,p]}
function ringYZ(x,y,z,ry,rz,n){return Array.from({length:n},(_,i)=>{const a=i*TAU/n;return[x,y+Math.cos(a)*ry,z+Math.sin(a)*rz]})}
function vnorm3(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function buildHornet(m,p){
  const t=p.t||0,jaw=clamp(p.jaw||0,0,1),band=p.band||null;
  // The waggle: the abdomen swings sideways from the waist, bending more towards the sting.
  const wg=p.waggle||0,pv=.05;
  m.T=wg?q=>{const a=wg*clamp((pv-q[1])/.45,0,1),c=Math.cos(a),si=Math.sin(a),dy=q[1]-pv;return[q[0]*c-dy*si,pv+q[0]*si+dy*c,q[2]]}:null;
  m.mark('body',()=>m.loft(HORNET_SPINE.map(([y,w,z])=>hornetRing(y,w,z))));
  m.mark('sting',()=>m.beam([0,-1.98,.3],[0,-2.5,.42],.08,.06,.1));
  // Abdomen bands, like the game hornet's waist ring.
  m.mark('bands',()=>{for(const[y,w,z]of[[-1.4,.33,.24],[-.95,.47,.16],[-.45,.45,.08]])m.loft([hornetRing(y-.015,w,z),hornetRing(y+.015,w,z)],false,false)});
  // Head, tipped forward towards the audience (further on a nod).
  const hy=1.3,lean=.38+(p.nod||0),cl=Math.cos(lean),sl=Math.sin(lean);
  m.T=q=>{const y=q[1]-hy,z=q[2];return[q[0],hy+y*cl+z*sl,-y*sl+z*cl]};
  m.mark('head',()=>m.loft([hornetRing(hy,.24,.02),hornetRing(hy+.22,.38,-.04),hornetRing(hy+.5,.36,-.06),hornetRing(hy+.72,.22,-.04),hornetRing(hy+.8,.06,-.02)]));
  // Compound eyes: big faceted ovals on the sides of the face.
  m.mark('eyes',()=>{for(const s of[-1,1]){const c=[s*.3,hy+.44,-.2];m.loft([pt6(c,s,-.02),ringYZ(c[0]+s*.03,c[1],c[2],.16,.2,6),pt6(c,s,.1)],false,false)}});
  // Antennae, elbowed, springing a little as she sings; on a trill they stand up stiff and quiver with it.
  const st=clamp(p.strain||0,0,1);
  m.mark('antennae',()=>{for(const s of[-1,1]){const q=Math.sin(t*TAU*7.7+(s>0?0:1.4))*st,a=[s*.08,hy+.74,-.18],b=[s*(.24+.03*st)+q*.03,hy+1.15+.12*st,-.45-jaw*.05+.12*st],c=[s*(.4+.06*st)+q*.15,hy+1.32+.16*st+Math.sin(t*3+s)*.03*(1-st)+q*.07,-.2+.1*st];m.beam(a,b,.035,.035,.8);m.beam(b,c,.03,.03,.5)}});
  // Mouth: mandibles part sideways, the jaw plate drops, the throat glows behind.
  const open=jaw*.75,spread=(p.mand??jaw)*.7;
  m.mark('mandibles',()=>{for(const s of[-1,1]){const root=[s*.16,hy+.12,-.24],ang=s*spread,c=Math.cos(ang),si=Math.sin(ang);
    const R=q=>{const dx=q[0]-root[0],dz=q[2]-root[2];return[root[0]+dx*c-dz*si,q[1],root[2]+dx*si+dz*c]};
    m.loft([[R([s*.16,hy+.06,-.24]),R([s*.16,hy+.2,-.24]),R([s*.2,hy+.13,-.22])],[R([s*.04,hy+.02,-.56]),R([s*.04,hy+.12,-.54]),R([s*.08,hy+.07,-.52])]])}});
  const hinge=[0,hy+.06,-.08],ca=Math.cos(open),sa=Math.sin(open),J=q=>{const dy=q[1]-hinge[1],dz=q[2]-hinge[2];return[q[0],hinge[1]+dy*ca-dz*sa,hinge[2]+dy*sa+dz*ca]};
  m.mark('jaw',()=>m.loft([[[-.2,hy+.04,-.08],[.2,hy+.04,-.08],[.18,hy-.06,-.1],[-.18,hy-.06,-.1]].map(J),[[-.1,hy+.06,-.46],[.1,hy+.06,-.46],[.08,hy,-.44],[-.08,hy,-.44]].map(J)]));
  m.mark('throat',()=>m.box([0,hy+.16,-.22],[.24,.08,.36]));
  m.T=null;
  // Two pairs of wings off the back of the thorax, buzzing like the game hornet's; spread
  // (0..1) raises them into a wide V.
  const sp=clamp(p.spread||0,0,1);
  m.mark('wings',()=>{for(const s of[-1,1])for(const[root,tip,trail,ph]of[[[.2,.85,.22],[1.75,1.35,.85],[1.0,.5,1.0],0],[[.18,.6,.22],[1.25,.3,.95],[.62,.12,.82],.55]]){
    const a=Math.sin(t*16.5+ph)*.5*(1-.6*sp)*s,c=Math.cos(a),si=Math.sin(a),r=[s*root[0],root[1],root[2]],lift=Math.sin(t*16.5+ph);
    const Wg=q=>{const dx=q[0]-r[0],dz=q[2]-r[2];return[r[0]+dx*c-dz*si,q[1]+Math.abs(dx)*(.12*lift*(1-sp)+.5*sp),r[2]+dx*si+dz*c]};
    m.loft([[r,r,r],[Wg([s*tip[0],tip[1],tip[2]]),Wg([s*(tip[0]+trail[0])/2,(tip[1]+trail[1])/2+.06,(tip[2]+trail[2])/2+.08]),Wg([s*trail[0],trail[1],trail[2]])]],false,false)}});
  if(band)buildBandArms(m,p,band)
}
// Arms from the front of the thorax: shoulder, elbow, a three-fingered claw.
function hornetArm(m,s,hand,fingers=true,elbow=null){const sh=[s*.34,.85,-.12],mid=elbow||[(sh[0]+hand[0])/2+s*.22,(sh[1]+hand[1])/2-.2,(sh[2]+hand[2])/2+.05];
  m.beam(sh,mid,.1,.1,.8);m.beam(mid,hand,.08,.08,.7);if(fingers)for(const c of[-1,0,1])m.beam(hand,[hand[0]+s*.1,hand[1]+.06+c*.07,hand[2]-.1],.03,.03,.2)}
// A flat shape (2D points in the plane through O spanned by U and V), with thickness along N.
function flatShape(m,pts,O,U,V,N,th){const at=(q,k)=>[O[0]+U[0]*q[0]+V[0]*q[1]+N[0]*k,O[1]+U[1]*q[0]+V[1]*q[1]+N[1]*k,O[2]+U[2]*q[0]+V[2]*q[1]+N[2]*k];m.loft([pts.map(q=>at(q,-th/2)),pts.map(q=>at(q,th/2))])}
// The two guitars, outlined in the guitar's own plane: u runs up the neck, v across it (+v is the
// bass side, the edge nearest her chin). A Strat: two horns, the bass horn longer, three
// single-coil pickups and the long one-sided headstock. A Les Paul: one cutaway on the treble
// side, a round fat body, two humbuckers and the open-book headstock.
const AXES={
  strat:{body:[[.18,.08],[.3,.12],[.44,.2],[.53,.27],[.47,.35],[.28,.38],[.08,.33],[-.08,.3],[-.3,.41],[-.52,.37],[-.64,.18],[-.68,0],[-.64,-.18],[-.52,-.37],[-.3,-.41],[-.08,-.31],[.08,-.35],[.26,-.32],[.39,-.25],[.33,-.17],[.22,-.12],[.18,-.08]],
    head:[[0,-.06],[.08,-.1],[.3,-.12],[.36,-.07],[.33,0],[.1,.05],[0,.05]],pickups:[[-.06,.09,.02],[-.22,.09,0],[-.38,.09,-.03]]},
  lespaul:{body:[[.18,.08],[.26,.16],[.3,.26],[.22,.36],[.06,.38],[-.1,.33],[-.32,.43],[-.5,.39],[-.62,.22],[-.66,0],[-.62,-.22],[-.5,-.39],[-.3,-.43],[-.1,-.39],[.04,-.34],[.18,-.31],[.3,-.23],[.27,-.15],[.18,-.11],[.18,-.08]],
    head:[[0,-.06],[.22,-.11],[.27,-.06],[.28,0],[.27,.06],[.22,.11],[0,.06]],pickups:[[-.08,.2,0],[-.34,.2,0]]}};
// Slung right-handed: the neck rises to her left, the right claw strums over the pickups.
const GUITAR={O:[-.18,.42,-.62],U:vnorm3([1,.62,.05]),V:vnorm3([-.62,1,0]),N:[0,0,-1]};
function guitarPoint(u,v=0,dz=0){const{O,U,V}=GUITAR;return[O[0]+U[0]*u+V[0]*v,O[1]+U[1]*u+V[1]*v,O[2]+U[2]*u+V[2]*v+dz]}
function buildBandArms(m,p,band){
  if(band==='guitar'){
    const{O,U,V,N}=GUITAR,axe=AXES[p.axe]||AXES.strat;
    m.mark('guitar',()=>{flatShape(m,axe.body,O,U,V,N,.08);m.beam(guitarPoint(.3),guitarPoint(1.6),.08,.05);flatShape(m,axe.head,guitarPoint(1.6),U,V,N,.05)});
    // Pickups across the strings (a single coil is narrow, a humbucker twice as wide).
    m.mark('pickups',()=>{for(const[u,w,tilt]of axe.pickups){const h=w/2,q=(dv,du)=>guitarPoint(u+du+dv*tilt,dv,-.05);polyline(m,[q(-.1,-h/2),q(.1,-h/2),q(.1,h/2),q(-.1,h/2),q(-.1,-h/2)])}});
    m.mark('strings',()=>{for(const k of[-.03,0,.03])polyline(m,[guitarPoint(-.5,k,-.06),guitarPoint(1.58,k,-.06)])});
    const st=p.strum||0,fret=p.fret||0;
    // The strumming arm comes forward over the top edge of the body, as over a guitar's arm rest.
    m.mark('arms',()=>{hornetArm(m,-1,[-.3,.48+st*.16,-.74],true,[-.64,.78+st*.04,-.88]);const f=guitarPoint(.9+fret*.45,.05,-.09);hornetArm(m,1,f)})
  }else if(band==='drums'){
    const L=p.leftTarget||[-.5,.3,-.9],R=p.rightTarget||[.5,.35,-.9],hl=p.hitL||0,hr=p.hitR||0;
    const handL=[L[0]*.75,lerp(L[1]+.55,L[1]+.14,hl),lerp(-.55,L[2]+.25,hl)],handR=[R[0]*.75,lerp(R[1]+.55,R[1]+.14,hr),lerp(-.55,R[2]+.25,hr)];
    const tip=(h,T)=>[h[0]+(T[0]-h[0])*1.15,h[1]+(T[1]-h[1])*1.15,h[2]+(T[2]-h[2])*1.15];
    m.mark('arms',()=>{hornetArm(m,-1,handL,false);hornetArm(m,1,handR,false)});
    m.mark('sticks',()=>{m.beam(handL,tip(handL,L),.035,.035,.6);m.beam(handR,tip(handR,R),.035,.035,.6)})
  }
}
const hornetColours=(body,trim)=>({body,sting:trim,bands:trim,head:body,eyes:C.y,antennae:trim,mandibles:C.w,jaw:body,throat:C.y,wings:C.c,arms:body,guitar:C.r,pickups:C.w,strings:C.w,sticks:C.w});
function makeHornet(body=C.m,trim=C.y,band=null,axe=null){const mesh=posedMesh((m,p)=>buildHornet(m,{...p,band,axe}),hornetColours(body,trim));mesh.band=band;return mesh}

const KIT_T=p=>[p[0]*1.35,p[1]*1.35-.1,p[2]*1.25-.05];
// The drum kit: bass drum facing the audience, snare and two toms, hi-hat and a crash
// cymbal on stands. Strike points (in the drummer's model space) for the sticks.
function buildDrumKit(m){
  m.T=KIT_T;
  const drum=(c,r,h,axis)=>m.loft([-h/2,h/2].map(k=>axis==='z'?m.ringXY(c[0],c[1],c[2]+k,r,12):m.ringXZ(c[0],c[1]+k,c[2],r,r,12)));
  m.mark('shells',()=>{drum([0,-.45,-.4],.5,.42,'z');drum([-.55,.22,-.8],.22,.16,'y');drum([-.22,.42,-.62],.18,.16,'y');drum([.22,.44,-.62],.2,.18,'y')});
  m.mark('metal',()=>{const cym=(c,r)=>m.loft([m.ringXZ(c[0],c[1],c[2],r,r,12),m.ringXZ(c[0],c[1]+.05,c[2],.04,.04,12)]);cym([.62,.62,-.78],.26);cym([-.7,.95,-.45],.34);
    for(const[x,z,y]of[[.62,-.78,.62],[-.7,-.45,.95],[-.55,-.8,.14]])m.beam([x,-.9,z],[x,y,z],.03,.03)});
}
const drumKit=posedMesh(buildDrumKit,{shells:C.r,metal:C.y});
drumKit.strikes=Object.fromEntries(Object.entries({snare:[-.55,.32,-.8],tomL:[-.22,.52,-.62],tomR:[.22,.54,-.62],hat:[.62,.66,-.78],crash:[-.7,1.0,-.45]}).map(([k,v])=>[k,KIT_T(v)]));

globalThis.PromoModels={reindeerColours,present,xmasTree,snowman,makeHornet,drumKit,posedMesh,edgeColours};
})();
