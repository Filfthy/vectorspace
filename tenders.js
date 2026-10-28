'use strict';

// SHIELD TENDERS (v1100)
//
// Some rogue and hijacked drone wings fly with a wartime support drone: a white hull
// that projects a shield onto the rest of its wing. While a tender is alive the
// shielded drones take much less laser damage (missiles are unaffected), and faint
// tether lines show who is covered. Kill the tender and the wing's shields drop.
// It is a priority target, not a boss: tougher than its wing, but it does not shoot
// harder. Drones only (people do not fly tenders). Never on training or DEV runs.
const AgentXTenders={
  CHANCE:.3,HP:1.6,LASER_MULT:.4,MIN_LEVEL:6,PROFILES:new Set(['rogue','hijacked']),
  armed:false,pending:null,
  live(){return typeof fighters==='undefined'?[]:fighters.filter(f=>f.tender&&!f.dead&&!f.dying&&f.t>=0)},
  // Called once per fighter stage start, beside the ace roll (see startFighterStage).
  arm(profile){
    const m=typeof campaign!=='undefined'?campaign.currentMission:null;
    const lvl=typeof campaign!=='undefined'?campaign.levelForXP?.()||1:1;
    this.armed=!!(m&&(this.force||(!m.training&&!m.devTest&&!m.devTemplateTest&&lvl>=this.MIN_LEVEL&&Math.random()<this.CHANCE))&&this.PROFILES.has(profile));
    this.force=false;return this.armed
  },
  // The second fighter of the fight becomes the tender.
  maybeMark(f,rosterIndex){
    if(!this.armed||rosterIndex<1||f.bugKind||f.ace)return false;
    this.armed=false;f.tender=true;f.hp=f.maxHp=Math.round(f.hp*this.HP);f.col=C.w;
    const seen=campaign?.state&&(campaign.state.seenProfiles||(campaign.state.seenProfiles={}));if(seen)seen.tender=true;
    this.pending={text:'SHIELD TENDER · DESTROY IT FIRST',wait:6};
    return true
  },
  // A drone is shielded while any tender of its wing is alive (the tender never shields itself).
  shielded(f){return !!f&&!f.tender&&!f.bugKind&&f.type==='fighter'&&this.live().length>0},
  laserMultiplier(f){return this.shielded(f)?this.LASER_MULT:1},
  update(dt){
    const p=this.pending;if(!p)return;p.wait-=dt;
    if(p.wait<=0||(typeof callout==='function'&&callout(p.text,2.4))){if(p.wait>0&&audio?.hasVoice?.('shieldTenderContact'))audio.playVoice('shieldTenderContact',{once:false,priority:false});this.pending=null}
  },
  onKilled(f){
    if(!f?.tender)return;
    campaign.bumpStat?.('kills.tenders');
    if(!this.live().some(t=>t!==f)&&typeof callout==='function')callout(`SHIELD TENDER DOWN · WING EXPOSED${campaign.bountyTag?.()||''}`,2)
  },
  // Faint tethers from each tender to the drones it covers.
  draw(){
    const ts=this.live();if(!ts.length||typeof proj!=='function')return;
    const pulse=.22+.12*Math.sin((typeof time==='number'?time:0)*6);
    for(const t of ts){
      const a=proj([t.x,t.y,t.z]);if(!a)continue;
      for(const f of fighters){
        if(f===t||f.dead||f.dying||f.t<0||!this.shielded(f))continue;
        const b=proj([f.x,f.y,f.z]);if(b)line(a.x,a.y,b.x,b.y,C.w,.7,pulse)
      }
    }
  }
};
globalThis.AgentXTenders=AgentXTenders;
