'use strict';

// NAMED ACES (v810)
//
// Now and then a pirate or mercenary fight includes one named pilot: a red hull,
// three times the toughness, announced by name when it arrives. Killing it pays an
// ace bounty on top of the normal kill (kills.aces, worth 5 bounty units) and is
// counted on the Operator record. Drones, customs and xenos never have aces: an ace
// is a person with a reputation. Never on training or DEV runs, never below risk 3.
const AgentXAces={
  CHANCE:.22,HP:3,PROFILES:new Set(['pirate','hostile']),
  NAMES:{
    pirate:['Old Teeth','Red Mags','Knifejaw','Six-Finger Ord','Lady Ash','The Accountant','Vesper Kade','Halfmoon Rook','Bad Penny','Grin Okonkwo'],
    hostile:['Captain Saro Vell','The Quiet Contract','Iron Juno','Marek Thale','Widow Brask','Ninefold','Corin Ashby','The Auditor']
  },
  armed:false,
  // Called once per fighter stage start (see startFighterStage): decide whether this
  // fight has an ace waiting in its reserves.
  arm(profile){
    const m=typeof campaign!=='undefined'?campaign.currentMission:null;
    this.armed=!!(m&&!m.training&&!m.devTest&&!m.devTemplateTest&&(Number(m.risk)||1)>=3&&this.PROFILES.has(profile)&&Math.random()<this.CHANCE);
    this.profile=profile;return this.armed
  },
  // Called for each spawned fighter. The third fighter of the fight becomes the ace.
  maybeMark(f,rosterIndex){
    if(!this.armed||rosterIndex<2||f.bugKind)return false;
    this.armed=false;
    const list=this.NAMES[this.profile]||this.NAMES.pirate,name=list[Math.floor(Math.random()*list.length)];
    f.ace={name};f.hp=f.maxHp=Math.round(f.hp*this.HP);f.col=C.r;
    // The fight's opening voice line usually owns the subtitle at this moment, so the
    // arrival waits (up to six seconds) for the line to clear rather than being lost.
    this.pending={text:`ACE CONTACT · ${name.toUpperCase()}`,wait:6};
    return true
  },
  update(dt){
    const p=this.pending;if(!p)return;p.wait-=dt;
    if(p.wait<=0||(typeof callout==='function'&&callout(p.text,2.4))){if(p.wait>0&&audio?.hasVoice?.('aceContact'))audio.playVoice('aceContact',{once:false,priority:false});this.pending=null}
  },
  onKilled(f){
    if(!f?.ace)return;
    campaign.bumpStat?.('kills.aces');if(audio?.hasVoice?.('aceDown'))audio.playVoice('aceDown',{once:false,priority:false});
    if(typeof callout==='function')callout(`${f.ace.name.toUpperCase()} DOWN${campaign.bountyTag?.()||''}`,2)
  }
};
globalThis.AgentXAces=AgentXAces;
