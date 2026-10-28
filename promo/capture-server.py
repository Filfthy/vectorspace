# Serves the game for the promo and saves the frames it posts.
# Run: python promo/capture-server.py 8800   then open http://127.0.0.1:8800/?promo
# POST /promo-capture/<folder>/<file>.png|jpg writes into promo/out/<folder>/<file>.
import http.server, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'promo', 'out')
SAFE = re.compile(r'^/promo-capture/([A-Za-z0-9_-]+)/([A-Za-z0-9_.-]+\.(?:png|jpg|json|txt))$')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        m = SAFE.match(self.path)
        if not m:
            self.send_error(404)
            return
        folder = os.path.join(OUT, m.group(1))
        os.makedirs(folder, exist_ok=True)
        n = int(self.headers.get('Content-Length', 0))
        with open(os.path.join(folder, m.group(2)), 'wb') as f:
            f.write(self.rfile.read(n))
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
