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
  // v780: Mara Venn (VOX) writes at three story beats, one or two contracts after each
  // so her letter never lands on top of the story mail. Character only: the antagonist
  // stays unnamed and nothing here moves the plot (POSSIBLE GAME DIRECTION.txt).
  const MARA={from:'Mara Venn · Contractor Services, VOX',letters:[
    {after:'mara1',gap:1,...L('Why I called you',[
      'X. A short one, because you will want to know and nobody else at VOX will tell you.',
      'When the courier went down I had a list of forty contractors who could have taken the recovery. You were the only one who read the brief and did not ask for more money first.',
      'Private work from me will always feel different from the board. Fewer people know about it. Keep it that way.'])},
    {after:'cassian1',gap:1,...L("About Cassian's favour",[
      'I sent you to Cassian, so what he asked of you is partly on me.',
      'You shot Customs drones to deliver a case nobody was allowed to open. He will tell you that was nothing. It was not nothing, and I do not want you thinking I think it was.',
      'We needed what he knew. I would make the same call again. I just wanted you to hear me say it.'])},
    {after:'kudo3',gap:2,...L('After the factory',[
      'X. The factory is gone and the reports are filed. VOX is calling it a successful outcome, which is the phrase VOX uses for everything.',
      'I keep thinking about how long those machines waited out there, and how easy it was for somebody to wake them up. There will be other factories, and other people who go looking for them.',
      'When they do, I would like it to be you I call. That is not a contract. It is just true.'])}
  ]};
  // v840: when standing with a network falls to Hostile (below -55), its contact writes
  // once, naming the enforcers that will now hunt X on other networks' routes. When it
  // is repaired to Neutral (-20 or better), they write once more.
  const STANDING={
    security:{hostile:L('You are flagged',['X. The Directorate has flagged you. Our interdiction units will treat you as a hostile contact on any route they patrol.','You did this to yourself. Directorate work is how you undo it. Nothing else counts.']),
      repaired:L('Flag lifted',['The flag on your file has been lifted. Do not make me put it back.'])},
    trade:{hostile:L('I am not talking to you',['Sweetie, I am very upset with you. So upset that I told the Compact hired guns exactly where you like to fly.','If you want me to stop being upset, babe, you know what to do. Do my jobs. Do them well. Maybe bring me something shiny.']),
      repaired:L('Fine, I forgive you',['Babe. I have decided to forgive you, mostly because you have been very good lately and partly because I missed you.','I have called the hired guns off. Do not make me call them back.'])},
    jackals:{hostile:L('A regrettable change of status',['X. Our arrangement has become uncomfortable. Certain associates of mine now consider you an inconvenience.','Inconveniences tend to meet people on quiet routes. I would take the busy ones for a while. Or do some work for us, and we can all forget this.']),
      repaired:L('Water under the bridge',['I am pleased to report that you are no longer an inconvenience. My associates have been informed. They were disappointed, but they are professionals.'])},
    helix:{hostile:L('Helix has restricted your access',['X. Helix security has classified you as a hostile operator. I was not consulted, and I would not have agreed.','Their security drones will intercept you on routes near Helix work. Helix contracts are the only thing that will change the classification. I would like that very much.']),
      repaired:L('Classification revised',['Helix security has revised your classification. I argued for it, which I am told is unusual for me. Welcome back.'])},
    quickbite:{hostile:L('Dude. What did you do',['Dude. Corporate flagged your account. Like, repo drones flagged. I did not even know we had repo drones.','If you do some QuickBite jobs they will probably unflag you. Probably. Corporate is weird.']),
      repaired:L('You are unflagged',['Good news, you are unflagged. Corporate says sorry. Corporate does not actually say sorry. I am saying it for them.'])}
  };
  globalThis.AgentXFactionLore={LETTERS,due,MARA,STANDING};
})();
