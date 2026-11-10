'use strict';

// SPACE AMBIENCE (v1690)
//
// v1700: also a passing convoy's lights when the nav computer mentions one.
//
// Now and then an open-space leg has a comet hanging far off in the sky: a bright head
// with a long tail streaming away from it, fixed in direction like the stars, so it
// drifts across the view as the drone turns. Chosen per mission from its id (about one
// trip in four), so it is the same comet for the whole job. Scenery only. Never in the
// simulator.
const AgentXSpaceAmbience={
  cometFor(m){
    if(!m||m.training)return null;
    const key=m.id||m.title||'';if('_comet' in m&&m._cometKey===key)return m._comet;
    const s=String(m.id||m.title||'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    const r=k=>((h>>>0)%(1000+k*7))/(1000+k*7);
    let c=null;
    if(r(0)<.27){
      const az=(r(1)-.5)*2.4,el=.12+r(2)*.42,ta=r(3)*Math.PI*2;
      const dir=[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)];
      // The tail streams roughly sideways across the sky from the head.
      const tail=[Math.cos(ta)*.18,Math.sin(ta)*.08,-Math.sin(ta)*.18];
      c={dir,tail,len:.9+r(4)*.8};
    }
    Object.defineProperty(m,'_comet',{value:c,writable:true,configurable:true,enumerable:false});
    Object.defineProperty(m,'_cometKey',{value:key,writable:true,configurable:true,enumerable:false});
    return c
  },
  // v1700: when the nav computer says a convoy or freight traffic is passing, show it: a
  // line of blinking navigation lights crossing far off, slowly.
  drawConvoy(){
    const st=typeof campaign!=='undefined'?campaign.currentStage?.():null,msg=String(st?.navMessage||'');
    if(!st?.navAmbient||!/CONVOY|FREIGHTER|HAULER/.test(msg))return;
    const cv=st._convoy||(Object.defineProperty(st,'_convoy',{value:{az:(Math.random()-.5)*1.6,el:.04+Math.random()*.12,dir:Math.random()<.5?-1:1,n:5+Math.floor(Math.random()*4),t0:typeof time==='number'?time:0},configurable:true,writable:true,enumerable:false}),st._convoy);
    const t=(typeof time==='number'?time:0)-cv.t0,D=3000;
    ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;
    for(let i=0;i<cv.n;i++){
      const az=cv.az+cv.dir*(t*.006-i*.012),el=cv.el+Math.sin(i*1.7)*.004,p=proj([shipX+Math.sin(az)*Math.cos(el)*D,shipY+Math.sin(el)*D,Math.cos(az)*Math.cos(el)*D]);
      if(!p||p.x<-10||p.x>W+10||p.y<-10||p.y>viewH+10)continue;
      const blink=Math.sin(t*4+i*1.3)>.2;ctx.globalAlpha=blink?.85:.3;ctx.strokeStyle=i===0?C.r:(i%2?C.w:C.g);
      ctx.beginPath();ctx.moveTo(p.x-1.6,p.y);ctx.lineTo(p.x+1.6,p.y);ctx.moveTo(p.x,p.y-1.6);ctx.lineTo(p.x,p.y+1.6);ctx.stroke()
    }
    ctx.restore()
  },
  draw(){
    if(typeof mode==='undefined'||mode!=='play'||phase!=='space')return;
    this.drawConvoy();
    const m=typeof campaign!=='undefined'?campaign.currentMission:null,c=this.cometFor(m);if(!c)return;
    const D=4000,at=k=>{const q=[c.dir[0]+c.tail[0]*k,c.dir[1]+c.tail[1]*k,c.dir[2]+c.tail[2]*k],n=Math.hypot(...q);return proj([shipX+q[0]/n*D,shipY+q[1]/n*D,q[2]/n*D])};
    const head=at(0);if(!head||head.x<-200||head.x>W+200||head.y<-200||head.y>viewH+200)return;
    ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=C.w;
    // Three strands, fanning slightly, fading towards the end.
    for(const[spread,a]of[[0,.55],[.05,.3],[-.05,.3]]){
      let prev=head;
      for(let i=1;i<=8;i++){const k=i/8*c.len,p=at(k);if(!p)break;const fan=spread*k;const q={x:p.x+(p.y-head.y)*fan,y:p.y-(p.x-head.x)*fan};
        ctx.globalAlpha=a*(1-i/9);ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(q.x,q.y);ctx.stroke();prev=q}
    }
    ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(head.x,head.y,2.6,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(head.x,head.y,6,0,Math.PI*2);ctx.stroke();
    ctx.restore()
  }
};
globalThis.AgentXSpaceAmbience=AgentXSpaceAmbience;
