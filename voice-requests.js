'use strict';

// REQUESTED VOICE LINES (v600)
//
// Speech for content added since v400 (route encounters, enforcers, diversions) that
// has no recording yet. audio.js checks each file at start-up and registers only the
// ones that exist in voices/, so dropping a correctly named mp3 in makes the line play
// with no code change. Until then the on-screen text and the older generic lines
// carry these moments. VOICE_REQUESTS.txt lists them in the style guide's format.
globalThis.AgentXVoiceRequests={
  // Route encounters (combatVoice on the encounter's fight stage).
  pirateBlockadeAhead:'Pirate blockade ahead. Break through.',
  mercenaryInterceptorsInbound:'Mercenary interceptors inbound.',
  bountyHuntersOnYourTail:'Bounty hunters on your tail.',
  // Enforcers from a network you are Hostile with.
  osdInterdictionYouAreFlagged:'OSD interdiction. You are flagged.',
  freeTraderHiredGuns:'Free Trader hired guns closing in.',
  redJackalHitSquad:'Red Jackal hit squad inbound.',
  helixSecurityDronesInbound:'Helix security drones inbound.',
  quickbiteRepoDronesInbound:'QuickBite repo drones inbound.',
  // v720 hijacked military drones.
  hijackedDronesDetected:'Hijacked military drones detected.',
  // Optional route diversions.
  distressBeaconDetected:'Distress beacon detected.',
  derelictCraftOffRoute:'Derelict craft off route.',
  civilianCraftUnderAttack:'Civilian craft under attack.',
  survivorsRecovered:'Survivors recovered.',
  itWasATrap:'It was a trap.',
  dormantDronesActivated:'Dormant drones activated.',
  civilianSafe:'Civilian safe.',
  civilianContactLost:'Civilian contact lost.'
};
// Expected filename: the spoken text in lower case with spaces and punctuation removed.
globalThis.AgentXVoiceRequestFile=text=>String(text).toLowerCase().replace(/[^a-z0-9]/g,'')+'.mp3';
