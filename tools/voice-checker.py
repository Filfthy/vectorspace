"""Voice line checker for Vector Space.

Run:  python tools/voice-checker.py     then open http://127.0.0.1:8810

Lists every voice line the game knows (audio.js and voice-requests.js). For each one
you can play the file the game uses (voices/) and the raw Sonia render
(voices unprocessed/), change the wording, speed and pitch, and render it again with
Microsoft's en-GB-SoniaNeural voice through edge-tts. Renders always go to
"voices unprocessed"; voices/ is never written. Your wording, speed, pitch and OK
ticks are kept in "voices unprocessed/voice-lines.json".

Command line:  python tools/voice-checker.py render FILE.mp3 [FILE.mp3 ...]
renders those lines with their saved (or default) wording, without the page.
"""
import json, os, re, subprocess, sys, threading, time, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'voices')
RAW = os.path.join(ROOT, 'voices unprocessed')
STORE = os.path.join(RAW, 'voice-lines.json')
VOICE = 'en-GB-SoniaNeural'
PORT = 8810
lock = threading.Lock()


def read(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return f.read()


def block(src, start):
    i = src.index(start)
    j = src.index('\n    };', i)
    return src[i:j]


ENTRY = re.compile(r"(\w+):'((?:[^'\\]|\\.)*)'")


def spoken(text):
    """Default wording for the voice: dashes become full stops, and it ends with one."""
    t = re.sub(r'\s*[—–]\s*', '. ', text).strip()
    t = re.sub(r'\.\s+(\w)', lambda m: '. ' + m.group(1).upper(), t)
    if not re.search(r'[.!?]$', t):
        t += '.'
    return t


def game_lines():
    a = read('audio.js')
    files = {k: v.split('/')[-1] for k, v in ENTRY.findall(block(a, 'this.voiceFiles={')) if v.startswith('./voices/')}
    texts = dict(ENTRY.findall(block(a, 'this.voiceText={')))
    lines, seen = [], set()
    for key, fn in files.items():
        if fn in seen:
            continue
        seen.add(fn)
        lines.append({'key': key, 'file': fn, 'text': texts.get(key, ''), 'source': 'game'})
    r = read('voice-requests.js')
    req = r[r.index('AgentXVoiceRequests={'):]
    req = req[:req.index('\n};')]
    for key, text in ENTRY.findall(req):
        fn = re.sub(r'[^a-z0-9]', '', text.lower()) + '.mp3'
        if fn in seen:
            continue
        seen.add(fn)
        lines.append({'key': key, 'file': fn, 'text': text, 'source': 'requested'})
    return lines


def load_store():
    try:
        with open(STORE, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_store(store):
    tmp = STORE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(store, f, indent=1, ensure_ascii=False)
    os.replace(tmp, STORE)


def all_lines():
    store = load_store()
    out = []
    for ln in game_lines():
        s = store.get(ln['file'], {})
        gp, rp = os.path.join(GAME, ln['file']), os.path.join(RAW, ln['file'])
        out.append({**ln,
                    'say': s.get('say') or spoken(ln['text']),
                    'rate': s.get('rate', 0), 'pitch': s.get('pitch', 0),
                    'ok': bool(s.get('ok')), 'note': s.get('note', ''),
                    'rendered': s.get('rendered', ''),
                    'inGame': os.path.exists(gp), 'gameTime': os.path.getmtime(gp) if os.path.exists(gp) else 0,
                    'raw': os.path.exists(rp), 'rawTime': os.path.getmtime(rp) if os.path.exists(rp) else 0})
    return out


def render(fn, say, rate=0, pitch=0):
    if not re.fullmatch(r'[a-z0-9]+\.mp3', fn):
        raise ValueError('bad file name')
    os.makedirs(RAW, exist_ok=True)
    dest = os.path.join(RAW, fn)
    tmp = dest + '.part.mp3'
    cmd = [sys.executable, '-m', 'edge_tts', '--voice', VOICE, '--text', say,
           f'--rate={int(rate):+d}%', f'--pitch={int(pitch):+d}Hz', '--write-media', tmp]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    if p.returncode or not os.path.exists(tmp):
        raise RuntimeError((p.stderr or 'edge-tts failed').strip()[-400:])
    os.replace(tmp, dest)
    with lock:
        store = load_store()
        s = store.setdefault(fn, {})
        s.update({'say': say, 'rate': int(rate), 'pitch': int(pitch), 'rendered': time.strftime('%Y-%m-%d %H:%M'), 'voice': VOICE})
        s['ok'] = False
        save_store(store)
    return os.path.getmtime(dest)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path in ('/', '/index.html'):
            self.path = '/tools/voice-checker.html'
        elif path == '/api/lines':
            return self.send_json({'voice': VOICE, 'lines': all_lines()})
        elif not (path.startswith('/voices/') or path.startswith('/voices%20unprocessed/') or path.startswith('/tools/')):
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        n = int(self.headers.get('Content-Length') or 0)
        try:
            body = json.loads(self.rfile.read(n) or b'{}')
            fn = str(body.get('file', ''))
            if path == '/api/render':
                t = render(fn, str(body.get('say', '')).strip(), body.get('rate', 0), body.get('pitch', 0))
                return self.send_json({'ok': True, 'rawTime': t})
            if path == '/api/mark':
                with lock:
                    store = load_store()
                    s = store.setdefault(fn, {})
                    for k in ('ok', 'note'):
                        if k in body:
                            s[k] = body[k]
                    save_store(store)
                return self.send_json({'ok': True})
            return self.send_error(404)
        except Exception as e:
            return self.send_json({'ok': False, 'error': str(e)}, 500)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'render':
        by = {l['file']: l for l in all_lines()}
        for fn in sys.argv[2:]:
            l = by[fn]
            render(fn, l['say'], l['rate'], l['pitch'])
            print('rendered', fn, '|', l['say'])
        sys.exit(0)
    print(f'Voice checker on http://127.0.0.1:{PORT}')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
