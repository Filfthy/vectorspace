// The teaser's music: "Stampede Across the Stars" (Oh Hell music, renders/stampede.mp3).
// 136 bpm, 4/4, 108 bars; the render starts 0.3 s in. One twelve-bar stop per world.
(()=>{
  const bpm=136,beat=60/bpm,bar=4*beat,start=0.3,t=b=>+(start+b*bar).toFixed(4);
  const S=[['intro',0],['england',8],['australia',20],['egypt',32],['india',44],['kenya',56],['peru',68],['usa',80],['antarctica',92],['lift-off',100]];
  window.PROMO_SONG={title:'Stampede Across the Stars',teaser:true,mp3:'promo/stampede.mp3',button:'PLAY THE VECTOR SPACE TEASER',
    bpm,beat,bar,start,bars:108,end:t(108),length:198.6,sections:S.map(([name,b])=>({name,bar:b,t:t(b)})),words:[]};
})();
