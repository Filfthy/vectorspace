'use strict';

// CONTACT NOTES (v1030)
//
// A one-line aside from the network's contact on some board contracts, so the
// contacts keep talking between letters and agent missions. The warm lines open at
// rep 25 and the close lines at rep 60, and they get more personal as standing
// grows. Voices follow AGENT_X_MISSION_AND_CONTACT_STYLE_GUIDE.txt. Nothing here
// reveals a contact's private history (Corvella's past stays in her third letter)
// or settles an OPEN QUESTION in the lore. CampaignController.contactNoteHtml
// picks one per contract from its id, so a contract always shows the same line.
(function(){
  const NOTES={
    security:{who:'Kudo Shang',
      warm:[
        "The contract is straightforward. Keep it that way.",
        "Your last debrief was adequate. I do not say that often.",
        "Fly it clean. Hesitation is a decision to lose.",
        "The Directorate pays for results, not for effort.",
        "Do not improvise. If you must improvise, win.",
        "Weather on the route is irrelevant. So are excuses.",
        "I read the last debrief twice. That was not a compliment. It was thoroughness."
      ],
      close:[
        "You have a reputation in my office now. Do not spend it cheaply.",
        "I put your name forward for this one. Make that look wise.",
        "My officers ask about you. I tell them nothing. That is respect.",
        "Few contractors last this long with me. Continue.",
        "If this goes wrong, I will hear it from you first. That is a privilege. Keep it."
      ]},
    trade:{who:'Corvella Pallis',
      warm:[
        "Easy money, babe. Bring that gorgeous drone home in one piece.",
        "I picked this route with you in mind, sweetie. Don't tell the others.",
        "Freight first, heroics second. Well, maybe a little heroics. For me.",
        "Every time you take off I check the tracker. Purely professional, obviously.",
        "If the pirates show up, be rude to them. You're so good at it.",
        "This one goes past some lovely scenery, sweetie. Try to notice it between explosions.",
        "Freight is freight, babe. You are not. Come back in one piece."
      ],
      close:[
        "You know I save the nice routes for my favourite, babe.",
        "There's a picture of your drone on the office wall now. I may have put it there.",
        "Come back safe, sweetie. The Compact can replace cargo. I'd rather not replace you.",
        "I told the board you were reliable. I told myself you were wonderful. Both true.",
        "I keep a little list of things that make me happy, babe. You are on it twice."
      ]},
    jackals:{who:'Cassian Erivan-Snade',
      warm:[
        "A modest errand. The sort of thing that simply happens, if someone is kind enough to let it.",
        "Should anyone ask, you were never there. Neither, I suspect, was the cargo.",
        "The best arrangements are the ones nobody has to remember.",
        "Discretion is its own reward. The fee is also rather pleasant.",
        "Things change hands. I merely suggest which hands.",
        "Please be gentle with anything breakable. Including, where convenient, people.",
        "A small matter. Large matters are for people who enjoy being noticed."
      ],
      close:[
        "My family keeps a short list of people it trusts. Your name is on it, in pencil. Ink, I think, soon.",
        "I chose you because you understand that a quiet result is the loudest compliment.",
        "You have become something of a habit. I allow myself very few.",
        "There is a bottle set aside for the day all this becomes respectable. It may age a long time.",
        "My aunt asked after you. I told her you were a rumour. She was delighted."
      ]},
    helix:{who:'Navira Derris',
      warm:[
        "If anything on this route behaves unexpectedly, please record it before you shoot it. Ideally.",
        "The data from your last job was very interesting. Interesting is my favourite result.",
        "I have attached no special instructions. That is also an experiment.",
        "Risk is a variable. You happen to be very good at controlling it.",
        "If you see anything glowing, note the colour. Then leave.",
        "Please log anything unusual. I have a broad definition of unusual.",
        "I have a hypothesis about this route. Please do not disprove it by exploding."
      ],
      close:[
        "I trust your observations more than most of my instruments. The instruments are not offended. Yet.",
        "I have started naming samples after contractors. Yours is the one that keeps surviving.",
        "You make my results more reliable. I did not expect a pilot to do that.",
        "Bring back whatever you can. Bring yourself back first. That data is harder to replace.",
        "The biolab staff have a betting pool on your survival. I refused to bet against you. On scientific grounds."
      ]},
    quickbite:{who:'Nyxo Malloc',
      warm:[
        "Dude, it's food. How hard can it be. Don't answer that.",
        "Sorry about the route. The routing software hates me personally.",
        "If anybody shoots at you, the customer still wants it hot.",
        "This is technically a lunch order. Technically.",
        "I'm on shift till late, so if this goes sideways just, like, fix it.",
        "The customer left a note saying be quick. They spelled quick wrong. Be quick anyway.",
        "If there's a fight, the food is not a weapon. I have to say that. Legal made me."
      ],
      close:[
        "Honestly, you're the only contractor who doesn't make me fill in an incident form.",
        "I put you down as my emergency contact. On the work form. Don't make it weird.",
        "Management wanted to give you an award. I said cash. They said no. It's a sticker.",
        "Dude, you're like the only part of this job that actually works.",
        "Honestly, if you ever quit, I am quitting too. Okay, not really. But I would think about it."
      ]}
  };
  // v1900 JOB NOTES: once standing is warm, about half the noted contracts carry a line
  // about that particular kind of job instead of a general one. Same voices, same rules:
  // nothing a contact could not know before the job, and nothing that gives away a
  // hidden encounter.
  const JOBS={
    security:{
      fighters:["Hostiles on an OSD lane. Remove them. That is the whole brief.","Close the distance and keep firing. Hesitation is how drones are lost."],
      station_defence:["A station that cannot hold its own perimeter is a liability. Today you are its perimeter.","Hold the line until there is nothing left to shoot at."],
      bunker_raid:["Hard target. Hit it hard.","That bunker was built to stop people like you. Prove the engineers wrong."],
      dune_armour_clearance:["Armour respects one thing. Decisive force. Take the legs first.","Walkers are slow. Do not be slow."],
      ice_field_armour:["Cold ground, heavy armour. Neither is an excuse.","Break the legs and the rest follows. Finish it."],
      lattice_survey:["I want the map, not the wreckage. Discipline over impulse, for once.","Do not fire. That is an order, and I expect it obeyed."],
      nest_clearance:["Infestations do not negotiate. Neither do we."],
      asteroids:["Rock clearance is not glamorous. Neither is losing a convoy to a rock. Do it properly."],
      convoy_escort:["The freighter does not fight. You do. Keep it that way.","Raiders go for the hull. Make them come to you instead."],
      survey_run:["Survey work. Low, steady, complete. Every point. I do not accept partial maps."],
      crash_recovery:["Recover the recorders. A crash is a question. The recorder is the answer."],
      relay_repair:["Relays down means the lane is blind. Restore them. Blindness is a weakness."],
      station_delivery:["Deliver the cargo. Do not deviate. Deviation is how cargo goes missing."],
      asteroid_delivery:["The mine expects resupply on schedule. Schedules are kept, not attempted."],
      secure_terminal_intrusion:["Get in, take the data, get out. Speed is security."]
    },
    trade:{
      wreck_recovery:["Sweetie, there is a lost freighter out there with my name on half its cargo. Bring me something shiny.","Babe, wrecks are spooky. Good thing you are the scariest thing in that field."],
      asteroid_delivery:["A delivery into the rocks, Sweetie. Try not to scratch that gorgeous hull. I am very fond of it."],
      penthouse_delivery:["Penthouse drop, Babe. Rich people, tiny balconies, big drone. I want to hear how you parked it."],
      fighters:["Pirates on my lane again, Sweetie. Go be big and loud at them. I will be thinking about it all day."],
      asteroids:["Rocks in the lane, Babe. Turn them into gravel and make it look easy. You always do."],
      station_defence:["Sweetie, somebody is bullying a station I like. Go and show them what a real drone looks like."],
      survey_run:["Babe, it is a survey. Fly low, look pretty, come home. That is practically a date."],
      crater_cores:["Sweetie, I am buying a moon. Well, a bit of one. Go and dig your lovely nose into its craters for me."],
      convoy_escort:["Sweetie, that hauler is full of my money and she cannot shoot back. You can. Stay close to her.","Babe, the pirates always go for the fat slow one. Show them the fast dangerous one instead."],
      groundside_pickup:["Sweetie, there is a parcel on the ground with my name on it. Go and fetch it, and look good doing it."],
      crash_recovery:["Babe, one of my haulers came down hard. Bring back the recorders so I can find out whose fault it was. Not yours, obviously."],
      relay_repair:["Sweetie, the relays are down and my haulers are flying blind. Switch them back on for me, you clever thing."],
      forest_cabin_delivery:["A delivery to a little cabin in the woods, babe. Very romantic. Very full of trees. Watch the trees."],
      station_delivery:["Station run, sweetie. In, drop, out. Wave at the dock crew for me, they adore you."],
      swamp_relay_delivery:["Babe, the swamp is horrid and the relay crew is lovely. Do it for them. And for me."]
    },
    jackals:{
      customs_run:["Customs believes in its rings. Let us not disturb its faith. Fly through the dark.","A lighthouse only sees what stands in its beam. Do not stand in it."],
      wreck_recovery:["The previous owners of that cargo have stopped needing it. It seems wasteful to leave it lying about."],
      secure_terminal_intrusion:["There is a terminal that knows rather too much. I should like it to share."],
      penthouse_delivery:["The recipient has excellent taste and a very discreet doorman. Do be quick."],
      crash_recovery:["Crashes are so untidy. Everyone forgets who owned the flight recorder."],
      groundside_pickup:["A small parcel, collected quietly. The less anyone remembers, the better we all sleep."],
      fighters:["Some gentlemen have mistaken our patience for permission. Do correct them."],
      deep_core:["A reactor in the wrong hands is a tragedy. In nobody's hands it is merely a crater. I prefer craters."],
      forest_cabin_delivery:["A gentleman in the woods has asked for something he cannot buy in town. Discretion is the whole of the fee."],
      crystal_consignment:["Crystals are such honest things. One always knows what they are worth. The same cannot be said of their previous owners."],
      swamp_relay_delivery:["Nobody looks for anything in a swamp. That is rather the point of a swamp."],
      asteroid_delivery:["The miners asked for supplies. What the supplies are is a matter between them and their consciences."],
      station_delivery:["A parcel for the station. The customs paperwork is immaculate. I wrote it myself."],
      asteroids:["Some rocks are in the way of some people. I find I am on the side of the people."]
    },
    helix:{
      specimen_recovery:["The specimen matters more than the station. Please do not quote me to the station."],
      nest_clearance:["A hive is one organism. You are going in as an infection. I would very much like the readings."],
      lattice_survey:["Nobody has mapped a dormant controller intact. Every core you scan is a first.","Stay outside the waking range. I need it asleep to understand how it sleeps."],
      vent_survey:["The vents are older than the crust around them. I want to know how much older."],
      crater_cores:["A crater floor is a record. The rim is a rumour. Sample the floor.","The sampler reaches about two metres. Please arrive within two metres."],
      crystal_consignment:["The crystals keep growing after they are cut. Handle the cargo as though it were alive. It may be."],
      crash_recovery:["A crash site is a badly documented accident. Collect the recorders and I will document it properly."],
      combat_recovery:["Something survived that fight which should not have. Find it before it stops being interesting."],
      asteroid_delivery:["The mine crew has been inside that rock for months. Statistically, they are about to do something interesting. Deliver quickly."],
      fighters:["Hostiles are interfering with a sampling lane. Remove the interference. Keep any debris that looks unusual."],
      survey_run:["The orbital scans of that world disagree with each other, which means at least one of them is wrong. Fly the points and settle it."],
      swamp_relay_delivery:["The swamp has a chemistry I would like to understand. Please do not add to it by crashing."],
      station_delivery:["The cargo is inert. I checked twice. I will check a third time when it arrives."],
      asteroids:["Clear the marked rocks. If one of them turns out to be hollow, I want to hear about it."]
    },
    quickbite:{
      taco_run:["Taco run, dude. If the beacon is lying again, shoot whoever lied.","Customers want tacos. Pirates want tacos. Only one of them is paying."],
      asteroid_delivery:["There are rocks all over the lane. Big ones. Also the food is getting cold."],
      asteroids:["Corporate wants the lane cleared. I want the lane cleared. Rare day, dude."],
      station_delivery:["Station order. Do not open the box. I am serious, the box is not for you."],
      fighters:["So these guys keep shooting our couriers. I feel like that is their problem now. Go make it one."],
      relay_repair:["Relay is down, so nobody can order anything, so nobody is yelling at me. Fix it anyway, I guess."],
      penthouse_delivery:["Penthouse order. Rich guy tips in exposure. Deliver it anyway, dude."],
      convoy_escort:["The freighter is basically a giant fridge with engines. Do not let anyone shoot the fridge.","If the freighter dies, I have to explain three hundred melted orders. Please do not make me do that."],
      forest_cabin_delivery:["Cabin order in the woods, dude. The trees are not on our side. Nothing out there is on our side."],
      groundside_pickup:["Pickup on the ground. Somebody left their order at the counter. A planet counter."],
      station_defence:["Something is attacking a station we deliver to. If it stops existing, they keep ordering. That is the business model."],
      swamp_relay_delivery:["Swamp run. Do not touch the plants. I do not know which plants. Just, generally, the plants."],
      combat_recovery:["There was a fight, and now there is a thing floating in it that Corporate wants back. Get the thing."]
    }
  };
  const WARM=25,CLOSE=60;
  // Same contract, same line: a small string hash of the contract id.
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  function pick(factionId,rep,contractId,templateId=null){
    const n=NOTES[factionId];if(!n||!(rep>=WARM))return null;
    const h=hash(contractId);
    if(h%5>=3)return null; // about three contracts in five carry a note
    const job=JOBS[factionId]?.[templateId];
    if(job?.length&&((h>>>7)&1))return {who:n.who,text:job[(h>>>9)%job.length]};
    const pool=rep>=CLOSE?n.close.concat(n.warm.slice(0,2)):n.warm;
    return {who:n.who,text:pool[(h>>>3)%pool.length]}
  }

  // v1060 CONTACT FILES: what VOX has noted about each contact, on the Networks page.
  // Every fact is a summary of something the player has already been told (a letter,
  // an agent mission, an epilogue), opened by the same flag, so nothing new is
  // revealed here. k: 'met', 'lore1'..'lore3' (letters) or 'final' (epilogue done).
  const F=(k,text)=>({k,text});
  const FILES={
    vox:{who:'Mara Venn',facts:[
      F('met','Your principal contact at VOX Contractor Services. Direct, informal, keeps private work off the board.'),
      F('lore1','Picked you from forty contractors because you read the brief and did not ask for more money first.'),
      F('lore2','Sent you to Cassian and owns what he asked of you. She would make the same call again.'),
      F('lore3','When the next factory wakes, she wants it to be you she calls.')]},
    security:{who:'Kudo Shang',facts:[
      F('met','Orbital Security Directorate contact. Clipped, hardline, praise short and rare.'),
      F('lore1','Served twenty-six years before taking his desk. Reads your file himself.'),
      F('lore2','Wrote the original Crossroads blockade order. The stand-down never reached the pickets in a form they would accept.'),
      F('lore3','Keeps a short list of operators he would send first. You are on it. His first commanding officer kept two words on her console: Finish it.'),
      F('final','The command bunker that kept issuing his Crossroads order has been breached and its archive delivered. The order is closed.'),
      F('lore4','Broke his own no-more-letters order to tell you the Crossroads pickets were stood down properly.'),
      // v1960: facts from the first-meeting letters (faction-lore.js REACTIONS)
      F('react_ghosts','Calls ghost constructs lattice ordnance. Nobody stands down a minefield, he says. You clear it.'),
      F('react_minelayer','Counts mine-laying pirates as a military problem, not a criminal one. Wants the lanes clean.')]},
    trade:{who:'Corvella Pallis',facts:[
      F('met','Free Traders Compact route coordinator. Overfamiliar, openly flirtatious, very good at the actual job.'),
      F('lore1','Worked in hospitality before route coordination. "Very personal service."'),
      F('lore2','Keeps the telemetry from your runs and replays the good bits when the depot is quiet.'),
      F('lore3','Built, not born. A former pleasure model, found in an inventory by a Compact auditor who gave her a desk instead of selling her for parts.'),
      F('final','Her original ownership file was recovered from the old records ship. Nobody owns her.'),
      F('lore4','Took her first holiday, as a guest, and brought you back a tiny model drone.'),
      // v1960: facts from the first-meeting letters (faction-lore.js REACTIONS)
      F('react_minefield','Loses a hauler to the old war minefields every season. Wants you to come home.'),
      F('react_ace','Has been robbed by the named pirate aces for years. Likes it that they are scared of you now.'),
      F('react_firstConvoy','Her hauler captains come into the office to talk about you. Calls escort work the best money she spends.')]},
    jackals:{who:'Cassian Erivan-Snade',facts:[
      F('met','Red Jackal Combine contact. Elegant, indirect, never says steal when he can say change of ownership.'),
      F('lore1','Collects quiet things. Paintings, mostly. Occasionally people.'),
      F('lore2','Born of an arranged marriage between the wealthy Erivans and the well-mannered Snades. Neither family has forgiven the other.'),
      F('lore3','Cannot decide whether you are an asset, a liability or furniture, and has decided to enjoy not knowing.'),
      F('final','The Erivan ledger the Snades meant to read in public is in a friend\'s keeping. The family reading was postponed.'),
      F('lore4','Suspects he enjoys working with you. Keeps a door open for quiet favours.'),
      // v1960: facts from the first-meeting letters (faction-lore.js REACTIONS)
      F('react_storm','Admires weather. It ruins everyone equally and never apologises.'),
      F('react_hijacked','Finds stolen loyalty vulgar. Loyalty, he says, is cultivated, preferably over dinner.')]},
    helix:{who:'Navira Derris',facts:[
      F('met','Helix Industrial Group research contact. Strange results make her more interested, not less.'),
      F('lore1','Grew up on a mining moon. At fourteen she asked to keep a xeno tissue sample. She has been asking, more formally, ever since.'),
      F('lore2','Minds destroying a nest. She minds quietly, and takes notes at the same time.'),
      F('lore3','Learned hive chemistry from Teodor, who ran the deep-core field lab before her and retired somewhere he calls wonderfully boring.'),
      F('final','Xenos reached Teodor\'s quiet station anyway. You cleared them. He has not been bored since.'),
      F('lore4','Teodor came out of retirement and took the office next to hers. He said to keep you.'),
      // v1960: facts from the first-meeting letters (faction-lore.js REACTIONS)
      F('react_migration','Wants to be the person who finds out where the drifters are going. Would settle for funding them.'),
      F('react_tender','Would pay for the pieces of a shield tender, if you ever leave any.'),
      F('react_firstCores','Found a band in your moon cores that came from a long way off. Wants cores from more moons.')]},
    quickbite:{who:'Nyxo Malloc',facts:[
      F('met','QuickBite Orbital night dispatch. Treats extreme danger as ordinary delivery nonsense.'),
      F('lore1','Six years on night dispatch. Says you are the only contractor who finishes his deliveries.'),
      F('lore2','Promoted to Senior Dispatch Associate. No extra money, a new badge and a meeting about meetings, on Tuesdays.'),
      F('lore3','Knows some mining crews do not eat if the run does not happen. Said so once, then went back to tacos.'),
      F('final','Delivered lunch to the QuickBite leadership retreat, through the forest, on time.'),
      F('lore4','Was sent a plant by a vice president. He named it Contractor.'),
      // v1960: facts from the first-meeting letters (faction-lore.js REACTIONS)
      F('react_volcanic','QuickBite delivers to volcano worlds. He does not know why either.'),
      F('react_groundCrew','Noticed you stopped for a stranded ground crew. Nobody stops, he says. He has the data.'),
      F('react_fieldAmbush','Is fairly sure Corporate has never been inside an asteroid field. Or an office.')]}
  };
  // known(factionId, {flags, byFaction}) -> the facts the player has unlocked so far.
  function known(id,{flags={},byFaction={}}={}){
    const file=FILES[id];if(!file)return null;
    const lore=n=>id==='vox'?!!flags[`maraLore${n}`]:!!flags[`${id}Lore${n}`];
    const open={met:id==='vox'?!!flags.mara1Done:(byFaction[id]||0)>0,lore1:lore(1),lore2:lore(2),lore3:lore(3),final:id!=='vox'&&!!flags[`${id}Agent4Done`],lore4:id!=='vox'&&lore(4)};
    // v1960: a fact from a first-meeting letter opens once that letter has been sent.
    return {who:file.who,facts:file.facts.filter(f=>open[f.k]||(f.k.startsWith('react_')&&!!flags[f.k])).map(f=>f.text),total:file.facts.length}
  }

  // v1110 STANDING TIERS: one line from the contact on the standing mail when you
  // reach Favoured or Trusted, or fall to Distrusted (Hostile has its own letter).
  const TIERS={
    security:{Favoured:"Your file has moved to the short pile. That is not a compliment yet.",
      Trusted:"You are now cleared for work I do not give to contractors. Do not make me regret the paperwork.",
      Distrusted:"Your reliability rating has dropped. I noticed. Fix it."},
    trade:{Favoured:"Look at you, sweetie. Favoured. I always knew you had it in you.",
      Trusted:"Trusted, babe. Do you know how rarely I get to type that? Come and collect your compliments.",
      Distrusted:"Babe, the board is grumbling about you. I am defending you, but give me something to work with."},
    jackals:{Favoured:"The Combine has begun to remember your name. In our circles that is usually a warning. In yours, a promotion.",
      Trusted:"You now have the Combine's trust, which is rarer than its money and considerably harder to steal.",
      Distrusted:"There has been some unflattering talk about you. I have not yet decided whether to correct it."},
    helix:{Favoured:"Your results are now considered reproducible. At Helix that is very high praise.",
      Trusted:"The board has rated you Trusted. I reached the same conclusion earlier, with a smaller sample.",
      Distrusted:"Your recent results are inconsistent. I would like to understand why. So would the board, less kindly."},
    quickbite:{Favoured:"Dude, the system says you are Favoured now. I did not know it could say that.",
      Trusted:"Trusted, dude. Corporate wants a photo for the wall. I said you are a drone. They said fine, photo of the drone.",
      Distrusted:"So, uh, the system flagged you as unreliable. I am not saying it is right. I am saying it noticed."}
  };
  function tierLine(id,label,up){
    const t=TIERS[id]?.[label],n=NOTES[id];if(!t||!n)return null;
    if((label==='Distrusted')===!!up)return null; // praise only on the way up, the warning only on the way down
    return `${n.who}: "${t}"`
  }
  globalThis.AgentXContactNotes={NOTES,JOBS,WARM,CLOSE,pick,FILES,known,TIERS,tierLine};
})();
