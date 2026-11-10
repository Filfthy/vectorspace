'use strict';

// SELF-TEST (v1750) — open the game with ?selftest
//
// Boots on a throwaway save (never the real campaign: campaign.js switches its storage key
// when ?selftest is present and clears it first), then, with the drone invulnerable and
// the sound off in memory only:
//
//   boot        five fresh boots in a row, each with a board (a start-up fault can depend
//               on what the first board rolls)
//   boards      300 contract boards at operator levels 1, 5, 10 and 16
//   templates   every board template launched and stepped through every stage, drawn
//   stories     every story, agent and epilogue mission
//   black       every Black Contract set piece
//   diversions  every route diversion kind
//   simulator   the VOX simulator
//   drawing     every ghost, xeno and walker, and every world type's plains, drawn directly
//   data        achievements, codex, wire and contact letters evaluate. No semicolons or
//               dashes in written content
//
// A report is drawn over the page and kept in window.__selftest. Loads only with
// ?selftest, otherwise nothing.
(function(){
  const errs=[];window.addEventListener('error',e=>errs.push(`${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`));
  const results=[],T0=performance.now();
  const box=document.createElement('div');
  box.style.cssText='position:fixed;left:12px;top:12px;right:12px;max-height:92vh;overflow:auto;z-index:99999;background:#000;border:1px solid #0f0;color:#0f0;font:13px/1.45 Consolas,monospace;padding:12px 14px;white-space:pre-wrap';
  const paint=(note='')=>{box.textContent='VECTOR SPACE SELF-TEST'+(note?'  ·  '+note:'')+'\n\n'+results.map(r=>`${r.ok?'PASS':'FAIL'}  ${r.name.padEnd(11)} ${r.summary}${r.details.length?'\n'+r.details.map(d=>'        '+d).join('\n'):''}`).join('\n')};
  const pause=()=>new Promise(r=>setTimeout(r,0));
  const reset=()=>{routeDiversion.reset();salvageRecovery?.reset?.();fighters.length=0;campaign.currentMission=null;campaign.pendingMission=null;mode='play';phase='space';paused=false;document.body.classList.remove('paused');if(campaign.isOpen())campaign.hideHub();invulnerable=true};
  const ended=()=>!campaign.currentMission||['missionExit','surfaceExit','victory'].includes(mode);
  // Step a launched mission through every stage, drawing a frame in each.
  const fly=(stages=40,frames=45)=>{
    for(let i=0;i<stages&&campaign.currentMission&&!['missionExit','surfaceExit'].includes(mode);i++){
      const idx=campaign.currentStageIndex;
      for(let k=0;k<frames&&campaign.currentMission&&campaign.currentStageIndex===idx;k++)update(1/30);
      render(performance.now());
      if(campaign.currentMission&&campaign.currentStageIndex===idx)scenarioFlow.completeCurrentStage?.();
      for(let k=0;k<5;k++)update(1/30)
    }
  };
  async function group(name,items,run){
    const details=[];let n=0;
    for(const it of items){
      const e0=errs.length;let fail=null;
      try{reset();fail=run(it)||null}catch(e){fail='threw: '+e.message}
      if(errs.length>e0)fail=(fail?fail+' · ':'')+errs.slice(e0).join(' · ');
      if(fail)details.push(`${typeof it==='string'?it:(it.label||it.id||it)}: ${fail}`);
      n++;if(n%3===0){paint(`${name} ${n}/${items.length}`);await pause()}
    }
    results.push({name,ok:!details.length,summary:`${items.length-details.length}/${items.length}`,details});paint();await pause()
  }
  async function main(){
    document.body.appendChild(box);paint('starting');
    Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>document.documentElement});document.dispatchEvent(new Event('fullscreenchange'));
    // Sound off for the run, in memory only: the player's mixer settings are not saved over.
    try{AudioMixer.save=()=>{};AudioMixer.setEnabled('master',false)}catch(_){}
    await new Promise(r=>setTimeout(r,600));
    const c=campaign;
    results.push({name:'boot',ok:!!(c&&c.state&&Array.isArray(c.missions)&&c.missions.length&&c.storageKey!=='agentXCampaignV1'),summary:`${BOOTS} fresh boots, ${c?.missions?.length||0} contracts each, key ${c?.storageKey}`,details:errs.splice(0)});paint();
    if(c.storageKey==='agentXCampaignV1'){results.push({name:'abort',ok:false,summary:'refusing to run on the real save',details:[]});paint();return}

    await group('boards',[1,5,10,16],lvl=>{c.state.xp=c.xpForLevel(lvl);for(let i=0;i<75;i++){c.generateContractBoard();for(const m of c.missions)if(!m.modules?.length||!m.title||!(m.xp>0))return `bad contract at level ${lvl}: ${m.templateId}`}});
    c.state.xp=c.xpForLevel(8);

    const T=AgentXMissionData.templates;
    await group('templates',Object.keys(T),id=>{c.launchDevTemplateTest(id,(T[id].allowedFactions||['trade'])[0]);if(!c.currentMission)return 'did not launch';invulnerable=true;fly();if(!ended())return `stuck in ${mode}/${phase} at ${c.currentStage?.()?.type}`});

    await group('stories',AgentXStoryContent.devMailOptions().map(o=>o.contractId),id=>{const m=c.storyContract(id);if(!m)return 'no contract';m.id=m.id||id;m.implemented=true;m.devTemplateTest=true;c.pendingMission=m;c.launchMission(m.id);if(!c.currentMission)return 'did not launch';invulnerable=true;fly(30,120);for(let f=0;f<400&&c.currentMission&&!ended();f++)update(1/30);if(!ended())return `stuck in ${mode}/${phase}`});

    await group('black',AgentXEndgame.MISSIONS.map((d,i)=>({id:d.id,t:i+1})),it=>{const m=AgentXEndgame.blackContract(it.t);m.devTemplateTest=true;c.pendingMission=m;c.launchMission(m.id);if(!c.currentMission)return 'did not launch';invulnerable=true;
      for(let s=0;s<30&&c.currentMission&&!ended();s++){const idx=c.currentStageIndex;for(let f=0;f<150&&c.currentMission&&c.currentStageIndex===idx;f++){update(1/30);if(f%30===0){render(performance.now());for(const x of fighters)if(x.ghost&&!x.dead&&!x.dying&&x.g?.state==='formed'&&x.t>=0){queueObjectDestruction(x,proj([x.x,x.y,x.z]));break}}}if(c.currentMission&&c.currentStageIndex===idx)scenarioFlow.completeCurrentStage?.()}
      if(!ended())return `stuck in ${mode}/${phase}`});

    await group('diversions',Object.keys(routeDiversion.KINDS),kind=>{const m=c.makeDevTemplatePreview('asteroid_delivery','security');m.routeEncounter=null;m.modules=m.modules.filter(x=>x.type!=='route_diversion'&&!x.routeEncounter);m.modules.splice(0,0,{type:'route_diversion',label:'Route Diversion',diversion:kind,difficulty:2,spaceCombat:false,fighterHp:12});m.stages=m.modules.map(x=>x.label);
      c.launchDevTemplateTest('asteroid_delivery','security',{mission:m});invulnerable=true;for(let i=0;i<600&&!routeDiversion.active;i++)update(1/30);if(!routeDiversion.active)return 'never started';
      for(let i=0;i<30*90&&routeDiversion.active;i++){update(1/30);if(i%60===0)render(performance.now())}
      if(routeDiversion.active)return `still running after 90 s in state ${routeDiversion.state}`});

    await group('simulator',['tutorial'],()=>{const m=c.tutorialMission();c.pendingMission=m;c.launchMission(m.id);if(!c.currentMission)return 'did not launch';invulnerable=true;const seen=new Set();
      for(let s=0;s<30&&c.currentMission;s++){const idx=c.currentStageIndex;seen.add(c.currentStage?.()?.type);for(let f=0;f<150&&c.currentMission&&c.currentStageIndex===idx;f++){update(1/30);if(f%50===0)render(performance.now())}if(c.currentMission&&c.currentStageIndex===idx)scenarioFlow.completeCurrentStage?.()}
      if(!seen.has('tutorial_final_run'))return 'never reached the final run'});

    // Draw every enemy and every world directly: the stepped missions above only draw what
    // happens to be in front of the camera.
    await group('drawing',['ghost lance','ghost jammer','xenos','walkers','plains worlds','moon plains'],what=>{
      if(what.startsWith('ghost')){
        const m=c.makeDevTemplatePreview('fighters','security'),fm=m.modules.find(x=>x.type==='fighters');fm.profile='ghost';fm.target=6;
        c.launchDevTemplateTest('fighters','security',{mission:m});invulnerable=true;for(let i=0;i<200&&!fighters.length;i++)update(1/30);for(let i=0;i<40;i++)update(1/30);
        const f=fighters.find(x=>x.ghost===(what==='ghost lance'?'lance':'jammer'));if(!f)return 'none spawned';
        const w=cameraPointToWorld([0,0,20]);f.x=w[0];f.y=w[1];f.z=w[2];f.t=Math.max(0,f.t);
        for(const st of['scattered','gathering','formed']){f.g.state=st;f.g.t=.4;f.g.dur=1;if(st==='gathering')for(const fr of f.g.frags)fr.from=fr.off.slice();AgentXGhosts.draw(f);AgentXGhosts.step(f,1/30)}
        AgentXGhosts.scatter(f);AgentXGhosts.step(f,1/30);AgentXGhosts.draw(f);AgentXGhosts.drawOverlay();render(performance.now())
      }
      if(what==='xenos'){
        c.launchDevTemplateTest('fighters','security');invulnerable=true;for(let i=0;i<60;i++)update(1/30);
        const w=cameraPointToWorld([0,0,18]);
        for(const k of Object.keys(AgentXSpaceBugs.meshes)){const mesh=AgentXSpaceBugs.meshes[k];drawAgentXSpaceBug({x:w[0],y:w[1],z:w[2],s:1.6,rot:[0,.4,0],mesh,bugKind:k,bugAnimPhase:1},C.y)}
      }
      if(what==='walkers'){
        c.launchDevTemplateTest('dune_armour_clearance','security');invulnerable=true;
        for(let i=0;i<30&&!(c.currentStage?.()?.type==='dune_assault'&&phase==='surface');i++){scenarioFlow.completeCurrentStage?.();for(let k=0;k<40;k++)update(1/30)}
        if(!groundAssault.active)return 'the dune assault never started';for(let k=0;k<60;k++)update(1/30);
        const kinds=new Set();for(const u of groundAssault.units){if(u.dead)continue;groundAssault.drawUnit(u);kinds.add(u.kind)}
        if(kinds.size<4)return `only ${kinds.size} kinds of unit present`;render(performance.now())
      }
      if(what==='plains worlds'||what==='moon plains'){
        c.launchDevTemplateTest('groundside_pickup','trade');invulnerable=true;
        for(let i=0;i<30&&!(c.currentStage?.()?.type==='surface_destination_approach'&&surfaceDestination.active);i++){scenarioFlow.completeCurrentStage?.();for(let k=0;k<40;k++)update(1/30)}
        const sd=surfaceDestination;if(!sd.active)return 'the plains approach never started';const mission=c.currentMission,kinds=[];
        const moon=what==='moon plains';if(moon){planetLandingBody='moon';planetLandingMoonIndex=0;if(!planetMoons?.length)planetMoons=[{col:C.g,radiusFactor:.2,axisOffset:0,spin0:0,spinSpeed:.05,craters:[]}]}
        for(const[col,volc]of[[C.g,false],[C.u,false],[C.c,false],[C.m,false],[C.y,false],[C.o,false],[C.o,true]]){
          if(moon)planetMoons[0].col=col;else planetLandingColour=col;mission.volcanicWorld=volc;
          sd.buildScenery();sd.buildFissures();sd.buildTraffic();sd.buildFlocks();sd.forceWeather=true;for(let i=0;i<8&&!sd.weather;i++)sd.chooseWeather();
          for(let k=0;k<6;k++)update(1/30);sd.draw();kinds.push(sd.worldKind);
          // every feature with an effect is drawn once, wherever it stands
          for(const t of sd.trees){const z=t.worldZ-travel;if(t.smoke)sd.drawConeSmoke(t,z);if(t.vent)sd.drawVentFountain(t,z);if(t.geyser)sd.drawGeyser(t,z);if(t.feature==='crystal')sd.drawGlint(t,z,50)}
          sd.drawFissures();sd.drawFlocks();sd.drawRoad();sd.drawWeather()
        }
        if(new Set(kinds).size<6)return `only ${new Set(kinds).size} world kinds built (${[...new Set(kinds)].join(', ')})`;
        if(moon&&!sd.trees.some(t=>t.feature==='crater'))return 'no craters on a moon';
        planetLandingBody='planet'
      }
    });

    await group('data',['achievements','codex','wire','letters','written text'],what=>{
      const st=c.stats(),ctx={flags:c.state.mailFlags||{},seen:c.state.seenProfiles||{},stats:st,byFaction:st.contracts?.byFaction||{},bt:st.contracts?.byTemplate||{},state:c.state,level:c.levelForXP()};
      if(what==='achievements'){const d=c.achievementDefs();if(d.some(a=>!a.id||!a.name||typeof a.goal!=='number'||Number.isNaN(Number(a.v))))return 'a malformed achievement';if(new Set(d.map(a=>a.id)).size!==d.length)return 'duplicate achievement id'}
      if(what==='codex')for(const e of AgentXCodex.ENTRIES)e.unlocked(ctx);
      if(what==='wire')for(const h of AgentXVoxWire.HEADLINES)if(h.when)h.when(ctx);
      if(what==='letters'){for(const r of AgentXFactionLore.REACTIONS||[])r.when(ctx);for(const f of Object.values(AgentXFactionLore.LETTERS))for(const l of f)if(!l.subject||!l.body?.length)return 'a letter with no text'}
      if(what==='written text'){
        const bad=[],walk=(v,path)=>{if(typeof v==='string'){if(v.length>24&&/[a-z];\s+[a-zA-Z]|[—–]/.test(v)&&!/[{}=<>]/.test(v))bad.push(`${path}: "${v.slice(0,60)}"`)}else if(Array.isArray(v))v.forEach((x,i)=>walk(x,path))
          else if(v&&typeof v==='object')for(const k in v)if(typeof v[k]!=='function')walk(v[k],path)};
        for(const id in T)walk(T[id].presentation,`template ${id}`);
        walk(AgentXCodex.ENTRIES.map(e=>[e.title,e.body]),'codex');walk(AgentXVoxWire.HEADLINES.map(h=>h.text),'wire');walk(AgentXFactionLore.LETTERS,'letters');walk((AgentXFactionLore.REACTIONS||[]).map(r=>r.letter),'reactions');
        walk(Object.values(routeDiversion.KINDS),'diversions');walk(AgentXEndgame.MISSIONS.map(m=>[m.title,m.description,m.stages]),'black contracts');
        if(bad.length)return bad.slice(0,6).join(' | ')+(bad.length>6?` (+${bad.length-6} more)`:'')}
    });

    reset();const ok=results.every(r=>r.ok),secs=((performance.now()-T0)/1000).toFixed(0);
    results.push({name:'TOTAL',ok,summary:`${ok?'ALL PASSED':'FAILURES ABOVE'} in ${secs} s. The real campaign save was not touched.`,details:[]});paint('finished');
    try{localStorage.removeItem(c.storageKey)}catch(_){}
    window.__selftest={ok,results,seconds:Number(secs)}
  }
  // Rerun from the console with __selftestRun() (the report starts again).
  window.__selftestRun=()=>{results.length=0;errs.length=0;window.__selftest=null;return main()};
  // Fresh boots first. A start-up fault can depend on what the first contract board rolls
  // (v1610's crash showed on about six boots in ten), so the page boots a fresh save five
  // times before the main run. A dead boot is reported at once.
  const BOOTS=5;
  window.addEventListener('load',()=>setTimeout(()=>{
    let alive=false,why='';try{alive=!!(campaign&&campaign.state&&campaign.missions.length)}catch(e){why=e.message}
    const n=Number(sessionStorage.getItem('selftestBoots')||0)+1;
    if(!alive){sessionStorage.removeItem('selftestBoots');document.body.appendChild(box);
      results.push({name:'boot',ok:false,summary:`the game failed to start on a fresh save (boot ${n} of ${BOOTS})`,details:[why,...errs].filter(Boolean)});paint('failed');window.__selftest={ok:false,results};return}
    if(n<BOOTS){sessionStorage.setItem('selftestBoots',String(n));document.body.appendChild(box);paint(`fresh boot ${n} of ${BOOTS} ok`);setTimeout(()=>location.reload(),150);return}
    sessionStorage.removeItem('selftestBoots');
    main().catch(e=>{results.push({name:'CRASH',ok:false,summary:e.message,details:[String(e.stack||'').split(String.fromCharCode(10))[1]||'']});paint('crashed');window.__selftest={ok:false,results}})
  },900));
})();
