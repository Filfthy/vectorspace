'use strict';

// CODEX (v1000)
//
// Short lore entries in the Guide, each unlocked the first time the player meets that
// thing. Every entry paraphrases established canon in AGENT_X_WORLD_LORE.txt and
// nothing more: no OPEN QUESTION is answered here (no state names, no xeno origins,
// no answer to how hives spread). CampaignController.renderCodex draws it.
(function(){
  // unlocked(ctx): ctx = {flags, seen (seenProfiles), stats, byFaction}
  const E=(id,title,body,unlocked)=>({id,title,body,unlocked});
  const ENTRIES=[
    E('vox','VOX','The Vector Operations Exchange brokers work between independent operators and client networks. It holds contract payments, records standing, and gives access to approved suppliers. Mara Venn is your principal contact.',()=>true),
    E('partition','The Partition War','A large interstellar bloc fractured into successor states, and the war over its territory, lanes and military infrastructure lasted about twelve years. It ended in an armistice roughly seventy-two years ago. It left behind enormous numbers of autonomous drones and remote installations built to keep running with almost no people.',c=>!!c.seen.rogue||!!c.flags.mara1Done),
    E('rogue','Rogue drones','Wartime drones were built with loyalty that cannot be cleanly rewritten, so that a captured machine could never be turned against its makers. Many still serve states, borders and orders that no longer exist. A "rogue" drone is often doing exactly what it was built to do. They can also rebuild themselves slowly from wrecks and raw material, which is why a quiet field can become a dangerous one.',c=>!!c.seen.rogue),
    E('hijacked','Hijacked military drones','Criminal crews steal wartime drones and re-task them. The original loyalty cannot be wiped, only overruled, so the two sets of orders fight. That is the loyalty conflict: a moment where the drone stalls.',c=>!!c.seen.hijacked),
    E('factory','Remnant factories','Surviving drones can establish small automated industries: mining, stripping wrecks, refining, and building replacements to proven designs. They cannot grow without limit, but space is big, and a factory on an ignored moon can run for years before anyone notices.',c=>!!c.flags.kudo2Done||(c.stats.contracts?.byTemplate?.factory_strike||0)>0||!!c.flags.kudo3Done),
    E('tender','Shield tenders','Wartime support drones that project a shield over the rest of their wing. While one is alive, lasers do far less to the drones it covers. Missiles get through. They were built to keep pickets alive, and the oldest of them are still doing exactly that.',c=>!!c.seen.tender),
    E('ghosts','Ghost constructs','Partition War area-denial systems: a lattice of armoured fragments run by one distributed controller, sown through lanes and wreck fields. Left alone they look like debris. When something passes, the pieces gather into a weapon, and they are only solid while gathered. Nobody builds them now and they do not replicate. They are simply still there. Some carry the old counter-targeting suites: while one of those jammers lives, missile locks fail.',c=>!!c.seen.ghost),
    E('xenos','Xenos','Genuinely alien organisms, not machines and not a political faction. A hive is one living body with its own organs. The xenos that attack you are its immune response, and going inside a hive is, biologically, an infection.',c=>!!c.seen.xeno),
    E('homing','The homing organ','Some xenos carry an organ that lets them find their way back to their hive, and it holds a signature of that hive. Recovered tissue can narrow down where a nest is.',c=>!!c.flags.helix1Done||(c.stats.contracts?.byTemplate?.specimen_recovery||0)>0),
    E('worlds','Survey colours','VOX survey charts colour a world by its ground. Green worlds carry forest, and blue ones are wetter, with reed beds among the trees. Cyan means ice fields, magenta means crystal growth, and yellow or orange means dry, rocky country, though some orange worlds are still volcanic. Wartime machines turn up on all of them, sometimes after decades asleep.',c=>!!(c.seen.world_ice||c.seen.world_crystal||c.seen.world_arid||c.seen.world_wet)),
    E('survey','Survey work','The outer worlds are badly mapped, and the networks race each other to fix that. Orbital scans disagree, routing systems invent lakes, and old war machines leave tracks nobody can explain from above. Survey work means flying low over marked points and letting the ground tell the truth.',c=>(c.stats.contracts?.byTemplate?.survey_run||0)>0),
    E('minefields','Old minefields','Both sides of the Partition War sowed the lanes with contact mines, and plenty of them never went off. They drift, they tumble, and they still arm when something comes close. Survey has never caught up with them. OSD logs every field an operator clears.',c=>!!c.flags.metMinefield),
    E('drifters','Drifters','Huge, slow xenos that cross open space in herds, with hornets keeping station over them. They do not attack, and nobody knows where they are going. Helix pays for any close scan of a migration, and does not forgive operators who fire on one.',c=>!!c.flags.metMigration),
    E('volcanic','Volcanic worlds','Some of the orange worlds have not finished cooling. Their plains are cut by open fissures, studded with cinder cones and basalt columns, and the active vents throw embers. Ash falls without warning. Nobody settles there, but the mining and survey crews go where the minerals are.',c=>!!c.seen.world_volcanic),
    E('storms','Surface storms','The thin, cold air of the ice worlds can throw up a blizzard with little warning, and the winds of the dry worlds carry dust for days. A drone flies through on instruments. Nobody wants to set a crew down in one.',c=>!!c.flags.metStorm),
    E('crews','Ground crews','Surveyors, miners and road crews work the remote surfaces with very little help nearby. When one is stranded, its beacon goes out on an open channel and anyone passing can relay the position. Most contractors do not stop. The crews remember the ones who do.',c=>(c.stats.landBeacons||0)>0),
    E('pirates','Pirates','Ordinary criminal crews working the poorly policed routes. Not every hostile contact is part of a larger war. Some just want the cargo, and some have a named ace or two.',c=>!!c.seen.pirate),
    E('customs','Customs Authority','Interceptor drones that patrol the shipping lanes and inspect cargo. They are not your enemy, unless your client would rather they did not look.',c=>!!c.seen.customs),
    E('osd','Orbital Security Directorate','The security directorate. Hardline doctrine, decisive force. Kudo Shang is its contact, and he does not do warmth.',c=>(c.byFaction.security||0)>0),
    E('trade','Free Traders Compact','Commercial shipping and route protection, freight depots and convoys. Corvella Pallis coordinates routes, in her own very personal way.',c=>(c.byFaction.trade||0)>0),
    E('jackals','Red Jackal Combine','A powerful criminal, political and commercial network built on influence, discretion and deniable work. Cassian Erivan-Snade prefers implication to instruction.',c=>(c.byFaction.jackals||0)>0),
    E('helix','Helix Industrial Group','Research, specimens, containment and the unexpected. Navira Derris finds anomalies more interesting than frightening.',c=>(c.byFaction.helix||0)>0),
    E('quickbite','QuickBite Orbital','A huge, entirely legitimate food and logistics company whose deliveries keep turning into firefights. Nyxo Malloc works night dispatch.',c=>(c.byFaction.quickbite||0)>0)
  ];
  globalThis.AgentXCodex={ENTRIES};
})();
