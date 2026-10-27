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
    beacon:{nav:'DISTRESS BEACON DETECTED',hud:'DISTRESS BEACON',marker:'DISTRESS BEACON',label:'distress beacon',window:18,
      outcomes:[
        {id:'survivors',weight:34,say:'SURVIVORS RECOVERED',pay:.08,rep:2,text:'Survivors recovered'},
        {id:'navdata',weight:22,say:'NAV DATA RECOVERED',xp:.25,text:'Beacon nav data'},
        {id:'automated',weight:22,say:'BEACON AUTOMATED · NO SURVIVORS',text:'Automated beacon'},
        {id:'trap',weight:22,say:'IT WAS A TRAP',fight:{profile:'pirate',hud:'BEACON AMBUSH',min:3,max:5},pay:.06,text:'Beacon ambush survived'}
      ]},
    derelict:{nav:'DERELICT CRAFT OFF ROUTE',hud:'DERELICT',marker:'DERELICT',label:'derelict hulk',window:20,
      outcomes:[
        {id:'salvage',weight:36,say:'SALVAGE RIGHTS LOGGED',pay:.12,text:'Salvage rights'},
        {id:'logs',weight:22,say:'FLIGHT LOGS RECOVERED',xp:.3,text:'Recovered flight logs'},
        {id:'stripped',weight:22,say:'DERELICT ALREADY STRIPPED',text:'Derelict stripped'},
        {id:'dormant',weight:20,say:'DORMANT DRONES ACTIVATED',fight:{profile:'rogue',hud:'DORMANT DRONES',min:4,max:5},pay:.08,text:'Dormant drones destroyed'}
      ]},
    civilian:{nav:'CIVILIAN CRAFT UNDER PURSUIT',hud:'CIVILIAN UNDER ATTACK',window:24,
      helped:{say:'CIVILIAN SAFE',pay:.1,rep:3,repFaction:'security',text:'Civilian rescued'},
      ignored:{say:'CIVILIAN CONTACT LOST'}}
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
      this.state='pursuit';say(`${def.nav} · ASSIST OR CONTINUE`,1.6);return true
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
    say(`${def.nav} · INVESTIGATE OR CONTINUE`,1.6);return true
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
      if(this.t>=this.window)this.finishPursuit(false);
    }
  },
  // A shot at a pursuer means X has joined in: that raider fights back.
  onPlayerHitFighter(f){if(this.active&&this.state==='pursuit'&&f){f.provoked=true;if(!(f.shotsLeft>0))f.shotsLeft=3}},
  pick(list){const total=list.reduce((n,o)=>n+o.weight,0);let r=Math.random()*total;for(const o of list){r-=o.weight;if(r<=0)return o}return list[0]},
  investigated(){
    const def=this.KINDS[this.kind],o=this.pick(def.outcomes);
    if(o.fight){
      const k=campaign.contractToughnessScale(campaign.currentMission?.risk||1);
      const n=o.fight.min+Math.floor(Math.random()*(o.fight.max-o.fight.min+1));
      this.stage.spaceCombat=true;this.stage.hudTag=o.fight.hud;this.state='fight';this.pendingOutcome=o;
      say(o.say,1.4);
      scenarioFlow.startFighterStage({...this.stage,target:n,fighterHp:Math.round(12*k),profile:o.fight.profile,navMessage:null},o.fight.profile,{preservePhase:true});
      scenarioFlow.encounterHudTag=o.fight.hud;return
    }
    say(o.say,1.4);SoundFX.objectiveComplete?.();
    this.record(o);this.end()
  },
  // Called by the main loop when every fighter in this stage is down.
  onFightCleared(){
    if(this.state==='fight'){say('HOSTILES CLEARED · CONTINUING ROUTE',1.1);this.record(this.pendingOutcome);this.end();return}
    if(this.state==='pursuit')this.finishPursuit(true)
  },
  finishPursuit(helped){
    const def=this.KINDS.civilian,o=helped?def.helped:def.ignored;
    if(!helped){fighters.length=0;bolts.length=0}
    say(o.say,1.3);if(helped)this.record({id:'rescued',...o});else this.recordIgnored();
    this.end()
  },
  ignore(message){
    salvageRecovery.reset();say(message,1.1);this.recordIgnored();this.end()
  },
  record(o){
    const m=campaign.currentMission;if(!m||!o)return;
    const pay=o.pay?Math.round((m.pay*o.pay)/50)*50:0,xp=o.xp?Math.round(m.xp*o.xp):0;
    const repFaction=o.rep?(o.repFaction||m.faction||null):null;
    (m.diversions||(m.diversions=[])).push({kind:this.kind,outcome:o.id,text:o.text,pay,xp,rep:o.rep||0,repFaction});
  },
  recordIgnored(){const m=campaign.currentMission;if(m)(m.diversions||(m.diversions=[])).push({kind:this.kind,outcome:'ignored',text:'Ignored',pay:0,xp:0,rep:0})},
  end(){
    this.active=false;this.state='idle';const stage=this.stage;this.stage=null;
    if(stage){stage.spaceCombat=false;stage.hudTag=''}
    scenarioFlow.encounterHudTag='';interceptorGoal=9999;
    if(campaign.currentMission&&campaign.currentStage?.()===stage)scenarioFlow.completeCurrentStage()
  },
  reset(){
    // Abandon/fail mid-diversion: release the marker this diversion borrowed.
    if(this.active&&salvageRecovery.stage?.type==='embedded_recovery')salvageRecovery.reset();
    this.active=false;this.state='idle';this.stage=null;this.t=0
  }
};
globalThis.routeDiversion=routeDiversion;
