'use strict';
// Teaser models (only loaded with ?promo=teaser): the animal mechs of the eight worlds and
// their landmarks. Four-legged animals are ground-armour kinds, so they walk, trot and gallop
// on the game's own leg rig and gaits; kangaroos and penguins are posed meshes animated by the
// scenes. Every model faces -z. Built with the ground-armour mesh builder, like the reindeer.
(()=>{
const P=globalThis.PromoModels,PI=Math.PI;
const line=(m,pts,closed=false)=>gaLine(m,pts,closed);

// ---------- Four-legged animals ----------
// Legs in the HOUND's order (LF, LH, RF, RH), scaled to a hip height Y.
function quadLegs(Y,zf,zb,wx,t,o={}){
  const k=Y/1.9,kz=o.kneeZ??.26,kh=o.kneeH??.62,legs=[];
  for(const sx of[-1,1])for(const z of[zf,zb]){
    const hy=z<0?Y-.1*k:(o.backY??Y)-.1*k;
    legs.push(gaLegDesign([sx*wx,hy,z],[sx*(wx+.12*k),hy*kh,z+(z<0?-kz:kz)*k],[sx*(wx+.12*k),.42*k,z+(z<0?.12:-.08)*k],[sx*(wx+.14*k),0,z+(z<0?.08:-.08)*k],t))}
  return legs
}
const H0=()=>GA_KINDS.hound;
function animal(id,o){
  const H=H0();
  GA_KINDS[id]={...H,label:id.toUpperCase(),s:o.s||1.2,hp:9,col:o.col,score:0,top:o.top,legs:o.legs,pivotY:o.Y,radius:o.radius||1.3,
    reach:o.reach??H.reach*o.Y/1.9,minCycle:o.minCycle??H.minCycle,swayAmp:o.swayAmp??H.swayAmp,
    gaits:o.gaits||H.gaits.map(g=>({...g,swing:g.swing*(o.swingK||1),lift:g.lift*(o.liftK||1)})),
    muzzles:[[0,o.Y,-2]],spheres:[[0,o.Y,0,1.6]],body:o.body,colours:o.colours||{}};
}
// A cross-section of a body: four corners, w wide, from y0 to y1, at z.
const sec=(w,y0,y1,z,top=1)=>[[-w,y0,z],[w,y0,z],[w*top,y1,z],[-w*top,y1,z]];
const ring8=(w,y0,y1,z)=>{const c=(y0+y1)/2,h=(y1-y0)/2;return[[-w*.7,y0,z],[w*.7,y0,z],[w,c-h*.45,z],[w,c+h*.45,z],[w*.7,y1,z],[-w*.7,y1,z],[-w,c+h*.45,z],[-w,c-h*.45,z]]};
const feetWhite=m=>Object.fromEntries(Object.keys(m.marks).filter(k=>/^(knee|foot)\d/.test(k)).map(k=>[k,C.w]));

// The leg builder again, with per-animal joints: L.knee (knee box size), L.hoof (a small
// tapered hoof instead of the reindeer's broad pad), L.pad (pad size). Same vertex order every
// time, as the ground-armour rig needs.
{const base=window.gaLeg;
window.gaLeg=function(m,L,t,i){
  if(!L.hoof&&L.kneeK==null)return base(m,L,t,i);
  const kk=L.kneeK??1;
  m.beam(L.hip,L.knee,t,t*1.3);
  m.mark('knee'+i,()=>m.box(L.knee,[t*1.6*kk,t*1.6*kk,t*1.6*kk]));
  m.beam(L.knee,L.ankle,t*.8,t*1.1);
  m.box(L.ankle,[t*1.1*kk,t*1.1*kk,t*1.1*kk]);
  const f=L.foot,h=L.hoof||1;
  m.mark('foot'+i,()=>m.loft([m.ringXZ(f[0],f[1],f[2]-.03,t*.95*h,t*1.15*h,6),m.ringXZ(f[0],f[1]+t*1.1*h,f[2],t*.62*h,t*.7*h,6)]));
  m.beam(L.ankle,[f[0],f[1]+t*1.05*h,f[2]],t*.55,t*.55);
}}
const hooves=(legs,o)=>legs.map(L=>Object.assign(L,o));
// A tube along a path of points: each ring stands square to the path, rx wide and ry deep
// (both may change along it). Used for necks, heads and tails that curve.
function tube(m,pts,rx,ry,n=8,caps=[false,true]){
  const rings=pts.map((p,i)=>{
    const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];const L=Math.hypot(...d)||1;d=d.map(x=>x/L);
    let sd=[d[2],0,-d[0]];const sl=Math.hypot(...sd);sd=sl<1e-3?[1,0,0]:sd.map(x=>x/sl);
    const up=[sd[1]*d[2]-sd[2]*d[1],sd[2]*d[0]-sd[0]*d[2],sd[0]*d[1]-sd[1]*d[0]];
    const wx=typeof rx==='function'?rx(i/(pts.length-1)):rx[i]??rx,wy=typeof ry==='function'?ry(i/(pts.length-1)):ry[i]??ry;
    return Array.from({length:n},(_,k)=>{const t=k/n*2*PI+PI/n,c=Math.cos(t)*wx,s=Math.sin(t)*wy;return[p[0]+sd[0]*c+up[0]*s,p[1]+sd[1]*c+up[1]*s,p[2]+sd[2]*c+up[2]*s]})});
  m.loft(rings,caps[0],caps[1]);return rings
}
// A body along z: stations [z, half width, bottom y, top y], each an eight-sided section.
const trunk=(m,st)=>m.loft(st.map(([z,w,y0,y1])=>ring8(w,y0,y1,z)));
// ===== The animal mechs. Like the reindeer: machines shaped like animals, built from box
// sections and beams on the HOUND walker's legs (knee boxes, white hex feet), each with one
// signature machine part. Model faces -z.
// The HOUND's leg design scaled by k (hound: hips at 1.9).
function houndLegs(k,o={}){const legs=[],wx=(o.wx??.55)*k,zf=(o.zf??-.9)*k,zb=(o.zb??.8)*k,t=(o.t??.2)*k,kb=o.backK??k;
  for(const sx of[-1,1])for(const z of[zf,zb]){const kk=z<0?k:kb,Y=1.9*kk;
    legs.push(gaLegDesign([sx*wx,Y-.1*kk,z],[sx*(wx+.25*kk),Y-.5*kk,z+(z<0?-.5:.5)*kk],[sx*(wx+.25*kk),.45*kk,z+(z<0?.15:-.1)*kk],[sx*(wx+.27*kk),0,z+(z<0?.1:-.1)*kk],t))}
  return legs}
// A box section at z: half width w, from y0 to y1 (top a little narrower).
const bsec=(w,y0,y1,z,top=.92)=>[[-w,y0,z],[w,y0,z],[w*top,y1,z],[-w*top,y1,z]];
const pod=(m,y,z0,z1,x=.22,r=.06)=>{m.box([0,y-.14,(z0+z1)/2],[.62,.28,Math.abs(z1-z0)*.55]);m.mark('barrels',()=>{for(const sx of[-1,1])m.barrel(sx*x,y,z0,z1,r)})};
const fins=(m,from,to,n,h=.22)=>m.mark('mane',()=>{for(let i=0;i<n;i++){const u=(i+.5)/n,p=[from[0]+(to[0]-from[0])*u,from[1]+(to[1]-from[1])*u,from[2]+(to[2]-from[2])*u];m.box([p[0],p[1]+h/2,p[2]],[.06,h,.16])}});
const mech=(id,o)=>animal(id,{...o,minCycle:o.minCycle??GA_KINDS.hound.minCycle});

// HORSE: an armoured chest, a raised beam neck with cooling fins for a mane, a long wedge
// head with a visor, the twin cannon pod on its back and a cable tail.
{const Y=1.9;
  mech('horse',{Y,s:1.3,col:C.o,top:4,legs:houndLegs(1),reach:1.7,
    body(m){
      m.loft([bsec(.42,Y-.42,Y+.3,-1.3),bsec(.52,Y-.38,Y+.36,-.35),bsec(.48,Y-.3,Y+.34,.6),bsec(.44,Y-.24,Y+.3,1.1)]);
      m.beam([0,Y+.12,-1.12],[0,Y+1.35,-1.62],.34,.46,.78);
      m.loft([bsec(.21,Y+1.12,Y+1.5,-1.56),bsec(.15,Y+.86,Y+1.12,-2.36)]);
      m.mark('visor',()=>m.box([0,Y+1.28,-1.86],[.4,.08,.34]));
      for(const sx of[-1,1])m.beam([sx*.13,Y+1.46,-1.6],[sx*.18,Y+1.78,-1.52],.07,.12,.35);
      fins(m,[0,Y+.5,-1.2],[0,Y+1.42,-1.6],5,.24);
      pod(m,Y+.6,-.45,-1.55);
      m.mark('tail',()=>{m.beam([0,Y+.25,1.08],[0,Y-.05,1.45],.12,.12,.8);m.beam([0,Y-.05,1.45],[0,Y-.75,1.6],.1,.16,.4)});
    },colours:{mane:C.y,tail:C.y,barrels:C.w,visor:C.c}});
}
// ZEBRA: the horse mech in white, plated with stripe panels, a crest of short fins.
{const Y=1.85;
  mech('zebra',{Y,s:1.2,col:C.w,top:3.9,legs:houndLegs(.97),reach:1.65,
    body(m){
      const st=[[-1.25,.42,Y-.4,Y+.3],[-.35,.52,Y-.36,Y+.34],[.55,.48,Y-.3,Y+.32],[1.05,.44,Y-.24,Y+.3]];
      m.loft(st.map(([z,w,y0,y1])=>bsec(w,y0,y1,z)));
      m.beam([0,Y+.12,-1.08],[0,Y+1.28,-1.56],.33,.44,.78);
      m.loft([bsec(.2,Y+1.08,Y+1.44,-1.5),bsec(.14,Y+.84,Y+1.08,-2.26)]);
      for(const sx of[-1,1])m.beam([sx*.12,Y+1.4,-1.54],[sx*.2,Y+1.74,-1.44],.08,.14,.35);
      m.mark('stripes',()=>{for(let i=0;i<9;i++){const z=-1.1+i*.27,w=.52-Math.abs(i-3)*.012;for(const dz of[0,.07])line(m,[[-w,Y-.36,z+dz+.1],[-w*.95,Y+.33,z+dz],[w*.95,Y+.33,z+dz],[w,Y-.36,z+dz+.1]])}
        for(let i=0;i<4;i++){const u=(i+.5)/4,y=Y+.2+u*1.05,z=-1.12-u*.45;line(m,[[-.2,y-.12,z+.04],[0,y+.16,z],[.2,y-.12,z+.04]])}});
      fins(m,[0,Y+.45,-1.15],[0,Y+1.36,-1.55],6,.18);
      m.mark('tail',()=>{m.beam([0,Y+.22,1.04],[0,Y-.5,1.32],.08,.08,.7);m.box([0,Y-.6,1.34],[.14,.24,.14])});
    },colours:{stripes:C.w,mane:C.y,tail:C.y}});
}
// CAMEL: long legs, its hump a radar turret, an S-beam neck to a level head, cargo panniers.
// It paces: both legs on one side move together.
{const k=1.22,Y=1.9*k;
  mech('camel',{Y,s:1.15,col:C.o,top:5,legs:houndLegs(k,{t:.17,zf:-.85,zb:.8}),reach:1.7*k,minCycle:.45,swayAmp:.07,
    gaits:[{v:0,offsets:[0,0,.5,.5],swing:.3,lift:.3,bobAmp:.05,bobK:2,pitchAmp:0},{v:4,offsets:[0,0,.5,.5],swing:.45,lift:.4,bobAmp:.08,bobK:2,pitchAmp:.02}],
    body(m){
      m.loft([bsec(.38,Y-.34,Y+.3,-1.2),bsec(.46,Y-.4,Y+.36,-.3),bsec(.44,Y-.34,Y+.34,.6),bsec(.36,Y-.24,Y+.3,1.1)]);
      m.mark('turret',()=>{m.loft([bsec(.44,Y+.34,Y+.36,-.75),bsec(.44,Y+.34,Y+.36,.45)]);
        m.loft([[[-.42,Y+.36,-.6],[.42,Y+.36,-.6],[.42,Y+.36,.3],[-.42,Y+.36,.3]],[[-.3,Y+.95,-.4],[.3,Y+.95,-.4],[.3,Y+.95,.1],[-.3,Y+.95,.1]],[[-.16,Y+1.12,-.25],[.16,Y+1.12,-.25],[.16,Y+1.12,-.05],[-.16,Y+1.12,-.05]]],false,true)});
      m.mark('dish',()=>{m.beam([0,Y+1.12,-.15],[0,Y+1.45,-.15],.05,.05);line(m,m.ringXY(0,Y+1.62,-.1,.24,8),true);line(m,[[0,Y+1.45,-.15],[0,Y+1.62,-.36]])});
      m.beam([0,Y-.02,-1.12],[0,Y-.3,-1.7],.3,.34,.85);m.beam([0,Y-.3,-1.7],[0,Y+.9,-2.15],.26,.3,.8);
      m.loft([bsec(.17,Y+.78,Y+1.1,-2.08),bsec(.12,Y+.68,Y+.9,-2.78)]);
      for(const sx of[-1,1])m.beam([sx*.12,Y+1.08,-2.1],[sx*.22,Y+1.22,-2.02],.06,.08,.3);
      m.mark('panniers',()=>{for(const sx of[-1,1]){m.box([sx*.6,Y-.05,-.15],[.22,.55,.75]);for(let i=0;i<4;i++)line(m,[[sx*.71,Y-.33,-.45+i*.2],[sx*.72,Y-.55,-.45+i*.2]])}});
      m.beam([0,Y+.15,1.1],[0,Y-.55,1.32],.08,.08,.6);
    },colours:{turret:C.y,dish:C.c,panniers:C.m}});
}
// ELEPHANT (India's festival mechs): a heavy armoured hull, a segmented hose trunk, twin
// cannons for tusks, armour-plate ears and a howdah on its back.
{const k=1.12,Y=1.9*k;
  mech('elephant',{Y,s:1.2,col:C.w,top:5,legs:houndLegs(k,{t:.3,wx:.7,zf:-1.0,zb:.95}),reach:1.3,minCycle:.85,radius:2,swayAmp:.04,
    gaits:[{v:0,offsets:[.25,0,.75,.5],swing:.24,lift:.2,bobAmp:.04,bobK:2,pitchAmp:0},{v:3,offsets:[.25,0,.75,.5],swing:.32,lift:.26,bobAmp:.07,bobK:2,pitchAmp:.012}],
    body(m){
      m.loft([bsec(.78,Y-.55,Y+.7,-1.45),bsec(.95,Y-.6,Y+.95,-.5),bsec(.92,Y-.55,Y+.9,.5),bsec(.8,Y-.45,Y+.7,1.35)]);
      m.loft([bsec(.62,Y,Y+1.05,-1.5),bsec(.52,Y-.2,Y+.85,-2.2)]);   // head
      m.mark('trunk',()=>{const P=[[0,Y+.2,-2.2],[0,Y-.35,-2.42],[0,Y-.9,-2.5],[0,Y-1.4,-2.45],[0,Y-1.78,-2.28],[0,Y-1.9,-2.0]];
        for(let i=0;i<P.length-1;i++){const w=.3-i*.04;m.beam(P[i],P[i+1],w,w,.9);m.box(P[i+1],[w*1.25,w*.6,w*1.25])}});
      m.mark('tusks',()=>{for(const sx of[-1,1])m.barrel(sx*.32,Y-.05,-2.2,-3.15,.09)});
      m.mark('ears',()=>{for(const sx of[-1,1]){const e=[[sx*.62,Y+.95,-1.7],[sx*1.3,Y+1.05,-1.45],[sx*1.42,Y+.2,-1.35],[sx*.62,Y,-1.6]];m.loft([e,e.map(p=>[p[0]+sx*.06,p[1],p[2]+.04])])}});
      m.mark('howdah',()=>{m.box([0,Y+1.05,0],[1.3,.2,1.4]);for(const sx of[-1,1])for(const sz of[-1,1])m.beam([sx*.55,Y+1.15,sz*.58],[sx*.55,Y+1.85,sz*.58],.06,.06);
        m.loft([[[-.75,Y+1.85,-.75],[.75,Y+1.85,-.75],[.75,Y+1.85,.75],[-.75,Y+1.85,.75]],[[-.1,Y+2.35,-.1],[.1,Y+2.35,-.1],[.1,Y+2.35,.1],[-.1,Y+2.35,.1]]],false,true)});
      m.mark('blanket',()=>{for(const sx of[-1,1]){const b=bsec(.01,Y-.25,Y+.85,0).map(()=>0);const q=[[sx*.97,Y+.85,-.85],[sx*.97,Y+.85,.85],[sx*.99,Y-.25,.8],[sx*.99,Y-.25,-.8]];line(m,q,true);for(let i=0;i<7;i++)line(m,[[sx*.99,Y-.25,-.75+i*.25],[sx*1.0,Y-.45,-.75+i*.25]])}});
      m.beam([0,Y+.35,1.38],[0,Y-.6,1.55],.08,.08,.5);
    },colours:{tusks:C.w,trunk:null,ears:C.y,howdah:C.y,blanket:C.m}});
}
// GIRAFFE: tall front legs and lower hips, its neck a lattice crane boom, antenna ossicones,
// patch panels on the body and the boom.
{const kf=1.45,kb=1.22,Y=1.9*kf;
  mech('giraffe',{Y,s:1.15,col:C.y,top:7.2,legs:houndLegs(kf,{t:.15,zf:-.62,zb:.6,backK:kb,wx:.38}),reach:2.2,minCycle:.5,
    body(m){
      const yb=1.9*kb;
      m.loft([bsec(.4,Y-.4,Y+.32,-1.0),bsec(.44,(Y+yb)/2-.42,(Y+yb)/2+.3,-.1),bsec(.38,yb-.34,yb+.24,.95)]);
      m.mark('boom',()=>{const a=[0,Y+.2,-.85],b=[0,Y+3.2,-1.75];for(const sx of[-1,1])m.beam([sx*.14,a[1],a[2]],[sx*.11,b[1],b[2]],.09,.09);
        const n=8;for(let i=0;i<n;i++){const u0=i/n,u1=(i+1)/n,P=u=>[a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u],p0=P(u0),p1=P(u1),w0=.14-.03*u0,w1=.14-.03*u1;
          line(m,[[-w0,p0[0],p0[1]],[w1,p1[0],p1[1]]]);line(m,[[w0,p0[0],p0[1]],[-w1,p1[0],p1[1]]]);line(m,[[-w1,p1[0],p1[1]],[w1,p1[0],p1[1]]])}});
      m.loft([bsec(.16,Y+3.05,Y+3.42,-1.72),bsec(.11,Y+2.98,Y+3.2,-2.38)]);
      m.mark('ossicones',()=>{for(const sx of[-1,1]){m.beam([sx*.08,Y+3.4,-1.76],[sx*.12,Y+3.82,-1.72],.05,.05);m.box([sx*.12,Y+3.85,-1.72],[.1,.1,.1])}});
      for(const sx of[-1,1])m.beam([sx*.13,Y+3.36,-1.7],[sx*.34,Y+3.46,-1.6],.05,.09,.3);
      m.mark('spots',()=>{for(const sx of[-1,1])for(let i=0;i<4;i++)for(let j=0;j<2;j++){const z=-.82+i*.48+(j?.18:0),y=Y-.22+j*.3-i*.14,x=sx*.43,d=.11;line(m,[[x,y-d,z-d],[x,y+d,z-d],[x,y+d,z+d],[x,y-d,z+d]],true)}});
      m.mark('tail',()=>{m.beam([0,1.9*kb,.95],[0,1.9*kb-.9,1.12],.05,.05);m.box([0,1.9*kb-1.0,1.13],[.12,.24,.12])});
    },colours:{boom:C.o,spots:C.o,ossicones:C.o,tail:C.o}});
}
// LLAMA: a pack mech: a tall upright beam neck, banana-ear antennas with tassels, a frame
// across its back carrying two panniers.
{const k=.84,Y=1.9*k;
  mech('llama',{Y,s:1.15,col:C.w,top:3.6,legs:houndLegs(k,{t:.17,zf:-.78,zb:.72}),reach:1.3,minCycle:.36,
    body(m){
      m.loft([bsec(.36,Y-.3,Y+.32,-.85),bsec(.42,Y-.34,Y+.38,-.15),bsec(.38,Y-.28,Y+.34,.7)]);
      m.beam([0,Y+.15,-.75],[0,Y+1.55,-.95],.26,.32,.85);
      m.loft([bsec(.16,Y+1.45,Y+1.74,-.88),bsec(.11,Y+1.42,Y+1.6,-1.36)]);
      for(const sx of[-1,1]){m.beam([sx*.1,Y+1.72,-.9],[sx*.16,Y+2.02,-.86],.06,.08,.5);m.beam([sx*.16,Y+2.02,-.86],[sx*.1,Y+2.16,-.94],.05,.05,.5)}
      m.mark('tassels',()=>{for(const sx of[-1,1])m.box([sx*.16,Y+1.95,-.86],[.09,.12,.09])});
      m.mark('pack',()=>{m.box([0,Y+.44,-.1],[.7,.1,.9]);for(const sx of[-1,1]){m.box([sx*.52,Y+.08,-.1],[.2,.5,.7]);for(const z of[-.3,.1])line(m,[[sx*.62,Y+.33,z],[sx*.62,Y-.17,z]])}});
      m.beam([0,Y+.28,.72],[0,Y+.45,.92],.1,.1,.6);
    },colours:{pack:C.m,tassels:C.y}});
}
// BISON: a stepped armour hump carrying the twin cannons, a low ram-plate head with horns, a
// grille beard and a lean rear.
{const k=.95,Y=1.9*k;
  mech('bison',{Y,s:1.3,col:C.o,top:3.6,legs:houndLegs(k,{t:.24,wx:.55}),reach:1.6,radius:1.6,
    body(m){
      m.loft([bsec(.58,Y-.5,Y+.82,-1.2),bsec(.66,Y-.52,Y+1.12,-.55),bsec(.58,Y-.42,Y+.62,.2),bsec(.48,Y-.32,Y+.42,1.0)]);
      m.loft([bsec(.46,Y-.3,Y+.55,-1.22),bsec(.36,Y-.62,Y+.05,-1.95)]);   // the low head
      m.mark('ram',()=>m.box([0,Y+.25,-1.62],[.86,.42,.14]));
      m.mark('horns',()=>{for(const sx of[-1,1]){m.beam([sx*.4,Y+.32,-1.55],[sx*.7,Y+.38,-1.6],.1,.1,.7);m.beam([sx*.7,Y+.38,-1.6],[sx*.74,Y+.72,-1.7],.08,.08,.35)}});
      m.mark('beard',()=>{for(let i=0;i<6;i++){const x=-.25+i*.1;line(m,[[x,Y-.55,-1.8],[x,Y-1.0,-1.75]])}line(m,[[-.3,Y-1.0,-1.75],[.3,Y-1.0,-1.75]])});
      m.mark('fur',()=>{for(let i=0;i<4;i++){const z=-1.1+i*.18;line(m,[[-.66,Y+.15,z],[-.6,Y+1.0+(i%2)*.1,z],[.6,Y+1.0+(i%2)*.1,z],[.66,Y+.15,z]])}});
      pod(m,Y+1.28,-.2,-1.25,.2,.06);
      m.beam([0,Y+.25,1.0],[0,Y-.4,1.25],.07,.07,.6);m.mark('tail',()=>m.box([0,Y-.48,1.27],[.12,.18,.1]));
    },colours:{horns:C.w,beard:C.y,fur:C.y,ram:C.y,barrels:C.w,tail:C.y}});
}
if(GA_KINDS.reindeer)GA_KINDS.reindeer.colours={nose:C.r,antlers:C.y,barrels:C.w};   // for side-by-side studio comparisons
// Posed four-legged mesh colours for the scenes' drawUnit hook.
const kindColours=(kind,m)=>({...feetWhite(m),...(GA_KINDS[kind]?.colours||{})});

// ---------- Kangaroo mech: hops on its own posed rig ----------
// pose {u}: hop cycle 0..1. Stance 0-0.32: it lands crouched and drives up off its feet. Flight
// 0.32-1: legs swept back, the tail strut level behind, the feet swinging forward to land.
// Built like the reindeer: box sections, beams, knee boxes, white pads. The scene lifts it by hopH(u).
const ROO_ST=.32;
function smoothRoo(t){return t*t*(3-2*t)}
function lerpR(a,b,t){return a+(b-a)*t}
function rooPose(u){
  const L1=.72,L2=.78,stance=u<ROO_ST,k=stance?smoothRoo(u/ROO_ST):0,f=stance?0:(u-ROO_ST)/(1-ROO_ST),arc=Math.sin(PI*f);
  let a1,a2;
  if(stance){a1=lerpR(1.15,.35,k);a2=lerpR(1.0,.25,k)}
  else{const land=f>.6?smoothRoo((f-.6)/.4):0;a1=lerpR(.35,-.55,Math.min(1,f*2.2))+land*1.6;a2=lerpR(lerpR(.25,.55,arc),1.0,land)}
  return{a1,a2,L1,L2,hipH:L1*Math.cos(a1)+L2*Math.cos(a2)+.12,tilt:stance?lerpR(.5,.75,k):lerpR(.75,.5,f),air:stance?0:arc,stance}
}
function buildKangaroo(m,pose){
  const P0=rooPose(pose.u||0),hy=P0.hipH,tl=P0.tilt,fw=[Math.cos(tl),-Math.sin(tl)],at=d=>[0,hy+fw[0]*d,.12+fw[1]*d];
  // Torso: box sections leaning forward, heavy at the hips.
  // A section square to the lean: x across, and P (up-and-back) through the body's depth.
  const sect=(d,w,h)=>{const c=at(d),P=[Math.sin(tl),Math.cos(tl)];return[[-w,c[1]-P[0]*h,c[2]-P[1]*h],[w,c[1]-P[0]*h,c[2]-P[1]*h],[w*.9,c[1]+P[0]*h,c[2]+P[1]*h],[-w*.9,c[1]+P[0]*h,c[2]+P[1]*h]]};
  m.loft([sect(-.2,.38,.3),sect(.35,.4,.32),sect(.85,.32,.24),sect(1.15,.22,.17)]);
  const ch=at(1.15),hd=[0,ch[1]+.5,ch[2]-.12];
  m.beam([0,ch[1]+.1,ch[2]],[0,hd[1]-.1,hd[2]+.05],.2,.22,.85);
  m.loft([bsec(.16,hd[1]-.14,hd[1]+.16,hd[2]+.1),bsec(.09,hd[1]-.1,hd[1]+.04,hd[2]-.42)]);
  m.mark('visor',()=>m.box([0,hd[1]+.06,hd[2]-.12],[.3,.06,.22]));
  m.mark('ears',()=>{for(const sx of[-1,1])m.beam([sx*.1,hd[1]+.14,hd[2]+.05],[sx*.18,hd[1]+.62,hd[2]+.18],.06,.13,.3)});
  for(const sx of[-1,1]){const s0=at(.78),sh=[sx*.26,s0[1],s0[2]],el=[sx*.28,sh[1]-.32,sh[2]-.16],pw=[sx*.22,el[1]-.08,el[2]-.24];m.beam(sh,el,.08,.08,.9);m.beam(el,pw,.07,.07,.8)}
  for(const sx of[-1,1]){
    const h=[sx*.32,hy,.12],kn=[sx*.36,hy-P0.L1*Math.cos(P0.a1),.12-P0.L1*Math.sin(P0.a1)],an=[sx*.36,kn[1]-P0.L2*Math.cos(P0.a2),kn[2]+P0.L2*Math.sin(P0.a2)];
    const ta=P0.stance?0:P0.air*.9,toe=[sx*.36,an[1]-.05+Math.sin(ta)*.5,an[2]-Math.cos(ta)*.62];
    m.box(h,[.3,.3,.3]);m.beam(h,kn,.26,.32,.8);m.mark('knee'+sx,()=>m.box(kn,[.26,.26,.26]));m.beam(kn,an,.13,.15,.85);m.box(an,[.18,.18,.18]);
    m.mark('foot'+sx,()=>{m.beam(an,toe,.16,.1,.7);m.box([toe[0],toe[1]+.03,toe[2]+.08],[.2,.06,.3])})}
  m.mark('tail',()=>{const r=at(-.12),lift=P0.air;const pts=[r,[0,r[1]-.18+lift*.12,r[2]+.5],[0,lerpR(.32,r[1]-.2,lift),r[2]+1.0],[0,lerpR(.1,r[1]-.18,lift),r[2]+1.55],[0,lerpR(.04,r[1]-.12,lift),r[2]+1.95]];
    for(let i=0;i<4;i++){const w=.2-i*.04;m.beam(pts[i],pts[i+1],w,w,.85);m.box(pts[i+1],[w*1.2,w*1.2,w*.6])}});
}
const kangaroo=P.posedMesh(buildKangaroo,{ears:C.y,tail:C.y,visor:C.c,'foot-1':C.w,foot1:C.w,'knee-1':C.w,knee1:C.w});
const hopH=u=>u>ROO_ST?Math.sin(PI*(u-ROO_ST)/(1-ROO_ST))*.62:0;

// ---------- Penguin mech: a squat walker that waddles ----------
// pose {w}: waddle phase (radians). An angular hull (white chest plate on the front, a dark
// back), a block beak, fin plates, short legs on orange pads. Faces -z.
function buildPenguin(m,pose){
  const w=pose.w||0,stepL=Math.max(0,Math.sin(w))*.16,stepR=Math.max(0,-Math.sin(w))*.16,oct=(y,r,rz=r*.86)=>m.ringXZ(0,y,.02,r,rz,8,PI/8);
  m.mark('back',()=>m.loft([oct(.32,.34),oct(.62,.46),oct(1.02,.44),oct(1.32,.32),oct(1.48,.24)],true,false));
  m.mark('belly',()=>{const plate=(y,r)=>[[-r*.62,y,-r*.82],[r*.62,y,-r*.82]];const rows=[[.4,.36],[.68,.47],[1.02,.45],[1.28,.33]];
    m.loft(rows.map(([y,r])=>[...plate(y,r),[r*.6,y,-r*.86],[-r*.6,y,-r*.86]]),false,false)});
  m.mark('head',()=>m.loft([oct(1.48,.24),oct(1.62,.27),oct(1.84,.23),oct(1.94,.12)],false,true));
  m.mark('beak',()=>m.loft([bsec(.07,1.66,1.78,-.2),bsec(.03,1.64,1.7,-.5)]));
  m.mark('visor',()=>m.box([0,1.8,-.17],[.36,.05,.1]));
  m.mark('cheeks',()=>{for(const sx of[-1,1])m.box([sx*.22,1.68,-.06],[.04,.16,.12])});
  m.mark('fins',()=>{for(const sx of[-1,1]){const out=.25+.2*Math.abs(Math.sin(w*2));m.loft([[[sx*.44,1.15,-.12],[sx*.44,1.15,.14]],[[sx*(.5+out*.25),.5,-.06],[sx*(.5+out*.25),.5,.1]]].map(r=>[...r,...r.slice().reverse().map(p=>[p[0]+sx*.05,p[1],p[2]])]),false,false)}});
  for(const[sx,st]of[[-1,stepL],[1,stepR]])m.beam([sx*.16,.36,0],[sx*.18,st+.12,-.06],.12,.12,.9);
  m.mark('feet',()=>{for(const[sx,st]of[[-1,stepL],[1,stepR]])m.loft([m.ringXZ(sx*.18,st,-.14,.2,.24,6),m.ringXZ(sx*.18,st+.08,-.12,.13,.16,6)])});
}
const penguin=P.posedMesh(buildPenguin,{back:C.u,head:C.u,fins:C.u,belly:C.w,beak:C.y,cheeks:C.y,feet:C.o,visor:C.c});

// ---------- Landmarks and props: static meshes ----------
const staticMesh=(build,colours)=>P.posedMesh(build,colours);
// A box turned about the y axis.
function rbox(m,c,sz,yaw){const ca=Math.cos(yaw),sa=Math.sin(yaw),a=sz[0]/2,b=sz[1]/2,d=sz[2]/2,R=(x,z)=>[c[0]+x*ca+z*sa,0,c[2]-x*sa+z*ca];
  const ring=y=>[[-a,-d],[a,-d],[a,d],[-a,d]].map(([x,z])=>{const p=R(x,z);return[p[0],y,p[2]]});m.loft([ring(c[1]-b),ring(c[1]+b)])}
// Stonehenge: the sarsen circle with its lintels (gaps where stones have fallen), the five
// trilithons of the horseshoe, bluestones, two fallen stones and the Heel Stone. Radius 12.
const stonehenge=staticMesh(m=>{
  // A ruin: about half the sarsens still stand, a few still carrying their lintels.
  const n=30,R=12.5,missing=new Set([2,3,4,8,9,12,13,14,15,18,19,21,22,23,24,26,27]);
  for(let i=0;i<n;i++){if(missing.has(i))continue;const a=i/n*2*PI,h=4+((i*7)%3)*.15;rbox(m,[Math.sin(a)*R,h/2,Math.cos(a)*R],[1.5,h,.95],a)}
  for(const i of[0,5,10,16]){const a=(i+.5)/n*2*PI;rbox(m,[Math.sin(a)*R,4.5,Math.cos(a)*R],[2.9,.7,.95],a)}
  // The horseshoe of trilithons inside, taller towards the middle, one fallen.
  [[-PI*.6,6.4],[-PI*.8,7.4],[PI,8.2],[PI*.8,7.4],[PI*.6,6.4]].forEach(([a,h],i)=>{if(i===3)return;const r=7,cx=Math.sin(a)*r,cz=Math.cos(a)*r;
    for(const s of[-1,1])rbox(m,[cx+Math.cos(a)*s*1.25,h/2,cz-Math.sin(a)*s*1.25],[1.5,h,1.0],a);rbox(m,[cx,h+.4,cz],[4.4,.8,1.0],a)});
  rbox(m,[3,.45,-2],[1.2,.9,4.5],.4);rbox(m,[-9.5,.4,6],[1.4,.8,3.8],1.2);
  rbox(m,[2,2.4,-28],[2,4.8,1.6],.2);
},null);
// Uluru: a long monolith, steep-sided and dome-topped, with gullies scored down its flanks.
const uluru=staticMesh(m=>{
  const L=88,Wd=26,Hh=12,rings=[];
  for(let i=0;i<=10;i++){const u=i/10-.5,k=Math.pow(Math.cos(u*PI*.98),.45),x=u*L;const pts=[];
    for(let j=0;j<12;j++){const t=j/12*2*PI,c=Math.cos(t),s=Math.sin(t),y=Math.max(0,s)*Hh*k*(1+.08*Math.sin(i*1.7)),z=c*Wd/2*Math.pow(k,.6);pts.push([x,s<0?-4:y,z])}rings.push(pts)}
  m.loft(rings.map(r=>r.map(([x,y,z])=>[x,y,z])));
  m.mark('gullies',()=>{for(let i=1;i<10;i++){const u=i/10-.5,x=u*L,k=Math.pow(Math.cos(u*PI*.98),.45);for(const sz of[-1,1])line(m,[[x,Hh*k*.92,sz*Wd*.2*k],[x+1.2,Hh*k*.45,sz*Wd*.43*Math.pow(k,.6)],[x+.6,0,sz*Wd*.5*Math.pow(k,.6)]])}});
},{gullies:C.y});
// Giza: the three pyramids, their courses traced, and the Sphinx in front. The pyramids were
// cased in white limestone once, so they are drawn white.
const pyramid=(m,c,b,h)=>{const sq=(y,s)=>[[c[0]-s,y,c[2]-s],[c[0]+s,y,c[2]-s],[c[0]+s,y,c[2]+s],[c[0]-s,y,c[2]+s]];
  m.loft([sq(0,b/2),sq(h,.15)]);for(let k=1;k<8;k++){const y=h*k/8,s=b/2*(1-k/8);line(m,sq(y,s),true)}};
const giza=staticMesh(m=>{
  pyramid(m,[0,0,0],40,25);pyramid(m,[-46,0,30],37,23.5);pyramid(m,[-78,0,58],18,11);
  for(let i=0;i<3;i++)pyramid(m,[-92+i*6,0,74],5,3);
  m.mark('sphinx',()=>{const S=[30,0,-38];
    m.loft([ring8(2.2,0,3.2,S[2]+5),ring8(2.4,0,3.6,S[2]-1),ring8(2,0,3.4,S[2]-4)].map(r=>r.map(([x,y,z])=>[x+S[0],y,z])));
    for(const sx of[-1,1])m.box([S[0]+sx*1.3,.5,S[2]-6.2],[1,1,4.4]);
    m.loft([ring8(1.1,3.2,5.6,S[2]-4.6),ring8(1.05,3.4,5.8,S[2]-5.6)].map(r=>r.map(([x,y,z])=>[x+S[0],y,z])));
    for(const sx of[-1,1])m.loft([[[S[0]+sx*1.1,5.6,S[2]-4.4],[S[0]+sx*1.9,3.4,S[2]-4.2],[S[0]+sx*1.9,3.4,S[2]-3.6],[S[0]+sx*1.1,5.6,S[2]-3.8]]]);   // the nemes
  });
},{sphinx:C.y});
// The Taj Mahal: plinth, the main hall with arched iwans, the onion dome and its four
// chhatris, four minarets, and the long reflecting pool towards us.
const taj=staticMesh(m=>{
  m.box([0,.3,0],[38,3,38]);
  const W2=9,Hh=13,chamf=3,oct=y=>[[-W2+chamf,y,-W2],[W2-chamf,y,-W2],[W2,y,-W2+chamf],[W2,y,W2-chamf],[W2-chamf,y,W2],[-W2+chamf,y,W2],[-W2,y,W2-chamf],[-W2,y,-W2+chamf]];
  m.loft([oct(1.8),oct(1.8+Hh)]);
  m.mark('arches',()=>{for(const[nx,nz]of[[0,-1],[0,1],[-1,0],[1,0]]){const fx=nz?1:0,fz=nx?1:0,cx=nx*W2,cz=nz*W2,arch=(w,y0,h,o)=>{const pts=[];for(let k=0;k<=8;k++){const t=k/8,x=(t-.5)*w,y=y0+(Math.abs(x)<w*.5?h*(1-Math.pow(Math.abs(t-.5)*2,1.6)*.35):0);pts.push(t===0||t===1?[cx+fx*x+nx*o,y0-h*.75,cz+fz*x+nz*o]:[cx+fx*x+nx*o,y0+Math.sin(t*PI)*h*.3+h*.7,cz+fz*x+nz*o])}line(m,pts)};
    arch(7,1.8+Hh*.35,Hh*.55,-.05);line(m,[[cx-fx*4.5+nx*-.05,1.8,cz-fz*4.5+nz*-.05],[cx-fx*4.5,1.8+Hh*.95,cz-fz*4.5],[cx+fx*4.5,1.8+Hh*.95,cz+fz*4.5],[cx+fx*4.5,1.8,cz+fz*4.5]])}});
  const dome=[[0,1.8+Hh,5.6],[0,1.8+Hh+2,5.8],[0,1.8+Hh+4.5,7.2],[0,1.8+Hh+7,7.4],[0,1.8+Hh+9.5,6.4],[0,1.8+Hh+11.5,4.2],[0,1.8+Hh+13,2.1],[0,1.8+Hh+14.2,.4]];
  m.loft(dome.map(([x,y,r])=>m.ringXZ(0,y,0,r,r,12,PI/12)),false,true);
  m.mark('finial',()=>{line(m,[[0,1.8+Hh+14.2,0],[0,1.8+Hh+17,0]]);m.box([0,1.8+Hh+15.6,0],[.5,.5,.5])});
  for(const sx of[-1,1])for(const sz of[-1,1]){const x=sx*6.2,z=sz*6.2,y=1.8+Hh;for(const q of[-1,1])line(m,[[x+q*.9,y,z],[x+q*.9,y+2.2,z]]);m.loft([m.ringXZ(x,y+2.2,z,1.3,1.3,8),m.ringXZ(x,y+3.4,z,1.2,1.2,8),m.ringXZ(x,y+4.4,z,.5,.5,8)],false,true)}
  for(const sx of[-1,1])for(const sz of[-1,1]){const x=sx*17.5,z=sz*17.5;m.loft([m.ringXZ(x,1.8,z,1.05,1.05,8),m.ringXZ(x,24,z,.8,.8,8)]);
    for(const y of[9,16,22.5])m.loft([m.ringXZ(x,y,z,1.5,1.5,8),m.ringXZ(x,y+.4,z,1.5,1.5,8)]);m.loft([m.ringXZ(x,24,z,1.1,1.1,8),m.ringXZ(x,25.6,z,1.0,1.0,8),m.ringXZ(x,26.6,z,.25,.25,8)],false,true)}
  m.mark('pool',()=>{line(m,[[-2.5,.05,-19],[2.5,.05,-19],[2.5,.05,-80],[-2.5,.05,-80]],true);for(let z=-26;z>-80;z-=9)line(m,[[-2.5,.05,z],[2.5,.05,z]]);
    for(const sx of[-1,1])for(let z=-22;z>-80;z-=6)line(m,[[sx*4.5,0,z],[sx*4.5,1.6,z],[sx*4.2,2.4,z],[sx*4.8,2.4,z],[sx*4.5,1.6,z]])});
},{finial:C.y,pool:C.c});
// Kilimanjaro, far off: a broad mountain with a flat summit under a ragged snow cap.
const kilimanjaro=staticMesh(m=>{
  const prof=[[-45,190],[0,170],[8,150],[20,118],[32,86],[41,60],[46,44],[48,30],[48.5,10]],rings=prof.map(([y,r],i)=>m.ringXZ(0,y,0,r*1.25,r,18).map(([x,yy,z],j)=>[x,yy+(i>0&&i<prof.length-1?Math.sin(j*2.3+i)*1.2:0),z]));
  m.loft(rings,false,false);
  m.mark('snow',()=>{const r=m.ringXZ(0,48.5,0,12.5,10,18);m.loft([m.ringXZ(0,44.5,0,44*1.25,44,18).map(([x,y,z],j)=>[x,y-(j%3)*1.8,z]),m.ringXZ(0,48,0,30*1.25,30,18)],false,false);line(m,r,true)});
},{snow:C.w});
// Machu Picchu: the steep peak of Huayna Picchu, the ridge of terraces in front of it, the
// stone houses with their gables, and a ragged line of Andes behind.
const machuPicchu=staticMesh(m=>{
  // The ridge the citadel stands on: a long hill with a flattened top, its flank stepped in terraces.
  const ridge=(y,rx,rz,cz)=>m.ringXZ(0,y,cz,rx,rz,14,PI/14);
  m.loft([ridge(-8,64,34,-6),ridge(0,58,30,-6),ridge(6,48,22,-6),ridge(10.5,38,16,-6),ridge(12,32,12,-6)],false,true);
  m.mark('terraces',()=>{for(let k=1;k<7;k++){const y=k*1.7,rx=58-k*3.8,rz=30-k*2.6,pts=[];for(let i=0;i<=9;i++){const t=PI*1.05+i/9*PI*.9;pts.push([Math.cos(t)*rx,y,-6+Math.sin(t)*rz])}line(m,pts)}});
  // Huayna Picchu: the steep peak behind the citadel.
  m.mark('peak',()=>m.loft([m.ringXZ(4,-12,32,34,26,10),m.ringXZ(4,0,32,30,22,10),m.ringXZ(2,24,36,14,10,10),m.ringXZ(0,40,38,6,4.5,10),m.ringXZ(0,47,38,1.2,1.2,10)],false,true));
  // The Andes, far behind: a row of solid peaks.
  m.mark('andes',()=>{for(let i=0;i<7;i++){const x=-180+i*60,z=150+(i%2)*30,h=55+((i*37)%5)*12,r=48+(i%3)*10;m.loft([m.ringXZ(x,-40,z,r*1.3,r*1.05,9),m.ringXZ(x,0,z,r,r*.8,9),m.ringXZ(x+3,h*.6,z,r*.45,r*.38,9),m.ringXZ(x+5,h,z+2,3,3,9)],false,true)}});
  // The stone houses on top, each with a gable.
  m.mark('houses',()=>{const house=(x,z,yaw)=>{rbox(m,[x,13.1,z],[3.6,2.2,2.6],yaw);const ca=Math.cos(yaw),sa=Math.sin(yaw),e=(dx,dy)=>[x+ca*dx,dy,z-sa*dx];
      for(const s of[-1,1]){const c=e(s*1.8,14.2);line(m,[[c[0]-sa*1.3,14.2,c[2]-ca*1.3],[c[0],15.6,c[2]],[c[0]+sa*1.3,14.2,c[2]+ca*1.3]])}
      line(m,[e(-1.8,15.6),e(1.8,15.6)])};
    for(let i=0;i<10;i++)house(-22+i*4.8,-8+((i*7)%3)*3.2,.12*((i%3)-1))});
},{terraces:C.g,peak:C.g,andes:C.c,houses:C.w});
// Monument Valley: the two Mittens and Merrick Butte, each a sheer butte on a talus slope.
const butte=(m,x,z,w,d,h,base,thumb)=>{
  m.loft([m.ringXZ(x,-6,z,w*1.95,d*2.4,12),m.ringXZ(x,0,z,w*1.7,d*2.1,12),m.ringXZ(x,base*.55,z,w*1.3,d*1.5,12),m.ringXZ(x,base,z,w*1.04,d*1.08,12)],false,false);
  const r=(y,k)=>[[x-w*k,y,z-d*k],[x+w*k,y,z-d*k],[x+w*k,y,z+d*k],[x-w*k,y,z+d*k]];m.loft([r(base,1),r(base+h,.94)]);
  for(let i=1;i<4;i++)line(m,r(base+h*i/4,1-.06*i/4),true);
  if(thumb){const tx=x+thumb*w*1.32;m.loft([m.ringXZ(tx,base*.8,z,w*.2,d*.42,6),m.ringXZ(tx,base+h*1.05,z,w*.12,d*.26,6),m.ringXZ(tx,base+h*1.12,z,w*.06,d*.1,6)],false,true)}};
const monumentValley=staticMesh(m=>{butte(m,-48,0,13,6,15,11,-1);butte(m,10,12,13,6,16,11,1);butte(m,72,-10,22,9,13,10,0)},null);
// Icebergs and ice cliffs for Antarctica.
const iceberg=staticMesh(m=>{
  m.loft([[[-9.5,-3,-5.5],[6.5,-3,-7.5],[11.5,-3,1],[4.5,-3,7.5],[-8.5,-3,5.5]],[[-9,0,-5],[6,0,-7],[11,0,1],[4,0,7],[-8,0,5]],[[-8,6,-4],[5,7,-6],[10,5,1],[3,6.5,6],[-7,7.5,4]],[[-5,9,-2],[2,11,-3],[6,8.5,1],[1,9.5,3],[-4,10.5,2]]].map(r=>r),false,true);
  m.mark('cracks',()=>{line(m,[[-8,6.4,-4.2],[-6,2.5,-4.8],[-7,0,-5]]);line(m,[[5,7,-6],[4.6,3,-6.6]]);line(m,[[10,5,1],[10.5,2,.9]])});
},{cracks:C.c});

// ---------- Props scattered along each run ----------
// A lumpy mass of foliage: a squashed sphere whose rings wander in and out.
function canopy(m,c,rx,ry,rz,seed,n=10){const rings=[];for(let i=0;i<=5;i++){const v=-PI/2+i*PI/5,k=Math.cos(v),y=c[1]+Math.sin(v)*ry;
  rings.push(Array.from({length:n},(_,j)=>{const t=j/n*2*PI,w=1+.14*Math.sin(j*2.7+i*1.9+seed)+.08*Math.sin(j*5.1+seed*2);return[c[0]+Math.cos(t)*rx*Math.max(.05,k)*w,y,c[2]+Math.sin(t)*rz*Math.max(.05,k)*w]}))}
  m.loft(rings,false,false)}
// OAK: a flared, tapering trunk that splits into limbs, carrying a crown of overlapping masses.
const oak=staticMesh(m=>{
  m.mark('trunk',()=>{tube(m,[[0,0,0],[0,.5,0],[.05,1.4,0],[.1,2.2,.05]],[.55,.36,.3,.26],[.55,.36,.3,.26],8,[false,false]);
    for(const[x,y,z]of[[1.4,3.3,.3],[-1.3,3.2,-.4],[.2,3.6,-1.1],[-.2,3.5,1.0]])tube(m,[[.1,2.1,.05],[x*.55,(2.1+y)/2,z*.55],[x,y,z]],[.2,.14,.08],[.2,.14,.08],6,[false,true])});
  canopy(m,[0,4.3,0],2.3,1.5,2.2,1);canopy(m,[1.5,3.8,.4],1.5,1.1,1.4,2);canopy(m,[-1.4,3.7,-.5],1.5,1.1,1.5,3);canopy(m,[.2,5.2,-.2],1.4,1.0,1.4,4);
},{trunk:C.o});
// PALM: a curving trunk scored with rings, and arching fronds each with a row of leaflets.
const palm=staticMesh(m=>{
  const tr=[[0,0,0],[.15,1.2,0],[.45,2.4,0],[.85,3.5,0],[1.25,4.5,0],[1.5,5.1,0]];
  m.mark('trunk',()=>{tube(m,tr,[.26,.22,.2,.18,.17,.16],[.26,.22,.2,.18,.17,.16],7,[false,false]);for(let i=1;i<5;i++){const q=tr[i];line(m,m.ringXZ(q[0],q[1]+.25,q[2],.21,.21,7),true)}});
  const top=tr[5];
  for(let k=0;k<9;k++){const a=k/9*2*PI+.3,dx=Math.cos(a),dz=Math.sin(a),L=2.6+(k%3)*.35,droop=1.4+(k%2)*.5;
    const pts=[0,.3,.6,.85,1].map(t=>[top[0]+dx*L*t,top[1]+.35+Math.sin(t*PI*.8)*.8-t*t*droop,top[2]+dz*L*t]);line(m,pts);
    pts.slice(1).forEach((q,i)=>{const s=.55-i*.1,ox=-dz*s,oz=dx*s;line(m,[[q[0]+ox,q[1]-.25,q[2]+oz],q,[q[0]-ox,q[1]-.25,q[2]-oz]])})}
  m.box([top[0],top[1]+.2,top[2]],[.4,.35,.4]);
},{trunk:C.o});
// ACACIA: a trunk forking low into spreading limbs under a wide flat crown.
const acacia=staticMesh(m=>{
  m.mark('trunk',()=>{tube(m,[[0,0,0],[.1,1.0,0],[.15,1.8,0]],[.26,.2,.18],[.26,.2,.18],7,[false,false]);
    for(const[x,z]of[[2.0,.6],[-1.8,-.5],[.4,-1.9],[-.3,1.8]])tube(m,[[.15,1.8,0],[x*.5,2.8,z*.5],[x,3.7,z]],[.14,.1,.06],[.14,.1,.06],6,[false,true])});
  const crown=[];for(let i=0;i<4;i++){const y=[3.6,4.0,4.25,4.35][i],k=[.92,1,.85,.45][i];crown.push(Array.from({length:14},(_,j)=>{const t=j/14*2*PI,w=1+.12*Math.sin(j*2.3)+.07*Math.sin(j*4.7);return[Math.cos(t)*3.8*k*w,y,Math.sin(t)*3.1*k*w]}))}
  m.loft(crown,true,true);
},{trunk:C.o});
// SAGUARO: a ribbed column with arms that bend out and turn up.
const saguaro=staticMesh(m=>{
  tube(m,[[0,0,0],[0,2,0],[0,4,0],[0,5.6,0],[0,6.1,0]],[.44,.44,.42,.38,.16],[.44,.44,.42,.38,.16],10,[false,true]);
  for(const[sx,y,h]of[[-1,2.0,2.4],[1,2.9,1.8],[1,1.5,1.2]]){tube(m,[[0,y,0],[sx*.7,y+.05,0],[sx*1.0,y+.45,0],[sx*1.05,y+h,0],[sx*1.05,y+h+.3,0]],[.28,.27,.26,.24,.1],[.28,.27,.26,.24,.1],8,[false,true])}
  for(let i=0;i<10;i++){const a=i/10*2*PI;line(m,[[Math.cos(a)*.45,.1,Math.sin(a)*.45],[Math.cos(a)*.43,4,Math.sin(a)*.43],[Math.cos(a)*.38,5.6,Math.sin(a)*.38]])}
},null);
const spinifex=staticMesh(m=>{for(let i=0;i<11;i++){const a=i/11*2*PI;line(m,[[0,0,0],[Math.cos(a)*.9,1.1+Math.sin(i*2.1)*.25,Math.sin(a)*.9]]);line(m,[[Math.cos(a)*.3,0,Math.sin(a)*.3],[Math.cos(a+.3)*1.2,.7,Math.sin(a+.3)*1.2]])}
  m.box([0,.05,0],[.3,.1,.3])},null);
const iceBlock=staticMesh(m=>{m.loft([[[-1.5,0,-1],[1.2,0,-1.3],[1.6,0,.9],[-1,0,1.2]],[[-1.2,1.4,-.8],[1,1.8,-1],[1.3,1.2,.7],[-.8,1.6,1]]],false,true)},null);

globalThis.TeaserModels={quadLegs,kindColours,kangaroo,hopH,penguin,stonehenge,uluru,giza,taj,kilimanjaro,machuPicchu,monumentValley,iceberg,oak,palm,acacia,saguaro,spinifex,iceBlock};
})();
