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
    chains.push({faction:def.faction,arcName:def.arcName,reward:def.reward,steps})
  }

  // ---- chains are authored below ----

  globalThis.AgentXFactionContent={
    chains,
    step(id){for(const c of chains)for(const s of c.steps)if(s.id===id)return s;return null},
    capstoneDone(campaign,faction){const c=chains.find(x=>x.faction===faction);return !!c&&!!campaign?.state?.mailFlags?.[c.steps[2].flag+'Done']}
  };
})();
