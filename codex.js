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
    E('xenos','Xenos','Genuinely alien organisms, not machines and not a political faction. A hive is one living body with its own organs. The xenos that attack you are its immune response, and going inside a hive is, biologically, an infection.',c=>!!c.seen.xeno),
    E('homing','The homing organ','Some xenos carry an organ that lets them find their way back to their hive, and it holds a signature of that hive. Recovered tissue can narrow down where a nest is.',c=>!!c.flags.helix1Done||(c.stats.contracts?.byTemplate?.specimen_recovery||0)>0),
    E('worlds','Survey colours','VOX survey charts colour a world by its ground. Green and blue worlds carry forest. Cyan means ice fields, magenta means crystal growth, and yellow or orange means dry, rocky country. Wartime machines turn up on all of them, sometimes after decades asleep.',c=>!!(c.seen.world_ice||c.seen.world_crystal||c.seen.world_arid)),
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
