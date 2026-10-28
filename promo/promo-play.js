'use strict';
// Live playback: ?promo&play (add &from=94.5 to start at a song time). Plays the song and runs
// the director in real time, stepping its fixed frame clock to keep up with the music. On a
// slow computer frames are skipped, never the music, so the singing stays in sync.
// Space pauses and resumes. Reload the page to watch again.
(()=>{
const D=globalThis.PromoDirector;if(!D||!Promo.Q.has('play'))return;
const css=document.createElement('style');
css.textContent=`#fullscreenGate,#optionsModal,#aboutModal,#campaignShell,#cheats,#stage>:not(canvas){display:none!important}
#promoStart{position:fixed;inset:0;margin:auto;width:min(560px,80vw);height:120px;z-index:50;background:#000;color:#0f0;border:1px solid #0f0;
font:400 clamp(18px,2.4vw,28px) Consolas,monospace;letter-spacing:.08em;cursor:pointer}
#promoStart:hover{color:#ff0;border-color:#ff0}#promoStart small{display:block;margin-top:10px;font-size:.5em;color:#fff;letter-spacing:.04em}`;
document.head.appendChild(css);
// Loaded whole into memory, so it can start part way in on any server (seeking a streamed file
// needs range requests, which simple local servers don't give).
const song=Promo.song=new Audio();
const songReady=fetch('promo/xmasWords.mp3').then(r=>r.blob()).then(b=>{song.src=URL.createObjectURL(b);return new Promise(r=>song.readyState>=1?r():song.addEventListener('loadedmetadata',r,{once:true}))});
const button=document.createElement('button');button.id='promoStart';
button.innerHTML='PLAY THE CHRISTMAS PROMO<small>Space pauses · Esc leaves full screen</small>';
document.body.appendChild(button);
button.addEventListener('click',async()=>{
  button.remove();
  try{await document.documentElement.requestFullscreen()}catch(_){}
  D.takeControl();
  const from=Math.max(0,+Promo.Q.get('from')||0);
  D.seek(from);
  await songReady;
  song.currentTime=from;
  try{await song.play()}catch(err){console.error('promo song would not play',err)}
  const DT=1/D.FPS;
  const tick=()=>{
    fullscreenGate.classList.add('hidden');
    // Run the frames the music has moved past; draw only the last one.
    const k=Math.floor((song.currentTime-D.clock)/DT+1e-6);
    for(let i=0;i<k;i++)D.step(i===k-1);
    if(!song.ended)D.realRAF(tick)
  };
  D.realRAF(tick)
});
addEventListener('keydown',e=>{if(e.code!=='Space'||button.isConnected)return;
  e.preventDefault();e.stopImmediatePropagation();if(song.paused)song.play();else song.pause()},true);
})();
