# Vector Space — Agent X

A vector-graphics drone combat and contract game. You are Agent X, a remote drone operator working for VOX and five client networks: deliveries, clearances, recoveries, infiltrations and assaults, across space, stations, asteroids and planet surfaces.

Plain JavaScript and Canvas 2D with a WebGL glow pass. No build step and no dependencies.

## Running it

Serve the folder from a local web server and open it there. That is how the game is tested.

```
python -m http.server 8798
```

Then go to <http://localhost:8798/>. The game asks for fullscreen before it starts.

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

- `index.html` plus the `*.js` files: the game. Missions are data: board templates live in `mission-templates.js`, story missions in `story-content.js`, faction agent missions in `faction-content.js`, late-game work in `endgame-content.js` and route events in `encounter-content.js`. Contact letters live in `faction-lore.js`, contract notes from the contacts in `contact-notes.js`, VOX Wire news headlines in `vox-wire.js` and the Guide codex in `codex.js`. World-type scenery (ice, crystal, arid, wetland), the parent planet or moons in the sky, survey markers, distress beacons and world chatter all live in `environment-surface.js` (the plains approach). The hijacked drone, named ace and shield tender behaviours are in `hijacked-drones.js`, `aces.js` and `tenders.js`.
- `voices/`: spoken callouts. `VOICE_REQUESTS.txt` lists lines still to record, with their expected filenames. Drop a matching mp3 in and it plays.
- `music/` and `music credits.txt`: soundtrack and its sources.
- Design notes: `POSSIBLE GAME DIRECTION.txt`, `AGENT_X_WORLD_LORE.txt`, `AGENT_X_MISSION_AND_CONTACT_STYLE_GUIDE.txt`, `AGENT_X_MODEL_AND_ASSET_GUIDE.txt`, `MISSION_TEMPLATE_FORMAT.txt`, `MISSION_PRESENTATION_PACKS.txt`, `FACTIONS_AND_BEYOND_PROPOSAL.txt`.
- `CHANGES_WHILE_AWAY.txt`: plain-English log of recent changes.

Music credits are in `music credits.txt` and in the game's About box.

© 2026 BugVictim
