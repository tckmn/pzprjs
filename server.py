#!/usr/bin/env python3

import os
ENV = os.environ.get('PZPLUS_ENV', 'pzplus')
PORT = int(os.environ.get('PZPLUS_PORT', 2345))
DATA_DIR = os.environ.get('PZPLUS_DATA',
    os.path.join(os.getenv('XDG_DATA_HOME', os.path.expanduser('~/.local/share')), ENV))

DATA = lambda *x: os.path.join(DATA_DIR, *x)

import pathlib
pathlib.Path(DATA('recordings')).mkdir(parents=True, exist_ok=True)
pathlib.Path(DATA('userdb')).mkdir(parents=True, exist_ok=True)
pathlib.Path(DATA('links')).mkdir(parents=True, exist_ok=True)

from datetime import datetime
import hashlib
import http.server
import json
import re
import shutil
import sqlite3
import threading
import urllib.request

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

recpath = lambda rowid: DATA('recordings', f'{rowid:06}')
userdbpath = lambda uid: DATA('userdb', f'{uid:04}.db')

conn = sqlite3.connect(DATA('p.db'), check_same_thread=False)
c = conn.cursor()
c.executescript('''
CREATE TABLE IF NOT EXISTS d (
    uid     INTEGER NOT NULL,
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
    salt    BLOB NOT NULL,
    shkey   TEXT NOT NULL,
    sync    TEXT
);
CREATE TABLE IF NOT EXISTS tokens (
    uid     INTEGER NOT NULL,
    token   TEXT NOT NULL,
    date    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pzlk (
    src     TEXT NOT NULL,
    url     TEXT NOT NULL,
    date    INTEGER NOT NULL,
    pzv     TEXT NOT NULL UNIQUE,
    genre   TEXT NOT NULL,
    w       INTEGER NOT NULL,
    h       INTEGER NOT NULL,
    solves  INTEGER NOT NULL,
    diff    INTEGER NOT NULL,
    gen     INTEGER NOT NULL,
    broken  INTEGER NOT NULL,
    variant INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS xtags (
    uid     INTEGER NOT NULL,
    pzv     TEXT NOT NULL,
    tags    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS xtidx ON xtags (uid,pzv);
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

def makeshkey():
    return os.urandom(32).hex()

def xtags(puz):
    return ((puz.get('solved', False)) << 0) | \
           (('favorite' in puz['tags']) << 1) | \
           (('skip' in puz['tags']) << 2)

def iflag(tok):
    tok = tok.strip()
    for inv in ['-', 'no']:
        if tok[0:len(inv)] == inv:
            return 0, tok[len(inv):].strip()
    return 1, tok

# c.execute('alter table users add sync TEXT')
# for name in c.execute('select name from users').fetchall():
#     c.execute('update users set shkey = ? where name = ?', (makeshkey(), name[0]))
# conn.commit()

noauth = ['/auth', '/getshrec', '/dbtime']

class PuzzlinkHelper(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args):
        super().__init__(*args, directory='dist')

    def nohtml(self, p):
        if self.path == f'/{p}' or self.path.startswith(f'/{p}?'): self.path = f'/{p}.html{self.path[1+len(p):]}'

    def parse_request(self):
        ret = super().parse_request()
        if self.command != 'POST':
            self.nohtml('p')
            self.nohtml('db')
            self.nohtml('db2')
            self.nohtml('auth')
            self.nohtml('query')
        return ret

    def do_POST(self):
        with clock:
            uid = c.execute('SELECT uid FROM tokens WHERE token = ?', (self.headers.get('PzplusAuth', ''),)).fetchone()

        if not uid and self.path not in noauth:
            self.send_response(403)
            self.end_headers()
            return
        if uid: uid = uid[0]

        ret = None
        if hasattr(API, 'b_' + self.path[1:]):
            with clock: ret = getattr(API, 'b_' + self.path[1:])(uid, self.rfile.read(int(self.headers['Content-Length'])))
        elif hasattr(API, 'j_' + self.path[1:]):
            with clock: ret = getattr(API, 'j_' + self.path[1:])(uid, json.loads(self.rfile.read(int(self.headers['Content-Length']))))
        elif hasattr(API, 'jl_' + self.path[1:]):
            ret = getattr(API, 'jl_' + self.path[1:])(uid, json.loads(self.rfile.read(int(self.headers['Content-Length']))))

        if ret is not None:
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream') # shh firefox
            self.end_headers()
            self.wfile.write(ret if type(ret) is bytes else json.dumps(ret).encode())
        else:
            self.send_response(404)
            self.end_headers()

class API:

    def j_auth(_, data):
        if data.get('action') == 'login':
            res = c.execute('SELECT rowid, pass, salt FROM users WHERE name = ?', (data.get('name'),)).fetchone()
            if not res: return {'msg': 'no such user'}
            uid, pwd, salt = res
            if 'pass' not in data or pwhash(data['pass'].encode(), salt) != pwd: return {'msg': 'incorrect password'}
            return {'msg': 'success!', 'token': maketoken(uid)}

        if data.get('action') == 'register':
            if 'name' not in data or not data['name'] or 'pass' not in data or not data['pass']: return {'msg': 'missing login information'}
            if c.execute('SELECT COUNT(*) FROM users WHERE name = ?', (data.get('name'),)).fetchone()[0]: return {'msg': 'username already taken'}
            salt = os.urandom(32)
            c.execute('INSERT INTO users (name, pass, salt, shkey) VALUES (?, ?, ?, ?)', (data['name'], pwhash(data['pass'].encode(), salt), salt, makeshkey()))
            conn.commit()
            return {'msg': 'success!', 'token': maketoken(c.lastrowid)}

        return {'msg': 'something weird happened'}

    def b_localdb(uid, data):
        data, *recording = data.split(b'\0', 1)
        data = json.loads(data)

        parts = data['url'].split('/')
        genre = patch(parts[0])
        flags, w, h = ([None]+parts[1:3]) if parts[1].isdigit() else parts[1:4]
        c.execute('INSERT INTO d (uid,genre,flags,url,date,w,h,t) VALUES (?,?,?,?,datetime("now","localtime"),?,?,?)',
                (uid, genre, flags, data['url'], w, h, data['t']))
        conn.commit()
        rowid = c.lastrowid

        if len(recording):
            with open(recpath(rowid), 'wb') as recfile:
                recfile.write(recording[0])

        num, time = c.execute('SELECT COUNT(*), SUM(t) FROM d WHERE uid = ? AND genre = ?', (uid, genre)).fetchone()
        return {
            'msg1': f'saved time: {tts(data["t"], True)}',
            'msg2': f'{num} {genre} puzzles solved in {tts(time)}',
            'rowid': rowid,
            'time': tts(data["t"], True)
        }

    def j_fetch(uid, data):
        # oops, bunch of copy/paste from above
        parts = data['url'].split('/')
        genre = patch(parts[0])
        num, time = c.execute('SELECT COUNT(*), SUM(t) FROM d WHERE uid = ? AND genre = ?', (uid, genre)).fetchone()
        rowid, t, rate, diff, path, uniq, comm, variant = \
            c.execute('SELECT rowid, t, rate, diff, path, uniq, comm, variant FROM d WHERE uid = ? AND url = ?', (uid, data['url'])).fetchone()
        return {
            'msg1': f'editing existing time: {tts(t, True)}',
            'msg2': f'{num} {genre} puzzles solved in {tts(time)}',
            'rowid': rowid,
            'rate': rate, 'diff': diff, 'path': path, 'uniq': uniq, 'comm': comm, 'variant': variant
        }

    def j_update(uid, data):
        if c.execute('SELECT COUNT(*) FROM d WHERE uid = ? AND rowid = ?', (uid, data.get('rowid'))).fetchone()[0] == 0:
            return {'msg': 'no such solve'}
        if data['k'] in ['rate', 'diff', 'path', 'uniq', 'variant', 'comm']:
            c.execute(f'UPDATE d SET {data["k"]} = ? WHERE uid = ? AND rowid = ?', (data['v'], uid, data['rowid']))
            conn.commit()
            return { 'msg': 'saved!' }
        if data['k'] == 'unsave' and data['v'] == 1:
            c.execute('DELETE FROM d WHERE uid = ? AND rowid = ?', (uid, data['rowid']))
            conn.commit()
            try: os.remove(recpath(data['rowid']))
            except: pass
            return { 'msg': 'deleted' }
        return { 'msg': 'error' }

    def j_getrec(uid, data):
        res = c.execute('SELECT rowid FROM d WHERE uid = ? AND url = ?', (uid, data['url'])).fetchone()
        fname = recpath(res[0]) if res else None
        return open(fname, 'rb').read() if fname else b''

    def j_prevsolves(uid, data):
        return [{
            't': tts(t)
        } for (t,) in c.execute('SELECT t FROM d WHERE uid = ? AND url = ?', (uid, data['url'])).fetchall()]

    def j_getshkey(uid, data):
        s = c.execute('SELECT shkey FROM users WHERE rowid = ?', (uid,)).fetchone()[0] + data['url']
        return { 'key': str(uid) + 'z' + hashlib.sha256(s.encode()).hexdigest() }

    # ignore requester's uid here
    def j_getshrec(_, data):
        uid, key = data['key'].split('z', 1)
        uid = int(uid)
        s = c.execute('SELECT shkey FROM users WHERE rowid = ?', (uid,)).fetchone()[0] + data['url']
        if hashlib.sha256(s.encode()).hexdigest() != key: return b''
        res = c.execute('SELECT rowid FROM d WHERE uid = ? AND url = ?', (uid, data['url'])).fetchone()
        fname = recpath(res[0]) if res else None
        return open(fname, 'rb').read() if fname else b''

    def j_updatedb(uid, data):
        if uid != 1: return { 'alert': 'stop that' }

        with open(DATA('dbtime'), 'w') as f:
            f.write(datetime.now().astimezone().strftime('%F %T %Z'))

        with urllib.request.urlopen(f'https://puzz.link/db/api/pzvs_anon?limit={data["count"]}&order=sort_key.asc') as f:
            c.executemany('''
                insert or replace into pzlk (
                    src, url, date, pzv, genre, w, h, solves, diff, gen, broken, variant
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (( puz['source_name']
                  , puz['source_url']
                  , puz['published_at_posix']
                  , puz['pzv_override']
                  , puz['type']
                  , puz['size'][0]
                  , puz['size'][1]
                  , puz['solves'] or 0
                  , puz['difficulty'] or 0
                  , puz['generated']
                  , 'broken' in puz['tags_default']
                  , 'variant' in puz['tags_default']
                  ) for puz in json.load(f)))
            conn.commit()

        return { 'alert': 'database updated' }

    def j_dbtime(_, __):
        try:
            with open(DATA('dbtime')) as f:
                return { 't': f.read() }
        except:
            return { 't': '???' }

    def j_dbreq(uid, data):
        return c.execute('select * from pzlk order by date limit 100').fetchall()

    def jl_sync(uid, data):
        with clock:
            last = c.execute('select julianday() - julianday(sync) from users where rowid = ?', (uid,)).fetchone()[0]

            if uid != 1 and last and last*24 < 1:
                wait = 60 - int(last*24*60)
                return { 'alert': f'please wait {wait} minute{"" if wait == 1 else "s"} before doing that again' }

            c.execute('update users set sync = datetime("now") where rowid = ?', (uid,))
            conn.commit()

        with urllib.request.urlopen(urllib.request.Request('https://puzz.link/db/api/pzvs_user?limit=999999', headers={'Authorization': f'Bearer {data["token"]}'})) as f:
            with clock:
                c.executemany('''
                    insert or replace into xtags (uid, pzv, tags)
                    select :uid, :pzv, :tags where :tags != 1 or not exists
                    (select * from d where uid = :uid and url = :pzv)
                    on conflict (uid, pzv) do update set tags = excluded.tags
                ''', ({ 'uid': uid
                      , 'pzv': puz['pzv_override']
                      , 'tags': xtags(puz)
                      } for puz in json.load(f) if xtags(puz)))
                conn.commit()

        return { 'alert': 'synced!' }

    def jl_links(uid, data):
        fname = DATA(f'links/{uid}')
        if 'append' in data:
            old = None
            try:
                with open(fname, 'r') as f:
                    old = f.read()
            except: pass
            with open(fname, 'w') as f:
                f.write(old + '\n' + data['append'] if old else data['append'])
            return { 'alert': 'success!' }
        elif 'rewrite' in data:
            with open(fname, 'w') as f:
                f.write(data['links'])
            return { 'links': data['links'] }
        else:
            with open(fname, 'r') as f:
                return { 'links': f.read() }

    # def j_search(uid, data):
    #     nest = 0
    #     sql = 'select * from pzlk where '
    #     for tok in re.findall(r'[()&|!]|.+', data['q']):
    #         flag, tok = iflag(tok)
    #         if tok == '(':
    #             nest += 1
    #             sql += '('
    #         elif tok == ')':
    #             nest -= 1
    #             if nest < 1: return { 'alert': 'mismatched parentheses' }
    #             sql += ')'
    #         elif tok == '&': sql += ' and '
    #         elif tok == '|': sql += ' or '
    #         elif tok == '!': sql += ' not '
    #         elif tok == 'solved': sql += '' #TODO
    #         elif tok == 'generated': sql += f'(gen = {flag})'
    #         elif tok == 'skip': sql += '' #TODO
    #         elif tok == 'broken': sql += f'(broken = {flag})'

http.server.ThreadingHTTPServer(('', PORT), PuzzlinkHelper).serve_forever()
