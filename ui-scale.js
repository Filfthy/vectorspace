'use strict';

// HUB SCALE (v430)
//
// The cabinet hub was laid out for a 1280x720 screen, so on a larger monitor every
// panel, box and line of text stayed the same pixel size and became tiny. The hub
// shell is now zoomed as one piece: the screen-size factor keeps the designed layout
// proportional on any display, and the player's text-size setting (A- / A+) sits on
// top. Zoom scales boxes and text together, so fixed-height rows cannot overflow.
const AgentXUiScale={
  key:'agentXUiScale',
  steps:[.85,1,1.15,1.3,1.5],
  user:1,
  // Full-screen cabinet panels (sized to 1/z of the viewport) and the centred title
  // panel (zoomed in place). The in-flight HUD is drawn on the canvas and is separate.
  fullScreen:['campaignShell','optionsModal','aboutModal'],
  centred:['gatePanel'],
  load(){
    try{const v=parseFloat(localStorage.getItem(this.key));if(this.steps.includes(v))this.user=v}catch(_){}
    return this.user
  },
  save(){try{localStorage.setItem(this.key,String(this.user))}catch(_){}},
  screenFactor(){return Math.max(1,Math.min(2.6,Math.min(innerWidth/1280,innerHeight/720)))},
  zoom(){return this.screenFactor()*this.user},
  hudScale(){return Math.min(3,this.screenFactor()*this.user)},
  apply(){
    const z=this.zoom();
    for(const id of this.fullScreen){
      const el=document.getElementById(id);if(!el)continue;
      // Zoom multiplies lengths inside the element, viewport units included, so each
      // panel is given 1/z of the viewport and still fills exactly one screen.
      el.style.zoom=String(z);el.style.inset='auto';el.style.left='0';el.style.top='0';el.style.width=`${100/z}vw`;el.style.height=`${100/z}vh`
    }
    for(const id of this.centred){const el=document.getElementById(id);if(el)el.style.zoom=String(this.screenFactor())}
    // In-flight HUD: the canvas strip and world labels, the nav message line and the
    // equipment slots all follow the same screen factor and text setting.
    const k=this.hudScale();globalThis.AgentXHudScale=k;globalThis.AgentXHudTextScale=k;
    document.documentElement.style.setProperty('--hud-scale',String(k));
    const gear=document.getElementById('gearHud');if(gear)gear.style.zoom=String(k);
    const label=document.getElementById('uiScaleValue');if(label)label.textContent=`${Math.round(this.user*100)}%`;
    for(const b of document.querySelectorAll('[data-ui-scale]')){
      const dir=b.dataset.uiScale,i=this.steps.indexOf(this.user);
      b.disabled=dir==='down'?i<=0:i>=this.steps.length-1
    }
    // Panels that measure themselves (custom scrollbars, contract lists) re-layout.
    try{campaign?.contractScrollbar?.update?.()}catch(_){}
    return z
  },
  step(dir){
    const i=this.steps.indexOf(this.user),n=Math.max(0,Math.min(this.steps.length-1,i+(dir==='up'?1:-1)));
    if(n===i)return false;this.user=this.steps[n];this.save();this.apply();
    try{SoundFX.uiClick?.()}catch(_){}
    return true
  },
  install(){
    this.load();
    const bind=()=>{
      for(const b of document.querySelectorAll('[data-ui-scale]'))if(!b.dataset.uiScaleBound){b.dataset.uiScaleBound='1';b.addEventListener('click',()=>this.step(b.dataset.uiScale))}
      this.apply()
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
    addEventListener('resize',()=>this.apply());
    // Keyboard: Ctrl/Cmd +/- would zoom the whole browser; plain [ and ] adjust text in the hub.
    addEventListener('keydown',e=>{
      if(!document.getElementById('campaignShell')?.classList.contains('open'))return;
      if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
      if(e.key===']'){this.step('up');e.preventDefault()}else if(e.key==='['){this.step('down');e.preventDefault()}
    })
  }
};
globalThis.AgentXUiScale=AgentXUiScale;
AgentXUiScale.install();
