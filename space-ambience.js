'use strict';

// SPACE AMBIENCE (v1690)
//
// v1700: also a passing convoy's lights when the nav computer mentions one.
//
// v2300: the distant comet (v1690) was removed at Dave's request.
const AgentXSpaceAmbience={
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
    this.drawConvoy()
  }
};
globalThis.AgentXSpaceAmbience=AgentXSpaceAmbience;
