function xhr(path, data, cb) {
    var req = new XMLHttpRequest();
    req.addEventListener('load', function() {
        var resp = JSON.parse(this.response);
        if (resp.alert) {
            var alert = document.createElement('div'),
                closealert = function() {
                    if (alert) { document.body.removeChild(alert); }
                    alert = undefined;
                };
            alert.appendChild(document.createTextNode(resp.alert));
            alert.style.position = 'fixed';
            alert.style.top = '10px';
            alert.style.left = '30%';
            alert.style.right = '30%';
            alert.style.backgroundColor = '#115';
            alert.style.border = '1px solid #88f';
            alert.style.cursor = 'pointer';
            alert.style.padding = '10px';
            alert.style.borderRadius = '10px';
            alert.style.textAlign = 'center';
            document.body.appendChild(alert);
            alert.addEventListener('click', closealert);
            setTimeout(closealert, Math.max(5000, resp.alert.length*200));
        }
        if (resp.redir) {
            location.assign(resp.redir);
        }
        cb && cb(resp);
    });
    req.open('POST', path);
    var auth = localStorage.getItem('pzplusauth');
    if (auth) { req.setRequestHeader('PzplusAuth', auth); }
    req.send(JSON.stringify(data));
}

window.addEventListener('load', () => {

    if (localStorage.user_id === 'tckmn') {
        document.body.classList.remove('noadmin');
    }

    xhr('/dbtime', {}, d => {
        var e = document.getElementById('dbtime');
        e.textContent = d.t;
        e.classList.remove('load');
    });

    document.getElementById('updatedb').addEventListener('click', () => {
        xhr('/updatedb', { count: +document.getElementById('dbcount').value });
    });

    var sync = document.getElementById('sync');
    sync.addEventListener('click', () => {
        var prev = sync.innerText;
        sync.setAttribute('disabled', 1);
        sync.innerText = 'syncing... (this takes ~30 seconds)';
        xhr('/sync', { token: localStorage.getItem('token') }, () => {
        sync.removeAttribute('disabled');
            sync.innerText = prev;
        });
    });

    var form = document.getElementById('searchform');
    form.addEventListener('submit', e => {
        e.preventDefault();
        xhr('/search', { q: form.search.value }, d => {
            console.log(d);
        });
    });

});
