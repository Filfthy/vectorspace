# Builds the montage soundtracks from the song, Sonia's title line and the game's own sound
# effects (logged with their times during the render by montage-scenes.js).
#   python promo/mix-montage-audio.py           writes promo/out/montage-audio.wav (music only)
#                                               and promo/out/montage-audio-sfx.wav (with game sounds)
# Needs promo/out/sfx/*.txt (D.exportSfx()) and promo/out/sfx/log.json (saved after the render).
import base64, io, json, os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
SR = 44100
LEAD = 1.0          # the video starts one second before the song (PROMO_SONG.start = -1)
LENGTH = 141.3 + LEAD
VOICE_AT = .4       # song time of Sonia's "Vector Space"
VOICE_GAIN = 1.6
SFX_GAIN = .32      # game sounds sit under the music

def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32).reshape(-1, 2) / 32768

def place(track, clip, at, gain=1.0):
    i = int(round(at * SR))
    if i >= len(track): return
    if i < 0: clip, i = clip[-i:], 0
    n = min(len(clip), len(track) - i)
    track[i:i + n] += clip[:n] * gain

def write(path, track):
    pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

music = np.zeros((int(LENGTH * SR), 2), np.float32)
place(music, decode(os.path.join(ROOT, 'music', 'violent', 'diesirae.ogg')), LEAD)
place(music, decode(os.path.join(HERE, 'vectorspace-title.mp3')), LEAD + VOICE_AT, VOICE_GAIN)

# The game's effects, one WAV each (exported as base64 text by the capture server).
sfx = {}
for f in os.listdir(os.path.join(OUT, 'sfx')):
    if f.endswith('.txt'):
        with wave.open(io.BytesIO(base64.b64decode(open(os.path.join(OUT, 'sfx', f)).read()))) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            if w.getframerate() != SR:
                a = np.interp(np.linspace(0, len(a), int(len(a) * SR / w.getframerate()), endpoint=False), np.arange(len(a)), a)
            sfx[f[:-4]] = np.stack([a, a], 1)
log = json.load(open(os.path.join(OUT, 'sfx', 'log.json')))
# The lead-in: the feed coming on with the destruction crackle and blip.
log = [{'t': -1.0, 'name': 'disconnectStatic', 'v': 1}, {'t': -.79, 'name': 'disconnectBlip', 'v': 1}] + log
fx = np.zeros_like(music)
for e in log:
    if e['name'] in sfx: place(fx, sfx[e['name']], e['t'] + LEAD, e['v'])
# The crackle and blip (the lead-in and the drone's destruction) are heard in both
# versions; the rest only in the game-sound mix.
lead = np.zeros_like(music)
for e in log:
    if e['name'].startswith('disconnect'): place(lead, sfx[e['name']], e['t'] + LEAD, e['v'])
write(os.path.join(OUT, 'montage-audio.wav'), music + lead * .7)
# A soft limiter keeps the busy fights from clipping.
mix = music + fx * SFX_GAIN
mix = np.tanh(mix)   # no make-up gain: the two versions stay at the same level
write(os.path.join(OUT, 'montage-audio-sfx.wav'), mix)
print('events', len(log), 'kinds', sorted({e['name'] for e in log}))
