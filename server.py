#!/usr/bin/env python3

import os
PORT = int(os.environ.get('PZPLUS_PORT', 2345))
DATA_DIR = os.environ.get('PZPLUS_DATA',
    os.path.join(os.getenv('XDG_DATA_HOME', os.path.expanduser('~/.local/share')),
                 'pzplus'))

import pathlib
pathlib.Path(os.path.join(DATA_DIR, 'recordings')).mkdir(parents=True, exist_ok=True)

import http.server
import json
import shutil
import sqlite3
import threading

aliases = list(map(str.split, '''
cave bag corral correl
bosanowa bossanova
skyscrapers building skyscraper
hashi hashikake bridges
heyawake heyawacky
akari lightup
mashu masyu pearl
roma rome
satogaeri sato
slalom suraromu
yajilin yajirin
yajilin-regions yajirin-regions
'''.strip().split('\n')))

def patch(genre):
    for alias in aliases:
        if genre in alias: return alias[0]
    return genre

def tts(t, precise=False):
    ms = t%1000
    t = t//1000
    h, m, s = t//3600, (t//60)%60, t%60
    hms = f'{h}:{m:02}:{s:02}' if h > 0 else f'{m}:{s:02}'
    return f'{hms}.{ms:03}' if precise else hms

def recpath(rowid):
    return os.path.join(DATA_DIR, 'recordings', f'{rowid:06}')

conn = sqlite3.connect(os.path.join(DATA_DIR, 'p.db'), check_same_thread=False)
c = conn.cursor()
c.executescript('''
CREATE TABLE IF NOT EXISTS d (
    genre   TEXT NOT NULL,
    variant TEXT,
    flags   TEXT,
    url     TEXT NOT NULL,
    date    TEXT NOT NULL,
    w       INTEGER NOT NULL,
    h       INTEGER NOT NULL,
    t       INTEGER NOT NULL,
    rate    INTEGER,
    diff    INTEGER,
    path    INTEGER,
    uniq    INTEGER,
    comm    TEXT
);
CREATE TABLE IF NOT EXISTS users (
    name    TEXT NOT NULL,
    pass    BLOB NOT NULL,
    salt    BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS tokens (
    uid     INTEGER NOT NULL,
    token   TEXT NOT NULL,
    date    TEXT NOT NULL
);
''')
conn.commit()
clock = threading.Lock()

def pwhash(pwd, salt):
    return hashlib.pbkdf2_hmac('sha256', pwd, salt, 100000)

# only call this when locked
def maketoken(uid):
    token = os.urandom(32).hex()
    c.execute('insert into tokens (uid, token, date) values (?, ?, datetime("now","localtime"))', (uid, token))
    conn.commit()
    return token

class PuzzlinkHelper(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args):
        super().__init__(*args, directory='dist')

    def nohtml(self, p):
        if self.path == f'/{p}' or self.path.startswith(f'/{p}?'): self.path = f'/{p}.html{self.path[1+len(p):]}'

    def do_GET(self):
        self.nohtml('p')
        self.nohtml('db')
        print(self.path)
        super().do_GET()

    def do_POST(self):
        uid = c.execute('SELECT uid FROM tokens WHERE token = ?', (self.headers.get('PzplusAuth', ''),)).fetchone()
        if not uid:
            self.send_response(403)
            self.end_headers()
            return

        ret = None
        if hasattr(API, 'b_' + self.path[1:]):
            ret = getattr(API, 'b_' + self.path[1:])(self.rfile.read(int(self.headers['Content-Length'])))
        elif hasattr(API, 'j_' + self.path[1:]):
            ret = getattr(API, 'j_' + self.path[1:])(json.loads(self.rfile.read(int(self.headers['Content-Length']))))

        if ret is not None:
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream') # shh firefox
            self.end_headers()
            self.wfile.write(ret if type(ret) is bytes else json.dumps(ret).encode())
        else:
            self.send_response(404)
            self.end_headers()

class API:

    def b_localdb(data):
        data, *recording = data.split(b'\0', 1)
        data = json.loads(data)

        parts = data['url'].split('/')
        genre = patch(parts[0])
        flags, w, h = ([None]+parts[1:3]) if parts[1].isdigit() else parts[1:4]
        with clock:
            c.execute('INSERT INTO d (genre,flags,url,date,w,h,t) VALUES (?,?,?,datetime("now","localtime"),?,?,?)',
                    (genre, flags, data['url'], w, h, data['t']))
            conn.commit()
            rowid = c.lastrowid

        if len(recording):
            with open(recpath(rowid), 'wb') as recfile:
                recfile.write(recording[0])

        num, time = c.execute('SELECT COUNT(*), SUM(t) FROM d WHERE genre = ?', (genre,)).fetchone()
        return {
            'msg1': f'saved time: {tts(data["t"], True)}',
            'msg2': f'{num} {genre} puzzles solved in {tts(time)}',
            'rowid': rowid
        }

    def j_fetch(data):
        # oops, bunch of copy/paste from above
        parts = data['url'].split('/')
        genre = patch(parts[0])
        num, time = c.execute('SELECT COUNT(*), SUM(t) FROM d WHERE genre = ?', (genre,)).fetchone()
        rowid, t, rate, diff, path, uniq, comm, variant = \
            c.execute('SELECT rowid, t, rate, diff, path, uniq, comm, variant FROM d WHERE url = ?', (data['url'],)).fetchone()
        return {
            'msg1': f'editing existing time: {tts(t, True)}',
            'msg2': f'{num} {genre} puzzles solved in {tts(time)}',
            'rowid': rowid,
            'rate': rate, 'diff': diff, 'path': path, 'uniq': uniq, 'comm': comm, 'variant': variant
        }

    def j_update(data):
        if data['k'] in ['rate', 'diff', 'path', 'uniq', 'variant', 'comm']:
            with clock:
                c.execute(f'UPDATE d SET {data["k"]} = ? WHERE rowid = ?', (data['v'], data['rowid']))
                conn.commit()
            return { 'msg': 'saved!' }
        if data['k'] == 'unsave' and data['v'] == 1:
            with clock:
                c.execute('DELETE FROM d WHERE rowid = ?', (data['rowid'],))
                conn.commit()
            try: os.remove(recpath(data['rowid']))
            except: pass
            return { 'msg': 'deleted' }
        return { 'msg': 'error' }

    def j_getrec(data):
        res = c.execute('SELECT rowid FROM d WHERE url = ?', (data['url'],)).fetchone()
        fname = recpath(res[0]) if res else None
        return open(fname, 'rb').read() if fname else b''

    def j_prevsolves(data):
        return [{
            't': tts(t)
        } for (t,) in c.execute('SELECT t FROM d WHERE url = ?', (data['url'],)).fetchall()]

http.server.ThreadingHTTPServer(('', PORT), PuzzlinkHelper).serve_forever()
