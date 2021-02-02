var token = localStorage.getItem("token");
var userid = 'tckmn';
ui.callbackCalled = false;
ui.callbackComplete = function(puzzle, check){
    if(ui.callbackCalled){
        // only record the first solve
        return;
    }
    ui.callbackCalled = true;

    var time = puzzle.getTime();

    var pzv = location.search.slice(1);
    if(!pzv){
        // no boot pzv saved
        return;
    }
    if(!puzzle.playeronly){
        // don't record times in edit mode
        return;
    }
    if(ui.network.mode !== ""){
        // don't record times when network play is active
        return;
    }

    ui.localdb.send(pzv, time, puzzle.recording.finalize());

    if(puzzle.getConfig("variant")){
        // completion makes no sense for variants currently
        return;
    }

    var xmlhttp = new XMLHttpRequest(),
        data = { pzv: pzv, time: time };
    if (token && userid) {
        data.user_id = userid;
        xmlhttp.open("POST", "https://puzz.link/db/api/pzv_solves");
        xmlhttp.setRequestHeader("Authorization", "Bearer " + token);
    } else {
        xmlhttp.open("POST", "https://puzz.link/db/api/pzv_solves_anon");
    }
    xmlhttp.onreadystatechange = function(){};
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.setRequestHeader("Prefer", "return=minimal"); // anon auth error otherwise
    xmlhttp.send(JSON.stringify(data));

};
