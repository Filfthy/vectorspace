'use strict';

// ASTEROID CLEARANCE AMBUSH (v1870)
//
// A board asteroid clearance is no longer always quiet. When the job starts, a hidden
// roll decides whether something is waiting in the field. If it is, it attacks once a
// share of the marked rocks are down (the noise draws it in). The rocks stay where they
// are and keep drifting, the fight runs in normal space against the same belt (as the
// Missing Manifest and Taco Beacon fights do), and the clearance carries on once the
// attackers are dead. Kills pay their usual bounty and experience.
//
// Chance by risk: about 17% at risk 1, 45% at risk 5, 70% at risk 9 and above.
// Who comes depends on the client and on your level (no xenos before level 3, no
// hijacked drones before level 5). Never in the simulator or on story missions.
// Hooks: scenarioFlow asteroids stage start (arm), core-game space update (update),
// core-game fight-cleared dispatch (onCleared), currentStageAllowsSpaceCombat and the
// asteroid draw conditions in core-renderer (fightActive).
(function(){
  const PROFILES={
    trade:[['pirate',6],['rogue',2],['xeno',1]],
    security:[['rogue',5],['pirate',2],['hijacked',2]],
    jackals:[['pirate',4],['hostile',3],['rogue',1]],
    helix:[['rogue',3],['xeno',4],['hijacked',1]],
    quickbite:[['xeno',4],['pirate',4],['rogue',1]]
  };
  const MIN_LEVEL={xeno:3,hijacked:5,hostile:4};
  const SAY={
    pirate:'PIRATES IN THE FIELD · THEY WERE WAITING FOR YOU',
    rogue:'ROGUE DRONES · THE SHOOTING WOKE THEM',
    xeno:'XENO SWARM · SOMETHING WAS NESTING IN THE ROCKS',
    hijacked:'HIJACKED DRONES · INBOUND THROUGH THE FIELD',
    hostile:'MERCENARIES · SOMEONE PAID TO KEEP THIS FIELD',
  };
  const VOICE={pirate:'destroyThePirates'};
  const A={
    stage:null,state:'idle',profile:'pirate',triggerAt:0,force:false,
    chanceFor(risk){return Math.max(.15,Math.min(.7,.1+.07*(Number(risk)||1)))},
    reset(){this.stage=null;this.state='idle';this.triggerAt=0},
    // Called as an asteroids stage starts.
    arm(stage){
      this.reset();
      const m=typeof campaign!=='undefined'?campaign.currentMission:null;
      if(!m||!stage||stage.type!=='asteroids'||stage.tutorial||m.training||!m.templateId||stage.ambush===false)return false;
      const risk=Number(m.risk)||1,force=this.force||stage.ambush===true;this.force=false;
      if(!force&&Math.random()>=this.chanceFor(risk))return false;
      const lvl=campaign.levelForXP?.()||1,list=(PROFILES[m.faction]||PROFILES.trade).filter(([p])=>lvl>=(MIN_LEVEL[p]||1));
      let r=Math.random()*list.reduce((n,x)=>n+x[1],0);this.profile=list[0][0];for(const [p,w] of list){r-=w;if(r<=0){this.profile=p;break}}
      const goal=Math.max(1,Number(stage.target)||12);
      this.triggerAt=Math.max(2,Math.min(goal-1,Math.round(goal*(.35+Math.random()*.3))));
      this.stage=stage;this.state='armed';return true
    },
    fightActive(){return this.state==='fight'&&!!this.stage&&campaign.currentStage?.()===this.stage},
    // Called every play frame from the asteroid phase and from the space phase.
    update(dt){
      if(this.state==='idle')return;
      if(!campaign.currentMission||campaign.currentStage?.()!==this.stage){this.reset();return}
      if(this.state==='armed'){
        if(phase==='asteroids'&&mode==='play'&&asteroidField.active&&asteroidField.state==='active'&&asteroidField.destroyed>=this.triggerAt&&asteroidField.destroyed<asteroidField.goal)this.start();
        return
      }
      // During the fight the belt keeps moving and colliding, but the clearance cannot
      // finish (asteroidField.update checks fightActive before it exits).
      if(this.state==='fight'&&phase==='space'&&mode==='play')asteroidField.update(dt)
    },
    start(){
      const m=campaign.currentMission,risk=Number(m?.risk)||1,k=campaign.contractToughnessScale(risk);
      const n=Math.max(3,Math.min(9,Math.round(3+risk*.6)));
      this.state='fight';
      asteroidField.spaceBackdrop=true;
      const voice=VOICE[this.profile]&&audio.hasVoice?.(VOICE[this.profile])?VOICE[this.profile]:undefined;
      scenarioFlow.startFighterStage({...this.stage,target:n,fighterHp:Math.round(12*k),profile:this.profile,navMessage:null,combatVoice:voice},this.profile);
      phase='space';mode='play';
      audio.music.setMode('violent');
      callout(SAY[this.profile]||SAY.pirate,2.4);
      return true
    },
    // The attackers are all down: back to the rocks.
    onCleared(){
      if(this.state!=='fight')return false;
      fighters.length=0;bolts.length=0;playerMissiles.length=0;
      scenarioFlow.encounterProfile='standard';resetSpaceDogfightDirector();
      asteroidField.spaceBackdrop=false;phase='asteroids';mode='play';phaseT=modeT=0;
      audio.music.setMode(campaign.currentMission?.musicMode||'calm');
      // Counted when the job succeeds (campaign completion), not here: v1920 review fix.
      if(campaign.currentMission)campaign.currentMission.ambushSurvived=true;
      this.state='done';
      const left=Math.max(0,asteroidField.goal-asteroidField.destroyed);
      callout(left?`FIELD CLEAR OF HOSTILES · ${left} MARKED ROCK${left===1?'':'S'} LEFT`:'FIELD CLEAR',2);
      SoundFX.objectiveComplete?.();
      return true
    }
  };
  globalThis.AgentXAsteroidAmbush=A;
})();
