'use strict';
// v3009 CANYON RUN AND STACKS (Dave: stacks like the stampede promo on orange planets, with a
// canyon run). On orange worlds that are not volcanic, the plains approach crosses a mesa:
// a cliff wall across the whole field, cut by one winding canyon that the drone has to fly
// down to reach the city. The canyon walls are solid: touching one costs a shield and turns
// the drone back along the canyon. Buttes and spires stand out on the plains beyond it, and a
// few rise off the mesa top so they show over the rim from inside. Survey points, relay masts,
// crash sites and the beacon move onto the canyon floor. Everything is line work over black
// faces, so the walls hide what is behind them.
(()=>{
const P=SurfaceDestinationApproachController.prototype;
const ROUTE=640,MOUTH=120,EXIT=130,BLOCK=230,WALL_STEP=6,WALL_PAD=3,MAX_TURN=.62;
function rng(seed){let s=seed>>>0||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}

// Which landings get it: orange, arid (not volcanic) planet plains on a real job, flying to a
// city or a forest. Never on rocks, swamps, the OSD compound, bunkers, moons or training.
P.canyonWorld=function(){
  const st=this.stage||{},m=typeof campaign!=='undefined'?campaign.currentMission:null;
  if(this.terrain!=='plains'||this.scenery!=='forest'||st.worldScenery===false||!m||m.training||m.devGroundTest)return false;
  if(!(this.destination==='city'||this.destination==='forest')||planetLandingBody==='moon')return false;
  return surfaceWorldKind()==='arid'&&landingWorldColour()===C.o
};

// Before the scenery is built: decide, lengthen the route so the canyon has room, and lay out
// the canyon's centre line and width.
P.setupCanyon=function(){
  this.canyon=null;this.stacks=[];this.stackField=false;
  if(!this.canyonWorld())return;
  this.stackField=true;
  if(Number.isFinite(Number(this.stage?.targetWorldZ)))return;   // a fixed target: stacks only
  this.routeLength=Math.max(this.routeLength,ROUTE);this.targetWorldZ=this.routeLength;
  const r=rng(Math.random()*4294967296),X=this.targetX,z0=MOUTH,z1=this.routeLength-EXIT,len=z1-z0;
  const n=Math.max(2,Math.round(len/105)),m=2*n+1;
  let A=20+r()*6,A2=2+r()*1.5;
  // Keep the bends to a turn the drone can hold comfortably at full speed.
  const curv=(a,b)=>{let k=0;for(let i=0;i<=200;i++){const u=i/200;k=Math.max(k,Math.abs(a*(Math.PI*n/len)**2*Math.sin(Math.PI*n*u)+b*(Math.PI*m/len)**2*Math.sin(Math.PI*m*u)))}return k};
  const lim=MAX_TURN/this.speed,k=curv(A,A2);if(k>lim){A*=lim/k;A2*=lim/k}
  // v3011: on the Canyon Run job the canyon tightens with the risk (narrower, more boulders).
  const tight=this.stage?.canyonJob?clamp(((Number(this.stage.difficulty)||2)-2)/7,0,1):0;
  const dir=r()<.5?-1:1,w0=13+r()*2-2*tight,wph=r()*6.283;
  const xs=[],ws=[],ds=[];
  for(let wz=z0;wz<=z1+.001;wz+=2){
    const u=(wz-z0)/len,x=X+dir*(A*Math.sin(Math.PI*n*u)+A2*Math.sin(Math.PI*m*u));
    const flare=7*(1-ease(clamp((wz-z0)/44,0,1)))+7*(1-ease(clamp((z1-wz)/44,0,1)));
    xs.push(x);ws.push(w0+2.6*Math.sin(wz*.041+wph)+1.4*Math.sin(wz*.11+wph*2)+flare)
  }
  for(let i=0;i<xs.length;i++)ds.push((xs[Math.min(xs.length-1,i+1)]-xs[Math.max(0,i-1)])/(2*(i===0||i===xs.length-1?1:2)));
  this.canyon={z0,z1,X,xMin:X-BLOCK,xMax:X+BLOCK,xs,ws,ds,H:19+r()*4+3*tight,tight,r,chunks:[],said:{}};
  this.setupHideoutBay()
};
// The centre line, half width and slope of the canyon at a distance along the route.
P.canyonAt=function(wz){
  const c=this.canyon,f=clamp((wz-c.z0)/2,0,c.xs.length-1.001),i=Math.floor(f),t=f-i;
  return{cx:lerp(c.xs[i],c.xs[i+1],t),hw:lerp(c.ws[i],c.ws[i+1],t),dcx:lerp(c.ds[i],c.ds[i+1],t),bay:this.canyonBayAt(wz),bs:c.bay?.side||0}
};
P.canyonMouth=function(){const c=this.canyon;if(!c||travel>c.z0-3)return null;const s=this.canyonAt(c.z0);return{x:s.cx,z:c.z0}};
// The rolling ground lies level under the mesa and for 30 round it, so its foot is flat.
P.canyonHillMask=function(x,wz){
  const c=this.canyon;if(!c)return 1;
  const ez=wz<c.z0?(c.z0-wz)/30:(wz>c.z1?(wz-c.z1)/30:0),ex=x<c.xMin?(c.xMin-x)/30:(x>c.xMax?(x-c.xMax)/30:0);
  return ease(clamp(Math.max(ez,ex),0,1))
};

// ---------- Meshes ----------
// A cliff along a line of base points [x,z,top], its face toward the side n (+1: to the left
// of the line's direction turned a quarter right). A scree skirt runs along its foot, two
// wavering strata bands across the face and a crack now and then. Faces are vertical between
// each pair of points, so the strata lie exactly on them.
function cliffMesh(pts,n,ox,oz,r,first){
  const v=[],e=[],faces=[],ec=[],SK=2.4,FOOT=1.8;
  const nrm=pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1;return[n*dz/L,-n*dx/L]});
  const idx=(x,y,z)=>{v.push([x-ox,y,z-oz]);return v.length-1};
  const g=[],f=[],t=[],s1=[],s2=[];
  const a1=.3+r()*.06,a2=.6+r()*.06,ph=r()*6;
  pts.forEach((p,i)=>{const[x,z,top]=p,[nx,nz]=nrm[i],w=Math.sin(i*1.3+ph)*.035;
    g.push(idx(x+nx*SK,0,z+nz*SK));f.push(idx(x,FOOT,z));t.push(idx(x,top,z));
    s1.push(idx(x,FOOT+(top-FOOT)*(a1+w),z));s2.push(idx(x,FOOT+(top-FOOT)*(a2-w*.8),z))});
  const E=(a,b,col)=>{e.push([a,b]);ec.push(col)};
  for(let i=0;i<pts.length-1;i++){
    faces.push([f[i],f[i+1],t[i+1],t[i]],[g[i],g[i+1],f[i+1],f[i]]);
    E(g[i],g[i+1],C.o);E(f[i],f[i+1],C.o);E(t[i],t[i+1],C.o);E(s1[i],s1[i+1],C.y);E(s2[i],s2[i+1],C.y)
  }
  pts.forEach((_,i)=>{E(g[i],f[i],C.y);if((i===0&&first)||r()<.22)E(f[i],t[i],C.o)});
  return{v,e,faces,edgeColors:ec}
}
// A butte (cliffed tower on a scree slope) or a spire, as rings of an uneven outline. Built in
// place: x,z offsets already stretched and turned, base at y 0.
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
  const ups=new Set(spire?[0,2,5]:[]);
  for(let i=0;i<n;i++){
    E(at(0,i),at(0,i+1),C.o);E(at(foot,i),at(foot,i+1),C.o);E(at(top,i),at(top,i+1),C.o);
    for(let k=0;k<foot;k++)if(i%2===0||!spire)E(at(k,i),at(k+1,i),C.y);
    if(spire){E(at(4,i),at(4,i+1),C.y);if(ups.has(i))for(let k=foot;k<top;k++)E(at(k,i),at(k+1,i),C.o)}
    else if(i%3===0)E(at(foot,i),at(top,i),C.o)
  }
  // Two strata bands on a butte's cliff, a vertex on each upright so they lie on its faces.
  if(kind!=='spire'){const base=v.length,fr=[.34+r()*.08,.64+r()*.08],ph=r()*6;
    fr.forEach((q,j)=>{for(let i=0;i<n;i++){const A=v[at(foot,i)],B=v[at(top,i)],w=q+Math.sin(i*1.7+ph+j)*.05;v.push([lerp(A[0],B[0],w),lerp(A[1],B[1],w),lerp(A[2],B[2],w)])}
      for(let i=0;i<n;i++)E(base+j*n+i,base+j*n+(i+1)%n,C.y)})}
  return{v,e,faces,edgeColors:ec}
}

// ---------- Dressing the land ----------
// After the plains scenery: clear the mesa (only the canyon floor keeps a few dead pines and
// boulders), cut its walls, and stand the buttes and spires.
P.canyonDress=function(){
  if(!this.stackField)return;
  const c=this.canyon,r=c?c.r:rng(Math.random()*4294967296),X=this.targetX,L=this.targetWorldZ;
  if(c){
    this.trees=this.trees.filter(t=>{if(t.worldZ<c.z0-6||t.worldZ>c.z1+6||t.x<c.xMin-6||t.x>c.xMax+6)return true;
      if(t.worldZ<c.z0+2||t.worldZ>c.z1-2)return false;const s=this.canyonAt(t.worldZ);return Math.abs(t.x-s.cx)<s.hw-4&&r()<.5});
    // Boulders on the canyon floor, now and then, to steer round.
    for(let wz=c.z0+40;wz<c.z1-30;wz+=26-10*c.tight+r()*(22-8*c.tight)){const s=this.canyonAt(wz),side=r()<.5?-1:1,x=s.cx+side*s.hw*(.2+r()*.42),sc=1.1+r()*.6;
      const mesh=asteroidMesh;if(!mesh)break;const mx=1.05+r()*1.1,my=.5+r()*.5,mz=.95+r()*1;
      this.trees.push({kind:'rock',canyonRock:true,mesh,x,y:this.groundY-(this.meshBaseY(mesh)+.15)*sc*my,worldZ:wz,s:sc,rot:[(r()-.5)*.28,r()*6.28,(r()-.5)*.24],col:C.y,mx,my,mz,hit:false})}
    this.buildCanyonWalls()
  }
  // Groups of stacks: a butte with a spire beside it (a mitten and its thumb), a long mesa, a
  // lone butte or a cluster of spires.
  const clearOf=(x,z,R)=>{
    if(Math.abs(x-X)<R+(c?0:62)||Math.hypot(x-X,z-L)<R+110||Math.hypot(x,z)<R+40)return false;
    if(c&&x>c.xMin-R-14&&x<c.xMax+R+14&&z>c.z0-R-24&&z<c.z1+R+24)return false;
    if(this.sceneryReserved(x,z,R))return false;
    return this.stacks.every(s=>s.top||Math.hypot(s.x-x,s.worldZ-z)>s.foot+R+8)
  };
  const add=(kind,x,z,R,b,h,ex,yaw,top=0)=>{
    if(kind==='butte')b=Math.max(b,h*(.3+r()*.12));   // a broad scree slope, as in Monument Valley
    const mesh=stackMesh(kind,R,b,h,ex,yaw,r),ky=kind==='spire'?3:2.05,foot=R*ky*Math.max(ex,1)*1.16;
    // Collision outline at flying height (about 3 up): between the base and the first ring.
    const k3=kind==='spire'?lerp(3,2,clamp(3/(b*.6),0,1)):lerp(2.05,1.55,clamp(3/(b*.38),0,1));
    this.stacks.push({kind,x,worldZ:z,R,b,h,ex,yaw,mesh,top,foot,hitA:R*k3*ex*.94,hitB:R*k3*.94,hit:false});
  };
  const group=(x,z,big)=>{
    const t=r(),S=big?1.35:1;
    if(t<.34){const R=(7+r()*4)*S,yaw=r()*6.28;if(!clearOf(x,z,R*2.6))return;add('butte',x,z,R,4+r()*2,(14+r()*8)*S,1.25+r()*.4,yaw);
      const a=yaw+(r()<.5?0:Math.PI),d=R*2.3+5;add('spire',x+Math.cos(a)*d,z-Math.sin(a)*d,1.6+r()*.6,4+r()*2,(13+r()*6)*S,1,0)}
    else if(t<.55){const R=(8+r()*5)*S;if(!clearOf(x,z,R*2*2.2))return;add('butte',x,z,R,5+r()*2,(12+r()*6)*S,1.9+r()*.6,r()*6.28)}
    else if(t<.8){const R=(6+r()*4)*S;if(!clearOf(x,z,R*2.3))return;add('butte',x,z,R,4+r()*2,(15+r()*10)*S,1+r()*.3,r()*6.28)}
    else{if(!clearOf(x,z,14))return;for(let i=0,N=2+Math.floor(r()*2);i<N;i++)add('spire',x+(r()-.5)*16,z+(r()-.5)*16,1.4+r()*.9,3.5+r()*2,(12+r()*12)*S,1,0)}
  };
  if(c){
    // Before the mesa, beyond its two ends, and out on the plain past it.
    for(let i=0;i<3;i++){const s=r()<.5?-1:1;group(X+s*(85+r()*90),-50+r()*(c.z0-70),false)}
    for(const s of[-1,1])for(let i=0;i<3;i++)group(X+s*(BLOCK+60+r()*90),-40+r()*(L+60),true);
    for(let i=0;i<3;i++){const s=r()<.5?-1:1;group(X+s*(80+r()*80),c.z1+50+r()*Math.max(10,L-c.z1-150),false)}
    // Spires and buttes on the mesa top, well back from the rim, to show over it from inside.
    for(let i=0,tries=0;i<6&&tries<40;tries++){const z=c.z0+40+r()*(c.z1-c.z0-80),s=this.canyonAt(z),side=r()<.5?-1:1,x=s.cx+side*(s.hw+34+r()*80);
      if(x<c.xMin+20||x>c.xMax-20)continue;i++;
      if(r()<.6)add('spire',x,z,1.8+r()*1.2,3+r()*2,14+r()*16,1,0,c.H);else add('butte',x,z,6+r()*4,3+r()*2,12+r()*10,1.2+r()*.6,r()*6.28,c.H)}
  }else{
    for(let i=0;i<9;i++){const s=i%2?1:-1;group(X+s*(90+r()*110),-30+r()*(L+20),i%3===2)}
  }
  // Nothing grows inside a stack.
  this.trees=this.trees.filter(t=>this.stacks.every(s=>s.top||Math.hypot(t.x-s.x,t.worldZ-s.worldZ)>s.foot+1.5))
};
// The walls in chunks of two steps, each its own mesh sorted by its own depth: both sides of
// the canyon, the cliff across the field either side of each mouth, and the mesa's two ends.
P.buildCanyonWalls=function(){
  const c=this.canyon,r=c.r,H=()=>c.H+(r()-.5)*3.2,chunks=c.chunks;chunks.length=0;
  const emit=(pts,n,K)=>{for(let i=0;i<pts.length-1;i+=K){const part=pts.slice(i,Math.min(pts.length,i+K+1));if(part.length<2)break;
    const m=part[part.length>>1],a=part[0],b=part[part.length-1];
    chunks.push({x:m[0],z:m[1],ends:[[a[0],a[1]],[b[0],b[1]]],span:Math.hypot(b[0]-a[0],b[1]-a[1]),mesh:cliffMesh(part,n,m[0],m[1],r,i===0)})}};
  const jit=()=>(r()-.5)*1.6;
  // The canyon walls: the rim rises and falls in long swells with a little break-up, and the
  // face juts in and out (a buttress here, a bay there).
  for(const side of[-1,1]){
    const ph=r()*6.28,ph2=r()*6.28,rim=wz=>c.H+3.2*Math.sin(wz*.047+ph)+1.6*Math.sin(wz*.13+ph2)+(r()-.5)*1.4;
    const pts=[];for(let wz=c.z0;wz<=c.z1+.001;wz+=WALL_STEP){const s=this.canyonAt(wz),edge=wz===c.z0||wz+WALL_STEP>c.z1;
      pts.push([s.cx+side*(s.hw+(side===s.bs?s.bay:0)+(edge?0:1.3*Math.sin(wz*.09+ph2)+(r()-.5)*2.2)),wz,rim(wz)])}
    const last=this.canyonAt(c.z1);if(pts[pts.length-1][1]<c.z1-.01)pts.push([last.cx+side*last.hw,c.z1,rim(c.z1)]);
    emit(pts,side<0?1:-1,2)
  }
  // The cliff across the field at each end of the canyon, out to the mesa's corners.
  const across=(z,from,to,n)=>{const pts=[],N=Math.max(2,Math.round(Math.abs(to-from)/8));for(let i=0;i<=N;i++){const x=lerp(from,to,i/N);pts.push([x,z+(i&&i<N?jit()*1.6:0),H()])}emit(pts,n,2)};
  for(const[z,n]of[[c.z0,1],[c.z1,-1]]){const s=this.canyonAt(z);across(z,c.xMin,s.cx-s.hw,n);across(z,s.cx+s.hw,c.xMax,n)}
  // The mesa's ends, far out at the sides.
  for(const[x,n]of[[c.xMin,-1],[c.xMax,1]]){const pts=[],N=Math.round((c.z1-c.z0)/12);for(let i=0;i<=N;i++)pts.push([x+(i&&i<N?jit()*2:0),lerp(c.z0,c.z1,i/N),H()]);emit(pts,n,3)}
};

// ---------- Drawing ----------
P.appendCanyon=function(scene,{minDepth=-Infinity,maxDepth=Infinity}={}){
  const c=this.canyon,Y=this.groundY;
  if(c)for(const k of c.chunks){
    const qa=camPoint([k.ends[0][0],Y+c.H*.5,k.ends[0][1]-travel]),qb=camPoint([k.ends[1][0],Y+c.H*.5,k.ends[1][1]-travel]),q=camPoint([k.x,Y+c.H*.5,k.z-travel]);
    if(qa[2]<=.3&&qb[2]<=.3&&q[2]<=.3)continue;
    const d=Math.max(.35,q[2]);if(d>430||d<=minDepth||d>maxDepth)continue;
    const vis=[qa,qb,q].find(p=>p[2]>.3);if(!this.treeWithinTurnMargin(vis,Math.max(4,k.span*.35)))continue;
    scene.push({z:d,draw:()=>drawMesh({type:'canyonWall',x:k.x,y:Y,z:k.z-travel,s:1,rot:[0,0,0],fadeZ:d*.35},k.mesh,C.o,clamp(1.08-d/520,.34,.95))})
  }
  for(const s of this.stacks||[]){
    const y=Y+s.top,q=camPoint([s.x,y+s.b+s.h*.4,s.worldZ-travel]),d=q[2];
    if(!(d>.5&&d<470&&d>minDepth&&d<=maxDepth&&this.treeWithinTurnMargin(q,s.foot*.5)))continue;
    scene.push({z:d,draw:()=>drawMesh({type:'plainsStack',x:s.x,y,z:s.worldZ-travel,s:1,rot:[0,0,0],fadeZ:d*.35},s.mesh,C.o,clamp(1.06-d/560,.32,.92))})
  }
};

// ---------- Flying it ----------
// Walls and stacks are solid. Hitting one costs a shield and puts the drone back outside it:
// along the canyon if it hit a canyon wall, sliding towards the gap if it hit the cliff across
// the field. Scraping along afterwards costs nothing more: only a fresh hit (after half a second
// clear of the rock) takes another shield.
P.canyonCollide=function(dt){
  const c=this.canyon;let touched=false;
  const hit=()=>{touched=true;surfaceVX=0;inputX=0;viewRoll*=.3;shake=Math.max(shake||0,5);
    if(this.rockFree>.5){this.rockFree=0;damage('ROCK')}else this.rockFree=0};
  if(c){
    this.canyonCallouts();
    const x=shipX,wz=travel;
    if(!this.finishing&&wz>c.z0&&wz<c.z1&&x>c.xMin&&x<c.xMax){
      const s=this.canyonAt(wz),off=x-s.cx,lim=s.hw-WALL_PAD+(Math.sign(off)===s.bs?s.bay:0);
      if(Math.abs(off)>lim){
        const opts=[[Math.abs(off)-lim,'side'],[wz-c.z0,'front'],[c.z1-wz,'back'],[x-c.xMin,'min'],[c.xMax-x,'max']].sort((a,b)=>a[0]-b[0]),how=opts[0][1];
        if(how==='side'){const sg=Math.sign(off)||1;shipX=s.cx+sg*(lim-.25);
          const along=Math.atan2(s.dcx,1),back=Math.abs(wrapAngle(viewYaw-along))>Math.PI/2?wrapAngle(along+Math.PI):along;
          viewYaw=wrapAngle(back-sg*.16*(back===along?1:-1))}
        else if(how==='front'){travel=c.z0-.4;viewYaw=Math.sign(this.canyonAt(c.z0).cx-shipX||1)*1.48}
        else if(how==='back')travel=c.z1+.4;
        else if(how==='min'){shipX=c.xMin-.4;viewYaw=-Math.abs(viewYaw)}
        else{shipX=c.xMax+.4;viewYaw=Math.abs(viewYaw)}
        hit();if(mode==='dead')return
      }
    }
  }
  for(const s of this.stacks||[]){
    if(s.top)continue;const dx=shipX-s.x,dz=travel-s.worldZ;if(Math.abs(dx)>s.foot+2||Math.abs(dz)>s.foot+2)continue;
    const cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),lx=dx*cy-dz*sy,lz=dx*sy+dz*cy,e=(lx/s.hitA)**2+(lz/s.hitB)**2;if(e>=1)continue;
    const k=1.02/Math.sqrt(Math.max(e,1e-4)),nx=lx*k,nz=lz*k;shipX=s.x+nx*cy+nz*sy;travel=s.worldZ-nx*sy+nz*cy;
    hit();if(mode==='dead')return
  }
  if(!touched)this.rockFree=(this.rockFree??9)+dt
};
// The nav computer calls the canyon as it comes up, on the way in and once the drone is out,
// on screen and (v3010) aloud, when the recording is in voices/.
P.canyonCallouts=function(){
  const c=this.canyon,S=c.said,say=(k,text,t,voice)=>{if(!S[k]&&!(speechSubtitleT>0)&&typeof callout==='function'&&callout(text,t)){S[k]=true;this.playVoiceIf(voice,false)}};
  if(travel>c.z0-110&&travel<c.z0)say('ahead','MESA AHEAD · FLY THE CANYON',1.8,'mesaAheadFlyTheCanyon');
  if(travel>c.z0+8&&travel<c.z0+60){S.ahead=true;say('in','CANYON · WALLS ARE SOLID',1.4,'canyonWallsAreSolid')}
  if(travel>c.z1+2&&!this.finishing){S.ahead=S.in=true;say('out','CLEAR OF THE CANYON',1.4,'clearOfTheCanyon')}
  // v3012: the hideout's bay is called as it comes into view round the bends.
  const b=c.bay;if(b&&this.canyonHideout&&travel>b.z-120&&travel<b.z-30&&this.survey?.some(p=>p.kind==='hideout'&&!p.done))say('bay','RED JACKAL HIDEOUT · IN THE CANYON WALL',1.8)
};
// Survey points, masts, crash sites and the beacon that would sit on the mesa go to the canyon
// floor instead, near its middle line.
P.canyonPlaceObjectives=function(list){
  const c=this.canyon;if(!c)return;
  for(const p of list||[]){if(!p||p.worldZ<c.z0-30||p.worldZ>c.z1+30)continue;
    p.worldZ=clamp(p.worldZ,c.z0+34,c.z1-34);
    // v3012: caches stay clear of the hideout's bay.
    const b=c.bay;if(b&&Math.abs(p.worldZ-b.z)<b.len/2+10){const lo=b.z-b.len/2-10,hi=b.z+b.len/2+10;p.worldZ=(p.worldZ<b.z&&lo>c.z0+34)||hi>c.z1-34?lo:hi}
    const s=this.canyonAt(p.worldZ);p.x=s.cx+(c.r()-.5)*s.hw*.5;if(p.off)p.off=Math.sign(p.off)*Math.min(3.2,s.hw*.3)}
};

// ---------- v3012 Red Jackal hideout ----------
// On the Hideout job (stage.hideoutCaches) one canyon wall is cut back into a bay, and the Red
// Jackals have built into it: a blast door framed in the rock, a landing pad with a skiff on it,
// crates stacked along the wall and a mast with a red light. Their caches lie out on the canyon
// floor, crates under a net. The hideout is the last mark of the run.
const BAY_LEN=58,BAY_DEPTH=13;
// The door frame against the bay wall, built in place: along the wall is z, into the canyon is
// -side in x. Two pillars and a lintel, a recessed blast door with slats.
function portalMesh(side){
  const v=[],e=[],faces=[],ec=[],X=d=>-side*d;
  const box=(z0,z1,y0,y1,d0,d1,col)=>{const b=v.length;
    for(const[y,d]of[[y0,d0],[y0,d1],[y1,d1],[y1,d0]])v.push([X(d),y,z0]);for(const[y,d]of[[y0,d0],[y0,d1],[y1,d1],[y1,d0]])v.push([X(d),y,z1]);
    faces.push([b,b+1,b+2,b+3],[b+4,b+7,b+6,b+5],[b,b+4,b+5,b+1],[b+1,b+5,b+6,b+2],[b+2,b+6,b+7,b+3],[b+3,b+7,b+4,b]);
    for(const[a,c]of[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]){e.push([b+a,b+c]);ec.push(col)}};
  box(-4.8,-3.1,0,7.6,-.4,2.3,C.y);box(3.1,4.8,0,7.6,-.4,2.3,C.y);box(-3.1,3.1,5.4,7.6,-.4,2.1,C.y);
  // The door, set back in the frame, and its slats.
  const b=v.length;v.push([X(.5),0,-3.1],[X(.5),5.4,-3.1],[X(.5),5.4,3.1],[X(.5),0,3.1]);faces.push([b,b+1,b+2,b+3]);
  for(const[a,c]of[[0,1],[1,2],[2,3]]){e.push([b+a,b+c]);ec.push(C.o)}
  for(let i=1;i<6;i++){const y=i*.9,k=v.length;v.push([X(.55),y,-3.1],[X(.55),y,3.1]);e.push([k,k+1]);ec.push(C.o)}
  return{v,e,faces,edgeColors:ec}
}
// A landing pad on the ground: a ring of eight with a cross in it. Lines only.
const hideoutPadMesh=(()=>{const v=[],e=[],R=5.2;for(let i=0;i<8;i++){const a=(i+.5)/8*6.2832;v.push([Math.cos(a)*R,0,Math.sin(a)*R])}
  for(let i=0;i<8;i++)e.push([i,(i+1)%8]);e.push([0,4],[2,6]);return{v,e}})();
// A cache: a low net pegged over a few crates, drawn with them.
const cacheNetMesh=(()=>{const v=[[-2.6,0,-2],[2.6,0,-2],[2.6,0,2],[-2.6,0,2],[-1.3,2.6,0],[1.3,2.6,0]],e=[[0,4],[3,4],[1,5],[2,5],[4,5],[0,1],[2,3]];
  for(let i=1;i<4;i++){const t=i/4,k=v.length;v.push([lerp(-2.6,-1.3,t),2.6*t,lerp(-2,0,t)],[lerp(2.6,1.3,t),2.6*t,lerp(-2,0,t)],[lerp(-2.6,-1.3,t),2.6*t,lerp(2,0,t)],[lerp(2.6,1.3,t),2.6*t,lerp(2,0,t)]);e.push([k,k+1],[k+2,k+3])}
  return{v,e}})();

// Called from setupCanyon once the canyon is laid out.
P.setupHideoutBay=function(){
  const c=this.canyon;if(!c||!(Number(this.stage?.hideoutCaches)>0))return;
  c.bay={z:lerp(c.z0,c.z1,.56+c.r()*.14),side:c.r()<.5?-1:1,depth:BAY_DEPTH,len:BAY_LEN}
};
// How far the bay cuts back into its wall here (0 outside it): a flat back with sloped ends.
P.canyonBayAt=function(wz){
  const b=this.canyon?.bay;if(!b)return 0;const u=Math.abs(wz-b.z)/(b.len/2);
  return u<1?b.depth*ease(clamp((1-u)/.42,0,1)):0
};
// The last cache becomes the hideout itself, out on the bay floor in front of the door.
P.canyonPlaceHideout=function(){
  const pts=this.survey||[];if(!pts.length)return;
  const c=this.canyon,b=c?.bay,p=pts[pts.length-1];p.kind='hideout';
  let side=-1,wallX=p.x+18;
  if(b){p.worldZ=b.z;const s=this.canyonAt(b.z),bay=this.canyonBayAt(b.z);side=b.side;
    p.x=s.cx+side*(s.hw-WALL_PAD+bay*.4);wallX=s.cx+side*(s.hw+bay);
    // Clear the bay floor of pines and boulders.
    this.trees=this.trees.filter(t=>!(Math.abs(t.worldZ-b.z)<b.len/2+4&&(t.x-s.cx)*side>s.hw*.3))}
  else side=1,wallX=p.x+side*16;
  const z=p.worldZ,r=c?c.r:Math.random,inX=d=>wallX-side*d,Y=this.groundY;
  const H={side,z,wallX,portal:portalMesh(side),crates:[],pad:{x:inX(10.5),z:z+(r()<.5?-1:1)*1.5},skiffYaw:(r()-.5)*.6,mast:{x:inX(2.2),z:z+(r()<.5?-1:1)*(12+r()*3)}};
  // Crates along the wall either side of the door, stacked two high in places.
  for(const sg of[-1,1])for(let i=0,n=2+Math.floor(r()*3);i<n;i++){const s=.8+r()*.45,dz=sg*(6.3+i*2.1+r()*.4),dx=1.4+r()*1.4;
    H.crates.push({x:inX(dx),z:z+dz,y:Y+s,s,yaw:(r()-.5)*.5});if(r()<.45)H.crates.push({x:inX(dx),z:z+dz,y:Y+s*2+.75*s,s:s*.75,yaw:(r()-.5)*.8})}
  this.canyonHideout=H;
  // Each cache gets a few crates of its own under its net.
  for(const q of pts)if(q.kind==='cache'){q.yaw=r()*6.28;q.crates=[[-1,.7],[.9,.6],[0,.55]].slice(0,2+(r()<.5?1:0)).map(([dx,s],i)=>({dx:dx+(r()-.5)*.3,dz:(r()-.5)*1.4,s,top:i===2}))}
};
P.appendHideout=function(scene,{minDepth=-Infinity,maxDepth=Infinity}={}){
  const H=this.canyonHideout,Y=this.groundY,put=(x,y,wz,R,bias,draw)=>{const q=camPoint([x,y,wz-travel]),d=q[2];
    if(d>.4&&d<300&&d>minDepth&&d<=maxDepth&&this.treeWithinTurnMargin(q,R))scene.push({z:d-bias,draw:()=>draw(d,wz-travel)})};
  const al=d=>clamp(1.1-d/320,.35,.92);
  for(const p of this.survey||[])if(p.kind==='cache')put(p.x,Y+1,p.worldZ,4,0,(d,z)=>{const cy=Math.cos(p.yaw),sy=Math.sin(p.yaw);
    for(const k of p.crates){const lx=k.dx,lz=k.dz,x=p.x+lx*cy+lz*sy,zz=z-lx*sy+lz*cy;drawMesh({type:'cacheCrate',x,y:Y+k.s+(k.top?1.35:0),z:zz,s:k.s,rot:[0,p.yaw,0]},courierFixtureBoxMesh,C.y,al(d))}
    drawMesh({type:'cacheNet',x:p.x,y:Y+.02,z,s:1,rot:[0,p.yaw,0]},cacheNetMesh,C.g,al(d)*.85)});
  if(!H)return;
  // The door and the crates stand against the wall, so they sort just in front of it.
  put(H.wallX,Y+3.8,H.z,6,2.5,(d,z)=>{drawMesh({type:'hideoutPortal',x:H.wallX,y:Y,z,s:1,rot:[0,0,0]},H.portal,C.y,al(d));
    // Two work lamps on the lintel.
    for(const dz of[-3.6,3.6]){const q=camPoint([H.wallX-H.side*2.4,Y+7.9,z+dz]);if(q[2]<=.3)continue;const p=projectCam(q);if(!p)continue;const r=Math.max(2,Math.min(6,p.k*.25));
      ctx.save();ctx.strokeStyle=C.y;ctx.lineWidth=VECTOR_LINE_WIDTH*1.3;ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x+r,p.y);ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x,p.y+r);ctx.stroke();ctx.restore()}});
  for(const k of H.crates)put(k.x,k.y,k.z,k.s*2,2,(d,z)=>drawMesh({type:'hideoutCrate',x:k.x,y:k.y,z,s:k.s,rot:[0,k.yaw,0]},courierFixtureBoxMesh,C.y,al(d)));
  put(H.pad.x,Y,H.pad.z,6,-.5,(d,z)=>drawMesh({type:'hideoutPad',x:H.pad.x,y:Y+.04,z,s:1,rot:[0,0,0]},hideoutPadMesh,C.r,al(d)*.85));
  const sk=routeDiversion?.CIV_MESH;if(sk)put(H.pad.x,Y+.8,H.pad.z,4,0,(d,z)=>drawMesh({type:'hideoutSkiff',x:H.pad.x,y:Y+.22*2.6+.05,z,s:2.6,rot:[0,H.skiffYaw,0]},sk,C.c,al(d)));
  put(H.mast.x,Y+3.5,H.mast.z,3,1.5,(d,z)=>{drawMesh({type:'hideoutMast',x:H.mast.x,y:Y,z,s:1,rot:[0,.4,0]},surfaceRelayMastMesh,C.w,al(d));
    if(Math.sin((this.navPulse||0)*5)<=0)return;const q=camPoint([H.mast.x,Y+8.8,z]);if(q[2]<=.3)return;const p=projectCam(q);if(!p)return;const r=Math.max(2.5,Math.min(8,p.k*.35));
    ctx.save();ctx.strokeStyle=C.r;ctx.lineWidth=VECTOR_LINE_WIDTH*1.5;ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x+r,p.y);ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x,p.y+r);ctx.stroke();ctx.restore()})
};
})();
