'use strict';

// OPTIONAL ROUTE DIVERSIONS (v420) — POSSIBLE GAME DIRECTION.txt
//
// "Do not make every random event compulsory." A diversion is a short window in open
// space where something off the route can be investigated or ignored:
//
//   DISTRESS BEACON   fly to the marker; survivors, nav data, an automated beacon, or a trap
//   DERELICT          fly to the marker; salvage rights, flight logs, nothing, or dormant drones
//   PURSUED CIVILIAN  raiders chasing a civilian craft; destroy them before it is caught
//
// Flying away from the marker, or simply letting the window run out, ignores it and the
// route continues. Rewards are small: a little money, experience or standing. They are
// paid with the contract and shown on the debrief. The marker and tractor reuse the
// salvage system's embedded pickup; the fights reuse the normal fighter stage.
const routeDiversion={
  active:false,stage:null,kind:'',state:'idle',t:0,window:18,startDistance:0,result:null,

  KINDS:{
    beacon:{nav:'DISTRESS BEACON DETECTED',voice:'distressBeaconDetected',hud:'DISTRESS BEACON',marker:'DISTRESS BEACON',label:'distress beacon',window:18,
      outcomes:[
        {id:'survivors',weight:34,say:'SURVIVORS RECOVERED',voice:'survivorsRecovered',pay:.08,rep:2,text:'Survivors recovered'},
        {id:'navdata',weight:22,say:'NAV DATA RECOVERED',xp:.25,text:'Beacon nav data'},
        {id:'automated',weight:22,say:'BEACON AUTOMATED · NO SURVIVORS',text:'Automated beacon'},
        {id:'trap',weight:22,say:'IT WAS A TRAP',voice:'itWasATrap',fight:{profile:'pirate',hud:'BEACON AMBUSH',min:3,max:5},pay:.06,text:'Beacon ambush survived'}
      ]},
    derelict:{nav:'DERELICT CRAFT OFF ROUTE',voice:'derelictCraftOffRoute',hud:'DERELICT',marker:'DERELICT',label:'derelict hulk',window:20,
      outcomes:[
        {id:'salvage',weight:36,say:'SALVAGE RIGHTS LOGGED',pay:.12,text:'Salvage rights'},
        {id:'logs',weight:22,say:'FLIGHT LOGS RECOVERED',xp:.3,text:'Recovered flight logs'},
        {id:'stripped',weight:22,say:'DERELICT ALREADY STRIPPED',text:'Derelict stripped'},
        {id:'dormant',weight:20,say:'DORMANT DRONES ACTIVATED',voice:'dormantDronesActivated',fight:{profile:'rogue',hud:'DORMANT DRONES',min:4,max:5},pay:.08,text:'Dormant drones destroyed'}
      ]},
    // v920: a drifting escape pod, and an unmarked smuggler cache that pays well and
    // pleases Red Jackal, at the cost of OSD standing (alsoRep adds a second entry).
    pod:{nav:'ESCAPE POD SIGNAL',hud:'ESCAPE POD',marker:'ESCAPE POD',label:'escape pod',window:18,
      outcomes:[
        {id:'rescued',weight:46,say:'POD RECOVERED · SURVIVOR ALIVE',pay:.06,rep:3,repFaction:'security',text:'Escape pod survivor rescued'},
        {id:'empty',weight:24,say:'POD EMPTY · LIFE SUPPORT FAILED',text:'Escape pod, no survivor'},
        {id:'bait',weight:30,say:'THE POD WAS BAIT',fight:{profile:'pirate',hud:'POD AMBUSH',min:3,max:5},pay:.06,text:'Pod ambush survived'}
      ]},
    cache:{nav:'UNMARKED CARGO CACHE',hud:'SMUGGLER CACHE',marker:'CARGO CACHE',label:'smuggler cache',window:18,
      outcomes:[
        {id:'goods',weight:55,say:'CACHE CLAIMED · OSD WILL NOT LIKE THIS',pay:.18,rep:2,repFaction:'jackals',alsoRep:{faction:'security',amount:-3,text:'OSD noticed the cache'},text:'Smuggler cache claimed'},
        {id:'guarded',weight:30,say:'THE CACHE IS GUARDED',fight:{profile:'hostile',hud:'CACHE GUARDS',min:3,max:5},pay:.14,rep:2,repFaction:'jackals',alsoRep:{faction:'security',amount:-3,text:'OSD noticed the cache'},text:'Guarded cache claimed'},
        {id:'tracker',weight:15,say:'TRACKER IN THE CACHE · CUSTOMS INBOUND',fight:{profile:'customs',hud:'CUSTOMS INTERCEPT',min:3,max:4},pay:.1,text:'Cache tracker, Customs fought off'}
      ]},
    civilian:{nav:'CIVILIAN CRAFT UNDER PURSUIT',voice:'civilianCraftUnderAttack',hud:'CIVILIAN UNDER ATTACK',window:24,
      helped:{say:'CIVILIAN SAFE',voice:'civilianSafe',pay:.1,rep:3,repFaction:'security',text:'Civilian rescued'},
      ignored:{say:'CIVILIAN CONTACT LOST',voice:'civilianContactLost'}}
  },

  begin(stage){
    const kind=this.KINDS[stage?.diversion]?stage.diversion:'beacon',def=this.KINDS[kind];
    this.active=true;this.stage=stage;this.kind=kind;this.state='window';this.t=0;this.window=def.window||18;this.result=null;
    stage.spaceCombat=false;stage.hudTag=def.hud;
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;
    interceptorGoal=9999;interceptorsDestroyed=0;interceptorClearDelay=0;
    resetPlanetBearing();resetSpaceMotion();resetSpaceDogfightDirector();
    audio.music.setMode(campaign.currentMission?.musicMode||'calm');
    if(kind==='civilian'){
      // Raiders chasing someone else. They hold fire on X unless X joins in, so the
      // event can genuinely be flown past. Destroying them all in time saves the civilian.
      const n=3+Math.floor(Math.random()*2);
      stage.spaceCombat=true;
      scenarioFlow.startFighterStage({...stage,target:n,fighterHp:Math.round(12*campaign.contractToughnessScale(campaign.currentMission?.risk||1)),profile:'pirate',navMessage:null},'pirate',{preservePhase:true});
      scenarioFlow.encounterHudTag=def.hud;
      // v510: the civilian is a real craft ahead of X, fleeing sideways, with a hull
      // that drains while raiders are alive. Clear them in time and it gets away.
      const side=Math.random()<.5?-1:1,w=cameraPointToWorld([side*-45,4+Math.random()*8,150]);
      this.civ={x:w[0],y:w[1],z:w[2],s:5,rot:[0,side>0?-.55:.55,0],vx:side*7,hp:1,hitT:0,dead:false,col:C.c};
      this.state='pursuit';callout(`${def.nav} · ASSIST OR CONTINUE`,2.4);this.speak(def.voice);return true
    }
    // Beacon or derelict: a marker off the route, reached under the player's own control.
    // The drone cruises forward at ~45 u/s, so the marker sits well ahead and off to one
    // side: about six seconds to decide. Steer in to investigate; hold course and it passes.
    const side=Math.random()<.5?-1:1,w=cameraPointToWorld([side*(55+Math.random()*20),(Math.random()-.4)*22,260+Math.random()*60]);
    salvageRecovery.reset();salvageRecovery.active=true;
    salvageRecovery.stage={type:'embedded_recovery',recoveryLabel:def.label,markerLabel:def.marker,recoveryHudPrefix:def.marker,captureRadius:20,markerGrowRange:110,tractorSeconds:1.9,recoveredMessage:'INVESTIGATING'};
    salvageRecovery.state='search';salvageRecovery.package={x:w[0],y:w[1],z:w[2],rot:[.2,Math.random()*6.28,-.1]};
    salvageRecovery.embeddedCompletion=()=>this.investigated();salvageRecovery.embeddedRestorePhase='space';
    this.startDistance=salvageRecovery.distance();
    callout(`${def.nav} · INVESTIGATE OR CONTINUE`,2.4);this.speak(def.voice);return true
  },
  hudLeft(){
    if(!this.active)return '';
    const left=Math.max(0,Math.ceil(this.window-this.t)),def=this.KINDS[this.kind];
    if(this.state==='fight')return this.stage?.hudTag||def.hud;
    return `${def.hud} · ${left}s`
  },
  update(dt){
    if(!this.active)return;
    if(this.state==='window'){
      // Still deciding: the tractor pickup (salvage system) ends this state if X flies in.
      if(salvageRecovery.state==='pickup')return;
      this.t+=dt;
      const p=salvageRecovery.package,behind=p?camPoint([p.x,p.y,p.z])[2]<-6:true,d=salvageRecovery.distance(),movedAway=this.t>4&&d>this.startDistance*1.4;
      if(this.t>=this.window||behind||movedAway)this.ignore(`${this.KINDS[this.kind].marker} OUT OF RANGE`);
    }else if(this.state==='pursuit'){
      this.t+=dt;
      for(const f of fighters)if(!f.dead&&!f.dying&&!f.provoked)f.shotsLeft=0;
      const c=this.civ;
      if(c&&!c.dead){
        // Same open-space cruise shift as every other free object, plus its own flight:
        // forward a little slower than X (so it can be caught) and sideways across the view.
        const k=OPEN_SPACE_CRUISE*dt;c.x-=spaceMoveX*k;c.y-=spaceMoveY*k;c.z-=spaceMoveZ*k;
        c.z+=40*dt;c.x+=c.vx*dt;c.y+=Math.sin(this.t*1.3)*1.2*dt;c.hitT=Math.max(0,c.hitT-dt);
        // Unprovoked raiders close on the civilian rather than on X.
        for(const f of fighters){if(f.dead||f.dying||f.provoked)continue;const g=Math.min(1,dt*.7);f.x+=(c.x-10+Math.random()*20-f.x)*g;f.y+=(c.y-6+Math.random()*12-f.y)*g;f.z+=(c.z-18-f.z)*g}
        const alive=fighters.filter(f=>!f.dead&&!f.dying).length;
        if(alive){c.hp-=dt*.016*alive;if(Math.random()<dt*alive*1.4){c.hitT=.12;const p=proj([c.x,c.y,c.z]);if(p)spark(p.x,p.y,C.y,5)}}
        if(c.hp<=0){
          c.dead=true;const p=proj([c.x,c.y,c.z]);if(p&&typeof explodeMesh==='function')explodeMesh(c,this.CIV_MESH,p,C.c);
          this.finishPursuit(false,'CIVILIAN CRAFT DESTROYED');return
        }
      }
      if(this.t>=this.window)this.finishPursuit(false);
    }
  },
  // A shot at a pursuer means X has joined in: that raider fights back.
  onPlayerHitFighter(f){if(this.active&&this.state==='pursuit'&&f){f.provoked=true;if(!(f.shotsLeft>0))f.shotsLeft=3}},
  // v600: speaks a requested line (voice-requests.js) only once its recording exists.
  speak(key){if(key&&audio.hasVoice?.(key))audio.playVoice(key,{once:false,priority:false})},
  pick(list){const total=list.reduce((n,o)=>n+o.weight,0);let r=Math.random()*total;for(const o of list){r-=o.weight;if(r<=0)return o}return list[0]},
  investigated(){
    const def=this.KINDS[this.kind],o=this.pick(def.outcomes);
    if(o.fight){
      const k=campaign.contractToughnessScale(campaign.currentMission?.risk||1);
      const n=o.fight.min+Math.floor(Math.random()*(o.fight.max-o.fight.min+1));
      this.stage.spaceCombat=true;this.stage.hudTag=o.fight.hud;this.state='fight';this.pendingOutcome=o;
      callout(o.say,1.8);
      scenarioFlow.startFighterStage({...this.stage,target:n,fighterHp:Math.round(12*k),profile:o.fight.profile,navMessage:null,combatVoice:audio.hasVoice?.(o.voice)?o.voice:undefined},o.fight.profile,{preservePhase:true});
      scenarioFlow.encounterHudTag=o.fight.hud;return
    }
    callout(o.say,1.8);this.speak(o.voice);SoundFX.objectiveComplete?.();
    this.record(o);this.end()
  },
  // Called by the main loop when every fighter in this stage is down.
  onFightCleared(){
    if(this.state==='fight'){callout('HOSTILES CLEARED · CONTINUING ROUTE',1.6);this.record(this.pendingOutcome);this.end();return}
    if(this.state==='pursuit')this.finishPursuit(true)
  },
  finishPursuit(helped,message=null){
    const def=this.KINDS.civilian,o=helped?def.helped:def.ignored;
    if(!helped){fighters.length=0;bolts.length=0}
    this.civ=null;
    callout(message||o.say,1.8);this.speak(o.voice);if(helped)this.record({id:'rescued',...o});else this.recordIgnored();
    this.end()
  },
  ignore(message){
    salvageRecovery.reset();callout(message,1.6);this.recordIgnored();this.end()
  },
  record(o){
    const m=campaign.currentMission;if(!m||!o)return;
    const pay=o.pay?Math.round((m.pay*o.pay)/50)*50:0,xp=o.xp?Math.round(m.xp*o.xp):0;
    const repFaction=o.rep?(o.repFaction||m.faction||null):null;
    (m.diversions||(m.diversions=[])).push({kind:this.kind,outcome:o.id,text:o.text,pay,xp,rep:o.rep||0,repFaction});
    if(o.alsoRep)m.diversions.push({kind:this.kind,outcome:o.id,side:true,text:o.alsoRep.text,pay:0,xp:0,rep:o.alsoRep.amount,repFaction:o.alsoRep.faction});
  },
  recordIgnored(){const m=campaign.currentMission;if(m)(m.diversions||(m.diversions=[])).push({kind:this.kind,outcome:'ignored',text:'Ignored',pay:0,xp:0,rep:0})},
  end(){
    this.active=false;this.state='idle';const stage=this.stage;this.stage=null;
    if(stage){stage.spaceCombat=false;stage.hudTag=''}
    scenarioFlow.encounterHudTag='';interceptorGoal=9999;
    if(campaign.currentMission&&campaign.currentStage?.()===stage)scenarioFlow.completeCurrentStage()
  },
  // A small boxy hauler: cab, long cargo spine, two side pods and engine bells.
  CIV_MESH:{
    v:[[-.32,-.22,-1],[.32,-.22,-1],[.32,.22,-1],[-.32,.22,-1],[-.32,-.22,.9],[.32,-.22,.9],[.32,.22,.9],[-.32,.22,.9],
       [-.18,-.12,1.35],[.18,-.12,1.35],[.18,.12,1.35],[-.18,.12,1.35],
       [-.62,-.14,-.7],[-.62,.14,-.7],[-.62,.14,.5],[-.62,-.14,.5],[.62,-.14,-.7],[.62,.14,-.7],[.62,.14,.5],[.62,-.14,.5],
       [-.18,0,-1.3],[.18,0,-1.3]],
    e:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],
       [4,8],[5,9],[6,10],[7,11],[8,9],[9,10],[10,11],[11,8],
       [12,13],[13,14],[14,15],[15,12],[16,17],[17,18],[18,19],[19,16],[12,0],[15,4],[16,1],[19,5],
       [20,0],[20,3],[21,1],[21,2],[20,21]]
  },
  appendScene(scene){
    const c=this.civ;if(!this.active||this.state!=='pursuit'||!c||c.dead)return;
    const q=camPoint([c.x,c.y,c.z]);if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(c,this.CIV_MESH,c.hitT>0?C.w:(c.hp<.3?C.r:C.c))})
  },
  drawMarker(){
    const c=this.civ;if(!this.active||this.state!=='pursuit'||!c||c.dead)return;
    const q=camPoint([c.x,c.y,c.z]);if(q[2]<=.18)return;const p=projectCam(q);if(!p)return;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;
    ctx.strokeStyle=c.hp<.3?C.r:C.c;ctx.strokeText(`CIVILIAN ${Math.max(0,Math.ceil(c.hp*100))}%`,p.x,p.y-Math.max(16,3.4*p.k*.6));ctx.restore()
  },
  reset(){
    this.civ=null;
    // Abandon/fail mid-diversion: release the marker this diversion borrowed.
    if(this.active&&salvageRecovery.stage?.type==='embedded_recovery')salvageRecovery.reset();
    this.active=false;this.state='idle';this.stage=null;this.t=0
  }
};
globalThis.routeDiversion=routeDiversion;
