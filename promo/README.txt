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


VECTOR SPACE TEASER
===================

A 3:19 teaser to "Stampede Across the Stars", new techno space rock from the
Oh Hell music (D:\CodeGen\Oh Hell\renders\stampede.wav). One unbroken run
across one world, no cuts: it opens on the ground and the camera flies herd to herd
along a single route, and the ground's colour and roll change gradually from
herd to herd. Most herds have one landmark standing far off the route. The
drone is only a camera here: no guns on screen. The sky has one flock of
birds for each place, two fighter passes, a freighter
crossing above the llamas and fireworks over the elephants, each shell bursting
on a snare. Each herd has its own camera style (close, wide, high).

  0:00  orange horses gallop past the camera, which turns and chases them
        (no title text)
  0:14  horses (Stonehenge far off)
  0:35  kangaroos (Uluru)
  0:56  camels (the stepped pyramids)
  1:18  magenta elephants (the Taj Mahal), with brass and timpani
  1:39  giraffes and zebras (Kilimanjaro, standing on the ground, its top snow)
  2:00  llamas (Machu Picchu)
  2:21  bison (Monument Valley)
  2:43  penguins among distant icebergs, under an aurora
  2:57  the camera tilts up to a wide aurora and holds there; a shooting
        star crosses it as the picture fades out

Open it with ?promo=teaser instead of ?promo. Everything else works the same:
  ?promo=teaser&play          live with the music (&from=56.8 starts at the camels)
  ?promo=teaser&dpr=1.5       for rendering: PromoDirector.renderRange('teaser',0,198.6)
  bash promo/make-video.sh promo/out/teaser "D:/CodeGen/Oh Hell/renders/stampede.wav" promo/out/vector-space-teaser.mp4
  The 720p copy for sharing:
  ffmpeg -i promo/out/vector-space-teaser.mp4 -vf scale=1280:720 -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart promo/out/vector-space-teaser-720p.mp4
  The videos stay out of git (promo/out is ignored): 400 MB at 1080p, 78 MB at 720p.

Files
  teaser-song.js     the song's sections (136 bpm, the render starts 0.3 s in)
  teaser-models.js   horse, zebra, camel, elephant, giraffe, llama and bison
                     (ground-armour walkers on the game's gaits), the kangaroo
                     and penguin (posed meshes) and the landmarks
  teaser-scenes.js   the run: the herds' order and timing, the route, the
                     camera keys and the flights between herds, rocks, the
                     ground's zones and the aurora ending.
                     TeaserScenes.studio({kind:'camel'}) films one animal alone.
  stampede.mp3       the song



VECTOR SPACE ACTION MONTAGE
===========================

A 2:16 release montage cut to Verdi's Dies irae (the game's own track,
music/violent/diesirae.ogg). Action only, no title cards, with the game's
HUD on: it is the game being played. Every shot is a real job launched in
the game, taken to the right stage and flown a few seconds by a pilot
before the cut, then staged so the action fills the frame (fighters 20 to
50 units ahead, walkers about 32 away, rocks close, stations off to one side).

  0:00-1:19  the tutti: one shot per bass drum stroke, then quick cuts:
             dogfights (Jackal's Crown, Ripper, pirates, xenos, hijacked
             drones, ghosts, rogues), dune and ice armour, deep core
             pylons, the swamp corridor, Taco Beacon pirates, a crystal
             world, a convoy escort, Drifters Rest and Tanktown under
             attack, customs rings, the factory assault, a cargo spill
  1:19-2:16  the hush: longer shots: the Crossroads minefield, the xeno
             nest, the lattice survey, the swamp plains, a wreck in the
             asteroids, Meridian Farm, a last walker on the dunes, fade out

Open it with ?promo=montage:
  ?promo=montage&play          live with the music (&from=79.6 starts at the hush)
  ?promo=montage&dpr=1.5       for rendering: PromoDirector.renderRange('montage',1.62,136.3)
  bash promo/make-video.sh promo/out/montage music/violent/diesirae.ogg promo/out/vector-space-montage.mp4 1.62
  (the track opens with 1.6 s of silence: the video starts on the first drum stroke)

Files
  montage-song.js     the track and its two sections
  montage-scenes.js   the shot list (cut times), the staging and the pilots

The music is a 1959 recording (Serafin, Rome Opera). It is public domain in
Europe but may still be protected in the US, so a video platform may claim
or mute it.
