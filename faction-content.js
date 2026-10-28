'use strict';

// FACTION AGENT CHAINS — AUTHORED MISSION CONTENT (v400)
//
// Each network's named contact offers X three personal missions, separate from the
// VOX story. Step 1 opens at Favoured standing, step 2 at standing 40, step 3 (the
// capstone) at Trusted; each also needs an operator level so the chains fill the
// mid and late game. The capstone earns that network's unique, unsellable item.
//
// Missions are plain story contracts built from existing mission modules. They are
// registered into AgentXStoryContent so they share its launch, drone bay, retry-mail
// and DEV offer paths. CampaignController owns gating, completion and rewards.
(function(){
  const chains=[];
  const STEP_GATES=[{rep:25,level:6},{rep:40,level:9},{rep:60,level:12}];

  // chain({faction,contact,from,arcName,label,reward,missions:[...3]})
  // mission: {key,title,risk,pay,xp,family,description,modules,stages,musicMode,
  //           planetaryRequirements,offer:[...],complete:[...],failed:{subject,body},abandoned:{subject,body}}
  function chain(def){
    const steps=def.missions.map((m,i)=>{
      const id=`${def.faction}_agent_${i+1}`,flag=`${def.faction}Agent${i+1}`,gate=STEP_GATES[i];
      const contract={
        id:`story_${id}`,storyContractId:id,storyFlag:flag,private:true,factionChain:def.faction,
        clientName:def.clientName,agentName:def.contactName,faction:def.faction,
        title:m.title,kind:'story',family:m.family,risk:m.risk,minLevel:1,minRep:-100,
        pay:m.pay,xp:m.xp,difficulty:m.difficulty||Math.min(5,Math.ceil(m.risk/2)+1),implemented:true,
        musicMode:m.musicMode||'violent',description:m.description,modules:m.modules,stages:m.stages
      };
      if(m.planetaryRequirements)contract.planetaryRequirements=m.planetaryRequirements;
      const story={id:`${def.faction}Agent${i+1}`,campaign:{
        contract,
        offerMail:{id:`${id}_offer`,from:def.from,subject:m.offerSubject,category:'story',priority:'high',body:m.offer,
          action:{type:'story',contractId:id,label:def.label}},
        completionMail:{id:`${id}_done`,from:def.from,subject:m.completeSubject,category:'story',priority:'normal',body:m.complete},
        devMailOption:{contractId:id,label:`${def.short} ${i+1} · ${m.title}`}
      }};
      globalThis.AgentXStoryContent?.register(id,story,{from:def.from,label:def.label,failed:m.failed,abandoned:m.abandoned});
      return {id,flag,rep:gate.rep,level:gate.level,reward:i===2?def.reward:null}
    });
    chains.push({faction:def.faction,arcName:def.arcName,reward:def.reward,steps,from:def.from})
  }

  // ---- chains are authored below ----
  // Shared module recipes. Values copied from proven story/template uses.
  const descent=(label='Planet Descent',d=4)=>({type:'planet_descent',label,difficulty:d});
  const transit=(label,message,hud,extra={})=>({type:'space_transit',label,duration:3.3,message,hud,playZoomSound:true,...extra});
  const helixLab=(extra={})=>({type:'helix_biolab_approach',label:'Helix Orbital Biolab',navDistance:720,navX:48,navY:-12,labScale:34,planetRadius:290,
    revealRadius:220,hatchCaptureRadius:92,hatchStandOff:15.5,hatchOpenSeconds:.82,deliverySeconds:2.35,hatchCloseSeconds:.74,turnSeconds:1.78,clearDistance:58,
    message:'PROCEED TO HELIX ORBITAL BIOLAB',hud:'HELIX BIOLAB',markerLabel:'HELIX BIOLAB',...extra});
  const depot=(extra={})=>({type:'free_traders_depot_terminal',label:'Free Traders Depot',difficulty:1,scale:26,
    spawnDistance:475,spawnX:-36,spawnY:-12,pitch:-.085,yaw:.58,roll:.05,startMessage:'Free Traders freight depot ahead',depotRevealRadius:205,terminalStageDistance:82,terminalCaptureRadius:86,
    terminalStandOff:15.5,transferSeconds:3.1,turnSeconds:1.75,clearDistance:52,...extra});
  const tacoBeacon=(extra={})=>({type:'taco_beacon_pickup',label:'Taco Beacon Pickup',spawnDistance:520,spawnX:-78,spawnY:-14,scale:18,pitch:-.04,yaw:.50,roll:.025,
    revealRadius:220,captureRadius:92,stageDistance:92,standOff:17,transferSeconds:2.5,pickupSeconds:2.15,turnSeconds:1.65,clearDistance:54,
    startMessage:'Proceed to Taco Beacon',hud:'TACO BEACON',markerLabel:'TACO BEACON',...extra});

  // ===== KUDO SHANG / ORBITAL SECURITY DIRECTORATE (hardline) =====
  const KUDO='Kudo Shang · Orbital Security Directorate';
  chain({faction:'security',short:'OSD',contactName:'Kudo Shang',clientName:'Orbital Security Directorate',from:KUDO,
    arcName:'Kudo Shang · OSD agent work',label:'ACCEPT OSD TASKING',reward:'interdictorArray',missions:[
    {title:'Rogue Pickets',risk:4,pay:15000,xp:950,family:'crossroads_override',
      description:'OSD picket drones around Crossroads Outpost are still running a decommissioned blockade order. They have mined the approach and fire on anything that moves. Destroy the pickets, thread the minefield and override the order from the hub terminal.',
      modules:[
        {type:'station_minefield_approach',label:'Picket Line and Minefield',difficulty:4,stationModel:'Crossroads Outpost',routeSeconds:24,mineCount:40,mineTriggerRadius:15.5,mineBlastRadius:22,
          combatBeforeApproach:true,target:8,fighterHp:12,profile:'rogue',combatMessage:'Destroy the OSD pickets',postCombatMessage:'Pickets down. Proceed through the minefield'},
        {type:'station_terminal_hack',label:'Override the Blockade Order',hackSeconds:4.6,acquiredMessage:'HUB TERMINAL ACQUIRED',completeMessage:'BLOCKADE ORDER RESCINDED',hackHudPrefix:'OVERRIDE',completeHud:'ORDER RESCINDED'},
        {type:'station_hack_escape',label:'Minefield Withdrawal',escapeDistance:260,escapeMessage:'Withdraw through the minefield'}
      ],
      stages:['Destroy the Pickets','Cross the Minefield','Override the Order','Withdraw'],
      offerSubject:'Tasking: Crossroads pickets',
      offer:['X. You have done enough honest work for OSD that I can stop pretending you are a stranger.','Eleven of our picket drones at Crossroads Outpost never received the order to stand down. They are still enforcing a blockade we lifted two years ago. They have mined the approach and they shoot at freighters.','This is embarrassing for the Directorate. I want it ended quietly. Destroy the pickets, get through the mines and rescind the order from the hub terminal.','Do not hit the station.'],
      completeSubject:'Crossroads: order rescinded',
      complete:['Order rescinded. Traffic is moving through Crossroads again.','The incident report says a maintenance fault. That is accurate enough.','Good work. I will have more for you.'],
      failed:{subject:'Crossroads: still blockaded',body:['The pickets killed your drone. They are old, not harmless.','The blockade is still active. Go back and end it.']},
      abandoned:{subject:'Crossroads: you withdrew',body:['You withdrew. The pickets did not.','Return when you are ready to finish it.']}},
    {title:'Armour Column',risk:6,pay:26000,xp:1500,family:'dune_assault',
      planetaryRequirements:{landingBody:'planet',landingColour:'yellow',moonCount:{min:0,max:2}},
      description:'A pirate armour column is crossing the dune belt toward an OSD relay. Tanks, light walkers and heavy walkers in four groups. Descend, find each group from the nav points and destroy all of them before they reach the relay.',
      modules:[descent('Dune World Descent',5),{type:'dune_assault',label:'Destroy the Armour Column',difficulty:5,startMessage:'ARMOUR COLUMN'}],
      stages:['Dune World Descent','Find the Armour Groups','Destroy the Column'],
      offerSubject:'Tasking: armour column',
      offer:['X. Pirates have put ground armour on a dune world. Four groups, moving toward one of our relays.','Orbital strike is not available. The relay is too close and the Directorate does not like explaining craters.','You will go down and destroy every group. Hit the walkers at the knees. The heavy ones will not fall any other way.','This is the kind of work that gets noticed. Do it properly.'],
      completeSubject:'Armour column destroyed',
      complete:['Telemetry confirms all four groups destroyed. The relay is intact.','The column was too well equipped for a pirate crew. Someone supplied them.','I know where it came from. Stand by.'],
      failed:{subject:'Armour column: still moving',body:['Your drone was destroyed. The column is still moving.','The relay has hours, not days. Go back down.']},
      abandoned:{subject:'Armour column: incomplete',body:['You left the surface with armour still moving. That is not acceptable.','Return and finish the column.']}},
    {title:'Redoubt',risk:7,pay:42000,xp:2200,family:'bunker_assault',
      planetaryRequirements:{landingBody:'planet',landingColour:'green',moonCount:{min:1,max:2}},
      description:'The armour came from a pirate redoubt built inside an old Partition War bunker. Break the orbital screen, descend, breach the bunker, recover its command core and deliver it to the OSD compound.',
      modules:[
        {type:'fighters',label:'Orbital Screen',target:10,fighterHp:12,profile:'pirate',difficulty:5},
        descent('Redoubt Descent',5),
        {type:'bunker_recovery_osd',label:'Breach the Redoubt',difficulty:5,startMessage:'BUNKER ASSAULT',contentId:'kudo_bunker_2'}
      ],
      stages:['Break the Orbital Screen','Redoubt Descent','Breach the Bunker','Recover the Command Core','Deliver to OSD Compound'],
      offerSubject:'Strike order: the redoubt',
      offer:['X. The column was supplied from a redoubt dug into an old Partition War bunker. Pirates have been living in it for a year. We let them, because we did not know.','We know now. They have a fighter screen in orbit and defences on the ground.','Break the screen, breach the bunker and bring me its command core. Deliver it to the OSD compound, not to me.','When this is done the Directorate will register an Interdictor Array to your account. We do not give those to contractors. You will be the exception.'],
      completeSubject:'Redoubt: core received',
      complete:['The command core is in our hands. So are the names of everyone who bought from that redoubt.','As promised, an Interdictor Array is registered to you. Fit it. When you shoot down an incoming round, the fighter that fired it will hesitate.','You have the Directorate\'s trust, X. Do not spend it carelessly.'],
      failed:{subject:'Redoubt: failed assault',body:['The redoubt killed your drone. I expected resistance.','I did not expect you to stop. Go back in.']},
      abandoned:{subject:'Redoubt: you broke off',body:['You broke off the assault. The pirates will move the core if we give them time.','Do not give them time.']}}
  ]});

  // ===== CORVELLA PALLIS / FREE TRADERS COMPACT (flirty, unprofessional) =====
  const CORVELLA='Corvella Pallis · Free Traders Compact';
  chain({faction:'trade',short:'FTC',contactName:'Corvella Pallis',clientName:'Free Traders Compact',from:CORVELLA,
    arcName:'Corvella Pallis · Free Traders agent work',label:'OPEN FREE TRADERS CONTRACT',reward:'nomadPod',missions:[
    {title:'Black Box',risk:4,pay:15000,xp:950,family:'wreckage_recovery',musicMode:'calm',
      planetaryRequirements:{landingBody:'planet',landingColour:'green',moonCount:{min:0,max:2}},
      description:'A Compact freighter came down in a forest three days ago. Descend, follow the forest corridor to the wreck and download its flight recorder before somebody less charming does.',
      modules:[
        descent('Planet Descent',3),
        {type:'surface_destination_approach',label:'Forest Approach',difficulty:3,terrain:'plains',destination:'forest',routeLength:360,treeClumps:7,entryRadius:24},
        {type:'forest_corridor',label:'Wreckage Glade',difficulty:3,length:650,terminalDestination:'wreckage_recovery',entryFrom:'surface_destination'}
      ],
      stages:['Planet Descent','Forest Approach','Forest Corridor','Download the Flight Recorder'],
      offerSubject:'Just for you, babe',
      offer:['Babe. I have been saving this one for you, because the board jobs are beneath that gorgeous drone of yours.','One of our freighters went down in a forest three days ago. The crew got out. The recorder did not.','Fly down, find the wreck and pull the recorder for me. I need to know whether it was an accident. I have a nasty feeling it was not.','Come back in one piece. I have plans for you.'],
      completeSubject:'Mmm, that recorder',
      complete:['Sweetie, you came through for me again. I have the recorder data and I have been reading it with a glass of something expensive.','The engines were fine. Somebody spoofed its nav beacon and walked it into the trees.','Somebody is messing with my freighters, babe. I do not like that. Stay close.'],
      failed:{subject:'Ow. My drone.',body:['You got your lovely drone smashed up in those trees, sweetie. That hurts me too.','The wreck is still there. Go back and get my recorder.']},
      abandoned:{subject:'You turned around?',body:['You flew all the way down there and turned around, babe? I am a little bit hurt.','The recorder is still sitting in that wreck. Go and get it for me.']}},
    {title:'Blockade',risk:6,pay:26000,xp:1500,family:'blockade_break',
      description:'Pirates using spoofed nav beacons have blockaded a Compact freight depot. Break the blockade, then upload Corvella\'s clean beacon codes at the depot terminal so traffic can find its way in again.',
      modules:[
        {type:'fighters',label:'Break the Blockade',target:12,fighterHp:12,profile:'pirate',difficulty:5,startMessage:'PIRATE BLOCKADE'},
        transit('Depot Transit','HEADING TO FREIGHT DEPOT','TO FREIGHT DEPOT'),
        depot({label:'Upload Beacon Codes',startMessage:'Upload the clean beacon codes'})
      ],
      stages:['Break the Blockade','Head to the Depot','Upload Beacon Codes'],
      offerSubject:'They are squeezing my depot',
      offer:['Sweetie, the people who spoofed my freighter have got greedy. They are sitting outside one of our depots with fake beacons and picking off anything that docks.','I need a big strong drone to go and make them leave. Then upload my clean beacon codes at the depot terminal so my haulers can find their way home.','Do this for me and I will owe you. I always pay my debts, babe.'],
      completeSubject:'My hero',
      complete:['Babe. The depot is open and the haulers are docking again. I could kiss your hull.','The beacon spoofer is still out there somewhere. One of the pirates was running it from a freighter they took off us last month.','I know where it is going. And I want it back.'],
      failed:{subject:'Not like this, sweetie',body:['They got you, sweetie. I hate watching the telemetry go flat.','The blockade is still up. Go back and break it for me.']},
      abandoned:{subject:'Rude, babe',body:['You left my depot surrounded by pirates. Rude, babe.','Go back. I know you can do it.']}},
    {title:'Runaway',risk:7,pay:42000,xp:2200,family:'asteroid_wreck_recovery',
      description:'The hijacked freighter tried to hide in an asteroid field and tore itself open. Cross the field, fight off its pirate crew, get inside and pull the beacon spoofer\'s source data from the recorder, then deliver it to the Compact depot.',
      modules:[
        {type:'asteroid_wreck_recovery',label:'Runaway Freighter',difficulty:5,target:9,fighterHp:12,profile:'pirate',
          combatVoice:'pirateAmbushDestroyPirates',ambushMessage:'Pirate crew! Destroy them.',
          route:{navDistance:560,navX:-14,navY:6,ambushDelay:3.6,navCaptureRadius:68,startMessage:'Track the runaway freighter',resumeMessage:'Freighter located. Continue through the field',thinMessage:'Freighter ahead. Continue through the belt'},
          wreck:{asset:'leviathanTrueSeparation04',scale:22,spawnDistance:1050,spawnX:-6,spawnY:2,rot:[-.06,-.22,.09],revealDistance:700,
            gapLocal:[0,-.12,2.75],gapCaptureRadius:20,entryLocal:[0,-.15,-.18],entryAutopilotSpeed:16.5,entryAutopilotStop:1.55,
            blackBoxLocal:[0,-.13,-2.64],recorderStopLocal:[0,-.15,-2.10],recorderStopRadius:.65,transferSeconds:3.0,turnSeconds:1.75,interiorAutopilotSpeed:12.5,
            exitLocal:[0,-.15,.92],exitRevealRadius:54,exitCaptureRadius:3.5},
          returnTransit:{duration:3.15,message:'RETURNING TO FREE TRADERS FREIGHT DEPOT',hud:'TO FREIGHT DEPOT'}},
        depot({label:'Deliver Spoofer Data',startMessage:'Deliver the spoofer data'})
      ],
      stages:['Cross the Asteroid Field','Destroy the Pirate Crew','Reach the Freighter','Enter the Freighter','Download Spoofer Data','Exit the Freighter','Return to the Depot','Deliver the Data'],
      offerSubject:'I want my ship back',
      offer:['Babe, I found my stolen freighter. The idiots tried to hide it in an asteroid field and ripped it open on a rock.','Their crew is still out there guarding it. The beacon spoofer they have been using on us is wired into its recorder.','Get inside and get me that data. Then I can make sure nobody fronks with Compact beacons ever again.','And sweetie, there is a present in it for you. A Nomad Pod. I had it built for my favourite drone.'],
      completeSubject:'For you, sweetie',
      complete:['You did it. The spoofer data is ours and every pirate who bought a copy is about to find out what a Compact lawyer looks like.','The Nomad Pod is registered to you, babe. It gives any frame an extra consumable slot. Think of me when you fit it.','You are my favourite, X. Do not tell the others.'],
      failed:{subject:'Not my favourite drone',body:['They got you inside that field, sweetie. I nearly dropped my drink.','The freighter is still there. Go back for me.']},
      abandoned:{subject:'So close, babe',body:['You were right there, babe, and you turned around.','The data is still sitting in that wreck. Go and get it.']}}
  ]});

  // ===== CASSIAN ERIVAN-SNADE / RED JACKAL COMBINE (indirect) =====
  const CASSIAN='Cassian Erivan-Snade · Red Jackal Combine';
  chain({faction:'jackals',short:'RJC',contactName:'Cassian Erivan-Snade',clientName:'Red Jackal Combine',from:CASSIAN,
    arcName:'Cassian Erivan-Snade · Red Jackals agent work',label:'ACCEPT RED JACKAL FAVOUR',reward:'ripper',missions:[
    {title:'Quiet Override',risk:4,pay:15000,xp:950,family:'swamp_relay_console',musicMode:'calm',
      planetaryRequirements:{landingBody:'planet',landingColour:'cyan',moonCount:{min:0,max:2}},
      description:'Slip past a Customs patrol, descend to a swamp world and recalibrate a relay console so one particular route goes dark for an hour. Nobody needs to know it was ever touched.',
      modules:[
        {type:'customs_drones',label:'Customs Patrol',difficulty:4,target:6,fighterHp:12},
        descent('Swamp World Descent',3),
        {type:'surface_destination_approach',environment:'swamp_approach',label:'Swamp Approach',difficulty:3},
        {type:'forest_corridor',environment:'alien_swamp',label:'Swamp Relay',difficulty:3,length:620,terminalDestination:'swamp_relay_console',entryFrom:'surface_destination'}
      ],
      stages:['Customs Patrol','Swamp World Descent','Swamp Approach','Recalibrate the Relay Console'],
      offerSubject:'A matter of timing',
      offer:['X. Your recent conduct has been noticed by people who prefer not to be noticed themselves. That is a compliment.','A relay on a swamp world watches a route that certain associates would like to use without an audience. For one hour.','Recalibrate its console. Customs patrols the region, so do be discreet with them.','Payment is generous. Discretion is assumed.'],
      completeSubject:'An uneventful hour',
      complete:['The route was dark for exactly one hour. Nothing happened during it, and I would be grateful if you remembered it that way.','You may find more of my correspondence arriving. I am told that is what friendship looks like.'],
      failed:{subject:'An unfortunate hour',body:['The relay remains stubbornly attentive. Your drone, I gather, does not.','The hour can be rescheduled. Please try again.']},
      abandoned:{subject:'Cold feet',body:['You withdrew. The relay continues to watch.','I am patient. The route is not.']}},
    {title:'Hot Merchandise',risk:6,pay:26000,xp:1500,family:'urban_collection',musicMode:'calm',
      description:'Collect a crate from a ground-level room in Aurelia City, fly it out and launch. Customs has heard rumours and will be waiting in orbit. Make sure they are not waiting for long.',
      modules:[
        descent('Planet Descent',4),
        {type:'surface_destination_approach',label:'City Approach',difficulty:4,terrain:'plains',destination:'city',routeLength:390,treeClumps:7},
        {type:'urban_ground_pickup',label:'Groundside Collection',difficulty:4,cityLength:540,pickupWorldZ:365,pickupSide:1},
        {type:'urban_exit',label:'City Exit',difficulty:4},
        {type:'planet_launch',label:'Planet Launch',difficulty:4},
        {type:'customs_drones',label:'Customs Reception',difficulty:5,target:10,fighterHp:12}
      ],
      stages:['Planet Descent','City Approach','Groundside Collection','City Exit','Planet Launch','Customs Reception'],
      offerSubject:'Something warm from Aurelia',
      offer:['X. A crate is waiting in a ground-level room in Aurelia City. It is warm in every sense that matters.','Collect it, leave the city and launch. Customs has heard a rumour, which is regrettable, and will be waiting in orbit.','I would prefer the crate and the Customs Authority not to be introduced.'],
      completeSubject:'Safely in hand',
      complete:['The crate is with its new owners and the Customs Authority has filed a report describing a malfunction.','You are becoming very good at this. I find myself wondering what you would do with proper equipment.','I may be able to help with that. Allow me to make some arrangements.'],
      failed:{subject:'Merchandise lost',body:['The crate and the drone did not survive the experience. Only one of those was insured.','A second crate exists. Do try again.']},
      abandoned:{subject:'Left on the shelf',body:['You left the crate behind. It is still warm. It will not be forever.','The room is still waiting.']}},
    {title:'Test Range',risk:7,pay:42000,xp:2200,family:'deep_core',
      planetaryRequirements:{landingBody:'moon',landingColour:'cyan',moonCount:{min:1,max:2}},
      description:'Helix is testing a hand-built cannon on a moon range. Break its orbital defenders, descend, run the surface and trench to the range reactor and destroy it. In the confusion the Ripper finds its way to a new owner.',
      modules:[
        {type:'fighters',label:'Range Defenders',target:11,fighterHp:12,profile:'hostile',difficulty:5},
        descent('Moon Descent',5),
        {type:'deep_core_surface',label:'Surface and Reactor Strike',difficulty:5}
      ],
      stages:['Range Defenders','Moon Descent','Surface Run','Trench','Destroy the Range Reactor','Escape'],
      offerSubject:'An instrument worthy of you',
      offer:['X. Helix Industrial has built something lovely on a moon test range. A cannon. Hand made, very loud and quite unique.','I would like it. You, I suspect, would like it more.','Break the range defenders, go down, and destroy the reactor that powers the range. While Helix is busy putting out fires, my people will collect the cannon.','It will be registered to you. Call it a gift between friends. Navira will be furious, which is a gift to me.'],
      completeSubject:'The Ripper',
      complete:['The range is dark, Helix is furious and the Ripper is in your stores.','It fires three heavy rounds per burst and it does not care how armoured the target is. Do try not to point it at me.','A pleasure, X. Truly.'],
      failed:{subject:'A noisy failure',body:['The range defenders were more conscientious than expected. Your drone was not spared.','The cannon is still on the range. Do go back.']},
      abandoned:{subject:'Unfinished business',body:['You left the range intact. Helix will move the cannon if they become nervous.','I would rather they did not become nervous.']}}
  ]});

  // ===== NAVIRA DERRIS / HELIX INDUSTRIAL GROUP (curious) =====
  const NAVIRA='Navira Derris · Helix Industrial Group';
  chain({faction:'helix',short:'HIG',contactName:'Navira Derris',clientName:'Helix Industrial Group',from:NAVIRA,
    arcName:'Navira Derris · Helix agent work',label:'ACCEPT HELIX TASK',reward:'fieldLattice',missions:[
    {title:'Live Specimens',risk:4,pay:15000,xp:950,family:'xeno_bio_recovery',
      description:'A drifting xeno swarm has been sighted in open space, far from any nest. Destroy it, recover fresh biological material and deliver it to the Helix orbital biolab.',
      modules:[
        {type:'combat_recovery',label:'Xeno Swarm and Sample',difficulty:4,target:8,fighterHp:12,profile:'xeno',biologicalRecovery:true,
          recoveryLabel:'xeno material',markerLabel:'XENO SAMPLE',recoveryHudPrefix:'XENO SAMPLE',captureRadius:21,markerGrowRange:105,tractorSeconds:2.2,recoveredMessage:'XENO MATERIAL SECURED'},
        transit('Return to Helix','HEADING TO HELIX LAB','TO HELIX LAB'),
        helixLab({label:'Deliver the Sample'})
      ],
      stages:['Destroy the Swarm','Recover Xeno Material','Return to Helix','Deliver the Sample'],
      offerSubject:'A swarm with no nest',
      offer:['X. I have a puzzle and I would like you to fetch part of it for me.','A xeno swarm has been sighted drifting in open space, a long way from any nest we know of. Swarms do not wander. Something is making this one wander.','Destroy it and bring me fresh material. I will be at the orbital biolab, probably talking to myself.'],
      completeSubject:'Oh, this is interesting',
      complete:['The tissue is extraordinary. The swarm was following a chemical trail, and the trail leads somewhere we have never mapped.','There is a second nest, X. A young one. I would very much like to see it.'],
      failed:{subject:'Telemetry received',body:['Your drone was lost. The telemetry up to that point is genuinely useful. Thank you.','The swarm is still drifting. I still need the sample.']},
      abandoned:{subject:'Sample still required',body:['You withdrew before the recovery. The swarm has not dispersed.','I would like the sample intact, when you are ready.']}},
    {title:'Second Nest',risk:6,pay:26000,xp:1500,family:'xeno_nest',
      description:'Navira has prepared a fresh pheromone mask. Collect it from the biolab, follow the chemical trail to the young nest, penetrate it and destroy its regulator.',
      modules:[
        helixLab({label:'Collect Pheromone Mask',transferMode:'pickup',hatchLabel:'PHEROMONE PICKUP',hatchPrompt:'PROCEED TO PHEROMONE PICKUP',securedMessage:'PHEROMONE MASK SECURED'}),
        transit('Follow the Trail','HEADING TO SECOND NEST','TO XENO NEST'),
        {type:'xeno_nest',label:'Destroy the Second Nest'}
      ],
      stages:['Collect the Pheromone Mask','Follow the Trail','Destroy the Second Nest'],
      offerSubject:'A young nest',
      offer:['X. I found it. A second nest, young and growing quickly, at the end of the trail.','I have prepared a fresh pheromone mask. Collect it from the biolab, go inside and destroy the regulator.','I know. I would rather study it. But a young nest that close to shipping lanes will not stay young, and I would like everyone involved to stay alive.'],
      completeSubject:'The nest is gone',
      complete:['The nest is gone. I watched the readings fall to nothing. It was sad and fascinating in roughly equal measure.','Now I have to tell you something worrying. Our deep-core field lab stopped reporting six hours ago. It was studying the same chemistry.'],
      failed:{subject:'The nest responded',body:['The nest recognised you and responded decisively. That is fascinating, and inconvenient for your drone.','The mask is still viable. Please try again.']},
      abandoned:{subject:'Not concluded',body:['You pulled out. The nest remains, and so does my curiosity.','The mask is ready whenever you are.']}},
    {title:'Deep Lab',risk:7,pay:42000,xp:2200,family:'lab_recovery',
      description:'Helix\'s field lab has been overrun by rogue drones. Clear them, dock at the lab hatch and recover Navira\'s research, then fight off the drones that come for it.',
      modules:[
        {type:'fighters',label:'Clear the Lab',target:10,fighterHp:12,profile:'rogue',difficulty:5},
        helixLab({label:'Recover the Research',transferMode:'pickup',hatchLabel:'RESEARCH CORE',hatchPrompt:'PROCEED TO THE RESEARCH CORE',securedMessage:'RESEARCH CORE SECURED',message:'PROCEED TO HELIX FIELD LAB',hud:'HELIX FIELD LAB',markerLabel:'FIELD LAB'}),
        {type:'fighters',label:'Pursuit',target:8,fighterHp:12,profile:'rogue',difficulty:5}
      ],
      stages:['Clear the Lab','Recover the Research','Fight Off the Pursuit'],
      offerSubject:'The lab has gone quiet',
      offer:['X, I need you. The field lab is not answering, and the last thing it transmitted was a drone signature I recognise from your work for Mara.','Rogue drones. At my lab. Interested in my research, which I find very flattering and extremely frightening.','Clear them out and recover the research core. If you bring it home I will give you something I have been building. It is called a Field Lattice, and I think you will like it.'],
      completeSubject:'You brought it home',
      complete:['You brought it home. The research is intact and I may have cried a little. Do not tell anyone at Helix.','The Field Lattice is registered to you. Every fighter you destroy will feed a little energy back into your shields. It is the most beautiful thing I have ever made.','Thank you, X. Really.'],
      failed:{subject:'Lab still lost',body:['Your drone went down near the lab. The drones are still there, and so is my research.','Please go back. I cannot do this without you.']},
      abandoned:{subject:'Please go back',body:['You withdrew. I understand. I would also prefer not to fight rogue drones.','But the research is still out there. Please go back.']}}
  ]});

  // ===== NYXO MALLOC / QUICKBITE ORBITAL (slacker) =====
  const NYXO='Nyxo Malloc · Dispatch, QuickBite Orbital';
  chain({faction:'quickbite',short:'QB',contactName:'Nyxo Malloc',clientName:'QuickBite Orbital',from:NYXO,
    arcName:'Nyxo Malloc · QuickBite agent work',label:'CONTACT QUICKBITE',reward:'hotBox',missions:[
    {title:'Dispatch Fault II',risk:4,pay:15000,xp:950,family:'combat_recovery',
      description:'QuickBite delivery drones have stopped listening to Dispatch again and are shooting the replacements. Destroy them and recover the override chip that one of them is carrying.',
      modules:[
        {type:'combat_recovery',label:'Rogue Delivery Drones',difficulty:4,target:10,fighterHp:12,profile:'rogue',recoveryLabel:'override chip',markerLabel:'OVERRIDE CHIP',recoveryHudPrefix:'OVERRIDE CHIP',markerGrowRange:105,captureRadius:18,tractorSeconds:2.15,recoveredMessage:'OVERRIDE CHIP RECOVERED'}
      ],
      stages:['Destroy the Rogue Drones','Recover the Override Chip'],
      offerSubject:'Dude. Again.',
      offer:['Dude. Remember the delivery drones that went rogue? They did it again. More of them this time.','Somebody plugged an override chip into one of them and now the whole flock thinks Dispatch is the enemy. Which, honestly, fair.','Blow them up and grab the chip so Support can figure out who did it. Way more money than a board job, I promise.'],
      completeSubject:'Chip acquired, dude',
      complete:['Support has the chip. They made a face. Apparently it is military grade, which is not a thing you put in a taco drone.','Anyway you are officially our favourite contractor. That is not a real title but I am saying it.'],
      failed:{subject:'Oof',body:['The drones got you, dude. Our own drones. That is so embarrassing for everyone.','They are still out there. Go again?']},
      abandoned:{subject:'You bailed, dude',body:['You bailed. The drones are still shooting the replacements and Support keeps calling me.','Please go back.']}},
    {title:'Lunch Rush',risk:6,pay:26000,xp:1500,family:'pad_delivery',musicMode:'calm',
      description:'Pick up the biggest order of the shift from the Taco Beacon and drop it on Relay Truck Stop pad 03. The truck stop has a bug problem and lunch waits for nobody.',
      modules:[
        tacoBeacon(),
        transit('Truck Stop Transit','HEADING TO RELAY TRUCK STOP','TO TRUCK STOP',{playZoomSound:false}),
        {type:'station_xeno_arrival',label:'Truck Stop Arrival',difficulty:5,stationModel:'Relay Truck Stop',approachDistance:460,pad:'03',encounterChance:1,target:9},
        {type:'station_pad_approach',label:'Pad 03 Approach',difficulty:5,stationModel:'Relay Truck Stop',approachDistance:460,pad:'03'},
        {type:'station_pad_delivery',label:'Pad 03 Delivery',difficulty:5,pad:'03'},
        {type:'station_pad_departure',label:'Station Departure',difficulty:5,pad:'03'}
      ],
      stages:['Taco Beacon Pickup','Truck Stop Transit','Clear the Bugs','Pad 03 Approach','Deliver Lunch','Depart'],
      offerSubject:'Biggest order of the shift',
      offer:['Dude, Relay Truck Stop just ordered lunch for the entire station. Like, all of it.','Problem is they have bugs again. The big space kind, not the kitchen kind.','Grab the order from the Taco Beacon, clear the bugs and drop it on pad 03. They knew the risks when they built a truck stop next to a xeno zone.'],
      completeSubject:'Lunch delivered',
      complete:['Lunch delivered, bugs deleted, and the truck stop left the biggest tip in QuickBite history.','I am taking the afternoon off to celebrate. Not really. Maybe a little.','Oh, heads up. Somebody big wants a catering run to a mining moon. Like, really big. I will send details.'],
      failed:{subject:'Lunch is cold now',body:['The bugs got you and lunch went everywhere. The truck stop is not happy.','They ordered again. Go again?']},
      abandoned:{subject:'Uh, the lunch?',body:['You turned around with an entire station\'s lunch on board, dude.','It is still hot. Go!']}},
    {title:'The Big Order',risk:7,pay:42000,xp:2200,family:'food_delivery',musicMode:'calm',
      description:'The biggest catering order QuickBite has ever taken, for a mining base that happens to be in the middle of a pirate raid. Collect from the Taco Beacon, fight through the raiders on the route and deliver.',
      modules:[
        tacoBeacon(),
        {type:'fighters',label:'Raiders on the Route',target:10,fighterHp:12,profile:'pirate',difficulty:5},
        transit('Asteroid Base Transit','HEADING TO ASTEROID MINE','TO ASTEROID BASE',{voice:'headingToAsteroidMine',waitForVoice:true}),
        {type:'taco_asteroid_delivery',label:'Asteroid Base Delivery',routeSeconds:24,cargoStyle:'food',target:8,fighterHp:12,difficulty:5,profile:'pirate',
          combatVoice:'destroyThePirates',ambushMessage:'Destroy the pirates.',startMessage:'Destroy the pirates.',hud:'ASTEROID DELIVERY'}
      ],
      stages:['Taco Beacon Pickup','Raiders on the Route','Asteroid Base Transit','Fight Through and Deliver'],
      offerSubject:'THE big order',
      offer:['Dude. Dude. A mining consortium ordered catering for six hundred people. Six hundred.','Small detail, their base is kind of being raided by pirates right now. They still want lunch. Respect.','Get the order from the Taco Beacon, fight through and deliver. If you pull this off, I will get you a Hot Box. It is the thing our best couriers use. It keeps your stores topped up between stops.','They knew the risks. Mostly.'],
      completeSubject:'Legend',
      complete:['Six hundred meals delivered in the middle of a pirate raid. You are a legend. There is a song about you in the break room now. It is bad.','Your Hot Box is registered. Every new stage of a job, it tops up each fitted consumable by one charge. Do not ask how. I do not know how.','Thanks, dude. For real.'],
      failed:{subject:'Six hundred hungry people',body:['The raiders got you and six hundred people are now very hungry and very angry.','The kitchen is making the order again. Go again?']},
      abandoned:{subject:'Dude, the order',body:['You bailed on the biggest order in QuickBite history, dude.','It is still on the counter. Go!']}}
  ]});

  // ===== v940 EPILOGUES: one closing mission per contact =====
  // After the capstone, at Trusted 80 and level 16, each contact sends one last personal
  // mission that pays off their letters (faction-lore.js). It grants a title shown on the
  // Operator card. Built from the same proven module recipes as the chains.
  const epilogues=[];
  function epilogue(def){
    const id=`${def.faction}_agent_4`,flag=`${def.faction}Agent4`;
    const contract={
      id:`story_${id}`,storyContractId:id,storyFlag:flag,private:true,factionEpilogue:def.faction,
      clientName:def.clientName,agentName:def.contactName,faction:def.faction,
      title:def.title,kind:'story',family:def.family,risk:def.risk,minLevel:1,minRep:-100,
      pay:def.pay,xp:def.xp,difficulty:Math.min(5,Math.ceil(def.risk/2)+1),implemented:true,
      musicMode:def.musicMode||'violent',description:def.description,modules:def.modules,stages:def.stages
    };
    if(def.planetaryRequirements)contract.planetaryRequirements=def.planetaryRequirements;
    const story={id:flag,campaign:{
      contract,
      offerMail:{id:`${id}_offer`,from:def.from,subject:def.offerSubject,category:'story',priority:'high',body:def.offer,action:{type:'story',contractId:id,label:def.label}},
      completionMail:{id:`${id}_done`,from:def.from,subject:def.completeSubject,category:'story',priority:'normal',body:def.complete},
      devMailOption:{contractId:id,label:`${def.short} 4 · ${def.title}`}
    }};
    globalThis.AgentXStoryContent?.register(id,story,{from:def.from,label:def.label,failed:def.failed,abandoned:def.abandoned});
    epilogues.push({faction:def.faction,id,flag,titleReward:def.titleReward,rep:80,level:16})
  }
  const wreckRun=(label)=>({type:'asteroid_wreck_recovery',label,difficulty:5,target:9,fighterHp:12,profile:'pirate',
    combatVoice:'pirateAmbushDestroyPirates',ambushMessage:'Pirate salvagers! Destroy them.',
    route:{navDistance:560,navX:-14,navY:6,ambushDelay:3.6,navCaptureRadius:68,startMessage:'Proceed to the records ship',resumeMessage:'Records ship located. Continue through the field',thinMessage:'Records ship ahead. Continue through the belt'},
    wreck:{asset:'leviathanTrueSeparation04',scale:22,spawnDistance:1050,spawnX:-6,spawnY:2,rot:[-.06,-.22,.09],revealDistance:700,
      gapLocal:[0,-.12,2.75],gapCaptureRadius:20,entryLocal:[0,-.15,-.18],entryAutopilotSpeed:16.5,entryAutopilotStop:1.55,
      blackBoxLocal:[0,-.13,-2.64],recorderStopLocal:[0,-.15,-2.10],recorderStopRadius:.65,transferSeconds:3.0,turnSeconds:1.75,interiorAutopilotSpeed:12.5,
      exitLocal:[0,-.15,.92],exitRevealRadius:54,exitCaptureRadius:3.5},
    returnTransit:{duration:3.15,message:'RETURNING TO FREE TRADERS FREIGHT DEPOT',hud:'TO FREIGHT DEPOT'}});

  epilogue({faction:'security',short:'OSD',contactName:'Kudo Shang',clientName:'Orbital Security Directorate',from:KUDO,label:'ACCEPT OSD TASKING',
    title:'The Original Order',family:'bunker_recovery_osd',risk:8,pay:52000,xp:2600,titleReward:'Directorate Operator',
    planetaryRequirements:{landingBody:'planet',landingColour:'orange',moonCount:{min:0,max:2}},
    description:'The command bunker that issued the Crossroads blockade order was never decommissioned and is still issuing it. Breach the bunker, pull its order archive and deliver it to the OSD compound.',
    modules:[descent('Command Bunker Descent',5),{type:'bunker_recovery_osd',label:'Breach the Command Bunker',difficulty:5,startMessage:'BUNKER ASSAULT',contentId:'kudo_bunker_2'}],
    stages:['Descend','Cross the Defences','Breach the Command Bunker','Recover the Order Archive','Deliver to the OSD Compound'],
    offerSubject:'An order, not a letter',
    offer:['X. I said I would not write like that again. This is not that. It is an order.','The Crossroads pickets took their blockade order from a command bunker that was never decommissioned. It is still issuing that order. To nothing, now, but it is still issuing it.','Breach it, pull the order archive and deliver it to the OSD compound. I wrote that order. I will be the one who closes it.'],
    completeSubject:'Order closed',
    complete:['The archive is on my desk. The order is closed.','The Directorate roster now lists you as a Directorate Operator. It means I would send you first. It always did.'],
    failed:{subject:'The order still stands',body:['The bunker held and your drone did not. The order is still being issued.','Go back. Finish it.']},
    abandoned:{subject:'You left it open',body:['You withdrew with the order still standing. I do not leave orders open.','Neither will you.']}});

  epilogue({faction:'trade',short:'Compact',contactName:'Corvella Pallis',clientName:'Free Traders Compact',from:CORVELLA,label:'OPEN FREE TRADERS CONTRACT',
    title:'Nobody Owns Me',family:'asteroid_wreck_recovery',risk:7,pay:48000,xp:2400,titleReward:"Corvella's Favourite",musicMode:'calm',
    description:'The company that built Corvella kept its records on a ship that was never scrapped. It is drifting in an asteroid field with her original ownership file aboard. Pull the recorder and deliver it to the Compact depot.',
    modules:[wreckRun('The Records Ship'),depot({label:'Deliver the Ownership File',startMessage:'Deliver the ownership file'})],
    stages:['Cross the Field','Destroy the Salvagers','Reach the Records Ship','Enter the Ship','Pull the Ownership File','Exit the Ship','Return to the Depot','Deliver the File'],
    offerSubject:'The really personal one',
    offer:['Sweetie, this is the personal one. The really personal one.','The company that built me kept every record on a ship that was supposed to be scrapped. It was not. It is drifting in a rock field, and my original ownership file is on board.','I want that file, babe. Pull the recorder and bring it to the depot, and then nobody can ever say they own me again.'],
    completeSubject:'Nobody owns me',
    complete:['I have it. I read it once, then I deleted it, then I had a very large drink.',"Sweetie, it is official. I had it written on your Compact file: Corvella's Favourite. Wear it with pride. I certainly would."],
    failed:{subject:'Sweetie, the file',body:['The file is still out there in those rocks, babe, and so is a lot of your drone.','Please go back for me. It matters.']},
    abandoned:{subject:'Babe, not this one',body:['You walked away from this one? Babe. This one, of all of them.','It is still out there. So am I.']}});

  epilogue({faction:'jackals',short:'Red Jackal',contactName:'Cassian Erivan-Snade',clientName:'Red Jackal Combine',from:CASSIAN,label:'ACCEPT RED JACKAL FAVOUR',
    title:'A Family Matter',family:'groundside_pickup',risk:7,pay:50000,xp:2500,titleReward:'Friend of the Combine',musicMode:'calm',
    planetaryRequirements:{landingBody:'planet',landingColour:'green',moonCount:{min:0,max:2}},
    description:'The Snade side of Cassian\'s family has found an Erivan ledger and means to read it in public. Collect it from a ground-floor strongroom in the city, leave quietly, and deliver it to the Compact depot where a friend will hold it.',
    modules:[descent('City Descent',5),
      {type:'surface_destination_approach',label:'City Approach',difficulty:5,terrain:'plains',destination:'city',routeLength:390,treeClumps:7},
      {type:'urban_ground_pickup',label:'The Strongroom',difficulty:5,cityLength:540,pickupWorldZ:365,pickupSide:-1},
      {type:'urban_exit',label:'City Exit',difficulty:5},
      {type:'planet_launch',label:'Planet Launch',difficulty:5},
      transit('Depot Transit','HEADING TO FREIGHT DEPOT','TO FREIGHT DEPOT'),
      depot({label:'Hand Over the Ledger',startMessage:'Hand the ledger over at the depot terminal',transferHud:'CARGO HANDOFF',receivedHud:'CARGO RECEIVED',completeVoice:'deliveryComplete'})],
    stages:['Descend','Reach the City','Collect the Ledger','Leave the City','Launch','Transit to the Depot','Hand Over the Ledger'],
    offerSubject:'A family matter, again',
    offer:['X. A family matter, as I once called it. The Snade side of my inheritance has found a ledger belonging to the Erivan side, and they intend to read it aloud.','It sits in a ground-floor strongroom in the city. Collect it, leave without fuss, and see it to the Compact depot, where a friend will hold it for me.','Discretion is assumed. Speed is appreciated.'],
    completeSubject:'The ledger is home',
    complete:['The ledger is safe and my relatives are furious, which is the ideal outcome.','I have had you entered in the Combine register as a Friend of the Combine. Very few people hold that honour. Fewer still deserve it.'],
    failed:{subject:'The ledger is loose',body:['The ledger did not reach the depot. My relatives will be very pleased, which I find unbearable.','Shall we try again?']},
    abandoned:{subject:'An unfinished errand',body:['You left the ledger in the city. That is precisely where my relatives can find it.','Do reconsider.']}});

  epilogue({faction:'helix',short:'Helix',contactName:'Navira Derris',clientName:'Helix Industrial Group',from:NAVIRA,label:'ACCEPT HELIX TASK',
    title:'Not So Boring',family:'specimen_recovery',risk:7,pay:46000,xp:2300,titleReward:'Helix Fellow',
    description:'Xenos have reached the quiet station where Navira\'s old mentor Teodor retired, far from any known nest. Clear them, recover a sample and deliver it to the Helix orbital biolab.',
    modules:[{type:'station_defence_recovery',label:'Defend Teodor\'s Station',stationModel:'relay',approachDistance:305,
        encounterChance:1,target:10,fighterHp:13,difficulty:5,profile:'xeno',startMessage:'Xeno attack. Clear the station',
        combatVoiceSequence:['helixArrivingAtStation','helixDestroyXenos'],recoveryPromptVoice:'helixCollectTissueSample',
        stationAnchor:true,useCombatWrecks:true,biologicalRecovery:true,recoveryLabel:'xeno material',markerLabel:'XENO SAMPLE',
        recoveryHudPrefix:'XENO SAMPLE',captureRadius:21,markerGrowRange:105,tractorSeconds:2.2,recoveredMessage:'XENO MATERIAL SECURED'},
      transit('Return to Helix','HEADING TO HELIX LAB','TO HELIX LAB',{voice:'helixDeliverTissueSampleToBiolab',waitForVoice:true}),
      helixLab({deliveryVoice:'helixSampleDelivered'})],
    stages:['Defend the Station','Recover a Sample','Return to Helix','Deliver the Sample'],
    offerSubject:'Teodor called',
    offer:['X. Teodor called. He has never called.','His wonderfully boring station has xenos on the hull. A small swarm, nowhere near any nest we know of. He sounded delighted, which worries me more than the xenos.','Please clear them, bring me a sample, and tell him to stay inside.'],
    completeSubject:'Teodor is safe',
    complete:['Teodor is safe, the sample is extraordinary, and he has asked to come out of retirement. I said no. He is coming anyway.','Helix has named you a Helix Fellow. It is mostly honorary, but the biolab doors will open for you. I insisted.'],
    failed:{subject:'The station is still under attack',body:['The swarm overwhelmed your drone. Teodor reports, calmly, that the xenos are now on the observation deck.','Please go back.']},
    abandoned:{subject:'Teodor is still out there',body:['You left before the station was clear. Teodor has sealed himself in the galley.','He says he is fine. I do not believe him.']}});

  epilogue({faction:'quickbite',short:'QuickBite',contactName:'Nyxo Malloc',clientName:'QuickBite Orbital',from:NYXO,label:'CONTACT QUICKBITE',
    title:'The Leadership Retreat',family:'forest_cabin_delivery',risk:7,pay:47000,xp:2350,titleReward:'Senior Contractor',musicMode:'calm',
    planetaryRequirements:{landingBody:'planet',landingColour:'green',moonCount:{min:0,max:2}},
    description:'QuickBite Corporate is holding a leadership retreat at a cabin deep in a forest. They want lunch delivered, by drone, through the trees, on time.',
    modules:[descent('Forest World Descent',5),
      {type:'surface_destination_approach',label:'Forest Approach',difficulty:5,terrain:'plains',destination:'forest',routeLength:360,treeClumps:7,entryRadius:24},
      {type:'forest_corridor',label:'Deliver Lunch to the Retreat',difficulty:5,length:650,terminalDestination:'cabin_delivery',entryFrom:'surface_destination'}],
    stages:['Descend','Reach the Forest','Fly the Forest','Deliver Lunch to the Cabin'],
    offerSubject:'Corporate wants lunch',
    offer:['Dude. Corporate is having a leadership retreat at a cabin in the middle of a forest planet. They want lunch delivered. By drone. Through the forest.','I said there is exactly one contractor who can do that, and they said fine, but if it is late we are all fired. So no pressure.','Please do not be late.'],
    completeSubject:'A vice president clapped',
    complete:['Lunch arrived warm, right in the middle of the keynote. A vice president clapped. I have never seen one clap.','Corporate gave you a title, dude. Senior Contractor. It means nothing. I have one too. Welcome to the club.'],
    failed:{subject:'Lunch did not make it',body:['Dude, lunch did not make it and the retreat is eating trail mix. Somebody has been crying in a hammock.','Please go again.']},
    abandoned:{subject:'You bailed on Corporate?',body:['You bailed on the Corporate retreat. Of all the lunches to bail on.','It is still in the oven. Go!']}});

  globalThis.AgentXFactionContent={
    chains,epilogues,
    step(id){for(const c of chains)for(const s of c.steps)if(s.id===id)return s;return null},
    capstoneDone(campaign,faction){const c=chains.find(x=>x.faction===faction);return !!c&&!!campaign?.state?.mailFlags?.[c.steps[2].flag+'Done']}
  };
})();
