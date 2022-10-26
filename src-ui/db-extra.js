// modified re-add direct link functionality by phenomist

let added = 0;
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

    if (!added) {
        const paging = document.getElementsByClassName('paging')[0];
        if (paging) {
            added = 1;

            const txt = document.createElement('span');
            txt.style.marginLeft = '1rem';
            txt.innerText = 'open all:';
            paging.appendChild(txt);
            [['pzplus', 'lpzp'], ['puzz.link', 'lpl'], ['pzv.jp', 'lpzv']].forEach(function(site) {
                const btn = document.createElement('a');
                btn.innerText = '[' + site[0] + ']';
                btn.href = '#';
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    Array.from(document.getElementsByClassName(site[1])).forEach(function(x) { x.click(); });
                });
                paging.appendChild(document.createTextNode(' '));
                paging.appendChild(btn);
            });

            const lbl = document.createElement('label');
            lbl.style.marginLeft = '1rem';
            const box = document.createElement('input');
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

            const gen = ['@hidesugar+', '@hidesugar2+', '@Melting_Solver+'];
            const btn = document.createElement('button');
            btn.style.marginLeft = '1rem';
            btn.appendChild(document.createTextNode('skip generated'));
            btn.addEventListener('click', () => {
                Array.from(document.getElementsByClassName('pzvpuzzle')).filter(x=>gen.indexOf(x.getElementsByClassName('author')[0].textContent)!==-1).map(x=>x.querySelector('.tag-skip input').click());
            });
            paging.appendChild(btn);
        }
    }
}, 1000);
