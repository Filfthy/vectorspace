'use strict';
// v3009 STACKS, v3013 CANYON RUN (Dave: bluffs and stacks, meant to be like the forest or the
// tunnels). Two parts.
//  1. On orange worlds that are not volcanic, buttes and ragged spires stand out on the plains
//     approach (like the stampede promo). They are solid: hitting one costs a shield.
//  2. The canyon run: a corridor like the forest run, flown low down a narrow winding canyon
//     walled by bluffs and stacks, with spires to steer round, rockfalls to climb over and
//     natural arches to dive under. It ends in a basin with the job's destination in it. The
//     plains approach to it ends at a line of bluffs with the canyon mouth cut through it
//     (destination 'canyon').
// Everything is line work over black faces, so rock hides what is behind it.
(()=>{
function rng(seed){let s=seed>>>0||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}

// ---------- Meshes ----------
// A butte (cliffed tower on a scree slope) or a spire, as rings of an uneven outline, base at
// y 0. ex stretches it along its own x, then it is turned by yaw.
function stackMesh(kind,R,b,h,ex,yaw,r){
  const spire=kind==='spire',n=spire?7:12,rad=Array.from({length:n},()=>.84+r()*.32);
  for(let k=0;k<2;k++)for(let i=0;i<n;i++)rad[i]=(rad[i]*2+rad[(i+1)%n]+rad[(i+n-1)%n])/4;
  // A spire is a ragged column, not a cone: it narrows only a little, leans, and each band of
  // it sits a touch off the one below. Its top is broken off flat.
  const prof=spire?[[2.7,0],[1.75,b*.55],[1.08,b],[1,b+h*.3],[.9,b+h*.62],[.82,b+h*.86],[.74,b+h]]:[[2.05,0],[1.55,b*.38],[1.16,b*.78],[1,b],[.96,b+h]];
  const la=r()*6.28,lean=spire?R*(.4+r()*.5):0,ring=prof.map(([k,y],j)=>{const up=Math.max(0,y-b)/h,jx=j>2?(r()-.5)*R*.3:0,jz=j>2?(r()-.5)*R*.3:0;
    return{k:k*(j>2?.9+r()*.2:1),y,ox:Math.cos(la)*lean*up+jx,oz:Math.sin(la)*lean*up+jz}});
  const cy=Math.cos(yaw),sy=Math.sin(yaw),v=[],e=[],faces=[],ec=[];
  for(const q of ring)for(let i=0;i<n;i++){const a=i/n*6.2832,x=Math.cos(a)*R*q.k*rad[i]*ex+q.ox,z=Math.sin(a)*R*q.k*rad[i]+q.oz;v.push([x*cy+z*sy,q.y,-x*sy+z*cy])}
  const at=(ring,i)=>ring*n+(i%n),E=(a,b,col)=>{e.push([a,b]);ec.push(col)},foot=spire?2:3,top=prof.length-1;
  for(let k=0;k<prof.length-1;k++)for(let i=0;i<n;i++)faces.push([at(k,i),at(k,i+1),at(k+1,i+1),at(k+1,i)]);
  faces.push(Array.from({length:n},(_,i)=>at(top,i)));
  // v3014 (Dave: missing edges). Every upright is drawn. A rock's outline is always one of
  // them, so with only some drawn the edge of a cliff vanished whenever it fell on a bare side.
  for(let i=0;i<n;i++){
    E(at(0,i),at(0,i+1),C.o);E(at(foot,i),at(foot,i+1),C.o);E(at(top,i),at(top,i+1),C.o);
    for(let k=0;k<foot;k++)E(at(k,i),at(k+1,i),C.y);
    if(spire)E(at(4,i),at(4,i+1),C.y);
    for(let k=foot;k<top;k++)E(at(k,i),at(k+1,i),C.o)
  }
  // Two strata bands on a butte's cliff, a vertex on each upright so they lie on its faces.
  if(!spire){const base=v.length,fr=[.34+r()*.08,.64+r()*.08],ph=r()*6;
    fr.forEach((q,j)=>{for(let i=0;i<n;i++){const A=v[at(foot,i)],B=v[at(top,i)],w=q+Math.sin(i*1.7+ph+j)*.05;v.push([lerp(A[0],B[0],w),lerp(A[1],B[1],w),lerp(A[2],B[2],w)])}
      for(let i=0;i<n;i++)E(base+j*n+i,base+j*n+(i+1)%n,C.y)})}
  return{v,e,faces,edgeColors:ec}
}
// A closed, slightly irregular box from its eight corners (bottom four then top four), for
// arches and the hideout. Each face is convex, so hidden lines come out right.
function blockInto(m,c,col,strata){
  const b=m.v.length;for(const p of c)m.v.push(p);
  m.faces.push([b,b+3,b+2,b+1],[b+4,b+5,b+6,b+7],[b,b+1,b+5,b+4],[b+1,b+2,b+6,b+5],[b+2,b+3,b+7,b+6],[b+3,b,b+4,b+7]);
  for(const[a,d]of[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]){m.e.push([b+a,b+d]);m.edgeColors.push(col)}
  if(strata){const s=m.v.length;for(let k=0;k<4;k++){const A=c[k],B=c[k+4];m.v.push([lerp(A[0],B[0],strata),lerp(A[1],B[1],strata),lerp(A[2],B[2],strata)])}
    for(let k=0;k<4;k++){m.e.push([s+k,s+(k+1)%4]);m.edgeColors.push(C.y)}}
}
const box=(x0,x1,y0,y1,z0,z1,j=0,r=Math.random)=>{const J=()=>(r()-.5)*j;
  return[[x0+J(),y0,z0+J()],[x1+J(),y0,z0+J()],[x1+J(),y0,z1+J()],[x0+J(),y0,z1+J()],[x0+J(),y1+J(),z0+J()],[x1+J(),y1+J(),z0+J()],[x1+J(),y1+J(),z1+J()],[x0+J(),y1+J(),z1+J()]]};
// A natural arch across the canyon: a worn rock span on a rough leg at each bank. The underside
// is `under` above the floor at the lane's edges and a little higher in the middle. Lane centre
// at x 0.
function mergeInto(m,src,ox,oz){const b=m.v.length;for(const v of src.v)m.v.push([v[0]+ox,v[1],v[2]+oz]);for(const f of src.faces)m.faces.push(f.map(k=>k+b));src.e.forEach((e,k)=>{m.e.push([e[0]+b,e[1]+b]);m.edgeColors.push(src.edgeColors[k])})}
function archMesh(half,under,r){
  const m={v:[],e:[],faces:[],edgeColors:[]},L=half+2.6,bow=.45,ry=.75+r()*.35,rz=1.3+r()*.4,K=8,N=Math.ceil(2*L/1.25);
  // The span: rings of an uneven eight-sided section strung across, thicker where it meets the legs.
  const ringAt=[];
  for(let j=0;j<=N;j++){const x=lerp(-L,L,j/N),u=x/L,thick=1+.55*u*u,cy=under+bow*(1-u*u)+ry*thick,b=m.v.length;ringAt.push(b);
    for(let i=0;i<K;i++){const a=i/K*6.2832,k=.85+r()*.3;m.v.push([x+(r()-.5)*.25,cy+Math.sin(a)*ry*thick*k,Math.cos(a)*rz*thick*k])}}
  for(let j=0;j<N;j++)for(let i=0;i<K;i++){const a=ringAt[j],c=ringAt[j+1];m.faces.push([a+i,a+(i+1)%K,c+(i+1)%K,c+i])}
  m.faces.push(Array.from({length:K},(_,i)=>ringAt[0]+K-1-i),Array.from({length:K},(_,i)=>ringAt[N]+i));
  for(let j=0;j<N;j++)for(let i=0;i<K;i++){m.e.push([ringAt[j]+i,ringAt[j+1]+i]);m.edgeColors.push(i===6?C.y:C.o)}
  for(let j=0;j<=N;j+=2)for(let i=0;i<K;i++){m.e.push([ringAt[j]+i,ringAt[j]+(i+1)%K]);m.edgeColors.push(C.o)}
  // The legs: short buttes on each bank, up into the ends of the span.
  for(const sg of[-1,1]){const R=1.25+r()*.4,top=under+ry*3.1;mergeInto(m,stackMesh('butte',R,.9,top-.9,1.25,Math.PI/2,r),sg*(half+.35+2.05*R*.9),0)}
  return m
}
// A rounded boulder: rings of an uneven nine-sided outline, wide at the shoulder and capped,
// added into m at (cx,cz).
function boulderInto(m,cx,cz,R,h,r){
  const n=9,rad=Array.from({length:n},()=>.78+r()*.4),prof=[[.92,0],[1.08,.38],[.86,.76],[.42,1]],b=m.v.length,sx=.9+r()*.4,sz=.75+r()*.3;
  for(const[k,y]of prof)for(let i=0;i<n;i++){const a=i/n*6.2832+r()*.12;m.v.push([cx+Math.cos(a)*R*k*rad[i]*sx,y*h,cz+Math.sin(a)*R*k*rad[i]*sz])}
  const at=(j,i)=>b+j*n+(i%n);
  for(let j=0;j<prof.length-1;j++)for(let i=0;i<n;i++)m.faces.push([at(j,i),at(j,i+1),at(j+1,i+1),at(j+1,i)]);
  m.faces.push(Array.from({length:n},(_,i)=>at(prof.length-1,i)));
  for(let i=0;i<n;i++){for(const j of[0,1,3]){m.e.push([at(j,i),at(j,i+1)]);m.edgeColors.push(j===1?C.y:C.o)}for(let j=0;j<3;j++){m.e.push([at(j,i),at(j+1,i)]);m.edgeColors.push(C.o)}}
}
// A low rockfall across part of the lane: a heap of boulders to climb over.
function rockfallMesh(w,r){
  const m={v:[],e:[],faces:[],edgeColors:[]},n=3+Math.floor(r()*2);
  for(let i=0;i<n;i++){const cx=lerp(-w,w,(i+.5)/n)+(r()-.5)*.4,R=w/n+.3+r()*.25;boulderInto(m,cx,(r()-.5)*1.2,R,.8+r()*.4,r)}
  // A few smaller stones scattered round the heap.
  for(let i=0;i<3;i++)boulderInto(m,(r()-.5)*w*2.2,(r()<.5?-1:1)*(1.4+r()*1.2),.3+r()*.25,.3+r()*.2,r);
  return m
}
// The Red Jackal hideout at the head of the canyon: a blast door framed into the rock, a pad
// in front of it, crates along the wall and a mast. Faces the drone (-z); its back is flush
// with the bluffs behind it. deliveryPoint is the pad.
// v3021 (Dave: a log hut would not have a terminal, we need other types of facility). A data
// terminal on a pedestal, its screen tilted up toward the drone, facing -z at (x,z). Returns the
// middle of the screen, where the data comes from.
function terminalInto(m,x,z){
  blockInto(m,box(x-.24,x+.24,0,1.05,z-.2,z+.2),C.w,0);
  const c=[[x-.6,1.0,z-.42],[x+.6,1.0,z-.42],[x+.6,1.0,z+.28],[x-.6,1.0,z+.28],[x-.6,1.95,z-.02],[x+.6,1.95,z-.02],[x+.6,1.95,z+.34],[x-.6,1.95,z+.34]];
  blockInto(m,c,C.w,0);
  // The screen on the sloping front, with lines of readout on it.
  const at=(u,w)=>[lerp(x-.5,x+.5,u),lerp(1.1,1.85,w),lerp(z-.43,z-.05,w)];
  const quad=[at(0,0),at(1,0),at(1,1),at(0,1)];let b=m.v.length;for(const p of quad)m.v.push(p);
  for(let i=0;i<4;i++){m.e.push([b+i,b+(i+1)%4]);m.edgeColors.push(C.c)}
  for(const w of[.28,.5,.72]){b=m.v.length;m.v.push(at(.12,w),at(w===.5?.6:.84,w));m.e.push([b,b+1]);m.edgeColors.push(C.c)}
  return at(.5,.5)
}
// A dish on a mast top at (x,y,z), facing up and toward -z.
function dishInto(m,x,y,z,R){
  const b=m.v.length,n=10;for(let i=0;i<n;i++){const a=i/n*6.2832;m.v.push([x+Math.cos(a)*R,y+.35+Math.sin(a)*R*.5,z-.2+Math.sin(a)*R*.3])}
  for(let i=0;i<n;i++){m.e.push([b+i,b+(i+1)%n]);m.edgeColors.push(C.w)}
  const c=m.v.length;m.v.push([x,y,z],[x,y+.6,z-.9]);m.e.push([c,c+1]);m.edgeColors.push(C.w);
  for(const i of[0,3,6]){m.e.push([b+i,c+1]);m.edgeColors.push(C.w)}
}
// A lattice mast of four legs, base at (x,z).
function mastInto(m,x,z,H,w0=.7){
  const b=m.v.length,lv=[0,H*.35,H*.7,H],w=y=>w0-y/H*w0*.6;
  for(const y of lv)for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])m.v.push([x+sx*w(y),y,z+sz*w(y)]);
  for(let k=0;k<lv.length;k++){const q=b+k*4;for(let i=0;i<4;i++){m.e.push([q+i,q+(i+1)%4]);m.edgeColors.push(C.w);if(k<lv.length-1){m.e.push([q+i,q+4+i],[q+i,q+4+(i+1)%4]);m.edgeColors.push(C.w,C.w)}}}
}
// THE FOREST FIELD STATION: a prefab lab module on a concrete pad, solar panels on its roof, a
// lattice mast with a dish, and a data terminal out front. Faces the drone (-z).
function fieldStationMesh(){
  const r=rng(0x46535431),m={v:[],e:[],faces:[],edgeColors:[]};
  blockInto(m,box(-5.6,5.6,0,.3,-3.3,3.5),C.w,0);                       // pad
  blockInto(m,box(-4.6,.6,.3,3.2,-1.2,2.8),C.w,0);                      // lab module
  blockInto(m,box(-4.9,.9,3.2,3.45,-1.5,3.1),C.w,0);                    // roof
  const L=(pts,col)=>{const b=m.v.length;for(const p of pts)m.v.push(p);for(let i=0;i<pts.length-1;i++){m.e.push([b+i,b+i+1]);m.edgeColors.push(col)}};
  L([[-3.9,.3,-1.21],[-3.9,2.45,-1.21],[-2.9,2.45,-1.21],[-2.9,.3,-1.21]],C.w);            // door
  L([[-1.8,1.5,-1.21],[-1.8,2.45,-1.21],[-.2,2.45,-1.21],[-.2,1.5,-1.21],[-1.8,1.5,-1.21]],C.c);   // window
  // Two solar panels on the roof, each a frame with cells ruled across it.
  for(const x0 of[-4.4,-2.0]){const x1=x0+2,y0=3.5,y1=4.3,z0=-1.0,z1=1.8;L([[x0,y0,z0],[x1,y0,z0],[x1,y1,z1],[x0,y1,z1],[x0,y0,z0]],C.c);
    for(let i=1;i<4;i++){const t=i/4;L([[x0,lerp(y0,y1,t),lerp(z0,z1,t)],[x1,lerp(y0,y1,t),lerp(z0,z1,t)]],C.c)}L([[x0+1,y0,z0],[x0+1,y1,z1]],C.c)}
  mastInto(m,3.6,2.2,9);dishInto(m,3.6,9.1,2.2,1.1);
  for(let i=0;i<2;i++){const x=-5.1+i*.9;blockInto(m,box(x,x+.7,.3,1.4,3.0,3.4,0,r),C.w,0)}   // tanks at the back
  m.consolePoint=terminalInto(m,2.6,-1.9);m.deliveryPoint=[-.6,.45,-2.4];
  return m
}
globalThis.AgentXFacility={fieldStationMesh};
function hideoutMesh(r,station=false){
  const m={v:[],e:[],faces:[],edgeColors:[]},Z=4.2;
  blockInto(m,box(-4.9,-3.1,0,7.6,Z-2.4,Z,0,r),C.y,0);blockInto(m,box(3.1,4.9,0,7.6,Z-2.4,Z,0,r),C.y,0);blockInto(m,box(-3.1,3.1,5.4,7.6,Z-2.2,Z,0,r),C.y,0);
  // The door, set back in the frame, with its slats.
  let b=m.v.length;m.v.push([-3.1,0,Z-.5],[3.1,0,Z-.5],[3.1,5.4,Z-.5],[-3.1,5.4,Z-.5]);m.faces.push([b,b+1,b+2,b+3]);
  for(const[a,d]of[[0,3],[3,2],[2,1]]){m.e.push([b+a,b+d]);m.edgeColors.push(C.o)}
  for(let i=1;i<6;i++){b=m.v.length;m.v.push([-3.1,i*.9,Z-.55],[3.1,i*.9,Z-.55]);m.e.push([b,b+1]);m.edgeColors.push(C.o)}
  // Crates either side, some stacked.
  if(station){m.consolePoint=terminalInto(m,4.4,Z-3.6);for(let i=0;i<2;i++)blockInto(m,box(5.6+i*1.3,6.7+i*1.3,0,2.3,Z-1.8,Z-.4),C.w,0)}
  for(const sg of(station?[-1]:[-1,1]))for(let i=0;i<3;i++){const s=.75+r()*.35,x=sg*(6+i*1.9),z=Z-1.2-r()*.8;blockInto(m,box(x-s,x+s,0,s*2,z-s,z+s,.1,r),C.y,0);
    if(r()<.5){const t=s*.7;blockInto(m,box(x-t,x+t,s*2,s*2+t*2,z-t,z+t,.1,r),C.y,0)}}
  // The pad: a ring of eight with a cross, flat on the ground (lines only).
  const pz=-1.4,R=3.4;b=m.v.length;for(let i=0;i<8;i++){const a=(i+.5)/8*6.2832;m.v.push([Math.cos(a)*R,.04,pz+Math.sin(a)*R])}
  for(let i=0;i<8;i++){m.e.push([b+i,b+(i+1)%8]);m.edgeColors.push(C.r)}m.e.push([b,b+4],[b+2,b+6]);m.edgeColors.push(C.r,C.r);
  // A lattice mast beside the door.
  const mx=-8.4,mz=Z-1.6;b=m.v.length;const lv=[0,3,6,8.5],w=y=>.7-y*.05;
  for(const y of lv)for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])m.v.push([mx+sx*w(y),y,mz+sz*w(y)]);
  for(let k=0;k<lv.length;k++){const q=b+k*4;for(let i=0;i<4;i++){m.e.push([q+i,q+(i+1)%4]);m.edgeColors.push(C.w);if(k<lv.length-1){m.e.push([q+i,q+4+i],[q+i,q+4+(i+1)%4]);m.edgeColors.push(C.w,C.w)}}}
  if(station)dishInto(m,mx,8.9,mz,1.0);
  m.deliveryPoint=[0,.9,pz];m.lampPoints=[[-3.6,8,Z-1.2],[3.6,8,Z-1.2]];m.beaconPoint=[mx,9.4,mz];
  return m
}

// ---------- 1. Stacks on the plains approach ----------
const P=SurfaceDestinationApproachController.prototype;
// Which landings get stacks: orange, arid (not volcanic) planet plains on a real job, flying to
// a city, a forest or the canyon. Never on rocks, swamps, the OSD compound, bunkers, moons or
// training.
P.stackWorld=function(){
  const st=this.stage||{},m=typeof campaign!=='undefined'?campaign.currentMission:null;
  if(this.terrain!=='plains'||this.scenery!=='forest'||st.worldScenery===false||!m||m.training||m.devGroundTest)return false;
  if(!(this.destination==='city'||this.destination==='forest'||this.destination==='canyon')||planetLandingBody==='moon')return false;
  return surfaceWorldKind()==='arid'&&landingWorldColour()===C.o
};
P.setupStacks=function(){this.stacks=[];this.stackField=this.stackWorld()};
// After the plains scenery: groups of stacks, a butte with a spire beside it (a mitten and its
// thumb), a long mesa, a lone butte or a cluster of spires, clear of the route.
P.stacksDress=function(){
  if(!this.stackField)return;
  const r=rng(Math.random()*4294967296),X=this.targetX,L=this.targetWorldZ;
  const clearOf=(x,z,R)=>{
    if(Math.abs(x-X)<R+62||Math.hypot(x-X,z-L)<R+110||Math.hypot(x,z)<R+40)return false;
    if(this.sceneryReserved(x,z,R))return false;
    return this.stacks.every(s=>Math.hypot(s.x-x,s.worldZ-z)>s.foot+R+8)
  };
  const add=(kind,x,z,R,b,h,ex,yaw)=>{
    if(kind==='butte')b=Math.max(b,h*(.3+r()*.12));   // a broad scree slope, as in Monument Valley
    const mesh=stackMesh(kind,R,b,h,ex,yaw,r),ky=kind==='spire'?3:2.05,foot=R*ky*Math.max(ex,1)*1.16;
    // Collision outline at flying height (about 3 up): between the base and the first ring.
    const k3=kind==='spire'?lerp(3,2,clamp(3/(b*.6),0,1)):lerp(2.05,1.55,clamp(3/(b*.38),0,1));
    this.stacks.push({kind,x,worldZ:z,R,b,h,ex,yaw,mesh,foot,hitA:R*k3*ex*.94,hitB:R*k3*.94})
  };
  const group=(x,z,big)=>{
    const t=r(),S=big?1.35:1;
    if(t<.34){const R=(7+r()*4)*S,yaw=r()*6.28;if(!clearOf(x,z,R*2.6))return;add('butte',x,z,R,4+r()*2,(14+r()*8)*S,1.25+r()*.4,yaw);
      const a=yaw+(r()<.5?0:Math.PI),d=R*2.3+5;add('spire',x+Math.cos(a)*d,z-Math.sin(a)*d,1.6+r()*.6,4+r()*2,(13+r()*6)*S,1,0)}
    else if(t<.55){const R=(8+r()*5)*S;if(!clearOf(x,z,R*2*2.2))return;add('butte',x,z,R,5+r()*2,(12+r()*6)*S,1.9+r()*.6,r()*6.28)}
    else if(t<.8){const R=(6+r()*4)*S;if(!clearOf(x,z,R*2.3))return;add('butte',x,z,R,4+r()*2,(15+r()*10)*S,1+r()*.3,r()*6.28)}
    else{if(!clearOf(x,z,14))return;for(let i=0,N=2+Math.floor(r()*2);i<N;i++)add('spire',x+(r()-.5)*16,z+(r()-.5)*16,1.4+r()*.9,3.5+r()*2,(12+r()*12)*S,1,0)}
  };
  for(let i=0;i<9;i++){const s=i%2?1:-1;group(X+s*(90+r()*110),-30+r()*(L+20),i%3===2)}
  // Nothing grows inside a stack.
  this.trees=this.trees.filter(t=>this.stacks.every(s=>Math.hypot(t.x-s.x,t.worldZ-s.worldZ)>s.foot+1.5))
};
P.appendStacks=function(scene,{minDepth=-Infinity,maxDepth=Infinity}={}){
  const Y=this.groundY;
  for(const s of this.stacks||[]){
    const q=camPoint([s.x,Y+s.b+s.h*.4,s.worldZ-travel]),d=q[2];
    if(!(d>.5&&d<470&&d>minDepth&&d<=maxDepth&&this.treeWithinTurnMargin(q,s.foot*.5)))continue;
    scene.push({z:d,draw:()=>drawMesh({type:'plainsStack',x:s.x,y:Y,z:s.worldZ-travel,s:1,rot:[0,0,0],fadeZ:d*.35},s.mesh,C.o,clamp(1.06-d/560,.32,.92))})
  }
};
// Stacks are solid. Hitting one costs a shield and puts the drone back outside it. Scraping
// along afterwards costs nothing more: only a fresh hit (after half a second clear) does.
P.stacksCollide=function(dt){
  let touched=false;
  for(const s of this.stacks||[]){
    const dx=shipX-s.x,dz=travel-s.worldZ;if(Math.abs(dx)>s.foot+2||Math.abs(dz)>s.foot+2)continue;
    const cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),lx=dx*cy-dz*sy,lz=dx*sy+dz*cy,e=(lx/s.hitA)**2+(lz/s.hitB)**2;if(e>=1)continue;
    const k=1.02/Math.sqrt(Math.max(e,1e-4)),nx=lx*k,nz=lz*k;shipX=s.x+nx*cy+nz*sy;travel=s.worldZ-nx*sy+nz*cy;
    touched=true;surfaceVX=0;inputX=0;viewRoll*=.3;shake=Math.max(shake||0,5);
    if(this.rockFree>.5){this.rockFree=0;damage('ROCK')}else this.rockFree=0;
    if(mode==='dead')return
  }
  if(!touched)this.rockFree=(this.rockFree??9)+dt
};
// The approach to the canyon ends at a line of bluffs across the plain, with the canyon mouth
// cut through it on the route and the first bends of the canyon behind. Drawn like the forest
// edge (forestFront), as rock.
P.buildCanyonBoundary=function(){
  this.skyline.length=0;this.forestBands.length=0;this.forestFront.length=0;
  const r=rng(0x43414e59^(Math.random()*65536|0)),X=this.targetX,Z=this.targetWorldZ,Y=this.groundY;
  const put=(kind,x,z,R,b,h,ex,yaw)=>this.forestFront.push({rock:true,mesh:stackMesh(kind,R,b,h,ex,yaw,r),x,y:Y,worldZ:z,R});
  // The bluff line, two staggered rows either side of the mouth, out past the field.
  for(const side of[-1,1])for(let row=0;row<2;row++)for(let x=11+row*7;x<190;){const R=4+r()*3.5,ex=1.5+r()*.9,w=R*ex*2;
    put('butte',X+side*(x+w*.5),Z+10+row*13+r()*6,R,2.5+r()*2,13+r()*9+row*4,ex,(r()-.5)*.25);x+=w*.72}
  // The throat: bluffs lining the first stretch of the canyon behind the mouth. v3022 (Dave: the
  // canyon looks short until you enter, you should not see through to the other side). It runs
  // on well past the mouth and bends away to one side, and a wall of tall bluffs stands where it
  // turns, so from the plain the canyon goes round a corner out of sight.
  const bend=(r()<.5?-1:1)*(15+r()*5),cxAt=z=>X+bend*ease(clamp((z-Z-24)/86,0,1));
  for(let z=Z+12;z<Z+128;z+=6)for(const side of[-1,1]){const R=2.6+r()*1.2,ex=1.5+r()*.5,slope=(cxAt(z+2)-cxAt(z-2))/4;
    put('butte',cxAt(z)+side*(7+2.05*R+r()*1.2),z,R,1.6+r()*.8,12+r()*8+(z-Z)*.04,ex,Math.atan2(-1,slope)+(r()-.5)*.15)}
  // The outside of the bend: a high wall across the line of sight from the mouth.
  for(let x=-26;x<=26;x+=6){const R=3.4+r()*1.4,ex=1.4+r()*.5;put('butte',X+x+bend*.35,Z+118+r()*6,R,2+r(),18+r()*8,ex,(r()-.5)*.3)}
  for(let i=0;i<4;i++){const side=i%2?1:-1;put('spire',X+side*(18+r()*10),Z+34+r()*50,1.2+r()*.5,3,16+r()*10,1,0)}
};

// ---------- 2. The canyon run ----------
const Q=CorridorEnvironmentController.prototype;
Q.isCanyonVariant=function(){return this.variant==='canyon'};
// A rock in the corridor, carried in this.trees like the forest's pines (sorting, culling) but
// drawn as a solid mesh.
Q.addCanyonRock=function(mesh,worldZ,x,obstacle=null,extra={}){
  const t={type:'canyonRock',rock:true,id:`canyon-${this.trees.length}`,mesh,worldZ,x,y:this.floorAt(worldZ,x)-.15,z:worldZ-travel,s:1,rot:[0,0,0],col:C.o,dead:false,obstacle,passed:false,...extra};
  this.trees.push(t);if(obstacle)this.obstacles.push(t);return t
};
Q.buildCanyonCourse=function(){
  this.seed=(Math.random()*4294967296)>>>0||1;   // every canyon is laid out afresh
  const r=()=>this.rand(),tight=clamp(((Number(this.stage?.difficulty)||2)-2)/7,0,1);
  // A bluff on a bank: a butte stretched along the canyon and turned to the line of it, its
  // scree toe at the edge of the lane, so the cliff stands a few units back and towers.
  const bluff=(wz,side,half,back=0)=>{
    const p=this.pathAtWorld(wz),slope=(this.pathAtWorld(wz+2).x-this.pathAtWorld(wz-2).x)/4;
    const R=(back?3+r()*1.8:2.1+r()*1.1),ex=1.45+r()*.55,b=1.4+r()*1.1,h=back?13+r()*12:8.5+r()*7.5;
    const x=p.x+side*(half+.35+2.05*R*.97+back*(3+r()*3));
    this.addCanyonRock(stackMesh('butte',R,b,h,ex,Math.atan2(-1,slope)+(r()-.5)*.12,r),wz,x,null,{R,h:b+h})
  };
  const max=this.length+70,step=5.2;
  for(let u=-40;u<=max;u+=step){
    const wz=this.startWorld+u,p=this.pathAtWorld(wz),glade=this.hasGladeDestination()?this.gladeBlend(wz):0;
    // The mouth flares like the forest's funnel; the basin at the end opens out.
    const half=u<10?lerp(10.8,p.half,ease(clamp((u+40)/50,0,1))):p.half+glade*3.2;
    for(const side of[-1,1]){
      bluff(wz+(r()-.5)*1.4,side,half);
      if(Math.round(u/step)%2===0)bluff(wz+(r()-.5)*2.4,side,half,1);
      // Now and then a spire on the rim, behind the wall.
      if(r()<.12){const R=1+r()*.5;this.addCanyonRock(stackMesh('spire',R,2.5,14+r()*12,1,0,r),wz,p.x+side*(half+11+r()*6),null,{R})}
    }
  }
  // In the lane: spires to steer round, rockfalls to climb over and arches to dive under,
  // closer together as the risk rises. The first and the run into the basin stay clear.
  const end=this.hasGladeDestination()?this.gladeStartU-10:this.length-20;
  let lastArch=-999,lastKind='';
  for(let u=34;u<end;u+=24-8*tight+r()*9){
    const wz=this.startWorld+u,p=this.pathAtWorld(wz),k=r();
    let kind=k<.58?'spire':(k<.82?'rockfall':'arch');
    if(kind==='arch'&&u-lastArch<110)kind='spire';if(kind===lastKind&&kind!=='spire')kind='spire';lastKind=kind;
    if(kind==='spire'){const off=(r()<.5?-1:1)*(.15+r()*.75)*p.half*.62,R=.8+r()*.25;
      this.addCanyonRock(stackMesh('spire',R,.9,8+r()*7,1,0,r),wz,p.x+off,{kind:'upright',radius:R*1.15+.32},{R})}
    else if(kind==='rockfall'){const w=p.half*(.55+r()*.35),off=(r()-.5)*(p.half-w)*1.6;
      this.addCanyonRock(rockfallMesh(w,r),wz,p.x+off,{kind:'fallen',radius:w+.35})}
    else{lastArch=u;this.addCanyonRock(archMesh(p.half,1.75,r),wz,p.x,{kind:'arch',clear:1.45})}
  }
  // The head of the canyon: a wall of tall bluffs closing the basin behind the destination.
  if(this.hasGladeDestination()){
    const backBase=this.cabin?this.cabin.worldZ+4.2:((this.siteHull?.worldZ??this.recorder?.worldZ??(this.startWorld+this.length+7))+8);
    for(let x=-22;x<=22;x+=5.5){const R=3+r()*1.5,ex=1.4+r()*.5;this.addCanyonRock(stackMesh('butte',R,1.6+r(),14+r()*10,ex,(r()-.5)*.3,r),backBase+2.05*R*.97+r()*1.5,this.gladeCentreX+x,null,{R})}
  }
};
// The hideout job's terminal is the cabin delivery with the hideout in place of the cabin.
const baseSetupCabin=Q.setupCabinDestination;
Q.setupCabinDestination=function(){
  if(!this.isCanyonVariant())return baseSetupCabin.call(this);   // v3016: the canyon's building is the door in the rock
  this.cabinMesh=hideoutMesh(rng(0x4a41434b),this.stage?.terminalConfig?.facility==='station');
  this.gladeStartU=Math.max(60,this.length-46);
  const anchor=this.rawPathAtWorld(this.startWorld+this.length+6);
  this.gladeCentreX=anchor.x;this.gladeFloor=anchor.floor;this.cabinYaw=0;
  this.cabin={x:this.gladeCentreX,y:this.gladeFloor,worldZ:this.startWorld+this.length+8,s:1.0,rot:[0,0,0]};
  this.deliveryLocal=this.cabinMesh.deliveryPoint;this.deliveryWorld=this.cabinLocalToWorld(this.deliveryLocal);
  this.standOffWorld=this.cabinLocalToWorld([this.deliveryLocal[0],1.68,this.deliveryLocal[2]-9.6]);
  return true
};
// Lights on the hideout: two work lamps over the door and a red beacon blinking on the mast.
Q.drawHideoutLights=function(){
  const m=this.cabinMesh;if(!m?.lampPoints||!this.cabin)return;
  const star=(local,col,a)=>{const w=this.cabinLocalToWorld(local),q=camPoint([w[0],w[1],w[2]-travel]);if(q[2]<=.3)return;const p=projectCam(q);if(!p)return;const r=Math.max(2,Math.min(7,p.k*.3));
    ctx.save();ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH*1.4;ctx.globalAlpha=a;ctx.beginPath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x+r,p.y);ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x,p.y+r);ctx.stroke();ctx.restore()};
  for(const l of m.lampPoints)star(l,C.y,.9);
  if(Math.sin(performance.now()/180)>0)star(m.beaconPoint,C.r,.95)
};
// The canyon calls: walls are solid on the way in, and clear of the canyon as it opens into
// the basin at the end.
Q.canyonCallouts=function(){
  if(!this.isCanyonVariant())return;const S=this._canyonSaid||(this._canyonSaid={});
  const go=(k,text,voice)=>{if(S[k]||speechSubtitleT>0||typeof callout!=='function'||!callout(text,1.5))return;S[k]=true;if(voice&&audio?.hasVoice?.(voice))audio.playVoice(voice,{once:false,priority:false})};
  if(travel-this.startWorld>6)go('in','CANYON · WALLS ARE SOLID','canyonWallsAreSolid');
  if(this.hasGladeDestination()&&this.gladeBlend(travel+6)>.3)go('out','CLEAR OF THE CANYON','clearOfTheCanyon')
};
})();
