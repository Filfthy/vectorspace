'use strict';

// LATE GAME (v450): level 14+ unlocks and the VOX Black Contracts.
//
// After the factory moon the Partition network is broken, not gone. Black Contracts are
// an open-ended series of remnant clean-up operations jointly funded by VOX and OSD.
// Each one reuses a proven set piece (carrier, hive, dune armour, deep core, bunker,
// mined node). Every completion raises the THREAT level: more and tougher hostiles,
// and better pay. One Black Contract is on offer at a time, arriving in Mail after a
// couple of ordinary jobs. They open at operator level 15 once the VOX story is done.
(function(){
  const descent=(label='Planet Descent')=>({type:'planet_descent',label,difficulty:5});
  const helixLab=(extra={})=>({type:'helix_biolab_approach',label:'Helix Orbital Biolab',navDistance:720,navX:48,navY:-12,labScale:34,planetRadius:290,
    revealRadius:220,hatchCaptureRadius:92,hatchStandOff:15.5,hatchOpenSeconds:.82,deliverySeconds:2.35,hatchCloseSeconds:.74,turnSeconds:1.78,clearDistance:58,
    message:'PROCEED TO HELIX ORBITAL BIOLAB',hud:'HELIX BIOLAB',markerLabel:'HELIX BIOLAB',...extra});

  // n = hostiles for this threat level, hp = remnant hull strength.
  const MISSIONS=[
    {id:'carrier',title:'Remnant Carrier',family:'carrier_intercept',
      description:'A surviving Partition carrier is running a resupply loop. Break its escort, chase it down, open the hatch and pull its navigation core before the scuttle charge.',
      modules:(n,hp)=>[{type:'carrier_intercept',label:'Remnant Carrier',difficulty:5,target:n,fighterHp:hp}],
      stages:['Destroy the Escort','Chase the Carrier','Open the Hatch','Download the Core','Escape']},
    {id:'hive',title:'Hive Purge',family:'xeno_nest',
      description:'The network has seeded another xeno nest to harvest homing tissue. Collect a pheromone mask from Helix, get inside and destroy the regulator.',
      modules:()=>[helixLab({label:'Collect Pheromone Mask',transferMode:'pickup',hatchLabel:'PHEROMONE PICKUP',hatchPrompt:'PROCEED TO PHEROMONE PICKUP',securedMessage:'PHEROMONE MASK SECURED'}),
        {type:'space_transit',label:'Proceed to the Nest',duration:3.3,message:'HEADING TO XENO NEST',hud:'TO XENO NEST',playZoomSound:true},
        {type:'xeno_nest',label:'Destroy the Nest'}],
      stages:['Collect the Pheromone Mask','Proceed to the Nest','Destroy the Nest']},
    {id:'armour',title:'Remnant Armour',family:'dune_assault',planetaryRequirements:{landingBody:'planet',landingColour:'yellow',moonCount:{min:0,max:2}},
      description:'Partition armour has woken up in a dune belt and is moving in four groups. Descend and destroy every unit. Heavy walkers fall at the knees.',
      modules:()=>[descent('Dune World Descent'),{type:'dune_assault',label:'Destroy the Armour',difficulty:5,startMessage:'REMNANT ARMOUR'}],
      stages:['Dune World Descent','Find the Armour Groups','Destroy the Armour']},
    {id:'deepcore',title:'Deep Strike',family:'deep_core',planetaryRequirements:{landingBody:'moon',landingColour:'cyan',moonCount:{min:1,max:2}},
      description:'A remnant power plant is feeding a dormant command node. Break the orbital screen, descend, run the trench and destroy the reactor.',
      modules:(n,hp)=>[{type:'fighters',label:'Orbital Screen',target:n,fighterHp:hp,profile:'rogue',difficulty:5},descent('Moon Descent'),{type:'deep_core_surface',label:'Surface and Reactor Strike',difficulty:5}],
      stages:['Orbital Screen','Moon Descent','Surface Run','Trench','Destroy the Reactor','Escape']},
    {id:'redoubt',title:'Remnant Redoubt',family:'bunker_assault',planetaryRequirements:{landingBody:'planet',landingColour:'green',moonCount:{min:1,max:2}},
      description:'An old-war bunker has started transmitting command traffic again. Clear the screen, breach the bunker, recover the command circuitry and deliver it to the OSD compound.',
      modules:(n,hp)=>[{type:'fighters',label:'Orbital Screen',target:n,fighterHp:hp,profile:'rogue',difficulty:5},descent('Bunker World Descent'),
        {type:'bunker_recovery_osd',label:'Breach the Bunker',difficulty:5,startMessage:'BUNKER ASSAULT',contentId:'kudo_bunker_2'}],
      stages:['Orbital Screen','Bunker World Descent','Breach the Bunker','Recover the Circuitry','Deliver to OSD']},
    {id:'node',title:'Silent Node',family:'crossroads_override',
      description:'A remnant relay node has mined its approach and is guarded by drones. Destroy the guards, thread the mines and wipe the node from its own terminal.',
      modules:(n,hp)=>[{type:'station_minefield_approach',label:'Guards and Minefield',difficulty:5,stationModel:'Crossroads Outpost',routeSeconds:26,mineCount:46,mineTriggerRadius:15.5,mineBlastRadius:22,
          combatBeforeApproach:true,target:n,fighterHp:hp,profile:'rogue',combatMessage:'Destroy the node guards',postCombatMessage:'Guards down. Proceed through the minefield'},
        {type:'station_terminal_hack',label:'Wipe the Node',hackSeconds:5,acquiredMessage:'NODE TERMINAL ACQUIRED',completeMessage:'NODE WIPED',hackHudPrefix:'WIPE',completeHud:'NODE WIPED'},
        {type:'station_hack_escape',label:'Withdraw',escapeDistance:280,escapeMessage:'Withdraw through the minefield'}],
      stages:['Destroy the Guards','Cross the Minefield','Wipe the Node','Withdraw']}
  ];

  function blackContract(threat){
    const t=Math.max(1,Math.round(threat)||1),def=MISSIONS[(t-1)%MISSIONS.length];
    const n=Math.min(18,8+t),hp=Math.min(64,Math.round(42*(1+.06*(t-1))));
    const c={
      id:`black_${t}_${Date.now().toString(36)}`,private:true,voxContract:true,blackContract:true,threat:t,
      clientName:'Vector Operations Exchange',agentName:'Mara Venn',faction:null,
      title:`${def.title} · Threat ${t}`,kind:'black',family:def.family,
      risk:Math.min(12,10+Math.floor((t-1)/2)),minLevel:1,minRep:-100,
      pay:Math.round((70000+20000*(t-1))/50)*50,xp:2600+300*(t-1),difficulty:5,implemented:true,musicMode:'violent',
      description:def.description,modules:def.modules(n,hp),stages:def.stages.slice()
    };
    if(def.planetaryRequirements)c.planetaryRequirements=JSON.parse(JSON.stringify(def.planetaryRequirements));
    return c
  }
  const OPENERS=[
    'The factory is gone. The network it fed is not, quite. Pieces of it are still waking up.',
    'Another remnant has surfaced. OSD and VOX are splitting the bill, which tells you how much they want it gone.',
    'More Partition hardware is moving. It is slower than before and angrier than before.',
    'The remnants are learning from the ones you have already destroyed. Expect more of them this time.'
  ];
  function offerMail(c,first){
    return {id:`black_offer_${c.threat}_${Date.now().toString(36)}`,from:'Mara Venn · Contractor Services, VOX',category:'vox',priority:'high',contract:c,
      subject:first?'Black Contracts':`Black Contract · Threat ${c.threat}`,
      body:[first?'The committee has approved a standing budget for remnant clean-up. Off the books, jointly funded with OSD. I want you on it.':OPENERS[(c.threat-1)%OPENERS.length],
        `${c.title}. ${c.description}`,
        `Black rate: CR ${c.pay.toLocaleString()} and ${c.xp} XP. Each one you finish raises the threat on the next.`,
        'Bring the drone back if you can. If not, bring the data back.'],
      action:{type:'vox',label:'OPEN BLACK CONTRACT'}}
  }
  // One short notice when a level opens something new.
  const LEVEL_UNLOCKS=[
    {level:14,subject:'Operator level 14: Orange grade',body:['Orange grade gear and Orange frames are now available in the market.','Faction Orange frames still need Trusted standing with their network.']},
    {level:15,subject:'Operator level 15: Elite contracts',body:['Elite contracts (risk 10) can now appear on the contract board. They field more hostiles and pay a large risk premium.','Once the factory file is closed, VOX Black Contracts are also open to you.']},
    {level:18,subject:'Operator level 18: Elite risk 11',body:['Elite contracts up to risk 11 can now appear on the board.']},
    {level:20,subject:'Operator level 20: Veteran rank',body:['You are now a Veteran operator. Every level above 20 adds 2% to board contract pay, up to 30%.']},
    {level:21,subject:'Operator level 21: Elite risk 12',body:['Elite contracts up to risk 12, the hardest board work VOX brokers, can now appear.']}
  ];
  globalThis.AgentXEndgame={MISSIONS,blackContract,offerMail,LEVEL_UNLOCKS,BLACK_LEVEL:15};
})();
