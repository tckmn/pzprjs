// function xhr(path, data, cb) {
//     var req = new XMLHttpRequest();
//     req.addEventListener('load', function() {
//         var resp = JSON.parse(this.response);
//         if (resp.alert) {
//             var alert = document.createElement('div'),
//                 closealert = function() {
//                     if (alert) { document.body.removeChild(alert); }
//                     alert = undefined;
//                 };
//             alert.appendChild(document.createTextNode(resp.alert));
//             alert.style.position = 'fixed';
//             alert.style.top = '10px';
//             alert.style.left = '30%';
//             alert.style.right = '30%';
//             alert.style.backgroundColor = '#115';
//             alert.style.border = '1px solid #88f';
//             alert.style.cursor = 'pointer';
//             alert.style.padding = '10px';
//             alert.style.borderRadius = '10px';
//             alert.style.textAlign = 'center';
//             document.body.appendChild(alert);
//             alert.addEventListener('click', closealert);
//             setTimeout(closealert, Math.max(5000, resp.alert.length*200));
//         }
//         if (resp.redir) {
//             location.assign(resp.redir);
//         }
//         cb && cb(resp);
//     });
//     req.open('POST', path);
//     var auth = localStorage.getItem('pzplusauth');
//     if (auth) { req.setRequestHeader('PzplusAuth', auth); }
//     req.send(JSON.stringify(data));
// }

// modified re-add direct link functionality by phenomist

let showdiff = localStorage.getItem('showdiff') !== 'no';

setInterval(function() {
    const puzzles = document.getElementsByClassName("pzvpuzzle");
    for (let i = 0; i < puzzles.length; i++){
        const puzzle = puzzles[i];
        if (puzzle.getElementsByClassName("plink").length === 0){
            const src = puzzle.getElementsByTagName("img")[0].src;
            const link = src.replace("v?thumb&","?");
            const pzvlink = link.replace("https://puzz.link","http://pzv.jp");
            const pzpluslink = link.replace("https://puzz.link","");
            const diff = puzzle.getElementsByClassName('puzzletype')[0].title;
            puzzle.getElementsByTagName("a")[0].href = pzpluslink;
            puzzle.insertAdjacentHTML('beforeend', '<div class="plink"><a target="_blank" href="'+pzpluslink+'" class="lpzp">[pzplus]</a> <a target="_blank" href="'+link+'" class="lpl">[puzz.link]</a> <a target="_blank" href="'+pzvlink+'" class="lpzv">[pzv.jp]</a> <span class="showdiff" style="padding-left:1rem' + (showdiff ? '' : ';display:none') + '">'+diff+'</span></div>');
        }
    }
}, 1000);

window.addEventListener('load', () => {
    const extra = document.getElementById('extra');
    const cont = document.body.firstChild.children[2];
    cont.appendChild(extra);
    extra.style.display = 'inline-flex';

    Array.from(document.getElementsByClassName('open')).forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            Array.from(document.getElementsByClassName(btn.dataset.target)).forEach(function(x) { x.click(); });
        });
    });

    const box = document.getElementById('showdiff');
    box.setAttribute('type', 'checkbox');
    box.checked = showdiff;
    box.addEventListener('change', () => {
        showdiff = box.checked;
        localStorage.setItem('showdiff', showdiff ? 'yes' : 'no');
        Array.from(document.getElementsByClassName('showdiff')).forEach(x => {
            x.style.display = showdiff ? '' : 'none';
        });
    });

    const gen = ['@hidesugar+', '@hidesugar2+', '@Melting_Solver+', '@magamo8+'];
    const btn = document.getElementById('skipgen');
    btn.addEventListener('click', () => {
        Array.from(document.getElementsByClassName('pzvpuzzle')).filter(x=>gen.indexOf(x.getElementsByClassName('author')[0].textContent)!==-1).map(x=>x.querySelector('.tag-skip input').click());
    });

    // const save = document.createElement('button');
    // btn.style.marginLeft = '1rem';
    // btn.appendChild(document.createTextNode('save this search'));
    // btn.addEventListener('click', () => {
    //     xhr('/links', { 'append': undefined });
    // });
    // paging.appendChild(btn);
});
