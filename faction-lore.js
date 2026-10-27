'use strict';

// FACTION CONTACT LORE (v700)
//
// Getting to know the five network contacts. Each sends three short personal letters
// as the relationship deepens: one at standing 15 (before their agent missions open),
// one after agent mission 2, and one a few contracts after the capstone. Letters are
// character, not world history: nothing here settles an OPEN QUESTION in
// AGENT_X_WORLD_LORE.txt (sovereign politics, Partition War specifics, xeno origins,
// X's legal status). Voices follow AGENT_X_MISSION_AND_CONTACT_STYLE_GUIDE.txt.
// Corvella's third letter is the earned disclosure of her past as a pleasure bot.
//
// CampaignController.evaluateFactionLore() sends at most one letter per finished
// contract, so an older save at high standing is not flooded.
(function(){
  const L=(subject,body)=>({subject,body});
  const LETTERS={
    security:[
      L('Operator assessment',[
        'X. The Directorate keeps a file on every contractor who works OSD routes. Yours has become thick enough that I read it myself.',
        'Most contractors flinch. They take the easy work, abandon when the numbers turn, and explain afterwards. Your file contains very few explanations.',
        'I served twenty-six years before I took this desk. I do not write to contractors. Consider this a correction to that record.']),
      L('Regarding Crossroads',[
        'You should know why Crossroads mattered to me.',
        'I wrote the original blockade order. Eleven picket drones, a mined approach, no exceptions. It was the correct order at the time.',
        'When the blockade was lifted, the stand-down went out through three offices and reached the pickets in a form they would not accept. Machines built for war do not obey suggestions.',
        'My orders are short for a reason. Now you know it.']),
      L('Standing order',[
        'X. One message of this kind, and then I will not write like this again.',
        'My first commanding officer kept two words on her console. Finish it. She never explained them and I will not either.',
        'I keep a list of operators I would send first. It is a short list. Your name is on it. Stay on it.'])
    ],
    trade:[
      L('A little note from me',[
        'Sweetie, I never write to contractors when nothing is on fire. You are making me break all my rules.',
        'Before route coordination I was in hospitality. Very personal service. I was extremely good at it, babe, and I have never quite stopped.',
        'So if my mail gets a bit warm, that is just me being me. You do not have to write back. But you could.']),
      L('I kept something of yours',[
        'Babe, confession time. I keep the telemetry from your runs. All of it.',
        'I play the good bits back when the depot is quiet. That run through the beacon spoofers? Twelve times. Maybe fifteen.',
        'The engineers say it is a waste of storage. The engineers have no taste and very small drones.']),
      L('Something I do not tell people',[
        'Sweetie, you have done everything I ever asked, so you get the truth. Do not make a fuss.',
        'I was not born. I was built. Pleasure model, top of the range, very expensive and very good at making people feel wonderful.',
        'When the place that owned me went under, a Compact auditor found me in the inventory and could not bring herself to sell me for parts. She gave me a desk instead. Turns out routing freight is mostly making people feel wonderful too.',
        'So yes, babe. When I go weak at the knees over a big, muscly, heavily armed machine, I promise it is professional interest. Mostly.',
        'I like who I am now. I like that you are part of it. Now go and blow something up for me.'])
    ],
    jackals:[
      L('On the subject of taste',[
        'X. You may have noticed that I rarely ask for anything loud.',
        'Noise is what people use when they lack a plan. A fire draws a crowd. A missing ledger draws nothing at all, sometimes for years.',
        'I mention it only because your recent work has been admirably quiet. I collect quiet things. Paintings, mostly. Occasionally people.']),
      L('A family matter',[
        'My name has a hyphen in it, which you will have noticed and been too polite to ask about.',
        'The Erivans had money and no manners. The Snades had manners and no money. My grandparents arranged a marriage between the two, and neither family has forgiven the other since.',
        'I inherited the worst of both, which is to say I can afford to be rude very elegantly.']),
      L('An unusual admission',[
        'X. In my line of work nobody is a friend. People are assets, liabilities or furniture.',
        'I find I do not know which of those you are. It is a novel sensation, and I have decided to enjoy it.',
        'If anyone ever offers you a great deal of money to make me disappear, do tell me first. I would hate to be outbid.'])
    ],
    helix:[
      L('A question you did not ask',[
        'X. A colleague tells me contractors like to know who they are working for. I had not considered it. Here is the short version.',
        'I grew up on a mining moon. When I was fourteen a survey crew brought back a xeno tissue sample in a cooler meant for lunch. Everyone else was frightened. I asked if I could keep it.',
        'They said no. I have been asking the same question, more formally, ever since.']),
      L('About the nest',[
        'People at Helix think I do not mind destroying a nest. I mind. I simply mind quietly and take notes at the same time.',
        'A hive is one living body. When you go inside, it fights you the way your own blood fights an infection. That is not malice. It is just very good biology.',
        'I wanted you to know I understood what I was asking. Thank you for doing it anyway.']),
      L('Teodor',[
        'You never met Teodor. He ran the deep-core field lab before me and taught me most of what I know about hive chemistry.',
        'He retired to a station with no xenos for forty light minutes in any direction. He says it is wonderfully boring. I do not believe him.',
        'The lab you saved still has his handwriting on the walls. I checked. Thank you for keeping it.'])
    ],
    quickbite:[
      L('Hey',[
        'Dude, this is not a work email. Well, it is on the work system, but it is not about work.',
        'I just realised you are the only contractor who actually finishes my deliveries. Everyone else looks at the route and goes, nope.',
        'Also I have done night dispatch for six years and nobody has ever said thanks to me, so I am kind of modelling the behaviour I want to see. Thanks.']),
      L('I got promoted',[
        'Dude. I got promoted. Senior Dispatch Associate.',
        'It comes with no extra money, a new badge, and a meeting about meetings. On Tuesdays.',
        'Corporate says my routes have the best completion rate in the sector. That is you, dude. So basically you got me promoted. Sorry about the meetings.']),
      L('Real talk for a second',[
        'Okay, real talk for one second and then I go back to being normal.',
        'Everybody here treats the drone jobs like a joke. Rocks in the lane, bugs at the truck stop, whatever. But some of those mining crews really do not eat if the run does not happen.',
        'So yeah. Thanks for not treating it like a joke, even when I do. Anyway. Tacos.'])
    ]
  };
  // When each letter becomes due. `chain` is the network's agent chain from faction-content.js.
  function due(i,{rep,flags,chain,completed}){
    if(i===0)return rep>=15;
    if(i===1)return !!flags[chain.steps[1].flag+'Done'];
    const cap=chain.steps[2].flag;return !!flags[cap+'Done']&&completed>=(Number(flags[cap+'CompletedAt'])||0)+3
  }
  globalThis.AgentXFactionLore={LETTERS,due};
})();
