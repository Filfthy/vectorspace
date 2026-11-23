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
// HORSE: withers, a dipped back and a round croup; an arched neck carrying the mane; a head
// angled down to a tapering muzzle; a flowing tail; legs with the knee in front and the hock
// behind. Model faces -z; the hips sit at Y.
{const Y=1.85,legs=[];
  for(const sx of[-1,1]){
    legs.push(gaLegDesign([sx*.34,Y,-.95],[sx*.38,.8,-1.05],[sx*.38,.28,-.95],[sx*.4,0,-.9],.19));
    legs.push(gaLegDesign([sx*.36,Y+.1,.85],[sx*.4,.95,1.2],[sx*.4,.3,.98],[sx*.42,0,.95],.2))}
  hooves(legs,{hoof:1,kneeK:.7});
  animal('horse',{Y,s:1.2,col:C.o,top:3.6,legs,reach:1.75,minCycle:.3,
    body(m){
      trunk(m,[[-1.42,.2,1.95,2.3],[-1.25,.38,1.62,2.55],[-.9,.46,1.5,2.72],[-.4,.5,1.46,2.6],[.15,.5,1.5,2.5],[.7,.5,1.6,2.62],[1.15,.42,1.78,2.6],[1.38,.24,2.0,2.45]]);
      // The neck rises from the withers and chest, arching to the poll.
      const neck=[[0,2.3,-1.12],[0,2.62,-1.42],[0,2.98,-1.66],[0,3.3,-1.82],[0,3.52,-1.9]];
      tube(m,neck,[.3,.27,.23,.2,.19],[.42,.38,.33,.27,.24],8,[false,false]);
      // The head: broad at the forehead, angled down to the muzzle.
      tube(m,[[0,3.6,-1.88],[0,3.42,-2.12],[0,3.14,-2.42],[0,2.92,-2.62]],[.2,.18,.15,.13],[.22,.2,.17,.15],8,[true,true]);
      m.box([0,2.88,-2.66],[.24,.2,.12]);   // the nose
      for(const sx of[-1,1]){m.beam([sx*.11,3.66,-1.84],[sx*.15,3.98,-1.74],.06,.11,.3);m.box([sx*.15,3.42,-2.12],[.06,.08,.08])}
      m.mark('mane',()=>{const pts=[];for(let i=0;i<=12;i++){const u=i/12,j=Math.min(neck.length-1,u*(neck.length-1)),k=Math.floor(j),f=j-k,p=neck[k],q=neck[Math.min(k+1,neck.length-1)],x=p[1]+(q[1]-p[1])*f,z=p[2]+(q[2]-p[2])*f;
        pts.push([i%2?.06:-.06,x+.36-u*.1+(i%2?.1:0),z+.2-u*.05])}line(m,pts);line(m,[[0,3.68,-1.92],[0,3.5,-2.1],[.05,3.42,-2.08]])});
      m.mark('tail',()=>tube(m,[[0,2.5,1.35],[0,2.6,1.6],[0,2.35,1.85],[0,1.8,2.0],[0,1.25,2.02]],[.1,.14,.16,.17,.08],[.12,.16,.18,.18,.08],6,[false,true]));
      // The mech: a plate along the spine and a sensor band across the brow.
      m.box([0,2.66,-.25],[.36,.1,1.4]);m.mark('visor',()=>m.box([0,3.52,-2.02],[.42,.07,.08]));
    },colours:{mane:C.y,tail:C.y,visor:C.c}});
}
// Legs in the hound's order (LF, LH, RF, RH): front and hind each [hip, knee, ankle, foot],
// written for the left side (x < 0) and mirrored.
function legs4(front,hind,t,o={}){
  const mir=(p,sx)=>[Math.abs(p[0])*sx,p[1],p[2]],L=[];
  for(const sx of[-1,1])for(const d of[front,hind])L.push(gaLegDesign(...d.map(p=>mir(p,sx)),t));
  return hooves(L,{hoof:o.hoof??1,kneeK:o.kneeK??.7})
}
// Stripes: closed bands round a trunk section, two lines each so they read as bands.
const bands=(m,st,every=1)=>{st.forEach(([z,w,y0,y1],i)=>{if(i%every)return;for(const dz of[-.05,.05])line(m,ring8(w*1.03,y0-.01,y1+.01,z+dz),true)})};

// ZEBRA: stockier than the horse, a short bristly mane, stripes banding it right round and a
// tufted tail.
{const Y=1.72,st=[[-1.32,.2,1.82,2.15],[-1.15,.36,1.52,2.38],[-.82,.45,1.42,2.5],[-.35,.5,1.38,2.42],[.15,.5,1.42,2.36],[.65,.5,1.5,2.45],[1.05,.42,1.66,2.44],[1.28,.24,1.86,2.3]];
  const legs=legs4([[-.32,Y,-.88],[-.36,.75,-.98],[-.36,.26,-.88],[-.38,0,-.84]],[[-.34,Y+.1,.8],[-.38,.88,1.12],[-.38,.28,.92],[-.4,0,.9]],.18);
  animal('zebra',{Y,s:1.15,col:C.w,top:3.3,legs,reach:1.6,minCycle:.3,
    body(m){
      trunk(m,st);
      const neck=[[0,2.15,-1.05],[0,2.45,-1.32],[0,2.78,-1.55],[0,3.05,-1.7],[0,3.22,-1.76]];
      tube(m,neck,[.3,.27,.23,.2,.19],[.4,.36,.31,.26,.23],8,[false,false]);
      tube(m,[[0,3.3,-1.74],[0,3.12,-1.98],[0,2.86,-2.26],[0,2.68,-2.44]],[.2,.18,.15,.13],[.22,.2,.17,.15],8,[true,true]);
      m.box([0,2.64,-2.48],[.24,.2,.12]);
      for(const sx of[-1,1])m.beam([sx*.11,3.36,-1.7],[sx*.18,3.72,-1.6],.07,.13,.3);
      m.mark('stripes',()=>{bands(m,st.slice(1,7));
        neck.slice(0,4).forEach((p,i)=>line(m,[[-.28+i*.02,p[1]-.3,p[2]+.08],[0,p[1]+.38,p[2]+.05],[.28-i*.02,p[1]-.3,p[2]+.08]]));
        for(const z of[-.6,.0,.6])line(m,[[-.5,2.0,z],[-.5,1.55,z+.12]]),line(m,[[.5,2.0,z],[.5,1.55,z+.12]])});
      m.mark('mane',()=>{neck.forEach((p,i)=>{if(i<4)line(m,[[0,p[1]+.36,p[2]+.18],[0,p[1]+.62,p[2]+.2]])});line(m,neck.map(p=>[0,p[1]+.62,p[2]+.2]))});
      m.mark('tail',()=>{tube(m,[[0,2.3,1.28],[0,2.1,1.48],[0,1.55,1.58]],[.06,.06,.05],[.06,.06,.05],6,[false,false]);m.box([0,1.4,1.6],[.16,.3,.16])});
    },colours:{stripes:C.w,mane:C.y,tail:C.y}});
}
// CAMEL: long legs on broad pads, one tall hump with a tasselled saddle cloth, a neck that dips
// low and rises to a level head. It paces: both legs on one side move together.
{const Y=2.3;
  const legs=legs4([[-.32,Y,-.9],[-.35,1.05,-1.0],[-.35,.32,-.9],[-.37,0,-.88]],[[-.34,Y+.05,.85],[-.38,1.2,1.15],[-.38,.34,.95],[-.4,0,.92]],.16,{hoof:1.35});
  animal('camel',{Y,s:1.15,col:C.o,top:4.4,legs,reach:1.55,minCycle:.45,swayAmp:.08,
    gaits:[{v:0,offsets:[0,0,.5,.5],swing:.3,lift:.32,bobAmp:.05,bobK:2,pitchAmp:0},{v:4,offsets:[0,0,.5,.5],swing:.45,lift:.4,bobAmp:.08,bobK:2,pitchAmp:.02}],
    body(m){
      trunk(m,[[-1.3,.24,2.05,2.5],[-1.12,.38,1.85,2.72],[-.7,.44,1.95,2.85],[-.2,.46,2.0,2.9],[.35,.44,2.0,2.82],[.85,.38,2.05,2.78],[1.18,.24,2.25,2.7]]);
      m.loft([m.ringXZ(0,2.8,-.15,.46,.7,10),m.ringXZ(0,3.15,-.13,.44,.64,10),m.ringXZ(0,3.38,-.1,.34,.5,10),m.ringXZ(0,3.5,-.08,.18,.28,10),m.ringXZ(0,3.54,-.06,.03,.04,10)],false,true);   // the hump, a rounded dome
      const neck=[[0,2.45,-1.2],[0,2.2,-1.55],[0,2.25,-1.88],[0,2.62,-2.12],[0,3.08,-2.22],[0,3.3,-2.2]];
      tube(m,neck,[.24,.22,.2,.18,.17,.17],[.34,.3,.26,.22,.2,.2],8,[false,false]);
      tube(m,[[0,3.38,-2.14],[0,3.32,-2.4],[0,3.18,-2.72],[0,3.05,-2.9]],[.18,.17,.14,.12],[.2,.18,.15,.13],8,[true,true]);
      for(const sx of[-1,1])m.beam([sx*.1,3.5,-2.12],[sx*.2,3.62,-2.04],.05,.08,.3);
      m.mark('cloth',()=>{const r=m.ringXZ(0,2.82,-.12,.56,.8,12),hang=r.map(p=>[p[0]*1.05,p[1]-.42,p[2]*1.02]);m.loft([r,hang],false,false);
        hang.forEach(p=>line(m,[p,[p[0],p[1]-.2,p[2]]]))});
      m.mark('tassels',()=>{for(const sx of[-1,1])m.box([sx*.25,2.62,-2.2],[.08,.16,.08])});
      tube(m,[[0,2.62,1.15],[0,2.4,1.3],[0,1.85,1.36]],[.06,.05,.05],[.06,.05,.05],6,[false,true]);
    },colours:{cloth:C.m,tassels:C.y}});
}
// ELEPHANT (India's festival elephants): pillar legs, a high domed head, fan ears, a trunk that
// curls at the tip, upturned tusks, a painted blanket and a jewelled headpiece.
{const Y=2.15;
  const legs=legs4([[-.66,Y,-1.05],[-.68,1.05,-1.1],[-.68,.32,-1.05],[-.7,0,-1.05]],[[-.68,Y+.05,1.0],[-.7,1.1,1.08],[-.7,.32,1.0],[-.72,0,1.0]],.36,{hoof:1.5,kneeK:.55});
  animal('elephant',{Y,s:1.2,col:C.w,top:4.4,legs,reach:1.3,minCycle:.9,radius:2,swayAmp:.05,
    gaits:[{v:0,offsets:[.25,0,.75,.5],swing:.24,lift:.18,bobAmp:.05,bobK:2,pitchAmp:0},{v:3,offsets:[.25,0,.75,.5],swing:.32,lift:.24,bobAmp:.08,bobK:2,pitchAmp:.012}],
    body(m){
      trunk(m,[[-1.55,.6,1.75,3.05],[-1.2,.88,1.45,3.35],[-.5,.98,1.35,3.5],[.3,.98,1.38,3.45],[1.0,.9,1.5,3.3],[1.45,.62,1.8,3.0]]);
      tube(m,[[0,2.95,-1.4],[0,3.25,-1.85],[0,3.05,-2.25],[0,2.65,-2.45]],[.62,.66,.58,.42],[.62,.66,.56,.42],10,[false,true]);   // the domed head
      m.mark('trunk',()=>tube(m,[[0,2.55,-2.4],[0,2.0,-2.62],[0,1.35,-2.7],[0,.75,-2.66],[0,.38,-2.48],[0,.3,-2.25],[0,.45,-2.15]],[.3,.26,.22,.18,.15,.12,.1],[.3,.26,.22,.18,.15,.12,.1],8,[false,true]));
      m.mark('ears',()=>{for(const sx of[-1,1]){const e=[[sx*.55,3.4,-1.85],[sx*1.25,3.5,-1.55],[sx*1.5,2.9,-1.4],[sx*1.3,2.15,-1.5],[sx*.6,2.25,-1.85]];m.loft([e,e.map(p=>[p[0]+sx*.05,p[1],p[2]+.06])],true,true)}});
      m.mark('tusks',()=>{for(const sx of[-1,1])tube(m,[[sx*.32,2.38,-2.32],[sx*.36,2.05,-2.68],[sx*.34,1.98,-3.0],[sx*.3,2.15,-3.25]],[.09,.08,.07,.03],[.09,.08,.07,.03],6,[true,true])});
      m.mark('headpiece',()=>{const h=[[-.5,3.55,-2.0],[.5,3.55,-2.0],[.42,2.75,-2.42],[0,2.45,-2.52],[-.42,2.75,-2.42]];m.loft([h,h.map(p=>[p[0],p[1],p[2]-.05])],true,true);m.box([0,3.1,-2.3],[.18,.18,.1])});
      m.mark('blanket',()=>{for(const sx of[-1,1]){const b=[[sx*1.0,3.25,-.9],[sx*1.0,3.25,.8],[sx*1.03,2.2,.75],[sx*1.03,2.2,-.85]];m.loft([b,b.map(p=>[p[0]+sx*.03,p[1],p[2]])],false,false);
        for(let i=0;i<8;i++){const z=-.8+i*.22;line(m,[[sx*1.04,2.2,z],[sx*1.05,1.98,z]])}}m.box([0,3.52,-.05],[1.5,.1,1.7])});
      tube(m,[[0,2.95,1.45],[0,2.4,1.62],[0,1.7,1.66]],[.06,.05,.05],[.06,.05,.05],6,[false,true]);
    },colours:{tusks:C.w,blanket:C.m,headpiece:C.y,trunk:null,ears:null}});
}
// GIRAFFE: tall front legs, a back sloping down to the hips, a long tapering neck with its mane,
// a small head with ossicones, and patches on the body and neck.
{const Y=3.0,Yb=2.6;
  const legs=legs4([[-.3,Y,-.75],[-.33,1.45,-.82],[-.33,.38,-.74],[-.35,0,-.72]],[[-.32,Yb,.75],[-.36,1.45,1.02],[-.36,.4,.82],[-.38,0,.8]],.16);
  animal('giraffe',{Y,s:1.15,col:C.y,top:6.9,legs,reach:2.0,minCycle:.5,
    body(m){
      const st=[[-1.1,.3,2.9,3.4],[-.9,.42,2.72,3.62],[-.45,.46,2.66,3.55],[.1,.44,2.55,3.3],[.55,.4,2.48,3.1],[.92,.3,2.52,2.98]];
      trunk(m,st);
      const neck=[[0,3.45,-.88],[0,4.15,-1.15],[0,4.95,-1.42],[0,5.75,-1.66],[0,6.35,-1.82]];
      tube(m,neck,[.28,.22,.18,.15,.13],[.4,.32,.25,.19,.16],8,[false,false]);
      tube(m,[[0,6.45,-1.8],[0,6.4,-2.05],[0,6.25,-2.35],[0,6.15,-2.5]],[.15,.14,.11,.09],[.17,.15,.12,.1],8,[true,true]);
      m.mark('ossicones',()=>{for(const sx of[-1,1]){m.beam([sx*.08,6.58,-1.84],[sx*.1,6.92,-1.8],.05,.05);m.box([sx*.1,6.94,-1.8],[.09,.09,.09])}});
      for(const sx of[-1,1])m.beam([sx*.12,6.52,-1.78],[sx*.32,6.62,-1.7],.04,.08,.3);
      m.mark('mane',()=>line(m,neck.map((p,i)=>[0,p[1]+.18+(i%2)*.06,p[2]+.3-i*.03])));
      m.mark('spots',()=>{for(const sx of[-1,1]){for(let i=0;i<5;i++)for(let j=0;j<2;j++){const z=-.85+i*.38+(j?.16:0),y=2.78+j*.32-i*.05,x=sx*(st[Math.min(5,i+1)][1]+.01),d=.13;
            line(m,[[x,y-d,z-d],[x,y+d*.8,z-d*.6],[x,y+d,z+d*.7],[x,y-d*.6,z+d]],true)}
          neck.slice(0,4).forEach((p,i)=>{const x=sx*([.28,.22,.18,.15][i]+.01),y=p[1]+.15,z=p[2]+.05,d=.13;line(m,[[x,y-d,z],[x,y,z-d*.7],[x,y+d,z],[x,y,z+d*.7]],true)})}});
      tube(m,[[0,3.0,.92],[0,2.4,1.05],[0,1.85,1.1]],[.05,.04,.04],[.05,.04,.04],6,[false,false]);m.mark('tail',()=>m.box([0,1.72,1.1],[.12,.26,.12]));
    },colours:{spots:C.o,ossicones:C.o,mane:C.o,tail:C.o}});
}
// LLAMA: slender legs on two-toed pads, a deep woolly body, a tall upright neck, banana ears with
// tassels, and a woven blanket.
{const Y=1.45;
  const legs=legs4([[-.27,Y,-.62],[-.3,.68,-.7],[-.3,.22,-.62],[-.32,0,-.6]],[[-.28,Y+.05,.6],[-.32,.75,.85],[-.32,.24,.68],[-.34,0,.66]],.13,{hoof:1.2});
  animal('llama',{Y,s:1.15,col:C.w,top:3.5,legs,reach:1.2,minCycle:.36,
    body(m){
      trunk(m,[[-.95,.24,1.5,1.95],[-.8,.38,1.28,2.15],[-.35,.44,1.22,2.2],[.2,.44,1.24,2.2],[.65,.4,1.3,2.18],[.92,.28,1.45,2.1]]);
      const neck=[[0,2.0,-.78],[0,2.45,-.86],[0,2.9,-.92],[0,3.2,-.94]];
      tube(m,neck,[.24,.2,.18,.17],[.32,.27,.23,.21],8,[false,false]);
      tube(m,[[0,3.3,-.9],[0,3.25,-1.12],[0,3.12,-1.38]],[.17,.14,.11],[.19,.15,.12],8,[true,true]);
      for(const sx of[-1,1])tube(m,[[sx*.1,3.42,-.88],[sx*.17,3.7,-.84],[sx*.12,3.86,-.92]],[.05,.06,.03],[.03,.04,.02],6,[true,true]);
      m.mark('tassels',()=>{for(const sx of[-1,1])m.box([sx*.15,3.62,-.86],[.09,.12,.09])});
      m.mark('blanket',()=>{const top=[[-.3,2.24,-.5],[.3,2.24,-.5],[.3,2.24,.35],[-.3,2.24,.35]];m.loft([[[-.47,1.7,-.5],[.47,1.7,-.5],[.47,1.7,.35],[-.47,1.7,.35]],top],false,false);
        for(const z of[-.32,-.08,.16])line(m,[[-.47,1.74,z],[-.3,2.24,z],[.3,2.24,z],[.47,1.74,z]]);
        for(const sx of[-1,1])for(let i=0;i<5;i++)line(m,[[sx*.47,1.7,-.45+i*.19],[sx*.48,1.52,-.45+i*.19]])});
      tube(m,[[0,2.05,.92],[0,2.2,1.05],[0,2.05,1.14]],[.09,.1,.05],[.09,.1,.05],6,[false,true]);
    },colours:{blanket:C.m,tassels:C.y}});
}
// BISON: a massive shoulder hump, a low wide head with a beard and short curved horns, shaggy
// forequarters, a lean rear and a tufted tail.
{const Y=1.55;
  const legs=legs4([[-.42,Y,-.9],[-.46,.7,-.98],[-.46,.24,-.9],[-.48,0,-.88]],[[-.4,Y+.1,.75],[-.44,.82,1.0],[-.44,.26,.82],[-.46,0,.8]],.22,{hoof:1.1,kneeK:.65});
  animal('bison',{Y,s:1.25,col:C.o,top:3.2,legs,reach:1.55,radius:1.6,minCycle:.3,
    body(m){
      const st=[[-1.35,.36,1.55,2.35],[-1.1,.62,1.25,2.95],[-.65,.7,1.2,3.15],[-.15,.66,1.25,2.85],[.35,.55,1.35,2.45],[.8,.48,1.42,2.35],[1.12,.38,1.55,2.3],[1.3,.2,1.75,2.2]];
      trunk(m,st);
      tube(m,[[0,2.3,-1.3],[0,1.95,-1.62],[0,1.55,-1.9],[0,1.3,-2.05]],[.46,.44,.36,.28],[.5,.45,.36,.26],8,[false,true]);   // the low head
      m.mark('horns',()=>{for(const sx of[-1,1])tube(m,[[sx*.38,2.05,-1.65],[sx*.62,2.08,-1.68],[sx*.7,2.3,-1.72],[sx*.62,2.45,-1.75]],[.08,.07,.05,.02],[.08,.07,.05,.02],6,[true,true])});
      m.mark('beard',()=>{for(let i=0;i<7;i++){const x=-.3+i*.1;line(m,[[x,1.4,-1.85],[x*1.1,.95+(i%2)*.1,-1.8]])}});
      m.mark('fur',()=>{st.slice(1,4).forEach(([z,w,y0,y1],i)=>{for(const sx of[-1,1])for(let k=0;k<4;k++){const y=y0+.2+k*(y1-y0-.4)/3;line(m,[[sx*w*1.02,y,z+.1],[sx*w*1.08,y-.22,z+.18]])}});
        for(let i=0;i<5;i++)line(m,[[-.3+i*.15,1.3,-1.25],[-.3+i*.15,.92,-1.2]])});
      tube(m,[[0,2.2,1.3],[0,1.95,1.42],[0,1.5,1.46]],[.06,.05,.05],[.06,.05,.05],6,[false,false]);m.mark('tail',()=>m.box([0,1.38,1.46],[.14,.26,.14]));
    },colours:{horns:C.w,beard:C.y,fur:C.y,tail:C.y}});
}
if(GA_KINDS.reindeer)GA_KINDS.reindeer.colours={nose:C.r,antlers:C.y,barrels:C.w};   // for side-by-side studio comparisons
// Posed four-legged mesh colours for the scenes' drawUnit hook.
const kindColours=(kind,m)=>({...feetWhite(m),...(GA_KINDS[kind]?.colours||{})});

// ---------- Kangaroo: hops on its own posed rig ----------
// pose {u}: hop cycle 0..1. Stance 0-0.32: it lands crouched and drives up off its feet. Flight
// 0.32-1: legs swept back, the tail level behind as a counterweight, the feet swinging forward to
// land. The scene lifts it by hopH(u). Faces -z; the feet stand on y = 0.
const ROO_ST=.32;
function rooPose(u){
  const L1=.72,L2=.78,stance=u<ROO_ST,k=stance?smoothRoo(u/ROO_ST):0,f=stance?0:(u-ROO_ST)/(1-ROO_ST),arc=Math.sin(PI*f);
  // thigh angle (forward of straight down), shin angle (behind straight down)
  let a1,a2;
  if(stance){a1=lerpR(1.15,.35,k);a2=lerpR(1.0,.25,k)}
  else{const land=f>.6?smoothRoo((f-.6)/.4):0;a1=lerpR(.35,-.55,Math.min(1,f*2.2))+land*1.6;a2=lerpR(lerpR(.25,.55,arc),1.0,land)}
  const hipH=L1*Math.cos(a1)+L2*Math.cos(a2)+.1;
  return{a1,a2,L1,L2,hipH,tilt:stance?lerpR(.55,.8,k):lerpR(.8,.55,f),air:stance?0:arc,stance}
}
function smoothRoo(t){return t*t*(3-2*t)}
function lerpR(a,b,t){return a+(b-a)*t}
function buildKangaroo(m,pose){
  const P0=rooPose(pose.u||0),hip=[0,P0.hipH,.15],tl=P0.tilt;
  // Torso: heavy at the hips, leaning forward to a narrow chest.
  const fw=[0,Math.cos(tl),-Math.sin(tl)],at=d=>[hip[0],hip[1]+fw[1]*d,hip[2]+fw[2]*d];
  tube(m,[at(-.18),at(.15),at(.55),at(.92),at(1.15)],[.4,.44,.38,.28,.22],[.46,.5,.42,.3,.24],8,[true,false]);
  const ch=at(1.15),hd=[0,ch[1]+.42,ch[2]-.08];
  tube(m,[ch,[0,ch[1]+.22,ch[2]-.02],hd],[.2,.17,.16],[.22,.18,.18],8,[false,false]);
  tube(m,[hd,[0,hd[1]+.02,hd[2]-.2],[0,hd[1]-.06,hd[2]-.42]],[.17,.13,.07],[.19,.13,.07],8,[false,true]);   // head and snout
  m.mark('ears',()=>{for(const sx of[-1,1])tube(m,[[sx*.08,hd[1]+.14,hd[2]+.04],[sx*.15,hd[1]+.44,hd[2]+.12],[sx*.17,hd[1]+.62,hd[2]+.18]],[.05,.08,.02],[.03,.05,.01],6,[true,true])});
  // Forearms held in at the chest.
  for(const sx of[-1,1]){const s0=at(.85),sh=[sx*.22,s0[1]-.05,s0[2]],el=[sx*.24,sh[1]-.32,sh[2]-.18],pw=[sx*.18,el[1]-.08,el[2]-.24];tube(m,[sh,el,pw],[.07,.06,.04],[.07,.06,.04],6,[false,true])}
  // Hind legs: a big thigh, a long shin back to the heel, the long foot forward.
  for(const sx of[-1,1]){
    const h=[sx*.3,hip[1],hip[2]],kn=[sx*.33,h[1]-P0.L1*Math.cos(P0.a1),h[2]-P0.L1*Math.sin(P0.a1)],an=[sx*.33,kn[1]-P0.L2*Math.cos(P0.a2),kn[2]+P0.L2*Math.sin(P0.a2)];
    const toeAng=P0.stance?0:P0.air*.9,toe=[sx*.33,an[1]-.08+Math.sin(toeAng)*.5,an[2]-Math.cos(toeAng)*.62];
    tube(m,[h,[sx*.32,(h[1]+kn[1])/2,(h[2]+kn[2])/2],kn],[.22,.2,.12],[.3,.26,.14],8,[true,false]);
    tube(m,[kn,an],[.1,.07],[.11,.07],6,[false,false]);
    m.mark('foot'+sx,()=>tube(m,[an,[sx*.33,(an[1]+toe[1])/2,(an[2]+toe[2])/2],toe],[.08,.07,.05],[.06,.05,.03],6,[true,true]))}
  // The tail: thick at the root, resting its tip on the ground in stance, level in flight.
  m.mark('tail',()=>{const r=at(-.12),lift=P0.air;const pts=[r,[0,r[1]-.2+lift*.1,r[2]+.45],[0,lerpR(.35,r[1]-.25,lift),r[2]+.95],[0,lerpR(.12,r[1]-.2,lift),r[2]+1.5],[0,lerpR(.05,r[1]-.12,lift),r[2]+1.95]];
    tube(m,pts,[.2,.17,.13,.09,.04],[.22,.18,.13,.09,.04],8,[false,true])});
}
const kangaroo=P.posedMesh(buildKangaroo,{ears:C.y,tail:C.y,'foot-1':C.w,foot1:C.w});
const hopH=u=>u>ROO_ST?Math.sin(PI*(u-ROO_ST)/(1-ROO_ST))*.62:0;

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
  m.mark('cheeks',()=>{for(const sx of[-1,1]){line(m,[[sx*.18,1.62,-.04],[sx*.2,1.48,-.08],[sx*.14,1.38,-.14]]);line(m,[[sx*.16,1.58,-.02],[sx*.24,1.4,-.06],[sx*.2,1.26,-.18],[sx*.1,1.22,-.3]])}});
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
