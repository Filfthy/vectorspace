# Vector Space — Agent X

A vector-graphics drone combat and contract game. You are Agent X, a remote drone operator working for VOX and five client networks: deliveries, clearances, recoveries, infiltrations and assaults, across space, stations, asteroids and planet surfaces.

Plain JavaScript and Canvas 2D with a WebGL glow pass. No build step and no dependencies.

## For playtesters

1. On GitHub press **Code**, then **Download ZIP**, and unzip it anywhere.
2. Double-click **index.html** to play normally, or **Play with cheats.html** to play with the **DEV** tab. The DEV tab has an invulnerability and one-shot cheat, level, credit and standing controls, a mission launcher and a self-test.
3. The game asks for full screen before it starts. Use Chrome or Edge.

If double-clicking does not work in your browser, run the local server below and open http://localhost:8798 (or http://localhost:8798/Play%20with%20cheats.html).

## Running it

Serve the folder from a local web server and open it there. That is how the game is tested.

```
python -m http.server 8798
```

Then go to <http://localhost:8798/>. The game asks for fullscreen before it starts.

To check a change, open <http://localhost:8798/?selftest>. It boots a throwaway save five times, steps every board job, story mission, Black Contract, diversion and the simulator, draws every enemy and world type, checks the written text, and prints a pass or fail report (`selftest.js`). Your campaign is not touched. On that page the console also has a balance bot: `await __balance()` plays eight fights against each enemy type with a simple pilot that takes real damage, and prints how long each took and how many hits it cost. The self-test also has pilots that fly the survey land jobs and the Lattice Survey by steering alone, with nothing skipped, to prove they can be finished (`__pilots` in the console). `__flyJob('station_defence')` plays one whole board job the way a player would (it shoots what is in front of it and otherwise steers at the HUD's objective marker), and `await __flyAll()` does every job. `__flyStory(contractId)` and `__flyBlack(threat)` do the same for a story mission or a Black Contract. It takes about fifteen minutes and should finish every job with no stage marked STUCK. Options: `{risk:9}` picks a contract of that risk, `{mortal:true}` lets the drone be hurt and lost and reports the shield it cost, `{weapon,frame,level}` set the kit. Run it at a 1280 wide window: aiming is easier on a small one.

Progress is saved in the browser and belongs to that address only. Use **Settings > Campaign > Save to file** to back a campaign up or move it to another browser or address.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Aim and steer |
| Left mouse or Space | Fire |
| Hold right mouse | Lock on, then fire a missile |
| Middle mouse or 1 to 4 | Use consumable slots |
| Hold Q | Abandon the mission (the drone is saved, the job is failed) |
| P | Next music track |
| [ and ] | Smaller or larger text in the terminal |

New players should start with the VOX simulator in the first mail. The **?** tab in the terminal is the in-game guide.

## Files

- `index.html` plus the `*.js` files: the game. Missions are data: board templates live in `mission-templates.js`, story missions in `story-content.js`, faction agent missions in `faction-content.js`, late-game work in `endgame-content.js` and route events in `encounter-content.js`. Contact letters live in `faction-lore.js`, contract notes from the contacts in `contact-notes.js`, VOX Wire news headlines in `vox-wire.js` and the Guide codex in `codex.js`. World-type scenery (ice, crystal, arid, volcanic, wetland, and craters on moons), the parent planet or moons in the sky, survey markers, crash-site recoveries, distress beacons, plains weather and world chatter all live in `environment-surface.js` (the plains approach). Optional route diversions (beacons, derelicts, pods, caches, pursued civilians, fights in progress, old minefields, xeno migrations, dormant ghost lattices) are in `route-diversion.js`. The hijacked drone, named ace, shield tender and ghost construct behaviours are in `hijacked-drones.js`, `aces.js`, `tenders.js` and `ghosts.js`, the xeno models (hornet, larva, drifter) in `xeno-models.js`, passing convoy lights in `space-ambience.js`, and the ground armour (walkers and tanks) in `system-ground-assault.js`.
- `cargo-spill.js`: the Cargo Spill, the Free Traders' own board job. Fly through drifting cargo pods to scoop them while pirate scavengers try to take them (v2080). Driven by `route-diversion.js` as the `spill` kind.
- `customs-run.js`: the Customs Run, the Jackals' own board job. Scanner rings with turning arms, crossed in the dark gaps; scanned runs end with Customs interceptors (v2040). Driven by `route-diversion.js` as the `customs` kind.
- `minelayers.js`: the minelayer, an orange raider in some pirate and mercenary fights that seeds proximity mines (v1950).
- `asteroid-ambush.js`: the hidden ambush that can hit a board asteroid clearance partway through (v1870).
- `voices/`: spoken callouts. `VOICE_REQUESTS.txt` lists lines still to record, with their expected filenames. Drop a matching mp3 in and it plays.
- `music/` and `music credits.txt`: soundtrack and its sources.
- Design notes: `POSSIBLE GAME DIRECTION.txt`, `AGENT_X_WORLD_LORE.txt`, `AGENT_X_MISSION_AND_CONTACT_STYLE_GUIDE.txt`, `AGENT_X_MODEL_AND_ASSET_GUIDE.txt`, `MISSION_TEMPLATE_FORMAT.txt`, `MISSION_PRESENTATION_PACKS.txt`, `FACTIONS_AND_BEYOND_PROPOSAL.txt`.
- `CHANGES_WHILE_AWAY.txt`: plain-English log of recent changes.

Music credits are in `music credits.txt` and in the game's About box.

© 2026 BugVictim
