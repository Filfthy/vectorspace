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
    // v990 additions.
    H('compact_insurance','Compact insurers raise premiums on asteroid-belt freight, blaming "rocks, mostly".'),
    H('quickbite_menu','QuickBite trials a new orbital menu. Early reviews describe the burrito as "structurally ambitious".'),
    H('osd_recruiting','OSD recruitment posters return to station corridors. The slogan is two words long.'),
    H('jackal_art','An anonymous buyer pays a record price for a painting at auction. The Red Jackal Combine declined to comment, very politely.'),
    H('helix_paper','A Helix paper on xeno homing tissue is withdrawn before publication "for further study".'),
    H('customs_drones','The Customs Authority confirms its interceptor drones will now carry larger warning lights.'),
    H('relay_traffic','Relay traffic is up a third on last year as independent haulers move into the outer routes.'),
    // v990 reactive: epilogues and titles.
    H('crossroads_closed','OSD formally closes a blockade order issued years ago at Crossroads. A spokesperson called it "overdue".',c=>!!c.flags.securityAgent4Done),
    H('teodor_station','A retired Helix researcher describes a recent xeno incident at his station as "the most fun I have had in years".',c=>!!c.flags.helixAgent4Done),
    H('corporate_retreat','QuickBite leadership returns from a forest retreat reporting "an excellent lunch".',c=>!!c.flags.quickbiteAgent4Done),
    H('ownership_files','The old records ship of a defunct hospitality firm is reported lost in an asteroid field. Nobody has asked for it back.',c=>!!c.flags.tradeAgent4Done),
    H('snade_ledger','The Snade family postpones a much-advertised public reading. No reason was given.',c=>!!c.flags.jackalsAgent4Done),
    // Reactive headlines: they run once the player has done the thing, never naming X.
    H('bunker_cleared','OSD says an abandoned military bunker has been cleared by "an independent contractor". Details withheld.',c=>(c.bt.bunker_raid||0)>0),
    H('nest_destroyed','Shipping lanes near a former xeno nest reopen. Helix calls the clearance "a tidy piece of work".',c=>(c.bt.nest_clearance||0)>0||!!c.flags.helixAgent2Done),
    H('factory_down','A rogue drone factory on an outer moon has gone dark. OSD declined to say who did it.',c=>!!c.flags.kudo3Done||(c.bt.factory_strike||0)>0),
    H('cache_missing','Customs is investigating a smuggler cache that went missing before officers could reach it.',c=>(c.stats.cachesClaimed||0)>0),
    H('aces_falling','Pirate crews are said to be putting bounties of their own on a contractor who keeps downing their best pilots.',c=>(c.stats.kills?.aces||0)>=2),
    H('truck_stop','Relay Truck Stop reports record lunch sales and "far fewer bugs".',c=>(c.bt.station_defence||0)+(c.bt.taco_run||0)>0),
    H('ice_thaw','Frontier surveyors are told to report any tracks in the ice. OSD says old armour "does not stay asleep".',c=>(c.bt.ice_field_armour||0)>0),
    H('crystal_rush','Crystal mining towns report record assay traffic. One town has named a sandwich after a contractor, against their wishes.',c=>(c.bt.crystal_consignment||0)>0),
    H('tender_warning','OSD advises pilots that some old drone wings fly with a shield tender. "Shoot the white one," a spokesperson said, unusually helpfully.',c=>(c.stats.kills?.tenders||0)>0),
    H('hijack_warning','OSD warns that stolen military drones are turning up in criminal hands. Pilots report they "hesitate, then fire".',c=>!!c.state?.seenProfiles?.hijacked)
  ];
  globalThis.AgentXVoxWire={HEADLINES};
})();
