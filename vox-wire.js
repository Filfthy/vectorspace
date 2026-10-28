'use strict';

// VOX WIRE (v930)
//
// A short in-world news digest every few contracts: two or three headlines about the
// networks and the region. Some only run once the player has done something they
// would report (a bunker raid, a factory, a claimed cache), always without naming X.
// Nothing here settles an OPEN QUESTION in AGENT_X_WORLD_LORE.txt. Routine mail, so
// it is pruned like any other notice. CampaignController.maybeQueueVoxWire sends it.
(function(){
  // when(ctx): ctx = {flags, stats, bt (completions by template), level}
  const H=(id,text,when=null)=>({id,text,when});
  const HEADLINES=[
    H('compact_convoys','Free Traders Compact adds armed escorts to three convoy lanes after a month of pirate losses.'),
    H('quickbite_apology','QuickBite Orbital apologises after a delivery drone circled a mining habitat for six hours "looking for the door".'),
    H('helix_denies','Helix Industrial denies reports that a research specimen briefly left its containment wing. "Briefly" is not a word Helix uses, a spokesperson said.'),
    H('osd_relay','OSD confirms another Partition War relay found still transmitting on an outer route. The relay has been "addressed".'),
    H('jackal_gala','The Red Jackal Combine hosts its annual charity gala. Guests describe the security as "extremely discreet".'),
    H('customs_budget','The Customs Authority asks for more interceptor drones, citing "an unusual number of unexplained malfunctions".'),
    H('asteroid_claims','Belt mining claims hit a record as independent crews push deeper into unmonitored rock fields.'),
    H('taco_beacon','QuickBite says the Taco Beacon served its ten millionth order. Nobody has asked who ordered the first.'),
    H('rogue_sightings','Rogue drone sightings on remote moons are up again. VOX advises contractors to check their transponders before descent.'),
    H('helix_hiring','Helix Industrial is hiring field technicians. Applicants must be "comfortable around the unexpected".'),
    H('compact_beacons','The Compact rolls out new freight beacon codes after a spoofing scandal it describes as "fully resolved".'),
    H('vox_record','VOX reports its busiest quarter for independent contract work since the armistice.'),
    // Reactive headlines: they run once the player has done the thing, never naming X.
    H('bunker_cleared','OSD says an abandoned military bunker has been cleared by "an independent contractor". Details withheld.',c=>(c.bt.bunker_raid||0)>0),
    H('nest_destroyed','Shipping lanes near a former xeno nest reopen. Helix calls the clearance "a tidy piece of work".',c=>(c.bt.nest_clearance||0)>0||!!c.flags.helixAgent2Done),
    H('factory_down','A rogue drone factory on an outer moon has gone dark. OSD declined to say who did it.',c=>!!c.flags.kudo3Done||(c.bt.factory_strike||0)>0),
    H('cache_missing','Customs is investigating a smuggler cache that went missing before officers could reach it.',c=>(c.stats.cachesClaimed||0)>0),
    H('aces_falling','Pirate crews are said to be putting bounties of their own on a contractor who keeps downing their best pilots.',c=>(c.stats.kills?.aces||0)>=2),
    H('truck_stop','Relay Truck Stop reports record lunch sales and "far fewer bugs".',c=>(c.bt.station_defence||0)+(c.bt.taco_run||0)>0),
    H('hijack_warning','OSD warns that stolen military drones are turning up in criminal hands. Pilots report they "hesitate, then fire".',c=>!!c.state?.seenProfiles?.hijacked)
  ];
  globalThis.AgentXVoxWire={HEADLINES};
})();
