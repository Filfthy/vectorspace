'use strict';

// XENO MODELS (v1340)
//
// The space xenos rebuilt from the Christmas promo's hornet, which reads far better than
// the original low faceted shapes. Built once at load with the ground-assault mesh
// builder and written into the existing AgentXSpaceBugs meshes, so every spawn, kill and
// fragment that already uses them gets the new shapes.
//
//   STINGER HORNET  segmented abdomen with banding, narrow waist, thorax, head with big
//                   compound eyes, elbowed antennae and closed mandibles, two pairs of
//                   wings that buzz, and the sting behind.
//   LARVA DRIFTER   a fat segmented grub that writhes as it swims, a small head with
//                   eyes and hooked mandibles, three pairs of stubby legs that paddle,
//                   and soft spines along its back.
//
// Both fly head first along -z, back up (+y), as the old meshes did.
(function(){
  const B=globalThis.AgentXSpaceBugs;if(!B||typeof gaBuilder!=='function')return;
  const edgeColoursFor=(m,map)=>{
    const r=Object.entries(map).map(([k,col])=>[m.marks[k],col]).filter(x=>x[0]);
    return m.e.map(e=>{for(const[[a,b],col]of r)if(e[0]>=a&&e[0]<b&&e[1]>=a&&e[1]<b)return col;return null})
  };
  const install=(mesh,m,colours,extra)=>{
    mesh.v=m.v;mesh.e=m.e;mesh.faces=m.faces;mesh.edgeColors=edgeColoursFor(m,colours);Object.assign(mesh,extra)
  };

  // ---- Hornet: built in the promo's upright coordinates (spine along +y to the head, back
  // towards +z) and turned to fly: promo y becomes forward (-z), promo z becomes up.
  {
    const S=.33,m=gaBuilder(true),flight=p=>[p[0]*S,p[2]*S,-(p[1]+.2)*S];
    const ring=(y,w,z)=>{const d=w*.82;return[[-w,y,z],[-w*.55,y,z-d],[w*.55,y,z-d],[w,y,z],[w*.55,y,z+d],[-w*.55,y,z+d]]};
    const SPINE=[[-2.0,.03,.3],[-1.75,.1,.28],[-1.4,.32,.24],[-.95,.46,.16],[-.45,.44,.08],[-.12,.26,.02],[.05,.12,0],[.25,.3,0],[.6,.4,-.02],[.95,.34,-.04],[1.15,.18,-.05],[1.26,.12,-.06]];
    const pt6=(c,s,dx)=>{const p=[c[0]+s*dx,c[1],c[2]];return[p,p,p,p,p,p]};
    const ringYZ=(x,y,z,ry,rz,n)=>Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n;return[x,y+Math.cos(a)*ry,z+Math.sin(a)*rz]});
    m.T=flight;
    m.mark('body',()=>m.loft(SPINE.map(([y,w,z])=>ring(y,w,z))));
    m.mark('bands',()=>{for(const[y,w,z]of[[-1.4,.33,.24],[-.95,.47,.16],[-.45,.45,.08]])m.loft([ring(y-.015,w,z),ring(y+.015,w,z)],false,false)});
    m.mark('sting',()=>m.beam([0,-1.98,.3],[0,-2.5,.42],.08,.06,.1));
    const hy=1.3;
    m.mark('head',()=>m.loft([ring(hy,.24,.02),ring(hy+.22,.38,-.04),ring(hy+.5,.36,-.06),ring(hy+.72,.22,-.04),ring(hy+.8,.06,-.02)]));
    m.mark('eyes',()=>{for(const s of[-1,1]){const c=[s*.3,hy+.44,-.2];m.loft([pt6(c,s,-.02),ringYZ(c[0]+s*.03,c[1],c[2],.16,.2,6),pt6(c,s,.1)],false,false)}});
    m.mark('antennae',()=>{for(const s of[-1,1]){const a=[s*.08,hy+.74,-.18],b=[s*.24,hy+1.15,-.45],c=[s*.4,hy+1.32,-.2];m.beam(a,b,.035,.035,.8);m.beam(b,c,.03,.03,.5)}});
    m.mark('mandibles',()=>{for(const s of[-1,1])m.loft([[[s*.16,hy+.06,-.24],[s*.16,hy+.2,-.24],[s*.2,hy+.13,-.22]],[[s*.05,hy+.02,-.54],[s*.05,hy+.12,-.52],[s*.09,hy+.07,-.5]]])});
    // Wings: four flat blades from the top of the thorax, out to the sides and swept back
    // along the abdomen. Each blade's root is one vertex the flapping groups pivot on.
    const groups=[];
    m.mark('wings',()=>{for(const s of[-1,1])for(const[root,tip,trail,ph]of[[[.2,.85,.24],[1.75,.25,.5],[1.0,-.3,.38],0],[[.18,.62,.24],[1.3,-.25,.42],[.62,-.55,.32],.55]]){
      const r=[s*root[0],root[1],root[2]],i0=m.v.length;
      m.loft([[r,r,r],[[s*tip[0],tip[1],tip[2]],[s*(tip[0]+trail[0])/2,(tip[1]+trail[1])/2+.06,(tip[2]+trail[2])/2+.08],[s*trail[0],trail[1],trail[2]]]],false,false);
      groups.push({indices:[i0+3,i0+4,i0+5],pivot:i0,phase:ph})
    }});
    m.T=null;
    install(B.meshes.hornet,m,{bands:C.o,sting:C.o,eyes:C.r,antennae:C.o,mandibles:C.w,wings:C.c},{bugAnimGroups:groups,bugTailZ:.82});
  }

  // ---- Larva: a writhing grub, head forward along -z.
  {
    const m=gaBuilder(true),N=8;
    const ell=(z,rx,ry,y=0)=>Array.from({length:N},(_,i)=>{const a=i*Math.PI*2/N;return[Math.cos(a)*rx,y+Math.sin(a)*ry,z]});
    // Segments: each one swells and pinches, fattest a third of the way back, tapering to a
    // blunt tail.
    const SEG=[[-.34,.17,.15],[-.18,.22,.19],[-.02,.26,.22],[.14,.27,.23],[.3,.25,.21],[.45,.21,.18],[.58,.16,.14],[.69,.1,.09],[.76,.04,.04]];
    m.mark('body',()=>{const rings=[];for(let i=0;i<SEG.length;i++){const[z,rx,ry]=SEG[i];rings.push(ell(z,rx,ry));if(i<SEG.length-1){const n=SEG[i+1];rings.push(ell((z+n[0])/2,(rx+n[1])/2*.86,(ry+n[2])/2*.86))}}m.loft(rings)});
    // Segment rims, picked out so the body reads as segmented.
    m.mark('rims',()=>{for(const[z,rx,ry]of SEG.slice(1,7))m.loft([ell(z-.004,rx*1.01,ry*1.01),ell(z+.004,rx*1.01,ry*1.01)],false,false)});
    m.mark('head',()=>m.loft([ell(-.34,.17,.15),ell(-.44,.15,.13,.01),ell(-.52,.1,.09,.02),ell(-.55,.04,.04,.02)]));
    m.mark('eyes',()=>{for(const s of[-1,1])m.box([s*.09,.08,-.46],[.05,.05,.05])});
    m.mark('mandibles',()=>{for(const s of[-1,1]){const a=[s*.06,-.02,-.5],b=[s*.09,-.04,-.64],c=[s*.03,-.05,-.7];m.beam(a,b,.03,.025,.7);m.beam(b,c,.025,.02,.4)}});
    // Soft spines along the back, one per segment.
    m.mark('spines',()=>{for(const[z,rx,ry]of SEG.slice(1,7))m.beam([0,ry*.96,z],[0,ry+.09,z+.05],.025,.02,.2)});
    // Three pairs of stubby legs under the front segments; each paddles from its root.
    const groups=[];
    m.mark('legs',()=>{let ph=0;for(const z of[-.16,0,.15]){for(const s of[-1,1]){const root=[s*.16,-.12,z],i0=m.v.length;m.beam(root,[s*.27,-.27,z+.03],.045,.035,.6);groups.push({indices:[i0+4,i0+5,i0+6,i0+7],pivot:i0,phase:ph})}ph+=1.15}});
    install(B.meshes.larva,m,{rims:C.y,eyes:C.r,mandibles:C.w,spines:C.y,legs:C.y},{bugAnimGroups:groups,bugTailZ:.78,bugWrithe:{amp:.06,wave:6.5,speed:5.2}});
  }
})();
