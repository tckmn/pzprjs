#!/usr/bin/env python3

import os
PORT = 2345
DATA_DIR = os.path.join(os.getenv('XDG_DATA_HOME', os.path.expanduser('~/.local/share')), 'pzplus')

import pathlib
pathlib.Path(os.path.join(DATA_DIR, 'recordings')).mkdir(parents=True, exist_ok=True)

import http.server
import json
import shutil
import sqlite3

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

conn = sqlite3.connect(os.path.join(DATA_DIR, 'p.db'))
c = conn.cursor()
c.execute('''
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
)
''')
conn.commit()

class PuzzlinkHelper(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args):
        super().__init__(*args, directory='dist')

    def copyfile(self, source, outputfile):
        if source.name.endswith('p.html'):
            outputfile.write(self.patchp(source.read().decode()).encode())
        else:
            shutil.copyfileobj(source, outputfile)

    def patchp(self, html):
        res = c.execute('SELECT rowid, t FROM d WHERE url = ?', (self.path.split('?', 1)[1],)).fetchone()
        if res:
            rowid, t = res
            return html \
                .replace('@1', 'block') \
                .replace('@2', tts(t)) \
                .replace('@3', '<br>A recording is available (pzplus -> Play recording).' if os.path.isfile(recpath(rowid)) else '')
        else:
            return html.replace('@1', 'none')

    def do_POST(self):

        if self.path == '/localdb':
            data, recording = self.rfile.read(int(self.headers['Content-Length'])).split(b'~', 1)
            data = json.loads(data)

            parts = data['url'].split('/')
            genre = patch(parts[0])
            flags, w, h = ([None]+parts[1:3]) if parts[1].isdigit() else parts[1:4]
            c.execute('INSERT INTO d (genre,flags,url,date,w,h,t) VALUES (?,?,?,datetime("now","localtime"),?,?,?)',
                    (genre, flags, data['url'], w, h, data['t']))
            conn.commit()

            rowid = c.lastrowid
            with open(recpath(rowid), 'wb') as recfile:
                recfile.write(recording)

            num, time = c.execute('SELECT COUNT(*), SUM(t) FROM d WHERE genre = ?', (genre,)).fetchone()

            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({
                'time': tts(data['t'], True),
                'msg': f'{num} {genre} puzzles solved in {tts(time)}',
                'rowid': rowid
            }).encode())

        elif self.path == '/update':
            data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))

            if data['k'] in ['rate', 'diff', 'path', 'uniq', 'variant', 'comm']:
                c.execute(f'UPDATE d SET {data["k"]} = ? WHERE rowid = ?', (data['v'], data['rowid']))
                conn.commit()

            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({
                'msg': 'saved!'
            }).encode())

        elif self.path == '/getrec':
            data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))

            self.send_response(200)
            self.end_headers()

            res = c.execute('SELECT rowid FROM d WHERE url = ?', (data['url'],)).fetchone()
            fname = recpath(res[0]) if res else None
            if fname:
                self.wfile.write(open(fname, 'rb').read())

        else:
            self.send_response(404)
            self.end_headers()

http.server.HTTPServer(('', PORT), PuzzlinkHelper).serve_forever()
