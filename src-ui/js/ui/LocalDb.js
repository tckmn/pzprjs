ui.localdb = {

    xhr: function(path, data, cb) {
        var xhr = new XMLHttpRequest(), localdb = this;
        xhr.addEventListener('load', function() {
            cb(localdb, JSON.parse(this.response));
        });
        xhr.open('POST', path);
        xhr.send(data);
    },

    send: function(pzv, time, recording) {
        var json = new TextEncoder().encode(JSON.stringify({
            'url': pzv,
            't': time
        }));
        this.xhr('/localdb', recording.finalize(json), this.send_resp);
    },

    send_resp: function(localdb, resp) {
        ui.notify.alert([
            'saved time: ',
            resp.time,
            '<br>',
            resp.msg,
            '<table class="scales"><tbody>',
            localdb.genscale('rate', 'bad', 'good'),
            localdb.genscale('diff', 'easy', 'hard'),
            localdb.genscale('path', 'bash', 'logic'),
            '</tbody></table>',
            '<label><input type="checkbox" style="vertical-align:middle"> proved uniqueness</label>',
            '<div class="localdbtext">',
            '<textarea rows="1" cols="30" data-key="variant" placeholder="variant"></textarea>',
            '<textarea rows="4" cols="30" data-key="comm" placeholder="comments..."></textarea>',
            '</div>',
            ''
        ].join(''));

        var notif = document.querySelector('#assertbox');

        ['rate', 'diff', 'path'].forEach(function(key) {
            var btns = notif.querySelectorAll('.scale-' + key);
            btns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    btns.forEach(function(b2) { b2.classList.remove('sel'); });
                    btn.classList.add('sel');
                    localdb.update(resp.rowid, key, parseInt(btn.textContent));
                });
            });
        });

        notif.querySelector('input').addEventListener('change', function(e) {
            localdb.update(resp.rowid, 'uniq', e.target.checked);
        });

        notif.querySelectorAll('textarea').forEach(function(ta) {
            ta.addEventListener('change', function(e) {
                localdb.update(resp.rowid, ta.dataset.key, e.target.value);
            });
            ta.addEventListener('keydown', function(e) {
                // prevent pzpr from gobbling backspace and space
                e.stopPropagation();
            });
        });
    },

    update: function(rowid, k, v) {
        this.loadindic = this.loadindic || document.getElementsByClassName('loadindic')[0];
        this.loadindic.textContent = 'saving...';
        this.loadindic.style.display = 'inline';

        var obj = {'rowid': rowid};
        obj[k] = v;
        this.xhr('/update', JSON.stringify({
            'rowid': rowid,
            'k': k, 'v': v || null
        }), this.update_resp);
    },

    update_resp: function(localdb, resp) {
        localdb.loadindic.textContent = resp.msg;
    },

    genscale: function(key, low, hi) {
        return '<tr><td>' + low + '</td><td>' + Array(10).fill().map(function(_, i) {
            return '<button class="btn scale scale-'+key+'" data-key="'+key+'">' + (i+1) + '</button>';
        }).join('') + '</td><td>' + hi + '</td></tr>';
    }

};

pzpr.on('load', function() {
    var msg = document.getElementById('pzplusmsg'), msgs = [], addMsg = function(s) {
        msgs.push(s);
        msg.innerHTML = msgs.join('<br>');
    };

    ui.localdb.xhr('/prevsolves', JSON.stringify({
        'url': location.search.slice(1)
    }), function(localdb, resp) {
        if (resp.length) {
            addMsg('You have already solved this puzzle in ' + resp.map(function(x) { return x.t; }).join(', ') + '!');
            addMsg('Click <em>pzplus → Play recording</em> to view the recording.');
        }
    });

    var tokenerr = 'You have missing authentication information! Click <em>pzplus → Authentication</em> to input it.';
    if (!localStorage.getItem('token') || !localStorage.getItem('userid')) {
        addMsg(tokenerr);
    } else {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', function() {
            var resp = JSON.parse(this.response);
            if (resp && resp[0] && resp[0].token) {
                localStorage.setItem('token', resp[0].token);
            } else {
                addMsg(tokenerr);
            }
        });
        xhr.open('GET', 'https://puzz.link/db/api/rpc/refresh_token');
        xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
        xhr.send();
    }
});
