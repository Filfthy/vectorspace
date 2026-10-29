'use strict';
// Vector Space Christmas promo. Loaded only with ?promo (see the end of index.html).
//   ?promo&view=present|tree|reindeer|xeno   turn one promo model on a black stage
//   ?promo                                   the director (promo-director.js)
// Frames are saved through promo/capture-server.py; the song is added afterwards.
(()=>{
const Q=new URLSearchParams(location.search);
const CAP={w:+Q.get('w')||1920,h:+Q.get('h')||1080};
// Render at one canvas pixel per CSS pixel; the pane is sized to the video (1920x1080).
Object.defineProperty(window,'devicePixelRatio',{get:()=>+Q.get('dpr')||1,configurable:true});resize();
const capCanvas=document.createElement('canvas');capCanvas.width=CAP.w;capCanvas.height=CAP.h;
const capCtx=capCanvas.getContext('2d',{alpha:false});
// The game canvas plus the bloom layer, composited the way the page's CSS does it
// (bloom is screen-blended on top). Must run in the same task as the frame's render,
// before the WebGL bloom buffer is cleared.
function composite(){
  capCtx.globalCompositeOperation='source-over';capCtx.fillStyle='#000';capCtx.fillRect(0,0,CAP.w,CAP.h);
  capCtx.imageSmoothingEnabled=true;capCtx.imageSmoothingQuality='high';
  capCtx.drawImage(canvas,0,0,CAP.w,CAP.h);
  if(bloomCanvas.style.display!=='none'&&bloomCanvas.width){capCtx.globalCompositeOperation='screen';capCtx.drawImage(bloomCanvas,0,0,CAP.w,CAP.h);capCtx.globalCompositeOperation='source-over'}
  return capCanvas
}
let pending=0;
function save(folder,name,type='image/jpeg',q=.93){
  composite();pending++;
  // Retries a failed upload, so a busy moment never drops a frame from the video.
  const post=(b,n=0)=>fetch(`/promo-capture/${folder}/${name}`,{method:'POST',body:b}).then(r=>{if(!r.ok)throw new Error(r.status)}).catch(e=>{if(n<5)return new Promise(r=>setTimeout(r,200)).then(()=>post(b,n+1));console.error('frame lost',name,e)});
  return new Promise(res=>capCanvas.toBlob(b=>post(b).then(()=>{pending--;res()}),type,q))
}
function saveText(folder,name,text){return fetch(`/promo-capture/${folder}/${name}`,{method:'POST',body:text})}
const Promo=globalThis.Promo={Q,CAP,composite,save,saveText,get pending(){return pending}};

// ---------- Model viewer ----------
const view=Q.get('view');
if(view){
  const M=PromoModels,xeno=M.makeHornet(C.m,C.y),guitarist=M.makeHornet(C.g,C.y,'guitar','strat'),guitarist2=M.makeHornet(C.o,C.y,'guitar','lespaul'),drummer=M.makeHornet(C.u,C.c,'drums');
  const reindeerMesh=(()=>{const b=gaBuilder(true);const u={K:GA_KINDS.reindeer};
    // Rest pose straight from the kind's leg design, like the audition sheet.
    GA_KINDS.reindeer.body(b);for(const[i,L]of GA_KINDS.reindeer.legs.entries())gaLeg(b,L,L.t,i);
    return{v:b.v,e:b.e,faces:b.faces,edgeColors:M.edgeColours(b,{nose:C.r,antlers:C.y})}})();
  const subjects={
    present:{mesh:M.present,col:C.r,s:1.2,y:0,dist:3.6,tilt:.35},
    tree:{mesh:M.xmasTree,col:C.g,s:1,y:-1.5,dist:6.6,tilt:.12,anim:t=>M.xmasTree.twinkle(t)},
    reindeer:{mesh:reindeerMesh,col:C.o,s:.62,y:-1.3,dist:6,tilt:.12},
    xeno:{mesh:xeno,col:C.m,s:.9,y:-.1,dist:7.4,tilt:.05,anim:t=>xeno.pose({jaw:.5+.5*Math.sin(t*3),t})},
    guitarist:{mesh:guitarist,col:C.g,s:.9,y:-.1,dist:7.4,tilt:.05,anim:t=>guitarist.pose({jaw:0,t,strum:.5+.5*Math.sin(t*12)})},
    guitarist2:{mesh:guitarist2,col:C.o,s:.9,y:-.1,dist:7.4,tilt:.05,anim:t=>guitarist2.pose({jaw:0,t,strum:.5+.5*Math.sin(t*12)})},
    singer:{mesh:xeno,col:C.m,s:.9,y:-.1,dist:7.4,tilt:.05,anim:t=>xeno.pose({jaw:.6,t,strain:1})},
    drummer:{mesh:drummer,col:C.u,s:.9,y:-.1,dist:7.4,tilt:.05,extra:M.drumKit,anim:t=>drummer.pose({t,hitL:Math.max(0,Math.sin(t*6)),hitR:Math.max(0,-Math.sin(t*6)),leftTarget:M.drumKit.strikes.snare,rightTarget:M.drumKit.strikes.hat})}
  };
  const S=subjects[view]||subjects.present;
  const ang=Q.has('yaw')?+Q.get('yaw'):null;
  window.render=function(now){
    const t=now/1000;mode='promoView';phase='promo';shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    ctx.save();ctx.fillStyle='#000';ctx.fillRect(-20,-20,W+40,H+40);
    S.anim?.(t);
    viewPitch=-S.tilt;drawMesh({x:0,y:S.y+Math.tan(S.tilt)*S.dist*0,z:S.dist,s:S.s,rot:[0,ang??(Math.PI+t*.45),0]},S.mesh,S.col,1);
    ctx.restore();gpuBloom.render(canvas,glowStrength/100);
    requestAnimationFrame(window.render)
  };
  // A drum kit (extra) is drawn after its player: it stands in front of him.
  Promo.viewFrame=(t,yaw)=>{const keep=ang;S.anim?.(t);mode='promoView';phase='promo';shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    viewPitch=-S.tilt;ctx.save();ctx.fillStyle='#000';ctx.fillRect(-20,-20,W+40,H+40);drawMesh({x:0,y:S.y,z:S.dist,s:S.s,rot:[0,yaw,0]},S.mesh,S.col,1);if(S.extra)drawMesh({x:0,y:S.y,z:S.dist,s:S.s,rot:[0,yaw,0]},S.extra,C.r,1);ctx.restore();gpuBloom.render(canvas,.35)};
}
})();
