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
        this.xhr('/localdb', recording ? recording.finalize(json) : json, this.send_resp);
    },

    edit: function(pzv) {
        this.xhr('/fetch', JSON.stringify({'url': pzv}), this.send_resp);
    },

    send_resp: function(localdb, resp) {
        ui.notify.alert([
            resp.msg1,
            ' (<a href="#">unsave</a>)',
            '<br>',
            resp.msg2,
            '<table class="scales"><tbody>',
            localdb.genscale('rate', 'bad', 'good', resp.rate),
            localdb.genscale('diff', 'easy', 'hard', resp.diff),
            localdb.genscale('path', 'bash', 'logic', resp.path),
            localdb.genscale('uniq', 'intuit', 'proved', resp.uniq),
            '</tbody></table>',
            // '<label><input type="checkbox" style="vertical-align:middle"> proved uniqueness</label>',
            '<div class="localdbtext">',
            localdb.gentext('variant', 'variant', 1, resp.variant),
            localdb.gentext('comm', 'comments...', 4, resp.comm),
            '</div>',
            ''
        ].join(''));

        var notif = document.querySelector('#assertbox');

        ['rate', 'diff', 'path', 'uniq'].forEach(function(key) {
            var btns = notif.querySelectorAll('.scale-' + key);
            btns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    btns.forEach(function(b2) { b2.classList.remove('sel'); });
                    if (!btn.classList.contains('scale-x')) {
                        btn.classList.add('sel');
                    }
                    localdb.update(resp.rowid, key, btn.textContent === 'x' ? null : parseInt(btn.textContent));
                });
            });
        });

        // notif.querySelector('input').addEventListener('change', function(e) {
        //     localdb.update(resp.rowid, 'uniq', e.target.checked);
        // });

        notif.querySelectorAll('textarea').forEach(function(ta) {
            ta.addEventListener('change', function(e) {
                localdb.update(resp.rowid, ta.dataset.key, e.target.value);
            });
            ta.addEventListener('keydown', function(e) {
                // prevent pzpr from gobbling backspace and space
                e.stopPropagation();
            });
        });

        notif.querySelector('a').addEventListener('click', function(e) {
            e.preventDefault();
            if (this.classList.contains('timeout')) {
                return;
            }
            var n = this.textContent.substr(0, 5) === 'click' ? +this.textContent.charAt(6) - 1 : 3;
            if (n) {
                this.classList.add('timeout');
                this.textContent = 'click '+n+'x';
                setTimeout(function() {
                    e.target.classList.remove('timeout');
                }, 1000);
            } else {
                localdb.update(resp.rowid, 'unsave', 1);
                ui.notify.alert('unsaved time of '+resp.time);
                // if (localdb.loadindic) {
                //     localdb.loadindic.style.display = 'none';
                // }
            }
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

    genscale: function(key, low, hi, prefill) {
        return '<tr><td>' + low + '</td><td>' + Array(10).fill().map(function(_, i) {
            return '<button class="btn scale scale-'+key+(prefill===i+1?' sel':'')+'" data-key="'+key+'">' + (i+1) + '</button>';
        }).join('') + '</td><td>' + hi + '</td><td><button class="btn scale-x scale-'+key+'" data-key="'+key+'">x</button></td></tr>';
    },

    gentext: function(key, placeholder, rows, prefill) {
        prefill = prefill === undefined || prefill === null ? '' : prefill;
        return '<textarea rows="'+rows+'" cols="35" data-key="'+key+'" placeholder="'+placeholder+'">'+prefill+'</textarea>';
    }

};

pzpr.on('load', function() {
    var msg = document.getElementById('pzplusmsg'), msgs = [], addMsg = function(s) {
        msgs.push(s);
        msg.innerHTML = msgs.join('<br>');
    };

    ui.localdb.xhr('/prevsolves', JSON.stringify({
        'url': ui.pzv
    }), function(localdb, resp) {
        if (resp.length) {
            addMsg('You have already solved this puzzle in ' + resp.map(function(x) { return x.t; }).join(', ') + '!');
            addMsg('Click <em>pzplus → Play recording</em> to view the recording.');
        }
    });

    var tokenerr = 'You have missing authentication information! Click <em>pzplus → Authentication</em> to input it.';
    if (!localStorage.getItem('token') || !localStorage.getItem('user_id')) {
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
