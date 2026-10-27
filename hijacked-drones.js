'use strict';

// HIJACKED MILITARY DRONES (v720) — AGENT_X_WORLD_LORE.txt 3.3
//
// Partition War drones stolen and re-tasked by criminals. The irreversible patriotic
// layer cannot be cleanly rewritten, so the hijackers' orders keep fighting the old
// ones: every so often a drone hits a LOYALTY CONFLICT and stalls its guns for a
// moment, and destroying one can knock its neighbours into conflict too. Tougher
// hulls than pirates, orange on the scope, and a readable opening for the player.
//
// Fighters are spawned by core-mission.js (profile 'hijacked'). The stall reuses the
// EMP stun (stunT: no firing, cyan flicker). Ticked from campaign.updateCombatEffects.
const AgentXHijacked={
  HP:1.3,          // hull multiplier over the stage's fighter hull
  CASCADE:.4,      // chance each surviving hijacked drone stalls when one is destroyed
  calloutT:0,
  live(){return typeof fighters==='undefined'?[]:fighters.filter(f=>f.hijacked&&!f.dead&&!f.dying)},
  // First conflict comes a few seconds into the fight, then every 7 to 13 seconds per drone.
  arm(f){f.glitchCD=4+Math.random()*6},
  conflict(f,seconds){
    f.stunT=Math.max(f.stunT||0,seconds);f.glitchT=seconds;
    if(this.calloutT<=0&&typeof callout==='function'&&callout('LOYALTY CONFLICT',1.2))this.calloutT=4.5
  },
  update(dt){
    this.calloutT=Math.max(0,this.calloutT-dt);
    if(typeof mode!=='undefined'&&mode!=='play')return;
    for(const f of this.live()){
      f.glitchT=Math.max(0,(f.glitchT||0)-dt);
      if(f.glitchCD===undefined){this.arm(f);continue}
      f.glitchCD-=dt;
      if(f.glitchCD<=0){this.conflict(f,1.3+Math.random()*.9);f.glitchCD=7+Math.random()*6}
    }
  },
  onKilled(f){
    if(!f?.hijacked)return;
    for(const g of this.live())if(Math.random()<this.CASCADE)this.conflict(g,1.1+Math.random()*.8)
  }
};
globalThis.AgentXHijacked=AgentXHijacked;
