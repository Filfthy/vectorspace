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
  globalThis.AgentXContactNotes={NOTES,WARM,CLOSE,pick};
})();
