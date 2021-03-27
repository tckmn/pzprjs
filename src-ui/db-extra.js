// modified re-add direct link functionality by phenomist

setInterval(function() {
    var puzzles = document.getElementsByClassName("pzvpuzzle");
    for (var i = 0; i < puzzles.length; i++){
        var puzzle = puzzles[i];
        if (puzzle.getElementsByClassName("plink").length === 0){
            var src = puzzle.getElementsByTagName("img")[0].src;
            var link = src.replace("v?thumb&","?");
            var pzvlink = link.replace("https://puzz.link","http://pzv.jp");
            var pzpluslink = link.replace("https://puzz.link","http://localhost:2345");
            puzzle.getElementsByTagName("a")[0].href = pzpluslink;
            puzzle.insertAdjacentHTML('beforeend', '<div class="plink"><a target="_blank" href="'+pzpluslink+'">[pzplus]</a> <a target="_blank" href="'+link+'">[puzz.link]</a> <a target="_blank" href="'+pzvlink+'">[pzv.jp]</a></div>');
        }
    }
}, 1000);
