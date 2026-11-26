// The montage's music: Verdi, Messa da Requiem, Dies irae (the game's own violent track,
// music/violent/diesirae.ogg, 2:16). Loud to 1:19 with the bass drum strokes, then the hushed
// "Quantus tremor" to the end. The file opens with 1.6 s of silence: the title goes there,
// "Vector Space" on black with Sonia saying it (voice, at 0.4 s), and the first drum stroke
// (first, 1.62 s) cuts straight into the action. A one-second lead-in before the track
// (start -1) opens on the game's destruction static with its crackle and blip, clearing to
// the title. Frame files are numbered from the lead-in (frameOffset 30). After the last note (end) the video holds
// on empty space with "Coming soon" until videoEnd. The shot list and its cut times are in montage-scenes.js.
(()=>{
  window.PROMO_SONG={title:'Dies irae',montage:true,start:-1,frameOffset:30,first:1.62,voice:{src:'promo/vectorspace-title.mp3',at:.4},mp3:'music/violent/diesirae.ogg',button:'PLAY THE VECTOR SPACE TRAILER',
    end:136.3,videoEnd:141.3,length:136.3,sections:[{name:'tutti',t:0},{name:'hush',t:79.6}],words:[]};
})();
