VECTOR SPACE CHRISTMAS PROMO
============================

A 3:12 music video made in the game itself, to "God Rest Ye Merry Starmen
(In Her Own Words)" from the Oh Hell music (D:\CodeGen\Oh Hell\renders\xmasWords.wav).

  0:00  Titles over a green world, the descent, snowy plains
  0:44  Into the snowy forest as the strings come in
  1:13  The cabin glade: a decorated tree outside, a present on the deck, lift-off
  1:35  Guitar solo: a rocky world and a team of reindeer mechs at the gallop
  2:04  The breakdown: in a drifting green and yellow asteroid field a hornet
        xeno sings the aria, her band behind her (two guitars and drums)
  2:18  Last verse, the key change; six more hornets fly in and join her
  3:00  The choir and the end titles

Nothing here changes the game. index.html only loads these files when the
address has ?promo in it.

To watch it live in the game (no rendering)
  Open the game with ?promo&play on the end of the address, e.g.
  http://127.0.0.1:8798/?promo&play (or the GitHub Pages copy once it is on),
  press the PLAY button, and it runs full screen with the song.
  Space pauses. Add &from=94.5 to start at a song time (94.5 is the solo).
  It keeps time with the music, so a slower computer skips frames rather
  than drifting. For the smoothest picture use a 1920x1080 screen.

Files
  promo-play.js       live playback with the song (?promo&play)
  xmasWords.mp3       the song, copied from the Oh Hell renders
  promo.js            frame capture, and the model viewer (?promo&view=...)
  promo-models.js     the present, the Christmas tree, the snowman, the reindeer mech,
                      the hornet xenos (singers, guitarists, drummer) and the drum kit
  promo-director.js   fixed frame clock, the song-to-game time map, snow, titles
  promo-scenes.js     the three scenes: what is launched, how it is flown, the singers
  song-timing.js      every sung syllable's time (generated, do not edit)
  make-song-timing.js rebuilds song-timing.js from D:\CodeGen\Oh Hell\oh-music.js
  capture-server.py   serves the game and saves posted frames into promo\out\
  make-video.sh       joins the frames and the song into the MP4

To render it again
  1. Start the server:   python promo/capture-server.py 8800
     (or the "vectorspace-promo" preview in the Claude app)
  2. Open http://127.0.0.1:8800/?promo&dpr=1.5 in a 1280x720 window
     (1280x720 at 1.5x gives the 1920x1080 frames)
  3. In the browser console:   PromoDirector.renderRange('frames',0,192.062)
     It saves promo\out\frames\f00000.jpg ... (30 fps, about 15 minutes).
     One part can be redone, e.g. the reindeer:  renderRange('frames',94.55,123.64)
  4. bash promo/make-video.sh   ->   promo\out\vector-space-christmas.mp4

Model stills: ?promo&view=present (or tree, reindeer, xeno, guitarist, drummer), then
Promo.viewFrame(t,yaw) and Promo.save('stills','name.jpg').

If the music changes, run make-song-timing.js again. The scene cues
(forest at the riff, lift-off ending on the solo, and so on) follow the song's
section times, so they move with it.
