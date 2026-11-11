'use strict';

// MINELAYERS (v1950)
//
// Some pirate and mercenary fights include a minelayer: an orange raider, a little
// tougher than its wing, that seeds proximity mines behind it while it is ahead of
// you. A mine arms when you come close and goes off a moment later. Shoot the mines
// to clear a lane (one hit each), keep clear of them, or kill the layer first and no
// more are laid. Mines left over fade once the fight is over. People fly minelayers,
// so never drones or xenos. Never on training or DEV runs (force:true for tests).
// Hooks: arm (startFighterStage), maybeMark (core-mission startEvent), update
// (campaign.updateCombatEffects), onKilled (campaign.onFighterKilled), shotCandidate /
// hitMine (core-weapons), appendScene (core-renderer), reset (core-game).
const AgentXMinelayers={
  CHANCE:.25,HP:1.4,MIN_LEVEL:5,PROFILES:new Set(['pirate','hostile']),
  DROP_EVERY:3.4,MAX_MINES:8,ARM_RANGE:14,FUSE:.25,BLAST:12,MINE_LIFE:32,   // at cruise a quarter-second fuse goes off near the closest pass
  armed:false,pending:null,mines:[],force:false,
  live(){return typeof fighters==='undefined'?[]:fighters.filter(f=>f.minelayer&&!f.dead&&!f.dying&&f.t>=0)},
  arm(profile){
    this.mines=[];
    const m=typeof campaign!=='undefined'?campaign.currentMission:null;
    const lvl=typeof campaign!=='undefined'?campaign.levelForXP?.()||1:1;
    this.armed=!!(m&&(this.force||(!m.training&&!m.devTest&&!m.devTemplateTest&&lvl>=this.MIN_LEVEL&&Math.random()<this.CHANCE))&&this.PROFILES.has(profile));
    this.force=false;return this.armed
  },
  // The third fighter of the fight becomes the layer.
  maybeMark(f,rosterIndex){
    if(!this.armed||rosterIndex<2||f.bugKind||f.ace||f.tender||f.ghost)return false;
    this.armed=false;f.minelayer=true;f.hp=f.maxHp=Math.round(f.hp*this.HP);f.col=C.o;f.dropT=2.2;
    const seen=campaign?.state&&(campaign.state.seenProfiles||(campaign.state.seenProfiles={}));if(seen)seen.minelayer=true;
    this.pending={text:'MINELAYER · IT IS SEEDING MINES · KILL IT FIRST',wait:6};
    return true
  },
  update(dt){
    const p=this.pending;
    if(p){p.wait-=dt;if(p.wait<=0||(typeof callout==='function'&&callout(p.text,2.4,false))){if(p.wait>0)if(audio?.hasVoice?.('minelayerDetected'))audio.playVoice('minelayerDetected',{once:false,priority:true});this.pending=null}}
    if(typeof mode==='undefined'||mode!=='play'||phase!=='space'){return}
    const layers=this.live(),fightOn=fighters.some(f=>!f.dead&&!f.dying);
    for(const f of layers){
      f.dropT-=dt;if(f.dropT>0)continue;f.dropT=this.DROP_EVERY;
      const q=camPoint([f.x,f.y,f.z]);if(q[2]<18||q[2]>170||this.mines.length>=this.MAX_MINES)continue;
      this.mines.push({x:f.x,y:f.y,z:f.z,s:.85,rot:[Math.random()*6,Math.random()*6,0],spin:[(Math.random()-.5)*2,(Math.random()-.5)*2],drift:[(Math.random()-.5)*2,(Math.random()-.5)*1.5],armed:false,armT:0,age:0,dead:false})
    }
    const k=OPEN_SPACE_CRUISE*dt;
    for(const m of this.mines){
      if(m.dead)continue;
      m.x-=spaceMoveX*k;m.y-=spaceMoveY*k;m.z-=spaceMoveZ*k;
      m.x+=m.drift[0]*dt;m.y+=m.drift[1]*dt;m.rot[0]+=m.spin[0]*dt;m.rot[1]+=m.spin[1]*dt;m.age+=dt;
      // Fade out of play when it falls far behind, grows old, or the fight is over (v1980:
      // at once, so none is left armed for the next stage).
      if(m.z<-30||m.age>this.MINE_LIFE||!fightOn){m.dead=true;m.faded=true;continue}
      const d=Math.hypot(m.x-shipX,m.y-shipY,m.z);
      if(!m.armed&&d<this.ARM_RANGE){m.armed=true;m.armT=this.FUSE}
      if(m.armed){m.armT-=dt;if(m.armT<=0)this.detonate(m,false)}
    }
    this.mines=this.mines.filter(m=>!m.dead||m.flash>0);
  },
  detonate(m,byShot){
    if(m.dead)return;m.dead=true;
    const p=proj([m.x,m.y,m.z]);if(p){if(typeof explodeMesh==='function')explodeMesh(m,stationProximityMineMesh,p,C.o);spark(p.x,p.y,C.y,10)}
    SoundFX.explosion?.();
    if(!byShot&&Math.hypot(m.x-shipX,m.y-shipY,m.z)<this.BLAST)damage('MINE BLAST');
  },
  shotCandidate(aim,bestDistance=1e9){
    if(!this.mines.length||phase!=='space')return null;let best=null,bd=bestDistance,bp=null;
    for(const m of this.mines){if(m.dead)continue;const p=proj([m.x,m.y,m.z]);if(!p)continue;
      const d=Math.hypot(aim.x-p.x,aim.y-p.y),r=clamp(m.s*p.k*2.2,14,72);if(d<r&&d<bd){best=m;bd=d;bp=p}}
    return best?{mine:best,distance:bd,point:bp}:null
  },
  hitMine(m){if(!m||m.dead)return;this.detonate(m,true);campaign.bumpStat?.('minesShot')},
  onKilled(f){
    if(!f?.minelayer)return;
    campaign.bumpStat?.('kills.minelayers');
    if(typeof callout==='function')callout(`MINELAYER DOWN · NO MORE MINES${campaign.bountyTag?.()||''}`,2)
  },
  appendScene(scene){
    if(phase!=='space'||mode!=='play')return;
    for(const m of this.mines){if(m.dead)continue;const q=camPoint([m.x,m.y,m.z]);
      if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(m,stationProximityMineMesh,m.armed&&Math.sin(m.armT*60)>0?C.w:C.o)})}
  },
  reset(){this.mines=[];this.pending=null;this.armed=false}
};
globalThis.AgentXMinelayers=AgentXMinelayers;
