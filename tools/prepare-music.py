# Readies a downloaded recording for the game's music player.
#   python tools/prepare-music.py "music/violent audition/Holst-_uranus.ogg" music/violent/uranus.ogg [START_SECONDS]
# Concert recordings are made for listening, with quiet passages far below the loud ones. Under engines and
# gunfire the quiet parts vanish, so:
# 1. rumble below 28 Hz goes,
# 2. a slow gain rider (ffmpeg dynaudnorm, 0.4 s frames, about 6 s of smoothing) lifts the quiet passages
#    by up to MAX_LIFT dB, without pumping on single notes, then a gentle compressor evens out the loud swells,
# 3. one fixed gain brings the whole track to TARGET LUFS and a limiter keeps the peaks under -2 dBFS (Vorbis encoding overshoots a little).
import subprocess, sys

TARGET = -14.0     # integrated loudness, LUFS (Ride of the Valkyries sits at -14.8)
MAX_LIFT = 18      # dB the rider may lift a quiet passage
FF = ['ffmpeg', '-hide_banner', '-nostats']

def measure(src, af):
    err = subprocess.run(FF + ['-i', src, '-af', af + ',ebur128=peak=true', '-f', 'null', '-'], capture_output=True).stderr.decode()
    s = err.rsplit('Summary:', 1)[1]
    num = lambda key, unit: float(s.split(key, 1)[1].split(unit)[0])
    return num('I:', 'LUFS'), num('LRA:', 'LU'), num('Peak:', 'dBFS')

def main(src, out, start=0.0):
    # start (seconds, optional): cut everything before it, with a short fade in, for a
    # recording whose opening is not wanted in the game.
    start = float(start); lift = 10 ** (MAX_LIFT / 20)
    trim = f'atrim=start={start},asetpts=PTS-STARTPTS,afade=t=in:d=0.35,' if start > 0 else ''
    chain = trim + f'highpass=f=28:p=2,dynaudnorm=f=400:g=15:p=0.9:m={lift:.2f}:r=0.18:b=1,acompressor=threshold=0.1:ratio=2.5:attack=25:release=350:knee=4'
    i, lra, _ = measure(src, chain)
    final = f'{chain},volume={TARGET - i:.2f}dB,alimiter=limit=0.79:attack=3:release=120:level=false'
    subprocess.run(FF + ['-v', 'error', '-y', '-i', src, '-af', final, '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5', out], check=True)
    print(out, 'before %.1f LUFS range %.1f LU' % measure(src, 'anull')[:2], '| after %.1f LUFS range %.1f LU peak %.1f dBFS' % measure(out, 'anull'))

if __name__ == '__main__':
    main(*sys.argv[1:4])
