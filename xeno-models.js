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
  // Fine detail (bands, antennae, mandibles, legs, spines) is drawn as plain lines with no
  // faces: it never hides anything, and hidden-line drawing costs a fraction as much.
  const lines=(m,pts,closed=false)=>{const b=m.v.length;for(const p of pts){const q=m.T?m.T(p):p;m.v.push([q[0],q[1],q[2]])}
    for(let i=0;i<pts.length-1;i++)m.e.push([b+i,b+i+1]);if(closed)m.e.push([b+pts.length-1,b]);return b};
  const install=(mesh,m,colours,extra)=>{
    mesh.v=m.v;mesh.e=m.e;mesh.faces=m.faces;mesh.edgeColors=edgeColoursFor(m,colours);Object.assign(mesh,extra)
  };

  // ---- Hornet: built in the promo's upright coordinates (spine along +y to the head, back
  // towards +z) and turned to fly: promo y becomes forward (-z), promo z becomes up.
  {
    const S=.33,m=gaBuilder(true),flight=p=>[p[0]*S,p[2]*S,-(p[1]+.2)*S];
    const ring=(y,w,z)=>{const d=w*.82;return[[-w,y,z],[-w*.55,y,z-d],[w*.55,y,z-d],[w,y,z],[w*.55,y,z+d],[-w*.55,y,z+d]]};
    const SPINE=[[-2.0,.03,.3],[-1.4,.32,.24],[-.8,.47,.14],[-.15,.24,.02],[.05,.12,0],[.45,.38,-.01],[.95,.34,-.04],[1.26,.12,-.06]];
    const ringYZ=(x,y,z,ry,rz,n)=>Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n;return[x,y+Math.cos(a)*ry,z+Math.sin(a)*rz]});
    m.T=flight;
    m.mark('body',()=>m.loft(SPINE.map(([y,w,z])=>ring(y,w,z))));
    m.mark('bands',()=>{for(const[y,w,z]of[[-1.15,.41,.2],[-.8,.48,.14],[-.45,.44,.08]])lines(m,ring(y,w*1.02,z),true)});
    m.mark('sting',()=>lines(m,[[0,-1.98,.3],[0,-2.5,.42]]));
    const hy=1.3;
    m.mark('head',()=>m.loft([ring(hy,.24,.02),ring(hy+.3,.38,-.05),ring(hy+.66,.26,-.04),ring(hy+.8,.06,-.02)]));
    m.mark('eyes',()=>{for(const s of[-1,1]){const c=[s*.33,hy+.44,-.2];lines(m,ringYZ(c[0],c[1],c[2],.16,.2,6),true)}});
    m.mark('antennae',()=>{for(const s of[-1,1])lines(m,[[s*.08,hy+.74,-.18],[s*.24,hy+1.15,-.45],[s*.4,hy+1.32,-.2]])});
    m.mark('mandibles',()=>{for(const s of[-1,1])lines(m,[[s*.17,hy+.12,-.24],[s*.12,hy+.08,-.42],[s*.04,hy+.06,-.54]])});
    // Wings: four flat blades from the top of the thorax, out to the sides and swept back
    // along the abdomen. Each blade's root is one vertex the flapping groups pivot on.
    const groups=[];
    m.mark('wings',()=>{for(const s of[-1,1])for(const[root,tip,trail,ph]of[[[.2,.85,.24],[1.75,.25,.5],[1.0,-.3,.38],0],[[.18,.62,.24],[1.3,-.25,.42],[.62,-.55,.32],.55]]){
      // Membranes, so outlines only: they hide nothing behind them.
      const r=[s*root[0],root[1],root[2]],i0=lines(m,[r,[s*tip[0],tip[1],tip[2]],[s*(tip[0]+trail[0])/2,(tip[1]+trail[1])/2+.06,(tip[2]+trail[2])/2+.08],[s*trail[0],trail[1],trail[2]]],true);
      m.e.push([i0,i0+2]);   // a vein down the middle of the wing
      groups.push({indices:[i0+1,i0+2,i0+3],pivot:i0,phase:ph})
    }});
    m.T=null;
    install(B.meshes.hornet,m,{bands:C.o,sting:C.o,eyes:C.r,antennae:C.o,mandibles:C.w,wings:C.c},{bugAnimGroups:groups,bugTailZ:.82});
  }

  // ---- Larva: a writhing grub, head forward along -z.
  {
    const m=gaBuilder(true),N=6;
    const ell=(z,rx,ry,y=0)=>Array.from({length:N},(_,i)=>{const a=i*Math.PI*2/N;return[Math.cos(a)*rx,y+Math.sin(a)*ry,z]});
    // Segments: each one swells and pinches, fattest a third of the way back, tapering to a
    // blunt tail.
    const SEG=[[-.34,.17,.15],[-.18,.22,.19],[-.02,.26,.22],[.14,.27,.23],[.3,.25,.21],[.45,.21,.18],[.58,.16,.14],[.69,.1,.09],[.76,.04,.04]];
    m.mark('body',()=>m.loft(SEG.map(([z,rx,ry])=>ell(z,rx,ry))));
    // Segment rims, picked out so the body reads as segmented.
    m.mark('rims',()=>{for(const[z,rx,ry]of SEG.slice(1,7))lines(m,ell(z,rx*1.04,ry*1.04),true)});
    m.mark('head',()=>m.loft([ell(-.34,.17,.15),ell(-.48,.13,.11,.015),ell(-.55,.04,.04,.02)]));
    m.mark('eyes',()=>{for(const s of[-1,1])lines(m,[[s*.07,.09,-.45],[s*.11,.1,-.47],[s*.1,.06,-.48],[s*.07,.09,-.45]])});
    m.mark('mandibles',()=>{for(const s of[-1,1])lines(m,[[s*.06,-.02,-.5],[s*.09,-.04,-.64],[s*.03,-.05,-.7]])});
    // Soft spines along the back, one per segment.
    m.mark('spines',()=>{for(const[z,rx,ry]of SEG.slice(1,7))lines(m,[[0,ry*.98,z],[0,ry+.09,z+.05]])});
    // Three pairs of stubby legs under the front segments; each paddles from its root.
    const groups=[];
    m.mark('legs',()=>{let ph=0;for(const z of[-.16,0,.15]){for(const s of[-1,1]){const i0=lines(m,[[s*.16,-.12,z],[s*.25,-.22,z+.02],[s*.29,-.29,z+.05]]);groups.push({indices:[i0+1,i0+2],pivot:i0,phase:ph})}ph+=1.15}});
    install(B.meshes.larva,m,{rims:C.y,eyes:C.r,mandibles:C.w,spines:C.y,legs:C.y},{bugAnimGroups:groups,bugTailZ:.78,bugWrithe:{amp:.06,wave:6.5,speed:5.2}});
  }

  // ---- Drifter (v1400): the huge, slow, peaceful xeno of the migrations. A broad manta body
  // whose wing edges ripple, a row of soft lights along its back, small eyes at the front and
  // a long tail that sways. Head forward along -z.
  {
    const m=gaBuilder(true),N=8;
    const sec=(z,rx,ry,dy=0)=>Array.from({length:N},(_,i)=>{const a=i*Math.PI*2/N,c=Math.cos(a),sn=Math.sin(a);return[c*rx,dy+sn*ry*(1-.55*Math.abs(c)),z]});
    const BODY=[[-2.1,.35,.3],[-1.5,1.6,.42],[-.8,2.7,.5],[0,3.2,.52],[.8,2.6,.46],[1.5,1.4,.36],[2.0,.5,.28],[2.3,.22,.2]];
    m.mark('body',()=>m.loft(BODY.map(([z,rx,ry])=>sec(z,rx,ry))));
    m.mark('lights',()=>{for(const z of[-1.0,0,1.0]){const y=.5*(1-Math.abs(z)/3);m.loft([m.ringXZ(0,y+.02,z,.18,.18,5),m.ringXZ(0,y+.13,z,.07,.07,5)])}});
    m.mark('eyes',()=>{for(const sx of[-1,1])m.box([sx*.25,.12,-1.95],[.12,.1,.1])});
    m.mark('tail',()=>{m.beam([0,0,2.2],[0,.05,3.6],.18,.14,.7);m.beam([0,.05,3.6],[0,.15,5.4],.1,.08,.4)});
    // Wing edges ripple: every vertex well out from the body swings about a pivot near it.
    const groups=[];
    for(const side of[-1,1]){const piv=m.v.length;m.v.push([side*1.3,0,0]);const idx=[];m.v.forEach((v,i)=>{if(i!==piv&&v[0]*side>1.7)idx.push(i)});groups.push({indices:idx,pivot:piv,phase:0})}
    install(B.meshes.drifter||(B.meshes.drifter={name:'Void Drifter',bugKind:'drifter'}),m,{lights:C.y,eyes:C.w,tail:C.c},{bugAnimGroups:groups,bugFlap:{speed:1.5,amp:.2},bugTailZ:2.4,bugWrithe:{amp:.05,wave:1.6,speed:1.3},propulsionCol:C.c});
  }
})();
