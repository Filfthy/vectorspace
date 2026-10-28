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
        "Do not improvise. If you must improvise, win."
      ],
      close:[
        "You have a reputation in my office now. Do not spend it cheaply.",
        "I put your name forward for this one. Make that look wise.",
        "My officers ask about you. I tell them nothing. That is respect.",
        "Few contractors last this long with me. Continue."
      ]},
    trade:{who:'Corvella Pallis',
      warm:[
        "Easy money, babe. Bring that gorgeous drone home in one piece.",
        "I picked this route with you in mind, sweetie. Don't tell the others.",
        "Freight first, heroics second. Well, maybe a little heroics. For me.",
        "Every time you take off I check the tracker. Purely professional, obviously.",
        "If the pirates show up, be rude to them. You're so good at it."
      ],
      close:[
        "You know I save the nice routes for my favourite, babe.",
        "There's a picture of your drone on the office wall now. I may have put it there.",
        "Come back safe, sweetie. The Compact can replace cargo. I'd rather not replace you.",
        "I told the board you were reliable. I told myself you were wonderful. Both true."
      ]},
    jackals:{who:'Cassian Erivan-Snade',
      warm:[
        "A modest errand. The sort of thing that simply happens, if someone is kind enough to let it.",
        "Should anyone ask, you were never there. Neither, I suspect, was the cargo.",
        "The best arrangements are the ones nobody has to remember.",
        "Discretion is its own reward. The fee is also rather pleasant.",
        "Things change hands. I merely suggest which hands."
      ],
      close:[
        "My family keeps a short list of people it trusts. Your name is on it, in pencil. Ink, I think, soon.",
        "I chose you because you understand that a quiet result is the loudest compliment.",
        "You have become something of a habit. I allow myself very few.",
        "There is a bottle set aside for the day all this becomes respectable. It may age a long time."
      ]},
    helix:{who:'Navira Derris',
      warm:[
        "If anything on this route behaves unexpectedly, please record it before you shoot it. Ideally.",
        "The data from your last job was very interesting. Interesting is my favourite result.",
        "I have attached no special instructions. That is also an experiment.",
        "Risk is a variable. You happen to be very good at controlling it.",
        "If you see anything glowing, note the colour. Then leave."
      ],
      close:[
        "I trust your observations more than most of my instruments. The instruments are not offended. Yet.",
        "I have started naming samples after contractors. Yours is the one that keeps surviving.",
        "You make my results more reliable. I did not expect a pilot to do that.",
        "Bring back whatever you can. Bring yourself back first. That data is harder to replace."
      ]},
    quickbite:{who:'Nyxo Malloc',
      warm:[
        "Dude, it's food. How hard can it be. Don't answer that.",
        "Sorry about the route. The routing software hates me personally.",
        "If anybody shoots at you, the customer still wants it hot.",
        "This is technically a lunch order. Technically.",
        "I'm on shift till late, so if this goes sideways just, like, fix it."
      ],
      close:[
        "Honestly, you're the only contractor who doesn't make me fill in an incident form.",
        "I put you down as my emergency contact. On the work form. Don't make it weird.",
        "Management wanted to give you an award. I said cash. They said no. It's a sticker.",
        "Dude, you're like the only part of this job that actually works."
      ]}
  };
  const WARM=25,CLOSE=60;
  // Same contract, same line: a small string hash of the contract id.
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  function pick(factionId,rep,contractId){
    const n=NOTES[factionId];if(!n||!(rep>=WARM))return null;
    const h=hash(contractId);
    if(h%5>=3)return null; // about three contracts in five carry a note
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
      F('final','The command bunker that kept issuing his Crossroads order has been breached and its archive delivered. The order is closed.')]},
    trade:{who:'Corvella Pallis',facts:[
      F('met','Free Traders Compact route coordinator. Overfamiliar, openly flirtatious, very good at the actual job.'),
      F('lore1','Worked in hospitality before route coordination. "Very personal service."'),
      F('lore2','Keeps the telemetry from your runs and replays the good bits when the depot is quiet.'),
      F('lore3','Built, not born. A former pleasure model, found in an inventory by a Compact auditor who gave her a desk instead of selling her for parts.'),
      F('final','Her original ownership file was recovered from the old records ship. Nobody owns her.')]},
    jackals:{who:'Cassian Erivan-Snade',facts:[
      F('met','Red Jackal Combine contact. Elegant, indirect, never says steal when he can say change of ownership.'),
      F('lore1','Collects quiet things. Paintings, mostly. Occasionally people.'),
      F('lore2','Born of an arranged marriage between the wealthy Erivans and the well-mannered Snades. Neither family has forgiven the other.'),
      F('lore3','Cannot decide whether you are an asset, a liability or furniture, and has decided to enjoy not knowing.'),
      F('final','The Erivan ledger the Snades meant to read in public is in a friend\'s keeping. The family reading was postponed.')]},
    helix:{who:'Navira Derris',facts:[
      F('met','Helix Industrial Group research contact. Strange results make her more interested, not less.'),
      F('lore1','Grew up on a mining moon. At fourteen she asked to keep a xeno tissue sample. She has been asking, more formally, ever since.'),
      F('lore2','Minds destroying a nest. She minds quietly, and takes notes at the same time.'),
      F('lore3','Learned hive chemistry from Teodor, who ran the deep-core field lab before her and retired somewhere he calls wonderfully boring.'),
      F('final','Xenos reached Teodor\'s quiet station anyway. You cleared them. He has not been bored since.')]},
    quickbite:{who:'Nyxo Malloc',facts:[
      F('met','QuickBite Orbital night dispatch. Treats extreme danger as ordinary delivery nonsense.'),
      F('lore1','Six years on night dispatch. Says you are the only contractor who finishes his deliveries.'),
      F('lore2','Promoted to Senior Dispatch Associate. No extra money, a new badge and a meeting about meetings, on Tuesdays.'),
      F('lore3','Knows some mining crews do not eat if the run does not happen. Said so once, then went back to tacos.'),
      F('final','Delivered lunch to the QuickBite leadership retreat, through the forest, on time.')]}
  };
  // known(factionId, {flags, byFaction}) -> the facts the player has unlocked so far.
  function known(id,{flags={},byFaction={}}={}){
    const file=FILES[id];if(!file)return null;
    const lore=n=>id==='vox'?!!flags[`maraLore${n}`]:!!flags[`${id}Lore${n}`];
    const open={met:id==='vox'?!!flags.mara1Done:(byFaction[id]||0)>0,lore1:lore(1),lore2:lore(2),lore3:lore(3),final:id!=='vox'&&!!flags[`${id}Agent4Done`]};
    return {who:file.who,facts:file.facts.filter(f=>open[f.k]).map(f=>f.text),total:file.facts.length}
  }
  globalThis.AgentXContactNotes={NOTES,WARM,CLOSE,pick,FILES,known};
})();
