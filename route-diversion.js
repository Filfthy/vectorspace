'use strict';

// OPTIONAL ROUTE DIVERSIONS (v420) — POSSIBLE GAME DIRECTION.txt
//
// "Do not make every random event compulsory." A diversion is a short window in open
// space where something off the route can be investigated or ignored:
//
//   DISTRESS BEACON   fly to the marker; survivors, nav data, an automated beacon, or a trap
//   DERELICT          fly to the marker; salvage rights, flight logs, nothing, or dormant drones
//   PURSUED CIVILIAN  raiders chasing a civilian craft; destroy them before it is caught
//   FIGHT IN PROGRESS a patrol or escort already fighting raiders (v1360); they fire back,
//                     but are losing. Join in and save some of them for their network's
//                     thanks, or fly on and leave them to it
//   OLD MINEFIELD     Partition War contact mines drifting across the route (v1370). Not
//                     optional: fly through. Mines arm when X comes close and blow half a
//                     second later; shot mines go off harmlessly and set off neighbours.
//                     Clearing most of the field earns OSD's thanks
//   DORMANT LATTICE   a sleeping ghost-construct field across the route (v1530). Fly through
//                     without firing or brushing a core and it never wakes. Wake it and
//                     it gathers into a fight. Clearing it earns OSD's thanks
//   XENO MIGRATION    huge peaceful drifters crossing the route with a hornet escort (v1400).
//                     Fly alongside to scan them for Helix; fire on one and Helix will hear
//                     of it, and the escort turns on X
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
        {id:'dormant',weight:20,say:'DORMANT DRONES ACTIVATED',voice:'dormantDronesActivated',fight:{profile:'rogue',hud:'DORMANT DRONES',min:4,max:5},pay:.08,text:'Dormant drones destroyed'},
        // v1470: the wreckage round the hulk was a ghost lattice all along.
        {id:'lattice',weight:14,minLevel:4,say:'THE WRECKAGE IS WAKING · GHOST CONSTRUCTS',voice:'ghostConstructsDetected',fight:{profile:'ghost',hud:'GHOST CONSTRUCTS',min:3,max:4},pay:.1,text:'Ghost constructs destroyed'}
      ]},
    // v920: a drifting escape pod, and an unmarked smuggler cache that pays well and
    // pleases Red Jackal, at the cost of OSD standing (alsoRep adds a second entry).
    pod:{nav:'ESCAPE POD SIGNAL',voice:'escapePodSignal',hud:'ESCAPE POD',marker:'ESCAPE POD',label:'escape pod',window:18,
      outcomes:[
        {id:'rescued',weight:46,say:'POD RECOVERED · SURVIVOR ALIVE',voice:'podSurvivorRecovered',pay:.06,rep:3,repFaction:'security',text:'Escape pod survivor rescued'},
        {id:'empty',weight:24,say:'POD EMPTY · LIFE SUPPORT FAILED',text:'Escape pod, no survivor'},
        {id:'bait',weight:30,say:'THE POD WAS BAIT',fight:{profile:'pirate',hud:'POD AMBUSH',min:3,max:5},pay:.06,text:'Pod ambush survived'}
      ]},
    cache:{nav:'UNMARKED CARGO CACHE',voice:'cargoCacheDetected',hud:'SMUGGLER CACHE',marker:'CARGO CACHE',label:'smuggler cache',window:18,
      outcomes:[
        {id:'goods',weight:55,say:'CACHE CLAIMED · OSD WILL NOT LIKE THIS',pay:.18,rep:2,repFaction:'jackals',alsoRep:{faction:'security',amount:-3,text:'OSD noticed the cache'},text:'Smuggler cache claimed'},
        {id:'guarded',weight:30,say:'THE CACHE IS GUARDED',fight:{profile:'hostile',hud:'CACHE GUARDS',min:3,max:5},pay:.14,rep:2,repFaction:'jackals',alsoRep:{faction:'security',amount:-3,text:'OSD noticed the cache'},text:'Guarded cache claimed'},
        {id:'tracker',weight:15,say:'TRACKER IN THE CACHE · CUSTOMS INBOUND',fight:{profile:'customs',hud:'CUSTOMS INTERCEPT',min:3,max:4},pay:.1,text:'Cache tracker, Customs fought off'}
      ]},
    skirmish:{nav:'FIGHT IN PROGRESS',hud:'FIGHT IN PROGRESS',window:30,
      defenders:[{faction:'security',name:'OSD PATROL',label:'OSD patrol',short:'PATROL',col:C.u,drone:true,weight:45},
                 {faction:'trade',name:'FREE TRADER ESCORT',label:'Free Trader escort',short:'ESCORT',col:C.c,drone:false,weight:30},
                 {faction:'quickbite',name:'QUICKBITE COURIERS',label:'QuickBite couriers',short:'COURIERS',col:C.y,drone:true,weight:25}]},
    minefield:{nav:'OLD MINEFIELD ON ROUTE · SHOOT OR STEER CLEAR',hud:'MINEFIELD',window:26,
      cleared:{say:'ORDNANCE CLEARED · OSD WILL LOG IT',pay:.06,rep:2,repFaction:'security',text:'War-era mines cleared'}},
    lattice:{nav:'DORMANT GHOST LATTICE ON ROUTE · PASS QUIETLY OR WAKE IT',hud:'DORMANT LATTICE',window:28,
      cleared:{say:'LATTICE CLEARED · OSD WILL LOG IT',pay:.12,rep:2,repFaction:'security',text:'Ghost lattice cleared'}},
    // v1790: the same sleeping lattice as a job in its own right (the Lattice Survey board
    // contract): scan three cores from inside scan range but outside the range that wakes it.
    // v1820: three shells of three scans each (a bot flew the single pass in ten seconds).
    // The outer shell is strung out wide, the inner shell is pairs to thread between, and
    // the heart is a slalom close to the line. See latticeLayout.
    latticeSurvey:{nav:'DORMANT LATTICE · THREE SHELLS · SCAN THREE CORES IN EACH · DO NOT WAKE IT',hud:'LATTICE SURVEY',window:1e9,need:3,scanRange:46,scanSeconds:.9,
      shells:['OUTER SHELL','INNER SHELL','THE HEART'],
      surveyed:{say:'LATTICE SURVEYED · DATA SECURED',text:'Ghost lattice surveyed intact',xp:.1},
      // v1830: waking it costs half the fee and 40% of the XP, and its constructs carry no
      // bounty (campaign.recordBounty). Before this a woken lattice paid the full contract
      // plus a bounty on every construct, so shooting first earned more than the quiet
      // survey the client asked for.
      woken:{text:'Lattice woken and destroyed, survey lost',pay:-.5,xp:-.4}},
    // v1910: CONVOY ESCORT, a board job in its own right (main:true). A freighter crosses
    // open space at a little under cruise speed. Raiders come in waves and go for the
    // freighter, draining its hull while they live. Shoot one and it turns on you instead.
    // The freighter patches itself a little between waves. See beginEscort.
    escort:{nav:'CONVOY ESCORT · KEEP THE FREIGHTER ALIVE',hud:'CONVOY ESCORT',window:1e9,
      safe:{say:'CONVOY THROUGH · FREIGHTER SAFE',text:'Freighter escorted through',rep:3},
      lost:{say:'FREIGHTER DESTROYED · CONVOY LOST',text:'Freighter lost, convoy failed',pay:-.5,xp:-.4,rep:-3}},
    migration:{nav:'XENO MIGRATION CROSSING · FLY CLOSE TO SCAN · DO NOT FIRE',hud:'XENO MIGRATION',window:30,need:3,
      surveyed:{say:'MIGRATION SURVEYED · HELIX WILL WANT THIS',pay:.08,rep:3,repFaction:'helix',xp:.15,text:'Xeno migration surveyed'},
      fired:{text:'Fired on a xeno migration',rep:-4,repFaction:'helix'}},
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
    if(kind==='skirmish')return this.beginSkirmish(stage,def);
    if(kind==='minefield')return this.beginMinefield(stage,def);
    if(kind==='migration')return this.beginMigration(stage,def);
    if(kind==='lattice'||kind==='latticeSurvey')return this.beginLattice(stage,def);
    if(kind==='escort')return this.beginEscort(stage,def);
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
    if(this.state==='migration')return this.firedOnHerd?`${def.hud} · ESCORT HOSTILE`:`${def.hud} · SCANNED ${Math.min(this.scanned,def.need)}/${def.need} · ${left}s`;
    if(this.state==='minefield')return `${def.hud} · ${this.mines.filter(m=>!m.dead&&!m.passed).length} LEFT`;
    if(this.state==='lattice'&&this.surveyJob)return this.surveyDone?`${def.hud} · DATA SECURED`:`${def.hud} · ${def.shells[this.pass]||''} · ${Math.min(this.passScanned,def.need)}/${def.need}`;
    if(this.state==='lattice')return `${def.hud} · ${fighters.filter(f=>f.ghost&&!f.dead).length} CORES`;
    if(this.state==='latticeFight')return 'GHOST LATTICE · AWAKE';
    if(this.state==='escort'){const c=this.convoy;return `${def.hud} · WAVE ${Math.max(1,this.wave)}/${this.waves} · FREIGHTER ${c?Math.max(0,Math.ceil(c.hp*100)):0}%`}
    if(this.state==='skirmish'&&this.side)return `${def.hud} · ${this.side.short} ${this.allies.filter(a=>!a.dead).length}/${this.allies.length} · ${left}s`;
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
    }else if(this.state==='skirmish'){
      this.updateSkirmish(dt)
    }else if(this.state==='minefield'){
      this.updateMinefield(dt)
    }else if(this.state==='escort'){
      this.updateEscort(dt)
    }else if(this.state==='lattice'||this.state==='latticeFight'){
      this.updateLattice(dt)
    }else if(this.state==='migration'){
      this.updateMigration(dt)
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
  onPlayerHitFighter(f){if(this.active&&(this.state==='pursuit'||this.state==='skirmish'||this.state==='migration'||this.state==='escort')&&f){f.provoked=true;this.joined=true;if(!(f.shotsLeft>0))f.shotsLeft=3}},
  // ---- Xeno migration (v1400) ----
  // Four to six drifters (huge, slow, harmless) cross the route ahead from one side, with a
  // few hornets in escort that hold their fire. Keeping within 45 of a drifter for two and a
  // half seconds scans it; three scans and Helix pays for the data. A shot at a drifter
  // costs Helix standing at once and turns the escort hostile; the stage then lasts until
  // the escort is down or the herd has gone.
  beginMigration(stage,def){
    const mesh=globalThis.AgentXSpaceBugs?.meshes?.drifter;if(!mesh)return this.beginMinefield(stage,this.KINDS.minefield);
    const dir=Math.random()<.5?-1:1,n=4+Math.floor(Math.random()*3),esc=3+Math.floor(Math.random()*2);
    this.herd=[];this.scanned=0;this.firedOnHerd=false;
    for(let i=0;i<n;i++){
      const w=cameraPointToWorld([dir*(-70-i*26)+(Math.random()-.5)*12,(Math.random()-.5)*26,150+i*34+Math.random()*20]);
      this.herd.push({x:w[0],y:w[1],z:w[2],s:6+Math.random()*2.5,rot:[0,dir>0?-.9:.9,0],vx:dir*(9+Math.random()*3),mesh,bugKind:'drifter',bugAnimPhase:Math.random()*6,
        hp:6,hitT:0,dead:false,scanT:0,scanned:false})
    }
    stage.spaceCombat=true;
    scenarioFlow.startFighterStage({...stage,target:esc,fighterHp:12,profile:'xeno',navMessage:null,silentStart:true},'xeno',{preservePhase:true});
    scenarioFlow.encounterHudTag=def.hud;
    fighters.forEach((f,i)=>{const d=this.herd[i%n];f.x=d.x+(Math.random()-.5)*20;f.y=d.y+6+Math.random()*6;f.z=d.z+(Math.random()-.5)*20});
    if(campaign.state&&campaign.statsLive?.())(campaign.state.mailFlags||(campaign.state.mailFlags={})).metMigration=true;   // opens the Codex entry
    this.state='migration';callout(def.nav,2.8);return true
  },
  updateMigration(dt){
    this.t+=dt;const def=this.KINDS.migration,k=OPEN_SPACE_CRUISE*dt;let inView=0;
    for(const d of this.herd){
      if(d.dead)continue;
      d.x-=spaceMoveX*k;d.y-=spaceMoveY*k;d.z-=spaceMoveZ*k;
      d.z+=34*dt;d.x+=d.vx*dt;d.y+=Math.sin(this.t*.5+d.bugAnimPhase)*.8*dt;d.hitT=Math.max(0,d.hitT-dt);
      const q=camPoint([d.x,d.y,d.z]);if(q[2]>-20&&Math.abs(q[0])<q[2]*3+60)inView++;
      if(!d.scanned&&!this.firedOnHerd){
        if(Math.hypot(d.x-shipX,d.y-shipY,d.z)<45+d.s*2){d.scanT+=dt;if(d.scanT>=2.5){d.scanned=true;this.scanned++;callout(`DRIFTER SCANNED · ${Math.min(this.scanned,def.need)} OF ${def.need}`,1.4)}}
        else d.scanT=Math.max(0,d.scanT-dt*.5)
      }
    }
    // The escort keeps station over the herd until provoked.
    const live=fighters.filter(f=>!f.dead&&!f.dying);
    if(!this.firedOnHerd)for(const f of live){if(f.provoked){this.provokeEscort();break}f.shotsLeft=0;const d=this.herd[f.id%this.herd.length];if(!d||d.dead)continue;const g=Math.min(1,dt*.5);
      f.x+=(d.x+Math.sin(this.t+f.id)*14-f.x)*g;f.y+=(d.y+8-f.y)*g;f.z+=(d.z+Math.cos(this.t*.8+f.id)*12-f.z)*g}
    if(this.firedOnHerd){if(!live.length||this.t>=this.window+20)this.finishMigration();return}
    if(!inView&&this.t>6||this.t>=this.window)this.finishMigration()
  },
  provokeEscort(){
    if(this.firedOnHerd)return;this.firedOnHerd=true;
    for(const f of fighters)if(!f.dead){f.provoked=true;f.shotsLeft=3}
    callout('YOU FIRED ON THE MIGRANTS · ESCORT ATTACKING',2);
    if(audio?.music?.setMode)audio.music.setMode('violent');
    this.record({id:'fired',...this.KINDS.migration.fired,repFaction:'helix'});
    // v1460: Helix hears of it at once, so the standing drops now, even if the job later
    // fails or is abandoned. The debrief still lists it but does not apply it twice.
    const m=campaign.currentMission,d=m?.diversions?.[m.diversions.length-1];
    if(d&&d.outcome==='fired'&&campaign.statsLive?.()&&campaign.factions?.helix){campaign.applyRep('helix',d.rep);d.repApplied=true}
  },
  drifterShotCandidate(aim,bestDistance=1e9){
    if(!this.active||this.state!=='migration'||phase!=='space')return null;let best=null,bd=bestDistance,bp=null;
    for(const d of this.herd){if(d.dead)continue;const p=proj([d.x,d.y,d.z]);if(!p)continue;const r=clamp(d.s*p.k*1.6,16,160),dd=Math.hypot(aim.x-p.x,aim.y-p.y);if(dd<r&&dd<bd){best=d;bd=dd;bp=p}}
    return best?{target:best,distance:bd,point:bp}:null
  },
  hitDrifter(d,p){
    if(!d||d.dead)return;d.hp--;d.hitT=.15;if(p)spark(p.x,p.y,C.c,8);
    this.provokeEscort();
    if(d.hp<=0){d.dead=true;if(p&&typeof explodeMesh==='function')explodeMesh(d,d.mesh,p,C.c)}
  },
  // The herd has gone (or the escort is down): pay for the survey unless X fired on them.
  onMigrationEscortCleared(){if(this.state==='migration'&&this.firedOnHerd)this.finishMigration()},
  finishMigration(){
    const def=this.KINDS.migration;
    if(!this.firedOnHerd&&this.scanned>=def.need){callout(def.surveyed.say,2);SoundFX.objectiveComplete?.();this.record({id:'surveyed',...def.surveyed})}
    else if(!this.firedOnHerd){callout(this.scanned?`MIGRATION PASSED · ${this.scanned} SCANNED`:'MIGRATION PASSED',1.8);this.recordIgnored()}
    else callout('ESCORT GONE · ROUTE CONTINUES',1.6);
    fighters.length=0;bolts.length=0;this.herd=[];this.end()
  },
  // ---- Dormant lattice (v1530) ----
  // Four to six sleeping ghost constructs scattered across the route ahead (ghosts.js, held
  // dormant). Passing within 22 of a core, or firing while one is within 150, wakes the
  // whole lattice. Otherwise it drifts past and the route continues.
  beginLattice(stage,def){
    if(!globalThis.AgentXGhosts)return this.beginMinefield(stage,this.KINDS.minefield);
    const n=4+Math.floor(Math.random()*3),k=campaign.contractToughnessScale(campaign.currentMission?.risk||1);
    stage.spaceCombat=true;
    scenarioFlow.startFighterStage({...stage,target:n,fighterHp:Math.round(12*k),profile:'ghost',navMessage:null,silentStart:true},'ghost',{preservePhase:true});
    scenarioFlow.encounterHudTag=def.hud;
    // The whole lattice is placed now: no reserves arriving later, awake, mid-field.
    interceptorGoal=fighterGroupTotal=fighterGroupSpawned=fighters.length;
    this.anchors=[];this.surveyJob=this.kind==='latticeSurvey';this.scanned=0;this.pass=0;this.passScanned=0;this.surveyDone=false;
    const layout=this.surveyJob?this.latticeLayout(fighters.length,0):null;
    fighters.forEach((f,i)=>{
      const w=layout?layout[i]:this.latticePlace(i);
      f.x=w[0];f.y=w[1];f.z=w[2];f.t=Math.max(0,f.t);if(f.g){f.g.dormant=true;f.g.px=f.x;f.g.py=f.y;f.g.pz=f.z}
      this.anchors.push({f,x:w[0],y:w[1],z:w[2],scanT:0,scanned:false})
    });
    AgentXGhosts.pending=[];
    this.woken=false;this.state='lattice';callout(def.nav,this.surveyJob?3.2:2.6);return true
  },
  // v1820: where a survey's cores go for each shell, ahead of the drone (camera space).
  // Shell 0 strings them out wide on alternate sides, so each can be skirted in turn.
  // Shell 1 is gates: two cores 62 apart with the gap to thread (31 from each in the
  //   middle, so there are 9 units to spare either way before the nearer one wakes).
  // Shell 2 is a slalom: cores 20 to 28 off the line on alternate sides, 105 apart, so a
  //   straight line wakes it and each one needs a small step away.
  latticeLayout(n,pass=0){
    const R=Math.random,pts=[];
    if(pass===1){
      for(let i=0;i<n;i+=2){
        const z=200+(i/2)*150+R()*20,cx=(R()-.5)*30,cy=(R()-.5)*10;
        if(i+1<n)pts.push([cx-31,cy+(R()-.5)*4,z],[cx+31,cy+(R()-.5)*4,z+(R()-.5)*8]);
        else pts.push([(R()<.5?-1:1)*(26+R()*12),cy,z])
      }
    }else if(pass>=2){
      const s=R()<.5?-1:1;for(let i=0;i<n;i++)pts.push([s*(i%2?1:-1)*(20+R()*8),(R()-.5)*10,190+i*105+R()*12])
    }else for(let i=0;i<n;i++)pts.push([(i%2?1:-1)*(10+R()*30),(R()-.5)*14,190+i*95+R()*30]);
    return pts.map(q=>cameraPointToWorld(q))
  },
  // Put the live cores of a survey where the given shell wants them (out of sight: only
  // called when the field is behind or far away).
  latticeArrange(pass,fresh){
    const live=this.anchors.filter(a=>!a.f.dead),pts=this.latticeLayout(live.length,pass);
    live.forEach((a,i)=>{const w=pts[i];a.x=w[0];a.y=w[1];a.z=w[2];a.scanT=0;if(fresh)a.scanned=false;a.f.x=a.x;a.f.y=a.y;a.f.z=a.z;if(a.f.g){a.f.g.px=a.x;a.f.g.py=a.y;a.f.g.pz=a.z}})
  },
  // Where the nth sleeping core of a route diversion goes, ahead of the drone.
  latticePlace(i){
    const onPath=i<2;return cameraPointToWorld([onPath?(Math.random()-.5)*16:(i%2?1:-1)*(18+Math.random()*30),(Math.random()-.5)*(onPath?8:24),170+i*55+Math.random()*30])
  },
  wakeLattice(reason){
    if(this.woken)return;this.woken=true;this.wokenT=this.t;this.state='latticeFight';
    AgentXGhosts.pending=[{text:'THEY ARE ONLY SOLID WHEN FORMED · FIRE THEN',wait:6}];
    for(const f of fighters)if(!f.dead)AgentXGhosts.wake(f);
    audio?.music?.setMode?.('violent');
    callout(reason,2);
  },
  updateLattice(dt){
    this.t+=dt;const k=OPEN_SPACE_CRUISE*dt;
    if(this.state==='lattice'){
      let ahead=0,nearest=1e9;
      for(const a of this.anchors){
        if(a.f.dead)continue;a.x-=spaceMoveX*k;a.y-=spaceMoveY*k;a.z-=spaceMoveZ*k;
        a.f.x=a.x;a.f.y=a.y;a.f.z=a.z;a.f.vx=a.f.vy=a.f.vz=0;a.f.shotsLeft=0;a.f.t=Math.max(0,a.f.t);
        const d=Math.hypot(a.x-shipX,a.y-shipY,a.z);nearest=Math.min(nearest,d);
        // v1820: "still in play" is judged from where the drone is looking, not along the
        // world axis, so a pilot who turns away is brought round as well. A core counts
        // while it is in front (or just behind) and within 700.
        if(d<700&&camPoint([a.x,a.y,a.z])[2]>-20)ahead++
      }
      const fired=typeof shots!=='undefined'&&shots.some(s=>s.age<dt*1.5);
      if(!this.surveyDone){
        if(nearest<22)return this.wakeLattice('TOO CLOSE · THE LATTICE IS WAKING');
        if(fired&&nearest<150)return this.wakeLattice('YOU FIRED · THE LATTICE IS WAKING')
      }
      if(this.surveyJob){
        // Scan a core by holding inside scan range (and outside the 22 that wakes it).
        const def=this.KINDS.latticeSurvey,shells=def.shells;
        if(!this.surveyDone&&this.passScanned<def.need)for(const a of this.anchors){if(a.f.dead||a.scanned)continue;const d=Math.hypot(a.x-shipX,a.y-shipY,a.z);
          if(d<def.scanRange){a.scanT+=dt;if(a.scanT>=def.scanSeconds){a.scanned=true;this.scanned++;this.passScanned++;SoundFX.objectiveComplete?.();
            if(this.passScanned<def.need)callout(`CORE SCANNED · ${this.passScanned} OF ${def.need}`,1.4);
            else if(this.passScanned===def.need){
              // The last shell: the data is safe from here, and the cores still ahead are
              // only scenery (they can no longer be woken). Earlier shells: keep clear of
              // what is left of this one, the next is placed once it is behind.
              if(this.pass>=shells.length-1){this.surveyDone=true;callout(def.surveyed.say,2.2)}
              else callout(`${shells[this.pass]} MAPPED · KEEP CLEAR · ${shells[this.pass+1]} NEXT`,2.2)}}}
          else a.scanT=Math.max(0,a.scanT-dt*.5)}
        if(!ahead){
          if(this.surveyDone){const m=campaign.currentMission;this.record({id:'surveyed',...def.surveyed,rep:2,repFaction:m?.faction||'helix'});fighters.length=0;bolts.length=0;this.anchors=[];this.end();return}
          if(this.passScanned>=def.need){this.pass++;this.passScanned=0;this.latticeArrange(this.pass,true);callout(`${shells[this.pass]} AHEAD`,1.8)}
          // The field has drifted behind with cores still to scan: the same shell comes round.
          else{this.latticeArrange(this.pass,false);callout(`COMING ROUND · ${shells[this.pass]} AHEAD AGAIN`,1.8)}
        }
        return
      }
      if(!ahead||this.t>=this.window){fighters.length=0;bolts.length=0;callout('LATTICE PASSED QUIETLY',1.6);this.recordIgnored();this.end()}
      return
    }
    // Fifty seconds from waking, not from the start. A survey job has no way round: clear it.
    if(!this.surveyJob&&this.t-(this.wokenT||0)>=50)this.finishLattice(false)
  },
  finishLattice(cleared){
    if(this.surveyJob){
      // Woken and destroyed: the job is done, but nobody wanted it this way. Helix minds most.
      const m=campaign.currentMission,helix=m?.faction==='helix';
      callout('LATTICE DESTROYED · NOTHING LEFT TO SURVEY',2);this.record({id:'woken',...this.KINDS.latticeSurvey.woken,...(helix?{rep:-2,repFaction:'helix'}:{})});
      fighters.length=0;bolts.length=0;this.anchors=[];this.end();return
    }
    const def=this.KINDS.lattice;
    if(cleared){callout(def.cleared.say,2);SoundFX.objectiveComplete?.();this.record({id:'cleared',...def.cleared})}
    else{callout('LATTICE BEHIND · ROUTE CONTINUES',1.6);this.record({id:'abandoned',text:'Left a waking lattice behind'})}
    fighters.length=0;bolts.length=0;this.anchors=[];this.end()
  },
  // ---- Convoy escort (v1910) ----
  // Waves: 2 below risk 5, 3 from 5, 4 from 8, each of 3 + risk x .35 raiders (at most 7).
  // Half hunt X, half go for the freighter (.0055 hull a second each while unprovoked).
  beginEscort(stage,def){
    const risk=Math.max(1,Number(campaign.currentMission?.risk)||1);
    // Off to one side and turned a little, so its length and cargo pods read rather than
    // just the engine block from dead astern.
    const side=Math.random()<.5?-1:1,w=cameraPointToWorld([side*26,5,88]);
    this.convoy={x:w[0],y:w[1],z:w[2],s:5.2,rot:[-.05,side*.18,0],hp:1,hitT:0,dead:false};
    this.wave=0;this.waves=risk>=8?4:(risk>=5?3:2);this.waveGap=2.2;this.escortRisk=risk;this.escortDone=false;this.lastEscortHp=null;
    this.state='escort';stage.spaceCombat=false;
    audio.music.setMode('calm');callout(def.nav,2.8);return true
  },
  startEscortWave(){
    const stage=this.stage,risk=this.escortRisk,k=campaign.contractToughnessScale(risk);
    const n=Math.max(3,Math.min(7,3+Math.round(risk*.35)));
    const lvl=campaign.levelForXP?.()||1,profile=(lvl>=4&&this.wave>=1&&Math.random()<.35)?'hostile':'pirate';
    this.wave++;stage.spaceCombat=true;
    scenarioFlow.startFighterStage({...stage,target:n,fighterHp:Math.round(12*k),profile,navMessage:null,silentStart:true},profile,{preservePhase:true});
    scenarioFlow.encounterHudTag=this.KINDS.escort.hud;
    audio.music.setMode('violent');
    callout(this.wave<this.waves?`RAIDERS INBOUND · WAVE ${this.wave} OF ${this.waves}`:`LAST WAVE · ${n} RAIDERS`,2)
  },
  onEscortWaveCleared(){
    // Reset the kill goal too, or the game keeps reporting the same wave as cleared every frame.
    fighters.length=0;bolts.length=0;this.stage.spaceCombat=false;scenarioFlow.encounterProfile='standard';resetSpaceDogfightDirector();
    interceptorGoal=9999;interceptorsDestroyed=0;interceptorClearDelay=0;
    audio.music.setMode('calm');
    if(this.wave>=this.waves){this.finishEscort(true);return}
    // The crew patches what it can between waves.
    const c=this.convoy;if(c)c.hp=Math.min(1,c.hp+.1);
    this.waveGap=7;callout(`WAVE CLEARED · FREIGHTER ${Math.ceil((c?.hp||0)*100)}% · MORE COMING`,2)
  },
  updateEscort(dt){
    this.t+=dt;const c=this.convoy;if(!c)return;
    // Same open-space shift as every other free object, plus its own course: straight on
    // at a little under cruise speed, so a drone that keeps station slowly overtakes it.
    const k=OPEN_SPACE_CRUISE*dt;c.x-=spaceMoveX*k;c.y-=spaceMoveY*k;c.z-=spaceMoveZ*k;c.z+=OPEN_SPACE_CRUISE*.9*dt;c.hitT=Math.max(0,c.hitT-dt);
    if(this.waveGap>0){this.waveGap-=dt;if(this.waveGap<=0&&!fighters.some(f=>!f.dead&&!f.dying))this.startEscortWave();return}
    // v1910 tuning: every other raider is an escort-hunter that comes for X from the
    // start. The rest go for the freighter and hold fire on X until one of them is shot.
    let onIt=0;
    for(const f of fighters){if(f.dead||f.dying||f.t<0)continue;
      if(f.escortRole===undefined){f.escortRole=((this.escortSeen=(this.escortSeen||0)+1)%2)?'raider':'hunter';if(f.escortRole==='hunter')f.provoked=true}
      if(f.provoked)continue;f.shotsLeft=0;onIt++;
      const g=Math.min(1,dt*.7);f.x+=(c.x-12+Math.random()*24-f.x)*g;f.y+=(c.y-6+Math.random()*12-f.y)*g;f.z+=(c.z-20-f.z)*g}
    if(onIt){c.hp-=dt*.0055*onIt;if(Math.random()<dt*onIt*1.2){c.hitT=.12;const p=proj([c.x,c.y,c.z]);if(p)spark(p.x,p.y,C.y,5)}}
    if(c.hp<=0){c.dead=true;const p=proj([c.x,c.y,c.z]);if(p&&typeof explodeMesh==='function')explodeMesh(c,this.FREIGHTER_MESH,p,C.y);this.finishEscort(false)}
  },
  finishEscort(safe){
    if(this.escortDone)return;this.escortDone=true;this.lastEscortHp=this.convoy?Math.max(0,this.convoy.hp):0;
    const def=this.KINDS.escort,o=safe?def.safe:def.lost,m=campaign.currentMission;
    callout(o.say,2.4);if(safe)SoundFX.objectiveComplete?.();
    this.record({id:safe?'escorted':'lost',...o,repFaction:m?.faction||'trade'});
    if(safe){const st=campaign.stats?.();if(st&&!m?.devTemplateTest)st.convoysSafe=(st.convoysSafe||0)+1}
    fighters.length=0;bolts.length=0;this.convoy=null;this.end()
  },
  // A long-haul freighter: spine, six cargo pods, bridge and engine block, all closed
  // boxes so hidden lines drop out. About 1.3 x 1 x 8 units before scaling.
  FREIGHTER_MESH:(()=>{
    const v=[],faces=[];
    const box=(cx,cy,cz,sx,sy,sz)=>{const b=v.length;for(const[x,y,z]of[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]])v.push([cx+x*sx,cy+y*sy,cz+z*sz]);
      for(const f of[[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])faces.push(f.map(i=>b+i))};
    box(0,0,0,.14,.14,3.3);                                    // spine
    for(const z of[-2.1,-.9,.3,1.5])for(const x of[-.4,.4])box(x,0,z,.25,.3,.5);  // cargo pods
    box(0,.42,3.0,.3,.2,.3);box(0,.05,2.95,.2,.18,.55);         // bridge on its neck
    box(0,.62,3.0,.03,.22,.12);                                 // mast
    box(0,0,-3.45,.32,.28,.25);                                 // engine block
    for(const x of[-.18,.18])box(x,0,-3.85,.09,.09,.15);        // nozzles
    box(0,.34,-3.35,.03,.3,.28);                                // tail fin
    const seen=new Set(),e=[];for(const f of faces)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],key=a<b?a+':'+b:b+':'+a;if(!seen.has(key)){seen.add(key);e.push([a,b])}}
    return{v,faces,e}
  })(),
  // ---- Old minefield (v1370) ----
  // A slab of old contact mines ahead, drifting and tumbling, with a few right across the
  // flight path. A mine within 12 arms (blinking white) and blows 0.45 s later; inside 10 the
  // blast costs a shield. Shot mines detonate where they are and set off any neighbour
  // within 14 a moment later, so a well-placed shot can clear a cluster.
  beginMinefield(stage,def){
    const n=24+Math.floor(Math.random()*7);this.mines=[];this.minesShot=0;this.minesTotal=n;
    if(campaign.state&&campaign.statsLive?.())(campaign.state.mailFlags||(campaign.state.mailFlags={})).metMinefield=true;   // opens the Codex entry
    for(let i=0;i<n;i++){
      const onPath=i<9,x=onPath?(Math.random()-.5)*14:(Math.random()-.5)*90,y=onPath?(Math.random()-.5)*10:(Math.random()-.5)*38,z=110+(onPath?i/9:Math.random())*560;
      const w=cameraPointToWorld([x,y,z]);
      this.mines.push({x:w[0],y:w[1],z:w[2],s:1.25+Math.random()*.5,rot:[Math.random()*6,Math.random()*6,0],spin:[(Math.random()-.5)*1.2,(Math.random()-.5)*1.4,0],
        drift:[(Math.random()-.5)*2,(Math.random()-.5)*1.2,0],armT:0,armed:false,dead:false,passed:false})
    }
    this.state='minefield';callout(def.nav,2.6);return true
  },
  updateMinefield(dt){
    this.t+=dt;const k=OPEN_SPACE_CRUISE*dt;
    for(const m of this.mines){
      if(m.dead||m.passed)continue;
      m.x-=spaceMoveX*k;m.y-=spaceMoveY*k;m.z-=spaceMoveZ*k;
      m.x+=m.drift[0]*dt;m.y+=m.drift[1]*dt;m.rot[0]+=m.spin[0]*dt;m.rot[1]+=m.spin[1]*dt;
      if(m.z<-12){m.passed=true;continue}
      const d=Math.hypot(m.x-shipX,m.y-shipY,m.z);
      if(!m.armed&&d<12){m.armed=true;m.armT=.45}
      if(m.armed){m.armT-=dt;if(m.armT<=0)this.detonateMine(m,false)}
    }
    if(!this.mines.some(m=>!m.dead&&!m.passed)||this.t>=this.window)this.finishMinefield()
  },
  detonateMine(m,byShot){
    if(m.dead)return;m.dead=true;
    // v1460: a mine X shot, or one set off by a chain X started, counts as cleared once.
    const mine=byShot||m.chained;if(mine)m.cleared=true;
    const p=proj([m.x,m.y,m.z]);if(p){if(typeof explodeMesh==='function')explodeMesh(m,stationProximityMineMesh,p,C.r);spark(p.x,p.y,C.y,10)}
    SoundFX.explosion?.();
    if(Math.hypot(m.x-shipX,m.y-shipY,m.z)<10)damage('MINE BLAST');
    // Neighbours catch the blast a moment later.
    for(const o of this.mines)if(!o.dead&&!o.passed&&o!==m&&Math.hypot(o.x-m.x,o.y-m.y,o.z-m.z)<14&&!(o.armed&&o.armT<.25)){o.armed=true;o.armT=.25;o.chained=mine||o.chained}
  },
  mineShotCandidate(aim,bestDistance=1e9){
    if(!this.active||this.state!=='minefield'||phase!=='space')return null;let best=null,bd=bestDistance,bp=null;
    for(const m of this.mines){if(m.dead||m.passed)continue;const p=proj([m.x,m.y,m.z]);if(!p)continue;
      const d=Math.hypot(aim.x-p.x,aim.y-p.y),r=clamp(m.s*p.k*2.2,14,72);if(d<r&&d<bd){best=m;bd=d;bp=p}}
    return best?{mine:best,distance:bd,point:bp}:null
  },
  hitMine(m){if(!m||m.dead)return;this.minesShot++;this.detonateMine(m,true)},   // minesShot is kept for the record only
  finishMinefield(){
    // Mines X shot, plus those they set off, count as cleared; ones X blundered into don't.
    const def=this.KINDS.minefield,gone=this.mines.filter(m=>m.dead&&m.cleared).length;this.mines=[];
    if(gone>=Math.ceil(this.minesTotal*.4)){callout(def.cleared.say,2);SoundFX.objectiveComplete?.();this.record({id:'cleared',...def.cleared})}
    else{callout('MINEFIELD BEHIND · ROUTE CONTINUES',1.8);this.recordIgnored()}
    this.end()
  },
  // ---- Fight in progress (v1360) ----
  // Three friendly craft are already exchanging fire with four or five raiders ahead and off
  // to one side. The raiders are busy with them and hold fire on X unless X joins in. The
  // friendlies shoot back (tracers that can kill a raider) but are outgunned and lose a craft
  // every so often. Clearing the raiders while any friendly survives earns standing with
  // their network; the friendlies' own kills count towards clearing them, but pay X nothing.
  beginSkirmish(stage,def){
    const side=this.pick(def.defenders),n=4+Math.floor(Math.random()*2),k=campaign.contractToughnessScale(campaign.currentMission?.risk||1);
    stage.spaceCombat=true;this.side=side;this.joined=false;this.tracers=[];
    scenarioFlow.startFighterStage({...stage,target:n,fighterHp:Math.round(12*k),profile:'pirate',navMessage:null},'pirate',{preservePhase:true});
    scenarioFlow.encounterHudTag=def.hud;
    const dir=Math.random()<.5?-1:1,c=cameraPointToWorld([dir*34,5+Math.random()*6,175]);
    const drones=globalThis.AgentXPlanetaryDrones?.list||[];
    this.allies=[0,1,2].map(i=>({x:c[0]+(i-1)*18,y:c[1]+(i%2?7:-4),z:c[2]+i*9,s:side.drone?2.3:4,rot:[0,Math.PI+dir*.3,0],hp:1,hitT:0,dead:false,
      fireT:.3+Math.random()*.6,weave:Math.random()*6,mesh:side.drone&&drones.length?drones[i%drones.length]:this.CIV_MESH}));
    // The raiders start on the friendlies, not on X.
    fighters.forEach((f,i)=>{const a=this.allies[i%3];f.x=a.x+(Math.random()-.5)*24;f.y=a.y+(Math.random()-.5)*12;f.z=a.z-14-Math.random()*12});
    this.state='skirmish';callout(`${def.nav} · ${side.name} UNDER ATTACK · ASSIST OR CONTINUE`,2.6);return true
  },
  updateSkirmish(dt){
    this.t+=dt;const k=OPEN_SPACE_CRUISE*dt,live=fighters.filter(f=>!f.dead&&!f.dying),allies=this.allies.filter(a=>!a.dead);
    for(const f of live)if(!f.provoked)f.shotsLeft=0;
    for(const a of allies){
      a.x-=spaceMoveX*k;a.y-=spaceMoveY*k;a.z-=spaceMoveZ*k;
      a.z+=38*dt;a.x+=Math.sin(this.t*.9+a.weave)*3*dt;a.y+=Math.cos(this.t*1.1+a.weave)*1.6*dt;a.hitT=Math.max(0,a.hitT-dt);
      // Return fire: a tracer at the nearest raider, which sometimes tells.
      a.fireT-=dt;
      if(a.fireT<=0&&live.length){
        a.fireT=.55+Math.random()*.5;
        let best=null,bd=1e9;for(const f of live){const d=Math.hypot(f.x-a.x,f.y-a.y,f.z-a.z);if(d<bd){bd=d;best=f}}
        if(best&&bd<120){this.tracers.push({a:[a.x,a.y,a.z],b:[best.x,best.y,best.z],t:.12,col:this.side.col});
          if(Math.random()<.5){best.hp-=1.6;best.hitFx=.12;if(best.hp<=0)this.allyKill(best)}}
      }
    }
    // Unprovoked raiders close on the friendlies and wear them down.
    for(const f of live){if(f.provoked||!allies.length)continue;const a=allies[f.id%allies.length],g=Math.min(1,dt*.65);
      f.x+=(a.x-12+Math.random()*24-f.x)*g;f.y+=(a.y-6+Math.random()*12-f.y)*g;f.z+=(a.z-16-f.z)*g}
    const attackers=live.filter(f=>!f.provoked).length;
    for(const a of allies){
      if(!attackers)break;
      a.hp-=dt*.022*attackers/Math.max(1,allies.length);
      if(Math.random()<dt*attackers*.9){a.hitT=.12;const p=proj([a.x,a.y,a.z]);if(p)spark(p.x,p.y,C.y,4)}
      if(a.hp<=0){a.dead=true;const p=proj([a.x,a.y,a.z]);if(p&&typeof explodeMesh==='function')explodeMesh(a,a.mesh,p,this.side.col);callout(`${this.side.short} CRAFT LOST`,1.2)}
    }
    for(const tr of this.tracers){tr.t-=dt;for(const q of[tr.a,tr.b]){q[0]-=spaceMoveX*k;q[1]-=spaceMoveY*k;q[2]-=spaceMoveZ*k}}
    this.tracers=this.tracers.filter(tr=>tr.t>0);
    if(!this.allies.some(a=>!a.dead))return this.finishSkirmish(false,`${this.side.name} LOST`);
    if(this.t>=this.window)return this.finishSkirmish(false,'FIGHT LEFT BEHIND')
  },
  // A raider downed by the friendlies: counts towards clearing the fight, but pays X nothing.
  allyKill(f){
    if(f.dead||f.dying)return;f.dead=true;f.hp=0;const p=proj([f.x,f.y,f.z]);if(p&&typeof explodeMesh==='function')explodeMesh(f,f.mesh,p,f.col);
    interceptorsDestroyed++;if(interceptorsDestroyed>=interceptorGoal)interceptorClearDelay=.72
  },
  finishSkirmish(cleared,message=null){
    const side=this.side,saved=this.allies.filter(a=>!a.dead).length;
    fighters.length=0;bolts.length=0;this.allies=[];this.tracers=[];
    if(cleared&&saved&&this.joined){
      callout(message||`${side.name} SAVED · ${saved} OF 3`,2);SoundFX.objectiveComplete?.();
      this.record({id:'assisted',pay:.08+.02*saved,rep:2+saved,repFaction:side.faction,text:`${side.label} saved (${saved} of 3)`})
    }else{callout(message||(cleared?'RAIDERS CLEARED':'FIGHT LEFT BEHIND'),1.8);this.recordIgnored()}
    this.end()
  },
  // v600: speaks a requested line (voice-requests.js) only once its recording exists.
  speak(key){if(key&&audio.hasVoice?.(key))audio.playVoice(key,{once:false,priority:false})},
  pick(list){
    const lvl=campaign.levelForXP?.()||1;list=list.filter(o=>!(o.minLevel>lvl));   // v1470: some outcomes wait for experience
    const total=list.reduce((n,o)=>n+o.weight,0);let r=Math.random()*total;for(const o of list){r-=o.weight;if(r<=0)return o}return list[0]},
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
    if(this.state==='skirmish'){this.finishSkirmish(true);return}
    if(this.state==='migration'){this.onMigrationEscortCleared();return}
    if(this.state==='latticeFight'){this.finishLattice(true);return}
    if(this.state==='escort'){this.onEscortWaveCleared();return}
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
    (m.diversions||(m.diversions=[])).push({kind:this.kind,outcome:o.id,text:o.text,pay,xp,rep:o.rep||0,repFaction,...(this.stage?.main?{main:true}:{})});   // v1820: main = the job itself (Lattice Survey), not a side trip
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
    if(this.active&&this.state==='escort'&&this.convoy&&!this.convoy.dead){const c=this.convoy,q=camPoint([c.x,c.y,c.z]);
      if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(c,this.FREIGHTER_MESH,c.hitT>0?C.w:(c.hp<.3?C.r:C.y),.95)});return}
    if(this.active&&this.state==='migration'){for(const d of this.herd){if(d.dead)continue;const q=camPoint([d.x,d.y,d.z]);
      if(q[2]>.18)scene.push({z:q[2],draw:()=>{const mesh=agentXAnimatedBugMesh(d)||d.mesh;drawMesh(d,mesh,d.hitT>0?C.w:C.c)}})}return}
    if(this.active&&this.state==='minefield'){for(const m of this.mines){if(m.dead||m.passed)continue;const q=camPoint([m.x,m.y,m.z]);
      if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(m,stationProximityMineMesh,m.armed&&Math.sin(m.armT*60)>0?C.w:C.r)})}return}
    if(this.active&&this.state==='skirmish'){for(const a of this.allies){if(a.dead)continue;const q=camPoint([a.x,a.y,a.z]);if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(a,a.mesh,a.hitT>0?C.w:(a.hp<.3?C.r:this.side.col))})}return}
    const c=this.civ;if(!this.active||this.state!=='pursuit'||!c||c.dead)return;
    const q=camPoint([c.x,c.y,c.z]);if(q[2]>.18)scene.push({z:q[2],draw:()=>drawMesh(c,this.CIV_MESH,c.hitT>0?C.w:(c.hp<.3?C.r:C.c))})
  },
  drawMarker(){
    if(this.active&&this.state==='escort'&&this.convoy&&!this.convoy.dead){
      // Always findable: a label when it is on screen, an edge arrow when it is not.
      const c=this.convoy,q=camPoint([c.x,c.y,c.z]),p=q[2]>.2?projectCam(q):null,col=c.hp<.3?C.r:C.y;
      const on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH),pct=Math.max(0,Math.ceil(c.hp*100)),d=Math.round(Math.hypot(c.x-shipX,c.y-shipY,c.z));
      ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=col;
      if(on)ctx.strokeText(`FREIGHTER ${pct}% · ${d}`,p.x,p.y-Math.max(18,c.s*p.k*.7));
      else{const e=hudEdgeCue(q,0),tx=-e.dy,ty=e.dx;line(e.x,e.y,e.x-e.dx*10+tx*7,e.y-e.dy*10+ty*7,col,1.25,.9);line(e.x,e.y,e.x-e.dx*10-tx*7,e.y-e.dy*10-ty*7,col,1.25,.9);ctx.strokeText(`FREIGHTER ${pct}%`,e.x-e.dx*26,e.y-e.dy*26)}
      ctx.restore();return
    }
    if(this.active&&this.state==='lattice'&&this.surveyJob){
      const def=this.KINDS.latticeSurvey;
      ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;
      for(const a of this.anchors){if(a.f.dead||(this.surveyDone&&!a.scanned))continue;const q=camPoint([a.x,a.y,a.z]);if(q[2]<=.18)continue;const p=projectCam(q);if(!p)continue;
        const d=Math.hypot(a.x-shipX,a.y-shipY,a.z),close=d<30&&!a.scanned;
        ctx.strokeStyle=a.scanned?C.g:(close?C.r:(d<def.scanRange?C.y:C.c));
        ctx.strokeText(a.scanned?'SCANNED':(close?'TOO CLOSE':(a.scanT>0?`SCANNING ${Math.min(99,Math.round(a.scanT/def.scanSeconds*100))}%`:`CORE ${Math.round(d)}`)),p.x,p.y-Math.max(16,p.k*2.2))}
      ctx.restore();return
    }
    if(this.active&&this.state==='migration'&&!this.firedOnHerd){
      ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;
      // Labels on the three nearest drifters only, so the herd does not drown in text.
      const near=this.herd.filter(d=>!d.dead).map(d=>({d,q:camPoint([d.x,d.y,d.z])})).filter(o=>o.q[2]>.18).sort((a,b)=>a.q[2]-b.q[2]).slice(0,3);
      for(const{d,q}of near){const p=projectCam(q);if(!p)continue;
        ctx.strokeStyle=d.scanned?C.g:C.c;ctx.strokeText(d.scanned?'SCANNED':(d.scanT>0?`SCANNING ${Math.round(d.scanT/2.5*100)}%`:'DRIFTER'),p.x,p.y-Math.max(18,d.s*p.k*.9))}
      ctx.restore();return
    }
    if(this.active&&this.state==='skirmish'){
      for(const tr of this.tracers){const a=proj(tr.a),b=proj(tr.b);if(a&&b)line(a.x,a.y,b.x,b.y,tr.col,1.2,Math.min(1,tr.t*8))}
      ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;
      for(const a of this.allies){if(a.dead)continue;const q=camPoint([a.x,a.y,a.z]);if(q[2]<=.18)continue;const p=projectCam(q);if(!p)continue;
        ctx.strokeStyle=a.hp<.3?C.r:this.side.col;ctx.strokeText(`${this.side.short} ${Math.max(0,Math.ceil(a.hp*100))}%`,p.x,p.y-Math.max(16,3.4*p.k*.6))}
      ctx.restore();return
    }
    const c=this.civ;if(!this.active||this.state!=='pursuit'||!c||c.dead)return;
    const q=camPoint([c.x,c.y,c.z]);if(q[2]<=.18)return;const p=projectCam(q);if(!p)return;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='400 10px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;
    ctx.strokeStyle=c.hp<.3?C.r:C.c;ctx.strokeText(`CIVILIAN ${Math.max(0,Math.ceil(c.hp*100))}%`,p.x,p.y-Math.max(16,3.4*p.k*.6));ctx.restore()
  },
  reset(){
    this.civ=null;this.convoy=null;this.allies=[];this.tracers=[];this.side=null;this.mines=[];this.herd=[];this.anchors=[];
    // Abandon/fail mid-diversion: release the marker this diversion borrowed.
    if(this.active&&salvageRecovery.stage?.type==='embedded_recovery')salvageRecovery.reset();
    this.active=false;this.state='idle';this.stage=null;this.t=0
  }
};
globalThis.routeDiversion=routeDiversion;
