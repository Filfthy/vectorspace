'use strict';

// ROUTE ENCOUNTERS (v410) — POSSIBLE GAME DIRECTION.txt
//
//   CONTRACT = why Agent X is there.   ENCOUNTER = what happens while Agent X is there.
//
// A simple weighted table, as the direction notes ask. Board contracts may pick up one
// hidden encounter on the route: in orbit before a descent, on arrival at a station or
// asteroid site, or on departure. Most runs stay quiet. Encounters reuse the existing
// fight module, announce themselves with one short nav message, vary their size, and
// avoid repeating the previous one. Quiet runs can instead carry a harmless ambient
// nav message so the world feels busy without every event being a battle.
//
// Encounter fights are paid through bounties for each kill (v480; payBonus is no longer
// used). Story and faction-agent missions are authored and never receive route encounters.
(function(){
  // Where an encounter can be placed, by the module it precedes (or follows).
  const ARRIVAL_STATION=new Set(['station_pad_approach','station_approach','taco_beacon_pickup','free_traders_depot_terminal','helix_biolab_approach']);
  const ARRIVAL_ASTEROID=new Set(['asteroid_mine_delivery','taco_asteroid_delivery']);
  const DEPARTURE=new Set(['station_pad_departure','planet_launch','station_hack_escape','station_departure']);
  const COMBAT=new Set(['fighters','customs_drones','combat_recovery','station_defence_recovery','carrier_intercept','station_xeno_arrival','dune_assault','xeno_nest','factory_assault']);

  // variants: [label, minTargets, maxTargets, hpMultiplier, extra hazard pay]
  const ENCOUNTERS=[
    {id:'pirate_blockade',ack:'pirate_ambush',profile:'pirate',nav:'PIRATE BLOCKADE DETECTED',voice:'pirateBlockadeAhead',hud:'PIRATE BLOCKADE',places:['station','asteroid'],weight:10,
      factions:{trade:1.4,quickbite:1.3},variants:[['light',3,4,1,0],['standard',5,6,1,0],['heavy',7,8,1.2,.05]]},
    {id:'pirate_ambush',ack:'pirate_ambush',profile:'pirate',nav:'PIRATE AMBUSH',voice:'pirateAmbushDestroyPirates',hud:'PIRATE AMBUSH',places:['orbit'],weight:9,
      factions:{trade:1.3,quickbite:1.2,helix:1.1},variants:[['light',3,4,1,0],['standard',4,6,1,0]]},
    {id:'rogue_drones',ack:'rogue_drones',profile:'rogue',nav:'ROGUE DRONES ACTIVE',hud:'ROGUE DRONES',places:['station','asteroid','orbit'],weight:7,
      factions:{security:1.6,helix:1.2},variants:[['small flight',3,5,1,0],['picket',6,8,1,.05]]},
    {id:'mercenary_interdiction',ack:'pirate_ambush',profile:'hostile',nav:'MERCENARY INTERCEPTORS',voice:'mercenaryInterceptorsInbound',hud:'MERCENARY INTERCEPTORS',places:['station','orbit'],weight:5,minLevel:4,
      factions:{trade:1.2,jackals:1.2,helix:1.2},variants:[['wing',4,5,1.1,.05],['squadron',6,8,1.15,.08]]},
    {id:'xeno_swarm',ack:'xeno_swarm',profile:'xeno',nav:'XENO SWARM DETECTED',hud:'XENO SWARM',unknownFirst:true,places:['station','asteroid'],weight:4,minLevel:3,
      factions:{helix:1.8,quickbite:1.2},variants:[['scattered',4,5,1,0],['swarm',6,8,1,.05]]},
    {id:'bounty_interceptors',ack:'pirate_ambush',profile:'hostile',nav:'BOUNTY INTERCEPTORS',voice:'bountyHuntersOnYourTail',hud:'BOUNTY INTERCEPTORS',places:['departure','orbit'],weight:3,minLevel:6,
      factions:{jackals:1.8,security:.6},variants:[['hunters',3,4,1.25,.08],['hunter pack',5,6,1.25,.1]]},
    // v720: stolen Partition War drones (hijacked-drones.js). Their old loyalty keeps
    // fighting the new orders, so they stall at moments. Unknown on first meeting.
    {id:'hijacked_drones',ack:'pirate_ambush',profile:'hijacked',nav:'HIJACKED MILITARY DRONES',hud:'HIJACKED DRONES',voice:'hijackedDronesDetected',unknownFirst:true,places:['station','asteroid','orbit'],weight:5,minLevel:5,
      factions:{security:1.4,helix:1.3,trade:1.1},variants:[['cell',3,4,1,.05],['flight',5,6,1.05,.08]]},
    {id:'customs_sweep',ack:'customs_intercept',type:'customs_drones',profile:'customs',nav:'CUSTOMS INTERCEPT',hud:'CUSTOMS INTERCEPT',places:['orbit','departure'],weight:6,onlyFactions:['jackals'],
      variants:[['patrol',4,5,1,0],['sweep',6,7,1,.05]]}
  ];
  // Enforcers from a network the player is Hostile with (see apply()).
  const enforcer=(id,profile,nav,hud,voice)=>({id:`enforcers_${id}`,ack:'pirate_ambush',profile,nav,hud,voice,places:['orbit','station','asteroid','departure'],weight:9,
    variants:[['patrol',4,5,1.1,0],['squad',6,7,1.2,0]]});
  const ENFORCERS={
    security:enforcer('security','rogue','OSD INTERDICTION · YOU ARE FLAGGED','OSD INTERDICTION','osdInterdictionYouAreFlagged'),
    trade:enforcer('trade','hostile','FREE TRADER HIRED GUNS','HIRED GUNS','freeTraderHiredGuns'),
    jackals:enforcer('jackals','hostile','RED JACKAL HIT SQUAD','JACKAL HIT SQUAD','redJackalHitSquad'),
    helix:enforcer('helix','rogue','HELIX SECURITY DRONES','HELIX SECURITY','helixSecurityDronesInbound'),
    quickbite:enforcer('quickbite','rogue','QUICKBITE REPO DRONES','REPO DRONES','quickbiteRepoDronesInbound')
  };
  // Harmless nav-computer chatter on quiet runs. One line, no explanation.
  const AMBIENT=[
    {nav:'OSD PATROL IN AREA · NO ACTION',places:['station','orbit','departure']},
    {nav:'CIVILIAN CONVOY PASSING',places:['station','orbit']},
    {nav:'FREIGHTER TRAFFIC HEAVY',places:['station','asteroid']},
    {nav:'NAVIGATION ANOMALY · MINOR',places:['orbit','asteroid','station']},
    {nav:'VOX DRONE ON PARALLEL ROUTE',places:['station','departure']},
    {nav:'DEBRIS FROM EARLIER ENGAGEMENT',places:['asteroid','station','orbit']},
    {nav:'MINING DRONES WORKING · IGNORE',places:['asteroid']},
    {nav:'DISTANT DISTRESS CALL · ANSWERED',places:['orbit','station']},
    {nav:'ROUTE CLEAR',places:['station','asteroid','orbit','departure']}
  ];

  function placements(modules){
    const out=[];
    const descent=modules.findIndex(m=>m.type==='planet_descent');
    if(descent>=0)out.push({place:'orbit',index:descent});
    const station=modules.findIndex(m=>ARRIVAL_STATION.has(m.type));
    if(station>=0)out.push({place:'station',index:station});
    const asteroid=modules.findIndex(m=>ARRIVAL_ASTEROID.has(m.type));
    if(asteroid>=0)out.push({place:'asteroid',index:asteroid});
    const last=modules[modules.length-1];
    if(last&&DEPARTURE.has(last.type))out.push({place:'departure',index:modules.length});
    // v670: never directly after a station stage. The station controller only shuts down
    // when its stage is the last one, so a fight or diversion placed after it was
    // completed by the still-running station on its first frame (no fight, no bounty).
    return out.filter(s=>!String(modules[s.index-1]?.type||'').startsWith('station_'))
  }
  const pick=(list,weightOf)=>{
    const total=list.reduce((n,x)=>n+Math.max(0,weightOf(x)),0);if(total<=0)return null;
    let r=Math.random()*total;for(const x of list){r-=Math.max(0,weightOf(x));if(r<=0)return x}return list[list.length-1]
  };

  // Optional diversions (route-diversion.js): open-space moments only, never stacked.
  const DIVERSIONS=[{id:'beacon',weight:40},{id:'derelict',weight:35},{id:'civilian',weight:25}];
  function maybeDiversion(modules,spots,risk,chance){
    if(Math.random()>=chance||modules.some(m=>m.type==='route_diversion'))return false;
    const s=spots[Math.floor(Math.random()*spots.length)],d=pick(DIVERSIONS,x=>x.weight);
    modules.splice(s.index,0,{type:'route_diversion',label:'Route Diversion',diversion:d.id,difficulty:risk,spaceCombat:false,fighterHp:12});
    return true
  }

  // Mutates `modules` (adds one fight or a nav note) and returns a summary for the contract.
  function apply(campaign,{template,faction,risk,modules}){
    if(!Array.isArray(modules)||!modules.length)return null;
    const spots=placements(modules);if(!spots.length)return null;
    // A job that already contains a fight gets no extra fight, but may still pass an
    // optional diversion that the player can investigate or ignore.
    if(modules.some(m=>COMBAT.has(m.type))){maybeDiversion(modules,spots,risk,.14);return null}
    const level=campaign.levelForXP(),state=campaign.state;
    // v530: a network you are Hostile with (standing below -55) sends enforcers after
    // you on other networks' jobs. Its own jobs never get them: working for it is how
    // the standing is repaired.
    const hostile=Object.values(campaign.factions||{}).filter(f=>f.id!==faction&&(Number(f.rep)||0)<-55&&ENFORCERS[f.id]);
    // Most visits stay quiet. Templates that roll their own orbital encounter get less.
    const chance=Math.min(.6,(template?.encounterTable?.entries?.22:.3)+hostile.length*.12);
    if(Math.random()<chance){
      const options=[];
      for(const f of hostile){const e=ENFORCERS[f.id];for(const s of spots)if(e.places.includes(s.place))options.push({e,s})}
      for(const e of ENCOUNTERS){
        if(e.minLevel&&level<e.minLevel)continue;
        if(e.onlyFactions&&!e.onlyFactions.includes(faction))continue;
        for(const s of spots)if(e.places.includes(s.place))options.push({e,s});
      }
      const last=state.lastRouteEncounter;
      const choice=pick(options,o=>o.e.weight*(o.e.factions?.[faction]||1)*(o.e.id===last?.15:1)*(o.s.place==='departure'&&o.e.id==='bounty_interceptors'?1.25:1));
      if(choice){
        const {e,s}=choice,v=e.variants[Math.floor(Math.random()*e.variants.length)];
        const extra=Math.floor(Math.max(0,level-4)/5);   // level adds bodies, not just health
        const target=v[1]+Math.floor(Math.random()*(v[2]-v[1]+1))+extra;
        const module={type:e.type||'fighters',label:e.hud.replace(/\b\w+/g,w=>w[0]+w.slice(1).toLowerCase()),difficulty:risk,
          target,fighterHp:Math.round(12*v[3]),profile:e.profile,encounterId:e.ack,routeEncounter:e.id,navMessage:e.nav,combatVoice:e.voice||undefined,hudTag:e.hud,unknownFirst:!!e.unknownFirst};
        modules.splice(s.index,0,module);
        state.lastRouteEncounter=e.id;
        return {id:e.id,place:s.place,variant:v[0],payBonus:.15+v[4],nav:e.nav}
      }
    }
    if(maybeDiversion(modules,spots,risk,.18))return null;
    // Quiet run: sometimes the nav computer notes something harmless on arrival.
    if(Math.random()<.35){
      const s=spots[Math.floor(Math.random()*spots.length)],target=modules[Math.min(s.index,modules.length-1)];
      const a=pick(AMBIENT.filter(x=>x.places.includes(s.place)),()=>1);
      if(a&&target&&!target.navMessage){target.navMessage=a.nav;target.navAmbient=true}
    }
    return null
  }

  globalThis.AgentXEncounters={apply,ENCOUNTERS,AMBIENT,ENFORCERS};
})();
