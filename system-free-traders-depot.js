'use strict';

// Missing Manifest finale: a reusable Free Traders Compact orbital freight depot.
// The depot is deliberately a flat-roofed industrial warehouse rather than a
// terrestrial pitched-roof shed.  Its bird mark is generated at runtime from the
// canonical AgentXNetworkLogos.trade SVG path data, preserving the approved logo
// exactly rather than baking a hand-redrawn approximation into this asset.
// v2420 (Dave: the depot is a bit too boxy). The freight hall is now a curved-roof hangar:
// the front wall stays flat (so the loading bays, the logo fascia and the exterior terminal
// keep their exact places) and the roof sweeps over in one curve to the back. Ribs follow
// the curve. The docked freighters have rounded hulls and engine bells, and the roof carries
// round tanks, a radar dome, a pipe run and the mast and dishes rather than boxes.
function buildFreeTradersFreightDepotMesh(){
  const m=gaBuilder(true),PI=Math.PI,line=(p,c)=>gaLine(m,p,c),cols=[];
  const mark=(col,fn)=>{const a=m.e.length;fn();cols.push([a,m.e.length,col])};
  const box=(x0,y0,z0,x1,y1,z1)=>m.box([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],[x1-x0,y1-y0,z1-z0]);
  const rect=(x0,y0,x1,y1,z,diag=false)=>{line([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],true);if(diag){line([[x0,y0,z],[x1,y1,z]]);line([[x1,y0,z],[x0,y1,z]])}};
  const ringX=(x,cy,cz,ry,rz,n)=>Array.from({length:n},(_,i)=>{const t=2*PI*i/n;return[x,cy+Math.sin(t)*ry,cz+Math.cos(t)*rz]});
  const ringZ=(cx,cy,z,rx,ry,n)=>Array.from({length:n},(_,i)=>{const t=2*PI*i/n;return[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,z]});
  // Hall profile in (z,y): flat front wall up to the fascia, then one curve over to the back.
  const P=[[-1.6,-1.0],[-1.6,.72],[-1.5,.96],[-1.22,1.16],[-.72,1.31],[0,1.37],[.72,1.31],[1.22,1.15],[1.56,.9],[1.76,.5],[1.8,0],[1.8,-1.0],[1.55,-1.2],[.45,-1.32],[-.8,-1.29],[-1.5,-1.12]];
  const roofY=z=>{for(let i=1;i<P.length-2;i++){const a=P[i],b=P[i+1];if(z>=a[0]&&z<=b[0])return a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0])}return .72};
  mark(C.y,()=>{
    // Rounded ends: the profile shrinks towards its centre past each end of the hall, so the
    // corners curve back instead of ending in flat walls. One span between, so no seams cross
    // the bays or the fascia on the front.
    const ends=[[3.3,.28],[3.16,.6],[2.98,.86],[2.8,1]],ring=(x,k)=>P.map(([z,y])=>[x,.1+(y-.1)*k,.1+(z-.1)*k]);
    m.loft([...ends.map(([x,k])=>ring(-x,k)),...ends.slice().reverse().map(([x,k])=>ring(x,k))],true,true);
    // Roof ribs, standing just proud of the skin so they read as structure on the curve.
    for(let x=-2.45;x<=2.46;x+=.7)line(P.slice(1).map(([z,y])=>{const k=1.012;return[x,-1+(y+1)*k,z*k]}));
  });
  // Corrugation on the flat front wall, broken round the bays, the fascia and the terminal.
  const frontProtected=[{x0:-2.28,x1:-1.22,y0:-.86,y1:.04},{x0:-.94,x1:.18,y0:-.86,y1:.04},{x0:.43,x1:1.53,y0:-.86,y1:.04},{x0:-.84,x1:.84,y0:.04,y1:.66},{x0:1.80,x1:2.52,y0:-.22,y1:.35},{x0:2.05,x1:2.27,y0:-.70,y1:-.54}];
  mark(C.y,()=>{for(let x=-2.45;x<=2.46;x+=.35){let spans=[[-.94,.65]];
    for(const r of frontProtected){if(x<r.x0||x>r.x1)continue;const next=[];for(const[a,b]of spans){if(r.y1<=a||r.y0>=b){next.push([a,b]);continue}if(r.y0>a+.001)next.push([a,Math.min(b,r.y0)]);if(r.y1<b-.001)next.push([Math.max(a,r.y1),b])}spans=next}
    for(const[a,b]of spans)if(b-a>.025)line([[x,a,-1.615],[x,b,-1.615]])}});
  // Loading bays.
  const bay=(cx,w,h)=>{mark(C.w,()=>rect(cx-w/2,-.82,cx+w/2,-.82+h,-1.635));mark(C.y,()=>{rect(cx-w/2+.09,-.73,cx+w/2-.09,-.13,-1.646);line([[cx,-.73,-1.648],[cx,-.13,-1.648]])})};
  bay(-1.75,1.02,.82);bay(-.38,1.05,.82);bay(.98,1.02,.82);
  // Logo fascia and the exterior terminal (same places as before; the controller uses them).
  mark(C.w,()=>{box(-.78,.08,-1.705,.78,.63,-1.615);box(1.84,-.18,-1.785,2.48,.31,-1.615);line([[2.16,-.18,-1.80],[2.16,-.43,-1.66]])});
  mark(C.c,()=>rect(1.93,-.08,2.39,.21,-1.797));
  // v3003: the cargo intake hatch below the terminal, sized for one case. Its doors are
  // drawn by the controller so they can open. The mesh carries only the frame.
  mark(C.c,()=>{rect(2.09,-.665,2.23,-.572,-1.625);rect(2.08,-.675,2.24,-.562,-1.62)});
  // Roof: a pipe run along the crown, two round tanks, a radar dome, radiator fins, mast and dishes.
  mark(C.w,()=>{
    m.loft([ringX(-2.3,1.47,.35,.09,.09,8),ringX(2.3,1.47,.35,.09,.09,8)],true,true);
    for(const x of[-1.6,-.4,.8,2.0])m.beam([x,1.33,.35],[x,1.4,.35],.08,.08);
    for(const[x,z,r,h]of[[-1.62,.82,.27,.42],[-.98,.86,.23,.3]]){const y0=roofY(z)-.05;
      m.loft([[0,r],[h,r],[h+r*.5,r*.86],[h+r*.85,r*.5],[h+r*.98,r*.15]].map(([dy,rr])=>m.ringXZ(x,y0+dy,z,rr,rr,10)),false,true)}
    {const x=1.0,z=.95,y0=roofY(z)-.03;m.loft([0,.3,.6,.85].map(k=>m.ringXZ(x,y0+.32*Math.sin(k*PI/2),z,.3*Math.cos(k*PI/2),.3*Math.cos(k*PI/2),12)),false,true)}
    for(const sx of[-1,1])m.beam([sx*2.3,1.15,.2],[sx*2.3,1.15,1.05],.03,.03);
    line([[1.62,roofY(.7)-.02,.7],[1.62,2.2,.7]]);line([[1.62,1.75,.7],[1.98,1.9,.58]]);line([[1.62,1.98,.7],[1.38,2.18,.87]]);
  });
  mark(C.c,()=>{
    for(const sx of[-1,1])line([[sx*2.3,1.15,.2],[sx*2.3,1.62,.2],[sx*2.3,1.62,1.05],[sx*2.3,1.15,1.05],[sx*2.3,1.62,.2]]);
    const dish=(cx,cy,cz,r,ax,ay)=>{const pts=Array.from({length:13},(_,i)=>{const t=2*PI*i/12,p=[Math.cos(t)*r,Math.sin(t)*r,0];const y1=p[1]*Math.cos(ax)-p[2]*Math.sin(ax),z1=p[1]*Math.sin(ax)+p[2]*Math.cos(ax),x2=p[0]*Math.cos(ay)+z1*Math.sin(ay),z2=-p[0]*Math.sin(ay)+z1*Math.cos(ay);return[cx+x2,cy+y1,cz+z2]});line(pts);line([pts[0],pts[6]]);line([pts[3],pts[9]])};
    dish(2.0,1.92,.56,.17,-.5,.6);dish(1.32,2.24,.9,.14,-.3,-.7)});
  // Docking arms and the two docked freighters: rounded hulls, a spine pod, engine bells.
  const freighter=(cx)=>{
    mark(C.g,()=>{
      m.loft([[-1.02,.04,.03],[-.8,.2,.13],[-.45,.4,.24],[-.1,.48,.29],[1.25,.48,.29],[1.55,.42,.25],[1.7,.34,.2]].map(([z,rx,ry])=>ringZ(cx,-.28,z,rx,ry,10)),true,true);
      m.loft([[.15,.08,.05],[.3,.2,.12],[1.1,.2,.12],[1.25,.08,.05]].map(([z,rx,ry])=>ringZ(cx,-.02,z,rx,ry,8)),true,true);
    });
    mark(C.c,()=>{for(const ex of[-.2,.2])m.loft([ringZ(cx+ex,-.3,1.68,.08,.08,8),ringZ(cx+ex,-.3,1.82,.11,.11,8),ringZ(cx+ex,-.3,2.0,.16,.16,8)],true,false)});
  };
  mark(C.w,()=>{m.beam([-3.0,-.18,.56],[-3.66,-.18,.56],.13,.13);m.beam([3.0,-.18,.72],[3.66,-.18,.72],.13,.13);
    for(const sx of[-1,1])m.loft([ringX(sx*3.0,-.18,sx<0?.56:.72,.17,.17,8),ringX(sx*3.14,-.18,sx<0?.56:.72,.12,.12,8)],false,false)});
  freighter(-4.12);freighter(4.12);
  // The exact Free Traders Compact bird, from the canonical SVG path data.
  const logo=globalThis.AgentXNetworkLogos?.trade;
  if(logo?.paths?.length)mark(C.w,()=>{
    const vb=String(logo.viewBox||'0 0 1 1').trim().split(/[ ,]+/).map(Number),vx=vb[0]||0,vy=vb[1]||0,vw=Math.max(.001,vb[2]||1),vh=Math.max(.001,vb[3]||1);
    const sc=.46/vh,cy=.355,cz=-1.718;
    for(const d of logo.paths){
      const tokens=String(d).match(/[MLZmlz]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)||[];let i=0,cmd='',first=null,prev=null;
      const P2=(x,y)=>{m.v.push([(x-(vx+vw*.5))*sc,cy-(y-(vy+vh*.5))*sc,cz]);return m.v.length-1};
      while(i<tokens.length){const t=tokens[i++];
        if(/^[MLZ]$/i.test(t)){cmd=t.toUpperCase();if(cmd==='Z'){if(prev!=null&&first!=null&&prev!==first)m.e.push([prev,first]);prev=first;continue}}else{i--}
        if(cmd!=='M'&&cmd!=='L')continue;if(i+1>=tokens.length)break;
        const x=Number(tokens[i++]),y=Number(tokens[i++]);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        const idx=P2(x,y);if(cmd==='M'){first=idx;prev=idx;cmd='L'}else{if(prev!=null)m.e.push([prev,idx]);prev=idx}}
    }
  });
  const edgeColors=m.e.map((_,i)=>{for(const[a,b,c]of cols)if(i>=a&&i<b)return c;return C.y});
  return{name:'Free Traders Freight Depot, curved hall 02',v:m.v,e:m.e,faces:m.faces,edgeColors};
}

// v3005 (Dave: OSD still took me to Free Traders for cargo delivery). The OSD picket station:
// where Orbital Security Directorate deliveries end. It keeps the depot's working front wall
// (the exterior terminal, its display and the cargo intake hatch at the same local places,
// on the same flat face at z -1.6) so the controller, the approach, the upload and the hatch
// all work exactly as at the depot. Everything else is military: an armoured chamfered hull
// with a patrol-drone launch bay, the OSD emblem on the fascia, a command tower and sensor
// mast, two roof turrets, and two patrol drones docked on arms where the depot has freighters.
function surfaceLogoEdges(m,key,height,cx,cy,cz){
  const logo=globalThis.AgentXNetworkLogos?.[key];if(!logo?.paths?.length)return;
  const vb=String(logo.viewBox||'0 0 1 1').trim().split(/[ ,]+/).map(Number),vx=vb[0]||0,vy=vb[1]||0,vw=Math.max(.001,vb[2]||1),vh=Math.max(.001,vb[3]||1);
  const sc=height/vh;
  for(const d of logo.paths){
    const tokens=String(d).match(/[MLZmlz]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)||[];let i=0,cmd='',first=null,prev=null;
    const P2=(x,y)=>{m.v.push([cx+(x-(vx+vw*.5))*sc,cy-(y-(vy+vh*.5))*sc,cz]);return m.v.length-1};
    while(i<tokens.length){const t=tokens[i++];
      if(/^[MLZ]$/i.test(t)){cmd=t.toUpperCase();if(cmd==='Z'){if(prev!=null&&first!=null&&prev!==first)m.e.push([prev,first]);prev=first;continue}}else{i--}
      if(cmd!=='M'&&cmd!=='L')continue;if(i+1>=tokens.length)break;
      const x=Number(tokens[i++]),y=Number(tokens[i++]);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const idx=P2(x,y);if(cmd==='M'){first=idx;prev=idx;cmd='L'}else{if(prev!=null)m.e.push([prev,idx]);prev=idx}}
  }
}
// v3005 (Dave: maybe OSD could have a static facility but also a battlecruiser). kind 'cruiser'
// builds the battlecruiser Resolute: the same working flank panel on a long armoured hull.
function buildOsdPicketMesh(kind='picket'){
  const cruiser=kind==='cruiser';
  const m=gaBuilder(true),PI=Math.PI,line=(p,c)=>gaLine(m,p,c),cols=[];
  const mark=(col,fn)=>{const a=m.e.length;fn();cols.push([a,m.e.length,col])};
  const box=(x0,y0,z0,x1,y1,z1)=>m.box([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],[x1-x0,y1-y0,z1-z0]);
  const rect=(x0,y0,x1,y1,z)=>line([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],true);
  const ringZ=(cx,cy,z,rx,ry,n,rot=0)=>Array.from({length:n},(_,i)=>{const t=2*PI*i/n+rot;return[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,z]});
  const rr=(cx,y,cz,hx,hz)=>[[cx-hx,y,cz-hz],[cx+hx,y,cz-hz],[cx+hx,y,cz+hz],[cx-hx,y,cz+hz]];
  // Hull profile in (z,y): the flat front wall, then armour chamfers all the way round.
  const P=[[-1.6,-1.0],[-1.6,.72],[-1.22,1.02],[1.15,1.02],[1.7,.56],[1.7,-.62],[1.25,-1.12],[-1.18,-1.12]];
  if(cruiser)mark(C.w,()=>{
    // A long hull, flat-flanked, tapering to a pointed bow at +x and a squared stern at -x.
    const Q=[[-1.6,-1.0],[-1.6,.78],[-1.05,1.2],[1.05,1.2],[1.6,.78],[1.6,-1.0],[1.05,-1.4],[-1.05,-1.4]];
    const ring=(x,kz,ky)=>Q.map(([z,y])=>[x,-.1+(y+.1)*ky,z*kz]);
    m.loft([[-7.2,.66,.66],[-6.8,.93,.9],[-6.2,1,1],[3.2,1,1],[4.6,.8,.78],[5.8,.52,.5],[6.9,.22,.24],[7.5,.05,.08]].map(([x,kz,ky])=>ring(x,kz,ky)),true,true);
    for(const x of[-5.2,-3.4,-1.7,.1,1.6,3.2].filter(x=>Math.abs(x)>.3))line(Q.slice(1,7).map(([z,y])=>[x,-.1+(y+.1)*1.006,z*1.006]));
    // the keel under the bow
    line([[3.4,-1.42,0],[6.4,-1.05,0],[7.4,-.18,0]]);
  });
  if(!cruiser)mark(C.w,()=>{
    const ends=[[3.9,.16],[3.55,.48],[3.15,.8],[2.75,1]],ring=(x,k)=>P.map(([z,y])=>[x,.1+(y-.1)*k,.1+(z-.1)*k]);
    m.loft([...ends.map(([x,k])=>ring(-x,k)),...ends.slice().reverse().map(([x,k])=>ring(x,k))],true,true);
    // armour belts round the hull
    for(const x of[-2.1,-1.05,0,1.05,2.1].filter(x=>Math.abs(x)>.01))line(P.slice(1,7).map(([z,y])=>[x,y*1.006,z*1.006]));
  });
  // Front-wall panel seams, broken round the bay, the fascia, the terminal and the hatch.
  const protect=[{x0:-1.08,x1:1.08,y0:-1.0,y1:.02},{x0:-.62,x1:.62,y0:.02,y1:.72},{x0:1.80,x1:2.52,y0:-.22,y1:.35},{x0:2.05,x1:2.27,y0:-.70,y1:-.54}];
  const cut=(spans,a0,a1,b0,b1)=>{const out=[];for(const[a,b]of spans){if(b1<=a||b0>=b){out.push([a,b]);continue}if(b0>a+.001)out.push([a,Math.min(b,b0)]);if(b1<b-.001)out.push([Math.max(a,b1),b])}return out};
  mark(C.c,()=>{
    for(const x of(cruiser?[-5.6,-4.1,-2.6,-1.3,1.3,2.62]:[-2.45,-1.75,-1.3,1.3,1.75,2.62])){let s=[[-.88,.6]];for(const r of protect)if(x>=r.x0&&x<=r.x1)s=cut(s,0,0,r.y0,r.y1);for(const[a,b]of s)if(b-a>.03)line([[x,a,-1.612],[x,b,-1.612]])}
    for(const y of(cruiser?[.2]:[-.62,.2])){let s=[cruiser?[-6.1,3.1]:[-2.7,2.7]];for(const r of protect)if(y>=r.y0&&y<=r.y1)s=cut(s,0,0,r.x0,r.x1);for(const[a,b]of s)if(b-a>.03)line([[a,y,-1.612],[b,y,-1.612]])}
  });
  // The launch bay: a wide armoured door with hazard chevrons along its sill.
  mark(C.w,()=>{rect(-1.0,-.94,1.0,-.04,-1.63);rect(-.92,-.86,.92,-.12,-1.638);line([[0,-.86,-1.64],[0,-.12,-1.64]])});
  mark(C.y,()=>{for(let x=-.88;x<.8;x+=.16)line([[x,-.86,-1.642],[x+.08,-.78,-1.642],[x+.16,-.86,-1.642]])});
  // Fascia with the OSD emblem, the exterior terminal and its strut, the intake hatch frame.
  mark(C.w,()=>{box(-.56,.06,-1.70,.56,.70,-1.615);box(1.84,-.18,-1.785,2.48,.31,-1.615);line([[2.16,-.18,-1.80],[2.16,-.43,-1.66]])});
  mark(C.c,()=>{rect(1.93,-.08,2.39,.21,-1.797);rect(2.09,-.665,2.23,-.572,-1.625);rect(2.08,-.675,2.24,-.562,-1.62)});
  mark(C.w,()=>surfaceLogoEdges(m,'security',.56,0,.38,-1.712));
  if(cruiser){
    // The bridge aft: stepped armour with a window band, the sensor mast and its beacon.
    mark(C.w,()=>{
      m.loft([rr(-4.4,1.16,0,1.0,.9),rr(-4.4,1.8,.08,.86,.76),rr(-4.4,2.16,.14,.62,.56)],false,true);
      line([[-4.4,2.16,.14],[-4.4,3.3,.14]]);for(const[y,w]of[[2.5,.3],[2.85,.2],[3.12,.12]])line([[-4.4-w,y,.14],[-4.4+w,y,.14]]);
    });
    mark(C.c,()=>{line([[-5.22,1.96,-.65],[-3.58,1.96,-.65]]);line([[-5.25,1.87,-.67],[-3.55,1.87,-.67]])});
    mark(C.r,()=>{const y=3.38;line([[-4.4,y+.08,.14],[-4.34,y,.14],[-4.4,y-.08,.14],[-4.46,y,.14]],true)});
    // Three main turrets along the spine, triple barrels laid forward over the bow.
    for(const x of[-2.2,.4,2.8]){
      mark(C.w,()=>m.loft([[0,.46],[.2,.46],[.34,.37],[.44,.22],[.48,.06]].map(([dy,r])=>m.ringXZ(x,1.16+dy,0,r,r,10)),false,true));
      mark(C.c,()=>{for(const dz of[-.13,0,.13])m.beam([x+.3,1.4,dz],[x+1.75,1.4,dz],.055,.055)});
    }
    // Engines: three bells at the stern.
    const ringX=(x,cy,cz,r,n)=>Array.from({length:n},(_,i)=>{const t=2*PI*i/n;return[x,cy+Math.sin(t)*r,cz+Math.cos(t)*r]});
    mark(C.c,()=>{for(const[cy,cz,r]of[[-.25,-.62,.36],[-.25,.62,.36],[.42,0,.3]])m.loft([ringX(-7.15,cy,cz,r*.8,10),ringX(-7.55,cy,cz,r,10),ringX(-7.95,cy,cz,r*1.18,10)],false,false)});
    const edgeColors=m.e.map((_,i)=>{for(const[a,b,c]of cols)if(i>=a&&i<b)return c;return C.w});
    return{name:'OSD Battlecruiser Resolute',v:m.v,e:m.e,faces:m.faces,edgeColors};
  }
  // Command tower on the roof: tapered armour, a window band, the sensor mast and a radar bar.
  mark(C.w,()=>{
    m.loft([rr(0,.98,.15,1.0,.8),rr(0,1.42,.2,.82,.66),rr(0,1.62,.24,.6,.5)],false,true);
    line([[0,1.62,.24],[0,2.75,.24]]);for(const[y,w]of[[1.95,.26],[2.25,.18],[2.52,.12]])line([[-w,y,.24],[w,y,.24]]);
    line([[.55,1.62,.5],[.55,1.86,.5]]);
  });
  mark(C.c,()=>{line([[-.78,1.36,-.47],[.78,1.36,-.47]]);line([[-.8,1.27,-.48],[.8,1.27,-.48]]);rect(.25,1.86,.85,1.98,.5)});
  mark(C.r,()=>{const y=2.82;line([[0,y+.08,.24],[.06,y,.24],[0,y-.08,.24],[-.06,y,.24]],true);for(const sx of[-1,1])line([[sx*2.62,.74,-1.58],[sx*2.62,.86,-1.5]])});
  // Two roof turrets: domed housings with twin barrels over the front.
  mark(C.w,()=>{for(const sx of[-1,1]){const x=sx*1.75,z=.1,y0=1.0;
    m.loft([[0,.42],[.18,.42],[.32,.34],[.41,.2],[.45,.06]].map(([dy,r])=>m.ringXZ(x,y0+dy,z,r,r,10)),false,true)}});
  mark(C.c,()=>{for(const sx of[-1,1])for(const dx of[-.09,.09])m.beam([sx*1.75+dx,1.26,-.25],[sx*1.75+dx,1.26,-1.25],.05,.05)});
  // Docking arms and two docked OSD patrol drones: angular hulls, swept wings, a tail fin.
  mark(C.w,()=>{for(const sx of[-1,1]){m.beam([sx*3.2,-.18,.5],[sx*4.0,-.18,.5],.12,.12);m.loft([ringZ(sx*3.2,-.18,.5,.16,.16,8),ringZ(sx*3.35,-.18,.5,.11,.11,8)],false,false)}});
  const drone=cx=>{
    mark(C.c,()=>{
      m.loft([[-1.1,.04,.03],[-.7,.24,.12],[.2,.34,.17],[1.05,.28,.14],[1.35,.12,.08]].map(([z,rx,ry])=>ringZ(cx,-.28,z,rx,ry,4,PI/4)),true,true);
      for(const s of[-1,1])line([[cx+s*.26,-.3,.0],[cx+s*1.05,-.34,.85],[cx+s*1.0,-.34,1.15],[cx+s*.24,-.3,1.0]],true);
      line([[cx,-.12,.75],[cx,.22,1.25],[cx,.18,1.38],[cx,-.14,1.3]],true);
    });
    mark(C.r,()=>{for(const s of[-1,1])line([[cx+s*1.05,-.34,.85],[cx+s*1.0,-.34,1.15]])});
  };
  drone(-4.75);drone(4.75);
  const edgeColors=m.e.map((_,i)=>{for(const[a,b,c]of cols)if(i>=a&&i<b)return c;return C.w});
  return{name:'OSD Picket Station 01',v:m.v,e:m.e,faces:m.faces,edgeColors};
}

class FreeTradersDepotController{
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.state='idle';this.t=0;this.stateT=0;this.depot=null;this.mesh=null;
    this.turnRate=0;this.transferT=0;this.dataPackets=[];this.dataSpawnT=0;this.dataDraining=false;
    this.holdT=0;this.turnT=0;this.turnStart=null;this.clearDistance=0;this.navPulse=0;
    this.hatchOpen=0;this.cargoT=0;this.cargoBasis=null
  }
  // v3003 (Dave: you pick up cargo, you should be ending at a cargo hatch). A physical case
  // goes in through the intake hatch below the terminal. Data is uploaded at the terminal.
  // Old saves have no cargoKind: their cargo handoffs (CARGO HANDOFF on the HUD) use the hatch.
  cargoMode(){const k=this.stage?.cargoKind;return k?k==='cargo':this.stage?.transferHud==='CARGO HANDOFF'}
  dockLabel(){return this.cargoMode()?'CARGO INTAKE':'EXTERIOR TERMINAL'}
  // v3005: the same controller flies to the OSD picket for OSD deliveries (stage.facility 'osd').
  osd(){return this.stage?.facility==='osd'||this.cruiser()}
  cruiser(){return this.stage?.facility==='osdCruiser'}
  facilityName(){return this.cruiser()?'OSD BATTLECRUISER RESOLUTE':(this.osd()?'OSD PICKET STATION':'FREE TRADERS FREIGHT DEPOT')}
  shortName(){return this.cruiser()?'RESOLUTE':(this.osd()?'OSD PICKET':'FREIGHT DEPOT')}
  prepare(stage){this.reset();this.active=true;this.stage=stage||{};this.mesh=this.osd()?buildOsdPicketMesh(this.cruiser()?'cruiser':'picket'):buildFreeTradersFreightDepotMesh();return true}
  begin(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    this.active=true;this.stage=stage||{};this.state='approach';this.t=0;this.stateT=0;this.navPulse=0;
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;asteroids.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    shipX=shipY=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;viewYaw=viewPitch=viewRoll=0;
    resetPlanetBearing();resetSpaceDogfightDirector();resetSpaceMotion();
    const distance=Math.max(260,Number(this.stage?.spawnDistance)||430);
    const spawnX=Number(this.stage?.spawnX)||0,spawnY=Number.isFinite(Number(this.stage?.spawnY))?Number(this.stage.spawnY):-4;
    const w=cameraPointToWorld([spawnX,spawnY,distance]);
    this.depot={
      x:w[0],y:w[1],z:w[2],s:Math.max(12,Number(this.stage?.scale)||26),
      rot:[Number(this.stage?.pitch)||0,Number(this.stage?.yaw)||.075,Number(this.stage?.roll)||0]
    };
    audio.music.setMode('calm');   // v2570: the depot is a quiet leg, whatever the mission's base mode
    say(String(this.stage?.startMessage||`${this.facilityName()} AHEAD`).toUpperCase(),.82);return true
  }
  stop(){this.reset()}
  autopilotActive(){return !!(this.active&&['terminalApproach','terminalTransfer','hatchOpen','cargoTransfer','hatchClose','terminalHold','terminalTurn','terminalClear'].includes(this.state))}
  localToWorld(p){
    if(!this.depot||!p)return null;const q=rotate([p[0]*this.depot.s,p[1]*this.depot.s,p[2]*this.depot.s],this.depot.rot);
    return[this.depot.x+q[0],this.depot.y+q[1],this.depot.z+q[2]]
  }
  terminalPoint(){return this.cargoMode()?this.hatchPoint():this.localToWorld([2.16,.065,-1.815])}
  hatchPoint(){return this.localToWorld([2.16,-.6185,-1.63])}
  // where the case comes to rest, inside the hatch
  cargoRestPoint(){return this.localToWorld([2.16,-.645,-1.555])}
  terminalNormal(){return v3norm(rotate([0,0,-1],this.depot?.rot||[0,0,0]))}
  terminalUp(){return v3norm(rotate([0,1,0],this.depot?.rot||[0,0,0]))}
  terminalStopPoint(){
    const p=this.terminalPoint(),n=this.terminalNormal(),d=this.cargoMode()?Math.max(9,Number(this.stage?.hatchStandOff)||13):Math.max(10,Number(this.stage?.terminalStandOff)||15.5);return p?v3add(p,v3scale(n,d)):null
  }
  terminalStagePoint(){
    const p=this.terminalPoint(),n=this.terminalNormal(),d=Math.max(62,Number(this.stage?.terminalStageDistance)||82);return p?v3add(p,v3scale(n,d)):null
  }
  depotNavPoint(){return this.localToWorld([0,0,-2.40])}
  depotMarkerPoint(){return this.localToWorld([0,1.20,-2.40])}
  distanceTo(p){return p?Math.hypot(p[0]-shipX,p[1]-shipY,p[2]):Infinity}
  shiftDepot(delta){if(!this.depot||!delta)return;this.depot.x-=delta[0];this.depot.y-=delta[1];this.depot.z-=delta[2]}
  moveWithPlayer(dt){
    const speed=OPEN_SPACE_CRUISE;this.shiftDepot([spaceMoveX*speed*dt,spaceMoveY*speed*dt,spaceMoveZ*speed*dt])
  }
  alignTo(point,dt,maxRate=1.25){return steerExteriorAutopilot(this,point,dt,maxRate)}
  beginTerminalApproach(){
    if(!this.active)return false;this.state='terminalApproach';this.stateT=0;this.turnRate=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    // v2170: hand over at the speed the drone was already flying, so the autopilot does
    // not open with a dead stop.
    ensureSpaceOrientation();this.autoVel=v3scale(spaceForward,OPEN_SPACE_CRUISE);
    laserBurstRemaining=0;endLaserTrigger();say(`AUTOPILOT · ${this.dockLabel()}`,.68);return true
  }
  updateTerminalApproach(dt){
    const stop=this.terminalStopPoint(),terminal=this.terminalPoint();if(!stop||!terminal)return;
    const auto=updateExteriorTargetAutopilot(this,terminal,stop,d=>this.shiftDepot(d),dt,{smooth:true,maxSpeed:15,minSpeed:4.5,speedScale:1.9});
    if(auto.arrived){if(this.cargoMode()){this.state='hatchOpen';this.stateT=0;say('CARGO INTAKE OPENING',.62)}else this.beginTransfer()}
  }
  updateHatchOpen(dt){
    this.hatchOpen=ease(clamp(this.stateT/.82,0,1));
    if(this.hatchOpen>=.999){
      this.hatchOpen=1;this.state='cargoTransfer';this.stateT=0;this.cargoT=0;
      // the case keeps the drone's own orientation all the way in, as at the station pads
      this.cargoBasis=[cameraVectorToWorld([1,0,0]),cameraVectorToWorld([0,1,0]),cameraVectorToWorld([0,0,1])];
      say(String(this.stage?.transferMessage||'Handing over the cargo').toUpperCase(),.72)
    }
  }
  cargoProgress(){return ease(clamp((this.cargoT-.3)/Math.max(1.6,Number(this.stage?.transferSeconds)||3.1),0,1))}
  updateCargoTransfer(dt){
    this.cargoT+=dt;
    if(this.cargoProgress()>=.999){
      SoundFX.objectiveComplete();audio.playVoice(this.stage?.completeVoice||'deliveryComplete',{once:false,priority:true});
      this.state='terminalHold';this.holdT=0;this.stateT=0
    }
  }
  updateHatchClose(dt){
    this.hatchOpen=1-ease(clamp(this.stateT/.74,0,1));
    if(this.stateT>=.74){this.hatchOpen=0;this.beginTurn()}
  }
  beginTransfer(){
    this.state='terminalTransfer';this.stateT=0;this.transferT=0;this.dataPackets.length=0;this.dataSpawnT=.08;this.dataDraining=false;
    for(let i=0;i<5;i++)this.dataPackets.push(...stationHack.makeDataPacketGroup(true));
    audio?.hackChirp?.start?.();say(String(this.stage?.transferMessage||(this.stage?.transferHud==='CARGO HANDOFF'?'Handing over the cargo':'Transmitting flight recorder data')).toUpperCase(),.78);return true
  }
  updateTransfer(dt){
    this.transferT+=dt;const seconds=Math.max(1.6,Number(this.stage?.transferSeconds)||3.1);
    for(let i=this.dataPackets.length-1;i>=0;i--){const p=this.dataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.dataPackets.splice(i,1)}
    if(this.transferT>=seconds)this.dataDraining=true;
    if(!this.dataDraining){this.dataSpawnT-=dt;while(this.dataSpawnT<=0&&this.dataPackets.length<18){this.dataPackets.push(...stationHack.makeDataPacketGroup(false));this.dataSpawnT+=.14+Math.random()*.34}}
    // v2170: done at most .6 s after the upload time, not after every packet still in
    // flight has landed (that left the drone sitting there for a second or two more).
    if(!this.dataDraining||(this.dataPackets.length&&this.transferT<seconds+.6))return;this.dataPackets.length=0;
    audio?.hackChirp?.stop?.();SoundFX.relayCalibrated?.();audio.playVoice(this.stage?.completeVoice||'dataTransferComplete',{once:false,priority:true});
    this.state='terminalHold';this.holdT=0;this.stateT=0
  }
  beginTurn(){
    ensureSpaceOrientation();this.state='terminalTurn';this.turnT=0;this.stateT=0;this.turnStart={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp]};return true
  }
  updateTurn(dt){
    this.turnT+=dt;const seconds=Math.max(1.25,Number(this.stage?.turnSeconds)||1.75),u=clamp(this.turnT/seconds,0,1),q=ease(u),st=this.turnStart;
    if(st){spaceForward=rotateAroundAxis(st.f,st.u,Math.PI*q);spaceRight=rotateAroundAxis(st.r,st.u,Math.PI*q);spaceUp=[...st.u];orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=-Math.sin(u*Math.PI)*.08}
    if(u>=1){viewRoll=0;this.state='terminalClear';this.clearDistance=0;this.stateT=0;this.turnStart=null}
  }
  updateClear(dt){
    const speed=OPEN_SPACE_CRUISE,delta=[spaceForward[0]*speed*dt,spaceForward[1]*speed*dt,spaceForward[2]*speed*dt];this.shiftDepot(delta);this.clearDistance+=speed*dt;
    if(this.clearDistance>=Math.max(34,Number(this.stage?.clearDistance)||52)){this.state='complete';SoundFX.objectiveComplete();scenarioFlow.completeCurrentStage()}
  }
  update(dt){
    if(!this.active||mode!=='play')return;this.t+=dt;this.stateT+=dt;this.navPulse+=dt;
    if(this.state==='approach'){
      this.moveWithPlayer(dt);const centre=this.depotNavPoint(),d=this.distanceTo(centre);
      if(d<Math.max(150,Number(this.stage?.depotRevealRadius)||205)){this.state='terminalNav';this.stateT=0;say(this.osd()?`${this.cruiser()?'RESOLUTE':'PICKET'} CONTROL · CLEARED TO ${this.dockLabel()}`:`PROCEED TO ${this.dockLabel()}`,.78);SoundFX.objectiveComplete()}
      return
    }
    if(this.state==='terminalNav'){
      this.moveWithPlayer(dt);const stage=this.terminalStagePoint(),centre=this.depotNavPoint(),d=Math.min(this.distanceTo(stage),this.distanceTo(centre));
      if(d<Math.max(58,Number(this.stage?.terminalCaptureRadius)||86))this.beginTerminalApproach();return
    }
    if(this.state==='terminalApproach'){this.updateTerminalApproach(dt);return}
    if(this.state==='terminalTransfer'){this.updateTransfer(dt);return}
    // v2170: turn away after a beat while the confirmation is still being spoken, rather
    // than holding still until the line has finished.
    if(this.state==='hatchOpen'){this.updateHatchOpen(dt);return}
    if(this.state==='cargoTransfer'){this.updateCargoTransfer(dt);return}
    if(this.state==='hatchClose'){this.updateHatchClose(dt);return}
    if(this.state==='terminalHold'){this.holdT+=dt;if(this.holdT>.6){if(this.cargoMode()){this.state='hatchClose';this.stateT=0}else this.beginTurn()}return}
    if(this.state==='terminalTurn'){this.updateTurn(dt);return}
    if(this.state==='terminalClear'){this.updateClear(dt);return}
  }
  meshDepth(){
    if(!this.depot||!this.mesh?.v?.length)return null;const d=[];
    for(const p of this.mesh.v){const r=rotate([p[0]*this.depot.s,p[1]*this.depot.s,p[2]*this.depot.s],this.depot.rot),q=camPoint([this.depot.x+r[0],this.depot.y+r[1],this.depot.z+r[2]]);if(q[2]>.18)d.push(q[2])}
    if(!d.length)return null;d.sort((a,b)=>a-b);return d[(d.length/2)|0]
  }
  drawTerminalDisplay(){
    if(!this.depot)return;const z=-1.804,left=1.94,right=2.38,bottom=-.07,top=.20;
    stationHack.drawLineDisplay((x,y)=>proj(this.localToWorld([x,y,z])),{left,right,bottom,top,alarm:false,time:this.t})
  }
  drawTransfer(){
    if(this.state!=='terminalTransfer')return;const p=this.terminalPoint();if(!p)return;const target=camPoint(p);if(target&&target[2]>.2)stationHack.drawDataRamp([0,-.62,.82],target,this.dataPackets,{sourceHalf:.88,targetHalf:.34})
  }
  // A quad on the depot's front wall, in local depot units, at depth z.
  hatchQuad(x0,y0,x1,y1,z){return[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>proj(this.localToWorld([x,y,z])))}
  frontWallFacing(){
    const p=this.hatchPoint(),n=this.terminalNormal();if(!p||!n)return false;const c=camPoint(p),t=camPoint(v3add(p,n));if(!c||!t||c[2]<=.2)return false;
    return (t[0]-c[0])*c[0]+(t[1]-c[1])*c[1]+(t[2]-c[2])*c[2]<0
  }
  drawHatch(){
    if(!this.frontWallFacing())return;
    const x0=2.09,x1=2.23,y0=-.665,y1=-.572,z=-1.627,q=clamp(this.hatchOpen,0,1);
    if(q>.001){
      // the recess behind the doors, where the case comes to rest
      const mouth=this.hatchQuad(x0,y0,x1,y1,z),back=this.hatchQuad(x0+.015,y0+.012,x1-.015,y1-.012,-1.50);
      if(mouth.every(Boolean)&&back.every(Boolean)){
        ctx.fillStyle='#000';fillPoly(mouth);
        for(let i=0;i<4;i++)line(mouth[i].x,mouth[i].y,back[i].x,back[i].y,C.c,1,.66);
        for(let i=0;i<4;i++)line(back[i].x,back[i].y,back[(i+1)%4].x,back[(i+1)%4].y,C.c,1,.56)
      }
    }
    if(this.state==='cargoTransfer'||this.state==='terminalHold'||this.state==='hatchClose')this.drawCargo();
    // two leaves that slide apart sideways into the wall, as on the Helix intake: they are
    // clipped to the opening, so they vanish into the frame rather than over the wall
    const mid=(x0+x1)/2,half=(x1-x0)/2,mouth=this.hatchQuad(x0,y0,x1,y1,z);if(!mouth.every(Boolean))return;
    ctx.save();ctx.beginPath();ctx.moveTo(mouth[0].x,mouth[0].y);for(let i=1;i<4;i++)ctx.lineTo(mouth[i].x,mouth[i].y);ctx.closePath();ctx.clip();
    for(const side of[-1,1]){
      const inner=mid+side*half*q,outer=mid+side*half*(1+q);
      const leaf=this.hatchQuad(Math.min(inner,outer),y0,Math.max(inner,outer),y1,z-.004);if(!leaf.every(Boolean))continue;
      ctx.fillStyle='#000';fillPoly(leaf);for(let i=0;i<4;i++)line(leaf[i].x,leaf[i].y,leaf[(i+1)%4].x,leaf[(i+1)%4].y,C.c,1,.94)
    }
    ctx.restore()
  }
  drawCargo(){
    const q=this.state==='cargoTransfer'?this.cargoProgress():1,target=this.cargoRestPoint(),origin=cameraPointToWorld([0,-.34,1.05]);if(!target)return;
    const w=[lerp(origin[0],target[0],q),lerp(origin[1],target[1],q),lerp(origin[2],target[2],q)],cp=proj(w);
    if(this.state==='cargoTransfer'&&q>0&&q<.995&&cp){
      // the same bowed cyan tractor waves as every other delivery, from the bottom of the view
      const op={x:W*.5,y:viewH-4},dx=cp.x-op.x,dy=cp.y-op.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,flow=(this.cargoT*.75)%1;
      ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.70;
      for(let i=0;i<7;i++){const t=.10+(((i/7)+flow)%1)*.82,cx=lerp(op.x,cp.x,t),cy=lerp(op.y,cp.y,t),half=lerp(8,Math.min(34,10+len*.055),t),bow=lerp(5,18,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}
      ctx.restore()
    }
    const b=this.cargoBasis||[cameraVectorToWorld([1,0,0]),cameraVectorToWorld([0,1,0]),cameraVectorToWorld([0,0,1])],sx=.51,sy=.11,sz=.35;
    const mesh={v:courierFixtureBoxMesh.v.map(v=>{const lx=v[0]*sx,ly=v[1]*sy,lz=v[2]*sz;return[b[0][0]*lx+b[1][0]*ly+b[2][0]*lz,b[0][1]*lx+b[1][1]*ly+b[2][1]*lz,b[0][2]*lx+b[1][2]*ly+b[2][2]*lz]}),e:courierFixtureBoxMesh.e,faces:courierFixtureBoxMesh.faces};
    drawMesh({type:'depotCargo',x:w[0],y:w[1],z:w[2],s:1,mx:1,my:1,mz:1,rot:[0,0,0]},mesh,q>=.995?C.y:C.c,.98)
  }
  appendScene(scene){
    if(!this.active||!this.depot||this.state==='complete'||!this.mesh)return;const d=this.meshDepth();if(d==null)return;
    scene.push({z:d,draw:()=>{drawMesh(this.depot,this.mesh,C.y,.96);this.drawTerminalDisplay();this.drawHatch();this.drawTransfer()}})
  }
  markerTarget(){
    // Keep the depot approach label above the roofline.  The canonical Free
    // Traders bird has a protected fascia and should never have HUD copy written
    // across it as the station fills the screen.
    if(this.state==='approach')return{point:this.depotMarkerPoint(),label:this.shortName(),size:13,grow:true,growRange:230,maxSize:23};
    if(this.state==='terminalNav')return{point:this.terminalStagePoint(),label:this.cargoMode()?'CARGO INTAKE':'TERMINAL',size:13,grow:true,growRange:120,maxSize:22};
    return null
  }
  drawMarker(){
    if(!this.active||mode!=='play'||this.autopilotActive())return;const t=this.markerTarget();if(!t?.point)return;const q=camPoint(t.point);let r=t.size||13;
    if(t.grow&&q[2]>.15){const d=this.distanceTo(t.point),gr=Math.max(20,t.growRange||120),mx=Math.max(r,t.maxSize||22);r=clamp(r+(gr-d)*(mx-r)/gr,r,mx)}
    let p=null,on=false;if(q[2]>.15){p=projectCam(q);on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH)}if(!on)p=hudEdgeCue(q,r);if(!p)return;
    const col=C.y,x=p.x,y=p.y;line(x-r,y,x,y-r,col,1.2,.96);line(x,y-r,x+r,y,col,1.2,.96);line(x+r,y,x,y+r,col,1.2,.96);line(x,y+r,x-r,y,col,1.2,.96);drawHudMarkerLabel(t.label,x,y,r,col)
  }
  hudLeft(){return this.active?this.facilityName():''}
  hudRight(){
    if(!this.active)return'';
    if(this.state==='terminalApproach')return`AUTOPILOT · ${this.cargoMode()?'CARGO INTAKE':'TERMINAL'}`;
    if(this.state==='hatchOpen')return'CARGO INTAKE OPENING';
    if(this.state==='cargoTransfer')return`${this.stage?.transferHud||'CARGO HANDOFF'} ${Math.round(this.cargoProgress()*100)}%`;
    if(this.state==='hatchClose')return'CARGO INTAKE CLOSING';
    if(this.state==='terminalTransfer')return`${this.stage?.transferHud||'DATA UPLOAD'} ${Math.round(clamp(this.transferT/Math.max(1.6,Number(this.stage?.transferSeconds)||3.1),0,1)*100)}%`;
    if(this.state==='terminalHold')return this.stage?.receivedHud||(this.cargoMode()?'CARGO RECEIVED':'DATA RECEIVED');
    if(this.state==='terminalTurn')return'TURNAROUND';
    if(this.state==='terminalClear')return`CLEARING ${this.cruiser()?'RESOLUTE':(this.osd()?'PICKET':'DEPOT')}`;
    const t=this.markerTarget();return t?.point?`${t.label} ${Math.round(this.distanceTo(t.point))}`:''
  }
}
