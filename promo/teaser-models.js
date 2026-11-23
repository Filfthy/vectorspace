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

// HORSE: a barrel body, an arched neck with a mane, a long head, a flowing tail.
{const Y=2.05;
  animal('horse',{Y,s:1.25,col:C.o,top:4.2,legs:quadLegs(Y,-.9,.9,.4,.17),reach:1.95,
    body(m){
      m.loft([ring8(.42,Y-.4,Y+.32,-1.25),ring8(.5,Y-.44,Y+.36,-.5),ring8(.46,Y-.36,Y+.34,.4),ring8(.46,Y-.3,Y+.36,1.12)]);
      m.beam([0,Y+.05,-1.05],[0,Y+1.2,-1.62],.34,.5,.75);
      m.loft([[[-.2,Y+1.05,-1.55],[.2,Y+1.05,-1.55],[.21,Y+1.42,-1.62],[-.21,Y+1.42,-1.62]],
              [[-.14,Y+.62,-2.28],[.14,Y+.62,-2.28],[.15,Y+.86,-2.36],[-.15,Y+.86,-2.36]]]);
      for(const sx of[-1,1])m.beam([sx*.12,Y+1.4,-1.58],[sx*.16,Y+1.68,-1.5],.07,.1,.3);
      m.mark('mane',()=>{const pts=[];for(let i=0;i<=8;i++){const u=i/8;pts.push([0,Y+.4+u*1.05+(i%2?.18:0),-1.05-u*.55+(i%2?.06:0)])}line(m,pts)});
      m.mark('tail',()=>{m.beam([0,Y+.22,1.1],[0,Y-.2,1.5],.14,.12,.8);m.beam([0,Y-.2,1.5],[0,Y-.9,1.62],.12,.2,.4)});
    },colours:{mane:C.y,tail:C.y}});
}
// ZEBRA: the horse's frame, white, banded with stripes all the way round, a short upright mane.
{const Y=1.95;
  animal('zebra',{Y,s:1.2,col:C.w,top:4,legs:quadLegs(Y,-.88,.88,.4,.16),reach:1.9,
    body(m){
      m.loft([ring8(.42,Y-.4,Y+.3,-1.2),ring8(.5,Y-.42,Y+.34,-.45),ring8(.46,Y-.34,Y+.32,.4),ring8(.46,Y-.3,Y+.34,1.08)]);
      m.beam([0,Y+.05,-1.0],[0,Y+1.1,-1.55],.32,.46,.75);
      m.loft([[[-.19,Y+.98,-1.5],[.19,Y+.98,-1.5],[.2,Y+1.32,-1.56],[-.2,Y+1.32,-1.56]],[[-.13,Y+.58,-2.2],[.13,Y+.58,-2.2],[.14,Y+.8,-2.28],[-.14,Y+.8,-2.28]]]);
      for(const sx of[-1,1])m.beam([sx*.12,Y+1.3,-1.52],[sx*.18,Y+1.62,-1.42],.08,.12,.3);
      m.mark('stripes',()=>{for(let i=0;i<10;i++){const z=-1.05+i*.23,w=i<2?.44:.49;line(m,[[-w,Y-.36,z+.06],[-w,Y+.3,z],[w,Y+.3,z],[w,Y-.36,z+.06]],true)}
        for(let i=1;i<5;i++){const u=i/5;line(m,[[-.2,Y+.05+u*1.0,-1.0-u*.5],[0,Y+.25+u*1.0,-1.0-u*.5],[.2,Y+.05+u*1.0,-1.0-u*.5]])}});
      m.mark('mane',()=>{for(let i=0;i<=6;i++){const u=i/6;line(m,[[0,Y+.3+u*1.0,-1.0-u*.52],[0,Y+.5+u*1.0,-1.0-u*.52]])}});
      m.beam([0,Y+.2,1.08],[0,Y-.5,1.4],.1,.1,.6);
    },colours:{stripes:C.w,mane:C.y}});
}
// CAMEL: long thin legs, one hump, an S-shaped neck, a tasselled saddle blanket.
{const Y=2.45;
  animal('camel',{Y,s:1.2,col:C.o,top:5,legs:quadLegs(Y,-.85,.85,.36,.15),reach:1.6,minCycle:.5,swayAmp:.07,
    gaits:[{v:0,offsets:[0,0,.5,.5],swing:.28,lift:.3,bobAmp:.05,bobK:2,pitchAmp:0},{v:5,offsets:[0,0,.5,.5],swing:.42,lift:.38,bobAmp:.07,bobK:2,pitchAmp:.02}],
    body(m){
      m.loft([ring8(.38,Y-.3,Y+.32,-1.15),ring8(.46,Y-.4,Y+.42,-.3),ring8(.42,Y-.34,Y+.36,.6),ring8(.34,Y-.22,Y+.3,1.1)]);
      m.loft([m.ringXZ(0,Y+.36,-.1,.5,.62,8),m.ringXZ(0,Y+.8,-.1,.34,.44,8),m.ringXZ(0,Y+1.05,-.1,.1,.14,8)]);   // the hump
      m.beam([0,Y-.05,-1.05],[0,Y-.35,-1.75],.3,.34,.8);m.beam([0,Y-.35,-1.75],[0,Y+.85,-2.25],.26,.3,.75);
      m.loft([[[-.17,Y+.75,-2.15],[.17,Y+.75,-2.15],[.18,Y+1.05,-2.2],[-.18,Y+1.05,-2.2]],[[-.11,Y+.62,-2.85],[.11,Y+.62,-2.85],[.12,Y+.82,-2.85],[-.12,Y+.82,-2.85]]]);
      for(const sx of[-1,1])m.beam([sx*.12,Y+1.02,-2.18],[sx*.22,Y+1.14,-2.1],.06,.08,.3);
      m.mark('blanket',()=>{m.loft([[[-.56,Y-.05,-.75],[.56,Y-.05,-.75],[.52,Y+.48,-.75],[-.52,Y+.48,-.75]],[[-.56,Y-.05,.45],[.56,Y-.05,.45],[.52,Y+.48,.45],[-.52,Y+.48,.45]]],false,false);
        for(const sx of[-1,1])for(let i=0;i<6;i++){const z=-.68+i*.22;line(m,[[sx*.56,Y-.05,z],[sx*.57,Y-.32,z]])}});
      m.beam([0,Y+.1,1.1],[0,Y-.6,1.3],.08,.08,.6);
    },colours:{blanket:C.m}});
}
// ELEPHANT (India's festival elephants): columnar legs, a big body under a painted blanket,
// fan ears, a curling trunk, tusks and a jewelled headpiece.
{const Y=2.55,legs=[];
  for(const sx of[-1,1])for(const z of[-1.05,1.0])legs.push(gaLegDesign([sx*.72,Y-.25,z],[sx*.76,Y*.52,z+(z<0?-.1:.1)],[sx*.76,.38,z],[sx*.8,0,z],.42));
  animal('elephant',{Y,s:1.25,col:C.w,top:5.4,legs,reach:1.35,minCycle:.95,radius:2,swayAmp:.04,
    gaits:[{v:0,offsets:[.25,0,.75,.5],swing:.22,lift:.2,bobAmp:.04,bobK:2,pitchAmp:0},{v:3,offsets:[.25,0,.75,.5],swing:.3,lift:.25,bobAmp:.07,bobK:2,pitchAmp:.012}],
    body(m){
      m.loft([ring8(.78,Y-.65,Y+.78,-1.45),ring8(.95,Y-.75,Y+1.0,-.55),ring8(.92,Y-.7,Y+.95,.55),ring8(.8,Y-.55,Y+.72,1.35)]);
      m.loft([ring8(.62,Y+.05,Y+1.2,-1.55),ring8(.52,Y-.1,Y+1.0,-2.3)]);   // head
      m.mark('ears',()=>{for(const sx of[-1,1])m.loft([[[sx*.6,Y-.15,-1.6],[sx*.6,Y+1.15,-1.6],[sx*.6,Y+1.15,-1.75],[sx*.6,Y-.15,-1.75]],[[sx*1.35,Y-.4,-1.25],[sx*1.45,Y+1.25,-1.3],[sx*1.4,Y+1.25,-1.4],[sx*1.3,Y-.4,-1.35]]])});
      m.mark('trunk',()=>{const pts=[[0,Y+.35,-2.35],[0,Y-.35,-2.6],[0,Y-1.1,-2.68],[0,Y-1.75,-2.6],[0,Y-2.05,-2.35]];for(let i=0;i<pts.length-1;i++)m.beam(pts[i],pts[i+1],.34-i*.05,.34-i*.05,.85)});
      m.mark('tusks',()=>{for(const sx of[-1,1]){m.beam([sx*.3,Y+.05,-2.3],[sx*.34,Y-.45,-2.85],.11,.11,.7);m.beam([sx*.34,Y-.45,-2.85],[sx*.3,Y-.3,-3.25],.08,.08,.4)}});
      m.mark('headpiece',()=>{m.loft([[[-.42,Y+.35,-2.32],[.42,Y+.35,-2.32],[.5,Y+1.05,-2.2],[-.5,Y+1.05,-2.2]],[[-.4,Y+.35,-2.36],[.4,Y+.35,-2.36],[.48,Y+1.05,-2.24],[-.48,Y+1.05,-2.24]]]);m.box([0,Y+.7,-2.4],[.16,.16,.08])});
      m.mark('blanket',()=>{for(const sx of[-1,1]){m.loft([[[sx*.97,Y+.95,-.85],[sx*.97,Y+.95,.85],[sx*1.0,Y-.2,.8],[sx*1.0,Y-.2,-.8]],[[sx*.99,Y+.95,-.85],[sx*.99,Y+.95,.85],[sx*1.02,Y-.2,.8],[sx*1.02,Y-.2,-.8]]]);
        for(let i=0;i<8;i++){const z=-.75+i*.215;line(m,[[sx*1.02,Y-.2,z],[sx*1.03,Y-.42,z]])}}
        m.box([0,Y+1.08,0],[1.5,.12,1.75])});
      m.beam([0,Y+.4,1.38],[0,Y-.75,1.6],.08,.08,.5);
    },colours:{tusks:C.w,trunk:null,blanket:C.m,headpiece:C.y,ears:null}});
}
// GIRAFFE: long legs, a back sloping to the hips, a very long neck, ossicones and patches.
{const Y=3.0,legs=quadLegs(Y,-.8,.85,.34,.15,{backY:Y-.45,kneeZ:.42});
  animal('giraffe',{Y,s:1.2,col:C.y,top:7.2,legs,reach:2.2,minCycle:.55,
    body(m){
      m.loft([ring8(.42,Y-.45,Y+.36,-1.1),ring8(.46,Y-.52,Y+.3,-.3),ring8(.4,Y-.6,Y+.08,.5),ring8(.36,Y-.62,Y-.05,1.05)]);
      m.beam([0,Y+.15,-1.0],[0,Y+3.3,-1.85],.3,.44,.55);
      m.loft([[[-.15,Y+3.15,-1.75],[.15,Y+3.15,-1.75],[.16,Y+3.45,-1.82],[-.16,Y+3.45,-1.82]],[[-.1,Y+3.0,-2.4],[.1,Y+3.0,-2.4],[.11,Y+3.18,-2.42],[-.11,Y+3.18,-2.42]]]);
      m.mark('ossicones',()=>{for(const sx of[-1,1]){m.beam([sx*.08,Y+3.42,-1.8],[sx*.1,Y+3.78,-1.76],.06,.06);m.box([sx*.1,Y+3.8,-1.76],[.1,.1,.1])}});
      for(const sx of[-1,1])m.beam([sx*.13,Y+3.36,-1.72],[sx*.32,Y+3.45,-1.62],.05,.09,.3);
      m.mark('spots',()=>{for(const sx of[-1,1])for(let i=0;i<5;i++)for(let j=0;j<2;j++){const z=-.95+i*.45+(j?.2:0),y=Y-.32+j*.36-i*.06,x=sx*(i>2?.4:.46),d=.12;line(m,[[x,y-d,z-d],[x,y+d,z-d*.6],[x,y+d*.8,z+d],[x,y-d*.7,z+d*.8]],true)}
        for(let i=1;i<6;i++){const u=i/6,z=-1.0-u*.85,y=Y+.15+u*3.1;for(const sx of[-1,1])line(m,[[sx*.22*(1-u*.4),y-.13,z],[sx*.22*(1-u*.4),y+.13,z-.05]])}});
      m.mark('mane',()=>{const pts=[];for(let i=0;i<=10;i++){const u=i/10;pts.push([0,Y+.5+u*2.85+(i%2?.12:0),-1.0-u*.8])}line(m,pts)});
      m.beam([0,Y-.15,1.05],[0,Y-1.1,1.25],.06,.06,.6);
    },colours:{spots:C.o,ossicones:C.o,mane:C.o}});
}
// LLAMA: a fluffy body, an upright neck, banana ears, a woven blanket with tassels.
{const Y=1.55;
  animal('llama',{Y,s:1.15,col:C.w,top:3.4,legs:quadLegs(Y,-.62,.62,.3,.14),reach:1.25,minCycle:.4,
    body(m){
      m.loft([ring8(.36,Y-.28,Y+.34,-.85),ring8(.42,Y-.34,Y+.4,-.2),ring8(.4,Y-.3,Y+.38,.45),ring8(.32,Y-.18,Y+.36,.85)]);
      m.beam([0,Y+.15,-.75],[0,Y+1.55,-.98],.28,.34,.8);
      m.loft([[[-.15,Y+1.42,-.88],[.15,Y+1.42,-.88],[.16,Y+1.7,-.92],[-.16,Y+1.7,-.92]],[[-.1,Y+1.4,-1.38],[.1,Y+1.4,-1.38],[.11,Y+1.56,-1.38],[-.11,Y+1.56,-1.38]]]);
      for(const sx of[-1,1]){m.beam([sx*.1,Y+1.68,-.9],[sx*.16,Y+1.98,-.86],.06,.09,.4);m.beam([sx*.16,Y+1.98,-.86],[sx*.1,Y+2.12,-.94],.05,.06,.4)}
      m.mark('blanket',()=>{m.loft([sec(.44,Y-.05,Y+.42,-.45,.85),sec(.44,Y-.05,Y+.42,.35,.85)],false,false);
        for(const z of[-.3,-.05,.2])line(m,[[-.44,Y+.05,z],[-.38,Y+.42,z],[.38,Y+.42,z],[.44,Y+.05,z]]);
        for(const sx of[-1,1])for(let i=0;i<5;i++)line(m,[[sx*.44,Y-.05,-.4+i*.18],[sx*.45,Y-.25,-.4+i*.18]])});
      m.mark('tassels',()=>{for(const sx of[-1,1])m.box([sx*.13,Y+2.02,-.9],[.08,.12,.08])});
      m.beam([0,Y+.28,.85],[0,Y+.45,1.05],.1,.1,.6);
    },colours:{blanket:C.m,tassels:C.y}});
}
// BISON: a massive humped front, a low bearded head with short horns, a lean rear.
{const Y=1.75;
  animal('bison',{Y,s:1.3,col:C.o,top:3.8,legs:quadLegs(Y,-.85,.8,.46,.22,{kneeH:.7}),reach:1.65,radius:1.6,
    body(m){
      m.loft([ring8(.62,Y-.55,Y+.95,-1.2),ring8(.68,Y-.55,Y+1.05,-.45),ring8(.52,Y-.38,Y+.42,.45),ring8(.46,Y-.3,Y+.34,1.0)]);
      m.loft([ring8(.42,Y-.35,Y+.55,-1.25),ring8(.32,Y-.55,Y+.1,-2.05)]);   // the low head
      m.mark('beard',()=>{for(let i=0;i<5;i++){const x=-.24+i*.12;line(m,[[x,Y-.4,-1.6],[x*1.1,Y-.95,-1.55]])}line(m,[[-.3,Y-.5,-1.1],[0,Y-1.05,-1.2],[.3,Y-.5,-1.1]])});
      m.mark('horns',()=>{for(const sx of[-1,1]){m.beam([sx*.32,Y+.35,-1.5],[sx*.58,Y+.45,-1.55],.09,.09,.7);m.beam([sx*.58,Y+.45,-1.55],[sx*.6,Y+.75,-1.62],.07,.07,.4)}});
      m.mark('fur',()=>{for(let i=0;i<6;i++){const z=-1.15+i*.14;line(m,[[-.66,Y+.3,z],[-.3,Y+.98+(i%2)*.08,z],[.3,Y+.98+(i%2)*.08,z],[.66,Y+.3,z]])}});
      m.beam([0,Y+.25,1.0],[0,Y-.4,1.25],.07,.07,.6);m.box([0,Y-.48,1.27],[.12,.18,.1]);
    },colours:{horns:C.w,beard:C.y,fur:C.y}});
}
// Posed four-legged mesh colours for the scenes' drawUnit hook.
const kindColours=(kind,m)=>({...feetWhite(m),...(GA_KINDS[kind]?.colours||{})});

// ---------- Kangaroo: hops on its own posed rig ----------
// pose {u}: hop cycle 0..1. 0-0.18 crouched on the ground, then airborne with the legs
// swept back and the tail level, landing at 1. The scene lifts it off the ground by hopH(u).
function buildKangaroo(m,pose){
  const u=pose.u||0,air=u>.18,a=air?Math.sin(PI*(u-.18)/.82):0,crouch=air?0:1-Math.sin(PI*u/.18)*.6;
  const hipY=1.05+.25*(1-crouch),tilt=.55+.25*a;   // body leans forward in flight
  const T=(p)=>p;
  // Body: an egg from hips (z .2) up and forward to the chest.
  const ch=[0,hipY+1.2*Math.cos(tilt*.6),-.75*Math.sin(tilt)-.1];
  m.loft([ring8(.42,hipY-.42,hipY+.38,.25),ring8(.38,(hipY+ch[1])/2-.3,(hipY+ch[1])/2+.32,(.25+ch[2])/2),ring8(.26,ch[1]-.25,ch[1]+.25,ch[2])]);
  // Head and long ears.
  const hd=[0,ch[1]+.55,ch[2]-.25];
  m.loft([[[-.16,hd[1]-.16,hd[2]+.12],[.16,hd[1]-.16,hd[2]+.12],[.17,hd[1]+.16,hd[2]+.1],[-.17,hd[1]+.16,hd[2]+.1]],[[-.08,hd[1]-.12,hd[2]-.42],[.08,hd[1]-.12,hd[2]-.42],[.09,hd[1]+.02,hd[2]-.44],[-.09,hd[1]+.02,hd[2]-.44]]]);
  m.beam([0,ch[1]-.05,ch[2]+.05],[0,hd[1]-.05,hd[2]+.05],.2,.22,.8);
  m.mark('ears',()=>{for(const sx of[-1,1])m.beam([sx*.1,hd[1]+.12,hd[2]+.1],[sx*.18,hd[1]+.62,hd[2]+.28],.07,.14,.25)});
  // Short arms held in.
  for(const sx of[-1,1]){m.beam([sx*.24,ch[1]-.15,ch[2]],[sx*.26,ch[1]-.55,ch[2]-.28],.08,.08,.8);m.beam([sx*.26,ch[1]-.55,ch[2]-.28],[sx*.2,ch[1]-.62,ch[2]-.46],.06,.06,.7)}
  // Big hind legs: thigh forward and down, shin back, long foot; swept back in flight.
  const sw=air?.9*a:0;
  for(const sx of[-1,1]){
    const hip=[sx*.3,hipY,.1],knee=[sx*.36,hipY-.55*crouch-.15,-.35+sw*.5],ankle=[sx*.36,.18+(air?.25*a:0),.55+sw*.35],toe=[sx*.36,air?.1+.2*a:0,-.35+sw*1.05];
    m.beam(hip,knee,.26,.24,.8);m.beam(knee,ankle,.15,.14,.8);m.mark('foot'+sx,()=>m.beam(ankle,toe,.12,.08,.6))}
  // Thick tail, curving down to the ground when crouched, level in flight.
  m.mark('tail',()=>{const t1=[0,hipY-.25,.75],t2=[0,air?hipY-.2:.45,1.35],t3=[0,air?hipY-.15:.1,2.0];m.beam([0,hipY-.15,.4],t1,.24,.2,.8);m.beam(t1,t2,.2,.14,.7);m.beam(t2,t3,.14,.06,.4)});
}
const kangaroo=P.posedMesh(buildKangaroo,{ears:C.y,tail:C.y,'foot-1':C.w,foot1:C.w});
const hopH=u=>u>.18?Math.sin(PI*(u-.18)/.82)*1.25:0;

// ---------- Penguin: waddles, and sometimes slides on its belly ----------
// pose {w}: waddle phase (radians); {slide}: 0..1 tips it onto its belly.
function buildPenguin(m,pose){
  const w=pose.w||0,stepL=Math.max(0,Math.sin(w))*.14,stepR=Math.max(0,-Math.sin(w))*.14;
  const rings=[[.0,.2],[.25,.38],[.55,.44],[.85,.4],[1.1,.32],[1.32,.22]];
  // The body in two halves: a white front (the belly faces -z) and a dark back.
  const half=(y,r,front)=>Array.from({length:7},(_,i)=>{const a=(front?PI:0)+i/6*PI;return[Math.cos(a)*r,y+.12,.03+Math.sin(a)*r*.86]});
  m.mark('belly',()=>m.loft(rings.map(([y,r])=>half(y,r,true)),false,false));
  m.mark('back',()=>m.loft(rings.map(([y,r])=>half(y,r,false)),false,false));
  m.mark('head',()=>m.loft([m.ringXZ(0,1.42,.0,.2,.2,8),m.ringXZ(0,1.62,-.02,.19,.19,8),m.ringXZ(0,1.76,0,.1,.1,8)],false,true));
  m.mark('beak',()=>m.beam([0,1.58,-.16],[0,1.52,-.42],.08,.06,.3));
  m.mark('cheeks',()=>{for(const sx of[-1,1])line(m,[[sx*.18,1.62,-.04],[sx*.2,1.48,-.08],[sx*.14,1.38,-.14]])});
  m.mark('flippers',()=>{for(const sx of[-1,1]){const out=.35+.25*Math.abs(Math.sin(w*2));m.beam([sx*.36,1.1,.0],[sx*(.42+out*.25),.55,.05],.08,.14,.5)}});
  m.mark('feet',()=>{for(const[sx,st]of[[-1,stepL],[1,stepR]])m.loft([[[sx*.08,st,-.1],[sx*.3,st,-.1],[sx*.32,st,-.36],[sx*.06,st,-.34]],[[sx*.1,st+.07,-.08],[sx*.28,st+.07,-.08],[sx*.28,st+.07,-.28],[sx*.1,st+.07,-.28]]])});
}
const penguin=P.posedMesh(buildPenguin,{back:C.u,head:C.u,flippers:C.u,belly:C.w,beak:C.y,cheeks:C.y,feet:C.o});

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
    for(let j=0;j<12;j++){const t=j/12*2*PI,c=Math.cos(t),s=Math.sin(t),y=Math.max(0,s)*Hh*k*(1+.08*Math.sin(i*1.7)),z=c*Wd/2*Math.pow(k,.6);pts.push([x,s<0?0:y,z])}rings.push(pts)}
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
  m.box([0,.9,0],[38,1.8,38]);
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
  const prof=[[0,170],[8,150],[20,118],[32,86],[41,60],[46,44],[48,30],[48.5,10]],rings=prof.map(([y,r],i)=>m.ringXZ(0,y,0,r*1.25,r,18).map(([x,yy,z],j)=>[x,yy+(i>0&&i<prof.length-1?Math.sin(j*2.3+i)*1.2:0),z]));
  m.loft(rings,false,false);
  m.mark('snow',()=>{const r=m.ringXZ(0,48.5,0,12.5,10,18);m.loft([m.ringXZ(0,44.5,0,44*1.25,44,18).map(([x,y,z],j)=>[x,y-(j%3)*1.8,z]),m.ringXZ(0,48,0,30*1.25,30,18)],false,false);line(m,r,true)});
},{snow:C.w});
// Machu Picchu: the steep peak of Huayna Picchu, the ridge of terraces in front of it, the
// stone houses with their gables, and a ragged line of Andes behind.
const machuPicchu=staticMesh(m=>{
  // The ridge the citadel stands on: a long hill with a flattened top, its flank stepped in terraces.
  const ridge=(y,rx,rz,cz)=>m.ringXZ(0,y,cz,rx,rz,14,PI/14);
  m.loft([ridge(0,58,30,-6),ridge(6,48,22,-6),ridge(10.5,38,16,-6),ridge(12,32,12,-6)],false,true);
  m.mark('terraces',()=>{for(let k=1;k<7;k++){const y=k*1.7,rx=58-k*3.8,rz=30-k*2.6,pts=[];for(let i=0;i<=9;i++){const t=PI*1.05+i/9*PI*.9;pts.push([Math.cos(t)*rx,y,-6+Math.sin(t)*rz])}line(m,pts)}});
  // Huayna Picchu: the steep peak behind the citadel.
  m.mark('peak',()=>m.loft([m.ringXZ(4,0,32,30,22,10),m.ringXZ(2,24,36,14,10,10),m.ringXZ(0,40,38,6,4.5,10),m.ringXZ(0,47,38,1.2,1.2,10)],false,true));
  // The Andes, far behind: a row of solid peaks.
  m.mark('andes',()=>{for(let i=0;i<7;i++){const x=-180+i*60,z=150+(i%2)*30,h=55+((i*37)%5)*12,r=48+(i%3)*10;m.loft([m.ringXZ(x,0,z,r,r*.8,9),m.ringXZ(x+3,h*.6,z,r*.45,r*.38,9),m.ringXZ(x+5,h,z+2,3,3,9)],false,true)}});
  // The stone houses on top, each with a gable.
  m.mark('houses',()=>{const house=(x,z,yaw)=>{rbox(m,[x,13.1,z],[3.6,2.2,2.6],yaw);const ca=Math.cos(yaw),sa=Math.sin(yaw),e=(dx,dy)=>[x+ca*dx,dy,z-sa*dx];
      for(const s of[-1,1]){const c=e(s*1.8,14.2);line(m,[[c[0]-sa*1.3,14.2,c[2]-ca*1.3],[c[0],15.6,c[2]],[c[0]+sa*1.3,14.2,c[2]+ca*1.3]])}
      line(m,[e(-1.8,15.6),e(1.8,15.6)])};
    for(let i=0;i<10;i++)house(-22+i*4.8,-8+((i*7)%3)*3.2,.12*((i%3)-1))});
},{terraces:C.g,peak:C.g,andes:C.c,houses:C.w});
// Monument Valley: the two Mittens and Merrick Butte, each a sheer butte on a talus slope.
const butte=(m,x,z,w,d,h,base,thumb)=>{
  m.loft([m.ringXZ(x,0,z,w*1.7,d*2.1,12),m.ringXZ(x,base*.55,z,w*1.3,d*1.5,12),m.ringXZ(x,base,z,w*1.04,d*1.08,12)],false,false);
  const r=(y,k)=>[[x-w*k,y,z-d*k],[x+w*k,y,z-d*k],[x+w*k,y,z+d*k],[x-w*k,y,z+d*k]];m.loft([r(base,1),r(base+h,.94)]);
  for(let i=1;i<4;i++)line(m,r(base+h*i/4,1-.06*i/4),true);
  if(thumb){const tx=x+thumb*w*1.32;m.loft([m.ringXZ(tx,base*.8,z,w*.2,d*.42,6),m.ringXZ(tx,base+h*1.05,z,w*.12,d*.26,6),m.ringXZ(tx,base+h*1.12,z,w*.06,d*.1,6)],false,true)}};
const monumentValley=staticMesh(m=>{butte(m,-48,0,13,6,15,11,-1);butte(m,10,12,13,6,16,11,1);butte(m,72,-10,22,9,13,10,0)},null);
// Icebergs and ice cliffs for Antarctica.
const iceberg=staticMesh(m=>{
  m.loft([[[-9,0,-5],[6,0,-7],[11,0,1],[4,0,7],[-8,0,5]],[[-8,6,-4],[5,7,-6],[10,5,1],[3,6.5,6],[-7,7.5,4]],[[-5,9,-2],[2,11,-3],[6,8.5,1],[1,9.5,3],[-4,10.5,2]]].map(r=>r),false,true);
  m.mark('cracks',()=>{line(m,[[-8,6.4,-4.2],[-6,2.5,-4.8],[-7,0,-5]]);line(m,[[5,7,-6],[4.6,3,-6.6]]);line(m,[[10,5,1],[10.5,2,.9]])});
},{cracks:C.c});

// ---------- Props scattered along each run ----------
const oak=staticMesh(m=>{m.mark('trunk',()=>{m.beam([0,0,0],[0,2.2,0],.35,.25,.8);m.beam([0,1.8,0],[.8,2.8,.2],.15,.12,.6);m.beam([0,1.9,0],[-.7,2.7,-.2],.15,.12,.6)});
  m.loft([m.ringXZ(0,2.2,0,1.6,1.6,9),m.ringXZ(0,3.2,0,2.4,2.3,9),m.ringXZ(.2,4.3,0,2.1,2.0,9),m.ringXZ(0,5.1,0,1.0,1.0,9)])},{trunk:C.o});
const palm=staticMesh(m=>{m.mark('trunk',()=>{const pts=[[0,0,0],[.2,1.6,0],[.55,3.2,0],[1.0,4.6,0]];for(let i=0;i<3;i++)m.beam(pts[i],pts[i+1],.22-i*.03,.2-i*.03,.9)});
  for(let k=0;k<7;k++){const a=k/7*2*PI,tip=[1+Math.cos(a)*2.4,3.6+Math.sin(k*1.3)*.4,Math.sin(a)*2.4];line(m,[[1,4.6,0],[1+Math.cos(a)*1.3,4.95,Math.sin(a)*1.3],tip]);line(m,[[1+Math.cos(a)*.6,4.85,Math.sin(a)*.6],[1+Math.cos(a+.25)*1.6,4.5,Math.sin(a+.25)*1.6]])}},{trunk:C.o});
const acacia=staticMesh(m=>{m.mark('trunk',()=>{m.beam([0,0,0],[.2,2.2,0],.22,.18,.8);m.beam([.2,2.2,0],[1.6,3.6,.3],.14,.1,.7);m.beam([.2,2.2,0],[-1.3,3.5,-.4],.14,.1,.7)});
  m.loft([m.ringXZ(.1,3.4,0,3.6,2.8,11),m.ringXZ(.1,4.1,0,3.4,2.6,11),m.ringXZ(.1,4.4,0,2.2,1.6,11)])},{trunk:C.o});
const saguaro=staticMesh(m=>{m.loft([m.ringXZ(0,0,0,.42,.42,8),m.ringXZ(0,5.8,0,.36,.36,8),m.ringXZ(0,6.3,0,.12,.12,8)],false,true);
  for(const[sx,y,h]of[[-1,2.2,2.2],[1,3.0,1.8]]){m.beam([0,y,0],[sx*1.1,y,0],.28,.28,1);m.loft([m.ringXZ(sx*1.1,y-.2,0,.28,.28,8),m.ringXZ(sx*1.1,y+h,0,.24,.24,8),m.ringXZ(sx*1.1,y+h+.3,0,.1,.1,8)],false,true)}
  for(let i=0;i<8;i++){const a=i/8*2*PI;line(m,[[Math.cos(a)*.4,.2,Math.sin(a)*.4],[Math.cos(a)*.34,5.8,Math.sin(a)*.34]])}},null);
const spinifex=staticMesh(m=>{for(let i=0;i<11;i++){const a=i/11*2*PI;line(m,[[0,0,0],[Math.cos(a)*.9,1.1+Math.sin(i*2.1)*.25,Math.sin(a)*.9]]);line(m,[[Math.cos(a)*.3,0,Math.sin(a)*.3],[Math.cos(a+.3)*1.2,.7,Math.sin(a+.3)*1.2]])}
  m.box([0,.05,0],[.3,.1,.3])},null);
const iceBlock=staticMesh(m=>{m.loft([[[-1.5,0,-1],[1.2,0,-1.3],[1.6,0,.9],[-1,0,1.2]],[[-1.2,1.4,-.8],[1,1.8,-1],[1.3,1.2,.7],[-.8,1.6,1]]],false,true)},null);

globalThis.TeaserModels={quadLegs,kindColours,kangaroo,hopH,penguin,stonehenge,uluru,giza,taj,kilimanjaro,machuPicchu,monumentValley,iceberg,oak,palm,acacia,saguaro,spinifex,iceBlock};
})();
