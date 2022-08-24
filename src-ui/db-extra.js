// modified re-add direct link functionality by phenomist

var added = 0;
var showdiff = localStorage.getItem('showdiff') !== 'no';

setInterval(function() {
    var puzzles = document.getElementsByClassName("pzvpuzzle");
    for (var i = 0; i < puzzles.length; i++){
        var puzzle = puzzles[i];
        if (puzzle.getElementsByClassName("plink").length === 0){
            var src = puzzle.getElementsByTagName("img")[0].src;
            var link = src.replace("v?thumb&","?");
            var pzvlink = link.replace("https://puzz.link","http://pzv.jp");
            var pzpluslink = link.replace("https://puzz.link","");
            var diff = puzzle.getElementsByClassName('puzzletype')[0].title;
            puzzle.getElementsByTagName("a")[0].href = pzpluslink;
            puzzle.insertAdjacentHTML('beforeend', '<div class="plink"><a target="_blank" href="'+pzpluslink+'" class="lpzp">[pzplus]</a> <a target="_blank" href="'+link+'" class="lpl">[puzz.link]</a> <a target="_blank" href="'+pzvlink+'" class="lpzv">[pzv.jp]</a> <span class="showdiff" style="padding-left:1rem' + (showdiff ? '' : ';display:none') + '">'+diff+'</span></div>');
        }
    }

    if (!added) {
        var paging = document.getElementsByClassName('paging')[0];
        if (paging) {
            added = 1;

            var txt = document.createElement('span');
            txt.style.marginLeft = '1rem';
            txt.innerText = 'open all:';
            paging.appendChild(txt);
            [['pzplus', 'lpzp'], ['puzz.link', 'lpl'], ['pzv.jp', 'lpzv']].forEach(function(site) {
                var btn = document.createElement('a');
                btn.innerText = '[' + site[0] + ']';
                btn.href = '#';
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    Array.from(document.getElementsByClassName(site[1])).forEach(function(x) { x.click(); });
                });
                paging.appendChild(document.createTextNode(' '));
                paging.appendChild(btn);
            });

            var lbl = document.createElement('label');
            lbl.style.marginLeft = '1rem';
            var box = document.createElement('input');
            box.setAttribute('type', 'checkbox');
            box.checked = showdiff;
            lbl.appendChild(box);
            lbl.appendChild(document.createTextNode(' show stats'));
            paging.appendChild(lbl);
            box.addEventListener('change', () => {
                showdiff = box.checked;
                localStorage.setItem('showdiff', showdiff ? 'yes' : 'no');
                Array.from(document.getElementsByClassName('showdiff')).forEach(x => {
                    x.style.display = showdiff ? '' : 'none';
                });
            });
        }
    }
}, 1000);
